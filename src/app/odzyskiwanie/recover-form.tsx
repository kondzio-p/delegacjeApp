"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { RecoveryCodeDialog } from "@/components/recovery-code-dialog";
import { FormMessage } from "@/components/ui";
import { recoverAction, type CodeState } from "@/lib/actions/auth";
import { WELCOME_PATH } from "@/lib/routes";

import { SubmitButton, TextField } from "../logowanie/auth-form";

const EMPTY: CodeState = {};

export function RecoverForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(recoverAction, EMPTY);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <KeyRound className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Odzyskiwanie hasła</h1>
          <p className="text-sm text-muted-foreground">
            Podaj kod odzyskiwania zapisany przy zakładaniu konta. Po zmianie hasła dostaniesz nowy
            kod — stary przestanie działać.
          </p>
        </div>

        <form action={formAction} className="space-y-4 rounded-2xl bg-card p-5">
          <TextField
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="jan@example.com"
            required
          />
          <TextField
            label="Kod odzyskiwania"
            name="code"
            placeholder="XXXX-XXXX-XXXX"
            autoComplete="off"
            required
          />
          <TextField
            label="Nowe hasło"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <TextField
            label="Powtórz nowe hasło"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <FormMessage error={state.error} />
          <SubmitButton pending={pending}>Ustaw nowe hasło</SubmitButton>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Nie masz kodu? Jeśli pracujesz w firmie, o reset hasła może poprosić jej właściciel.
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href="/logowanie" className="font-medium text-primary">
            Wróć do logowania
          </Link>
        </p>

        {state.recoveryCode && (
          <RecoveryCodeDialog
            code={state.recoveryCode}
            title="Zapisz nowy kod odzyskiwania"
            onClose={() => {
              router.replace(WELCOME_PATH);
              router.refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}
