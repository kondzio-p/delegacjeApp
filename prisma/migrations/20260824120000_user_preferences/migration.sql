-- Preferencje użytkownika przenoszą się z przeglądarki do bazy.
--
-- Waluta wyświetlania siedziała w localStorage, a język w ciasteczku — jedno
-- i drugie znikało przy czyszczeniu przeglądarki i nie szło za użytkownikiem
-- na inne urządzenie. Obie kolumny mają wartość domyślną, więc istniejące
-- wiersze przechodzą bez ruszania danych.
ALTER TABLE "users" ADD COLUMN "display_currency" VARCHAR(3) NOT NULL DEFAULT 'PLN';
ALTER TABLE "users" ADD COLUMN "locale" VARCHAR(5) NOT NULL DEFAULT 'pl';
