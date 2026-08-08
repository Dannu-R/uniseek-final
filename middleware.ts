// Edge middleware — gates the protected routes. It builds an Auth.js instance from the
// EDGE-SAFE config only (no Prisma), so it can decode the JWT session and apply the
// `authorized` rule without pulling Node-only code into the edge runtime.
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

// `auth` is itself the middleware handler (applies the `authorized` callback).
export default auth;

// Only run on the search flow. Everything else (landing, /login, /api/auth/*, static
// assets) is public. Unauthenticated hits here are redirected to /login?callbackUrl=…
export const config = {
  matcher: ["/build/:path*", "/results/:path*", "/explorer/:path*"],
};
