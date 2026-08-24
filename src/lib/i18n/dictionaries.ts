// Słowniki interfejsu. Polski jest źródłem prawdy — typ `Dict` wywodzi się
// z niego, więc brakujący klucz w innym języku wywala się na typecheck.
//
// Zakres: ekran logowania, chrom aplikacji (nagłówek, menu, tytuły stron)
// i dashboard. Pozostałe ekrany zostają na razie po polsku.
import type { Locale } from "./config";

const pl = {
  "nav.dashboard": "Dashboard",
  "nav.trips": "Podróże",
  "nav.hours": "Godziny Pracy",
  "nav.finance": "Finanse",
  "nav.rates": "Kursy i przeliczarka",
  "nav.company": "Moja firma",
  "nav.employees": "Pracownicy",
  "nav.settings": "Ustawienia",

  "title.tripDetail": "Podsumowanie podróży",
  "title.employee": "Pracownik",

  "shell.greeting": "Witaj, {name}",
  "shell.openMenu": "Otwórz menu",
  "shell.closeMenu": "Zamknij menu",
  "shell.logout": "Wyloguj",
  "shell.language": "Język",

  "auth.tagline": "Rozliczaj czas pracy, koszty i realny zysk z wyjazdów.",
  "auth.login": "Logowanie",
  "auth.register": "Rejestracja",
  "auth.email": "E-mail",
  "auth.password": "Hasło",
  "auth.name": "Imię / Pseudonim",
  "auth.confirmPassword": "Powtórz hasło",
  "auth.namePlaceholder": "Jan",
  "auth.submitLogin": "Zaloguj się",
  "auth.submitRegister": "Załóż konto",
  "auth.registerNote":
    "Na adres e-mail nic jeszcze nie wysyłamy — służy tylko do logowania. Po założeniu konta dostaniesz kod odzyskiwania, na razie jedyny sposób na odzyskanie dostępu po zapomnieniu hasła.",
  "auth.forgotPassword": "Nie pamiętam hasła",

  "dash.scopeLabel": "Zakres podsumowania",
  "dash.scopeAll": "Wszystko razem (bez podziału)",
  "dash.ongoing": "w toku",
  "dash.displayIn": "Wyświetl w",
  "dash.rateFromNbp": "Kurs NBP: {rate} PLN za 1 EUR (tabela z {date})",
  "dash.tripOngoing": "Podróż w toku",
  "dash.unitDays": "dni",
  "dash.unitHours": "godz",
  "dash.unitMinutes": "min",
  "dash.unitSeconds": "sek",
  "dash.duration": "Czas trwania",

  "dash.timeTitle": "Czas",
  "dash.timeSubtitle": "Ile godzin poszło w pracę, ile trwał wyjazd",
  "dash.timeAway": "Czas na wyjeździe",
  "dash.moneyTitle": "Pieniądze",
  "dash.moneySubtitle": "Co wpłynęło i co z tego wyszło",
  "dash.ratesTitle": "Realne stawki",
  "dash.ratesSubtitle": "Ile faktycznie wyszło za godzinę",
  "dash.workedHours": "Przepracowane godziny",

  "dash.totalPayouts": "Suma wypłat",
  "dash.totalExpenses": "Suma kosztów",
  "dash.netProfit": "Czysty zysk (wypłaty − koszty)",

  "dash.realHourlyWork": "Realna stawka za godzinę pracy",
  "dash.realHourlyLife": "Realna stawka za godzinę życia na wyjeździe",
  "dash.allScopeNote": "Widok ogólny liczy wszystkie wpisy, także te bez przypisania do podróży.",

  "rates.title": "Kursy NBP",
  "rates.tableDate": "Tabela A z dnia {date}",
  "rates.converter": "Przeliczarka",
  "rates.amount": "Kwota",
  "rates.from": "Z waluty",
  "rates.to": "Na walutę",
  "rates.swap": "Zamień waluty",
  "rates.note": "Kursy średnie NBP, tabela A. Publikowane w dni robocze około południa.",
  "rates.unavailable": "Nie udało się pobrać kursów",
  "rates.unavailableHint": "NBP nie odpowiada. Spróbuj odświeżyć za chwilę.",

  "summary.byCategory": "Koszty wg kategorii",
} as const;

export type TranslationKey = keyof typeof pl;
export type Dict = Record<TranslationKey, string>;

const de: Dict = {
  "nav.dashboard": "Übersicht",
  "nav.trips": "Reisen",
  "nav.hours": "Arbeitsstunden",
  "nav.finance": "Finanzen",
  "nav.rates": "Kurse und Rechner",
  "nav.company": "Mein Unternehmen",
  "nav.employees": "Mitarbeiter",
  "nav.settings": "Einstellungen",

  "title.tripDetail": "Reiseübersicht",
  "title.employee": "Mitarbeiter",

  "shell.greeting": "Hallo, {name}",
  "shell.openMenu": "Menü öffnen",
  "shell.closeMenu": "Menü schließen",
  "shell.logout": "Abmelden",
  "shell.language": "Sprache",

  "auth.tagline": "Arbeitszeit, Kosten und den echten Gewinn deiner Reisen abrechnen.",
  "auth.login": "Anmelden",
  "auth.register": "Registrieren",
  "auth.email": "E-Mail",
  "auth.password": "Passwort",
  "auth.name": "Vorname / Spitzname",
  "auth.confirmPassword": "Passwort wiederholen",
  "auth.namePlaceholder": "Max",
  "auth.submitLogin": "Anmelden",
  "auth.submitRegister": "Konto erstellen",
  "auth.registerNote":
    "An die E-Mail-Adresse senden wir noch nichts — sie dient nur zum Anmelden. Nach der Registrierung bekommst du einen Wiederherstellungscode, vorerst der einzige Weg zurück ins Konto, wenn du das Passwort vergisst.",
  "auth.forgotPassword": "Passwort vergessen",

  "dash.scopeLabel": "Umfang der Übersicht",
  "dash.scopeAll": "Alles zusammen (ohne Aufteilung)",
  "dash.ongoing": "läuft",
  "dash.displayIn": "Anzeigen in",
  "dash.rateFromNbp": "NBP-Kurs: {rate} PLN je 1 EUR (Tabelle vom {date})",
  "dash.tripOngoing": "Reise läuft",
  "dash.unitDays": "Tage",
  "dash.unitHours": "Std",
  "dash.unitMinutes": "Min",
  "dash.unitSeconds": "Sek",
  "dash.duration": "Dauer",

  "dash.timeTitle": "Zeit",
  "dash.timeSubtitle": "Wie viele Stunden gearbeitet, wie lange unterwegs",
  "dash.timeAway": "Zeit unterwegs",
  "dash.moneyTitle": "Geld",
  "dash.moneySubtitle": "Was eingegangen ist und was davon bleibt",
  "dash.ratesTitle": "Reale Sätze",
  "dash.ratesSubtitle": "Was pro Stunde tatsächlich herauskam",
  "dash.workedHours": "Gearbeitete Stunden",

  "dash.totalPayouts": "Summe der Auszahlungen",
  "dash.totalExpenses": "Summe der Kosten",
  "dash.netProfit": "Reingewinn (Auszahlungen − Kosten)",

  "dash.realHourlyWork": "Realer Satz pro Arbeitsstunde",
  "dash.realHourlyLife": "Realer Satz pro Stunde unterwegs",
  "dash.allScopeNote": "Die Gesamtansicht zählt alle Einträge, auch die ohne Reisezuordnung.",

  "rates.title": "NBP-Kurse",
  "rates.tableDate": "Tabelle A vom {date}",
  "rates.converter": "Währungsrechner",
  "rates.amount": "Betrag",
  "rates.from": "Von Währung",
  "rates.to": "In Währung",
  "rates.swap": "Währungen tauschen",
  "rates.note": "Mittelkurse der NBP, Tabelle A. Werktags gegen Mittag veröffentlicht.",
  "rates.unavailable": "Kurse konnten nicht geladen werden",
  "rates.unavailableHint": "Die NBP antwortet nicht. Versuche es gleich noch einmal.",

  "summary.byCategory": "Kosten nach Kategorie",
};

const uk: Dict = {
  "nav.dashboard": "Панель",
  "nav.trips": "Поїздки",
  "nav.hours": "Робочі години",
  "nav.finance": "Фінанси",
  "nav.rates": "Курси та конвертер",
  "nav.company": "Моя компанія",
  "nav.employees": "Працівники",
  "nav.settings": "Налаштування",

  "title.tripDetail": "Підсумок поїздки",
  "title.employee": "Працівник",

  "shell.greeting": "Вітаємо, {name}",
  "shell.openMenu": "Відкрити меню",
  "shell.closeMenu": "Закрити меню",
  "shell.logout": "Вийти",
  "shell.language": "Мова",

  "auth.tagline": "Обліковуйте робочий час, витрати та реальний прибуток із поїздок.",
  "auth.login": "Вхід",
  "auth.register": "Реєстрація",
  "auth.email": "Електронна пошта",
  "auth.password": "Пароль",
  "auth.name": "Ім’я / Псевдонім",
  "auth.confirmPassword": "Повторіть пароль",
  "auth.namePlaceholder": "Іван",
  "auth.submitLogin": "Увійти",
  "auth.submitRegister": "Створити акаунт",
  "auth.registerNote":
    "На електронну пошту ми поки нічого не надсилаємо — вона потрібна лише для входу. Після реєстрації ви отримаєте код відновлення, наразі це єдиний спосіб повернути доступ, якщо забудете пароль.",
  "auth.forgotPassword": "Не пам’ятаю пароль",

  "dash.scopeLabel": "Обсяг підсумку",
  "dash.scopeAll": "Усе разом (без поділу)",
  "dash.ongoing": "триває",
  "dash.displayIn": "Показувати в",
  "dash.rateFromNbp": "Курс НБП: {rate} PLN за 1 EUR (таблиця від {date})",
  "dash.tripOngoing": "Поїздка триває",
  "dash.unitDays": "дні",
  "dash.unitHours": "год",
  "dash.unitMinutes": "хв",
  "dash.unitSeconds": "сек",
  "dash.duration": "Тривалість",

  "dash.timeTitle": "Час",
  "dash.timeSubtitle": "Скільки годин у роботі, скільки тривала поїздка",
  "dash.timeAway": "Час у поїздці",
  "dash.moneyTitle": "Гроші",
  "dash.moneySubtitle": "Що надійшло і що з цього лишилось",
  "dash.ratesTitle": "Реальні ставки",
  "dash.ratesSubtitle": "Скільки справді вийшло за годину",
  "dash.workedHours": "Відпрацьовані години",

  "dash.totalPayouts": "Сума виплат",
  "dash.totalExpenses": "Сума витрат",
  "dash.netProfit": "Чистий прибуток (виплати − витрати)",

  "dash.realHourlyWork": "Реальна ставка за годину роботи",
  "dash.realHourlyLife": "Реальна ставка за годину життя у відрядженні",
  "dash.allScopeNote":
    "Загальний вигляд рахує всі записи, зокрема ті, що не прив’язані до поїздки.",

  "rates.title": "Курси НБП",
  "rates.tableDate": "Таблиця A від {date}",
  "rates.converter": "Конвертер",
  "rates.amount": "Сума",
  "rates.from": "З валюти",
  "rates.to": "У валюту",
  "rates.swap": "Поміняти валюти",
  "rates.note": "Середні курси НБП, таблиця A. Публікуються в робочі дні близько полудня.",
  "rates.unavailable": "Не вдалося отримати курси",
  "rates.unavailableHint": "НБП не відповідає. Спробуйте оновити за хвилину.",

  "summary.byCategory": "Витрати за категоріями",
};

const en: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.trips": "Trips",
  "nav.hours": "Work Hours",
  "nav.finance": "Finances",
  "nav.rates": "Rates and converter",
  "nav.company": "My company",
  "nav.employees": "Employees",
  "nav.settings": "Settings",

  "title.tripDetail": "Trip summary",
  "title.employee": "Employee",

  "shell.greeting": "Welcome, {name}",
  "shell.openMenu": "Open menu",
  "shell.closeMenu": "Close menu",
  "shell.logout": "Log out",
  "shell.language": "Language",

  "auth.tagline": "Track work time, costs and the real profit from your trips.",
  "auth.login": "Sign in",
  "auth.register": "Sign up",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.name": "First name / Nickname",
  "auth.confirmPassword": "Repeat password",
  "auth.namePlaceholder": "John",
  "auth.submitLogin": "Sign in",
  "auth.submitRegister": "Create account",
  "auth.registerNote":
    "We don’t send anything to your email yet — it is only used to sign in. After signing up you’ll get a recovery code, for now the only way back into your account if you forget your password.",
  "auth.forgotPassword": "I forgot my password",

  "dash.scopeLabel": "Summary scope",
  "dash.scopeAll": "Everything together (no split)",
  "dash.ongoing": "ongoing",
  "dash.displayIn": "Display in",
  "dash.rateFromNbp": "NBP rate: {rate} PLN per 1 EUR (table of {date})",
  "dash.tripOngoing": "Trip in progress",
  "dash.unitDays": "days",
  "dash.unitHours": "hrs",
  "dash.unitMinutes": "min",
  "dash.unitSeconds": "sec",
  "dash.duration": "Duration",

  "dash.timeTitle": "Time",
  "dash.timeSubtitle": "Hours worked and time spent away",
  "dash.timeAway": "Time away",
  "dash.moneyTitle": "Money",
  "dash.moneySubtitle": "What came in and what is left of it",
  "dash.ratesTitle": "Real rates",
  "dash.ratesSubtitle": "What an hour actually paid",
  "dash.workedHours": "Hours worked",

  "dash.totalPayouts": "Total payouts",
  "dash.totalExpenses": "Total costs",
  "dash.netProfit": "Net profit (payouts − costs)",

  "dash.realHourlyWork": "Real rate per hour worked",
  "dash.realHourlyLife": "Real rate per hour away from home",
  "dash.allScopeNote": "The overall view counts every entry, including those without a trip.",

  "rates.title": "NBP rates",
  "rates.tableDate": "Table A of {date}",
  "rates.converter": "Converter",
  "rates.amount": "Amount",
  "rates.from": "From currency",
  "rates.to": "To currency",
  "rates.swap": "Swap currencies",
  "rates.note": "NBP mid rates, table A. Published on working days around noon.",
  "rates.unavailable": "Could not load the rates",
  "rates.unavailableHint": "NBP is not responding. Try refreshing in a moment.",

  "summary.byCategory": "Costs by category",
};

export const DICTIONARIES: Record<Locale, Dict> = { pl, de, uk, en };

/** `{name}` w tekście podmienia się na wartość z `vars`. */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const template = DICTIONARIES[locale][key] ?? pl[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
