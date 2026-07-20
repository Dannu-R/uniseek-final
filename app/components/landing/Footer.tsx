// @ts-nocheck
const COLUMNS = [
  { title: "Product", links: ["How it works", "Features", "Discover"] },
  { title: "Company", links: ["About", "Careers", "Contact"] },
  { title: "Resources", links: ["Blog", "Help center", "FAQ"] },
  { title: "Legal", links: ["Privacy", "Terms"] },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="footer__logo-row">
            <svg
              className="footer__logo"
              viewBox="0 0 53.54897 63.90451"
              role="img"
              aria-label="Uniseek logo"
            >
              <g transform="translate(-206.93265,-157.98483)" fill="currentColor">
                <path d="M220.40922,221.88934l-13.47657,-37.2094l27.26349,-9.87434l13.47657,37.2094z" />
                <path d="M247.36661,212.12256l-4.22689,-11.67064l13.11501,-4.75002l4.22689,11.67064z" />
                <path d="M238.2259,186.65474l-4.25975,-11.76135l13.11501,-4.75002l4.25975,11.76135z" />
                <path d="M217.29163,177.1945l-4.91598,-13.57324l15.56242,-5.63643l4.91598,13.57324z" />
              </g>
            </svg>
            <span className="footer__title">Uniseek</span>
          </div>
          <p className="footer__tagline">
            Discover the college that fits you.
          </p>
        </div>

        <nav className="footer__cols" aria-label="Footer">
          {COLUMNS.map((col) => (
            <div className="footer__col" key={col.title}>
              <h4 className="footer__col-title">{col.title}</h4>
              {col.links.map((link) => (
                <a className="footer__link" key={link}>
                  {link}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="footer__bottom">
        <p className="footer__copy">
          © 2026 Uniseek. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
