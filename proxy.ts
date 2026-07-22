import { NextResponse, type NextRequest } from "next/server";
import { sessionCookie, verifySessionToken } from "@/lib/auth/session";

const publicPaths = new Set(["/login", "/api/auth/login"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.has(pathname)) return NextResponse.next();

  const authenticated = await verifySessionToken(
    request.cookies.get(sessionCookie.name)?.value,
    process.env.SESSION_SECRET ?? "",
  );
  if (authenticated) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|manifest.webmanifest|icons/).*)"],
};
