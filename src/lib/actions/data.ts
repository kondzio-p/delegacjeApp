"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { dayToMoment, isCalendarDay, momentToDay } from "@/lib/day";
import { prisma } from "@/lib/db";
import { CURRENCIES, type Currency } from "@/lib/money";
import { getRateForDate } from "@/lib/nbp";
import { isoDate } from "@/lib/rates";
import { requireOwner, requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/types";

const uuid = z.uuid("Nieprawidłowy identyfikator");
/** Enum z `money.ts` nie rozjedzie się z interfejsem przy nowej walucie. */
const currency = z.enum(CURRENCIES);
const localDateTime = z.string().min(1, "Podaj datę i godzinę");
const dayString = z.string().refine(isCalendarDay, "Nieprawidłowa data");
/** Dzień operacji z dobą zapasu — „dziś" zależy od strefy użytkownika. */
const pastDay = dayString.refine(
  (day) => day <= isoDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  "Data nie może być z przyszłości",
);
// Zakres godzin, nie sam kształt: „99:99" przechodziło przez `\d{2}:\d{2}`,
// a `hoursBetween` liczyło z tego prawdziwe godziny do raportu firmy.
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Nieprawidłowa godzina");

/**
 * Zamienia puste pole formularza na brak wartości.
 *
 * Args:
 *     value (FormDataEntryValue | null): Surowa wartość z formularza.
 *
 * Returns:
 *     string | null: Przycięty tekst albo null, gdy pole było puste.
 */
function optionalText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

/**
 * Czyta kwotę wpisaną z kropką albo z przecinkiem.
 *
 * Args:
 *     value (FormDataEntryValue | null): Surowa wartość z formularza.
 *
 * Returns:
 *     number: Kwota albo NaN, gdy pole nie jest liczbą.
 */
function parseAmount(value: FormDataEntryValue | null): number {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : NaN;
}

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
 * Wyciąga pierwszy komunikat z błędu walidacji.
 *
 * Args:
 *     error (z.ZodError): Wynik nieudanego `safeParse`.
 *
 * Returns:
 *     string: Komunikat dla użytkownika.
 */
function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Nieprawidłowe dane";
}

/**
 * Ustala, czyje dane są modyfikowane.
 *
 * Bez `employee_id` chodzi o zalogowanego użytkownika; z `employee_id` —
 * o pracownika z firmy zalogowanego właściciela i tylko takiego.
 *
 * Args:
 *     formData (FormData): Dane formularza akcji.
 *
 * Returns:
 *     Promise<string>: Identyfikator właściciela zmienianych danych.
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

/**
 * Sprawdza, że podróż należy do właściciela wpisu.
 *
 * Args:
 *     userId (string): Właściciel zapisywanego wpisu.
 *     value (FormDataEntryValue | null): Identyfikator podróży z formularza.
 *
 * Returns:
 *     Promise<string | null>: Identyfikator podróży albo null przy braku
 *     przypisania; cudza podróż kończy się wyjątkiem.
 */
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

/**
 * Unieważnia cache wszystkich ekranów po zapisie.
 *
 * Returns:
 *     void: Nic — Next przeliczy strony przy następnym wejściu.
 */
function refreshAll() {
  revalidatePath("/", "layout");
}

/**
 * Zamraża kurs NBP przy zapisywanej kwocie.
 *
 * Dzień bierzemy z formularza, nie z zegara: paragon z poniedziałku wpisany
 * w środę dostaje kurs poniedziałkowy, dzięki czemu podsumowanie za marzec
 * wygląda tak samo w czerwcu. Brak odpowiedzi z NBP nie może wywalić zapisu.
 *
 * Args:
 *     currency (Currency): Waluta kwoty.
 *     day (string): Dzień operacji w formacie „YYYY-MM-DD".
 *
 * Returns:
 *     Promise<{ nbp_rate: number | null; nbp_rate_date: string | null }>:
 *     Kurs i data tabeli; null, gdy NBP nie odpowiedziało.
 */
async function freezeRate(currency: Currency, day: string) {
  if (currency === "PLN") return { nbp_rate: 1, nbp_rate_date: day };

  const rate = await getRateForDate(currency, day);
  return rate
    ? { nbp_rate: rate.mid, nbp_rate_date: rate.effectiveDate }
    : { nbp_rate: null, nbp_rate_date: null };
}

/* ---------------------------------------------------------------- podróże */

/**
 * Zakłada nową podróż zalogowanego użytkownika.
 *
 * Podróż bez daty powrotu jest traktowana jako trwająca.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
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

/**
 * Zapisuje zmienione daty podróży.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
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

/**
 * Kasuje podróż razem z jej udostępnieniem.
 *
 * Wpisy godzin i kwoty zostają — tracą tylko przypisanie do wyjazdu.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
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

/**
 * Włącza albo wyłącza publiczny link do podróży.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
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

/* ------------------------------------------------------- kategorie kosztów */

const categoryName = z
  .string()
  .trim()
  .min(1, "Podaj nazwę kategorii")
  .max(30, "Nazwa kategorii może mieć najwyżej 30 znaków");

/**
 * Porównuje nazwy kategorii bez względu na wielkość liter.
 *
 * Args:
 *     a (string): Pierwsza nazwa.
 *     b (string): Druga nazwa.
 *
 * Returns:
 *     boolean: True, gdy „Paliwo" i „paliwo" mają być jedną kategorią.
 */
function sameCategory(a: string, b: string): boolean {
  return a.localeCompare(b, "pl", { sensitivity: "accent" }) === 0;
}

/**
 * Dokłada kategorię kosztów do listy konta.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function addExpenseCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = categoryName.safeParse(formData.get("name"));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (user.expense_categories.some((c) => sameCategory(c, parsed.data))) {
    return fail("Taka kategoria już jest na liście");
  }
  if (user.expense_categories.length >= 20) {
    return fail("Więcej niż 20 kategorii robi się nieczytelne");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { expense_categories: { push: parsed.data } },
  });

  refreshAll();
  return { success: "Dodano kategorię" };
}

/**
 * Usuwa kategorię z listy konta.
 *
 * Istniejące koszty zostają nietknięte — kategoria jest w nich tekstem, nie
 * kluczem obcym, więc dalej pokazują swoją nazwę i wchodzą do podsumowania.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Pole „name" z nazwą kategorii.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function removeExpenseCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = categoryName.safeParse(formData.get("name"));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const next = user.expense_categories.filter((c) => !sameCategory(c, parsed.data));
  if (next.length === user.expense_categories.length) return fail("Nie znaleziono kategorii");
  if (next.length === 0) return fail("Zostaw przynajmniej jedną kategorię");

  await prisma.user.update({
    where: { id: user.id },
    data: { expense_categories: next },
  });

  refreshAll();
  return { success: "Usunięto kategorię" };
}

/**
 * Zmienia nazwę kategorii razem z istniejącymi kosztami.
 *
 * Tego oczekuje ktoś, kto poprawia literówkę albo doprecyzowuje nazwę.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Pola „from" i „to" z nazwami kategorii.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function renameExpenseCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = z
    .object({ from: categoryName, to: categoryName })
    .safeParse({ from: formData.get("from"), to: formData.get("to") });
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const { from, to } = parsed.data;
  if (!user.expense_categories.some((c) => sameCategory(c, from))) {
    return fail("Nie znaleziono kategorii");
  }
  if (user.expense_categories.some((c) => sameCategory(c, to) && !sameCategory(c, from))) {
    return fail("Taka kategoria już jest na liście");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        expense_categories: user.expense_categories.map((c) => (sameCategory(c, from) ? to : c)),
      },
    }),
    prisma.expense.updateMany({
      where: { user_id: user.id, category: from },
      data: { category: to },
    }),
  ]);

  refreshAll();
  return { success: "Zmieniono nazwę kategorii" };
}

/* ---------------------------------------------------------------- godziny */

/**
 * Zapisuje wpis godzin — własny albo pracownika.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
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
      })
      .safeParse({
        work_date: formData.get("work_date"),
        start_time: formData.get("start_time"),
        end_time: formData.get("end_time"),
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

/**
 * Zapisuje zmiany we wpisie godzin.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
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
      })
      .safeParse({
        id: formData.get("id"),
        work_date: formData.get("work_date"),
        start_time: formData.get("start_time"),
        end_time: formData.get("end_time"),
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

/**
 * Kasuje wpis godzin.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
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

/**
 * Zapisuje koszt razem z kursem NBP z dnia wydatku.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
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
        // Kategoria musi pochodzić z listy tego konta, inaczej podrobiony
        // formularz wstawiłby dowolny tekst.
        category: z.enum(user.expense_categories as [string, ...string[]], {
          message: "Nieznana kategoria kosztu",
        }),
        spent_on: pastDay,
      })
      .safeParse({
        name: formData.get("name"),
        amount: parseAmount(formData.get("amount")),
        currency: formData.get("currency"),
        category: formData.get("category"),
        spent_on: formData.get("spent_on"),
      });
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const { spent_on, ...values } = parsed.data;
    await prisma.expense.create({
      data: {
        user_id: user.id,
        trip_id: tripId,
        ...values,
        spent_at: dayToMoment(spent_on),
        ...(await freezeRate(values.currency, spent_on)),
      },
    });

    refreshAll();
    return { success: "Dodano koszt" };
  } catch (error) {
    unstable_rethrow(error);
    return fail(error instanceof Error ? error.message : "Nie udało się dodać kosztu");
  }
}

/**
 * Zapisuje zmiany w koszcie.
 *
 * Kurs przeliczamy na nowo tylko wtedy, gdy zmieniła się waluta albo dzień —
 * poprawianie literówki w nazwie nie ma prawa ruszyć kursu zamrożonego przy
 * pierwotnym zapisie, bo to zmieniłoby kwoty w gotowych podsumowaniach.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Pola kosztu razem z jego identyfikatorem.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function updateExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const tripId = await resolveTripId(user.id, formData.get("trip_id"));

    const parsed = z
      .object({
        id: uuid,
        name: z.string().trim().min(1, "Podaj nazwę kosztu").max(200),
        amount: z.number("Podaj kwotę"),
        currency,
        category: z.enum(user.expense_categories as [string, ...string[]], {
          message: "Nieznana kategoria kosztu",
        }),
        spent_on: pastDay,
      })
      .safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        amount: parseAmount(formData.get("amount")),
        currency: formData.get("currency"),
        category: formData.get("category"),
        spent_on: formData.get("spent_on"),
      });
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const { id, spent_on, ...values } = parsed.data;
    const existing = await prisma.expense.findFirst({
      where: { id, user_id: user.id },
      select: { currency: true, spent_at: true },
    });
    if (!existing) return fail("Nie znaleziono kosztu");

    const rateStale =
      values.currency !== existing.currency || spent_on !== momentToDay(existing.spent_at);

    await prisma.expense.update({
      where: { id },
      data: {
        ...values,
        trip_id: tripId,
        spent_at: dayToMoment(spent_on),
        ...(rateStale ? await freezeRate(values.currency, spent_on) : {}),
      },
    });

    refreshAll();
    return { success: "Zapisano koszt" };
  } catch (error) {
    unstable_rethrow(error);
    return fail(error instanceof Error ? error.message : "Nie udało się zapisać kosztu");
  }
}
/**
 * Kasuje koszt.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
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

/**
 * Zapisuje wypłatę razem z kursem NBP z dnia wypłaty.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function createPayoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const tripId = await resolveTripId(user.id, formData.get("trip_id"));

    const parsed = z
      .object({ amount: z.number("Podaj kwotę"), currency, paid_on: pastDay })
      .safeParse({
        amount: parseAmount(formData.get("amount")),
        currency: formData.get("currency"),
        paid_on: formData.get("paid_on"),
      });
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const { paid_on, ...values } = parsed.data;
    await prisma.payout.create({
      data: {
        user_id: user.id,
        trip_id: tripId,
        ...values,
        note: optionalText(formData.get("note")),
        paid_at: dayToMoment(paid_on),
        ...(await freezeRate(values.currency, paid_on)),
      },
    });

    refreshAll();
    return { success: "Dodano wypłatę" };
  } catch (error) {
    unstable_rethrow(error);
    return fail(error instanceof Error ? error.message : "Nie udało się dodać wypłaty");
  }
}

/**
 * Zapisuje zmiany w wypłacie.
 *
 * Kurs przeliczamy na tych samych zasadach co przy koszcie: tylko po zmianie
 * waluty albo dnia.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Pola wypłaty razem z jej identyfikatorem.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
export async function updatePayoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const tripId = await resolveTripId(user.id, formData.get("trip_id"));

    const parsed = z
      .object({ id: uuid, amount: z.number("Podaj kwotę"), currency, paid_on: pastDay })
      .safeParse({
        id: formData.get("id"),
        amount: parseAmount(formData.get("amount")),
        currency: formData.get("currency"),
        paid_on: formData.get("paid_on"),
      });
    if (!parsed.success) return fail(firstIssue(parsed.error));

    const { id, paid_on, ...values } = parsed.data;
    const existing = await prisma.payout.findFirst({
      where: { id, user_id: user.id },
      select: { currency: true, paid_at: true },
    });
    if (!existing) return fail("Nie znaleziono wypłaty");

    const rateStale =
      values.currency !== existing.currency || paid_on !== momentToDay(existing.paid_at);

    await prisma.payout.update({
      where: { id },
      data: {
        ...values,
        trip_id: tripId,
        note: optionalText(formData.get("note")),
        paid_at: dayToMoment(paid_on),
        ...(rateStale ? await freezeRate(values.currency, paid_on) : {}),
      },
    });

    refreshAll();
    return { success: "Zapisano wypłatę" };
  } catch (error) {
    unstable_rethrow(error);
    return fail(error instanceof Error ? error.message : "Nie udało się zapisać wypłaty");
  }
}
/**
 * Kasuje wypłatę.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Dane wysłane z formularza.
 *
 * Returns:
 *     Promise<ActionState>: Potwierdzenie albo komunikat błędu.
 */
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
