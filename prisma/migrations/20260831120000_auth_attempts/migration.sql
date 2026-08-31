-- Licznik prób logowania przenosi się z pamięci procesu do bazy.
--
-- W pamięci działał tylko na jednej instancji: przy kilku naraz każda liczyła
-- po swojemu, więc limit dawało się obejść zwykłym ponawianiem żądań. Jeden
-- wiersz to jedna próba — okno przesuwne wychodzi wtedy ze zwykłego COUNT-a,
-- a równoległe żądania nie nadpisują sobie licznika.
--
-- Indeks po (scope, subject, created_at) obsługuje liczenie prób w oknie,
-- a osobny po created_at — sprzątanie starych wierszy.
CREATE TABLE "auth_attempts" (
    "id" UUID NOT NULL,
    "scope" VARCHAR(20) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_attempts_scope_subject_created_at_idx" ON "auth_attempts"("scope", "subject", "created_at");

CREATE INDEX "auth_attempts_created_at_idx" ON "auth_attempts"("created_at");
