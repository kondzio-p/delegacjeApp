-- Współwłaściciele firmy oraz znacznik zanonimizowanego konta.

-- Konto usunięte na żądanie: dane osobowe znikają, ale godziny i wypłaty
-- zostają, bo to zapis rozliczenia z firmą. Flaga blokuje logowanie.
ALTER TABLE "users" ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- Założyciel zostaje w companies.owner_id; ta tabela dokłada pozostałych.
CREATE TABLE "company_co_owners" (
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_co_owners_pkey" PRIMARY KEY ("company_id", "user_id")
);

-- Zaproszenie czeka na akceptację — bez niej zaproszony nie ma dostępu.
CREATE TABLE "co_owner_invites" (
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "co_owner_invites_pkey" PRIMARY KEY ("company_id", "user_id")
);

CREATE INDEX "company_co_owners_user_id_idx" ON "company_co_owners"("user_id");
CREATE INDEX "co_owner_invites_user_id_idx" ON "co_owner_invites"("user_id");

ALTER TABLE "company_co_owners" ADD CONSTRAINT "company_co_owners_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_co_owners" ADD CONSTRAINT "company_co_owners_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "co_owner_invites" ADD CONSTRAINT "co_owner_invites_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "co_owner_invites" ADD CONSTRAINT "co_owner_invites_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
