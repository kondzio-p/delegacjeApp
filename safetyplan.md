# Plan testu bezpieczeństwa — Godzio

Dokument spisany **przed** rozpoczęciem testów. Ustala zakres, metodę i granice,
żeby audyt nie zamienił się w przypadkowe grzebanie w produkcji.

## 1. Zakres

W zakresie:

- kod aplikacji w `src/` (server actions, warstwa dostępu do danych, strony, komponenty klienckie),
- schemat bazy `prisma/schema.prisma` i migracje,
- konfiguracja: `next.config.ts`, `prisma.config.ts`, `.gitignore`, zmienne środowiskowe,
- zależności (`npm audit`),
- historia gita pod kątem wycieku sekretów.

Poza zakresem:

- infrastruktura hostingu (Vercel, Prisma Postgres) — nie moja własność,
- API NBP (`api.nbp.pl`) — cudzy serwis, żadnych testów obciążeniowych ani fuzzingu,
- jakiekolwiek konta użytkowników poza kontami testowymi.

## 2. Zasady bezpieczeństwa testu

1. **Zero ruchu na produkcyjnej bazie.** Audyt jest statyczny: czytam kod i schemat.
   Żadnych zapytań do `DATABASE_URL`, żadnych zapisów, żadnych kasowań.
2. **Sekrety zostają sekretami.** Plik `.env` nie jest otwierany ani cytowany;
   sprawdzam wyłącznie, czy nie wyciekł do repozytorium.
3. **Brak ataków na żywy serwis.** Nie odpalam skanerów, nie próbuję logowania
   siłowego, nie generuję ruchu na cudze API.
4. **Zmiany minimalne i odwracalne.** Poprawki dotykają tylko tego, co wynika
   z konkretnego ustalenia; żadnych przepisywań architektury przy okazji.
5. **Nic nie psuje istniejących kont.** Odrzucone: zmiana nazwy ciasteczka sesji
   (`__Host-`) i podniesienie minimalnej długości hasła — jedno wylogowałoby
   wszystkich, drugie zablokowało część kont przy najbliższym logowaniu.
6. **Weryfikacja po każdej zmianie:** `npm run typecheck`, `npm run lint`, `npm test`.

## 3. Model zagrożeń

Kto atakuje i co chce osiągnąć:

| Napastnik | Cel |
| --- | --- |
| Anonim z internetu | wejść na cudze konto, wyciągnąć dane z linku publicznego, wywrócić serwer |
| Zalogowany pracownik | zobaczyć albo zmienić dane innego pracownika, podszyć się pod właściciela |
| Właściciel firmy | sięgnąć po prywatne dane pracownika (koszty), przejąć jego konto |
| Odbiorca udostępnionego linku | dostać się do danych spoza udostępnionej podróży |

Aktywa: hasła i kody odzyskiwania, sesje, godziny pracy (podstawa rozliczenia),
kwoty wypłat, prywatne koszty pracownika, adresy e-mail.

## 4. Metoda

Przechodzę kolejno przez obszary, w każdym szukam konkretnych klas błędów:

1. **Uwierzytelnianie** — hashowanie, porównania w stałym czasie, kod odzyskiwania,
   reset hasła przez właściciela, enumeracja kont, ograniczenia liczby prób.
2. **Sesje** — postać tokenu, atrybuty ciasteczka, wygaszanie, unieważnianie po
   zmianie hasła, sesja konta usuniętego.
3. **Autoryzacja (IDOR)** — czy każde zapytanie i każdy zapis jest zawężony do
   właściciela danych; czy `employee_id` z formularza da się podstawić.
4. **Walidacja wejścia** — każdy `formData.get`, każdy parametr adresu i każdy
   segment ścieżki: co się stanie przy wartości spoza formularza.
5. **Wstrzyknięcia** — SQL (Prisma), formuły w CSV, XSS w React, wstrzyknięcie
   w nazwę pobieranego pliku.
6. **Wyciek danych** — co widzi link publiczny, co widzi właściciel, co zostaje
   po usunięciu konta.
7. **Konfiguracja** — nagłówki bezpieczeństwa, CSP, cache, sekrety w repo.
8. **Zależności** — `npm audit`.

## 5. Kryteria oceny

- **Krytyczne** — przejęcie cudzego konta albo odczyt cudzych danych bez uprawnień.
- **Wysokie** — realna droga do przejęcia konta przy dodatkowym wysiłku (siłowe
  zgadywanie), albo fałszowanie danych rozliczeniowych.
- **Średnie** — awaria usługi, wyciek metadanych, brak warstwy obronnej.
- **Niskie** — utwardzenie, higiena, błędy logiczne bez wpływu na dane.

---

# Wyniki

Audyt wykonany 31.08.2026 na commicie `3db16f8`. Poniżej ustalenia w kolejności
istotności; kolumna „stan" mówi, co zostało zrobione w tej samej sesji.

## Wysokie

### W-1. Brak jakiegokolwiek ograniczenia liczby prób logowania — naprawione

`loginAction`, `recoverAction` i `registerAction` przyjmowały nieograniczoną
liczbę żądań. Przy haśle od 6 znaków i — co gorsza — przy siedmioliterowym haśle
startowym nadawanym pracownikowi przez właściciela (`generateResetPassword`,
25^7 kombinacji) zgadywanie było kwestią czasu i pasma.

Poprawka: `src/lib/rate-limit.ts` — okno przesuwne liczone w tabeli
`auth_attempts`, klucz to adres IP z `x-forwarded-for` plus podany e-mail.
Limity: 10 prób logowania na 15 minut, 5 prób odzyskiwania na godzinę,
5 rejestracji na godzinę, 10 zmian hasła na 15 minut. Udane logowanie kasuje
licznik, a wiersze starsze niż dwie godziny sprzątają się same.

Licznik siedzi w bazie, a nie w pamięci procesu, bo przy kilku instancjach
serverless każda liczyłaby po swojemu i limit dałoby się obejść zwykłym
ponawianiem żądań. Gdy baza nie odpowiada, zostaje zapasowy licznik w pamięci
instancji — słabszy, ale lepszy niż przepuszczanie każdej próby.

### W-2. Kanał czasowy zdradzający istnienie konta — naprawione

`loginAction` przy nieznanym adresie wracał natychmiast, a przy znanym dopiero
po `scrypt` (dziesiątki milisekund). Różnica jest mierzalna zdalnie i pozwalała
zbudować listę kont mimo identycznego komunikatu błędu. Teraz przy braku
użytkownika liczony jest hash pozorny (`verifySecret` na stałym hashu), więc
obie ścieżki trwają tyle samo.

### W-3. Zmiana hasła nie unieważniała pozostałych sesji — naprawione

`changePasswordAction` zmieniało hash, ale sesje z innych urządzeń działały
dalej. Ktoś, kto przejął ciasteczko, zostawał w koncie mimo reakcji właściciela.
`recoverAction` robiło to poprawnie od początku — teraz obie ścieżki kończą
wszystkie sesje i zakładają nową dla bieżącej przeglądarki.

### W-4. Godziny pracy przyjmowały czas spoza doby — naprawione

Wyrażenie `/^\d{2}:\d{2}$/` przepuszczało `99:99`. `hoursBetween` liczy z tego
prawdziwe godziny, więc podrobiony formularz (albo aplikacja mobilna z błędem)
wpisywał do raportu firmy dowolną liczbę przepracowanych godzin — a to jest
podstawa rozliczenia z pracownikiem. Teraz `^([01]\d|2[0-3]):[0-5]\d$`, dodatkowo
data jest sprawdzana kalendarzowo, a nie samym kształtem.

## Średnie

### S-1. Wstrzyknięcie formuł do arkusza (CSV injection) — naprawione

Eksport RODO i raport firmy sklejają CSV z pól, które wpisuje użytkownik: nazwa
kosztu, opis wypłaty, imię pracownika. Wartość zaczynająca się od `=`, `+`, `-`,
`@`, tabulatora albo CR jest przez Excel i LibreOffice traktowana jak formuła —
klasyczna droga do `=HYPERLINK(...)` wyciekającego zawartość arkusza pod obcy
adres, a przy włączonym DDE do gorszych rzeczy. Ofiarą jest księgowa otwierająca
plik, nie autor wpisu.

Poprawka w `escapeField` (`src/lib/csv.ts`): groźny pierwszy znak jest poprzedzany
apostrofem, pole trafia w cudzysłów. Liczby składane przez `csvAmount` idą dalej
jak liczby, więc sumowanie w arkuszu działa.

### S-2. Identyfikator spoza formatu UUID szedł wprost do bazy — naprawione

`/podroze/cokolwiek`, `/pracownicy/cokolwiek` i `/udostepnione?t=cokolwiek`
trafiały ze stringiem wprost do kolumny typu `uuid`, gdzie Postgres odpowiada
błędem składni — czyli 500 zamiast 404, ślad w logach przy każdym żądaniu
i tania dźwignia do zasypania serwera. Wszystkie trzy wejścia sprawdzają teraz
kształt UUID i wracają odpowiednio `notFound()` albo ekranem „link nieaktywny".

Ustalone z lektury kodu i typów kolumn, bez zapytań do produkcyjnej bazy
(zasada 1). Po poprawce sprawdzone na zbudowanej aplikacji: `/udostepnione?t=abc`
odpowiada 200 z komunikatem o nieaktywnym linku, a nie błędem serwera.

### S-3. Zakres dat raportu przepuszczał daty nieistniejące — naprawione

`periodFromParams` sprawdzał tylko kształt `\d{4}-\d{2}-\d{2}`, więc
`/firma?od=2020-99-99&do=2021-99-99` szło do `new Date(...)` jako `Invalid Date`
i wywracało zapytanie Prismy. Ta sama dziura była w `pastDay` przy kosztach
i wypłatach. Dodana wspólna walidacja kalendarzowa (`isCalendarDay`).

### S-4. Brak nagłówków bezpieczeństwa — naprawione

Aplikacja nie wysyłała ani CSP, ani `X-Frame-Options`, ani `Referrer-Policy`.
Strona dawała się osadzić w cudzej ramce (clickjacking na przyciskach „usuń
konto" i „udostępnij"), a pełny adres z tokenem udostępnienia wyciekał
w `Referer` przy wyjściu na zewnątrz.

`next.config.ts` ustawia teraz: CSP (`frame-ancestors 'none'`, `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'`), `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`,
`Permissions-Policy` bez kamery, mikrofonu i geolokalizacji oraz HSTS na produkcji.
`/udostepnione` dostaje dodatkowo `X-Robots-Tag: noindex`. Nagłówki sprawdzone
na uruchomionym buildzie produkcyjnym.

CSP zostaje przy `script-src 'unsafe-inline'`, bo Next wstrzykuje własne skrypty
inline. Wariant z nonce wymaga pliku `proxy.ts` (dawne middleware) i osobnej
decyzji — opisane w „Do rozważenia".

### S-5. Nazwa firmy i pracownika lądowały wprost w nazwie pliku — naprawione

`Raport_${companyName}_...csv` — nazwa firmy jest dowolnym tekstem do 80 znaków,
więc ukośniki, cudzysłowy i znaki nowej linii szły prosto do atrybutu `download`.
Dodany `safeFileName` w `src/lib/print.ts` przycina to do znaków bezpiecznych.

## Niskie

### N-1. Usunięcie współwłaściciela mogło zamknąć mu własną firmę — naprawione

`removeCoOwnerAction` bezwarunkowo ustawiało `is_owner: false`. Jeśli ta osoba
w międzyczasie założyła własną firmę, traciła do niej dostęp (`requireOwner`
odsyła na pulpit), a odzyskać go nie mogła. Teraz flaga spada tylko wtedy, gdy
faktycznie nie zostaje jej żadna firma.

### N-2. Przyjęcie zaproszenia bez sprawdzenia stanu konta — naprawione

`acceptCoOwnerInviteAction` nie sprawdzało, czy zapraszany zdążył założyć własną
firmę albo jest już współwłaścicielem — `companyCoOwner.create` kończyło się
wtedy błędem unikalności i pustym 500 na ekranie. Dodane dwa czytelne komunikaty.

### N-3. Włączenie trybu właściciela przez współwłaściciela — naprawione

`setOwnerModeAction` zakładało nową firmę osobie, która była już współwłaścicielem
cudzej. Konto lądowało w dwóch rolach naraz, a `requireOwner` wybierało jedną
z nich zależnie od kolejności zapytań. Teraz akcja odmawia z komunikatem.

### N-4. Rejestracja potwierdza istnienie konta — pozostawione świadomie

„Konto z tym adresem e-mail już istnieje" to jawna enumeracja, ale bez wysyłki
e-maili nie ma jak tego obejść bez zepsucia rejestracji. Ryzyko ograniczone
przez limit prób z W-1.

### N-5. `must_change_password` jest tylko informacją — pozostawione świadomie

Flaga wyświetla baner w ustawieniach, ale niczego nie wymusza: hasło startowe
znane właścicielowi działa bezterminowo. Wymuszenie zmiany hasła to zmiana
przepływu logowania, a nie poprawka bezpieczeństwa przy okazji audytu.

### N-6. Właściciel może zresetować hasło pracownika — z założenia

`resetEmployeePasswordAction` pozwala właścicielowi nadać pracownikowi hasło
i tym samym wejść na jego konto, gdzie widać prywatne koszty. To wynika z modelu
(nie ma poczty, więc ktoś musi umieć odblokować konto), ale warto, żeby było
świadomą decyzją, a nie efektem ubocznym.

### N-7. `npm audit`: `deepmerge-ts` < 8.0.0 (wysokie) — naprawione

Podatność (wyczerpanie stosu przy scalaniu rekurencyjnych obiektów) siedziała
w `@prisma/config`, czyli w narzędziu CLI używanym przy migracjach i buildzie,
nie w kodzie serwującym ruch — `prisma` jest zależnością deweloperską, a wejście
do scalania to własny `prisma.config.ts`, nie dane od użytkownika. Ryzyko było
więc bliskie zeru, ale dało się je usunąć bez kompromisu.

Sprawdzone wersje: najnowsza stabilna Prisma to 7.10.0 (podbita z 7.9.1),
ale jej `@prisma/config` dalej ciągnie `deepmerge-ts@7.1.5`. Tag `latest` na npm
wskazuje 8.0.0-rc.12, czyli kandydata do wydania — do produkcji się nie nadaje,
choć warto odnotować, że linia 8 nie ma już `@prisma/config` w zależnościach.
Zamiast tego `overrides` w `package.json` wymusza `deepmerge-ts@^8.0.2`.
`@prisma/config` używa stamtąd wyłącznie funkcji `deepmerge` jako mergera dla
`c12`, więc wersja 8 podmienia się bez zmiany API. Po podmianie `prisma generate`,
`prisma validate` i `prisma migrate` działają, a `npm audit` pokazuje zero
podatności.

### N-8. Zrzut z bazy leży w katalogu roboczym — do decyzji właściciela

`work_entries_rates_2026-08-23.csv` zawiera dane osobowe. Jest w `.gitignore`
i nie trafił do repozytorium, ale nie ma powodu, żeby dalej leżał na dysku.
Nie kasuję cudzych danych — do usunięcia ręcznie.

## Sprawdzone, bez zastrzeżeń

- **SQL injection** — cały dostęp idzie przez Prismę z parametryzacją, w kodzie
  nie ma `$queryRaw` ani `$executeRaw`.
- **XSS** — nigdzie nie ma `dangerouslySetInnerHTML`, `innerHTML`, `eval`
  ani `new Function`; React escapuje wszystko sam.
- **CSRF** — server actions Next przyjmują wyłącznie POST i porównują `Origin`
  z `Host`, ciasteczko sesji jest `SameSite=Lax`.
- **IDOR** — każdy odczyt i zapis jest zawężony `user_id` albo `company_id`;
  `updateMany`/`deleteMany` z warunkiem właściciela zamiast `update` po samym
  identyfikatorze. `resolveTargetUser` sprawdza przynależność pracownika do firmy
  właściciela przed każdą zmianą jego godzin.
- **Hasła** — scrypt z 16-bajtową solą, porównanie `timingSafeEqual`.
- **Sesje** — token 32 bajty z `randomBytes`, w bazie tylko SHA-256, ciasteczko
  `httpOnly` + `SameSite=Lax` + `Secure` na produkcji, wygaszanie sprząta rekord,
  konto zanonimizowane traci wszystkie sesje.
- **Link publiczny** — token to UUID v4 z bazy, odczyt zawężony do jednej podróży
  i jednego właściciela, strona ma `robots: noindex`.
- **Sekrety** — `.env` nigdy nie był w gicie (sprawdzone `git log --all`),
  w kodzie nie ma zaszytych poświadczeń.
- **Kursy NBP** — kod waluty pochodzi z enuma, więc adres zapytania nie da się
  podstawić (brak SSRF), a brak odpowiedzi nie wywraca zapisu.

## Weryfikacja

Po komplecie poprawek: `npm run typecheck`, `npm run lint`, `npm test`
(81 testów, w tym nowe dla CSV i dat) oraz `npm run build` — wszystko przechodzi.
Zbudowana aplikacja odpalona lokalnie odsyła komplet nagłówków bezpieczeństwa,
a wcześniej wywrotne adresy odpowiadają poprawnie.

## Dopisane później: konto root

Panel administracyjny (`/root`) powstał po tym audycie. Założenia, które go
dotyczą, są zgodne z powyższymi ustaleniami:

- bramka `requireRoot()` po stronie serwera na każdym ekranie panelu, a nie samo
  ukrycie odnośników;
- root nie ma wglądu w kwoty — minimalizacja danych z RODO i zgodność z tym,
  co aplikacja obiecuje pracownikom;
- brak logowania się jako inny użytkownik;
- każda operacja w dzienniku `root_audit_log`, bez kasowania z panelu;
- odebranie dostępu rozszerzonego jest egzekwowane w `setOwnerModeAction`,
  a nie tylko wyszarzeniem przełącznika;
- konto root podlega temu samemu limitowi prób logowania co reszta.

## Do rozważenia poza tą sesją

1. CSP z nonce przez `proxy.ts` zamiast `unsafe-inline` (S-4).
2. Wymuszenie zmiany hasła startowego przy pierwszym logowaniu (N-5).
3. Sprzątanie wygasłych rekordów w `sessions` — dziś zostają do najbliższej
   próby użycia. Wzorzec jest już pod ręką: `auth_attempts` sprząta się przy
   okazji kolejnych prób.
4. Weryfikacja adresu e-mail, która odblokowałaby normalne odzyskiwanie hasła
   i pozwoliła zamknąć enumerację z N-4.
5. Przejście na Prismę 8, gdy wyjdzie stabilna — wtedy `overrides` dla
   `deepmerge-ts` będzie można usunąć, bo linia 8 nie ciągnie `@prisma/config`.
