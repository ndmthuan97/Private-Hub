import {
  pgTable, uuid, text, jsonb, integer,
  timestamp, numeric, unique,
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
  // [{key, label, emoji, color, percentage, amount}]
  allocations: jsonb("allocations").notNull().default([]),
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
