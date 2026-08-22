-- Logowanie przechodzi z nazwy użytkownika na adres e-mail, a imię i nazwisko
-- zastępuje jedno pole `name` (Imię/Pseudonim).
--
-- Kolumny dokładamy najpierw jako opcjonalne i wypełniamy z dotychczasowych
-- danych, żeby istniejące konta przetrwały migrację:
--   * e-mail: zastępczy adres <nazwa>@brak-adresu.local — właściciel konta
--     podmienia go w Ustawieniach (logowanie działa od razu tym adresem),
--   * nazwa: imię i nazwisko, a gdy puste — dotychczasowa nazwa użytkownika.

ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "name" TEXT;

UPDATE "users"
SET "email" = lower("username") || '@brak-adresu.local',
    "name" = COALESCE(
      NULLIF(TRIM(COALESCE("first_name", '') || ' ' || COALESCE("last_name", '')), ''),
      "username"
    );

ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

DROP INDEX IF EXISTS "users_username_key";
ALTER TABLE "users" DROP COLUMN "username";
ALTER TABLE "users" DROP COLUMN "first_name";
ALTER TABLE "users" DROP COLUMN "last_name";
