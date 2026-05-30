import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "ph_session";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and all static assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static files and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
