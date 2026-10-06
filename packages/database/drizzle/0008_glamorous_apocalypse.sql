ALTER TYPE "public"."settlement_state" ADD VALUE 'MISMATCH' BEFORE 'EXPIRED';--> statement-breakpoint
DROP INDEX "observation_targets_org_obligation_unique";--> statement-breakpoint
DROP INDEX "observation_targets_org_receiver_unique";--> statement-breakpoint
CREATE INDEX "observation_targets_org_obligation_idx" ON "settlement_observation_targets" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE INDEX "observation_targets_org_receiver_idx" ON "settlement_observation_targets" USING btree ("organization_id","network","receiver_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "observation_targets_org_settlement_unique" ON "settlement_observation_targets" USING btree ("organization_id","settlement_id");