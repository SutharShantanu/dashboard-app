import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const path = req.nextUrl.pathname;

    // Check sub-admin permissions
    // Sub-admins should not be able to access the sub-admin management UI (/users)
    if (path.startsWith("/users") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/sheets/:path*",
    "/settings/:path*",
    "/users/:path*",
    "/logs/:path*",
  ],
};
