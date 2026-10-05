CREATE TYPE "public"."approval_decision" AS ENUM('APPROVE', 'REJECT');--> statement-breakpoint
CREATE TYPE "public"."control_finding_outcome" AS ENUM('PASS', 'BLOCK', 'REQUIRE_APPROVAL');--> statement-breakpoint
CREATE TYPE "public"."duplicate_resolution_status" AS ENUM('OPEN', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."policy_decision_result" AS ENUM('BLOCKED', 'APPROVAL_REQUIRED');--> statement-breakpoint
CREATE TYPE "public"."readiness_result" AS ENUM('READY', 'NOT_READY');--> statement-breakpoint
ALTER TYPE "public"."membership_role" ADD VALUE 'TREASURY';--> statement-breakpoint
ALTER TYPE "public"."membership_role" ADD VALUE 'CFO';--> statement-breakpoint
ALTER TYPE "public"."membership_role" ADD VALUE 'POLICY_ADMIN';--> statement-breakpoint
ALTER TYPE "public"."verification_status" ADD VALUE 'VERIFIED_MANUALLY' BEFORE 'SUPERSEDED';--> statement-breakpoint
CREATE TABLE "control_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"policy_decision_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"code" text NOT NULL,
	"outcome" "control_finding_outcome" NOT NULL,
	"message" text NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"config_json" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_readiness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"obligation_version" integer NOT NULL,
	"policy_decision_id" uuid NOT NULL,
	"destination_id" uuid,
	"result" "readiness_result" NOT NULL,
	"reasons_json" jsonb NOT NULL,
	"evaluated_by" uuid NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "policy_decisions" DROP CONSTRAINT "policy_decisions_policy_id_policies_id_fk";
--> statement-breakpoint
ALTER TABLE "approvals" ALTER COLUMN "decision" SET DATA TYPE "public"."approval_decision" USING "decision"::"public"."approval_decision";--> statement-breakpoint
ALTER TABLE "policy_decisions" ALTER COLUMN "result" SET DATA TYPE "public"."policy_decision_result" USING "result"::"public"."policy_decision_result";--> statement-breakpoint
ALTER TABLE "approval_requirements" ADD COLUMN "policy_decision_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "approval_requirements" ADD COLUMN "obligation_version" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "approval_requirements" ADD COLUMN "role" text NOT NULL;--> statement-breakpoint
ALTER TABLE "approval_requirements" ADD COLUMN "required_count" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "approval_requirements" ADD COLUMN "approved_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "approval_requirements" ADD COLUMN "prohibit_creator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "approval_requirements" ADD COLUMN "reason" text NOT NULL;--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "requirement_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "policy_decision_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "capacity_role" text NOT NULL;--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "invalidated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "invalidation_reason" text;--> statement-breakpoint
ALTER TABLE "duplicate_findings" ADD COLUMN "resolution_status" "duplicate_resolution_status" DEFAULT 'OPEN' NOT NULL;--> statement-breakpoint
ALTER TABLE "duplicate_findings" ADD COLUMN "resolved_by" uuid;--> statement-breakpoint
ALTER TABLE "duplicate_findings" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "duplicate_findings" ADD COLUMN "resolution_note" text;--> statement-breakpoint
ALTER TABLE "obligations" ADD COLUMN "destination_id" uuid;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "active_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD COLUMN "policy_version_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD COLUMN "obligation_version" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD COLUMN "destination_id" uuid;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD COLUMN "input_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_destinations" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "vendor_destinations" ADD COLUMN "verification_method" text;--> statement-breakpoint
ALTER TABLE "vendor_destinations" ADD COLUMN "verification_note" text;--> statement-breakpoint
ALTER TABLE "control_findings" ADD CONSTRAINT "control_findings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_findings" ADD CONSTRAINT "control_findings_policy_decision_id_policy_decisions_id_fk" FOREIGN KEY ("policy_decision_id") REFERENCES "public"."policy_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_findings" ADD CONSTRAINT "control_findings_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_readiness" ADD CONSTRAINT "settlement_readiness_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_readiness" ADD CONSTRAINT "settlement_readiness_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_readiness" ADD CONSTRAINT "settlement_readiness_policy_decision_id_policy_decisions_id_fk" FOREIGN KEY ("policy_decision_id") REFERENCES "public"."policy_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_readiness" ADD CONSTRAINT "settlement_readiness_destination_id_vendor_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."vendor_destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_readiness" ADD CONSTRAINT "settlement_readiness_evaluated_by_users_id_fk" FOREIGN KEY ("evaluated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "control_findings_org_obligation_idx" ON "control_findings" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "policy_versions_policy_version_unique" ON "policy_versions" USING btree ("policy_id","version");--> statement-breakpoint
CREATE INDEX "policy_versions_org_policy_idx" ON "policy_versions" USING btree ("organization_id","policy_id");--> statement-breakpoint
CREATE INDEX "settlement_readiness_org_obligation_idx" ON "settlement_readiness" USING btree ("organization_id","obligation_id");--> statement-breakpoint
ALTER TABLE "approval_requirements" ADD CONSTRAINT "approval_requirements_policy_decision_id_policy_decisions_id_fk" FOREIGN KEY ("policy_decision_id") REFERENCES "public"."policy_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requirement_id_approval_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."approval_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_policy_decision_id_policy_decisions_id_fk" FOREIGN KEY ("policy_decision_id") REFERENCES "public"."policy_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_findings" ADD CONSTRAINT "duplicate_findings_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_destination_id_vendor_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."vendor_destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_policy_version_id_policy_versions_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."policy_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_destination_id_vendor_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."vendor_destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_destinations" ADD CONSTRAINT "vendor_destinations_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_decision_actor_unique" ON "approvals" USING btree ("policy_decision_id","actor_id");--> statement-breakpoint
ALTER TABLE "approval_requirements" DROP COLUMN "role_or_actor";--> statement-breakpoint
ALTER TABLE "approval_requirements" DROP COLUMN "threshold_group";--> statement-breakpoint
ALTER TABLE "policies" DROP COLUMN "rule_json";--> statement-breakpoint
ALTER TABLE "policies" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "policy_decisions" DROP COLUMN "policy_id";--> statement-breakpoint
ALTER TABLE "policy_decisions" DROP COLUMN "reasons_json";