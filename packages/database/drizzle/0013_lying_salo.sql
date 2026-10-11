ALTER TABLE "recipient_invitations" ADD COLUMN "delivery_state" text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "recipient_invitations" ADD COLUMN "provider_reference" text;