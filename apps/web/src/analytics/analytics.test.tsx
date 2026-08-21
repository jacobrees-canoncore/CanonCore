import { render } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { Measurement, beforeSend } from "./analytics";
import { objectionKey } from "./opt-out";

afterEach(() => window.localStorage.clear());

describe("beforeSend", () => {
  test("sends a recognised page with its URL intact", () => {
    expect(beforeSend({ type: "pageview", url: "https://www.canoncore.com/sign-in" })).toEqual({
      type: "pageview",
      url: "https://www.canoncore.com/sign-in",
    });
  });

  test("redacts the URL rather than the rest of the event", () => {
    expect(
      beforeSend({ type: "vital", url: "https://www.canoncore.com/story/1?x=y", route: "/story/[id]" }),
    ).toEqual({ type: "vital", url: "https://www.canoncore.com/story/*", route: "/story/[id]" });
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
