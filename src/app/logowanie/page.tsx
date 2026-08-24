import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "./auth-form";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Logowanie",
  description: "Zaloguj się, aby zapisywać godziny pracy i wypłaty.",
};

export default async function LoginPage() {
  // Kto ma ważną sesję, nie powinien oglądać formularza logowania.
  const user = await getSessionUser();
  if (user) redirect("/");

  return <AuthForm />;
}
