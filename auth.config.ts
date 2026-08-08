// Edge-safe Auth.js config. This half carries NO Node-only code (no Prisma) so it
// can be imported by middleware.ts, which runs on the edge runtime. The Prisma
// user-upsert lives in auth.ts (Node) — see the split-config pattern in the Auth.js
// v5 docs. Provider secrets are auto-read from the environment:
//   Google → AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
//   GitHub → AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
//   plus AUTH_SECRET (session encryption) and AUTH_TRUST_HOST (proxied deploys).
import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

// Only enable a provider when its credentials are present. This keeps sign-in honest:
// a provider you haven't (or can't) set up — e.g. Google, which needs an 18+ account to
// create an OAuth client — simply doesn't appear, instead of showing a button that 401s.
export const providerStatus = {
  google: !!process.env.AUTH_GOOGLE_ID,
  github: !!process.env.AUTH_GITHUB_ID,
};

const providers: Provider[] = [];
if (providerStatus.google) providers.push(Google);
if (providerStatus.github) providers.push(GitHub);

// Routes that require a signed-in user. The wizard (/build) is the entry point of the
// college search — gating it here is what makes "you can't even start unless you log in"
// true at the routing layer, not just the UI.
const PROTECTED_PREFIXES = ["/dashboard", "/build", "/results", "/explorer"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default {
  // Behind the Azure Container Apps proxy, trust the forwarded host for callback URLs.
  trustHost: true,
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    // Used by middleware to gate protected routes. Returning false on a protected
    // route redirects the visitor to the sign-in page with a callbackUrl.
    authorized({ auth, request: { nextUrl } }) {
      if (!isProtected(nextUrl.pathname)) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
