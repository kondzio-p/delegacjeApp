import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "./auth-form";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Logowanie — Delegacje",
  description: "Zaloguj się, aby rozliczać czas pracy, koszty i zyski z delegacji zagranicznych.",
};

export default async function LoginPage() {
  // Kto ma ważną sesję, nie powinien oglądać formularza logowania.
  const user = await getSessionUser();
  if (user) redirect("/");

  return <AuthForm />;
}
