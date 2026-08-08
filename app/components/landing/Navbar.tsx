import { auth, signOut } from "@/auth";

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
              <a className="navbar__login" href="/dashboard">
                Dashboard
              </a>
              <span className="navbar__user" title={user.email ?? undefined}>
                {user.name ?? user.email ?? "Signed in"}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="navbar__signup">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <a className="navbar__login" href="/login">
                Log in
              </a>
              <a className="navbar__signup" href="/login?callbackUrl=/dashboard">
                Sign up
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
