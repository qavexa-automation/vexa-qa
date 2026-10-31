import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VEXA — QA Command Center",
  description:
    "Turn better software into your next great quest. A game-inspired issue tracker and QA workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
