// Odczyty panelu administracyjnego.
//
// Świadomie nie ma tu ani jednej kwoty: root zarządza dostępem, a nie cudzymi
// pieniędzmi. Aplikacja obiecuje pracownikowi w ustawieniach, że jego koszty
// widzi tylko on — panel, który je pokazuje, łamałby tę obietnicę.
import "server-only";

import { prisma } from "./db";

export type RootOverview = {
  users: number;
  deletedUsers: number;
  blockedUsers: number;
  withoutCompanyAccess: number;
  companies: number;
  activeSessions: number;
  attemptsLastDay: number;
};

export type RootUserRow = {
  id: string;
  email: string;
  name: string;
  isOwner: boolean;
  isRoot: boolean;
  isDeleted: boolean;
  isBlocked: boolean;
  canOwnCompany: boolean;
  mustChangePassword: boolean;
  /** Firma, którą prowadzi (jako założyciel) — null, gdy żadnej nie ma. */
  ownedCompany: { id: string; name: string } | null;
  /** Firma, w której pracuje. */
  employerName: string | null;
  coOwnedName: string | null;
  sessions: number;
  createdAt: string;
};

export type RootCompanyRow = {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  employees: number;
  coOwners: { id: string; name: string; email: string }[];
  createdAt: string;
};

export type RootAuditRow = {
  id: string;
  action: string;
  targetLabel: string | null;
  detail: string | null;
  createdAt: string;
};

export type RootAttemptRow = {
  scope: string;
  subject: string;
  attempts: number;
  last: string;
};

/** Filtry listy kont w panelu. */
export type UserFilter = "all" | "owners" | "employees" | "noCompany" | "blocked" | "deleted";

/**
 * Liczby na kafelki przeglądu.
 *
 * Wszystko jednym `Promise.all`, bo to siedem niezależnych zliczeń — sekwencyjnie
 * ekran czekałby siedem razy zamiast raz.
 *
 * Returns:
 *     Promise<RootOverview>: Liczniki kont, firm, sesji i prób logowania.
 */
export async function getRootOverview(): Promise<RootOverview> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [users, deletedUsers, blockedUsers, withoutCompanyAccess, companies, activeSessions, attemptsLastDay] =
    await Promise.all([
      prisma.user.count({ where: { is_root: false } }),
      prisma.user.count({ where: { is_deleted: true } }),
      prisma.user.count({ where: { is_blocked: true } }),
      prisma.user.count({ where: { can_own_company: false, is_root: false } }),
      prisma.company.count(),
      prisma.session.count({ where: { expires_at: { gt: new Date() } } }),
      prisma.authAttempt.count({ where: { created_at: { gt: dayAgo } } }),
    ]);

  return {
    users,
    deletedUsers,
    blockedUsers,
    withoutCompanyAccess,
    companies,
    activeSessions,
    attemptsLastDay,
  };
}

/**
 * Lista kont do przeglądania i zarządzania.
 *
 * Szukamy po adresie i imieniu bez względu na wielkość liter. Konto root nie
 * pojawia się na liście — panel nie służy do zarządzania samym sobą.
 *
 * Args:
 *     search (string): Fragment adresu e-mail albo imienia.
 *     filter (UserFilter): Zawężenie listy do wybranej grupy kont.
 *     limit (number): Ile kont najwyżej zwrócić.
 *
 * Returns:
 *     Promise<RootUserRow[]>: Konta posortowane od najnowszego.
 */
export async function listRootUsers(
  search = "",
  filter: UserFilter = "all",
  limit = 50,
): Promise<RootUserRow[]> {
  const term = search.trim();

  const byFilter = {
    all: {},
    owners: { is_owner: true },
    employees: { is_owner: false, company_id: { not: null } },
    noCompany: { is_owner: false, company_id: null },
    blocked: { is_blocked: true },
    deleted: { is_deleted: true },
  }[filter];

  const rows = await prisma.user.findMany({
    where: {
      is_root: false,
      ...byFilter,
      ...(term
        ? {
            OR: [
              { email: { contains: term, mode: "insensitive" as const } },
              { name: { contains: term, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { created_at: "desc" },
    take: limit,
    select: {
      id: true,
      email: true,
      name: true,
      is_owner: true,
      is_root: true,
      is_deleted: true,
      is_blocked: true,
      can_own_company: true,
      must_change_password: true,
      created_at: true,
      company: { select: { name: true } },
      owned_company: { select: { id: true, name: true } },
      co_ownerships: { select: { company: { select: { name: true } } }, take: 1 },
      _count: { select: { sessions: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    isOwner: row.is_owner,
    isRoot: row.is_root,
    isDeleted: row.is_deleted,
    isBlocked: row.is_blocked,
    canOwnCompany: row.can_own_company,
    mustChangePassword: row.must_change_password,
    ownedCompany: row.owned_company ?? null,
    employerName: row.company?.name ?? null,
    coOwnedName: row.co_ownerships[0]?.company.name ?? null,
    sessions: row._count.sessions,
    createdAt: row.created_at.toISOString(),
  }));
}

/**
 * Lista firm razem ze składem.
 *
 * Returns:
 *     Promise<RootCompanyRow[]>: Firmy posortowane po nazwie.
 */
export async function listRootCompanies(): Promise<RootCompanyRow[]> {
  const rows = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      created_at: true,
      owner: { select: { id: true, name: true, email: true } },
      co_owners: {
        orderBy: { created_at: "asc" },
        select: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { employees: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    ownerId: row.owner.id,
    ownerName: row.owner.name,
    ownerEmail: row.owner.email,
    employees: row._count.employees,
    coOwners: row.co_owners.map((c) => c.user),
    createdAt: row.created_at.toISOString(),
  }));
}

/**
 * Ostatnie wpisy dziennika działań roota.
 *
 * Args:
 *     limit (number): Ile wpisów zwrócić.
 *
 * Returns:
 *     Promise<RootAuditRow[]>: Wpisy od najnowszego.
 */
export async function listAuditLog(limit = 100): Promise<RootAuditRow[]> {
  const rows = await prisma.rootAuditLog.findMany({
    orderBy: { created_at: "desc" },
    take: limit,
    select: { id: true, action: true, target_label: true, detail: true, created_at: true },
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    targetLabel: row.target_label,
    detail: row.detail,
    createdAt: row.created_at.toISOString(),
  }));
}

/**
 * Konta, które ostatnio odbijały się od limitu prób.
 *
 * Grupujemy po kluczu licznika, więc widać, czy ktoś zapomniał hasła, czy ktoś
 * inny próbuje je zgadnąć.
 *
 * Args:
 *     hours (number): Ile godzin wstecz patrzymy.
 *
 * Returns:
 *     Promise<RootAttemptRow[]>: Klucze posortowane po liczbie prób.
 */
export async function listRecentAttempts(hours = 24): Promise<RootAttemptRow[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const rows = await prisma.authAttempt.groupBy({
    by: ["scope", "subject"],
    where: { created_at: { gt: since } },
    _count: { _all: true },
    _max: { created_at: true },
    orderBy: { _count: { subject: "desc" } },
    take: 30,
  });

  return rows.map((row) => ({
    scope: row.scope,
    subject: row.subject,
    attempts: row._count._all,
    last: (row._max.created_at ?? since).toISOString(),
  }));
}
