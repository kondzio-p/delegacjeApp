import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { RecoverForm } from "./recover-form";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("meta.recoveryTitle", "meta.recovery");
}

/**
 * Ekran odzyskiwania hasła.
 *
 * Returns:
 *     ReactNode: Zawartość ekranu.
 */
export default function RecoverPage() {
  return <RecoverForm />;
}
