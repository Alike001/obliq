CREATE TYPE "public"."duplicate_kind" AS ENUM('POSSIBLE');--> statement-breakpoint
CREATE TYPE "public"."extraction_mode" AS ENUM('LIVE', 'SEEDED_FIXTURE');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "duplicate_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"candidate_obligation_id" uuid NOT NULL,
	"kind" "duplicate_kind" NOT NULL,
	"reasons_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"mode" "extraction_mode" NOT NULL,
	"status" "extraction_status" NOT NULL,
	"result_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "obligations_org_reference_unique";--> statement-breakpoint
ALTER TABLE "obligations" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "obligations" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "duplicate_findings" ADD CONSTRAINT "duplicate_findings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_findings" ADD CONSTRAINT "duplicate_findings_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_findings" ADD CONSTRAINT "duplicate_findings_candidate_obligation_id_obligations_id_fk" FOREIGN KEY ("candidate_obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_source_id_obligation_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."obligation_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "duplicate_findings_org_obligation_idx" ON "duplicate_findings" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE INDEX "extraction_runs_org_source_idx" ON "extraction_runs" USING btree ("organization_id","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_events_org_payload_hash_unique" ON "audit_events" USING btree ("organization_id","payload_hash");--> statement-breakpoint
CREATE INDEX "obligations_org_reference_idx" ON "obligations" USING btree ("organization_id","reference");