import type { Metadata } from "next";

import { requireUser } from "@/lib/session";

import { WelcomeScreen } from "./welcome-screen";

export const metadata: Metadata = {
  title: "Witaj",
};

/** Ekran pokazywany zaraz po zalogowaniu lub rejestracji. */
export default async function WelcomePage() {
  const user = await requireUser();
  return <WelcomeScreen name={user.name} />;
}
