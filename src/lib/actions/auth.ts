"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  endAllSessions,
  endSession,
  generateRecoveryCode,
  hashSecret,
  normalizeRecoveryCode,
  normalizeUsername,
  startSession,
  verifySecret,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/types";

/** Rejestracja i odzyskiwanie kończą się kodem, który trzeba pokazać raz. */
export type CodeState = ActionState & { recoveryCode?: string };

const username = z
  .string()
  .trim()
  .min(3, "Nazwa użytkownika musi mieć co najmniej 3 znaki")
  .max(32, "Nazwa użytkownika może mieć najwyżej 32 znaki")
  .regex(/^[\p{L}\p{N}._-]+$/u, "Dozwolone są litery, cyfry oraz . _ -");

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
    .object({ username, password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, {
      message: "Hasła nie są takie same",
      path: ["confirm"],
    })
    .safeParse({
      username: formData.get("username"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");

  const login = normalizeUsername(parsed.data.username);
  const existing = await prisma.user.findUnique({ where: { username: login }, select: { id: true } });
  if (existing) return fail("Ta nazwa użytkownika jest już zajęta");

  const recoveryCode = generateRecoveryCode();
  const user = await prisma.user.create({
    data: {
      username: login,
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
    .object({ username: z.string().trim().min(1), password: z.string().min(1) })
    .safeParse({ username: formData.get("username"), password: formData.get("password") });

  if (!parsed.success) return fail("Podaj nazwę użytkownika i hasło");

  const user = await prisma.user.findUnique({
    where: { username: normalizeUsername(parsed.data.username) },
    select: { id: true, password_hash: true },
  });

  // Ten sam komunikat dla nieznanej nazwy i złego hasła — nie zdradzamy,
  // które konta istnieją.
  const invalid = fail("Nieprawidłowa nazwa użytkownika lub hasło");
  if (!user) return invalid;
  if (!(await verifySecret(parsed.data.password, user.password_hash))) return invalid;

  await startSession(user.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/logowanie");
}

/* ----------------------------------------------------------- odzyskiwanie */

export async function recoverAction(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const parsed = z
    .object({ username: z.string().trim().min(1), code: z.string().trim().min(1), password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, {
      message: "Hasła nie są takie same",
      path: ["confirm"],
    })
    .safeParse({
      username: formData.get("username"),
      code: formData.get("code"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");

  const user = await prisma.user.findUnique({
    where: { username: normalizeUsername(parsed.data.username) },
    select: { id: true, recovery_code_hash: true },
  });

  const invalid = fail("Nieprawidłowa nazwa użytkownika lub kod odzyskiwania");
  if (!user) return invalid;
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
    .object({
      first_name: z.string().trim().max(60).optional(),
      last_name: z.string().trim().max(60).optional(),
    })
    .safeParse({
      first_name: formData.get("first_name") ?? undefined,
      last_name: formData.get("last_name") ?? undefined,
    });

  if (!parsed.success) return fail("Imię i nazwisko mogą mieć najwyżej 60 znaków");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      first_name: parsed.data.first_name || null,
      last_name: parsed.data.last_name || null,
    },
  });

  revalidatePath("/ustawienia");
  revalidatePath("/pracownicy");
  return { success: "Zapisano dane" };
}
