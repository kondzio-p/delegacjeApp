"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireOwner, requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/types";

const uuid = z.uuid("Nieprawidłowy identyfikator");
const currency = z.enum(["EUR", "PLN"]);
const category = z.enum(["Paliwo", "Jedzenie", "Zakwaterowanie", "Inne"]);
const localDateTime = z.string().min(1, "Podaj datę i godzinę");
const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowa data");
const timeString = z.string().regex(/^\d{2}:\d{2}$/, "Nieprawidłowa godzina");

/** Puste pole formularza to brak wartości, nie pusty string. */
function optionalText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

/** Kwoty wpisuje się i z kropką, i z przecinkiem. */
function parseAmount(value: FormDataEntryValue | null): number {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function fail(error: string): ActionState {
  return { error };
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Nieprawidłowe dane";
}

/**
 * Ustala, czyje dane są modyfikowane. Bez `employee_id` to zalogowany użytkownik;
 * z `employee_id` — pracownik z firmy zalogowanego właściciela (i tylko taki).
 */
async function resolveTargetUser(formData: FormData): Promise<string> {
  const employeeId = formData.get("employee_id");
  if (typeof employeeId !== "string" || employeeId === "") {
    const user = await requireUser();
    return user.id;
  }

  const parsed = uuid.safeParse(employeeId);
  if (!parsed.success) throw new Error("Nieprawidłowy pracownik");

  const { company } = await requireOwner();
  const employee = await prisma.user.findFirst({
    where: { id: parsed.data, company_id: company.id },
    select: { id: true },
  });
  if (!employee) throw new Error("Nie znaleziono pracownika");

  return employee.id;
}

/** Sprawdza, że podróż należy do właściciela wpisu. Null = bez przypisania. */
async function resolveTripId(userId: string, value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value === "") return null;

  const parsed = uuid.safeParse(value);
  if (!parsed.success) throw new Error("Nieprawidłowa podróż");

  const trip = await prisma.trip.findFirst({
    where: { id: parsed.data, user_id: userId },
    select: { id: true },
  });
  if (!trip) throw new Error("Nie znaleziono podróży");

  return trip.id;
}

function refreshAll() {
  revalidatePath("/", "layout");
}

/* ---------------------------------------------------------------- podróże */

export async function createTripAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const ongoing = formData.get("ongoing") === "on";

  const parsed = z
    .object({ departure_at: localDateTime, return_at: z.string() })
    .safeParse({
      departure_at: formData.get("departure_at"),
      return_at: formData.get("return_at") ?? "",
    });
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const departure = new Date(parsed.data.departure_at);
  if (Number.isNaN(departure.getTime())) return fail("Nieprawidłowa data wyjazdu");

  const returnAt = ongoing || !parsed.data.return_at ? null : new Date(parsed.data.return_at);
  if (returnAt && Number.isNaN(returnAt.getTime())) return fail("Nieprawidłowa data powrotu");
  if (returnAt && returnAt < departure) {
    return fail("Powrót nie może być wcześniejszy niż wyjazd");
  }

  await prisma.trip.create({
    data: { user_id: user.id, departure_at: departure, return_at: returnAt },
  });

  refreshAll();
  return { success: "Dodano podróż" };
}

export async function updateTripAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = z
    .object({ id: uuid, departure_at: localDateTime, return_at: z.string() })
    .safeParse({
      id: formData.get("id"),
      departure_at: formData.get("departure_at"),
      return_at: formData.get("return_at") ?? "",
    });
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const departure = new Date(parsed.data.departure_at);
  if (Number.isNaN(departure.getTime())) return fail("Nieprawidłowa data wyjazdu");

  const returnAt = parsed.data.return_at ? new Date(parsed.data.return_at) : null;
  if (returnAt && Number.isNaN(returnAt.getTime())) return fail("Nieprawidłowa data powrotu");
  if (returnAt && returnAt < departure) {
    return fail("Powrót nie może być wcześniejszy niż wyjazd");
  }

  // updateMany z warunkiem user_id — cudzej podróży nie da się ruszyć.
  const { count } = await prisma.trip.updateMany({
    where: { id: parsed.data.id, user_id: user.id },
    data: { departure_at: departure, return_at: returnAt },
  });
  if (count === 0) return fail("Nie znaleziono podróży");

  refreshAll();
  return { success: "Zapisano zmiany" };
}

export async function deleteTripAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return fail("Nieprawidłowa podróż");

  const { count } = await prisma.trip.deleteMany({
    where: { id: parsed.data, user_id: user.id },
  });
  if (count === 0) return fail("Nie znaleziono podróży");

  refreshAll();
  return { success: "Usunięto podróż" };
}

export async function setTripShareAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return fail("Nieprawidłowa podróż");

  const enabled = formData.get("enabled") === "true";
  const { count } = await prisma.trip.updateMany({
    where: { id: parsed.data, user_id: user.id },
    data: { share_enabled: enabled },
  });
  if (count === 0) return fail("Nie znaleziono podróży");

  refreshAll();
  return { success: enabled ? "Udostępnianie włączone" : "Udostępnianie wyłączone" };
}

/* ---------------------------------------------------------------- godziny */

export async function createWorkEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const userId = await resolveTargetUser(formData);
    const tripId = await resolveTripId(userId, formData.get("trip_id"));

    const parsed = z
      .object({
        work_date: dayString,
        start_time: timeString,
        end_time: timeString,
        rate: z.number().nonnegative("Stawka nie może być ujemna"),
        rate_currency: currency,
      })
      .safeParse({
        work_date: formData.get("work_date"),
        start_time: formData.get("start_time"),
        end_time: formData.get("end_time"),
        rate: parseAmount(formData.get("rate")),
        rate_currency: formData.get("rate_currency"),
      });
    if (!parsed.success) return fail(firstIssue(parsed.error));

    await prisma.workEntry.create({
      data: { user_id: userId, trip_id: tripId, ...parsed.data },
    });

    refreshAll();
    return { success: "Dodano wpis" };
  } catch (error) {
    unstable_rethrow(error);
    return fail(error instanceof Error ? error.message : "Nie udało się dodać wpisu");
  }
}

export async function updateWorkEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const userId = await resolveTargetUser(formData);
    const tripId = await resolveTripId(userId, formData.get("trip_id"));

    const parsed = z
      .object({
        id: uuid,
        work_date: dayString,
        start_time: timeString,
        end_time: timeString,
        rate: z.number().nonnegative("Stawka nie może być ujemna"),
        rate_currency: currency,
      })
      .safeParse({
        id: formData.get("id"),
        work_date: formData.get("work_date"),
        start_time: formData.get("start_time"),
        end_time: formData.get("end_time"),
        rate: parseAmount(formData.get("rate")),
        rate_currency: formData.get("rate_currency"),
      });
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const { id, ...values } = parsed.data;
    const { count } = await prisma.workEntry.updateMany({
      where: { id, user_id: userId },
      data: { ...values, trip_id: tripId },
    });
    if (count === 0) return fail("Nie znaleziono wpisu");

    refreshAll();
    return { success: "Zapisano wpis" };
  } catch (error) {
    unstable_rethrow(error);
    return fail(error instanceof Error ? error.message : "Nie udało się zapisać wpisu");
  }
}

export async function deleteWorkEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const userId = await resolveTargetUser(formData);
    const parsed = uuid.safeParse(formData.get("id"));
    if (!parsed.success) return fail("Nieprawidłowy wpis");

    const { count } = await prisma.workEntry.deleteMany({
      where: { id: parsed.data, user_id: userId },
    });
    if (count === 0) return fail("Nie znaleziono wpisu");

    refreshAll();
    return { success: "Usunięto wpis" };
  } catch (error) {
    unstable_rethrow(error);
    return fail(error instanceof Error ? error.message : "Nie udało się usunąć wpisu");
  }
}

/* ---------------------------------------------------------------- finanse */

export async function createExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const tripId = await resolveTripId(user.id, formData.get("trip_id"));

    const parsed = z
      .object({
        name: z.string().trim().min(1, "Podaj nazwę kosztu").max(200),
        amount: z.number("Podaj kwotę"),
        currency,
        category,
      })
      .safeParse({
        name: formData.get("name"),
        amount: parseAmount(formData.get("amount")),
        currency: formData.get("currency"),
        category: formData.get("category"),
      });
    if (!parsed.success) return fail(firstIssue(parsed.error));

    await prisma.expense.create({ data: { user_id: user.id, trip_id: tripId, ...parsed.data } });

    refreshAll();
    return { success: "Dodano koszt" };
  } catch (error) {
    unstable_rethrow(error);
    return fail(error instanceof Error ? error.message : "Nie udało się dodać kosztu");
  }
}

export async function deleteExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return fail("Nieprawidłowy koszt");

  const { count } = await prisma.expense.deleteMany({
    where: { id: parsed.data, user_id: user.id },
  });
  if (count === 0) return fail("Nie znaleziono kosztu");

  refreshAll();
  return { success: "Usunięto koszt" };
}

export async function createPayoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const tripId = await resolveTripId(user.id, formData.get("trip_id"));

    const parsed = z
      .object({ amount: z.number("Podaj kwotę"), currency })
      .safeParse({
        amount: parseAmount(formData.get("amount")),
        currency: formData.get("currency"),
      });
    if (!parsed.success) return fail(firstIssue(parsed.error));

    await prisma.payout.create({
      data: {
        user_id: user.id,
        trip_id: tripId,
        ...parsed.data,
        note: optionalText(formData.get("note")),
      },
    });

    refreshAll();
    return { success: "Dodano wypłatę" };
  } catch (error) {
    unstable_rethrow(error);
    return fail(error instanceof Error ? error.message : "Nie udało się dodać wypłaty");
  }
}

export async function deletePayoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return fail("Nieprawidłowa wypłata");

  const { count } = await prisma.payout.deleteMany({
    where: { id: parsed.data, user_id: user.id },
  });
  if (count === 0) return fail("Nie znaleziono wypłaty");

  refreshAll();
  return { success: "Usunięto wypłatę" };
}
