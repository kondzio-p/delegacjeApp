"use client";

import {
  ArrowRightLeft,
  Building2,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  Plane,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { LanguagePicker } from "@/components/language-picker";
import { useT } from "@/components/locale-provider";
import { logoutAction } from "@/lib/actions/auth";
import { DASHBOARD_PATH } from "@/lib/routes";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { SessionUser } from "@/lib/types";

const BASE_NAV = [
  { href: DASHBOARD_PATH, labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/podroze", labelKey: "nav.trips", icon: Plane },
  { href: "/godziny", labelKey: "nav.hours", icon: Clock },
  { href: "/finanse", labelKey: "nav.finance", icon: Wallet },
  { href: "/kursy", labelKey: "nav.rates", icon: ArrowRightLeft },
] as const satisfies readonly { href: string; labelKey: TranslationKey; icon: unknown }[];

const SETTINGS_NAV = { href: "/ustawienia", labelKey: "nav.settings", icon: Settings } as const;
const EMPLOYEES_NAV = { href: "/pracownicy", labelKey: "nav.employees", icon: Users } as const;
const COMPANY_NAV = { href: "/firma", labelKey: "nav.company", icon: Building2 } as const;

/**
 * Tytuł w nagłówku bierze się ze ścieżki, a nie z propsa strony — dzięki temu
 * powłoka siedzi w layoucie i nie przeładowuje się przy zmianie widoku.
 */
function titleKeyFor(pathname: string): TranslationKey {
  if (pathname === DASHBOARD_PATH) return "nav.dashboard";
  if (pathname.startsWith("/podroze/")) return "title.tripDetail";
  if (pathname === "/podroze") return "nav.trips";
  if (pathname.startsWith("/godziny")) return "nav.hours";
  if (pathname.startsWith("/finanse")) return "nav.finance";
  if (pathname.startsWith("/kursy")) return "nav.rates";
  if (pathname.startsWith("/firma")) return "nav.company";
  if (pathname.startsWith("/pracownicy/")) return "title.employee";
  if (pathname === "/pracownicy") return "nav.employees";
  if (pathname.startsWith("/ustawienia")) return "nav.settings";
  return "nav.dashboard";
}

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  // Pozycja Pracownicy pojawia się dopiero po włączeniu trybu właściciela.
  const nav = [
    ...BASE_NAV,
    ...(user.is_owner ? [COMPANY_NAV, EMPLOYEES_NAV] : []),
    SETTINGS_NAV,
  ];

  // Menu jest wysunięte poza ekran, więc automatyczny prefetch <Link> (oparty na
  // widoczności) nigdy się nie odpala. Grzejemy trasy ręcznie, gdy tylko szuflada
  // się otworzy — zanim użytkownik zdąży kliknąć, RSC jest już pobrany.
  useEffect(() => {
    if (!open) return;
    for (const item of nav) router.prefetch(item.href);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nav to nowa tablica przy każdym renderze
  }, [open, router, user.is_owner]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="no-print fixed inset-x-0 top-0 z-30 grid h-16 grid-cols-[3rem_minmax(0,1fr)_3rem] items-center border-b border-border bg-card/95 px-2 backdrop-blur">
        <button
          type="button"
          aria-label={t("shell.openMenu")}
          onClick={() => setOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-foreground active:bg-secondary"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-xs text-muted-foreground">
            {t("shell.greeting", { name: user.name })}
          </p>
          <h1 className="truncate text-base font-semibold leading-tight">
            {t(titleKeyFor(pathname))}
          </h1>
        </div>
        <LanguagePicker className="justify-self-end" />
      </header>

      {open && (
        <div
          className="no-print fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-4">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">
              {t("shell.greeting", { name: user.name })}
            </p>
            <p className="truncate text-xs text-muted-foreground">Godzio</p>
          </div>
          <button
            type="button"
            aria-label={t("shell.closeMenu")}
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-xl active:bg-sidebar-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const active =
              item.href === DASHBOARD_PATH
        ? pathname === DASHBOARD_PATH
        : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-4 text-base font-medium ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground active:bg-sidebar-accent"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-base font-medium text-destructive active:bg-sidebar-accent"
            >
              <LogOut className="h-5 w-5" />
              {t("shell.logout")}
            </button>
          </form>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-2xl px-4 pt-20 pb-12">{children}</main>
    </div>
  );
}
