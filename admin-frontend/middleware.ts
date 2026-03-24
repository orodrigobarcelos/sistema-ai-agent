import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);
const COOKIE_NAME = "auth-token";

async function isValidToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const hasValidToken = token ? await isValidToken(token) : false;

  // Redirect /register to /login
  if (pathname === "/register") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Auth pages: redirect to /boards if already logged in
  if (pathname === "/login") {
    if (hasValidToken) {
      return NextResponse.redirect(new URL("/boards", request.url));
    }
    return NextResponse.next();
  }

  // API routes (except auth): return 401 if not authenticated
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    if (!hasValidToken) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // All other routes: redirect to /login if not authenticated
  if (!hasValidToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.webp$).*)",
  ],
};
