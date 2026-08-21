/**
 * How long a Version runs, as a sentence — 45 minutes, 3 hours 8 minutes 30 seconds.
 *
 * **Seconds are kept rather than rounded away.** A runtime is an `interval` in the database
 * (`db/schema.ts` → `version.runtime`), so it can carry them, and a Version that states 22:38 would
 * be misreported by a display that only knows minutes. What is left out is a part that is *zero*,
 * in every position: nobody says "one hour zero minutes thirty seconds".
 *
 * A runtime is always positive — `version_runtime_is_positive` in the schema — and a Version with
 * none at all is a `null` the caller renders differently, so there is no zero case here.
 */
export function formatRuntime(seconds: number): string {
  const parts: [number, string][] = [
    [Math.floor(seconds / 3600), "hour"],
    [Math.floor(seconds / 60) % 60, "minute"],
    [seconds % 60, "second"],
  ];

  return parts
    .filter(([count]) => count > 0)
    .map(([count, unit]) => `${count} ${unit}${count === 1 ? "" : "s"}`)
    .join(" ");
}
