import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { redirect } from "next/navigation";

import { AuthForm } from "./auth-form";
import { getSessionUser } from "@/lib/auth";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("auth.login", "meta.login");
}

export default async function LoginPage() {
  // Kto ma ważną sesję, nie powinien oglądać formularza logowania.
  const user = await getSessionUser();
  if (user) redirect("/");

  return <AuthForm />;
}
