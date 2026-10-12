CREATE TYPE "public"."pilot_workspace_state" AS ENUM('ACTIVE', 'EXPIRED', 'RESET');--> statement-breakpoint
CREATE TABLE "pilot_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"state" "pilot_workspace_state" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"vendor_count" integer DEFAULT 0 NOT NULL,
	"obligation_count" integer DEFAULT 0 NOT NULL,
	"mutation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reset_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "pilot_workspaces" ADD CONSTRAINT "pilot_workspaces_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_workspaces" ADD CONSTRAINT "pilot_workspaces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_workspaces_organization_unique" ON "pilot_workspaces" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_workspaces_user_unique" ON "pilot_workspaces" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pilot_workspaces_expiry_idx" ON "pilot_workspaces" USING btree ("expires_at");