import { indefinitely } from "@/providers/declaration";

/**
 * A declared retention, as a sentence.
 *
 * **The input is PostgreSQL's canonical ISO 8601 notation**, which is what
 * [`sources.ts`](../../db/sources.ts) reads the column back in — so no week component ever arrives
 * and no fraction of a day does either, both having been normalised into the units below. What may
 * arrive is any of the six, in that order, and `indefinite` for a Source whose terms cap nothing.
 *
 * `runtime.ts` beside the Story page does the same job for a Version's length and is deliberately
 * not shared with this: that one renders a count of seconds and this one a term in somebody's
 * licence, and the two would only ever coincide by accident.
 */
export function formatRetention(retention: string): string {
  if (retention === indefinitely) return "No limit: this Source's terms cap nothing.";

  const parts = retention.match(
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?)?$/,
  );

  // A duration this cannot read is shown as it was declared rather than dropped or guessed at. The
  // parse in `declaration.ts` is what stops a malformed one being stored at all, so reaching this
  // means a notation PostgreSQL emitted and this expression does not cover — which the owner should
  // see rather than have hidden.
  if (!parts) return retention;

  const [, years, months, days, hours, minutes, seconds] = parts;
  const said = [
    count(years, "year"),
    count(months, "month"),
    count(days, "day"),
    count(hours, "hour"),
    count(minutes, "minute"),
    count(seconds, "second"),
  ].filter((part) => part !== undefined);

  return said.length === 0 ? retention : `${said.join(", ")} from when the Source was read.`;
}

/** One component, pluralised, or nothing at all where the duration does not carry it. */
function count(value: string | undefined, unit: string): string | undefined {
  if (value === undefined) return undefined;

  return `${value} ${Number(value) === 1 ? unit : `${unit}s`}`;
}
