import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { redirect } from "next/navigation";

import { AuthForm } from "./auth-form";
import { getSessionUser } from "@/lib/auth";
import { DASHBOARD_PATH } from "@/lib/routes";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("auth.login", "meta.login");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tryb?: string }>;
}) {
  // Kto ma ważną sesję, nie powinien oglądać formularza logowania.
  const user = await getSessionUser();
  if (user) redirect(DASHBOARD_PATH);

  // Strona powitalna prowadzi tu dwoma przyciskami. Tryb przychodzi
  // w adresie, żeby przycisk zakładania konta nie lądował na zakładce
  // logowania. Czytamy go na serwerze i podajemy propsem — useSearchParams
  // po stronie klienta wymagałoby opakowania w Suspense.
  const { tryb } = await searchParams;

  return <AuthForm initialMode={tryb === "rejestracja" ? "register" : "login"} />;
}
