"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { endAllSessions, generateResetPassword, hashSecret } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRoot } from "@/lib/session";
import type { ActionState } from "@/lib/types";

export type RootPasswordState = ActionState & { password?: string; userLabel?: string };

const userId = z.uuid("Nieprawidłowe konto");
const companyId = z.uuid("Nieprawidłowa firma");

const companyName = z
  .string()
  .trim()
  .min(2, "Nazwa firmy musi mieć co najmniej 2 znaki")
  .max(80, "Nazwa firmy może mieć najwyżej 80 znaków");

/**
 * Co zrobić z firmą osoby, której odbieramy dostęp rozszerzony.
 *
 * `keep` zostawia firmę nietkniętą i blokuje wyłącznie założenie nowej,
 * `transfer` przekazuje ją najstarszemu współwłaścicielowi, `dissolve` rozwiązuje.
 */
const companyStrategy = z.enum(["keep", "transfer", "dissolve"]);

/**
 * Pakuje komunikat błędu w stan akcji.
 *
 * Args:
 *     error (string): Treść pokazywana w panelu.
 *
 * Returns:
 *     ActionState: Stan formularza z błędem.
 */
function fail(error: string): ActionState {
  return { error };
}

function refreshRoot() {
  revalidatePath("/root", "layout");
}

/**
 * Dopisuje zdarzenie do dziennika działań roota.
 *
 * Dziennik jest jedyną pamięcią tego, kto komu co zmienił — pisze się przy
 * każdej akcji i nie da się go wyczyścić z panelu. Błąd zapisu nie może jednak
 * wywrócić samej operacji, która już się wykonała.
 *
 * Args:
 *     actorId (string): Konto roota wykonujące akcję.
 *     action (string): Kod akcji, np. „company_access_off".
 *     target ({ id?: string; label?: string }): Konto albo firma, której dotyczy.
 *     detail (string): Zdanie opisujące, co się stało.
 *
 * Returns:
 *     Promise<void>: Nic — wpis jest efektem ubocznym.
 */
async function note(
  actorId: string,
  action: string,
  target: { id?: string; label?: string },
  detail?: string,
): Promise<void> {
  try {
    await prisma.rootAuditLog.create({
      data: {
        actor_id: actorId,
        action,
        target_id: target.id ?? null,
        target_label: target.label?.slice(0, 200) ?? null,
        detail: detail?.slice(0, 300) ?? null,
      },
    });
  } catch {
    // Operacja już się wykonała — brak wpisu w dzienniku jej nie cofnie.
  }
}

/**
 * Wyszukuje konto, na którym root chce działać.
 *
 * Własnego konta root nie tknie: zablokowanie albo odebranie sobie uprawnień
 * zamknęłoby jedyne wejście do panelu.
 *
 * Args:
 *     rootId (string): Konto wykonujące akcję.
 *     raw (FormDataEntryValue | null): Identyfikator konta z formularza.
 *
 * Returns:
 *     Promise<{ id: string; email: string; name: string; is_owner: boolean } | string>:
 *     Konto albo komunikat błędu.
 */
async function targetUser(rootId: string, raw: FormDataEntryValue | null) {
  const parsed = userId.safeParse(raw);
  if (!parsed.success) return "Nieprawidłowe konto";
  if (parsed.data === rootId) return "Na własnym koncie root nie działa";

  const user = await prisma.user.findFirst({
    where: { id: parsed.data, is_root: false },
    select: { id: true, email: true, name: true, is_owner: true },
  });
  return user ?? "Nie znaleziono konta";
}

/* --------------------------------------------------- dostęp do firmy */

/**
 * Włącza albo odbiera dostęp rozszerzony, czyli prawo do prowadzenia firmy.
 *
 * Odebranie dostępu komuś, kto ma już firmę z pracownikami, wymaga decyzji, co
 * z tą firmą: samo zdjęcie flagi zostawiłoby właściciela z zespołem, do którego
 * nie ma wejścia. Dlatego przy założycielu formularz przysyła `strategy`.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Konto, docelowy stan dostępu i strategia dla firmy.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function setCompanyAccessAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const root = await requireRoot();
  const target = await targetUser(root.id, formData.get("user_id"));
  if (typeof target === "string") return fail(target);

  const enabled = formData.get("enabled") === "true";

  if (enabled) {
    await prisma.user.update({ where: { id: target.id }, data: { can_own_company: true } });
    await note(root.id, "company_access_on", { id: target.id, label: target.email },
      "Przywrócono dostęp rozszerzony");
    refreshRoot();
    return { success: `${target.name} ma znów dostęp rozszerzony` };
  }

  const owned = await prisma.company.findUnique({
    where: { owner_id: target.id },
    select: { id: true, name: true },
  });

  if (!owned) {
    // Bez firmy nie ma czego rozstrzygać: tryb właściciela znika razem z dostępem.
    await prisma.$transaction([
      prisma.companyCoOwner.deleteMany({ where: { user_id: target.id } }),
      prisma.coOwnerInvite.deleteMany({ where: { user_id: target.id } }),
      prisma.user.update({
        where: { id: target.id },
        data: { can_own_company: false, is_owner: false },
      }),
    ]);
    await endAllSessions(target.id);
    await note(root.id, "company_access_off", { id: target.id, label: target.email },
      "Odebrano dostęp rozszerzony");
    refreshRoot();
    return { success: `${target.name} nie może już prowadzić firmy` };
  }

  const strategy = companyStrategy.safeParse(formData.get("strategy"));
  if (!strategy.success) {
    return fail(`${target.name} prowadzi firmę ${owned.name} — wybierz, co z nią zrobić`);
  }

  if (strategy.data === "keep") {
    await prisma.user.update({ where: { id: target.id }, data: { can_own_company: false } });
    await note(root.id, "company_access_off", { id: target.id, label: target.email },
      `Odebrano dostęp rozszerzony, firma ${owned.name} zostaje`);
    refreshRoot();
    return { success: `${target.name} zachowuje firmę, ale nie założy nowej` };
  }

  if (strategy.data === "transfer") {
    const successor = await prisma.companyCoOwner.findFirst({
      where: { company_id: owned.id },
      orderBy: { created_at: "asc" },
      select: { user: { select: { id: true, name: true } } },
    });
    if (!successor) return fail("Ta firma nie ma współwłaściciela, któremu można ją przekazać");

    await prisma.$transaction([
      prisma.company.update({ where: { id: owned.id }, data: { owner_id: successor.user.id } }),
      prisma.companyCoOwner.deleteMany({
        where: { company_id: owned.id, user_id: successor.user.id },
      }),
      prisma.user.update({
        where: { id: target.id },
        data: { can_own_company: false, is_owner: false },
      }),
    ]);
    await endAllSessions(target.id);
    await note(root.id, "company_access_off", { id: target.id, label: target.email },
      `Odebrano dostęp, firmę ${owned.name} przejmuje ${successor.user.name}`);
    refreshRoot();
    return { success: `Firmę ${owned.name} przejmuje ${successor.user.name}` };
  }

  // Rozwiązanie firmy: pracownicy tracą samo powiązanie, ich dane zostają.
  await prisma.$transaction([
    prisma.company.delete({ where: { id: owned.id } }),
    prisma.user.update({
      where: { id: target.id },
      data: { can_own_company: false, is_owner: false },
    }),
  ]);
  await endAllSessions(target.id);
  await note(root.id, "company_dissolved", { id: owned.id, label: owned.name },
    `Rozwiązano firmę przy odbieraniu dostępu ${target.email}`);
  refreshRoot();
  return { success: `Firma ${owned.name} rozwiązana` };
}

/* ------------------------------------------------------------- konta */

/**
 * Blokuje albo odblokowuje konto.
 *
 * Blokada zostawia wszystkie dane nietknięte i da się cofnąć — w odróżnieniu
 * od anonimizacji, którą użytkownik wykonuje sam na swoim koncie.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Konto i docelowy stan blokady.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function setUserBlockedAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const root = await requireRoot();
  const target = await targetUser(root.id, formData.get("user_id"));
  if (typeof target === "string") return fail(target);

  const blocked = formData.get("blocked") === "true";
  await prisma.user.update({ where: { id: target.id }, data: { is_blocked: blocked } });
  if (blocked) await endAllSessions(target.id);

  await note(root.id, blocked ? "user_blocked" : "user_unblocked",
    { id: target.id, label: target.email }, blocked ? "Konto zablokowane" : "Konto odblokowane");

  refreshRoot();
  return { success: blocked ? `Konto ${target.email} zablokowane` : `Konto ${target.email} odblokowane` };
}

/**
 * Kończy wszystkie sesje wskazanego konta.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Konto do wylogowania.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function signOutUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const root = await requireRoot();
  const target = await targetUser(root.id, formData.get("user_id"));
  if (typeof target === "string") return fail(target);

  await endAllSessions(target.id);
  await note(root.id, "user_signed_out", { id: target.id, label: target.email },
    "Zakończono wszystkie sesje");

  refreshRoot();
  return { success: `${target.name} wylogowany ze wszystkich urządzeń` };
}

/**
 * Nadaje kontu nowe hasło jednorazowe.
 *
 * Hasło pokazujemy raz w panelu, a konto dostaje wymuszoną zmianę przy
 * najbliższym logowaniu — dokładnie tak, jak przy resecie robionym przez
 * właściciela firmy.
 *
 * Args:
 *     _prev (RootPasswordState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Konto, któremu nadajemy hasło.
 *
 * Returns:
 *     Promise<RootPasswordState>: Nowe hasło i podpis konta albo błąd.
 */
export async function resetUserPasswordAction(
  _prev: RootPasswordState,
  formData: FormData,
): Promise<RootPasswordState> {
  const root = await requireRoot();
  const target = await targetUser(root.id, formData.get("user_id"));
  if (typeof target === "string") return fail(target);

  const password = generateResetPassword();
  await prisma.user.update({
    where: { id: target.id },
    data: { password_hash: await hashSecret(password), must_change_password: true },
  });
  await endAllSessions(target.id);
  await note(root.id, "user_password_reset", { id: target.id, label: target.email },
    "Nadano hasło jednorazowe");

  refreshRoot();
  return { password, userLabel: `${target.name} (${target.email})` };
}

/* ------------------------------------------------------------ firmy */

/**
 * Zmienia nazwę firmy.
 *
 * Nazwa jest zarazem kluczem, po którym pracownicy proszą o dołączenie, więc
 * musi zostać niepowtarzalna bez względu na wielkość liter.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Firma i nowa nazwa.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function renameCompanyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const root = await requireRoot();

  const parsed = z
    .object({ id: companyId, name: companyName })
    .safeParse({ id: formData.get("company_id"), name: formData.get("name") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");

  const company = await prisma.company.findUnique({
    where: { id: parsed.data.id },
    select: { name: true },
  });
  if (!company) return fail("Nie znaleziono firmy");

  const nameKey = parsed.data.name.toLowerCase();
  const taken = await prisma.company.findFirst({
    where: { name_key: nameKey, id: { not: parsed.data.id } },
    select: { id: true },
  });
  if (taken) return fail("Firma o tej nazwie już istnieje");

  await prisma.company.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name, name_key: nameKey },
  });
  await note(root.id, "company_renamed", { id: parsed.data.id, label: parsed.data.name },
    `Nazwa zmieniona z „${company.name}"`);

  refreshRoot();
  return { success: `Nazwa zmieniona na ${parsed.data.name}` };
}

/**
 * Przekazuje firmę wskazanemu współwłaścicielowi.
 *
 * Nowym właścicielem może zostać wyłącznie ktoś, kto już jest w tej firmie
 * współwłaścicielem — wrzucenie firmy komuś z zewnątrz byłoby dla obu stron
 * niespodzianką.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Firma i konto nowego właściciela.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function transferCompanyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const root = await requireRoot();

  const parsed = z
    .object({ id: companyId, owner: userId })
    .safeParse({ id: formData.get("company_id"), owner: formData.get("owner_id") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");

  const coOwner = await prisma.companyCoOwner.findUnique({
    where: { company_id_user_id: { company_id: parsed.data.id, user_id: parsed.data.owner } },
    select: {
      company: { select: { name: true, owner_id: true } },
      user: { select: { id: true, name: true, email: true, can_own_company: true } },
    },
  });
  if (!coOwner) return fail("Ta osoba nie jest współwłaścicielem tej firmy");
  if (!coOwner.user.can_own_company) {
    return fail(`${coOwner.user.name} nie ma dostępu rozszerzonego — najpierw mu go przywróć`);
  }

  await prisma.$transaction([
    prisma.company.update({
      where: { id: parsed.data.id },
      data: { owner_id: coOwner.user.id },
    }),
    prisma.companyCoOwner.deleteMany({
      where: { company_id: parsed.data.id, user_id: coOwner.user.id },
    }),
    prisma.companyCoOwner.create({
      data: { company_id: parsed.data.id, user_id: coOwner.company.owner_id },
    }),
  ]);
  await note(root.id, "company_transferred", { id: parsed.data.id, label: coOwner.company.name },
    `Nowy właściciel: ${coOwner.user.email}`);

  refreshRoot();
  return { success: `Firmę ${coOwner.company.name} przejmuje ${coOwner.user.name}` };
}

/**
 * Rozwiązuje firmę.
 *
 * Konta pracowników zostają nietknięte — tracą wyłącznie powiązanie z firmą,
 * bo `users.company_id` ma ON DELETE SET NULL. Godziny, koszty i wypłaty
 * zostają przy ludziach.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Firma do rozwiązania i przepisana nazwa jako potwierdzenie.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function dissolveCompanyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const root = await requireRoot();

  const parsed = companyId.safeParse(formData.get("company_id"));
  if (!parsed.success) return fail("Nieprawidłowa firma");

  const company = await prisma.company.findUnique({
    where: { id: parsed.data },
    select: { name: true, owner_id: true },
  });
  if (!company) return fail("Nie znaleziono firmy");

  // Nazwa przepisana ręcznie — rozwiązanie firmy dotyka całego zespołu.
  const confirmation = String(formData.get("confirm") ?? "").trim();
  if (confirmation.toLowerCase() !== company.name.toLowerCase()) {
    return fail(`Przepisz nazwę „${company.name}", żeby potwierdzić`);
  }

  await prisma.$transaction([
    prisma.company.delete({ where: { id: parsed.data } }),
    prisma.user.update({ where: { id: company.owner_id }, data: { is_owner: false } }),
  ]);
  await note(root.id, "company_dissolved", { id: parsed.data, label: company.name },
    "Firma rozwiązana z panelu");

  refreshRoot();
  return { success: `Firma ${company.name} rozwiązana` };
}

/* ----------------------------------------------------- bezpieczeństwo */

/**
 * Czyści licznik prób logowania dla wskazanego adresu.
 *
 * Ratunek dla kogoś, kto zablokował się własnymi literówkami: klucz licznika
 * to adres IP plus e-mail, więc kasujemy wszystkie wpisy kończące się tym adresem.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Adres e-mail konta.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function clearAttemptsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const root = await requireRoot();

  const parsed = z.email("Podaj poprawny adres e-mail").safeParse(
    String(formData.get("email") ?? "").trim(),
  );
  if (!parsed.success) return fail("Podaj poprawny adres e-mail");

  const email = parsed.data.toLowerCase();
  const { count } = await prisma.authAttempt.deleteMany({
    where: { subject: { endsWith: `|${email}` } },
  });
  await note(root.id, "attempts_cleared", { label: email }, `Skasowano ${count} prób`);

  refreshRoot();
  return { success: count > 0 ? `Wyczyszczono ${count} prób dla ${email}` : "Nie było czego czyścić" };
}
