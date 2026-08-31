"use server";

// Preferencje interfejsu: waluta wyświetlania i język. Źródłem prawdy jest baza.
import { prisma } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import { rememberLocale } from "@/lib/i18n/locale.server";
import { CURRENCIES, isCurrency } from "@/lib/money";
import { getCurrentUser } from "@/lib/session";

/**
 * Zapisuje walutę, w której konto ogląda kwoty.
 *
 * Bez `revalidatePath`: kwoty przelicza klient, a wartość początkową czyta
 * powłoka przy pełnym wejściu na stronę.
 *
 * Args:
 *     value (string): Kod waluty z listy obsługiwanych.
 *
 * Returns:
 *     Promise<void>: Nic — nieznana waluta kończy się wyjątkiem.
 */
export async function setDisplayCurrencyAction(value: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  if (!isCurrency(value)) {
    throw new Error(`Nieznana waluta: ${value}. Dozwolone: ${CURRENCIES.join(", ")}`);
  }

  await prisma.user.update({ where: { id: user.id }, data: { display_currency: value } });
}

/**
 * Zapisuje język interfejsu w bazie i w ciasteczku.
 *
 * Ciasteczko nie jest duplikatem dla wygody: czyta je warstwa główna przy
 * pierwszym renderze, także na ekranie logowania, gdzie nie ma jeszcze sesji.
 *
 * Args:
 *     value (string): Kod języka z listy obsługiwanych.
 *
 * Returns:
 *     Promise<void>: Nic — nieznany kod jest po cichu pomijany.
 */
export async function setLocaleAction(value: string): Promise<void> {
  if (!isLocale(value)) return;

  await rememberLocale(value);

  const user = await getCurrentUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { locale: value } });
}
