/**
 * **Something is happening, and it is not a blank screen.** Story 35 of CAN-17 v1: the walking
 * skeleton in production, then the founding case asks for exactly that, and a long import is the
 * case it names — so this is the one surface both the route-level fallback and, when
 * CAN-26 Import a series from TMDB, with the overlay behind it lands, an import in progress draw.
 *
 * **The sentence is the indicator and the ring is decoration**, which is the way round that
 * survives a screen reader, a forced-colours mode and `prefers-reduced-motion` — all three of which
 * take the ring's appearance away and none of which touches the words. `globals.css` draws the ring
 * from a pseudo-element for the same reason: there is nothing there for an assistive technology to
 * meet.
 *
 * `role="status"` announces the words if they arrive after the page did. Where this is the first
 * paint there is no change to announce, and a reader meets it as ordinary text — which is correct,
 * not a shortcoming.
 */
export function Working({ children }: { children: string }) {
  return (
    <p className="working" role="status">
      {children}
    </p>
  );
}
