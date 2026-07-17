import "./globals.css";
import { Inter, Stack_Sans_Notch } from "next/font/google";

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
      <body>{children}</body>
    </html>
  );
}
