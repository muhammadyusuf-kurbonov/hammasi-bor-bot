ALTER TABLE "shipments" DROP CONSTRAINT "shipments_track_number_unique";--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "status_history" DROP CONSTRAINT "status_history_shipment_id_shipments_id_fk";
--> statement-breakpoint
ALTER TABLE "status_history" DROP CONSTRAINT "status_history_changed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_track_number_owner_id_unique" UNIQUE("track_number","owner_id");