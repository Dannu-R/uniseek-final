// Sign-in page. You must be signed in to start the college search, so the wizard,
// results, and explorer all redirect here (with a callbackUrl) when signed out.
// The buttons are server actions that kick off the OAuth flow and return the visitor
// to where they were headed.
import { signIn, auth } from "@/auth";
import { providerStatus } from "@/auth.config";
import { redirect } from "next/navigation";

// Only ever redirect back to an internal path — never an attacker-supplied absolute URL.
function safeCallback(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = safeCallback(callbackUrl);

  // Already signed in? Skip straight to the search.
  const session = await auth();
  if (session?.user) redirect(redirectTo);

  return (
    <div className="login">
      <div className="login__card">
        <a className="login__brand" href="/">Uniseek</a>
        <h1 className="login__title">Sign in to build your list</h1>
        <p className="login__sub">
          Your college search is saved to your account, so you can come back and refine it anytime.
        </p>

        <div className="login__buttons">
          {providerStatus.google && (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo });
              }}
            >
              <button type="submit" className="login__btn login__btn--google">
                <span className="login__glyph" aria-hidden="true">G</span>
                Continue with Google
              </button>
            </form>
          )}

          {providerStatus.github && (
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo });
              }}
            >
              <button type="submit" className="login__btn login__btn--github">
                <span className="login__glyph" aria-hidden="true">⌥</span>
                Continue with GitHub
              </button>
            </form>
          )}

          {!providerStatus.google && !providerStatus.github && (
            <p className="login__sub" role="status">
              Sign-in isn't configured yet. Add an OAuth provider's credentials to enable it.
            </p>
          )}
        </div>

        <p className="login__fine">
          By continuing you agree to let Uniseek create an account tied to your email.
        </p>
      </div>
    </div>
  );
}
