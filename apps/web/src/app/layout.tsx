import { productionUrl, siteName } from "@canoncore/config";
import type { Metadata } from "next";
import { Measurement } from "@/analytics/analytics";
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
      <body>
        {children}
        {/*
          Last in the body, and on every page rather than on the ones worth measuring: the two
          Core Web Vitals that cannot be measured in a lab only exist where real people load real
          pages, so a partial installation measures a partial site. What makes it lawful without a
          consent banner is its `beforeSend`, not where it is mounted — `analytics/analytics.tsx`.
        */}
        <Measurement />
      </body>
    </html>
  );
}
