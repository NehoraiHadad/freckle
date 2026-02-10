import { NextRequest, NextResponse } from "next/server";
import { jwtDecrypt } from "jose";

const COOKIE_NAME = "freckle_session";

function getSecret(): Uint8Array {
  const secret = process.env.FRECKLE_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("FRECKLE_SESSION_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret.slice(0, 32));
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = getSecret();
    const { payload } = await jwtDecrypt(token, secret, {
      issuer: "freckle",
    });

    if (payload.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login
     * - /api/health-check
     * - /_next/static (Next.js static files)
     * - /_next/image (Next.js image optimization)
     * - /favicon.ico
     */
    "/((?!login|api/health-check|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
