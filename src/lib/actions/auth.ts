"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  endAllSessions,
  endSession,
  generateRecoveryCode,
  hashSecret,
  normalizeEmail,
  normalizeRecoveryCode,
  startSession,
  verifySecret,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WELCOME_PATH } from "@/lib/routes";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/types";

/** Rejestracja i odzyskiwanie kończą się kodem, który trzeba pokazać raz. */
export type CodeState = ActionState & { recoveryCode?: string };

const email = z.email("Podaj poprawny adres e-mail").max(120, "Adres e-mail jest za długi");

const name = z
  .string()
  .trim()
  .min(2, "Imię musi mieć co najmniej 2 znaki")
  .max(40, "Imię może mieć najwyżej 40 znaków");

const password = z
  .string()
  .min(6, "Hasło musi mieć co najmniej 6 znaków")
  .max(200, "Hasło jest za długie");

function fail(error: string): ActionState {
  return { error };
}

/* ----------------------------------------------------------- rejestracja */

export async function registerAction(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const parsed = z
    .object({ email, name, password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, {
      message: "Hasła nie są takie same",
      path: ["confirm"],
    })
    .safeParse({
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");

  const login = normalizeEmail(parsed.data.email);
  const existing = await prisma.user.findUnique({ where: { email: login }, select: { id: true } });
  if (existing) return fail("Konto z tym adresem e-mail już istnieje");

  const recoveryCode = generateRecoveryCode();
  const user = await prisma.user.create({
    data: {
      email: login,
      name: parsed.data.name,
      password_hash: await hashSecret(parsed.data.password),
      recovery_code_hash: await hashSecret(normalizeRecoveryCode(recoveryCode)),
    },
    select: { id: true },
  });

  await startSession(user.id);
  // Bez redirectu — najpierw klient musi pokazać kod odzyskiwania.
  return { recoveryCode };
}

/* -------------------------------------------------------------- logowanie */

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ email: z.string().trim().min(1), password: z.string().min(1) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });

  if (!parsed.success) return fail("Podaj adres e-mail i hasło");

  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(parsed.data.email) },
    select: { id: true, password_hash: true, is_deleted: true },
  });

  // Ten sam komunikat dla nieznanego adresu, złego hasła i konta usuniętego —
  // nie zdradzamy, które konta istnieją.
  const invalid = fail("Nieprawidłowy e-mail lub hasło");
  if (!user || user.is_deleted) return invalid;
  if (!(await verifySecret(parsed.data.password, user.password_hash))) return invalid;

  await startSession(user.id);
  redirect(WELCOME_PATH);
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/logowanie");
}

/* ----------------------------------------------------------- odzyskiwanie */

export async function recoverAction(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const parsed = z
    .object({ email: z.string().trim().min(1), code: z.string().trim().min(1), password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, {
      message: "Hasła nie są takie same",
      path: ["confirm"],
    })
    .safeParse({
      email: formData.get("email"),
      code: formData.get("code"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");

  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(parsed.data.email) },
    select: { id: true, recovery_code_hash: true, is_deleted: true },
  });

  const invalid = fail("Nieprawidłowy e-mail lub kod odzyskiwania");
  if (!user || user.is_deleted) return invalid;
  if (!(await verifySecret(normalizeRecoveryCode(parsed.data.code), user.recovery_code_hash))) {
    return invalid;
  }

  // Zużyty kod przestaje działać — na jego miejsce wchodzi nowy.
  const recoveryCode = generateRecoveryCode();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash: await hashSecret(parsed.data.password),
      recovery_code_hash: await hashSecret(normalizeRecoveryCode(recoveryCode)),
      must_change_password: false,
    },
  });

  // Ktoś mógł być zalogowany na starym haśle — wszystkie sesje lecą.
  await endAllSessions(user.id);
  await startSession(user.id);
  return { recoveryCode };
}

/* --------------------------------------------------------------- konto */

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = z
    .object({ current: z.string().min(1, "Podaj obecne hasło"), password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, {
      message: "Nowe hasła nie są takie same",
      path: ["confirm"],
    })
    .safeParse({
      current: formData.get("current"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");

  const row = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { password_hash: true },
  });
  if (!(await verifySecret(parsed.data.current, row.password_hash))) {
    return fail("Obecne hasło jest nieprawidłowe");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash: await hashSecret(parsed.data.password),
      must_change_password: false,
    },
  });

  revalidatePath("/ustawienia");
  return { success: "Hasło zmienione" };
}

export async function regenerateRecoveryCodeAction(): Promise<CodeState> {
  const user = await requireUser();
  const recoveryCode = generateRecoveryCode();

  await prisma.user.update({
    where: { id: user.id },
    data: { recovery_code_hash: await hashSecret(normalizeRecoveryCode(recoveryCode)) },
  });

  return { recoveryCode };
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = z
    .object({ email, name })
    .safeParse({ email: formData.get("email"), name: formData.get("name") });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");

  const nextEmail = normalizeEmail(parsed.data.email);
  const taken = await prisma.user.findFirst({
    where: { email: nextEmail, id: { not: user.id } },
    select: { id: true },
  });
  if (taken) return fail("Ten adres e-mail należy już do innego konta");

  await prisma.user.update({
    where: { id: user.id },
    data: { email: nextEmail, name: parsed.data.name },
  });

  // Powitanie w pasku i karta pracownika biorą imię z sesji — odświeżamy wszystko.
  revalidatePath("/", "layout");
  return { success: "Zapisano dane" };
}
