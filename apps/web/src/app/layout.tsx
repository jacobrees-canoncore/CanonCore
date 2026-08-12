import { productionUrl, siteName } from "@canoncore/config";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(productionUrl),
  title: siteName,
  description: "A catalogue for expanded-universe fiction.",
  // Nothing here is finished, so keep it out of search results until it is.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
