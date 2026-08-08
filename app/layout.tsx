// @ts-nocheck
// Styles — order matters: tokens & base first, then features
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/hero.css";
import "./styles/navbar.css";
import "./styles/whatis.css";
import "./styles/stats.css";
import "./styles/problem.css";
import "./styles/values.css";
import "./styles/product.css";
import "./styles/pricing.css";
import "./styles/reviews.css";
import "./styles/footer.css";
import "./styles/components.css";
import "./styles/wizard.css";
import "./styles/results.css";
import "./styles/explorer.css";
import "./styles/auth.css";
import "./styles/dashboard.css";
import { Inter, Stack_Sans_Notch } from "next/font/google";
import ScrollManager from "./components/shared/ScrollManager";

const inter = Inter({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-inter",
});

const stackSans = Stack_Sans_Notch({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-stack",
});

export const metadata = {
  title: "Uniseek — Discover colleges that fit you",
  description:
    "Uniseek gives you personalized, evidence-backed college recommendations — honest about fit, admission odds, and how confident we are.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${stackSans.variable}`}>
      {/* browser extensions (e.g. Grammarly) inject attributes on <body>
          before React hydrates; ignore those attribute-only mismatches */}
      <body suppressHydrationWarning>
        {/* start at the top on reload instead of restoring scroll position */}
        <ScrollManager />
        {children}
      </body>
    </html>
  );
}
