// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "ph_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày

async function createToken(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const data = `ph_${Date.now()}`;
  const sig   = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${data}.${sigB64}`;
}

export async function POST(req: NextRequest) {
  const { passkey } = await req.json() as { passkey?: string };
  const expected = process.env.APP_PASSKEY;

  if (!expected || passkey !== expected) {
    return NextResponse.json(
      { statusCode: 401, message: "Passkey không đúng", data: null, errors: null },
      { status: 401 }
    );
  }

  const secret = process.env.SESSION_SECRET ?? "fallback-dev-secret";
  const token  = await createToken(secret);

  const res = NextResponse.json({ statusCode: 200, message: "OK", data: null, errors: null });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   COOKIE_MAX_AGE,
    path:     "/",
  });
  return res;
}
