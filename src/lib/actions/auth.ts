"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  burnVerification,
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
import { rememberLocale } from "@/lib/i18n/locale.server";
import {
  LOGIN_RULE,
  PASSWORD_RULE,
  RECOVERY_RULE,
  REGISTER_RULE,
  allowAttempt,
  forgetAttempts,
} from "@/lib/rate-limit";
import { ROOT_PATH, WELCOME_PATH } from "@/lib/routes";
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

/**
 * Pakuje komunikat błędu w stan akcji.
 *
 * Args:
 *     error (string): Treść pokazywana użytkownikowi.
 *
 * Returns:
 *     ActionState: Stan formularza z błędem.
 */
function fail(error: string): ActionState {
  return { error };
}

/** Wspólny komunikat po wyczerpaniu limitu prób. */
function tooMany(): ActionState {
  return fail("Za dużo prób. Odczekaj kilkanaście minut i spróbuj ponownie.");
}

/* ----------------------------------------------------------- rejestracja */

/**
 * Zakłada konto i od razu loguje.
 *
 * Bez przekierowania na końcu: klient musi najpierw pokazać kod odzyskiwania,
 * bo w bazie leży wyłącznie jego hash i drugi raz nie da się go wyświetlić.
 *
 * Args:
 *     _prev (CodeState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<CodeState>: Kod odzyskiwania do pokazania albo komunikat błędu.
 */
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

  if (!(await allowAttempt("register", REGISTER_RULE))) return tooMany();

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
  return { recoveryCode };
}

/* -------------------------------------------------------------- logowanie */

/**
 * Loguje na konto i zakłada sesję.
 *
 * Nieznany adres, złe hasło i konto usunięte dają ten sam komunikat i ten sam
 * czas odpowiedzi — nie zdradzamy, które konta istnieją.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Adres e-mail i hasło.
 *
 * Returns:
 *     Promise<ActionState>: Komunikat błędu; udane logowanie kończy się
 *     przekierowaniem na ekran powitalny.
 */
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ email: z.string().trim().min(1), password: z.string().min(1) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });

  if (!parsed.success) return fail("Podaj adres e-mail i hasło");

  const login = normalizeEmail(parsed.data.email);
  if (!(await allowAttempt("login", LOGIN_RULE, login))) return tooMany();

  const user = await prisma.user.findUnique({
    where: { email: login },
    select: {
      id: true,
      password_hash: true,
      is_deleted: true,
      is_blocked: true,
      is_root: true,
      locale: true,
    },
  });

  // Ten sam komunikat dla nieznanego adresu, złego hasła i konta usuniętego —
  // nie zdradzamy, które konta istnieją.
  const invalid = fail("Nieprawidłowy e-mail lub hasło");
  if (!user || user.is_deleted) {
    // Bez tego brak konta odpowiada natychmiast, a istniejące dopiero po scrypcie.
    await burnVerification(parsed.data.password);
    return invalid;
  }
  if (!(await verifySecret(parsed.data.password, user.password_hash))) return invalid;

  // O blokadzie mówimy dopiero po poprawnym haśle — komu innemu ta informacja
  // i tak się nie należy, a zablokowany ma prawo wiedzieć, czemu nie wchodzi.
  if (user.is_blocked) {
    return fail("To konto zostało zablokowane przez właściciela aplikacji.");
  }

  await forgetAttempts("login", login);
  await startSession(user.id);
  // Ciasteczko języka niesie wybór na ekrany bez sesji — po zalogowaniu
  // z nowego urządzenia trzeba je uzupełnić z konta.
  await rememberLocale(user.locale);
  // Root nie ma własnych godzin ani kwot, więc powitanie i pulpit nie mają mu
  // czego pokazać — idzie prosto do panelu.
  redirect(user.is_root ? ROOT_PATH : WELCOME_PATH);
}

/**
 * Kończy sesję i odsyła na ekran logowania.
 *
 * Returns:
 *     Promise<void>: Nic — funkcja kończy się przekierowaniem.
 */
export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/logowanie");
}

/* ----------------------------------------------------------- odzyskiwanie */

/**
 * Ustawia nowe hasło na podstawie kodu odzyskiwania.
 *
 * Zużyty kod przestaje działać, a na jego miejsce wchodzi nowy. Wszystkie
 * sesje lecą, bo ktoś mógł zostać zalogowany na starym haśle.
 *
 * Args:
 *     _prev (CodeState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<CodeState>: Kod odzyskiwania do pokazania albo komunikat błędu.
 */
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

  const login = normalizeEmail(parsed.data.email);
  if (!(await allowAttempt("recover", RECOVERY_RULE, login))) return tooMany();

  const user = await prisma.user.findUnique({
    where: { email: login },
    select: { id: true, recovery_code_hash: true, is_deleted: true },
  });

  const invalid = fail("Nieprawidłowy e-mail lub kod odzyskiwania");
  if (!user || user.is_deleted) {
    await burnVerification(parsed.data.code);
    return invalid;
  }
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
  await forgetAttempts("recover", login);
  return { recoveryCode };
}

/* --------------------------------------------------------------- konto */

/**
 * Zmienia hasło zalogowanego użytkownika.
 *
 * Wymaga obecnego hasła i wyrzuca pozostałe urządzenia — przejęta sesja nie
 * może przeżyć reakcji właściciela konta.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Obecne hasło oraz nowe hasło i jego powtórzenie.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
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

  if (!(await allowAttempt("password", PASSWORD_RULE, user.id))) return tooMany();

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

  // Zmiana hasła musi wyrzucić inne urządzenia — inaczej przejęta sesja żyje
  // dalej mimo reakcji właściciela konta. Bieżąca przeglądarka dostaje nową.
  await endAllSessions(user.id);
  await startSession(user.id);
  await forgetAttempts("password", user.id);

  revalidatePath("/ustawienia");
  return { success: "Hasło zmienione" };
}

/**
 * Wystawia nowy kod odzyskiwania w miejsce poprzedniego.
 *
 * Returns:
 *     Promise<CodeState>: Kod do jednorazowego pokazania użytkownikowi.
 */
export async function regenerateRecoveryCodeAction(): Promise<CodeState> {
  const user = await requireUser();
  const recoveryCode = generateRecoveryCode();

  await prisma.user.update({
    where: { id: user.id },
    data: { recovery_code_hash: await hashSecret(normalizeRecoveryCode(recoveryCode)) },
  });

  return { recoveryCode };
}

/**
 * Zapisuje adres e-mail i imię konta.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Nowy adres e-mail i imię.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
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

  // Powitanie w pasku i karta pracownika biorą imię z sesji.
  revalidatePath("/", "layout");
  return { success: "Zapisano dane" };
}
