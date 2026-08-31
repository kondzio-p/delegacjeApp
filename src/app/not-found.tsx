import { hasSessionCookie } from "@/lib/auth";
import { DASHBOARD_PATH } from "@/lib/routes";

import { NotFoundScreen } from "./not-found-screen";

/**
 * Ekran 404 dla nieznanych adresów i wywołań `notFound()`.
 *
 * O celu przekierowania rozstrzyga sama obecność ciasteczka sesji, bez pytania
 * bazy: pod nieznane adresy najczęściej trafiają boty, a nieaktualne ciasteczko
 * i tak zostanie odesłane na logowanie przez bramkę docelowego ekranu.
 *
 * Returns:
 *     Promise<ReactNode>: Komunikat 404 z paskiem odliczającym do przejścia.
 */
export default async function NotFound() {
  const target = (await hasSessionCookie()) ? DASHBOARD_PATH : "/";
  return <NotFoundScreen target={target} />;
}
