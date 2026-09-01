-- Konto root: administracja kontami i firmami.
--
-- `can_own_company` domyślnie true, więc istniejące konta zachowują dostęp
-- do trybu właściciela — root może go odebrać, ale nikomu nie znika sam z siebie.
-- `is_blocked` jest odwracalne i nie rusza danych, w odróżnieniu od anonimizacji.
ALTER TABLE "users" ADD COLUMN "is_root" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "can_own_company" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "is_blocked" BOOLEAN NOT NULL DEFAULT false;

-- Dziennik działań roota. Bez kluczy obcych: wpis ma przeżyć rozwiązanie firmy
-- i anonimizację konta, których dotyczył.
CREATE TABLE "root_audit_log" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "target_id" UUID,
    "target_label" VARCHAR(200),
    "detail" VARCHAR(300),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "root_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "root_audit_log_created_at_idx" ON "root_audit_log"("created_at");
