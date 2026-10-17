import type { Metadata } from "next";
import "./globals.css";

const title = "Send It · Your next client already knows you";
const description =
  "Each morning, a few people you already know, why today, and a note to send from your own Gmail. No cold email.";
export const metadata: Metadata = {
  metadataBase: new URL("https://sendit.day"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Send It",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: title }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
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
