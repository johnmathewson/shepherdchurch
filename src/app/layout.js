import { Montserrat, Inter, Caveat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Handwriting font — used on the answered-prayers sticky notes so they feel
// like real testimonies pinned to a board, not generic UI cards.
const caveat = Caveat({
  variable: "--font-handwriting",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Shepherd Church | Prayer Wall",
  description: "Submit your prayer request and let our prayer team intercede for you. Experience the power of community prayer at Shepherd Church.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${inter.variable} ${caveat.variable}`}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
