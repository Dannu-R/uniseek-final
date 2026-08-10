import { auth, signOut } from "@/auth";

// One black bar across the whole site, signed in or out.
export default async function Navbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar__inner">
        <div className="navbar__links">
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
      </div>
    </nav>
  );
}
