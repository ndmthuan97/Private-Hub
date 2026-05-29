import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { ok, badRequest, serverError } from "@/lib/api-response";

// Redis key & TTL
const REDIS_KEY = "ph:translation:cache";
const TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days
const MAX_ENTRIES = 10;

interface CachedEntry {
  id: string;
  language: string;
  preview: string;
  originalText: string;
  result: unknown;
  createdAt: number;
}

/** GET — load all cached entries */
export async function GET() {
  try {
    const raw = await redis.get(REDIS_KEY);
    const entries: CachedEntry[] = raw ? JSON.parse(raw as string) : [];
    return ok(entries);
  } catch (err) {
    return serverError("Failed to load translation cache", err);
  }
}

/** POST — add a new entry (prepend, keep max 10, refresh TTL) */
export async function POST(req: NextRequest) {
  try {
    const entry: CachedEntry = await req.json();

    if (!entry.id || !entry.result) {
      return badRequest("Missing required fields: id, result");
    }

    const raw = await redis.get(REDIS_KEY);
    const existing: CachedEntry[] = raw ? JSON.parse(raw as string) : [];

    // Prepend new entry, deduplicate by id, keep max entries
    const updated = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(
      0,
      MAX_ENTRIES
    );

    await redis.set(REDIS_KEY, JSON.stringify(updated), "EX", TTL_SECONDS);
    return ok(updated, "Saved to cache");
  } catch (err) {
    return serverError("Failed to save translation cache", err);
  }
}

/** DELETE — remove a single entry by id (passed as ?id=xxx) */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return badRequest("Missing query param: id");

    const raw = await redis.get(REDIS_KEY);
    const existing: CachedEntry[] = raw ? JSON.parse(raw as string) : [];
    const updated = existing.filter((e) => e.id !== id);

    if (updated.length > 0) {
      await redis.set(REDIS_KEY, JSON.stringify(updated), "EX", TTL_SECONDS);
    } else {
      await redis.del(REDIS_KEY);
    }

    return ok(updated, "Removed from cache");
  } catch (err) {
    return serverError("Failed to delete from translation cache", err);
  }
}
