import { NextResponse } from "next/server";

export async function POST() {
  // Must use NextResponse directly to clear cookies on the response object
  const res = NextResponse.json({ statusCode: 200, message: "Logged out", data: null, errors: null });
  res.cookies.set("ph_session", "", { maxAge: 0, path: "/" });
  return res;
}
