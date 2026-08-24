-- Kurs NBP zamrożony przy każdej kwocie: ile PLN za jednostkę waluty wiersza
-- w dniu tego wiersza. Dzięki temu suma za marzec wygląda tak samo w czerwcu.
--
-- Kolumny są nullowalne: istniejące wpisy nie mają zapisanego kursu, a nowe
-- dostaną null, jeśli NBP akurat nie odpowie. Odczyt sięga wtedy po kurs bieżący.
ALTER TABLE "expenses" ADD COLUMN "nbp_rate" DECIMAL(12,6);
ALTER TABLE "expenses" ADD COLUMN "nbp_rate_date" VARCHAR(10);

ALTER TABLE "payouts" ADD COLUMN "nbp_rate" DECIMAL(12,6);
ALTER TABLE "payouts" ADD COLUMN "nbp_rate_date" VARCHAR(10);
