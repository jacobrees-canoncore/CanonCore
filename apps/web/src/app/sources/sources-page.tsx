import type { DeclaredSource } from "@/db/sources";
import type { Attribution, CapabilityDeclaration } from "@/providers/declaration";
import { refusalsInForce } from "@/providers/refusals";
import { formatRetention } from "./retention";

/**
 * What every Source this catalogue draws on declares, and what each declaration refuses.
 *
 * **The refusals are the reason this page exists.** A Provider that declares no content
 * classification looks, on any surface that lists what it *does* serve, exactly like one that
 * classifies everything as harmless — so the acceptance criterion on CAN-104 Read a Provider's
 * capability declaration, and refuse what it does not serve asks for that fact to be *stored and
 * surfaced*, not merely honoured. `refusalsInForce` is the list, and it is the same three functions
 * the rules run rather than a restatement of them.
 *
 * **Every value here came from a service nobody in this project has reviewed, and none of it is
 * followable.** Four members of a declaration are URLs — the Source's own address, the licence's,
 * the credit's link and the logo's — and each is rendered as text. So is the logo itself: showing it
 * would be this page fetching an image from that service, which is a different act from displaying
 * a string it sent. [`../no-linkification.test.tsx`](../no-linkification.test.tsx) holds the closed
 * set of addresses this application may render an anchor to, and this page's case is in it.
 *
 * **Displaying the credit is not this page's job**, and the distinction matters: what is drawn here
 * is *what a Source obliges*, for an owner deciding whether to keep drawing on it. Discharging that
 * obligation wherever the Source's values appear is CAN-105 Carry each Source's attribution
 * obligation through to every surface that displays it.
 *
 * **The two timestamps are ISO 8601 rather than prose**, which is the one thing on the page that is
 * not written for reading comfort. `declaredAt` is the Provider's own clock and the only thing that
 * orders two reads, so an instant with its zone on it is the value; a formatted date would drop the
 * zone, and formatting one in a Server Component renders it in the *server's* locale for every
 * reader rather than in theirs.
 *
 * Split from `page.tsx` for `front-page.tsx`'s reason: the page is an async Server Component reading
 * the database, which a render test cannot call without one.
 */
export function SourcesPage({ sources }: { sources: readonly DeclaredSource[] }) {
  return (
    <>
      <h1>Sources</h1>
      <p className="lead">
        Where this catalogue&rsquo;s values come from, what each Source obliges, and what is withheld
        because a Provider does not say.
      </p>
      <hr />
      {sources.length === 0 ? (
        <p className="empty">No Provider has declared a Source yet.</p>
      ) : (
        sources.map((declared) => <SourceEntry key={declared.id} declared={declared} />)
      )}
    </>
  );
}

/** One Source: who declares it, what it obliges, and what its silence refuses. */
function SourceEntry({ declared }: { declared: DeclaredSource }) {
  const { declaration } = declared;
  const refusals = refusalsInForce(declaration);

  return (
    <section>
      <h2>{declaration.source.name}</h2>
      <p className="meta">
        {declaration.source.url}, declared by {declared.providerBaseUrl} as{" "}
        {declaration.source.id}.
      </p>

      <h3>What is withheld</h3>
      {refusals.length === 0 ? (
        <p className="empty">Nothing. This Provider declares everything the application asks for.</p>
      ) : (
        <ul>
          {refusals.map((because) => (
            <li key={because}>{because}</li>
          ))}
        </ul>
      )}

      <h3>How long values may be kept</h3>
      <p>{formatRetention(declaration.retention)}</p>

      <h3>The terms</h3>
      <p>
        {declaration.licence.name} ({declaration.licence.spdx}), published at{" "}
        {declaration.licence.url}.{" "}
        {declaration.licence.shareAlike
          ? "It obliges anything built on this content to carry the same terms."
          : "It does not oblige anything built on this content to carry the same terms."}
      </p>

      <h3>What the terms forbid</h3>
      {declaration.restrictions.length === 0 ? (
        <p className="empty">Nothing this Provider declares.</p>
      ) : (
        <ul>
          {declaration.restrictions.map((restriction) => (
            <li key={restriction}>{restriction}</li>
          ))}
        </ul>
      )}

      <h3>What must be displayed</h3>
      <AttributionOwed attribution={declaration.attribution} />

      <h3>What this Source can say about a record</h3>
      <Vocabulary classification={declaration.classification} />

      <p className="meta">
        Declared {declaration.declaredAt.toISOString()}, read {declared.readAt.toISOString()}.
      </p>
      <hr />
    </section>
  );
}

/**
 * The credit owed, including none at all.
 *
 * Each notice is rendered verbatim, because where a Source prescribes wording an approximation of it
 * breaches the same clause as omitting it. The condition beside it is prose the Provider wrote about
 * *where* the notice belongs, which only this application's own pages can satisfy — so it is shown
 * to the person who has to satisfy it.
 */
function AttributionOwed({ attribution }: { attribution: Attribution }) {
  if (!attribution.required) {
    return <p className="empty">Nothing. This Source obliges no credit at all.</p>;
  }

  return (
    <>
      <ul>
        {attribution.notices.map((notice) => (
          <li key={notice.text}>
            &ldquo;{notice.text}&rdquo;
            {notice.conditions === undefined ? "" : ` ${notice.conditions}`}
          </li>
        ))}
      </ul>
      <p>The credit links to {attribution.link}.</p>
      {attribution.logo === undefined ? null : (
        <p>
          A logo must appear with it: {attribution.logo.url}, described as &ldquo;
          {attribution.logo.alt}&rdquo;.
          {attribution.logo.conditions === undefined ? "" : ` ${attribution.logo.conditions}`}
        </p>
      )}
      <p>
        {attribution.perRecord
          ? "Every record carries its own credit; one covering the Source will not discharge this."
          : "One credit covering the Source discharges this."}
      </p>
    </>
  );
}

/**
 * The classification vocabulary, or the fact that there is none.
 *
 * **A term is shown as the Source's own word, and never matched against one of this application's.**
 * What the application acts on is the flag beside it, which is what lets the rule run without
 * knowing any Source's vocabulary — so the flag is what is rendered next to each term.
 */
function Vocabulary({ classification }: { classification: CapabilityDeclaration["classification"] }) {
  if (!classification) {
    return (
      <p className="empty">
        Nothing. This Provider declares no content classification, which is why its Artwork is
        withheld.
      </p>
    );
  }

  return (
    <ul>
      {classification.map((term) => (
        <li key={term.term}>
          {term.label ?? term.term}
          {term.description === undefined ? "" : `: ${term.description}`}{" "}
          {term.suppressesArtwork
            ? "Artwork for a record carrying this is never displayed."
            : "Artwork for a record carrying this may be displayed."}
        </li>
      ))}
    </ul>
  );
}
