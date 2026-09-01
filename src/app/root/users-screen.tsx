"use client";

import { KeyRound, Lock, LogOut, Search, Unlock } from "lucide-react";
import { useActionState, useState } from "react";

import { useAction } from "@/components/use-action";
import { FormMessage, Modal } from "@/components/ui";
import {
  resetUserPasswordAction,
  setCompanyAccessAction,
  setUserBlockedAction,
  signOutUserAction,
  type RootPasswordState,
} from "@/lib/actions/root";
import type { RootUserRow, UserFilter } from "@/lib/queries-root";

const FILTER_LABELS: Record<UserFilter, string> = {
  all: "Wszystkie",
  owners: "Właściciele",
  employees: "Pracownicy",
  noCompany: "Bez firmy",
  blocked: "Zablokowane",
  deleted: "Usunięte",
};

const EMPTY_PASSWORD: RootPasswordState = {};

/**
 * Dzień z zapisu ISO — w panelu wystarczy data bez godziny.
 *
 * Args:
 *     iso (string): Moment w zapisie ISO.
 *
 * Returns:
 *     string: Dzień „YYYY-MM-DD".
 */
function day(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Lista kont z wyszukiwarką, filtrami i akcjami roota.
 *
 * Args:
 *     users (RootUserRow[]): Konta pasujące do bieżącego filtru.
 *     search (string): Fraza wpisana w wyszukiwarkę.
 *     filter (UserFilter): Aktywny filtr listy.
 *
 * Returns:
 *     ReactNode: Sekcja z kontami.
 */
export function UsersScreen({
  users,
  search,
  filter,
}: {
  users: RootUserRow[];
  search: string;
  filter: UserFilter;
}) {
  const [passwordState, resetPassword] = useActionState(
    resetUserPasswordAction,
    EMPTY_PASSWORD,
  );

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Konta
      </h2>

      <form method="get" action="/root" className="mt-3 flex gap-2">
        <input type="hidden" name="filtr" value={filter} />
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={search}
            maxLength={120}
            placeholder="Szukaj po adresie e-mail albo imieniu"
            className="input-field pl-9"
          />
        </div>
        <button
          type="submit"
          className="h-12 shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          Szukaj
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as UserFilter[]).map((key) => {
          const query = new URLSearchParams({ filtr: key, ...(search ? { q: search } : {}) });
          return (
            <a
              key={key}
              href={`/root?${query.toString()}`}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                key === filter ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}
            >
              {FILTER_LABELS[key]}
            </a>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {users.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
            Żadne konto nie pasuje do tego wyszukiwania.
          </p>
        ) : (
          users.map((user) => (
            <UserCard key={user.id} user={user} onResetPassword={resetPassword} />
          ))
        )}
      </div>

      {passwordState.password && (
        <Modal title="Hasło jednorazowe" onClose={() => window.location.reload()}>
          <p className="text-sm text-muted-foreground">
            Przekaż je osobie {passwordState.userLabel}. Przy najbliższym logowaniu aplikacja
            poprosi o ustawienie własnego hasła, a wszystkie dotychczasowe sesje tego konta
            zostały zakończone.
          </p>
          <p className="rounded-xl bg-secondary p-4 text-center font-mono text-2xl font-bold tracking-widest">
            {passwordState.password}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            Zapisałem hasło
          </button>
        </Modal>
      )}

      <FormMessage error={passwordState.error} />
    </section>
  );
}

/**
 * Pojedyncze konto razem z akcjami.
 *
 * Args:
 *     user (RootUserRow): Konto do pokazania.
 *     onResetPassword ((formData: FormData) => void): Akcja nadająca hasło jednorazowe.
 *
 * Returns:
 *     ReactNode: Karta konta.
 */
function UserCard({
  user,
  onResetPassword,
}: {
  user: RootUserRow;
  onResetPassword: (formData: FormData) => void;
}) {
  const [accessState, accessAction, accessPending] = useAction(setCompanyAccessAction, {
    toastError: true,
  });
  const [, blockAction, blockPending] = useAction(setUserBlockedAction, { toastError: true });
  const [, signOutAction, signOutPending] = useAction(signOutUserAction, { toastError: true });
  const [askAboutCompany, setAskAboutCompany] = useState(false);

  const role = user.isOwner
    ? user.ownedCompany
      ? `Właściciel: ${user.ownedCompany.name}`
      : user.coOwnedName
        ? `Współwłaściciel: ${user.coOwnedName}`
        : "Właściciel bez firmy"
    : user.employerName
      ? `Pracownik: ${user.employerName}`
      : "Bez firmy";

  return (
    <article className="rounded-2xl bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.isBlocked && <Badge tone="destructive">Zablokowane</Badge>}
          {user.isDeleted && <Badge>Usunięte</Badge>}
          {user.mustChangePassword && <Badge>Hasło do zmiany</Badge>}
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {role} · sesje: {user.sessions} · konto od {day(user.createdAt)}
      </p>

      <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-secondary p-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Dostęp rozszerzony</p>
          <p className="text-xs text-muted-foreground">
            Pozwala włączyć tryb właściciela i prowadzić firmę.
          </p>
        </div>

        {user.canOwnCompany && user.ownedCompany ? (
          <button
            type="button"
            role="switch"
            aria-checked
            aria-label="Odbierz dostęp rozszerzony"
            disabled={accessPending}
            onClick={() => setAskAboutCompany(true)}
            className="flex h-7 w-12 shrink-0 items-center rounded-full bg-primary p-1 disabled:opacity-60"
          >
            <span className="h-5 w-5 translate-x-5 rounded-full bg-foreground transition-transform" />
          </button>
        ) : (
          <form action={accessAction} className="shrink-0">
            <input type="hidden" name="user_id" value={user.id} />
            <input type="hidden" name="enabled" value={String(!user.canOwnCompany)} />
            <button
              type="submit"
              role="switch"
              aria-checked={user.canOwnCompany}
              aria-label="Przełącz dostęp rozszerzony"
              disabled={accessPending}
              className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors disabled:opacity-60 ${
                user.canOwnCompany ? "bg-primary" : "bg-card"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-foreground transition-transform ${
                  user.canOwnCompany ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </form>
        )}
      </div>

      <FormMessage error={accessState.error} />

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={onResetPassword}>
          <input type="hidden" name="user_id" value={user.id} />
          <ActionButton icon={<KeyRound className="h-4 w-4 shrink-0" />} label="Hasło jednorazowe" />
        </form>

        <form action={signOutAction}>
          <input type="hidden" name="user_id" value={user.id} />
          <ActionButton
            icon={<LogOut className="h-4 w-4 shrink-0" />}
            label="Wyloguj wszędzie"
            pending={signOutPending}
            disabled={user.sessions === 0}
          />
        </form>

        <form action={blockAction}>
          <input type="hidden" name="user_id" value={user.id} />
          <input type="hidden" name="blocked" value={String(!user.isBlocked)} />
          <ActionButton
            icon={
              user.isBlocked ? (
                <Unlock className="h-4 w-4 shrink-0" />
              ) : (
                <Lock className="h-4 w-4 shrink-0" />
              )
            }
            label={user.isBlocked ? "Odblokuj konto" : "Zablokuj konto"}
            pending={blockPending}
            tone={user.isBlocked ? "default" : "destructive"}
          />
        </form>
      </div>

      {askAboutCompany && user.ownedCompany && (
        <Modal title={`Firma ${user.ownedCompany.name}`} onClose={() => setAskAboutCompany(false)}>
          <p className="text-sm text-muted-foreground">
            {user.name} prowadzi firmę. Samo odebranie dostępu zostawiłoby zespół bez opieki,
            więc wybierz, co dalej.
          </p>

          <form action={accessAction} className="space-y-2">
            <input type="hidden" name="user_id" value={user.id} />
            <input type="hidden" name="enabled" value="false" />

            <StrategyButton
              value="keep"
              title="Zostaw firmę"
              hint="Prowadzi ją dalej, ale nie założy kolejnej."
            />
            <StrategyButton
              value="transfer"
              title="Przekaż współwłaścicielowi"
              hint="Firmę przejmuje najstarszy współwłaściciel. Bez współwłaściciela akcja odmówi."
            />
            <StrategyButton
              value="dissolve"
              title="Rozwiąż firmę"
              hint="Pracownicy tracą samo powiązanie — godziny i kwoty zostają przy nich."
              tone="destructive"
            />
          </form>
        </Modal>
      )}
    </article>
  );
}

/**
 * Etykieta stanu konta.
 *
 * Args:
 *     children (React.ReactNode): Treść etykiety.
 *     tone ("default" | "destructive"): Kolor etykiety.
 *
 * Returns:
 *     ReactNode: Mała plakietka.
 */
function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "destructive";
}) {
  return (
    <span
      className={`rounded-lg px-2 py-1 text-xs font-medium ${
        tone === "destructive" ? "bg-destructive/15 text-destructive" : "bg-secondary"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Przycisk akcji w karcie konta.
 *
 * Args:
 *     icon (React.ReactNode): Ikona przycisku.
 *     label (string): Napis na przycisku.
 *     pending (boolean): Czy akcja trwa.
 *     disabled (boolean): Czy akcja nie ma dziś sensu.
 *     tone ("default" | "destructive"): Kolor napisu.
 *
 * Returns:
 *     ReactNode: Przycisk wysyłający formularz.
 */
function ActionButton({
  icon,
  label,
  pending,
  disabled,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  pending?: boolean;
  disabled?: boolean;
  tone?: "default" | "destructive";
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`flex h-10 items-center gap-2 rounded-xl bg-secondary px-3 text-sm font-medium disabled:opacity-40 ${
        tone === "destructive" ? "text-destructive" : ""
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Jeden wybór w pytaniu o los firmy.
 *
 * Args:
 *     value (string): Strategia wysyłana w polu „strategy".
 *     title (string): Nazwa wyboru.
 *     hint (string): Zdanie o konsekwencjach.
 *     tone ("default" | "destructive"): Kolor nazwy.
 *
 * Returns:
 *     ReactNode: Przycisk wysyłający formularz z tą strategią.
 */
function StrategyButton({
  value,
  title,
  hint,
  tone = "default",
}: {
  value: string;
  title: string;
  hint: string;
  tone?: "default" | "destructive";
}) {
  return (
    <button
      type="submit"
      name="strategy"
      value={value}
      className="w-full rounded-xl bg-secondary p-4 text-left"
    >
      <p className={`text-sm font-semibold ${tone === "destructive" ? "text-destructive" : ""}`}>
        {title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </button>
  );
}
