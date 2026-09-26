import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";

// First line of defence for /admin and /portal: send people to the right area
// for their role. Pages and actions re-check against the database (lib/dal.ts).
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const secret = getAuthSecret();
  if (!secret) {
    return new NextResponse(
      "Missing AUTH_SECRET or NEXTAUTH_SECRET. Add one to .env.local (e.g. openssl rand -base64 32) and restart the dev server.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  // Behind nginx the app sees plain http, but the browser is on https, where
  // Auth.js names the cookie `__Secure-authjs.session-token`. Match that.
  const secureCookie =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https" ||
    request.nextUrl.protocol === "https:";
  const token = await getToken({ req: request, secret, secureCookie });
  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  const area = pathname.startsWith("/admin") ? "admin" : "client";
  if (token.role !== area) {
    return NextResponse.redirect(
      new URL(token.role === "admin" ? "/admin" : "/portal", request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/portal", "/portal/:path*"],
};
