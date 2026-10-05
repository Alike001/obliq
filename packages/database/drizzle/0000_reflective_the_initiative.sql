CREATE TYPE "public"."approval_state" AS ENUM('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'INVALIDATED');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('OWNER', 'FINANCE', 'APPROVER', 'SIGNER', 'ACCOUNTANT');--> statement-breakpoint
CREATE TYPE "public"."obligation_state" AS ENUM('DRAFT', 'UNDER_REVIEW', 'APPROVAL_REQUIRED', 'APPROVED', 'READY_TO_SETTLE', 'SETTLEMENT_PREPARED', 'SIGNING', 'BROADCAST', 'CONFIRMING', 'SETTLED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'BLOCKED', 'SETTLEMENT_FAILED', 'RECONCILIATION_EXCEPTION');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('ACTIVE', 'INACTIVE', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."settlement_state" AS ENUM('NOT_CREATED', 'PREPARED', 'AWAITING_SIGNATURE', 'SIGNED', 'BROADCAST', 'DETECTED', 'CONFIRMING', 'SETTLED', 'FAILED', 'UNAVAILABLE');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'SUPERSEDED');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" uuid,
	"event_type" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"previous_hash" text,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_disclosures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_package_id" uuid NOT NULL,
	"field_key" text NOT NULL,
	"disclosed_value_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"settlement_id" uuid,
	"status" text NOT NULL,
	"artifact_hash" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"role_or_actor" text NOT NULL,
	"threshold_group" text,
	"state" "approval_state" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"note" text,
	"obligation_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obligation_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"storage_ref" text,
	"content_hash" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obligations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vendor_id" uuid,
	"type" text NOT NULL,
	"reference" text NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"due_at" timestamp with time zone,
	"state" "obligation_state" DEFAULT 'DRAFT' NOT NULL,
	"source_id" uuid,
	"created_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"rule_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"result" text NOT NULL,
	"reasons_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"network" text NOT NULL,
	"receiver" text NOT NULL,
	"fingerprint" text NOT NULL,
	"verification_status" "verification_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"verified_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"legal_name" text NOT NULL,
	"display_name" text NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"settlement_id" uuid,
	"category" text NOT NULL,
	"fiat_currency" text NOT NULL,
	"fiat_amount_minor" bigint NOT NULL,
	"booked_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"state" "settlement_state" DEFAULT 'PREPARED' NOT NULL,
	"privacy_mode" text NOT NULL,
	"destination_id" uuid NOT NULL,
	"obligation_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"settlement_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"block_height" bigint,
	"confirmations" integer,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evidence_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"settlement_intent_id" uuid NOT NULL,
	"fiat_currency" text NOT NULL,
	"fiat_amount_minor" bigint NOT NULL,
	"zatoshi_amount" bigint NOT NULL,
	"source" text NOT NULL,
	"quoted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"intent_id" uuid NOT NULL,
	"state" "settlement_state" DEFAULT 'NOT_CREATED' NOT NULL,
	"tx_ref_private" text,
	"broadcast_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_disclosures" ADD CONSTRAINT "evidence_disclosures_evidence_package_id_evidence_packages_id_fk" FOREIGN KEY ("evidence_package_id") REFERENCES "public"."evidence_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD CONSTRAINT "evidence_packages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD CONSTRAINT "evidence_packages_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD CONSTRAINT "evidence_packages_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD CONSTRAINT "evidence_packages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requirements" ADD CONSTRAINT "approval_requirements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requirements" ADD CONSTRAINT "approval_requirements_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_sources" ADD CONSTRAINT "obligation_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_source_id_obligation_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."obligation_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_destinations" ADD CONSTRAINT "vendor_destinations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_destinations" ADD CONSTRAINT "vendor_destinations_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD CONSTRAINT "settlement_intents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD CONSTRAINT "settlement_intents_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_intents" ADD CONSTRAINT "settlement_intents_destination_id_vendor_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."vendor_destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD CONSTRAINT "settlement_observations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_observations" ADD CONSTRAINT "settlement_observations_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_quotes" ADD CONSTRAINT "settlement_quotes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_quotes" ADD CONSTRAINT "settlement_quotes_settlement_intent_id_settlement_intents_id_fk" FOREIGN KEY ("settlement_intent_id") REFERENCES "public"."settlement_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_intent_id_settlement_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."settlement_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_org_created_idx" ON "audit_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "evidence_packages_org_obligation_idx" ON "evidence_packages" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_unique" ON "memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "approval_requirements_org_obligation_idx" ON "approval_requirements" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE INDEX "approvals_org_obligation_idx" ON "approvals" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE INDEX "obligation_sources_org_idx" ON "obligation_sources" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "obligations_org_state_idx" ON "obligations" USING btree ("organization_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "obligations_org_reference_unique" ON "obligations" USING btree ("organization_id","reference");--> statement-breakpoint
CREATE INDEX "policies_org_idx" ON "policies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "policy_decisions_org_obligation_idx" ON "policy_decisions" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE INDEX "destinations_org_vendor_idx" ON "vendor_destinations" USING btree ("organization_id","vendor_id");--> statement-breakpoint
CREATE INDEX "vendors_org_idx" ON "vendors" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_org_obligation_idx" ON "ledger_entries" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE INDEX "settlement_intents_org_obligation_idx" ON "settlement_intents" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE INDEX "settlement_observations_org_settlement_idx" ON "settlement_observations" USING btree ("organization_id","settlement_id");--> statement-breakpoint
CREATE INDEX "settlement_quotes_org_intent_idx" ON "settlement_quotes" USING btree ("organization_id","settlement_intent_id");--> statement-breakpoint
CREATE INDEX "settlements_org_obligation_idx" ON "settlements" USING btree ("organization_id","obligation_id");