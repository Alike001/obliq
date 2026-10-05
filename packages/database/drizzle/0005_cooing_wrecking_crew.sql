CREATE TABLE "obligation_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"vendor_id" uuid NOT NULL,
	"type" text NOT NULL,
	"reference" text NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"due_at" timestamp with time zone,
	"category" text,
	"description" text NOT NULL,
	"source_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "obligation_versions" ADD CONSTRAINT "obligation_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_versions" ADD CONSTRAINT "obligation_versions_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_versions" ADD CONSTRAINT "obligation_versions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_versions" ADD CONSTRAINT "obligation_versions_source_id_obligation_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."obligation_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_versions" ADD CONSTRAINT "obligation_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "obligation_versions" (
	"organization_id",
	"obligation_id",
	"version",
	"vendor_id",
	"type",
	"reference",
	"currency",
	"amount_minor",
	"due_at",
	"category",
	"description",
	"source_id",
	"changed_by",
	"created_at"
)
SELECT
	"organization_id",
	"id",
	"version",
	"vendor_id",
	"type",
	"reference",
	"currency",
	"amount_minor",
	"due_at",
	"category",
	"description",
	"source_id",
	"created_by",
	"created_at"
FROM "obligations";--> statement-breakpoint
CREATE UNIQUE INDEX "obligation_versions_obligation_version_unique" ON "obligation_versions" USING btree ("obligation_id","version");--> statement-breakpoint
CREATE INDEX "obligation_versions_org_obligation_idx" ON "obligation_versions" USING btree ("organization_id","obligation_id");
