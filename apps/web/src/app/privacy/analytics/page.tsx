import { siteName } from "@canoncore/config";
import type { Metadata } from "next";
import Link from "next/link";
import { objectionKey } from "@/analytics/opt-out";
import { ObjectionControl } from "./objection-control";

/** The browser tab, and nothing else: this page is never in search results — the root layout
 * sets `robots: { index: false }` for the whole site. */
export const metadata: Metadata = { title: `Counting visits — ${siteName}` };

/**
 * The information duty and the objection duty that
 * [ADR-0020](../../../../../docs/adr/0020-no-cookie-consent-banner.md) attaches to measuring
 * anything here, on one page.
 *
 * **This is why there is no consent banner.** The ICO's statistical purposes exception covers
 * analytics whose sole purpose is improving the service, and it carries two conditions rather
 * than none: "clear and comprehensive information about your use of the technology", and "an easy
 * way to object to this use". The prose below is the first; {@link ObjectionControl} is the
 * second. The ADR is explicit that "if you don't, you won't be using those exceptions correctly",
 * so neither half is decoration.
 *
 * **It is not the privacy notice**, which is a wider document and is not written yet. What it is
 * is the analytics section of one, standing on its own until there is one to fold it into, because
 * the ADR requires the objection route to exist before the measurement does rather than after.
 *
 * Static: nothing on it depends on the request, and the one thing that depends on the *device* is
 * the control, which is a client component for exactly that reason.
 */
export default function CountingVisits() {
  return (
    <main>
      <p className="site">
        <Link href="/">{siteName}</Link>
      </p>
      <h1>Counting visits</h1>
      <p className="lead">
        This site counts visits to work out which pages are used and how quickly they load. That is
        the only thing the counts are for, and nothing here is used to build a picture of you.
      </p>
      <hr />

      <h2>What is measured</h2>
      {/*
        Both are Vercel's own products, and what each collects is Vercel's published list rather
        than ours: https://vercel.com/docs/analytics/privacy-policy.
      */}
      <p>
        Two things run on this site, both from Vercel, who host it. Web Analytics records that a
        page was viewed, with the time, the address of the page, the site you arrived from, your
        country, and your browser, operating system and device type.
      </p>
      {/*
        **This paragraph used to say Speed Insights was not switched on, "so nothing is being
        collected for it", and that was false.** The product is indeed not switched on — nothing
        reports it back to us — but the script is on the page and its measurements go to Vercel
        anyway: a `/_vercel/speed-insights/vitals` request was captured leaving production on
        21 August 2026, and the project's own `speedInsights.hasData` flipped to `true` while the
        product was off. `docs/infrastructure.md` -> *What the two measurement products were
        observed doing* holds the run.

        This page is one of ADR-0020's two conditions for measuring without a consent banner, and
        the condition is "clear and comprehensive information" — so a sentence telling a reader
        nothing is sent, while something is, is the condition failing rather than a wording nit.
        Corrected by CAN-147 Verify the analytics redaction and opt-out against a real deployment.

        What is deliberately *not* claimed here is what Vercel does with those measurements while
        the product is off. Their documentation does not say, so neither does this page.
      */}
      <p>
        Speed Insights measures how quickly pages drew and responded for you, and sends those
        measurements to Vercel in the same way. We have not switched on the product that reports
        them back to us, so nobody here has seen them — but <strong>they are still sent</strong>,
        and the switch below is what stops them.
      </p>
      <p>
        Neither sets a cookie. Vercel identifies a visit by a hash made from the request itself, and
        discards that hash after 24 hours.
      </p>

      <h2>What the address is reduced to first</h2>
      <p>
        An address on this site can name a Story, an Ordering or a person, so addresses are reduced
        before anything is sent. A Story&rsquo;s address is sent as its shape rather than its
        identity, a page this site does not recognise is sent as no more than the fact that it was
        one, and anything after a question mark is dropped entirely.
      </p>

      <h2>Ask us not to count your visits</h2>
      <ObjectionControl />
      <p>
        This setting belongs to this browser on this device. Setting it elsewhere, or clearing this
        browser&rsquo;s stored data, will not carry it across.
      </p>

      <hr />
      <h2>What is stored on your device</h2>
      <p>
        Asking us not to count your visits stores one entry in this browser, named{" "}
        <code>{objectionKey}</code>, holding the date you asked. It is never sent anywhere. Apart
        from that, the only thing this site stores on your device is the cookie that keeps you
        signed in, and that is set only if you sign in.
      </p>
    </main>
  );
}
