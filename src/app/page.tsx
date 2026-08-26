import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { DASHBOARD_PATH } from "@/lib/routes";

import { LandingScreen } from "./landing-screen";

/**
 * Strona powitalna pod adresem głównym.
 *
 * Zalogowany nie ma tu czego szukać — leci prosto na pulpit. Cała reszta to
 * ktoś, kto dostał link i jeszcze nie wie, czym jest ta aplikacja: dlatego
 * zamiast formularza logowania dostaje wyjaśnienie, po co to komu, i dopiero
 * potem przyciski „Zaloguj się" i „Załóż konto".
 */
export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect(DASHBOARD_PATH);

  return <LandingScreen />;
}
