import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const secret = getAuthSecret();
  if (!secret) {
    return new NextResponse(
      "Missing AUTH_SECRET or NEXTAUTH_SECRET. Add one to .env.local (e.g. openssl rand -base64 32) and restart the dev server.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const token = await getToken({
    req: request,
    secret,
  });

  if (!token) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
