"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { useT } from "@/components/locale-provider";
import { RecoveryCodeDialog } from "@/components/recovery-code-dialog";
import { FormMessage } from "@/components/ui";
import { recoverAction, type CodeState } from "@/lib/actions/auth";
import { WELCOME_PATH } from "@/lib/routes";

import { SubmitButton, TextField } from "../logowanie/auth-form";

const EMPTY: CodeState = {};

/**
 * Formularz odzyskiwania hasła kodem.
 *
 * Returns:
 *     ReactNode: Ekran odzyskiwania z nowym kodem po udanej zmianie.
 */
export function RecoverForm() {
  const t = useT();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(recoverAction, EMPTY);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <KeyRound className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("meta.recoveryTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("recover.intro")}</p>
        </div>

        <form action={formAction} className="space-y-4 rounded-2xl bg-card p-5">
          <TextField
            label={t("auth.email")}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="jan@example.com"
            required
          />
          <TextField
            label={t("settings.recoveryCode")}
            name="code"
            placeholder="XXXX-XXXX-XXXX"
            autoComplete="off"
            required
          />
          <TextField
            label={t("settings.newPassword")}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <TextField
            label={t("settings.repeatNewPassword")}
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <FormMessage error={state.error} />
          <SubmitButton pending={pending}>{t("recover.submit")}</SubmitButton>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("recover.noCode")}
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href="/logowanie" className="font-medium text-primary">
            {t("recover.backToLogin")}
          </Link>
        </p>

        {state.recoveryCode && (
          <RecoveryCodeDialog
            code={state.recoveryCode}
            title={t("settings.newRecoveryTitle")}
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
