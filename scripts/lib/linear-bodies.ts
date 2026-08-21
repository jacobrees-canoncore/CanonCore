// The three checks behind `scripts/check-linear-bodies.ts`.
//
// Linear stores rich text, not the markdown you send it, and the save rewrites two things on the way
// through: an emphasis run carrying a newline comes back closed and reopened around the break, and a
// bare ticket reference is linkified — which breaks the emphasis run *that* one sat in. One subject,
// so one module. The rules, the evidence and the measurements live in docs/agents/issue-tracker.md,
// one section each: Keep an emphasis run on one line, and check the stored body; and A bare
// identifier does not survive the sync. This file does not restate them.
//
// Three checks, doing two jobs:
//
//   findSplitEmphasis    ) the pre-send GUARD, on markdown you authored. Answers "is this safe to
//   findBareReferences   ) send?" — and it takes both, because either one alone lets damage through.
//
//   findStrayAsterisks     the post-write DETECTOR, on a body Linear has stored. Answers "did the
//                          round trip damage it?"
//
// The guard cannot be the detector: once Linear has split a run, every fragment is a whole run on one
// line, so the guard reads a mangled body as clean. Asserted in `linear-bodies.test.ts`.
//
// All three read `text` nodes only, which is what makes them runnable rather than merely correct. A
// body may quote the very thing being hunted, and a grep then reports the ticket documenting the
// check as failing it. Code spans and fences are their own node types carrying their own values, so
// parsing excludes them by construction instead of by a strip somebody has to maintain.
//
// Everything here is pure: markdown in, positions out. The CLI owns talking to `orca linear`.

import type { Nodes } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toString } from "mdast-util-to-string";

/** One asterisk left in rendered text: where to look, in the coordinates the body reads in. */
export type StrayAsterisk = {
  line: number
  column: number
}

/** One emphasis run whose opening and closing markers sit on different lines. */
export type SplitEmphasis = {
  startLine: number
  endLine: number
  /** What the run renders to, since that is how an author recognises which one it is. */
  text: string
}

/** One ticket or pull-request reference a save can convert. */
export type BareReference = {
  reference: string
  line: number
  /**
   * Where it sits, and each is a distinct way the save reaches it: loose in the text; as the whole
   * of a link's text, which the GitHub sync rewrites; or inside a code span that is the only thing
   * an emphasis run wraps, which loses the code mark and leaves the reference bare.
   */
  form: "prose" | "link text" | "lone code span in emphasis"
}

/**
 * Every node in document order — including any nested in a blockquote, a list or a link — carrying
 * the innermost link it sits inside, which is what the reference check needs and the other two
 * ignore.
 */
function* descendants(
  nodes: readonly Nodes[],
  link: Nodes | null = null,
): Generator<[Nodes, Nodes | null]> {
  for (const node of nodes) {
    yield [node, link];
    if ("children" in node) yield* descendants(node.children, node.type === "link" ? node : link);
  }
}

/**
 * Every `text` node with a usable source span, which is all three checks read — flattened to the
 * four things they use, so no caller has to assert away the optional position again.
 *
 * Every node `fromMarkdown` produces carries one; the type admits none because the field "must not
 * be present if a node is generated" [1], which is a tree built by hand rather than read.
 *
 * [1] https://github.com/syntax-tree/unist#position
 */
type TextSpan = { value: string; line: number; from: number; to: number; link: Nodes | null }

function* textSpans(markdown: string): Generator<TextSpan> {
  for (const [node, link] of descendants(fromMarkdown(markdown).children)) {
    if (node.type !== "text") continue;
    const { start, end } = node.position ?? {};
    if (start?.offset === undefined || end?.offset === undefined) continue;
    yield { value: node.value, line: start.line, from: start.offset, to: end.offset, link };
  }
}

/** Offset to line and column, both 1-based, as every editor and every error message counts them. */
function positioner(body: string) {
  const starts = [0];
  for (let i = 0; i < body.length; i++) if (body[i] === "\n") starts.push(i + 1);
  return (offset: number) => {
    let line = 0;
    while (line + 1 < starts.length && starts[line + 1] <= offset) line += 1;
    return { line: line + 1, column: offset - starts[line] + 1 };
  };
}

/**
 * The offsets of the asterisks in a slice of markdown source that a reader will see as asterisks.
 *
 * Reading the source rather than the parsed value is what separates damage from intent: `\*` is an
 * author showing an asterisk on purpose, and mdast decodes it to a bare `*` in the node's value, so
 * a check that reads values reports every deliberate one as corruption.
 *
 * A backslash therefore consumes the character after it, whatever that character is, rather than
 * only an asterisk — so `\\*` reads as an escaped backslash followed by a stray asterisk, which is
 * what it is.
 */
function* asterisksIn(source: string, from: number): Generator<number> {
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\\") i += 1;
    else if (source[i] === "*") yield from + i;
  }
}

/**
 * The post-write detector: asterisks that survived into rendered text.
 *
 * What it finds is not always Linear's doing — a bare `*` an author wrote in prose lands here too,
 * correctly, since it renders as an asterisk and reads as damage. Both have the same two fixes.
 */
export function findStrayAsterisks(body: string): StrayAsterisk[] {
  const at = positioner(body);
  const found: StrayAsterisk[] = [];
  for (const span of textSpans(body))
    for (const offset of asterisksIn(body.slice(span.from, span.to), span.from)) found.push(at(offset));
  return found;
}

/**
 * Half the pre-send guard: emphasis runs that cross a newline in the markdown you are about to send.
 *
 * Bold and italic alike, and asymmetrically better than splitting the text on `**` and testing the
 * odd-index parts for a newline: that form cannot see an italic run at all, and its parity slips
 * wherever markup already sits between the markers.
 *
 * Line length is not the hazard and is not checked.
 */
export function findSplitEmphasis(markdown: string): SplitEmphasis[] {
  const found: SplitEmphasis[] = [];
  for (const [node] of descendants(fromMarkdown(markdown).children)) {
    if (node.type !== "emphasis" && node.type !== "strong") continue;
    const { start, end } = node.position ?? {};
    if (!start || !end || start.line === end.line) continue;
    found.push({ startLine: start.line, endLine: end.line, text: toString(node) });
  }
  return found;
}

// Longest alternative first, so `CanonCore#212` is reported once rather than also as `#212`. The
// lookbehind keeps `#` from matching inside a word or an HTML entity.
const REFERENCE = /CanonCore#\d+|\bCAN-\d+|(?<![\w&])#\d+/g;

/**
 * The other half of the guard: every reference in a body that a save can convert.
 *
 * A link is immune when its text carries more than the reference — that is the documented defence,
 * and it is what makes `[PR #59](<url>)` correct rather than a finding. A link whose text *is* the
 * reference is the worst form of all, because the GitHub sync rewrites that text into a number
 * naming a different ticket while the link still points here.
 *
 * **This is about Linear bodies, not about this repository's markdown**, where a reference written as
 * number-plus-title in plain text is the prescribed form. Inside a Linear body the same text is a
 * hazard: the number linkifies on the save.
 */
export function findBareReferences(body: string): BareReference[] {
  const found: BareReference[] = [];

  // A code span protects a reference — measured over nineteen of them on 21 August 2026 — with one
  // exception. An emphasis run wrapping nothing but a code span comes back with the code mark gone
  // and the reference linkified; the same run carrying any other text keeps it, restructured. So the
  // hazard is the empty run, not the code span, and this is the only shape parsing cannot see as
  // text: `inlineCode` carries its own value.
  for (const [node] of descendants(fromMarkdown(body).children)) {
    if (node.type !== "emphasis" && node.type !== "strong") continue;
    const [only] = node.children;
    if (node.children.length !== 1 || only.type !== "inlineCode") continue;
    for (const match of only.value.matchAll(REFERENCE))
      found.push({
        reference: match[0],
        line: only.position?.start.line ?? 0,
        form: "lone code span in emphasis",
      });
  }

  for (const { value, line, link } of textSpans(body)) {
    if (link !== null && toString(link).trim() !== value.trim()) continue;
    for (const match of value.matchAll(REFERENCE)) {
      if (link && toString(link).trim() !== match[0]) continue;
      const newlines = value.slice(0, match.index).match(/\n/g)?.length ?? 0;
      found.push({ reference: match[0], line: line + newlines, form: link ? "link text" : "prose" });
    }
  }
  return found;
}
