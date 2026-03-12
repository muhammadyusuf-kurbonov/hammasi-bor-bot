CREATE TABLE "shared_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"shared_with_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "shared_access_owner_id_shared_with_id_unique" UNIQUE("owner_id","shared_with_id")
);
--> statement-breakpoint
ALTER TABLE "shared_access" ADD CONSTRAINT "shared_access_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_access" ADD CONSTRAINT "shared_access_shared_with_id_users_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;