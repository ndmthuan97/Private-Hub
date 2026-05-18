// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema:  "./db/schema.ts",
  out:     "./drizzle",
  dbCredentials: {
    // db:migrate cần session mode (port 5432), runtime dùng DATABASE_URL (pooler 6543)
    url: process.env.DATABASE_MIGRATE_URL ?? process.env.DATABASE_URL!,
  },
  verbose: true,
  strict:  true,
});
