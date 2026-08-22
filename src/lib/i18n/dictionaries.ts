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
  "dash.rateLabel": "Kurs EUR (ile PLN za 1 EUR)",
  "dash.tripOngoing": "Podróż w toku",
  "dash.unitDays": "dni",
  "dash.unitHours": "godz",
  "dash.unitMinutes": "min",
  "dash.unitSeconds": "sek",
  "dash.duration": "Czas trwania",

  "dash.forecastTitle": "Przewidywania",
  "dash.forecastSubtitle": "Ile powinno wyjść z zapisanych godzin i stawek",
  "dash.accrued": "Zarobek wg stawek (godziny × stawka)",
  "dash.workedHours": "Przepracowane godziny",
  "dash.avgHourly": "Średnia stawka godzinowa",

  "dash.actualTitle": "Właściwe zarobki",
  "dash.actualSubtitle": "Pieniądze, które faktycznie wpłynęły, minus koszty",
  "dash.totalPayouts": "Suma wypłat",
  "dash.totalExpenses": "Suma kosztów",
  "dash.netProfit": "Czysty zysk (wypłaty − koszty)",

  "dash.comparisonTitle": "Porównanie",
  "dash.comparisonSubtitle": "Przewidywania kontra rzeczywistość",
  "dash.settled": "Wypłaty pokrywają naliczony zarobek",
  "dash.missing": "Do kwoty przewidywanej brakuje:",
  "dash.overpaid": "Wypłacono ponad naliczony zarobek",
  "dash.coverage": "Wypłacono {pct} naliczonego zarobku ({paid} z {accrued})",
  "dash.rateFromEntries": "Stawka wg wpisów",
  "dash.realHourlyWork": "Realna stawka za godzinę pracy",
  "dash.realHourlyLife": "Realna stawka za godzinę życia na wyjeździe",
  "dash.allScopeNote": "Widok ogólny liczy wszystkie wpisy, także te bez przypisania do podróży.",

  "summary.byCategory": "Koszty wg kategorii",
} as const;

export type TranslationKey = keyof typeof pl;
export type Dict = Record<TranslationKey, string>;

const de: Dict = {
  "nav.dashboard": "Übersicht",
  "nav.trips": "Reisen",
  "nav.hours": "Arbeitsstunden",
  "nav.finance": "Finanzen",
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
  "dash.rateLabel": "EUR-Kurs (wie viel PLN für 1 EUR)",
  "dash.tripOngoing": "Reise läuft",
  "dash.unitDays": "Tage",
  "dash.unitHours": "Std",
  "dash.unitMinutes": "Min",
  "dash.unitSeconds": "Sek",
  "dash.duration": "Dauer",

  "dash.forecastTitle": "Prognose",
  "dash.forecastSubtitle": "Was aus den erfassten Stunden und Sätzen herauskommen sollte",
  "dash.accrued": "Verdienst nach Sätzen (Stunden × Satz)",
  "dash.workedHours": "Gearbeitete Stunden",
  "dash.avgHourly": "Durchschnittlicher Stundensatz",

  "dash.actualTitle": "Tatsächlicher Verdienst",
  "dash.actualSubtitle": "Tatsächlich eingegangenes Geld, abzüglich Kosten",
  "dash.totalPayouts": "Summe der Auszahlungen",
  "dash.totalExpenses": "Summe der Kosten",
  "dash.netProfit": "Reingewinn (Auszahlungen − Kosten)",

  "dash.comparisonTitle": "Vergleich",
  "dash.comparisonSubtitle": "Prognose gegen Wirklichkeit",
  "dash.settled": "Die Auszahlungen decken den berechneten Verdienst",
  "dash.missing": "Zum prognostizierten Betrag fehlen:",
  "dash.overpaid": "Es wurde mehr ausgezahlt als berechnet",
  "dash.coverage": "{pct} des berechneten Verdienstes ausgezahlt ({paid} von {accrued})",
  "dash.rateFromEntries": "Satz laut Einträgen",
  "dash.realHourlyWork": "Realer Satz pro Arbeitsstunde",
  "dash.realHourlyLife": "Realer Satz pro Stunde unterwegs",
  "dash.allScopeNote": "Die Gesamtansicht zählt alle Einträge, auch die ohne Reisezuordnung.",

  "summary.byCategory": "Kosten nach Kategorie",
};

const uk: Dict = {
  "nav.dashboard": "Панель",
  "nav.trips": "Поїздки",
  "nav.hours": "Робочі години",
  "nav.finance": "Фінанси",
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
  "dash.rateLabel": "Курс EUR (скільки PLN за 1 EUR)",
  "dash.tripOngoing": "Поїздка триває",
  "dash.unitDays": "дні",
  "dash.unitHours": "год",
  "dash.unitMinutes": "хв",
  "dash.unitSeconds": "сек",
  "dash.duration": "Тривалість",

  "dash.forecastTitle": "Прогноз",
  "dash.forecastSubtitle": "Скільки має вийти із записаних годин і ставок",
  "dash.accrued": "Заробіток за ставками (години × ставка)",
  "dash.workedHours": "Відпрацьовані години",
  "dash.avgHourly": "Середня погодинна ставка",

  "dash.actualTitle": "Фактичний заробіток",
  "dash.actualSubtitle": "Гроші, які справді надійшли, мінус витрати",
  "dash.totalPayouts": "Сума виплат",
  "dash.totalExpenses": "Сума витрат",
  "dash.netProfit": "Чистий прибуток (виплати − витрати)",

  "dash.comparisonTitle": "Порівняння",
  "dash.comparisonSubtitle": "Прогноз проти реальності",
  "dash.settled": "Виплати покривають нарахований заробіток",
  "dash.missing": "До прогнозованої суми бракує:",
  "dash.overpaid": "Виплачено більше, ніж нараховано",
  "dash.coverage": "Виплачено {pct} нарахованого заробітку ({paid} з {accrued})",
  "dash.rateFromEntries": "Ставка за записами",
  "dash.realHourlyWork": "Реальна ставка за годину роботи",
  "dash.realHourlyLife": "Реальна ставка за годину життя у відрядженні",
  "dash.allScopeNote":
    "Загальний вигляд рахує всі записи, зокрема ті, що не прив’язані до поїздки.",

  "summary.byCategory": "Витрати за категоріями",
};

const en: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.trips": "Trips",
  "nav.hours": "Work Hours",
  "nav.finance": "Finances",
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
  "dash.rateLabel": "EUR rate (how many PLN per 1 EUR)",
  "dash.tripOngoing": "Trip in progress",
  "dash.unitDays": "days",
  "dash.unitHours": "hrs",
  "dash.unitMinutes": "min",
  "dash.unitSeconds": "sec",
  "dash.duration": "Duration",

  "dash.forecastTitle": "Forecast",
  "dash.forecastSubtitle": "What the saved hours and rates should add up to",
  "dash.accrued": "Earnings by rate (hours × rate)",
  "dash.workedHours": "Hours worked",
  "dash.avgHourly": "Average hourly rate",

  "dash.actualTitle": "Actual earnings",
  "dash.actualSubtitle": "Money that actually came in, minus costs",
  "dash.totalPayouts": "Total payouts",
  "dash.totalExpenses": "Total costs",
  "dash.netProfit": "Net profit (payouts − costs)",

  "dash.comparisonTitle": "Comparison",
  "dash.comparisonSubtitle": "Forecast versus reality",
  "dash.settled": "Payouts cover the accrued earnings",
  "dash.missing": "Short of the forecast amount by:",
  "dash.overpaid": "Paid out more than accrued",
  "dash.coverage": "{pct} of accrued earnings paid out ({paid} of {accrued})",
  "dash.rateFromEntries": "Rate from entries",
  "dash.realHourlyWork": "Real rate per hour worked",
  "dash.realHourlyLife": "Real rate per hour away from home",
  "dash.allScopeNote": "The overall view counts every entry, including those without a trip.",

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
