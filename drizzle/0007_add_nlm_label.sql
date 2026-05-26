-- Add per-prompt label to distinguish prompts within the same folder/group
ALTER TABLE "nlm_prompts" ADD COLUMN "label" text DEFAULT '' NOT NULL;
