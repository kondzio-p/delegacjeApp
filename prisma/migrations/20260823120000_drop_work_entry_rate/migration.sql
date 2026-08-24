-- Godziny przestają nieść pieniądze: stawka i jej waluta znikają z work_entries.
-- Od tej pory kwoty mieszkają wyłącznie w expenses i payouts, a wpis godzin jest
-- czystym zapisem czasu.
--
-- UWAGA: operacja nieodwracalna. Przed uruchomieniem zrzuć kolumny do pliku:
--   node --env-file=.env ./dump-rates.mjs
ALTER TABLE "work_entries" DROP COLUMN "rate";
ALTER TABLE "work_entries" DROP COLUMN "rate_currency";
