import type { Metadata } from "next";
import "./globals.css";

// A nonce CSP is created per request in proxy.ts. Static rendering cannot
// receive that nonce, so pages must render only after a request exists.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "ModelOps",
  description: "ML Experiment, Model Card & Readiness Assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
