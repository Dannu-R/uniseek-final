import { auth, signOut } from "@/auth";
import UniseekMark from "@/app/components/UniseekMark";

// Three separate floating pieces, not one bar: the wordmark sits directly on the page at
// the left, the nav links float in a liquid-glass pill dead center, and the auth actions
// sit directly on the page at the right — mirroring the brand. Nothing but the center
// pill gets the glass treatment, so brand and actions stay plain against whatever's
// behind them (the hero photo, or a dark section further down).
export default async function Navbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <nav className="navbar" aria-label="Main">
      <a className="navbar__brand" href="/">
        <UniseekMark className="navbar__brand-mark" />
        <span className="navbar__brand-name">Uniseek</span>
      </a>

      <div className="navbar__glass" aria-label="Primary">
        <button type="button" className="navbar__link">
          Discover
        </button>
        <button type="button" className="navbar__link">
          How it works
        </button>
        <button type="button" className="navbar__link">
          About
        </button>
        <button type="button" className="navbar__link">
          FAQ
        </button>
      </div>

      <div className="navbar__actions">
        {user ? (
          <>
            <a className="nav-pill nav-pill--ghost" href="/dashboard">
              Dashboard
            </a>

            <span className="nav-divider" aria-hidden="true" />

            <div className="nav-user" title={user.email ?? undefined}>
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="nav-user__avatar" src={user.image} alt="" />
              ) : (
                <span className="nav-user__avatar nav-user__avatar--initial" aria-hidden="true">
                  {(user.name ?? user.email ?? "U").trim().charAt(0).toUpperCase()}
                </span>
              )}
              <span className="nav-user__name">{user.name ?? user.email ?? "Signed in"}</span>
            </div>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="nav-iconbtn" aria-label="Sign out" title="Sign out">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          <>
            <a className="nav-pill nav-pill--ghost" href="/login">
              Log in
            </a>
            <a className="nav-pill nav-pill--primary" href="/login?callbackUrl=/dashboard">
              Sign up
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
