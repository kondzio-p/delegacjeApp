"use server";

// Preferencje interfejsu: waluta wyświetlania i język.
//
// Jedno i drugie siedziało wcześniej w przeglądarce — waluta w localStorage,
// język w ciasteczku. Znikały przy czyszczeniu danych i nie szły za kontem
// na inne urządzenie. Teraz źródłem prawdy jest baza.
import { prisma } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import { rememberLocale } from "@/lib/i18n/locale.server";
import { CURRENCIES, isCurrency } from "@/lib/money";
import { getCurrentUser } from "@/lib/session";

export async function setDisplayCurrencyAction(value: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  if (!isCurrency(value)) {
    throw new Error(`Nieznana waluta: ${value}. Dozwolone: ${CURRENCIES.join(", ")}`);
  }

  // Bez revalidatePath: kwoty przelicza klient, a wartość początkową czyta
  // powłoka przy pełnym wejściu na stronę. Unieważnianie cache wszystkich
  // ekranów przy każdym kliknięciu byłoby czystą stratą.
  await prisma.user.update({ where: { id: user.id }, data: { display_currency: value } });
}

/**
 * Język zapisujemy w bazie i w ciasteczku.
 *
 * Ciasteczko nie jest duplikatem dla wygody: czyta je warstwa główna przy
 * pierwszym renderze, także na ekranie logowania, gdzie nie ma jeszcze sesji.
 * Bez niego wylogowany widziałby polski niezależnie od swojego wyboru.
 */
export async function setLocaleAction(value: string): Promise<void> {
  if (!isLocale(value)) return;

  await rememberLocale(value);

  const user = await getCurrentUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { locale: value } });
}
