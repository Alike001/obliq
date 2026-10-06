CREATE TYPE "public"."evidence_status" AS ENUM('ACTIVE', 'SUPERSEDED', 'REVOKED');--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "evidence_packages")
		OR EXISTS (SELECT 1 FROM "evidence_disclosures") THEN
		RAISE EXCEPTION 'Phase 5 migration requires explicit remediation of legacy evidence scaffold rows; no complete evidence artifact existed before Phase 5';
	END IF;
END $$;--> statement-breakpoint
CREATE TABLE "evidence_previews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"obligation_version" integer NOT NULL,
	"settlement_id" uuid NOT NULL,
	"observation_id" uuid NOT NULL,
	"supersedes_package_id" uuid,
	"version" integer NOT NULL,
	"template" text NOT NULL,
	"artifact_json" jsonb NOT NULL,
	"artifact_hash" text NOT NULL,
	"disclosed_fields_json" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"issued_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "evidence_packages" ALTER COLUMN "settlement_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_packages" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"public"."evidence_status";--> statement-breakpoint
ALTER TABLE "evidence_packages" ALTER COLUMN "status" SET DATA TYPE "public"."evidence_status" USING "status"::"public"."evidence_status";--> statement-breakpoint
ALTER TABLE "evidence_packages" ALTER COLUMN "artifact_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_disclosures" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_disclosures" ADD COLUMN "classification" text NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_disclosures" ADD COLUMN "provenance" text NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "public_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "obligation_version" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "observation_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "supersedes_package_id" uuid;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "version" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "template" text NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "schema_version" text NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "hash_algorithm" text NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "artifact_json" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "disclosed_fields_json" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "status_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "status_changed_by" uuid;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD COLUMN "status_reason" text;--> statement-breakpoint
ALTER TABLE "evidence_previews" ADD CONSTRAINT "evidence_previews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_previews" ADD CONSTRAINT "evidence_previews_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_previews" ADD CONSTRAINT "evidence_previews_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_previews" ADD CONSTRAINT "evidence_previews_observation_id_settlement_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."settlement_observations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_previews" ADD CONSTRAINT "evidence_previews_supersedes_package_id_evidence_packages_id_fk" FOREIGN KEY ("supersedes_package_id") REFERENCES "public"."evidence_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_previews" ADD CONSTRAINT "evidence_previews_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_previews_public_id_unique" ON "evidence_previews" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "evidence_previews_org_creator_idx" ON "evidence_previews" USING btree ("organization_id","created_by");--> statement-breakpoint
ALTER TABLE "evidence_disclosures" ADD CONSTRAINT "evidence_disclosures_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD CONSTRAINT "evidence_packages_observation_id_settlement_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."settlement_observations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD CONSTRAINT "evidence_packages_supersedes_package_id_evidence_packages_id_fk" FOREIGN KEY ("supersedes_package_id") REFERENCES "public"."evidence_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_packages" ADD CONSTRAINT "evidence_packages_status_changed_by_users_id_fk" FOREIGN KEY ("status_changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_disclosures_package_field_unique" ON "evidence_disclosures" USING btree ("evidence_package_id","field_key");--> statement-breakpoint
CREATE INDEX "evidence_disclosures_org_package_idx" ON "evidence_disclosures" USING btree ("organization_id","evidence_package_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_packages_public_id_unique" ON "evidence_packages" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "evidence_packages_org_settlement_idx" ON "evidence_packages" USING btree ("organization_id","settlement_id");
--> statement-breakpoint
CREATE FUNCTION protect_evidence_package_artifact() RETURNS trigger AS $$
BEGIN
	IF NEW.public_id IS DISTINCT FROM OLD.public_id
		OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
		OR NEW.obligation_id IS DISTINCT FROM OLD.obligation_id
		OR NEW.obligation_version IS DISTINCT FROM OLD.obligation_version
		OR NEW.settlement_id IS DISTINCT FROM OLD.settlement_id
		OR NEW.observation_id IS DISTINCT FROM OLD.observation_id
		OR NEW.supersedes_package_id IS DISTINCT FROM OLD.supersedes_package_id
		OR NEW.version IS DISTINCT FROM OLD.version
		OR NEW.template IS DISTINCT FROM OLD.template
		OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
		OR NEW.hash_algorithm IS DISTINCT FROM OLD.hash_algorithm
		OR NEW.artifact_json IS DISTINCT FROM OLD.artifact_json
		OR NEW.artifact_hash IS DISTINCT FROM OLD.artifact_hash
		OR NEW.disclosed_fields_json IS DISTINCT FROM OLD.disclosed_fields_json
		OR NEW.created_by IS DISTINCT FROM OLD.created_by
		OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
		RAISE EXCEPTION 'issued evidence artifact is immutable';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER evidence_package_artifact_immutable
BEFORE UPDATE ON "evidence_packages"
FOR EACH ROW EXECUTE FUNCTION protect_evidence_package_artifact();
