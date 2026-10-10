CREATE TYPE "public"."recipient_challenge_state" AS ENUM('ACTIVE', 'CONSUMED', 'LOCKED_OUT', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."recipient_invitation_state" AS ENUM('ACTIVE', 'CONTACT_VERIFIED', 'CONSUMED', 'EXPIRED', 'REVOKED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."recipient_session_state" AS ENUM('ACTIVE', 'CONSUMED', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TABLE "destination_attestations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"destination_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"attestation_type" text NOT NULL,
	"contact_fingerprint" text NOT NULL,
	"verification_method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipient_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"obligation_version" integer NOT NULL,
	"base_destination_id" uuid,
	"base_destination_version" integer,
	"purpose" text NOT NULL,
	"network" text NOT NULL,
	"contact_channel" text NOT NULL,
	"contact_fingerprint" text NOT NULL,
	"token_hash" text NOT NULL,
	"state" "recipient_invitation_state" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"consumed_destination_id" uuid,
	"consumed_request_hash" text,
	"consumed_at" timestamp with time zone,
	"revoked_by" uuid,
	"revoked_at" timestamp with time zone,
	"reason_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipient_operation_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"operation_type" text NOT NULL,
	"idempotency_key_hash" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text NOT NULL,
	"result_destination_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "recipient_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"state" "recipient_session_state" DEFAULT 'ACTIVE' NOT NULL,
	"contact_verified_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipient_verification_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"state" "recipient_challenge_state" DEFAULT 'ACTIVE' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"provider_reference" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendor_destinations" ADD COLUMN "version" integer;--> statement-breakpoint
ALTER TABLE "vendor_destinations" ADD COLUMN "supersedes_destination_id" uuid;--> statement-breakpoint
ALTER TABLE "vendor_destinations" ADD COLUMN "recipient_confirmation_status" text DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_destinations" ADD COLUMN "origin" text DEFAULT 'INTERNAL_MANUAL' NOT NULL;--> statement-breakpoint
WITH ordered AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "organization_id", "vendor_id"
		ORDER BY "created_at", "id"
	)::integer AS "destination_version",
	lag("id") OVER (
		PARTITION BY "organization_id", "vendor_id"
		ORDER BY "created_at", "id"
	) AS "predecessor_id"
	FROM "vendor_destinations"
)
UPDATE "vendor_destinations" AS destination
SET "version" = ordered."destination_version",
	"supersedes_destination_id" = ordered."predecessor_id"
FROM ordered
WHERE destination."id" = ordered."id";--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "vendor_destinations"
		WHERE "superseded_at" IS NULL
		GROUP BY "organization_id", "vendor_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'vendor destination history has multiple current rows';
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "vendor_destinations" ALTER COLUMN "version" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_destinations" ALTER COLUMN "version" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "destination_attestations" ADD CONSTRAINT "destination_attestations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_attestations" ADD CONSTRAINT "destination_attestations_destination_id_vendor_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."vendor_destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_attestations" ADD CONSTRAINT "destination_attestations_invitation_id_recipient_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."recipient_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_attestations" ADD CONSTRAINT "destination_attestations_session_id_recipient_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."recipient_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_invitations" ADD CONSTRAINT "recipient_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_invitations" ADD CONSTRAINT "recipient_invitations_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_invitations" ADD CONSTRAINT "recipient_invitations_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_invitations" ADD CONSTRAINT "recipient_invitations_base_destination_id_vendor_destinations_id_fk" FOREIGN KEY ("base_destination_id") REFERENCES "public"."vendor_destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_invitations" ADD CONSTRAINT "recipient_invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_invitations" ADD CONSTRAINT "recipient_invitations_consumed_destination_id_vendor_destinations_id_fk" FOREIGN KEY ("consumed_destination_id") REFERENCES "public"."vendor_destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_invitations" ADD CONSTRAINT "recipient_invitations_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_operation_receipts" ADD CONSTRAINT "recipient_operation_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_operation_receipts" ADD CONSTRAINT "recipient_operation_receipts_invitation_id_recipient_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."recipient_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_operation_receipts" ADD CONSTRAINT "recipient_operation_receipts_result_destination_id_vendor_destinations_id_fk" FOREIGN KEY ("result_destination_id") REFERENCES "public"."vendor_destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_sessions" ADD CONSTRAINT "recipient_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_sessions" ADD CONSTRAINT "recipient_sessions_invitation_id_recipient_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."recipient_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_verification_challenges" ADD CONSTRAINT "recipient_verification_challenges_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_verification_challenges" ADD CONSTRAINT "recipient_verification_challenges_invitation_id_recipient_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."recipient_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "destination_attestations_destination_unique" ON "destination_attestations" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "destination_attestations_org_invitation_idx" ON "destination_attestations" USING btree ("organization_id","invitation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipient_invitations_token_hash_unique" ON "recipient_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "recipient_invitations_org_vendor_idx" ON "recipient_invitations" USING btree ("organization_id","vendor_id");--> statement-breakpoint
CREATE INDEX "recipient_invitations_org_obligation_idx" ON "recipient_invitations" USING btree ("organization_id","obligation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipient_invitations_active_vendor_unique" ON "recipient_invitations" USING btree ("organization_id","vendor_id","purpose") WHERE "recipient_invitations"."state" in ('ACTIVE', 'CONTACT_VERIFIED');--> statement-breakpoint
CREATE UNIQUE INDEX "recipient_receipts_idempotency_unique" ON "recipient_operation_receipts" USING btree ("invitation_id","operation_type","idempotency_key_hash");--> statement-breakpoint
CREATE INDEX "recipient_receipts_org_invitation_idx" ON "recipient_operation_receipts" USING btree ("organization_id","invitation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipient_sessions_token_hash_unique" ON "recipient_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "recipient_sessions_invitation_idx" ON "recipient_sessions" USING btree ("organization_id","invitation_id");--> statement-breakpoint
CREATE INDEX "recipient_challenges_invitation_idx" ON "recipient_verification_challenges" USING btree ("organization_id","invitation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipient_challenges_active_unique" ON "recipient_verification_challenges" USING btree ("invitation_id") WHERE "recipient_verification_challenges"."state" = 'ACTIVE';--> statement-breakpoint
ALTER TABLE "vendor_destinations" ADD CONSTRAINT "vendor_destinations_supersedes_destination_id_vendor_destinations_id_fk" FOREIGN KEY ("supersedes_destination_id") REFERENCES "public"."vendor_destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_org_vendor_version_unique" ON "vendor_destinations" USING btree ("organization_id","vendor_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_org_vendor_current_unique" ON "vendor_destinations" USING btree ("organization_id","vendor_id") WHERE "vendor_destinations"."superseded_at" is null;
