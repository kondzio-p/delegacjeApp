import { requireUser } from "@/lib/session";

/** Wszystko w tej grupie wymaga zalogowania. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
