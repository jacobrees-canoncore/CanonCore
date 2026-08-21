// The numbers the Lighthouse gate actually measured, written to the run's own summary page.
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/lighthouse-summary.mts
//
// **The budgets in `lighthouserc.cjs` were derived on a laptop; the gate runs on a shared GitHub
// runner.** `lhci assert` prints numbers only when one breaks, so a green run says nothing about
// how much headroom is left — and a budget nobody can see the distance to is one that is either
// silently loose for ever or about to start flaking. This turns every run into the calibration
// data the next re-baselining needs.
//
// The same reasoning as `scripts/check-docs.ts` writing its whole report to the summary rather
// than only its verdict: docs/agents/workflow.md -> The gates.
//
// Reads what `lhci collect` left in `.lighthouseci/` and takes the worst run per URL, which is the
// `pessimistic` aggregation the assertions use — so these are the numbers that were compared, not
// a friendlier average of them.
import { appendFileSync, readdirSync, readFileSync } from "node:fs";

type Report = {
  finalDisplayedUrl: string;
  audits: Record<string, { numericValue?: number; details?: { items?: ResourceRow[] } }>;
};
type ResourceRow = { resourceType: string; transferSize: number };

const directory = ".lighthouseci";
const worst = new Map<string, { lcp: number; tbt: number; script: number }>();

for (const file of readdirSync(directory).filter((name) => /^lhr-.*\.json$/.test(name))) {
  const report = JSON.parse(readFileSync(`${directory}/${file}`, "utf8")) as Report;
  const script = report.audits["resource-summary"]?.details?.items?.find(
    (item) => item.resourceType === "script",
  );
  const run = {
    lcp: report.audits["largest-contentful-paint"]?.numericValue ?? 0,
    tbt: report.audits["total-blocking-time"]?.numericValue ?? 0,
    script: script?.transferSize ?? 0,
  };
  const url = new URL(report.finalDisplayedUrl).pathname;
  const previous = worst.get(url);
  worst.set(
    url,
    previous === undefined
      ? run
      : {
          lcp: Math.max(previous.lcp, run.lcp),
          tbt: Math.max(previous.tbt, run.tbt),
          script: Math.max(previous.script, run.script),
        },
  );
}

const rows = [...worst.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(
    ([url, run]) =>
      `| \`${url}\` | ${Math.round(run.lcp)} ms | ${Math.round(run.tbt)} ms | ${run.script.toLocaleString("en-GB")} |`,
  );

// A run that measured nothing must not report an empty table as though it were a clean one: the
// assertions would have failed first, but a summary that says "no data" is the honest shape.
const report =
  rows.length === 0
    ? "### Lighthouse\n\nNo reports found in `.lighthouseci/`.\n"
    : [
        "### Lighthouse, worst run per URL",
        "",
        "Budgets and the measurement they came from: `apps/web/lighthouserc.cjs`.",
        "",
        "| URL | LCP | TBT | Script bytes |",
        "| --- | --- | --- | --- |",
        ...rows,
        "",
      ].join("\n");

// Absent when this is run by hand, which is a legitimate way to run it.
const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) appendFileSync(summary, `${report}\n`);
else process.stdout.write(`${report}\n`);
