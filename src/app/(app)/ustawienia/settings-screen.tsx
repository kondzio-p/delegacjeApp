"use client";

import { Building2, KeyRound, LogOut, ShieldAlert, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { RecoveryCodeDialog } from "@/components/recovery-code-dialog";
import { useAction } from "@/components/use-action";
import { useSettings } from "@/components/use-settings";
import { Field, FormMessage } from "@/components/ui";
import {
  changePasswordAction,
  logoutAction,
  regenerateRecoveryCodeAction,
  updateProfileAction,
  type CodeState,
} from "@/lib/actions/auth";
import {
  cancelJoinRequestAction,
  leaveCompanyAction,
  requestJoinAction,
  setOwnerModeAction,
} from "@/lib/actions/company";
import type { ActionState, SessionUser } from "@/lib/types";

type CompanyStatus = {
  employerName: string | null;
  ownCompanyName: string | null;
  pendingCompanyName: string | null;
};

export function SettingsScreen({
  user,
  status,
}: {
  user: SessionUser;
  status: CompanyStatus;
}) {
  const { display, setDisplay, rateInput, setRateInput } = useSettings();

  return (
    <>
      {user.must_change_password && (
        <section className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-card p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="min-w-0 text-sm">
            Twoje hasło zostało zresetowane przez właściciela firmy. Ustaw własne hasło poniżej.
          </p>
        </section>
      )}

      <ProfileSection user={user} />
      <PasswordSection />
      <RecoveryCodeSection />
      <CompanySection user={user} status={status} />

      <section className="mt-4 rounded-2xl bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Waluta i kurs
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
          {(["EUR", "PLN"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDisplay(c)}
              className={`min-w-0 rounded-lg py-3 text-base font-semibold ${
                display === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          inputMode="decimal"
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
          className="input-field mt-3"
          placeholder="4.35"
          aria-label="Kurs EUR"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Kurs i waluta są zapisane na tym urządzeniu — nie trafiają do bazy.
        </p>
      </section>

      <form action={logoutAction}>
        <button
          type="submit"
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-destructive text-base font-semibold text-destructive"
        >
          <LogOut className="h-5 w-5 shrink-0" /> Wyloguj
        </button>
      </form>
    </>
  );
}

function ProfileSection({ user }: { user: SessionUser }) {
  const [state, formAction, pending] = useAction(updateProfileAction);

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <UserRound className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Konto
        </h2>
      </div>

      <p className="mt-3 break-all text-base font-medium">{user.username}</p>

      <form action={formAction} className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Imię">
            <input
              name="first_name"
              defaultValue={user.first_name ?? ""}
              maxLength={60}
              className="input-field input-field-compact"
            />
          </Field>
          <Field label="Nazwisko">
            <input
              name="last_name"
              defaultValue={user.last_name ?? ""}
              maxLength={60}
              className="input-field input-field-compact"
            />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Imię i nazwisko widzi właściciel firmy na Twojej karcie pracownika.
        </p>
        <FormMessage error={state.error} />
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-secondary text-sm font-semibold disabled:opacity-60"
        >
          Zapisz dane
        </button>
      </form>
    </section>
  );
}

function PasswordSection() {
  const [state, formAction, pending] = useAction(changePasswordAction);

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Zmiana hasła
      </h2>
      <form action={formAction} className="mt-3 space-y-4">
        <Field label="Obecne hasło">
          <input
            type="password"
            name="current"
            required
            autoComplete="current-password"
            className="input-field"
          />
        </Field>
        <Field label="Nowe hasło">
          <input
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="input-field"
          />
        </Field>
        <Field label="Powtórz nowe hasło">
          <input
            type="password"
            name="confirm"
            required
            minLength={6}
            autoComplete="new-password"
            className="input-field"
          />
        </Field>
        <FormMessage error={state.error} />
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-secondary text-sm font-semibold disabled:opacity-60"
        >
          Zmień hasło
        </button>
      </form>
    </section>
  );
}

function RecoveryCodeSection() {
  const [state, setState] = useState<CodeState>({});
  const [pending, setPending] = useState(false);

  async function regenerate() {
    setPending(true);
    try {
      setState(await regenerateRecoveryCodeAction());
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Kod odzyskiwania
        </h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Kodu nie da się podejrzeć — w bazie jest tylko jego skrót. Jeśli zgubiłeś swój, wygeneruj
        nowy; stary przestanie działać.
      </p>
      <button
        type="button"
        onClick={regenerate}
        disabled={pending}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-secondary text-sm font-semibold disabled:opacity-60"
      >
        Wygeneruj nowy kod
      </button>

      {state.recoveryCode && (
        <RecoveryCodeDialog
          code={state.recoveryCode}
          title="Zapisz nowy kod odzyskiwania"
          onClose={() => setState({})}
        />
      )}
    </section>
  );
}

function CompanySection({ user, status }: { user: SessionUser; status: CompanyStatus }) {
  const [ownerState, ownerAction, ownerPending] = useAction(setOwnerModeAction);
  const [joinState, joinAction, joinPending] = useAction(requestJoinAction);
  const [wantsOwner, setWantsOwner] = useState(user.is_owner);

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Firma
        </h2>
      </div>

      {/* --- tryb właściciela --- */}
      <div className="mt-3 rounded-xl bg-secondary p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Jestem właścicielem firmy</p>
            <p className="text-xs text-muted-foreground">
              Po włączeniu w menu pojawia się zakładka Pracownicy.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={wantsOwner}
            onClick={() => setWantsOwner((v) => !v)}
            className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
              wantsOwner ? "bg-primary" : "bg-card"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-foreground transition-transform ${
                wantsOwner ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <form action={ownerAction} className="mt-3 space-y-3">
          <input type="hidden" name="enabled" value={String(wantsOwner)} />

          {wantsOwner ? (
            <>
              <Field label="Nazwa firmy">
                <input
                  name="company_name"
                  required
                  defaultValue={status.ownCompanyName ?? ""}
                  maxLength={80}
                  placeholder="Kowalski Sp. z o.o."
                  className="input-field"
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                Tę nazwę pracownicy wpisują u siebie, żeby poprosić o dołączenie do firmy.
              </p>
            </>
          ) : (
            user.is_owner && (
              <p className="text-xs text-destructive">
                Wyłączenie trybu właściciela kasuje firmę i odłącza od niej wszystkich pracowników.
                Ich konta i wpisy zostają nietknięte.
              </p>
            )
          )}

          <FormMessage error={ownerState.error} />

          <button
            type="submit"
            disabled={ownerPending}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {wantsOwner ? "Zapisz firmę" : "Wyłącz tryb właściciela"}
          </button>
        </form>
      </div>

      {/* --- dołączanie do firmy (tylko dla pracowników) --- */}
      {!user.is_owner && (
        <div className="mt-3 rounded-xl bg-secondary p-4">
          {status.employerName ? (
            <>
              <p className="text-sm font-semibold">Pracujesz w firmie</p>
              <p className="mt-1 break-words text-base font-medium">{status.employerName}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Właściciel widzi Twoje godziny pracy. Kosztów i wypłat nie widzi.
              </p>
              <SimpleActionButton
                action={leaveCompanyAction}
                label="Opuść firmę"
                className="mt-3 text-destructive"
              />
            </>
          ) : status.pendingCompanyName ? (
            <>
              <p className="text-sm font-semibold">Prośba wysłana</p>
              <p className="mt-1 break-words text-base font-medium">
                {status.pendingCompanyName}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Czekasz na akceptację właściciela firmy.
              </p>
              <SimpleActionButton action={cancelJoinRequestAction} label="Anuluj prośbę" />
            </>
          ) : (
            <form action={joinAction} className="space-y-3">
              <Field label="Pracuję w firmie">
                <input
                  name="company_name"
                  required
                  maxLength={80}
                  placeholder="Wpisz dokładną nazwę firmy"
                  className="input-field"
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                Nazwę podaje właściciel firmy. Po wysłaniu prośby musi ją jeszcze zaakceptować.
              </p>
              <FormMessage error={joinState.error} />
              <button
                type="submit"
                disabled={joinPending}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                Wyślij prośbę o dołączenie
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

/** Przycisk dla akcji bez formularza (bez argumentów). */
function SimpleActionButton({
  action,
  label,
  className = "",
}: {
  action: () => Promise<ActionState>;
  label: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    try {
      const result = await action();
      if (result.error) toast.error(result.error);
      if (result.success) toast.success(result.success);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={`mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-card text-sm font-semibold disabled:opacity-60 ${className}`}
    >
      {label}
    </button>
  );
}
