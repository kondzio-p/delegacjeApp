"use client";

import {
  Building2,
  Check,
  Download,
  KeyRound,
  LogOut,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Tags,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
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
  addExpenseCategoryAction,
  removeExpenseCategoryAction,
  renameExpenseCategoryAction,
} from "@/lib/actions/data";
import {
  acceptCoOwnerInviteAction,
  cancelJoinRequestAction,
  inviteCoOwnerAction,
  leaveCompanyAction,
  rejectCoOwnerInviteAction,
  removeCoOwnerAction,
  requestJoinAction,
  setOwnerModeAction,
} from "@/lib/actions/company";
import { deleteMyAccountAction, exportMyDataAction } from "@/lib/actions/privacy";
import { DELETE_CONFIRMATION } from "@/lib/privacy";
import type { ActionState, SessionUser } from "@/lib/types";

type CompanyStatus = {
  employerName: string | null;
  ownCompanyName: string | null;
  pendingCompanyName: string | null;
  coOwners: { id: string; name: string; email: string }[];
  inviteCompanyName: string | null;
  coOwnedCompanyName: string | null;
};

export function SettingsScreen({
  user,
  status,
}: {
  user: SessionUser;
  status: CompanyStatus;
}) {
  const { display, setDisplay } = useSettings();

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
      <CategoriesSection categories={user.expense_categories} />
      <CoOwnersSection status={status} />

      <section className="mt-4 rounded-2xl bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Waluta wyświetlania
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
        <p className="mt-3 text-xs text-muted-foreground">
          Waluta jest zapisana na tym urządzeniu — nie trafia do bazy. Kursy pobieramy z NBP,
          a przy każdym wpisie zapamiętujemy kurs z jego dnia, żeby historia się nie zmieniała.
        </p>
      </section>

      <PrivacySection />

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

/**
 * Lista kategorii kosztów. Usunięcie pozycji nie rusza istniejących wpisów —
 * kategoria jest w nich tekstem, więc stary koszt dalej pokazuje swoją nazwę
 * i wchodzi do podsumowania. Zmiana nazwy przenosi natomiast również wpisy,
 * bo tego oczekuje ktoś, kto poprawia literówkę.
 */
function CategoriesSection({ categories }: { categories: string[] }) {
  const [addState, addAction, addPending] = useAction(addExpenseCategoryAction, {
    toastError: true,
  });
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <Tags className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Kategorie kosztów
        </h2>
      </div>

      <ul className="mt-3 space-y-2">
        {categories.map((category) =>
          renaming === category ? (
            <li key={category}>
              <RenameCategoryForm
                category={category}
                onDone={() => setRenaming(null)}
              />
            </li>
          ) : (
            <li
              key={category}
              className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{category}</span>
              <button
                type="button"
                onClick={() => setRenaming(category)}
                aria-label={`Zmień nazwę kategorii ${category}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-card"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <RemoveCategoryButton category={category} />
            </li>
          ),
        )}
      </ul>

      <form action={addAction} className="mt-3 flex gap-2">
        <input
          name="name"
          required
          maxLength={30}
          placeholder="Nowa kategoria"
          className="input-field input-field-compact min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={addPending}
          aria-label="Dodaj kategorię"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>
      <FormMessage error={addState.error} />

      <p className="mt-3 text-xs text-muted-foreground">
        Usunięcie kategorii nie kasuje kosztów — dotychczasowe wpisy zachowują swoją nazwę.
      </p>
    </section>
  );
}

function RenameCategoryForm({
  category,
  onDone,
}: {
  category: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useAction(renameExpenseCategoryAction, {
    toastError: true,
    onSuccess: onDone,
  });

  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="from" value={category} />
      <input
        name="to"
        required
        maxLength={30}
        defaultValue={category}
        autoFocus
        className="input-field input-field-compact min-w-0 flex-1"
      />
      <button
        type="submit"
        disabled={pending}
        className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        Zapisz
      </button>
      <button
        type="button"
        onClick={onDone}
        aria-label="Anuluj"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary"
      >
        <X className="h-5 w-5" />
      </button>
      <FormMessage error={state.error} />
    </form>
  );
}

function RemoveCategoryButton({ category }: { category: string }) {
  const [, action, pending] = useAction(removeExpenseCategoryAction, { toastError: true });

  return (
    <form action={action}>
      <input type="hidden" name="name" value={category} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Usuń kategorię ${category}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-destructive active:bg-card disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}

/**
 * Współwłaściciele firmy. Zaproszenie trafia do istniejącego konta i czeka
 * na akceptację — bez niej zaproszony nie ma żadnego dostępu, więc literówka
 * w adresie jest nieszkodliwa. Zarządzać może wyłącznie założyciel.
 */
function CoOwnersSection({ status }: { status: CompanyStatus }) {
  const [inviteState, inviteAction, invitePending] = useAction(inviteCoOwnerAction);

  // Zaproszony widzi tę sekcję jako decyzję do podjęcia.
  if (status.inviteCompanyName) {
    return (
      <section className="mt-4 rounded-2xl border border-accent/40 bg-card p-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 shrink-0 text-accent" />
          <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Zaproszenie do współwłasności
          </h2>
        </div>
        <p className="mt-3 text-sm">
          Firma <span className="font-semibold">{status.inviteCompanyName}</span> zaprasza Cię jako
          współwłaściciela. Zyskasz dostęp do pracowników i raportów.
        </p>
        <div className="mt-3 flex gap-2">
          <SimpleActionButton
            action={acceptCoOwnerInviteAction}
            label="Akceptuj"
            className="bg-success text-success-foreground"
          />
          <SimpleActionButton action={rejectCoOwnerInviteAction} label="Odrzuć" />
        </div>
      </section>
    );
  }

  if (status.coOwnedCompanyName) {
    return (
      <section className="mt-4 rounded-2xl bg-card p-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Współwłasność
          </h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Jesteś współwłaścicielem firmy{" "}
          <span className="font-semibold text-foreground">{status.coOwnedCompanyName}</span>. Możesz
          wszystko poza skasowaniem firmy i zarządzaniem współwłaścicielami.
        </p>
      </section>
    );
  }

  // Tylko założyciel z zapisaną firmą zarządza listą.
  if (!status.ownCompanyName) return null;

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Współwłaściciele
        </h2>
      </div>

      {status.coOwners.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nikt jeszcze nie współprowadzi firmy.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {status.coOwners.map((coOwner) => (
            <li
              key={coOwner.id}
              className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{coOwner.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {coOwner.email}
                </span>
              </span>
              <RemoveCoOwnerButton userId={coOwner.id} name={coOwner.name} />
            </li>
          ))}
        </ul>
      )}

      <form action={inviteAction} className="mt-3 space-y-3">
        <Field label="E-mail istniejącego konta">
          <input
            name="email"
            type="email"
            required
            placeholder="wspolnik@example.com"
            className="input-field"
          />
        </Field>
        <FormMessage error={inviteState.error} success={inviteState.success} />
        <button
          type="submit"
          disabled={invitePending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold disabled:opacity-60"
        >
          <Plus className="h-4 w-4 shrink-0" /> Zaproś współwłaściciela
        </button>
      </form>

      <p className="mt-3 text-xs text-muted-foreground">
        Zaproszony musi mieć konto i potwierdzić zaproszenie u siebie w ustawieniach.
        Współwłaściciel nie może skasować firmy ani usunąć Ciebie.
      </p>
    </section>
  );
}

function RemoveCoOwnerButton({ userId, name }: { userId: string; name: string }) {
  const [, action, pending] = useAction(removeCoOwnerAction, { toastError: true });

  return (
    <form action={action}>
      <input type="hidden" name="user_id" value={userId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Usuń współwłaściciela ${name}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-destructive active:bg-card disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}

/** Zgoda, eksport własnych danych i usunięcie konta — obowiązki z RODO. */
function PrivacySection() {
  const [deleteState, deleteAction, deletePending] = useAction(deleteMyAccountAction);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const result = await exportMyDataAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (!result.json) return;

      // Plik składamy w przeglądarce — serwer oddaje sam tekst.
      const url = URL.createObjectURL(new Blob([result.json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `godzio-moje-dane-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Pobrano Twoje dane");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Prywatność i Twoje dane
        </h2>
      </div>

      <p className="mt-3 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
        Korzystając z aplikacji zgadzasz się, aby właściciel firmy, do której należysz, widział
        Twoje <span className="font-medium text-foreground">godziny pracy i wypłaty</span>. Twoje
        koszty pozostają prywatne — nikt poza Tobą ich nie widzi.
      </p>

      <button
        type="button"
        onClick={exportData}
        disabled={exporting}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold disabled:opacity-60"
      >
        <Download className="h-4 w-4 shrink-0" /> Pobierz moje dane (JSON)
      </button>

      {!confirmOpen ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-destructive text-sm font-semibold text-destructive"
        >
          <Trash2 className="h-4 w-4 shrink-0" /> Usuń konto
        </button>
      ) : (
        <form action={deleteAction} className="mt-3 space-y-3 rounded-xl bg-secondary p-4">
          <p className="text-sm">
            Twoje dane osobowe znikną, a konto przestanie działać. Godziny pracy i wypłaty zostaną
            u pracodawcy jako zapis rozliczenia — bez powiązania z Tobą. Koszty zostaną skasowane.
            Tego nie da się cofnąć.
          </p>
          <Field label={`Przepisz słowo ${DELETE_CONFIRMATION}`}>
            <input name="confirm" required autoFocus className="input-field" />
          </Field>
          <FormMessage error={deleteState.error} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-card text-sm font-semibold"
            >
              <X className="h-4 w-4 shrink-0" /> Anuluj
            </button>
            <button
              type="submit"
              disabled={deletePending}
              className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-60"
            >
              <Check className="h-4 w-4 shrink-0" /> Usuń konto
            </button>
          </div>
        </form>
      )}
    </section>
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

      <form action={formAction} className="mt-3 space-y-4">
        <Field label="Imię / Pseudonim">
          <input
            name="name"
            defaultValue={user.name}
            minLength={2}
            maxLength={40}
            required
            className="input-field"
          />
        </Field>
        <Field label="E-mail (login)">
          <input
            type="email"
            name="email"
            defaultValue={user.email}
            autoComplete="email"
            required
            className="input-field"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Imieniem podpisana jest Twoja karta u właściciela firmy. Adresu e-mail na razie nie
          weryfikujemy i nic na niego nie wysyłamy — służy tylko do logowania.
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
                Właściciel widzi Twoje godziny pracy i wypłaty. Twoich kosztów nie widzi.
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
