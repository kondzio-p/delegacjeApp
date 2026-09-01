import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { homePathFor } from "@/lib/routes";

import { LandingScreen } from "./landing-screen";

/**
 * Strona powitalna pod adresem głównym.
 *
 * Zalogowany leci prosto na pulpit. Reszta to ktoś, kto dostał link i jeszcze
 * nie wie, czym jest ta aplikacja — dlatego najpierw wyjaśnienie, a dopiero
 * potem przyciski logowania i zakładania konta.
 *
 * Returns:
 *     ReactNode: Ekran powitalny dla niezalogowanych.
 */
export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect(homePathFor(user));

  return <LandingScreen />;
}
