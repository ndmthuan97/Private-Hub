CREATE TABLE "vocab_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text DEFAULT '📖' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vocab_topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vocab_words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid,
	"word" text NOT NULL,
	"sample_phrase" text,
	"type" text,
	"pronunciation" text,
	"definition_vi" text,
	"definition_en" text,
	"word_family" text,
	"synonyms" text,
	"antonyms" text,
	"example1_en" text,
	"example1_vi" text,
	"example2_en" text,
	"example2_vi" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_review_at" timestamp with time zone DEFAULT now(),
	"ease_factor" real DEFAULT 2.5,
	"review_interval" integer DEFAULT 0,
	"repetitions" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "vocab_words" ADD CONSTRAINT "vocab_words_topic_id_vocab_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."vocab_topics"("id") ON DELETE cascade ON UPDATE no action;