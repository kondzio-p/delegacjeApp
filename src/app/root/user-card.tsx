"use client";

import { KeyRound, Loader2, Lock, LogOut, Unlock } from "lucide-react";
import { useActionState, useState } from "react";

import { FormMessage, Modal } from "@/components/ui";
import { useAction } from "@/components/use-action";
import {
  resetUserPasswordAction,
  setCompanyAccessAction,
  setUserBlockedAction,
  signOutUserAction,
  type RootPasswordState,
} from "@/lib/actions/root";
import type { RootUserRow } from "@/lib/queries-root";

const EMPTY_PASSWORD: RootPasswordState = {};

/**
 * Podpis roli konta na karcie.
 *
 * Args:
 *     user (RootUserRow): Konto do opisania.
 *
 * Returns:
 *     string: Zdanie o tym, kim ta osoba jest w aplikacji.
 */
function roleOf(user: RootUserRow): string {
  if (!user.isOwner) return user.employerName ? `Pracownik: ${user.employerName}` : "Bez firmy";
  if (user.ownedCompany) return `Właściciel: ${user.ownedCompany.name}`;
  if (user.coOwnedName) return `Współwłaściciel: ${user.coOwnedName}`;
  return "Właściciel bez firmy";
}

/**
 * Konto razem z akcjami roota.
 *
 * Args:
 *     user (RootUserRow): Konto do pokazania.
 *
 * Returns:
 *     ReactNode: Karta konta.
 */
export function UserCard({ user }: { user: RootUserRow }) {
  const [accessState, accessAction, accessPending] = useAction(setCompanyAccessAction, {
    toastError: true,
  });
  const [, blockAction, blockPending] = useAction(setUserBlockedAction, { toastError: true });
  const [, signOutAction, signOutPending] = useAction(signOutUserAction, { toastError: true });
  const [passwordState, resetPassword, resetPending] = useActionState(
    resetUserPasswordAction,
    EMPTY_PASSWORD,
  );
  const [askAboutCompany, setAskAboutCompany] = useState(false);

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
        {roleOf(user)} · sesje: {user.sessions} · konto od {user.createdAt.slice(0, 10)}
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
        <form action={resetPassword}>
          <input type="hidden" name="user_id" value={user.id} />
          <ActionButton
            icon={<KeyRound className="h-4 w-4 shrink-0" />}
            label="Hasło jednorazowe"
            pending={resetPending}
          />
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

      <FormMessage error={passwordState.error} />

      {passwordState.password && (
        <Modal title="Hasło jednorazowe" onClose={() => window.location.reload()}>
          <p className="text-sm text-muted-foreground">
            Przekaż je osobie {passwordState.userLabel}. Przy najbliższym logowaniu aplikacja
            poprosi o ustawienie własnego hasła, a dotychczasowe sesje tego konta zostały
            zakończone.
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
 *     pending (boolean): Czy akcja trwa — wtedy zamiast ikony kręci się kółko.
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
      {pending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : icon}
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
