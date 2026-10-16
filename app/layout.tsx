import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Send It · A little follow-up, every day",
  description:
    "Keep your warm relationships moving, one thoughtful follow-up at a time.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
