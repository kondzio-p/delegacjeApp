# Godzio

Godziny pracy i wypłaty dla pracujących za granicą: ile przepracowane, ile wypłacone,
ile poszło na koszty i co z tego realnie zostaje. Dodatkowo tryb właściciela firmy
z podglądem godzin i wypłat pracowników.

Next.js 16 (App Router) + Prisma 7 + Prisma Postgres. Bez Supabase, bez Lovable,
bez żadnej zewnętrznej usługi poza bazą danych.

---

## Co musisz mieć

| Rzecz | Po co | Koszt |
|---|---|---|
| Konto na [console.prisma.io](https://console.prisma.io) | baza danych (Prisma Postgres) | darmowy plan wystarcza |
| Konto na [vercel.com](https://vercel.com) | hosting | darmowy plan (Hobby) |
| Konto GitHub | Vercel buduje aplikację z repozytorium | darmowe |
| Node.js 20+ | uruchomienie lokalnie | — |

Nie potrzeba: serwera pocztowego, domeny, SMS-ów ani płatnych usług.
Odzyskiwanie hasła działa na kodzie odzyskiwania i na resecie przez właściciela firmy.

---

## Krok po kroku

### 1. Załóż bazę danych

1. Wejdź na [console.prisma.io](https://console.prisma.io) i zaloguj się.
2. **New project** → wybierz **Prisma Postgres** i region (np. Frankfurt / `eu-central-1`).
3. Po utworzeniu projektu otwórz **Database → Connect** i skopiuj connection string
   (zaczyna się od `postgres://`). Zapisz go — pokazuje się raz.

### 2. Wpisz connection string

W pliku `.env` w katalogu projektu:

```
DATABASE_URL="postgres://...twój connection string..."
```

Plik `.env` jest w `.gitignore` — nie trafi do repozytorium. Wzór: `.env.example`.

### 3. Uruchom lokalnie

```bash
npm install        # instaluje zależności i generuje klienta Prisma
npm run db:deploy  # zakłada tabele w bazie (jednorazowo)
npm run dev        # http://localhost:3000
```

### 4. Pierwsze uruchomienie w przeglądarce

1. **Rejestracja** — e-mail, Imię/Pseudonim i hasło (dwa razy).
   Adres e-mail służy na razie wyłącznie do logowania — nic na niego nie wysyłamy
   i nie trzeba go potwierdzać.
2. Zapisz **kod odzyskiwania**, który pokaże się po założeniu konta.
   To jedyny sposób odzyskania konta po zapomnieniu hasła — nie da się go później podejrzeć.
3. Po zalogowaniu zobaczysz ekran powitalny **„Witaj, [Imię]"** i przejdziesz na dashboard.
   Imię jest też cały czas widoczne w górnym pasku i w menu.
4. Dodaj podróż, godziny pracy, koszt i wypłatę. Dashboard od razu pokaże trzy sekcje.

### 5. Firma i pracownicy

**Właściciel:**
1. **Ustawienia → Firma** → włącz *Jestem właścicielem firmy* → wpisz nazwę firmy → **Zapisz firmę**.
2. W menu pojawia się zakładka **Pracownicy**.
3. Podaj pracownikom dokładną nazwę firmy.

**Pracownik:**
1. Zakłada własne konto (e-mail + Imię/Pseudonim).
2. **Ustawienia → Firma → Pracuję w firmie** → wpisuje nazwę → **Wyślij prośbę**.
   (Wielkość liter nie ma znaczenia.)

**Właściciel** widzi prośbę na górze zakładki Pracownicy i klika **Akceptuj**.
Od tej chwili widzi kartę pracownika (imię, e-mail, godziny w tym miesiącu,
status wyjazdu, ostatni wpis), a po wejściu w kartę — pełne zestawienie godzin z filtrem miesiąca,
podziałem na wyjazdy, edycją wpisów, eksportem PDF i resetem hasła.

Właściciel widzi godziny pracy i **wypłaty** pracownika — te ostatnie sam wypłacił.
**Nie widzi** kosztów, które pracownik ponosi z własnej kieszeni.

### 6. Wrzucenie na Vercela

```bash
git init
git add .
git commit -m "Godzio - pierwsza wersja"
git branch -M main
git remote add origin https://github.com/TWOJ_LOGIN/godzio.git
git push -u origin main
```

Następnie na [vercel.com](https://vercel.com):

1. **Add New… → Project** → wybierz repozytorium z GitHuba.
2. Framework zostanie wykryty jako **Next.js** — nic nie zmieniaj w ustawieniach builda.
3. W **Environment Variables** dodaj `DATABASE_URL` z tą samą wartością co w `.env`
   (zaznacz Production, Preview i Development).
   Po podpięciu własnej domeny dodaj jeszcze `NEXT_PUBLIC_SITE_URL` z jej adresem.
   Bez tego podgląd linku wskaże domenę `*.vercel.app` — zadziała, ale będzie
   pokazywał nie ten adres co trzeba.

Jeśli podgląd linku w Messengerze albo na Facebooku jest pusty:

1. Sprawdź w źródle strony, czy `og:image` wskazuje na tę samą domenę, pod którą
   wchodzisz. Aplikacja bierze adres z bieżącego żądania, więc powinien się
   zgadzać — chyba że `NEXT_PUBLIC_SITE_URL` wskazuje gdzie indziej. Obrazek
   z martwej domeny jest dla Facebooka tym samym co brak obrazka.
2. Sprawdź, czy w projekcie na Vercelu nie jest włączona **Deployment Protection**.
   Przy niej robot dostaje stronę logowania Vercela zamiast aplikacji i pokazuje
   jego logo zamiast naszego.
3. Facebook trzyma podgląd w pamięci. Po poprawce wrzuć adres do
   [debuggera](https://developers.facebook.com/tools/debug/) i kliknij **Scrape Again**.
4. **Deploy**.

Migracje odpalasz z własnego komputera — łączą się z tą samą bazą, więc wystarczy
raz po każdej zmianie schematu.

**Uwaga do migracji.** Instancja Prisma Postgres na darmowym planie usypia, a jej
wybudzenie potrafi zająć od kilkunastu sekund do kilku minut. Silnik migracji Prismy
ma własny, krótki limit połączenia i zwykle kończy się wtedy błędem `P1001`, mimo że
sama baza działa (zwykły klient `pg` łączy się bez problemu, tylko po kilku próbach).

Gdy `npm run db:deploy` uparcie zwraca `P1001`, użyj:

```bash
node --env-file=.env ./apply-migration-pg.mjs
```

Skrypt dobija się do bazy z ponawianiem, wykonuje ten sam SQL i sam dopisuje wpis do
`_prisma_migrations`. Zanim cokolwiek ruszy, sprawdza algorytm sumy kontrolnej na już
zastosowanych migracjach i przerywa przy niezgodności, więc historia Prismy zostaje
spójna. Jest idempotentny — zastosowane migracje pomija.

---

## Skrypty

| Komenda | Działanie |
|---|---|
| `npm run dev` | serwer deweloperski |
| `npm run build` | build produkcyjny (generuje też klienta Prisma) |
| `npm start` | uruchomienie zbudowanej aplikacji |
| `npm run db:migrate` | nowa migracja po zmianie `prisma/schema.prisma` |
| `npm run db:deploy` | zastosowanie migracji — patrz uwaga niżej |
| `node --env-file=.env ./apply-migration-pg.mjs` | zastosowanie migracji, gdy `db:deploy` nie daje rady |
| `npm run db:studio` | podgląd danych w przeglądarce |
| `node scripts/make-images.mjs` | przegenerowanie ikon i obrazka Open Graph z `assets/logo-source.png` |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

---

## Jak to jest zbudowane

```
prisma/schema.prisma       model danych (users, companies, join_requests, sessions,
                           auth_attempts, trips, work_entries, expenses, payouts)
src/lib/auth.ts            hasła (scrypt), kod odzyskiwania, sesje w ciasteczku
src/lib/session.ts         bramki dostępu: requireUser / requireOwner / findMyEmployee
src/lib/db.ts              klient Prisma (adapter node-postgres)
src/lib/queries.ts         odczyty dla server components
src/lib/actions/           zapisy: auth.ts, company.ts, data.ts
src/lib/rate-limit.ts      limit prób logowania, odzyskiwania i rejestracji
                           (licznik w tabeli auth_attempts)
src/lib/trip-summary.ts    liczenie podsumowań i realnych stawek godzinowych
src/app/(app)/             ekrany po zalogowaniu
src/app/udostepnione/      publiczny podgląd wyjazdu spod linku
src/app/not-found.tsx      ekran 404 wracający po trzech sekundach tam, skąd
                           użytkownik przyszedł
```

**Bezpieczeństwo.** `safetyplan.md` opisuje zakres i wyniki audytu: co zostało
sprawdzone, co poprawione i co świadomie zostawione. Nagłówki bezpieczeństwa
(CSP, HSTS, `frame-ancestors`) ustawia `next.config.ts`.

**Logo i ikony.** Źródłem jest `assets/logo-source.png` — PNG z kanałem alfa.
`assets/logo.svg` jest zapasem: to nie wektor, tylko ten sam rysunek opakowany
w maskę przezroczystości, więc alfę trzeba z niego odtwarzać z luminancji.
Oba leżą poza `public/`, więc nie trafiają na serwer.

`node scripts/make-images.mjs` robi z nich favicon, ikonę Apple, ikony do
manifestu, znak na ekran logowania oraz kartę Open Graph 1200×630. Skrypt sam
znajduje treść logo i przycina tło, a na ikony bierze wyłącznie znak bez napisu —
w tej skali napis i tak byłby nieczytelny. Po podmianie logo uruchom go ponownie.

Przezroczyste zostaje tylko `logo-mark.png`, czyli znak w interfejsie: leży
na jasnym tle aplikacji, więc przezroczystość jest tam dokładnie tym, czego trzeba.
Ikony i karty OG dostają białe tło, bo iOS podkłada pod ikonę czerń, launchery
i paski kart bywają ciemne, a karty w komunikatorach renderują się zależnie
od motywu odbiorcy — a logo jest ciemne i na ciemnym tle by zniknęło.

Favicon i `icon.png` dostają do tego zaokrąglone rogi: kartę przeglądarki rysuje
sama przeglądarka, bez żadnej maski, więc białe tło zostaje w niej dokładnie
takim kwadratem, jakim je zapiszemy. Ikona Apple i ikony manifestu zostają
kanciaste — iOS i launchery Androida nakładają własną maskę, pod którą
zaokrąglone rogi zrobiłyby dziury.

Tarcza zegara jest w źródle przezroczysta, nie biała, i nie da się tego rozróżnić
programowo: łączy się z tłem przez otwarcie w literze G, więc żaden algorytm nie
odróżni jej od tła. Na jasnym tle wygląda dokładnie tak, jak powinna. Gdyby logo
miało kiedyś działać na ciemnym, tarcza musi być w źródle osobnym białym kształtem.

**Bezpieczeństwo danych.** Każde zapytanie jest zawężone do `user_id` z sesji,
a zapisy idą przez `updateMany` / `deleteMany` z warunkiem właściciela — cudzego
wiersza nie da się odczytać ani zmienić nawet spreparowanym żądaniem. Właściciel
firmy dostaje się do godzin pracownika wyłącznie przez sprawdzenie, że pracownik
należy do jego firmy.

**Hasła i kody** trzymane są jako `scrypt` z losową solą, tokeny sesji jako SHA-256.

---

## Migracja ze starszej wersji (logowanie na nazwę użytkownika)

Jeśli masz konta założone przed przejściem na e-mail, `npm run db:deploy` przeniesie
je automatycznie:

- e-mail zostaje ustawiony na zastępczy `nazwa-uzytkownika@brak-adresu.local`
  (tym adresem można się od razu zalogować),
- imię bierze się z dotychczasowego imienia i nazwiska, a gdy były puste —
  z nazwy użytkownika.

Po pierwszym zalogowaniu wejdź w **Ustawienia → Konto** i wpisz prawdziwy adres.

---

## Ograniczenia, o których warto wiedzieć

- Adres e-mail nie jest weryfikowany i **nic na niego nie wychodzi** — to na razie
  tylko login. Dopóki tak zostanie, jedyną drogą odzyskania konta jest **kod
  odzyskiwania** albo reset hasła przez właściciela firmy. Kto zgubi kod i nie
  należy do firmy — nie odzyska dostępu.
- Nazwa firmy jest unikalna w całej aplikacji (bez rozróżniania wielkości liter).
- Wyłączenie trybu właściciela kasuje firmę i odpina od niej pracowników.
  Ich konta, godziny i finanse zostają nietknięte.
- Waluta wyświetlania i język są zapisane na koncie, nie w przeglądarce —
  idą za użytkownikiem na każde urządzenie i przeżywają wyczyszczenie danych.
  Ciasteczko języka jest wyłącznie nośnikiem dla pierwszego renderu i dla
  ekranu logowania, gdzie sesji jeszcze nie ma.
- Kursu nikt nie ustawia ręcznie: pochodzi z NBP i jest zamrażany przy każdym
  koszcie i każdej wypłacie, więc podsumowanie za miniony miesiąc nie zmienia
  się wraz z kursem dnia.
- Limit prób logowania liczy się w tabeli `auth_attempts`, więc obowiązuje
  wspólnie na wszystkich instancjach. Gdyby baza nie odpowiadała, licznik
  spada na zapasowy w pamięci procesu — słabszy, ale logowanie nie zostaje
  wtedy zupełnie bez ochrony. Wiersze starsze niż dwie godziny sprzątają się
  same przy okazji kolejnych prób.
