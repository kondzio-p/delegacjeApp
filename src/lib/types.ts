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

export type WorkEntry = {
  id: string;
  trip_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  rate: number;
  rate_currency: Currency;
};

export type Expense = {
  id: string;
  trip_id: string | null;
  name: string;
  amount: number;
  currency: Currency;
  category: string;
  spent_at: string;
};

export type Payout = {
  id: string;
  trip_id: string | null;
  amount: number;
  currency: Currency;
  note: string | null;
  paid_at: string;
};

export type SessionUser = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  is_owner: boolean;
  company_id: string | null;
  must_change_password: boolean;
};

/** Wynik akcji formularza — wspólny kształt dla useActionState. */
export type ActionState = { error?: string; success?: string };

export function displayName(user: {
  username: string;
  first_name: string | null;
  last_name: string | null;
}): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return full || user.username;
}
