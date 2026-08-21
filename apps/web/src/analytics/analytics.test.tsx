import { render } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { Measurement } from "./analytics";
import { beforeSend } from "./before-send";
import { objectionKey } from "./opt-out";

afterEach(() => window.localStorage.clear());

describe("beforeSend", () => {
  test("sends a recognised page with its URL intact", () => {
    expect(beforeSend({ type: "pageview", url: "https://www.canoncore.com/sign-in" })).toEqual({
      type: "pageview",
      url: "https://www.canoncore.com/sign-in",
    });
  });

  // The return keeps the rest of the event, which is about this staying a total function of its
  // argument rather than about what is sent: neither vendor script reads anything but `url` back.
  // What they *do* send beside it is the route, which never reaches here at all — `analytics.tsx`
  // holds that finding and the fix.
  test("redacts the URL and returns the rest of the event unchanged", () => {
    expect(
      beforeSend({ type: "vital", url: "https://www.canoncore.com/story/1?x=y", route: "/story/*" }),
    ).toEqual({ type: "vital", url: "https://www.canoncore.com/story/*", route: "/story/*" });
  });

  test("drops the event outright once an objection has been recorded", () => {
    window.localStorage.setItem(objectionKey, "2026-08-21T00:00:00.000Z");
    expect(beforeSend({ type: "pageview", url: "https://www.canoncore.com/" })).toBeNull();
  });

  test("drops the event when the URL will not parse", () => {
    expect(beforeSend({ type: "pageview", url: "not-a-url" })).toBeNull();
  });
});

describe("Measurement", () => {
  // Both vendor components render `null` and inject their script from an effect, so there is
  // nothing to assert about the output. What matters is that mounting it is not what decides
  // whether a visitor is measured — `beforeSend` above is — and that it renders at all.
  test("renders without putting anything in the document", () => {
    const { container } = render(<Measurement />);
    expect(container.innerHTML).toBe("");
  });
});
