"use client";

import { Building2, Pencil, Trash2, UserCog } from "lucide-react";
import { useState } from "react";

import { FormMessage, Modal } from "@/components/ui";
import { useAction } from "@/components/use-action";
import {
  dissolveCompanyAction,
  renameCompanyAction,
  transferCompanyAction,
} from "@/lib/actions/root";
import type { RootCompanyRow } from "@/lib/queries-root";

/**
 * Lista firm razem ze składem i akcjami.
 *
 * Args:
 *     companies (RootCompanyRow[]): Firmy posortowane po nazwie.
 *
 * Returns:
 *     ReactNode: Sekcja firm.
 */
export function CompaniesScreen({ companies }: { companies: RootCompanyRow[] }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Firmy ({companies.length})
      </h2>

      <div className="mt-4 space-y-3">
        {companies.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
            Nikt jeszcze nie założył firmy.
          </p>
        ) : (
          companies.map((company) => <CompanyCard key={company.id} company={company} />)
        )}
      </div>
    </section>
  );
}

/**
 * Pojedyncza firma z akcjami roota.
 *
 * Args:
 *     company (RootCompanyRow): Firma do pokazania.
 *
 * Returns:
 *     ReactNode: Karta firmy.
 */
function CompanyCard({ company }: { company: RootCompanyRow }) {
  const [renaming, setRenaming] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [dissolving, setDissolving] = useState(false);

  const [renameState, renameAction, renamePending] = useAction(renameCompanyAction, {
    onSuccess: () => setRenaming(false),
  });
  const [transferState, transferAction, transferPending] = useAction(transferCompanyAction, {
    onSuccess: () => setTransferring(false),
  });
  const [dissolveState, dissolveAction, dissolvePending] = useAction(dissolveCompanyAction, {
    onSuccess: () => setDissolving(false),
  });

  return (
    <article className="rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 shrink-0 text-primary" />
        <h3 className="min-w-0 truncate text-sm font-semibold">{company.name}</h3>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Założyciel: {company.ownerName} ({company.ownerEmail}) · pracownicy: {company.employees} ·
        od {company.createdAt.slice(0, 10)}
      </p>

      {company.coOwners.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Współwłaściciele: {company.coOwners.map((c) => c.name).join(", ")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRenaming(true)}
          className="flex h-10 items-center gap-2 rounded-xl bg-secondary px-3 text-sm font-medium"
        >
          <Pencil className="h-4 w-4 shrink-0" /> Zmień nazwę
        </button>
        <button
          type="button"
          onClick={() => setTransferring(true)}
          disabled={company.coOwners.length === 0}
          className="flex h-10 items-center gap-2 rounded-xl bg-secondary px-3 text-sm font-medium disabled:opacity-40"
        >
          <UserCog className="h-4 w-4 shrink-0" /> Przekaż firmę
        </button>
        <button
          type="button"
          onClick={() => setDissolving(true)}
          className="flex h-10 items-center gap-2 rounded-xl bg-secondary px-3 text-sm font-medium text-destructive"
        >
          <Trash2 className="h-4 w-4 shrink-0" /> Rozwiąż
        </button>
      </div>

      {renaming && (
        <Modal title="Nowa nazwa firmy" onClose={() => setRenaming(false)}>
          <form action={renameAction} className="space-y-3">
            <input type="hidden" name="company_id" value={company.id} />
            <input
              name="name"
              defaultValue={company.name}
              required
              minLength={2}
              maxLength={80}
              className="input-field"
            />
            <p className="text-xs text-muted-foreground">
              Tę nazwę pracownicy wpisują u siebie, prosząc o dołączenie — po zmianie stara
              przestaje działać.
            </p>
            <FormMessage error={renameState.error} />
            <button
              type="submit"
              disabled={renamePending}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              Zapisz nazwę
            </button>
          </form>
        </Modal>
      )}

      {transferring && (
        <Modal title="Przekaż firmę" onClose={() => setTransferring(false)}>
          <p className="text-sm text-muted-foreground">
            Nowym właścicielem może zostać wyłącznie współwłaściciel — ktoś, kto już ma dostęp
            do tej firmy. Dotychczasowy założyciel zostaje współwłaścicielem.
          </p>
          <form action={transferAction} className="space-y-3">
            <input type="hidden" name="company_id" value={company.id} />
            <select name="owner_id" required className="input-field">
              {company.coOwners.map((coOwner) => (
                <option key={coOwner.id} value={coOwner.id}>
                  {coOwner.name} ({coOwner.email})
                </option>
              ))}
            </select>
            <FormMessage error={transferState.error} />
            <button
              type="submit"
              disabled={transferPending}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              Przekaż firmę
            </button>
          </form>
        </Modal>
      )}

      {dissolving && (
        <Modal title={`Rozwiąż firmę ${company.name}`} onClose={() => setDissolving(false)}>
          <p className="text-sm text-muted-foreground">
            Konta pracowników zostają nietknięte — tracą wyłącznie powiązanie z firmą. Godziny,
            koszty i wypłaty zostają przy ludziach. Tego kroku nie da się cofnąć.
          </p>
          <form action={dissolveAction} className="space-y-3">
            <input type="hidden" name="company_id" value={company.id} />
            <input
              name="confirm"
              required
              placeholder={company.name}
              autoComplete="off"
              className="input-field"
            />
            <p className="text-xs text-muted-foreground">
              Przepisz nazwę firmy, żeby potwierdzić.
            </p>
            <FormMessage error={dissolveState.error} />
            <button
              type="submit"
              disabled={dissolvePending}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-destructive text-sm font-semibold text-white disabled:opacity-60"
            >
              Rozwiąż firmę
            </button>
          </form>
        </Modal>
      )}
    </article>
  );
}
