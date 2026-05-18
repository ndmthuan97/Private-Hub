CREATE TABLE "tech_digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trending_tags" text[] DEFAULT '{}' NOT NULL,
	"week_number" integer NOT NULL,
	"year" integer NOT NULL,
	"generated_by_cron" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
