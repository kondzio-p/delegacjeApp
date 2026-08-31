"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { endAllSessions, generateResetPassword, hashSecret } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth";
import { requireFounder, requireOwner, requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/types";

export type ResetPasswordState = ActionState & { password?: string; employeeName?: string };

const companyName = z
  .string()
  .trim()
  .min(2, "Nazwa firmy musi mieć co najmniej 2 znaki")
  .max(80, "Nazwa firmy może mieć najwyżej 80 znaków");

const employeeId = z.uuid("Nieprawidłowy pracownik");

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

/**
 * Unieważnia ekrany, na których widać skład firmy.
 *
 * Returns:
 *     void: Nic — dane doczytają się przy następnym wejściu.
 */
function refreshCompanyViews() {
  revalidatePath("/ustawienia");
  revalidatePath("/pracownicy");
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------ właściciel */

/**
 * Włącza albo wyłącza tryb właściciela.
 *
 * Włączenie zakłada firmę, wyłączenie ją kasuje — a współwłaścicielowi pozwala
 * tylko odejść, bo cudzej firmy nie ma prawa skasować. Pracownicy zostają
 * z kontami, tracą wyłącznie powiązanie z firmą.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function setOwnerModeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const enabled = formData.get("enabled") === "true";

  if (!enabled) {
    // Współwłaściciel nie kasuje cudzej firmy — może tylko odejść.
    const coOwnership = await prisma.companyCoOwner.findFirst({
      where: { user_id: user.id },
      select: { company_id: true },
    });
    if (coOwnership) {
      await prisma.$transaction([
        prisma.companyCoOwner.deleteMany({ where: { user_id: user.id } }),
        prisma.user.update({ where: { id: user.id }, data: { is_owner: false } }),
      ]);
      refreshCompanyViews();
      return { success: "Zrezygnowano ze współwłasności" };
    }

    // onDelete: SetNull na users.company_id — pracownicy zostają z kontami,
    // tracą tylko powiązanie z firmą. Kaskada sprząta współwłaścicieli.
    await prisma.$transaction([
      prisma.company.deleteMany({ where: { owner_id: user.id } }),
      prisma.user.update({ where: { id: user.id }, data: { is_owner: false } }),
    ]);
    refreshCompanyViews();
    return { success: "Tryb właściciela wyłączony" };
  }

  const parsed = companyName.safeParse(formData.get("company_name"));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Podaj nazwę firmy");

  // Jedna firma na konto: bez tego współwłaściciel zakładał drugą i lądował
  // w dwóch rolach naraz, a `requireOwner` wybierało jedną z nich losowo.
  const coOwnership = await prisma.companyCoOwner.findFirst({
    where: { user_id: user.id },
    select: { company_id: true },
  });
  if (coOwnership) {
    return fail("Jesteś współwłaścicielem innej firmy — najpierw z niej zrezygnuj");
  }

  const nameKey = parsed.data.toLowerCase();
  const taken = await prisma.company.findFirst({
    where: { name_key: nameKey, owner_id: { not: user.id } },
    select: { id: true },
  });
  if (taken) return fail("Firma o tej nazwie już istnieje — wybierz inną nazwę");

  await prisma.$transaction([
    // Właściciel nie jest jednocześnie czyimś pracownikiem.
    prisma.joinRequest.deleteMany({ where: { user_id: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: { is_owner: true, company_id: null },
    }),
    prisma.company.upsert({
      where: { owner_id: user.id },
      create: { owner_id: user.id, name: parsed.data, name_key: nameKey },
      update: { name: parsed.data, name_key: nameKey },
    }),
  ]);

  refreshCompanyViews();
  return { success: "Zapisano firmę" };
}

/* --------------------------------------------------- współwłaściciele */

/**
 * Zaprasza do współwłasności firmy.
 *
 * Zaproszenie czeka na akceptację, więc literówka w adresie jest nieszkodliwa.
 * Przy nieznanym adresie odpowiadamy tak samo jak przy udanym zaproszeniu —
 * nie potwierdzamy, czy dane konto istnieje.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function inviteCoOwnerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, company } = await requireFounder();

  const parsed = z
    .email("Podaj poprawny adres e-mail")
    .safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return fail("Podaj poprawny adres e-mail");

  const email = normalizeEmail(parsed.data);
  const sent = { success: "Zaproszenie wysłane, jeśli takie konto istnieje" };

  if (email === normalizeEmail(user.email)) return fail("To Twoje własne konto");

  const invitee = await prisma.user.findUnique({
    where: { email },
    select: { id: true, is_deleted: true },
  });
  if (!invitee || invitee.is_deleted) return sent;

  const alreadyCoOwner = await prisma.companyCoOwner.findFirst({
    where: { company_id: company.id, user_id: invitee.id },
    select: { user_id: true },
  });
  if (alreadyCoOwner) return fail("Ta osoba jest już współwłaścicielem");

  // Właściciel innej firmy nie może współwłaścicielem tej — jedna firma na konto.
  const ownsAnother = await prisma.company.findFirst({
    where: { owner_id: invitee.id },
    select: { id: true },
  });
  if (ownsAnother) return fail("Ta osoba prowadzi już własną firmę");

  await prisma.coOwnerInvite.upsert({
    where: { company_id_user_id: { company_id: company.id, user_id: invitee.id } },
    create: { company_id: company.id, user_id: invitee.id },
    update: {},
  });

  refreshCompanyViews();
  return sent;
}

/**
 * Przyjmuje zaproszenie do współwłasności.
 *
 * Stan konta mógł się zmienić od wysłania zaproszenia, więc sprawdzamy jeszcze
 * raz, czy zapraszany nie prowadzi już własnej firmy.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function acceptCoOwnerInviteAction(): Promise<ActionState> {
  const user = await requireUser();

  const invite = await prisma.coOwnerInvite.findFirst({
    where: { user_id: user.id },
    select: { company_id: true, company: { select: { name: true } } },
  });
  if (!invite) return fail("Nie znaleziono zaproszenia");

  // Stan konta mógł się zmienić od wysłania zaproszenia — bez tych dwóch
  // sprawdzeń `create` kończyło się błędem unikalności i pustym 500.
  const ownCompany = await prisma.company.findUnique({
    where: { owner_id: user.id },
    select: { id: true },
  });
  if (ownCompany) return fail("Prowadzisz własną firmę — najpierw ją zamknij");

  const already = await prisma.companyCoOwner.findFirst({
    where: { user_id: user.id },
    select: { company_id: true },
  });
  if (already) return fail("Jesteś już współwłaścicielem firmy");

  await prisma.$transaction([
    prisma.companyCoOwner.create({
      data: { company_id: invite.company_id, user_id: user.id },
    }),
    prisma.coOwnerInvite.deleteMany({ where: { user_id: user.id } }),
    // Właściciel nie jest jednocześnie czyimś pracownikiem — tak samo jak
    // przy włączaniu trybu właściciela.
    prisma.joinRequest.deleteMany({ where: { user_id: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: { is_owner: true, company_id: null },
    }),
  ]);

  refreshCompanyViews();
  return { success: `Jesteś współwłaścicielem firmy ${invite.company.name}` };
}

/**
 * Odrzuca zaproszenie do współwłasności.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie odrzucenia.
 */
export async function rejectCoOwnerInviteAction(): Promise<ActionState> {
  const user = await requireUser();
  await prisma.coOwnerInvite.deleteMany({ where: { user_id: user.id } });
  refreshCompanyViews();
  return { success: "Zaproszenie odrzucone" };
}

/**
 * Usuwa współwłaściciela z firmy.
 *
 * Tryb właściciela spada mu tylko wtedy, gdy nie zostaje mu żadna inna firma.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function removeCoOwnerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { company } = await requireFounder();

  const parsed = employeeId.safeParse(formData.get("user_id"));
  if (!parsed.success) return fail("Nieprawidłowy współwłaściciel");

  const { count } = await prisma.companyCoOwner.deleteMany({
    where: { company_id: company.id, user_id: parsed.data },
  });
  if (count === 0) return fail("Nie znaleziono współwłaściciela");

  // Tryb właściciela spada tylko wtedy, gdy nie zostaje mu żadna firma —
  // inaczej osoba, która w międzyczasie założyła własną, traciła do niej dostęp.
  const [ownCompany, otherCoOwnership] = await Promise.all([
    prisma.company.findUnique({ where: { owner_id: parsed.data }, select: { id: true } }),
    prisma.companyCoOwner.findFirst({ where: { user_id: parsed.data }, select: { company_id: true } }),
  ]);
  if (!ownCompany && !otherCoOwnership) {
    await prisma.user.update({ where: { id: parsed.data }, data: { is_owner: false } });
  }

  refreshCompanyViews();
  return { success: "Usunięto współwłaściciela" };
}

/* ------------------------------------------------------------- pracownik */

/**
 * Wysyła prośbę o dołączenie do firmy o podanej nazwie.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function requestJoinAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (user.is_owner) return fail("Właściciel firmy nie może dołączyć do innej firmy");
  if (user.company_id) return fail("Należysz już do firmy — najpierw ją opuść");

  const parsed = companyName.safeParse(formData.get("company_name"));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Podaj nazwę firmy");

  const company = await prisma.company.findUnique({
    where: { name_key: parsed.data.toLowerCase() },
    select: { id: true, name: true },
  });
  if (!company) return fail("Nie znaleziono firmy o takiej nazwie — sprawdź pisownię u właściciela");

  await prisma.joinRequest.upsert({
    where: { user_id: user.id },
    create: { user_id: user.id, company_id: company.id },
    update: { company_id: company.id },
  });

  refreshCompanyViews();
  return { success: `Wysłano prośbę do firmy ${company.name}. Czekaj na akceptację.` };
}

/**
 * Anuluje własną prośbę o dołączenie.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie anulowania.
 */
export async function cancelJoinRequestAction(): Promise<ActionState> {
  const user = await requireUser();
  await prisma.joinRequest.deleteMany({ where: { user_id: user.id } });
  refreshCompanyViews();
  return { success: "Prośba anulowana" };
}

/**
 * Opuszcza firmę pracodawcy.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie opuszczenia.
 */
export async function leaveCompanyAction(): Promise<ActionState> {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { company_id: null } });
  refreshCompanyViews();
  return { success: "Opuszczono firmę" };
}

/* --------------------------------------------------- zarządzanie zespołem */

/**
 * Przyjmuje pracownika do firmy.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function acceptJoinRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { company } = await requireOwner();
  const parsed = employeeId.safeParse(formData.get("user_id"));
  if (!parsed.success) return fail("Nieprawidłowa prośba");

  // Warunek company_id chroni przed zaakceptowaniem prośby złożonej do kogoś innego.
  const request = await prisma.joinRequest.findFirst({
    where: { user_id: parsed.data, company_id: company.id },
    select: { id: true },
  });
  if (!request) return fail("Nie znaleziono prośby");

  await prisma.$transaction([
    prisma.user.update({ where: { id: parsed.data }, data: { company_id: company.id } }),
    prisma.joinRequest.delete({ where: { id: request.id } }),
  ]);

  refreshCompanyViews();
  return { success: "Pracownik dołączył do firmy" };
}

/**
 * Odrzuca prośbę o dołączenie do firmy.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function rejectJoinRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { company } = await requireOwner();
  const parsed = employeeId.safeParse(formData.get("user_id"));
  if (!parsed.success) return fail("Nieprawidłowa prośba");

  await prisma.joinRequest.deleteMany({
    where: { user_id: parsed.data, company_id: company.id },
  });

  refreshCompanyViews();
  return { success: "Prośba odrzucona" };
}

/**
 * Usuwa pracownika z firmy, zostawiając mu konto.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function removeEmployeeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { company } = await requireOwner();
  const parsed = employeeId.safeParse(formData.get("user_id"));
  if (!parsed.success) return fail("Nieprawidłowy pracownik");

  const { count } = await prisma.user.updateMany({
    where: { id: parsed.data, company_id: company.id },
    data: { company_id: null },
  });
  if (count === 0) return fail("Nie znaleziono pracownika");

  refreshCompanyViews();
  return { success: "Pracownik usunięty z firmy" };
}

/**
 * Nadaje pracownikowi nowe hasło startowe.
 *
 * Hasło pokazujemy jeden raz właścicielowi, a stare sesje pracownika przestają
 * działać razem ze starym hasłem.
 *
 * Args:
 *     _prev (ResetPasswordState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Identyfikator pracownika.
 *
 * Returns:
 *     Promise<ResetPasswordState>: Nowe hasło i imię pracownika albo błąd.
 */
export async function resetEmployeePasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const { company } = await requireOwner();
  const parsed = employeeId.safeParse(formData.get("user_id"));
  if (!parsed.success) return fail("Nieprawidłowy pracownik");

  const employee = await prisma.user.findFirst({
    where: { id: parsed.data, company_id: company.id },
    select: { id: true, name: true },
  });
  if (!employee) return fail("Nie znaleziono pracownika");

  const password = generateResetPassword();
  await prisma.user.update({
    where: { id: employee.id },
    data: { password_hash: await hashSecret(password), must_change_password: true },
  });
  // Stare sesje pracownika przestają działać razem ze starym hasłem.
  await endAllSessions(employee.id);

  return { password, employeeName: employee.name };
}
