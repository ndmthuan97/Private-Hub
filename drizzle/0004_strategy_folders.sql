-- Add strategy_folders table
CREATE TABLE IF NOT EXISTS "strategy_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add folder_id FK to roadmaps (nullable, SET NULL on folder delete)
ALTER TABLE "roadmaps"
	ADD COLUMN IF NOT EXISTS "folder_id" uuid REFERENCES "strategy_folders"("id") ON DELETE SET NULL;
