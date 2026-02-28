import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let all routes pass through — each page handles its own auth via useSession()
  // Only redirect root path to /login
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
