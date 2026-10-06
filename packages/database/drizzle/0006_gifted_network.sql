CREATE TABLE "settlement_observation_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"network" text NOT NULL,
	"receiver_fingerprint" text NOT NULL,
	"memo_reference_hash" text NOT NULL,
	"expected_amount_zat" bigint NOT NULL,
	"required_confirmations" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zcash_observer_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"network" text NOT NULL,
	"availability" text NOT NULL,
	"chain_tip_height" bigint,
	"fully_scanned_height" bigint,
	"reason_code" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settlement_observations" ALTER COLUMN "settlement_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ALTER COLUMN "confirmations" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "obligation_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "target_id" uuid;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "network" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "txid" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "output_index" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "pool" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "observer_source" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "observed_amount_zat" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "memo_reference_hash" text;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "receiver_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "correlation_status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "state" text NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "reasons_json" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD COLUMN "first_observed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_observation_targets" ADD CONSTRAINT "settlement_observation_targets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_observation_targets" ADD CONSTRAINT "settlement_observation_targets_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zcash_observer_statuses" ADD CONSTRAINT "zcash_observer_statuses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "observation_targets_org_obligation_unique" ON "settlement_observation_targets" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "observation_targets_org_receiver_unique" ON "settlement_observation_targets" USING btree ("organization_id","network","receiver_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "zcash_observer_statuses_org_network_unique" ON "zcash_observer_statuses" USING btree ("organization_id","network");--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD CONSTRAINT "settlement_observations_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD CONSTRAINT "settlement_observations_target_id_settlement_observation_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."settlement_observation_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "settlement_observations_org_obligation_idx" ON "settlement_observations" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_observations_chain_output_unique" ON "settlement_observations" USING btree ("organization_id","network","txid","pool","output_index");--> statement-breakpoint
ALTER TABLE "settlement_observations" DROP COLUMN "kind";
