// @vitest-environment node
//
// This one runs `eslint` over source text rather than rendering anything, and jsdom's `URL`
// is not the one `node:url` accepts.
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

/**
 * The accessibility rules this application lints against are inherited from
 * `@canoncore/config/eslint`, and every way that inheritance can break is silent — nothing
 * throws, and the lint run stays green while checking less than it claims to:
 *
 * - Spread **before** the `eslint-config-next` entries instead of after, and Next's six
 *   `warn`-level rules win. Violations report as warnings, `eslint` exits 0, and the gate that
 *   was supposed to fail a push passes it.
 * - Spread **after** them, which is correct, and `alt-text` loses the options Next set with it.
 *   The rule entry is replaced wholesale rather than merged, so `img: ["Image"]` goes with it and
 *   `next/image`'s `<Image>` stops being checked — while the rule count goes up.
 *
 * So this asserts behaviour rather than configuration: what `eslint` actually reports for a
 * violation of each kind, at what severity. **CAN-52 Lint the accessibility rules
 * eslint-config-next leaves off** is where both traps are set out.
 */
const eslint = new ESLint({
  cwd: fileURLToPath(new URL(".", import.meta.url)),
});

/**
 * What `eslint` reports for `source`, linted as a component under `src/app`.
 *
 * A fixture that fails to parse reports one fatal message and no rule ever runs, which would
 * otherwise read as "the rule found nothing" in every assertion below. So it throws instead.
 */
async function messagesFor(source: string, filePath = "src/app/accessibility-fixture.tsx") {
  const [result] = await eslint.lintText(source, { filePath });

  const fatal = result.messages.find((message) => message.fatal);
  if (fatal) {
    throw new Error(`The fixture did not parse: ${fatal.message}`);
  }

  return result.messages;
}

/** The messages `rule` alone reported, so an unrelated rule firing cannot pass this. */
async function messagesFrom(rule: string, source: string, filePath?: string) {
  return (await messagesFor(source, filePath)).filter((message) => message.ruleId === rule);
}

/** ESLint's own numbering: 1 is `warn`, 2 is `error`. Only 2 fails a run. */
const error = 2;

describe("the accessibility rules apps/web lints against", () => {
  it("fails a bare <img> with no alt text, as an error rather than a warning", async () => {
    const messages = await messagesFrom(
      "jsx-a11y/alt-text",
      `export function Fixture() {
         return <img src="/founding-story.png" />;
       }`,
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(error);
  });

  it("fails next/image's <Image> with no alt text, which Next's own option is what teaches it", async () => {
    const messages = await messagesFrom(
      "jsx-a11y/alt-text",
      `import Image from "next/image";

       export function Fixture() {
         return <Image src="/founding-story.png" width={320} height={180} />;
       }`,
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(error);
  });

  it("still fails the elements Next's own option leaves out, so severity was raised without narrowing", async () => {
    const messages = await messagesFrom(
      "jsx-a11y/alt-text",
      `export function Fixture() {
         return <object data="/founding-story.pdf" />;
       }`,
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(error);
  });

  it("fails a rule eslint-config-next does not enable at all", async () => {
    const messages = await messagesFrom(
      "jsx-a11y/click-events-have-key-events",
      `export function Fixture() {
         return <div onClick={() => {}} />;
       }`,
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(error);
  });

  it("passes accessible markup, so the rules above fail on the violation rather than on the fixture", async () => {
    const messages = await messagesFor(
      `import Image from "next/image";

       export function Fixture() {
         return (
           <button type="button" onClick={() => {}}>
             <Image src="/founding-story.png" alt="The founding Story" width={320} height={180} />
           </button>
         );
       }`,
    );

    expect(messages.filter((message) => message.ruleId?.startsWith("jsx-a11y/"))).toEqual([]);
  });
});

/**
 * **Nothing rendered is linkified, whatever wrote it** — the lint half of the control that finding
 * 2c of `docs/compliance/illegal-content-risk-assessment.md` rests on, widened from user free text
 * to text of any origin by **CAN-108 Re-assess the illegal-content risk before a user can paste an
 * arbitrary Provider URL**.
 *
 * A statutory record naming two rules is worth what the rules actually do, and the same silence
 * applies here as above: merge this block into the `process.env` one and its `ignores` come with
 * it, exempting every `*.test.tsx` from a control that has no business exempting them — with
 * nothing throwing and the run staying green. The third case is the one that catches that.
 *
 * What is deliberately **not** asserted is the boundary of the import group. It matches package
 * names, so a renderer it does not name gets through; pinning that with a test would turn widening
 * the list into a failing build. The limitation is carried in prose, in the assessment and in
 * `eslint.config.mjs`, where it can be read rather than enforced.
 */
describe("the non-linkification rules apps/web lints against", () => {
  it("refuses the dangerous prop, which is the one way a plain string becomes markup", async () => {
    const messages = await messagesFrom(
      "react/no-danger",
      `export function Fixture({ prose }: { prose: string }) {
         return <div dangerouslySetInnerHTML={{ __html: prose }} />;
       }`,
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(error);
  });

  it("refuses a named markdown renderer, which needs no dangerous prop to emit an anchor", async () => {
    const messages = await messagesFrom(
      "no-restricted-imports",
      `import ReactMarkdown from "react-markdown";

       export const Fixture = ReactMarkdown;`,
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(error);
  });

  it("refuses both in a test file too, which the process.env block's ignores would have exempted", async () => {
    const messages = await messagesFor(
      `import ReactMarkdown from "react-markdown";

       export function Fixture({ prose }: { prose: string }) {
         return <ReactMarkdown><span dangerouslySetInnerHTML={{ __html: prose }} /></ReactMarkdown>;
       }`,
      "src/app/linkification-fixture.test.tsx",
    );

    expect(
      messages
        .filter((m) => m.ruleId === "react/no-danger" || m.ruleId === "no-restricted-imports")
        .map((m) => m.severity),
    ).toEqual([error, error]);
  });

  it("passes prose rendered as prose, so the rules above fail on the violation not the fixture", async () => {
    const messages = await messagesFor(
      `export function Fixture({ prose }: { prose: string }) {
         return <p>{prose}</p>;
       }`,
    );

    expect(
      messages.filter(
        (m) => m.ruleId === "react/no-danger" || m.ruleId === "no-restricted-imports",
      ),
    ).toEqual([]);
  });
});
