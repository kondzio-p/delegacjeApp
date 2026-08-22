# Delegacje

Rozliczanie delegacji zagranicznych: godziny pracy, koszty, wypłaty i realny zysk.
Dodatkowo tryb właściciela firmy z podglądem godzin pracowników.

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

1. **Rejestracja** — nazwa użytkownika + hasło (dwa razy).
2. Zapisz **kod odzyskiwania**, który pokaże się po założeniu konta.
   To jedyny sposób odzyskania konta po zapomnieniu hasła — nie da się go później podejrzeć.
3. **Ustawienia → Konto** — uzupełnij imię i nazwisko (widzi je właściciel firmy).
4. Dodaj podróż, godziny pracy, koszt i wypłatę. Dashboard od razu pokaże trzy sekcje.

### 5. Firma i pracownicy

**Właściciel:**
1. **Ustawienia → Firma** → włącz *Jestem właścicielem firmy* → wpisz nazwę firmy → **Zapisz firmę**.
2. W menu pojawia się zakładka **Pracownicy**.
3. Podaj pracownikom dokładną nazwę firmy.

**Pracownik:**
1. Zakłada własne konto.
2. **Ustawienia → Firma → Pracuję w firmie** → wpisuje nazwę → **Wyślij prośbę**.
   (Wielkość liter nie ma znaczenia.)

**Właściciel** widzi prośbę na górze zakładki Pracownicy i klika **Akceptuj**.
Od tej chwili widzi kartę pracownika (godziny w tym miesiącu, status delegacji,
ostatni wpis), a po wejściu w kartę — pełne zestawienie godzin z filtrem miesiąca,
podziałem na delegacje, edycją wpisów, eksportem PDF i resetem hasła.

Właściciel **nie widzi** kosztów ani wypłat pracownika.

### 6. Wrzucenie na Vercela

```bash
git init
git add .
git commit -m "Delegacje - pierwsza wersja"
git branch -M main
git remote add origin https://github.com/TWOJ_LOGIN/delegacje.git
git push -u origin main
```

Następnie na [vercel.com](https://vercel.com):

1. **Add New… → Project** → wybierz repozytorium z GitHuba.
2. Framework zostanie wykryty jako **Next.js** — nic nie zmieniaj w ustawieniach builda.
3. W **Environment Variables** dodaj `DATABASE_URL` z tą samą wartością co w `.env`
   (zaznacz Production, Preview i Development).
4. **Deploy**.

Migracje odpalasz z własnego komputera (`npm run db:deploy`) — łączą się z tą samą
bazą, więc wystarczy raz po każdej zmianie schematu.

---

## Skrypty

| Komenda | Działanie |
|---|---|
| `npm run dev` | serwer deweloperski |
| `npm run build` | build produkcyjny (generuje też klienta Prisma) |
| `npm start` | uruchomienie zbudowanej aplikacji |
| `npm run db:migrate` | nowa migracja po zmianie `prisma/schema.prisma` |
| `npm run db:deploy` | zastosowanie istniejących migracji na bazie |
| `npm run db:studio` | podgląd danych w przeglądarce |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

---

## Jak to jest zbudowane

```
prisma/schema.prisma       model danych (users, companies, join_requests, sessions,
                           trips, work_entries, expenses, payouts)
src/lib/auth.ts            hasła (scrypt), kod odzyskiwania, sesje w ciasteczku
src/lib/session.ts         bramki dostępu: requireUser / requireOwner / findMyEmployee
src/lib/db.ts              klient Prisma (adapter node-postgres)
src/lib/queries.ts         odczyty dla server components
src/lib/actions/           zapisy: auth.ts, company.ts, data.ts
src/lib/trip-summary.ts    liczenie podsumowań i porównania zarobków
src/app/(app)/             ekrany po zalogowaniu
src/app/udostepnione/      publiczny podgląd delegacji spod linku
```

**Bezpieczeństwo danych.** Każde zapytanie jest zawężone do `user_id` z sesji,
a zapisy idą przez `updateMany` / `deleteMany` z warunkiem właściciela — cudzego
wiersza nie da się odczytać ani zmienić nawet spreparowanym żądaniem. Właściciel
firmy dostaje się do godzin pracownika wyłącznie przez sprawdzenie, że pracownik
należy do jego firmy.

**Hasła i kody** trzymane są jako `scrypt` z losową solą, tokeny sesji jako SHA-256.

---

## Ograniczenia, o których warto wiedzieć

- Bez adresu e-mail jedyną drogą odzyskania konta jest **kod odzyskiwania** albo
  reset hasła przez właściciela firmy. Kto zgubi kod i nie należy do firmy —
  nie odzyska dostępu.
- Nazwa firmy jest unikalna w całej aplikacji (bez rozróżniania wielkości liter).
- Wyłączenie trybu właściciela kasuje firmę i odpina od niej pracowników.
  Ich konta, godziny i finanse zostają nietknięte.
- Kurs EUR/PLN i wybrana waluta są zapisane w przeglądarce, nie w bazie —
  każde urządzenie ma własne ustawienie.
