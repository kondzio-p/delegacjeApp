// Kształty wierszy przekazywane z serwera do komponentów klienckich.
// Wszystko jest już zserializowane: daty jako ISO, kwoty jako number.
import type { Currency } from "./money";

export type Trip = {
  id: string;
  departure_at: string;
  return_at: string | null;
  note: string | null;
  share_token: string;
  share_enabled: boolean;
};

/** Sam czas pracy — kwoty są wyłącznie w Expense i Payout. */
export type WorkEntry = {
  id: string;
  trip_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
};

export type Expense = {
  id: string;
  trip_id: string | null;
  name: string;
  amount: number;
  currency: Currency;
  category: string;
  spent_at: string;
  /** Kurs NBP z dnia wpisu; null = brak, odczyt sięgnie po kurs bieżący. */
  nbp_rate: number | null;
};

export type Payout = {
  id: string;
  trip_id: string | null;
  amount: number;
  currency: Currency;
  note: string | null;
  paid_at: string;
  /** Kurs NBP z dnia wpisu; null = brak, odczyt sięgnie po kurs bieżący. */
  nbp_rate: number | null;
};

export type SessionUser = {
  id: string;
  email: string;
  /** Imię albo pseudonim — tym podpisujemy użytkownika w całej aplikacji. */
  name: string;
  is_owner: boolean;
  company_id: string | null;
  must_change_password: boolean;
  /** Własne kategorie kosztów tego konta. */
  expense_categories: string[];
  /** Waluta wyświetlania — preferencja konta, nie przeglądarki. */
  display_currency: string;
  /** Język interfejsu — źródło prawdy, ciasteczko jest tylko nośnikiem. */
  locale: string;
  is_deleted: boolean;
};

/** Wynik akcji formularza — wspólny kształt dla useActionState. */
export type ActionState = { error?: string; success?: string };
