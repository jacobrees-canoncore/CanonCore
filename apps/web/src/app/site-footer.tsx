import { reportingAddress } from "@canoncore/config";

/**
 * The footer, on every page, and it exists for one obligation rather than for symmetry.
 *
 * **ICU D2 and PCU D2 of the Online Safety Act Codes put the reporting route in the footer of every
 * page** — [`code-measures-register.md`](../../../../docs/compliance/code-measures-register.md) —
 * and nothing satisfied that until CAN-89 Give the product a visual identity and a reading surface,
 * because the application had no footer. A reporter needs no account and does not have to be a user
 * at all, so the route is an ordinary email address rather than a form behind a sign-in.
 *
 * **The `href` is composed, and that is not the change the illegal-content assessment watches for.**
 * [`illegal-content-risk-assessment.md`](../../../../docs/compliance/illegal-content-risk-assessment.md)
 * → *Step 4* names "an `href` derived from a value rather than written as a literal", and what it
 * means by a value is one that arrived from outside — a Source, a Provider, or something a person
 * typed. `reportingAddress` is a compile-time constant in `packages/config` and can be none of
 * those. [`no-linkification.test.tsx`](no-linkification.test.tsx) pins the composed result in the
 * closed set anyway, which is the assertion that record rests on rather than this argument.
 *
 * **The terms of service are not linked here yet**, and that is deliberate:
 * CAN-32 Roles, takedown, and the Online Safety Act surfaces owns rendering the two documents in
 * `content/legal/`, and a footer link to a route that answers 404 would be worse than its absence.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <a href={`mailto:${reportingAddress}`}>Report content</a>
      <a href="/privacy/analytics">How visits are counted</a>
    </footer>
  );
}
