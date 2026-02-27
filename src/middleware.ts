import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // Public routes - accessible without login
  const publicRoutes = ["/login", "/signup", "/api/auth"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    // If user is already logged in and trying to access login/signup, redirect to their dashboard
    if (user && (pathname === "/login" || pathname === "/signup")) {
      const role = (user as any).role;
      const dashboardPath = getDashboardPathFromRole(role);
      return NextResponse.redirect(new URL(dashboardPath, req.nextUrl));
    }
    return NextResponse.next();
  }

  // API routes that need to be accessible
  if (pathname.startsWith("/api/")) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Protected routes - must be logged in
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  const role = (user as any).role;

  // Role-based route protection
  const routeRoleMap: Record<string, string[]> = {
    "/admin": ["ADMIN"],
    "/owner": ["OWNER"],
    "/manager": ["MANAGER"],
    "/supervisor": ["SUPERVISOR"],
    "/operator": ["OPERATOR"],
  };

  // Check if the user is accessing a role-specific route
  for (const [route, allowedRoles] of Object.entries(routeRoleMap)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(role)) {
        // Redirect to their own dashboard
        const dashboardPath = getDashboardPathFromRole(role);
        return NextResponse.redirect(new URL(dashboardPath, req.nextUrl));
      }
    }
  }

  // Allow /dashboard to redirect to role-specific dashboard
  if (pathname === "/dashboard" || pathname === "/") {
    const dashboardPath = getDashboardPathFromRole(role);
    return NextResponse.redirect(new URL(dashboardPath, req.nextUrl));
  }

  return NextResponse.next();
});

function getDashboardPathFromRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "OWNER":
      return "/owner";
    case "MANAGER":
      return "/manager";
    case "SUPERVISOR":
      return "/supervisor";
    case "OPERATOR":
      return "/operator";
    default:
      return "/login";
  }
}

export const config = {
  matcher: [
    // Match all paths except static files and images
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
