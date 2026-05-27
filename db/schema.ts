import {
  pgTable, uuid, text, jsonb, integer,
  timestamp, numeric, unique, boolean, real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";


// ─── Budget ───────────────────────────────────────────────────

// Cấu hình tỷ lệ % các hạng mục (có thể chỉnh sửa)
export const budgetCategories = pgTable("budget_categories", {
  id:         uuid("id").primaryKey().defaultRandom(),
  key:        text("key").notNull().unique(),       // "essential", "savings", ...
  label:      text("label").notNull(),              // "Cần Thiết"
  emoji:      text("emoji").notNull(),
  color:      text("color").notNull(),
  percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
  sortOrder:  integer("sort_order").notNull().default(0),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Bản ghi phân bổ thu nhập theo tháng/năm
export const budgetEntries = pgTable("budget_entries", {
  id:          uuid("id").primaryKey().defaultRandom(),
  month:       integer("month").notNull(),    // 1–12
  year:        integer("year").notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  // [{key, label, emoji, color, percentage, amount, spent?}]
  allocations: jsonb("allocations").notNull().default([]),
  // History of each income deposit added to this month: [{amount, note, createdAt}]
  deposits:    jsonb("deposits").notNull().default([]),
  note:        text("note").default(""),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("budget_entries_month_year_unique").on(t.month, t.year),
]);


// ─── Strategy Folders ────────────────────────────────────────

export const strategyFolders = pgTable("strategy_folders", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Roadmap ──────────────────────────────────────────────────

export const roadmaps = pgTable("roadmaps", {
  id:        uuid("id").primaryKey().defaultRandom(),
  title:     text("title").notNull(),
  type:      text("type").notNull().default("markdown"), // "markdown" | "embed"
  content:   text("content").notNull().default(""),
  // nullable FK — items without a folder appear at root level
  folderId:  uuid("folder_id").references(() => strategyFolders.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const strategyFoldersRelations = relations(strategyFolders, ({ many }) => ({
  items: many(roadmaps),
}));

export const roadmapsRelations = relations(roadmaps, ({ one }) => ({
  folder: one(strategyFolders, { fields: [roadmaps.folderId], references: [strategyFolders.id] }),
}));

// ─── Types ────────────────────────────────────────────────────
export type Roadmap          = typeof roadmaps.$inferSelect;
export type NewRoadmap       = typeof roadmaps.$inferInsert;
export type StrategyFolder   = typeof strategyFolders.$inferSelect;
export type NewStrategyFolder = typeof strategyFolders.$inferInsert;
export type BudgetCategory    = typeof budgetCategories.$inferSelect;
export type NewBudgetCategory = typeof budgetCategories.$inferInsert;
export type BudgetEntry       = typeof budgetEntries.$inferSelect;
export type NewBudgetEntry    = typeof budgetEntries.$inferInsert;

// ─── NotebookLM Prompts ───────────────────────────────────────

// User-created prompts for NotebookLM; default prompts live in code, not DB
export const nlmPrompts = pgTable("nlm_prompts", {
  id:          uuid("id").primaryKey().defaultRandom(),
  title:       text("title").notNull(),
  label:       text("label").notNull().default(""),
  content:     text("content").notNull(),
  quizPrompt:  text("quiz_prompt"),             // optional follow-up quiz prompt
  sortOrder:   integer("sort_order").notNull().default(0),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NlmPrompt    = typeof nlmPrompts.$inferSelect;
export type NewNlmPrompt = typeof nlmPrompts.$inferInsert;

// ─── Vocabulary ───────────────────────────────────────────────

export const vocabTopics = pgTable("vocab_topics", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      text("name").notNull(),
  slug:      text("slug").notNull().unique(),
  icon:      text("icon").notNull().default("📖"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vocabWords = pgTable("vocab_words", {
  id:            uuid("id").primaryKey().defaultRandom(),
  topicId:       uuid("topic_id").references(() => vocabTopics.id, { onDelete: "cascade" }),

  // Core fields
  word:          text("word").notNull(),          // the word or phrase
  samplePhrase:  text("sample_phrase"),           // collocations / usage pattern
  type:          text("type"),                    // noun | verb | adjective | adverb | phrase …
  pronunciation: text("pronunciation"),           // IPA transcription

  // Bilingual definitions (Cambridge-style)
  definitionVi:  text("definition_vi"),
  definitionEn:  text("definition_en"),

  // Word family — comma-separated e.g. "sustain (v), sustainability (n)"
  wordFamily:    text("word_family"),

  // Synonyms / antonyms — comma-separated
  synonyms:      text("synonyms"),
  antonyms:      text("antonyms"),

  // Example sentence pair 1
  example1En:    text("example1_en"),
  example1Vi:    text("example1_vi"),

  // Example sentence pair 2
  example2En:    text("example2_en"),
  example2Vi:    text("example2_vi"),

  // Soft-delete
  deletedAt:     timestamp("deleted_at",  { withTimezone: true }),
  createdAt:     timestamp("created_at",  { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at",  { withTimezone: true }).notNull().defaultNow(),

  // ── SRS (Spaced Repetition) ──────────────────────────────────
  nextReviewAt:   timestamp("next_review_at",  { withTimezone: true }).defaultNow(),
  easeFactor:     real("ease_factor").default(2.5),
  reviewInterval: integer("review_interval").default(0),
  repetitions:    integer("repetitions").default(0),
});

export const vocabTopicsRelations = relations(vocabTopics, ({ many }) => ({
  words: many(vocabWords),
}));

export const vocabWordsRelations = relations(vocabWords, ({ one }) => ({
  topic: one(vocabTopics, { fields: [vocabWords.topicId], references: [vocabTopics.id] }),
}));

export type VocabTopic         = typeof vocabTopics.$inferSelect;
export type NewVocabTopic      = typeof vocabTopics.$inferInsert;
export type VocabWord          = typeof vocabWords.$inferSelect;
export type NewVocabWord       = typeof vocabWords.$inferInsert;
export type VocabTopicWithCount = VocabTopic & { word_count: number; learned_count: number };

// ─── Sidebar Config ───────────────────────────────────────────

// Single-row config storing all sidebar customization (links, groups, visibility)
export const sidebarConfig = pgTable("sidebar_config", {
  id:        text("id").primaryKey().default("default"),
  links:     jsonb("links").notNull().default([]),       // ExternalItem[]
  groups:    jsonb("groups").notNull().default([]),      // CustomGroup[]
  hidden:    jsonb("hidden").notNull().default([]),      // string[] — hidden item hrefs
  overrides: jsonb("overrides").notNull().default({}),   // Record<string, GroupOverride>
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SidebarConfig    = typeof sidebarConfig.$inferSelect;
export type NewSidebarConfig = typeof sidebarConfig.$inferInsert;

