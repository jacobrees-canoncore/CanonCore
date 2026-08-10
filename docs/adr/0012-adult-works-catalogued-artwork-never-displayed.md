# Adult works may be catalogued; their artwork is never displayed

The catalogue is unbounded: any work may be recorded, including pornographic films. Their **artwork is
never publicly displayed**, and that single constraint is what keeps highly effective age assurance out of
this product.

## Why

**Recording that a work exists is not carrying the content.** `s.236(1)` defines "pornographic content" as
content "of such a nature that it is reasonable to assume that it was produced solely or principally for
the purpose of sexual arousal"
([s.236](https://www.legislation.gov.uk/ukpga/2023/50/section/236)). A title, a year, a runtime and a
`part of` edge are not that. The alternative reading, that cataloguing an adult film is itself carrying
pornography, would make a library catalogue a pornographic service.

**The exposure is artwork, and only artwork.** A poster for a pornographic film plausibly *is*
pornographic content, and it is the one thing this product would ever display that could be. Everything
else about the record is text.

**That matters because of what "allows pornography" costs.** Since 25 July 2025 every service that allows
pornographic content must have highly effective age assurance
([Ofcom, *Age checks to protect children online*](https://www.ofcom.org.uk/online-safety/protecting-children/age-checks-to-protect-children-online)).
"Highly effective" excludes self-declaration, so a tick-box saying "I am 18" does not satisfy it: it means
facial age estimation, credit card, digital ID or mobile-operator checks, with a vendor and a bill. That
is disproportionate for this service, and `s.12(5)` avoids it entirely where the terms prohibit primary
priority content for all users.

**Playback does not change the analysis.** [ADR-0006](0006-no-playback-hand-off-to-media-servers.md)
means CanonCore "never holds or serves bytes" and that Location is "deliberately not a path the product
can open, browse or resolve". When media server integration lands, CanonCore tells a server the person
already runs to play something on their own device. The pornography, if any, is on their server and never
here. And `CONTEXT.md` records that a Fork copies titles, runtimes, Placements and Arguments but **not**
Ownership, Location or Progress, so the records binding a person to actual media cannot become another
user's content.

**Excluding adult works instead was the runner-up and is what Trakt does**, filtering them out of its TMDB
import. It is simpler and has nothing to get wrong later. It was rejected because it contradicts the
unbounded catalogue this product exists to be, and because the exposure it avoids is one flag on a
mechanism [CAN-13](https://linear.app/jacobrees-canoncore/issue/CAN-13) already builds for licensing.
Letterboxd takes the opposite line, carrying adult films behind a per-account setting that is off by
default; note that such a setting is self-declaration and would not by itself satisfy Ofcom once posters
are displayed.

## Consequences

- **The import does not filter adult works.** It carries TMDB's `adult` flag through onto the Snapshot, so
  the renderer has something to decide on.
- **Artwork on adult-flagged records is `display_permitted = false`**, and the public renderer refuses to
  override it. CAN-13 already builds that flag for licensing reasons; this gives it a second job.
- **The terms of service prohibit pornographic content for all users**, which is the `s.12(5)` route out
  of `s.12(4)` age assurance. That clause is load-bearing and must not be weakened without provisioning
  age assurance.
- **Making adult artwork publicly displayable invalidates the children's risk assessment** and brings age
  assurance into scope. It is listed there as a change requiring reassessment before it ships.
- v1 is unaffected either way: CAN-26 imports no artwork at all, and CAN-13 is out of scope for v1.
