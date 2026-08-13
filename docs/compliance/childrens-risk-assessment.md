# Children's risk assessment

**INTERNAL RECORD — NOT PUBLISHED.** Kept to satisfy `s.23(2)`.

Required because the [children's access assessment](childrens-access-assessment.md) concludes that the
child user condition is **met**, which engages the `s.11` children's risk assessment duty, the `s.12`
children's safety duties and Ofcom's *Protection of Children Codes of Practice*.

| | |
| --- | --- |
| Service name | CanonCore (`https://www.canoncore.com`) |
| Service type | User-to-user service |
| Completion date | 13 August 2026 — the same day as the children's access assessment it follows from, well inside the three months `s.11` allows |
| Next review date | 13 August 2027 — at least annually |
| Completed by | Jacob Rees |
| Named person responsible | Jacob Rees |
| Approved by | Jacob Rees — sole operator; see [`accountable-individual.md`](accountable-individual.md) |

Structure follows Ofcom's *Protection of children duties: record-keeping template* and the four-step
process in the *Children's Risk Assessment Guidance and Children's Risk Profiles*.

The description of the service, the functionality it has, and the functionality it deliberately lacks are
set out in the [illegal content risk assessment](illegal-content-risk-assessment.md) and are not repeated
here. They carry most of the findings below in exactly the same way.

## Step 1 — Content harmful to children, and the risk factors

Ofcom's Children's Risk Profiles have been consulted.

**The risk factors relevant to this service** are the same short set identified in the illegal content
assessment: user profiles; users without accounts; and child users. Fork is out of scope for v1 (CAN-9),
so the re-posting and forwarding factor does not apply at launch. The factors Ofcom most strongly associates with harm to children are **absent**: there is no
recommender system, no group messaging, no direct messaging, no livestreaming, no commenting, and no
image or video posting.

### Age groups

Ofcom expects children in different age groups to be considered separately. The service sets a minimum
age of 13 in its terms, so the relevant population is 13 to 17. Younger children are not permitted, though
no age assurance enforces this, so the assessment does not assume their absence.

> ⚠️ **The minimum age of 13 originates in no ticket or ADR.** It was introduced when the terms of
> service were drafted, because ICU G3.2(c) requires the terms to be written to a reading age
> comprehensible for the youngest permitted user, and that question has to have an answer. Thirteen is the
> common default and matches most comparable services. **Confirming or changing it is a criterion on
> [CAN-44 Make the Online Safety Act records live, and create the reporting address](https://linear.app/jacobrees-canoncore/issue/CAN-44)**,
> so it is owned rather than merely pending. If it changes, the reading age of the terms, the ICU D2.3(e)
> and ICU G3.2(c) lines in the [Code measures register](code-measures-register.md), and this section all
> change with it.

## Step 2 — Risk of each kind of content harmful to children

Levels are negligible / low / medium / high. Where evidence is not conclusive the higher level is taken.
As in the illegal content assessment, **no finding here rests on the service being small.**

### Primary priority content

| Kind | Level | Reasoning |
| --- | --- | --- |
| Pornographic content | **Low** | No image or video can be uploaded, and no media bytes are stored or served (ADR-0006), so the usual form of this content cannot exist here. Written text remains possible. Prohibited for all users in the terms of service. The catalogue may record adult works, which is not the same thing as carrying pornographic content: see [Adult works in the catalogue](#adult-works-in-the-catalogue-and-why-they-do-not-change-the-finding) below, and the artwork constraint that holds this finding at low |
| Content encouraging, promoting or instructing **suicide** | **Low** | Text-only, and severe. Ofcom's rule that high severity defeats a low finding even at small volumes applies with full force, so this is held at low by active mitigation rather than by absence of risk: prohibition in the terms, a reviewable corpus, reporting, and swift takedown |
| Content encouraging, promoting or instructing **self-harm** | **Low** | As above. Note that encouraging or assisting serious self-harm also became a priority *offence* in December 2025, so it is assessed in the illegal content assessment as well |
| Content encouraging, promoting or instructing **eating disorders** | **Low** | Text-only. No image posting, no recommender and no virality mechanics, which are the features Ofcom associates with this harm spreading |

### Priority content

Ofcom's tool assesses **eight** kinds, not five: "abusive" and "incites hatred" are separate, and violent
content is split three ways. The coarser five-item list on Ofcom's summary web page is not the list to
work from.

| Kind | Level | Reasoning |
| --- | --- | --- |
| Abusive content | **Low** | A genuine text vector: Arguments are opinionated prose about works, creators and other fans, and public Visibility carries it to any reader. No mechanism argument available. Mitigated by prohibition, review, reporting and takedown |
| Content which incites hatred | **Low** | As above, and assessed separately as Ofcom requires. Also assessed as an illegal harm |
| Bullying content | **Low** | There is no way to direct content at a person here: no messaging, no comments, no mentions, no replies, no user connections. Content can be *about* someone but cannot be *sent to* them, which removes the mechanism most bullying depends on |
| Violent content (provides instructions for) | **Low** | Text instructions are possible in principle. Nothing about the service invites them, and there is no upload, no messaging and no linkification |
| Violent content (humans) | **Low** | No image or video upload. **Cataloguing a violent work and describing it factually is the service's ordinary purpose and is not itself violent content**; the risk is authored text going beyond description |
| Violent content (animals or fictional creatures) | **Low** | As above. Note that a great deal of legitimate catalogue content concerns fictional violence, which is precisely why the distinction between describing a work and depicting harm matters here |
| Harmful substances content | **Low** | No marketplace, no listings, no messaging, no linkification |
| Dangerous stunts and challenges content | **Low** | Characteristically video-based and spread by virality. No video, no recommender, no engagement ranking and no sharing mechanic at all, since Fork is out of scope for v1. Text instructions remain possible in principle |

### Non-designated content

| Kind | Level | Reasoning |
| --- | --- | --- |
| Depression content | **Negligible** | Ofcom's *Children's Register of Risks* names this as non-designated content. There is no mechanism for it here: no personal posting, no feed, no social interaction of any kind. The service records works, not states of mind |
| Body stigma content | **Negligible** | As above. No image posting, no profiles carrying personal appearance, no comparison or social feedback mechanic |

**No other non-designated content is identified**, and the service's principal purpose is not to host or
disseminate any kind of content harmful to children.

> **If non-designated content is ever identified on this service, Ofcom must be notified** by email at
> `nondesignatedcontent@ofcom.org.uk`: "Where you provide a user-to-user service and you identify that
> non-designated content is present on your service then you must notify Ofcom using the following email
> address" ([Ofcom, *Protection of children duties under the Online Safety Act*](https://www.ofcom.org.uk/online-safety/protecting-children/protection-of-children-duties-under-the-online-safety-act)). This is a duty specific to user-to-user services and is easy to
> miss. [`review-policy.md`](review-policy.md) → *Review cycle* carries it as a standing obligation, with
the address, so that a reader working through the review schedule meets it.

**Overall: low for every kind of content harmful to children, and no non-designated content identified.**

## Step 3 — Safety measures

### Age assurance is not required, and why

`s.12(4)` would otherwise require highly effective age verification or age estimation for primary priority
content. **`s.12(5)` removes that requirement where the terms of service prohibit every kind of primary
priority content for all users**, which is what the [terms of service](../../content/legal/terms-of-service.md)
do. That prohibition is therefore load-bearing and must not be weakened or removed without reopening this
assessment and provisioning age assurance.

### Measures

The *Protection of Children Codes of Practice* (PCU) measures are recorded in
[`code-measures-register.md`](code-measures-register.md).

The measure set was obtained from Ofcom's *Check how to comply with the protection of children rules*
tool, run as this service with the levels above, a user base below 700,000, terms prohibiting all four
kinds of primary priority content, and no principal purpose of hosting harmful content. **Ofcom reference
code `POCVMT95NIB`**, retained so the run can be resumed rather than repeated.

> **The Step 2 levels are what keep PCU B5 out of scope, so raising one is an age-assurance decision.**
> Every one of the eight kinds of priority content above is assessed **low**, and that is the fact B5's
> applicability test turns on. The measure, and what raising a level would cost, are in
> [`code-measures-register.md`](code-measures-register.md) → *PCU B5, which the tool did not return*.

### Existing controls

The controls listed in the illegal content assessment apply unchanged, and carry the same weight here. The
two that matter most for children specifically:

- **No recommender, ranking or engagement signal.** Ofcom treats algorithmic amplification as the single
  biggest driver of children encountering harmful content. There is none.
- **No route from one user to another.** No messaging, comments, mentions or connections, which removes
  bullying, grooming and pressure mechanics at the level of design rather than policy.

## Adult works in the catalogue, and why they do not change the finding

> The decision itself is [ADR-0012](../adr/0012-adult-works-catalogued-artwork-never-displayed.md).
> This section records how it bears on the assessment.

The catalogue is deliberately unbounded: any work may be recorded, including pornographic films, which
TMDB carries and marks with an `adult` flag. This was considered directly rather than avoided, because
the alternative reading would be that recording an adult film's existence is itself pornographic content.

**It is not.** `s.236(1)` defines "pornographic content" as "content of such a nature that it is
reasonable to assume that it was produced solely or principally for the purpose of sexual arousal"
([s.236](https://www.legislation.gov.uk/ukpga/2023/50/section/236)). A title, a year, a runtime and a `part of` edge are not that. Recording that a
pornographic film exists is not hosting pornography, which is why a catalogue can carry the record
without carrying the content.

**Three structural facts keep it that way**, and all three predate this assessment:

1. **No bytes, ever.** [ADR-0006](../adr/0006-no-playback-hand-off-to-media-servers.md) records that
   CanonCore "never holds or serves bytes" and that Location is "deliberately not a path the product can
   open, browse or resolve". Media is never stored, transcoded or streamed here.
2. **Playback is a hand-off, not a stream.** When media server integration lands (CAN-6), CanonCore tells
   a Plex or Jellyfin server the person already runs to play something on their own device, and receives
   progress back, without touching a byte. The pornography, if any, exists on their server and never on
   this service.
3. **Ownership, Location and Progress are never shared.** Fork is out of scope for v1, and when it does
   land it copies titles, runtimes, Placements and
   Arguments; it explicitly does not copy Ownership, Location, Progress or private notes
   (`CONTEXT.md`). So the records that bind a person to actual media are structurally incapable of
   becoming another user's content.

### The one real exposure: artwork

**The only thing CanonCore would ever display that could itself be pornographic content is a poster.**

This is closed by a mechanism CAN-13 already builds for licensing reasons: every image is a row carrying
its type, source and licence, and a **`display_permitted` flag the public renderer refuses to override**.

**Artwork for adult-flagged records must carry `display_permitted = false`.** That single constraint is
what holds the pornographic content finding above at low, and what keeps highly effective age assurance
out of scope under `s.12(5)`.

Two acceptance criteria follow, in tickets rather than here:

- **CAN-26** must carry TMDB's `adult` flag through onto the Snapshot, so the renderer has something to
  decide on. Records themselves are imported normally and are not filtered out.
- **CAN-13** must set `display_permitted = false` for artwork on adult-flagged records, and the public
  renderer must refuse to override it.

**If adult artwork ever becomes publicly displayable, this assessment is wrong and must be redone**, and
`s.12(4)` age assurance comes into scope with it.

## Step 4 — Review

Per [`review-policy.md`](review-policy.md): at least annually, before any significant change to design or
operation, and when Ofcom materially changes a relevant Children's Risk Profile.

**Changes requiring this assessment to be redone before they ship**, in addition to those listed in the
illegal content assessment:

- Removing or weakening the primary priority content prohibition in the terms, which would trigger the
  `s.12(4)` age assurance requirement.
- Adding a recommender, ranking or engagement signal of any kind.
- **Making artwork on adult-flagged records publicly displayable**, which is the single change that would
  bring age assurance into scope.
- Storing or serving media bytes, or streaming through CanonCore rather than handing off, either of which
  would reverse ADR-0006 and reopen this assessment entirely.
- Lowering the minimum age below 13.
