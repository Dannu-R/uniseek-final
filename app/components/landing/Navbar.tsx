// @ts-nocheck
export default function Navbar() {
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
          <button type="button" className="navbar__login">
            Log in
          </button>
          <button type="button" className="navbar__signup">
            Sign up
          </button>
        </div>
      </div>
    </nav>
  );
}
