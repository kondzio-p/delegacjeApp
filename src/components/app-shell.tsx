"use client";

import {
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
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { logoutAction } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/types";

const BASE_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/podroze", label: "Podróże", icon: Plane },
  { href: "/godziny", label: "Godziny Pracy", icon: Clock },
  { href: "/finanse", label: "Finanse", icon: Wallet },
] as const;

const SETTINGS_NAV = { href: "/ustawienia", label: "Ustawienia", icon: Settings } as const;
const EMPLOYEES_NAV = { href: "/pracownicy", label: "Pracownicy", icon: Users } as const;

export function AppShell({
  title,
  user,
  children,
}: {
  title: string;
  user: SessionUser;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Pozycja Pracownicy pojawia się dopiero po włączeniu trybu właściciela.
  const nav = [...BASE_NAV, ...(user.is_owner ? [EMPLOYEES_NAV] : []), SETTINGS_NAV];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="no-print fixed inset-x-0 top-0 z-30 grid h-16 grid-cols-[3rem_minmax(0,1fr)_3rem] items-center border-b border-border bg-card/95 px-2 backdrop-blur">
        <button
          type="button"
          aria-label="Otwórz menu"
          onClick={() => setOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-foreground active:bg-secondary"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-xs text-muted-foreground">
            Witaj, <span className="font-medium text-foreground">{user.name}</span>
          </p>
          <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
        </div>
        <span />
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
            <p className="truncate text-base font-semibold">Witaj, {user.name}</p>
            <p className="truncate text-xs text-muted-foreground">Delegacje</p>
          </div>
          <button
            type="button"
            aria-label="Zamknij menu"
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-xl active:bg-sidebar-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
                <span className="truncate">{item.label}</span>
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
              Wyloguj
            </button>
          </form>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-2xl px-4 pt-20 pb-12">{children}</main>
    </div>
  );
}
