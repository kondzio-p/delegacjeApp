import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { redirect } from "next/navigation";

import { AuthForm } from "./auth-form";
import { getSessionUser } from "@/lib/auth";
import { DASHBOARD_PATH } from "@/lib/routes";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("auth.login", "meta.login");
}

/**
 * Ekran logowania i rejestracji.
 *
 * Args:
 *     searchParams (Promise<{ tryb?: string }>): Tryb wybrany na stronie
 *         powitalnej.
 *
 * Returns:
 *     Promise<ReactNode>: Karta uwierzytelniania; zalogowany leci na pulpit.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tryb?: string }>;
}) {
  // Kto ma ważną sesję, nie powinien oglądać formularza logowania.
  const user = await getSessionUser();
  if (user) redirect(DASHBOARD_PATH);

  // Tryb przychodzi w adresie, żeby przycisk zakładania konta nie lądował
  // na zakładce logowania.
  const { tryb } = await searchParams;

  return <AuthForm initialMode={tryb === "rejestracja" ? "register" : "login"} />;
}
