import type { Metadata } from "next";
import { canonicalOrigin, siteName } from "@canoncore/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(canonicalOrigin),
  title: siteName,
  description: "A place to track your way through an expanded universe.",
  // Nothing here is worth indexing until there is a product and a terms of service
  // behind it (CAN-21). The holding page this replaced carried the same instruction.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
