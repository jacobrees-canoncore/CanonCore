---
status: accepted
---

# Two levels: Story and Version

A media record needs to group "the same thing in different forms" without losing that the forms
differ in length and content. We model exactly two levels. A **Story** is the thing that
happened, independent of how anyone consumes it. A **Version** is one specific way it can be
watched, read or listened to, whole or in part.

## Considered options

IFLA LRM's four levels (Work / Expression / Manifestation / Item) and BIBFRAME's three
(Work / Instance / Item) were both rejected. The candidate third level is the *release* — the
disc, the file, the packaging — which answers "which physical object is this". LRM's own examples
of what makes a new Manifestation are "a change in typeface, size of font, page layout" and "a
change from paper to microfilm". This product never asks those questions: it asks "have I
consumed this" (a Version question) and "where can I get it" (a text field).

LRM explicitly permits the omission: "It is possible for a compatible implementation to omit one
of the entities declared in IFLA LRM."

The one real argument for a third level is that a single release can carry two cuts, which is why
LRM makes Expression↔Manifestation "the only many-to-many relationship among the WEMI entities".
We accept the duplication instead: two Version rows sharing a location string.

Note which direction the regret runs. BIBFRAME collapsed a level and then had to add `bf:Hub` in
2021 to recover grouping. The level people miss is the *top* one, which collocates versions.
Nobody has ever had to add Item back.

## The boundary rule

LRM refuses to fix the line between a new expression and a new work — "the model does not
prescribe the level of adaptation required… is agnostic as to what 'should' be done" — so it is
ours to draw and to write down:

**Change of form alone is a Version. New authored text is a new Story.**

A narrated-soundtrack reconstruction of a lost serial is a Version of it. A novelisation of the
same serial is a separate Story with an `adapted from` edge, because reading it is not watching
the serial, and because chronologies place prose and television as independent entries.

## Consequences

- Runtime, length and completeness-of-coverage belong to the Version. LRM puts `Extent` on
  Expression; EIDR makes `ApproximateLength` mandatory and non-inheritable on every Edit.
- A Version carries a multi-valued *reason* (extended, shortened, omnibus, censored, restored,
  colourised, reconstruction, abridged, translated, re-narrated), following EIDR's `EditClass`,
  because one Version can be several at once. Runtime is not a reason; it is a consequence.
- Ownership and location are attributes of a Version, not a level beneath it.
- A Story may carry a nullable pointer to a canonical Version, so it can state a runtime and a
  year without adjudicating which of fifteen releases is the real one. LRM's "representative
  expression attribute" exists for this and permits leaving the source unidentified.
