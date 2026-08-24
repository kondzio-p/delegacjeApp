import type { Metadata } from "next";

import { RecoverForm } from "./recover-form";

export const metadata: Metadata = {
  title: "Odzyskiwanie hasła",
  description: "Ustaw nowe hasło przy pomocy kodu odzyskiwania.",
};

export default function RecoverPage() {
  return <RecoverForm />;
}
