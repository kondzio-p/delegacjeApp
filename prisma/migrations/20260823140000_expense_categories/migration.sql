-- Własne kategorie kosztów zamiast sztywnej czwórki w kodzie.
-- Kategoria w tabeli expenses jest tekstem, nie kluczem obcym, więc usunięcie
-- pozycji z listy nie rusza istniejących wpisów i nie wymaga migracji danych.
ALTER TABLE "users"
  ADD COLUMN "expense_categories" TEXT[] NOT NULL
  DEFAULT ARRAY['Paliwo', 'Jedzenie', 'Zakwaterowanie', 'Inne']::TEXT[];
