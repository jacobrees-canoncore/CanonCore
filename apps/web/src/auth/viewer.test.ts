// @vitest-environment node
import { expect, test } from "vitest";
import { anonymous } from "@/db/session";
import { sessionUserFor } from "./viewer";

/**
 * The one branch in `viewer.ts` that a test can reach without a request.
 *
 * `readViewer` reads `next/headers`, which exists only inside a Next request — so what it does is
 * asserted end to end in [`../db/rls.test.ts`](../db/rls.test.ts), against a real cookie and a real
 * database. What is left here is the *translation*, and it is worth its own test because the empty
 * string is a value with a meaning: `session.ts` says why the anonymous path is a value rather than a
 * second code path, and `story_owner_id_not_blank` is what makes it match no owner.
 */
test("a signed-in reader's own id is the session user", () => {
  expect(sessionUserFor({ userId: "a-real-id", email: "someone@example.invalid" })).toBe(
    "a-real-id",
  );
});

test("nobody is the anonymous session user, which owns nothing", () => {
  expect(sessionUserFor(undefined)).toBe(anonymous);
  expect(sessionUserFor(undefined)).toBe("");
});
