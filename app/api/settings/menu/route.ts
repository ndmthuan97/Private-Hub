import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const REDIS_KEY = "ph:menu_grid";
const VALID_SIZES = [3, 4, 5];
const DEFAULT_SIZE = 4;

type ApiRes<T = unknown> = {
  statusCode: number;
  message: string;
  data: T | null;
  errors: unknown | null;
};

function json<T>(body: ApiRes<T>, status = 200) {
  return NextResponse.json(body, { status });
}

// GET /api/settings/menu — return grid size
export async function GET() {
  try {
    const val = await redis.get(REDIS_KEY);
    const size = val && VALID_SIZES.includes(Number(val)) ? Number(val) : DEFAULT_SIZE;
    return json({ statusCode: 200, message: "OK", data: { gridSize: size }, errors: null });
  } catch (e) {
    return json({ statusCode: 500, message: "Failed to read menu config", data: null, errors: String(e) }, 500);
  }
}

// PUT /api/settings/menu — update grid size
export async function PUT(req: NextRequest) {
  try {
    const { gridSize } = await req.json();
    if (!VALID_SIZES.includes(gridSize)) {
      return json({ statusCode: 400, message: "Invalid grid size", data: null, errors: null }, 400);
    }
    await redis.set(REDIS_KEY, String(gridSize));
    return json({ statusCode: 200, message: "Menu config updated", data: { gridSize }, errors: null });
  } catch (e) {
    return json({ statusCode: 500, message: "Failed to update menu config", data: null, errors: String(e) }, 500);
  }
}
