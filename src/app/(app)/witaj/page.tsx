import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { requireUser } from "@/lib/session";

import { WelcomeScreen } from "./welcome-screen";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("welcome.title");
}

/**
 * Ekran powitalny po zalogowaniu.
 *
 * Returns:
 *     Promise<ReactNode>: Zawartość ekranu.
 */
export default async function WelcomePage() {
  const user = await requireUser();
  return <WelcomeScreen name={user.name} />;
}
