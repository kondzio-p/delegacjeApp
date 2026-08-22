"use client";

import { Loader2, Plane } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { RecoveryCodeDialog } from "@/components/recovery-code-dialog";
import { FormMessage } from "@/components/ui";
import { loginAction, registerAction, type CodeState } from "@/lib/actions/auth";
import { WELCOME_PATH } from "@/lib/routes";
import type { ActionState } from "@/lib/types";

const EMPTY: ActionState = {};
const EMPTY_CODE: CodeState = {};

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Plane className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Delegacje</h1>
          <p className="text-sm text-muted-foreground">
            Rozliczaj czas pracy, koszty i realny zysk z wyjazdów.
          </p>
        </div>

        <div className="rounded-2xl bg-card p-5">
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg py-3 text-sm font-semibold ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "login" ? "Logowanie" : "Rejestracja"}
              </button>
            ))}
          </div>

          {mode === "login" ? <LoginForm /> : <RegisterForm />}
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/odzyskiwanie" className="font-medium text-primary">
            Nie pamiętam hasła
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, EMPTY);

  return (
    <form action={formAction} className="space-y-4">
      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="jan@example.com"
        required
      />
      <TextField
        label="Hasło"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormMessage error={state.error} />
      <SubmitButton pending={pending}>Zaloguj się</SubmitButton>
    </form>
  );
}

function RegisterForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(registerAction, EMPTY_CODE);

  return (
    <>
      <form action={formAction} className="space-y-4">
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jan@example.com"
          required
        />
        <TextField
          label="Imię / Pseudonim"
          name="name"
          autoComplete="given-name"
          placeholder="Jan"
          minLength={2}
          maxLength={40}
          required
        />
        <TextField
          label="Hasło"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <TextField
          label="Powtórz hasło"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <p className="rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
          Na adres e-mail nic jeszcze nie wysyłamy — służy tylko do logowania. Po założeniu konta
          dostaniesz kod odzyskiwania, na razie jedyny sposób na odzyskanie dostępu po zapomnieniu
          hasła.
        </p>
        <FormMessage error={state.error} />
        <SubmitButton pending={pending}>Załóż konto</SubmitButton>
      </form>

      {state.recoveryCode && (
        <RecoveryCodeDialog
          code={state.recoveryCode}
          onClose={() => {
            router.replace(WELCOME_PATH);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

export function TextField({
  label,
  name,
  type = "text",
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} type={type} className="input-field" {...rest} />
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
    >
      {pending && <Loader2 className="h-5 w-5 animate-spin" />}
      {children}
    </button>
  );
}
