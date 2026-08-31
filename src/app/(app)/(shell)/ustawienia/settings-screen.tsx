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
import {
  deleteMyAccountAction,
  exportMyDataAction,
  exportMyDataCsvAction,
} from "@/lib/actions/privacy";
import { useT } from "@/components/locale-provider";
import { downloadFile } from "@/lib/print";
import { CURRENCIES } from "@/lib/money";
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

/**
 * Ustawienia konta: profil, firma, waluta, język i prawa użytkownika.
 *
 * Args:
 *     user (SessionUser): Zalogowane konto.
 *     status (CompanyStatus): Stan przynależności do firm.
 *
 * Returns:
 *     ReactNode: Ekran ustawień.
 */
export function SettingsScreen({
  user,
  status,
}: {
  user: SessionUser;
  status: CompanyStatus;
}) {
  const t = useT();
  const { display, setDisplay } = useSettings();

  return (
    <>
      {user.must_change_password && (
        <section className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-card p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="min-w-0 text-sm">{t("settings.mustChangePassword")}</p>
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
          {t("settings.displayCurrency")}
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-secondary p-1">
          {CURRENCIES.map((c) => (
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
          {t("settings.displayCurrencyHint")}
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
 * Sekcja z listą kategorii kosztów.
 *
 * Usunięcie pozycji nie rusza istniejących wpisów, ale zmiana nazwy przenosi
 * też je — tego oczekuje ktoś, kto poprawia literówkę.
 *
 * Args:
 *     categories (string[]): Kategorie tego konta.
 *
 * Returns:
 *     ReactNode: Sekcja ustawień z listą i formularzem.
 */
function CategoriesSection({ categories }: { categories: string[] }) {
  const t = useT();
  const [addState, addAction, addPending] = useAction(addExpenseCategoryAction, {
    toastError: true,
  });
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <Tags className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("settings.categories")}
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
                aria-label={t("settings.renameCategory", { name: category })}
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
          placeholder={t("settings.newCategory")}
          className="input-field input-field-compact min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={addPending}
          aria-label={t("settings.addCategory")}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>
      <FormMessage error={addState.error} />

      <p className="mt-3 text-xs text-muted-foreground">{t("settings.categoriesHint")}</p>
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
  const t = useT();
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
        {t("settings.save")}
      </button>
      <button
        type="button"
        onClick={onDone}
        aria-label={t("settings.cancel")}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary"
      >
        <X className="h-5 w-5" />
      </button>
      <FormMessage error={state.error} />
    </form>
  );
}

function RemoveCategoryButton({ category }: { category: string }) {
  const t = useT();
  const [, action, pending] = useAction(removeExpenseCategoryAction, { toastError: true });

  return (
    <form action={action}>
      <input type="hidden" name="name" value={category} />
      <button
        type="submit"
        disabled={pending}
        aria-label={t("settings.removeCategory", { name: category })}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-destructive active:bg-card disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}

/**
 * Sekcja współwłaścicieli firmy.
 *
 * Zaproszenie czeka na akceptację, więc literówka w adresie jest nieszkodliwa.
 * Zarządzać listą może wyłącznie założyciel.
 *
 * Args:
 *     status (CompanyStatus): Stan przynależności konta do firm.
 *
 * Returns:
 *     ReactNode: Sekcja ustawień ze współwłasnością i zaproszeniami.
 */
function CoOwnersSection({ status }: { status: CompanyStatus }) {
  const t = useT();
  const [inviteState, inviteAction, invitePending] = useAction(inviteCoOwnerAction);

  // Zaproszony widzi tę sekcję jako decyzję do podjęcia.
  if (status.inviteCompanyName) {
    return (
      <section className="mt-4 rounded-2xl border border-accent/40 bg-card p-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 shrink-0 text-accent" />
          <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("settings.coOwnerInvite")}
          </h2>
        </div>
        <p className="mt-3 text-sm">
          {t("settings.coOwnerInviteBody", { company: status.inviteCompanyName })}
        </p>
        <div className="mt-3 flex gap-2">
          <SimpleActionButton
            action={acceptCoOwnerInviteAction}
            label={t("employees.accept")}
            className="bg-success text-success-foreground"
          />
          <SimpleActionButton action={rejectCoOwnerInviteAction} label={t("employees.reject")} />
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
            {t("settings.coOwnership")}
          </h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("settings.coOwnershipBody", { company: status.coOwnedCompanyName })}
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
          {t("settings.coOwners")}
        </h2>
      </div>

      {status.coOwners.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("settings.noCoOwners")}</p>
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
        <Field label={t("settings.coOwnerEmail")}>
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
          <Plus className="h-4 w-4 shrink-0" /> {t("settings.inviteCoOwner")}
        </button>
      </form>

      <p className="mt-3 text-xs text-muted-foreground">{t("settings.coOwnersHint")}</p>
    </section>
  );
}

function RemoveCoOwnerButton({ userId, name }: { userId: string; name: string }) {
  const t = useT();
  const [, action, pending] = useAction(removeCoOwnerAction, { toastError: true });

  return (
    <form action={action}>
      <input type="hidden" name="user_id" value={userId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={t("settings.removeCoOwner", { name })}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-destructive active:bg-card disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}

/**
 * Podaje dzisiejszy dzień do nazwy pobieranego pliku.
 *
 * Returns:
 *     string: Dzień w formacie „YYYY-MM-DD".
 */
function dzisiaj(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Sekcja praw użytkownika: eksport danych i usunięcie konta.
 *
 * Returns:
 *     ReactNode: Sekcja ustawień z przyciskami eksportu i usunięcia konta.
 */
function PrivacySection() {
  const t = useT();
  const [deleteState, deleteAction, deletePending] = useAction(deleteMyAccountAction);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingCsv, setExportingCsv] = useState<"transactions" | "hours" | null>(null);

  async function exportData() {
    setExporting(true);
    try {
      const result = await exportMyDataAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (!result.json) return;

      downloadFile(`godzio-moje-dane-${dzisiaj()}.json`, result.json, "application/json");
      toast.success(t("settings.exported"));
    } finally {
      setExporting(false);
    }
  }

  /**
   * Pobiera jeden z arkuszy z danymi konta.
   *
   * Osobne przyciski zamiast obu plików naraz: przeglądarki pytają o zgodę
   * przy drugim pliku z rzędu i łatwo to przeoczyć.
   *
   * Args:
   *     kind ("transactions" | "hours"): Który arkusz pobrać.
   *
   * Returns:
   *     Promise<void>: Nic — plik ląduje w pobranych.
   */
  async function exportCsv(kind: "transactions" | "hours") {
    setExportingCsv(kind);
    try {
      const result = await exportMyDataCsvAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const csv = kind === "hours" ? result.hours : result.transactions;
      if (!csv) return;

      const name = kind === "hours" ? "godziny" : "koszty-i-wyplaty";
      downloadFile(`godzio-${name}-${dzisiaj()}.csv`, csv, "text/csv;charset=utf-8");
      toast.success(t("settings.exportedCsv"));
    } finally {
      setExportingCsv(null);
    }
  }

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("settings.privacy")}
        </h2>
      </div>

      <p className="mt-3 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
        {t("settings.privacyBody")}
      </p>

      <button
        type="button"
        onClick={exportData}
        disabled={exporting}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold disabled:opacity-60"
      >
        <Download className="h-4 w-4 shrink-0" /> {t("settings.exportJson")}
      </button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => exportCsv("transactions")}
          disabled={exportingCsv !== null}
          className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-secondary px-3 text-sm font-semibold disabled:opacity-60"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("settings.exportCsvTransactions")}</span>
        </button>
        <button
          type="button"
          onClick={() => exportCsv("hours")}
          disabled={exportingCsv !== null}
          className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-secondary px-3 text-sm font-semibold disabled:opacity-60"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("settings.exportCsvHours")}</span>
        </button>
      </div>

      {!confirmOpen ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-destructive text-sm font-semibold text-destructive"
        >
          <Trash2 className="h-4 w-4 shrink-0" /> {t("settings.deleteAccount")}
        </button>
      ) : (
        <form action={deleteAction} className="mt-3 space-y-3 rounded-xl bg-secondary p-4">
          <p className="text-sm">{t("settings.deleteBody")}</p>
          <Field label={t("settings.retypeWord", { word: DELETE_CONFIRMATION })}>
            <input name="confirm" required autoFocus className="input-field" />
          </Field>
          <FormMessage error={deleteState.error} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-card text-sm font-semibold"
            >
              <X className="h-4 w-4 shrink-0" /> {t("settings.cancel")}
            </button>
            <button
              type="submit"
              disabled={deletePending}
              className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-60"
            >
              <Check className="h-4 w-4 shrink-0" /> {t("settings.deleteAccount")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function ProfileSection({ user }: { user: SessionUser }) {
  const t = useT();
  const [state, formAction, pending] = useAction(updateProfileAction);

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <UserRound className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("settings.account")}
        </h2>
      </div>

      <form action={formAction} className="mt-3 space-y-4">
        <Field label={t("auth.name")}>
          <input
            name="name"
            defaultValue={user.name}
            minLength={2}
            maxLength={40}
            required
            className="input-field"
          />
        </Field>
        <Field label={t("settings.emailLogin")}>
          <input
            type="email"
            name="email"
            defaultValue={user.email}
            autoComplete="email"
            required
            className="input-field"
          />
        </Field>
        <p className="text-xs text-muted-foreground">{t("settings.emailHint")}</p>
        <FormMessage error={state.error} />
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-secondary text-sm font-semibold disabled:opacity-60"
        >
          {t("settings.saveProfile")}
        </button>
      </form>
    </section>
  );
}

function PasswordSection() {
  const t = useT();
  const [state, formAction, pending] = useAction(changePasswordAction);

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("settings.passwordChange")}
      </h2>
      <form action={formAction} className="mt-3 space-y-4">
        <Field label={t("settings.currentPassword")}>
          <input
            type="password"
            name="current"
            required
            autoComplete="current-password"
            className="input-field"
          />
        </Field>
        <Field label={t("settings.newPassword")}>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="input-field"
          />
        </Field>
        <Field label={t("settings.repeatNewPassword")}>
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
          {t("settings.changePassword")}
        </button>
      </form>
    </section>
  );
}

function RecoveryCodeSection() {
  const t = useT();
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
          {t("settings.recoveryCode")}
        </h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{t("settings.recoveryCodeHint")}</p>
      <button
        type="button"
        onClick={regenerate}
        disabled={pending}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-secondary text-sm font-semibold disabled:opacity-60"
      >
        {t("settings.regenerate")}
      </button>

      {state.recoveryCode && (
        <RecoveryCodeDialog
          code={state.recoveryCode}
          title={t("settings.newRecoveryTitle")}
          onClose={() => setState({})}
        />
      )}
    </section>
  );
}

function CompanySection({ user, status }: { user: SessionUser; status: CompanyStatus }) {
  const t = useT();
  const [ownerState, ownerAction, ownerPending] = useAction(setOwnerModeAction);
  const [joinState, joinAction, joinPending] = useAction(requestJoinAction);
  const [wantsOwner, setWantsOwner] = useState(user.is_owner);

  // Współwłaściciel niczego nie kasuje — może tylko odejść, i tak brzmi opis.
  const isCoOwner = status.coOwnedCompanyName !== null;
  const hasCompany = status.ownCompanyName !== null;

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("settings.company")}
        </h2>
      </div>

      {/* --- tryb właściciela --- */}
      <div className="mt-3 rounded-xl bg-secondary p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("settings.ownerMode")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.ownerModeHint")}</p>
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
              <Field label={t("settings.companyName")}>
                <input
                  name="company_name"
                  required
                  defaultValue={status.ownCompanyName ?? ""}
                  maxLength={80}
                  placeholder={t("settings.companyNamePlaceholder")}
                  className="input-field"
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                {t("settings.companyNameHint")}
              </p>
            </>
          ) : (
            user.is_owner && (
              <p className="text-xs text-destructive">
                {isCoOwner
                  ? t("settings.warnCoOwner")
                  : hasCompany
                    ? t("settings.warnHasCompany")
                    : t("settings.warnNoCompany")}
              </p>
            )
          )}

          <FormMessage error={ownerState.error} />

          {/* Przy wyłączonym przełączniku i koncie bez trybu właściciela nie ma
              czego wyłączać — przycisk tylko wprowadzałby w błąd. */}
          {(wantsOwner || user.is_owner) && (
            <button
              type="submit"
              disabled={ownerPending}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {wantsOwner
                ? t("settings.saveCompany")
                : isCoOwner
                  ? t("settings.leaveCoOwnership")
                  : t("settings.disableOwner")}
            </button>
          )}
        </form>
      </div>

      {/* --- dołączanie do firmy (tylko dla pracowników) --- */}
      {!user.is_owner && (
        <div className="mt-3 rounded-xl bg-secondary p-4">
          {status.employerName ? (
            <>
              <p className="text-sm font-semibold">{t("settings.employedAt")}</p>
              <p className="mt-1 break-words text-base font-medium">{status.employerName}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("settings.employedHint")}
              </p>
              <SimpleActionButton
                action={leaveCompanyAction}
                label={t("settings.leaveCompany")}
                className="mt-3 text-destructive"
              />
            </>
          ) : status.pendingCompanyName ? (
            <>
              <p className="text-sm font-semibold">{t("settings.requestSent")}</p>
              <p className="mt-1 break-words text-base font-medium">
                {status.pendingCompanyName}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("settings.requestPending")}
              </p>
              <SimpleActionButton action={cancelJoinRequestAction} label={t("settings.cancelRequest")} />
            </>
          ) : (
            <form action={joinAction} className="space-y-3">
              <Field label={t("settings.joinLabel")}>
                <input
                  name="company_name"
                  required
                  maxLength={80}
                  placeholder={t("settings.joinPlaceholder")}
                  className="input-field"
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                {t("settings.joinHint")}
              </p>
              <FormMessage error={joinState.error} />
              <button
                type="submit"
                disabled={joinPending}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {t("settings.sendRequest")}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Przycisk uruchamiający akcję bez formularza.
 *
 * Args:
 *     action (() => Promise<ActionState>): Akcja serwerowa bez argumentów.
 *     label (string): Napis na przycisku.
 *     className (string): Dodatkowe klasy wyglądu.
 *
 * Returns:
 *     ReactNode: Przycisk pokazujący wynik akcji w toaście.
 */
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
