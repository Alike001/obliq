DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "settlement_intents")
		OR EXISTS (SELECT 1 FROM "settlement_quotes")
		OR EXISTS (SELECT 1 FROM "settlements") THEN
		RAISE EXCEPTION 'Phase 4 migration requires an explicit legacy settlement-record migration; Phase 3 had no executable settlement write path';
	END IF;
END $$;--> statement-breakpoint
ALTER TYPE "public"."settlement_state" ADD VALUE 'BROADCAST_UNKNOWN' BEFORE 'DETECTED';--> statement-breakpoint
ALTER TYPE "public"."settlement_state" ADD VALUE 'EXPIRED' BEFORE 'FAILED';--> statement-breakpoint
ALTER TYPE "public"."settlement_state" ADD VALUE 'INVALIDATED' BEFORE 'FAILED';--> statement-breakpoint
ALTER TYPE "public"."settlement_state" ADD VALUE 'SIGNING_REJECTED' BEFORE 'FAILED';--> statement-breakpoint
ALTER TABLE "settlement_quotes" DROP CONSTRAINT "settlement_quotes_settlement_intent_id_settlement_intents_id_fk";
--> statement-breakpoint
DROP INDEX "settlement_quotes_org_intent_idx";--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "quote_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "policy_decision_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "vendor_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "destination_receiver" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "business_currency" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "business_amount_minor" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "zatoshi_amount" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "quote_source" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "quoted_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "quote_expires_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "network" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "memo_reference_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "payment_request_uri" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "intent_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "intent_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "prepared_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "invalidated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD COLUMN "invalidation_reason" text;--> statement-breakpoint
ALTER TABLE "settlement_observation_targets" ADD COLUMN "settlement_id" uuid;--> statement-breakpoint
ALTER TABLE "settlement_observation_targets" ADD COLUMN "intent_id" uuid;--> statement-breakpoint
ALTER TABLE "settlement_quotes" ADD COLUMN "obligation_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_quotes" ADD COLUMN "obligation_version" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_quotes" ADD COLUMN "business_currency" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_quotes" ADD COLUMN "business_amount_minor" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_quotes" ADD COLUMN "source_kind" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_quotes" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_quotes" ADD COLUMN "idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_quotes" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "intent_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "signer_request_id" text;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "signer_type" text;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "signer_version" text;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "signed_tx_hash" text;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "broadcast_request_id" text;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "error_code" text;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "detected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD CONSTRAINT "settlement_intents_quote_id_settlement_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."settlement_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD CONSTRAINT "settlement_intents_policy_decision_id_policy_decisions_id_fk" FOREIGN KEY ("policy_decision_id") REFERENCES "public"."policy_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD CONSTRAINT "settlement_intents_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD CONSTRAINT "settlement_intents_prepared_by_users_id_fk" FOREIGN KEY ("prepared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_observation_targets" ADD CONSTRAINT "settlement_observation_targets_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_observation_targets" ADD CONSTRAINT "settlement_observation_targets_intent_id_settlement_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."settlement_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_quotes" ADD CONSTRAINT "settlement_quotes_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_quotes" ADD CONSTRAINT "settlement_quotes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_intents_org_quote_unique" ON "settlement_intents" USING btree ("organization_id","quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_intents_org_hash_unique" ON "settlement_intents" USING btree ("organization_id","intent_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_intents_org_idempotency_unique" ON "settlement_intents" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "settlement_quotes_org_obligation_idx" ON "settlement_quotes" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_quotes_org_idempotency_unique" ON "settlement_quotes" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "settlements_org_intent_unique" ON "settlements" USING btree ("organization_id","intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlements_org_signer_request_unique" ON "settlements" USING btree ("organization_id","signer_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlements_org_broadcast_request_unique" ON "settlements" USING btree ("organization_id","broadcast_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlements_org_txref_unique" ON "settlements" USING btree ("organization_id","tx_ref_private");--> statement-breakpoint
ALTER TABLE "settlement_quotes" DROP COLUMN "settlement_intent_id";--> statement-breakpoint
ALTER TABLE "settlement_quotes" DROP COLUMN "fiat_currency";--> statement-breakpoint
ALTER TABLE "settlement_quotes" DROP COLUMN "fiat_amount_minor";
