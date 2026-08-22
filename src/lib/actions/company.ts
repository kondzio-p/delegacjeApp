"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { endAllSessions, generateResetPassword, hashSecret } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOwner, requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/types";

export type ResetPasswordState = ActionState & { password?: string; employeeName?: string };

const companyName = z
  .string()
  .trim()
  .min(2, "Nazwa firmy musi mieć co najmniej 2 znaki")
  .max(80, "Nazwa firmy może mieć najwyżej 80 znaków");

const employeeId = z.uuid("Nieprawidłowy pracownik");

function fail(error: string): ActionState {
  return { error };
}

function refreshCompanyViews() {
  revalidatePath("/ustawienia");
  revalidatePath("/pracownicy");
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------ właściciel */

/** Włączenie trybu właściciela zakłada firmę; wyłączenie ją kasuje. */
export async function setOwnerModeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const enabled = formData.get("enabled") === "true";

  if (!enabled) {
    // onDelete: SetNull na users.company_id — pracownicy zostają z kontami,
    // tracą tylko powiązanie z firmą.
    await prisma.$transaction([
      prisma.company.deleteMany({ where: { owner_id: user.id } }),
      prisma.user.update({ where: { id: user.id }, data: { is_owner: false } }),
    ]);
    refreshCompanyViews();
    return { success: "Tryb właściciela wyłączony" };
  }

  const parsed = companyName.safeParse(formData.get("company_name"));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Podaj nazwę firmy");

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

/* ------------------------------------------------------------- pracownik */

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

export async function cancelJoinRequestAction(): Promise<ActionState> {
  const user = await requireUser();
  await prisma.joinRequest.deleteMany({ where: { user_id: user.id } });
  refreshCompanyViews();
  return { success: "Prośba anulowana" };
}

export async function leaveCompanyAction(): Promise<ActionState> {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { company_id: null } });
  refreshCompanyViews();
  return { success: "Opuszczono firmę" };
}

/* --------------------------------------------------- zarządzanie zespołem */

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

/** Nadaje pracownikowi losowe 7-literowe hasło i zwraca je jeden raz. */
export async function resetEmployeePasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const { company } = await requireOwner();
  const parsed = employeeId.safeParse(formData.get("user_id"));
  if (!parsed.success) return fail("Nieprawidłowy pracownik");

  const employee = await prisma.user.findFirst({
    where: { id: parsed.data, company_id: company.id },
    select: { id: true, username: true },
  });
  if (!employee) return fail("Nie znaleziono pracownika");

  const password = generateResetPassword();
  await prisma.user.update({
    where: { id: employee.id },
    data: { password_hash: await hashSecret(password), must_change_password: true },
  });
  // Stare sesje pracownika przestają działać razem ze starym hasłem.
  await endAllSessions(employee.id);

  return { password, employeeName: employee.username };
}
