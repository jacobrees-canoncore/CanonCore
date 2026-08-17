import { expect, test } from "vitest";
import {
  chooseANewPassword,
  resetLifetime,
  verificationLifetime,
  verifyYourAddress,
} from "./messages";

/**
 * What is worth asserting about email copy, and what is not.
 *
 * Not the wording, which is prose and would make this file a second copy of it. What is worth
 * pinning is the two properties a rewrite silently breaks: that the link is actually in the message,
 * and that **every sentence is true of somebody who did not ask for the email** — because anybody can
 * put anybody's address into either form, so the reader may be a person being attacked rather than
 * the person who acted.
 */

const link = "https://www.canoncore.com/api/auth/verify-email?token=a-token&callbackURL=%2F";

test("each message carries the link it exists to deliver", () => {
  expect(verifyYourAddress(link).text).toContain(link);
  expect(chooseANewPassword(link).text).toContain(link);
});

/**
 * The link on its own line, unwrapped and unpunctuated.
 *
 * A mail client autolinks a bare URL and stops at whitespace, so a URL wrapped mid-token or followed
 * by a full stop becomes a link that 404s — and better-auth's tokens are long enough that a wrapping
 * client is the normal case rather than an edge one.
 */
test("the link is a paragraph of its own, so nothing can wrap or punctuate it", () => {
  for (const message of [verifyYourAddress(link), chooseANewPassword(link)]) {
    expect(message.text).toContain(`\n\n${link}\n\n`);
  }
});

// The subject is what a reader decides whether to open from, so it has to name the service and say
// which of the two emails this is. A subject naming neither is the one a spam filter and a person
// both discard.
test("each subject names the service and which email it is", () => {
  expect(verifyYourAddress(link).subject).toBe("Verify your email address for CanonCore");
  expect(chooseANewPassword(link).subject).toBe("Reset your CanonCore password");
});

/**
 * **The reader may not have asked for this**, and both messages have to hold either way.
 *
 * Sign-up takes any address anybody types, and `/request-password-reset` answers identically for an
 * address that has an account and one that does not — so a message that greeted the recipient as its
 * own account holder would be a message this service cannot stand behind.
 */
test("neither message assumes its reader asked for it", () => {
  for (const message of [verifyYourAddress(link), chooseANewPassword(link)]) {
    expect(message.text).toContain("Somebody");
    expect(message.text).toMatch(/If you did not/);
    expect(message.text).toContain("ignore this email");
  }
  // The one sentence that matters most on the reset path: the reader who did not ask needs to know
  // that nothing has happened yet, not merely that they may disregard the link.
  expect(chooseANewPassword(link).text).toContain("Your password has not changed");
});

/**
 * **The stated window and the enforced one are one number**, which is the whole reason the two
 * lifetimes live in this module rather than beside the better-auth settings that read them. A message
 * promising 24 hours over a token that expires in one is worse than promising nothing.
 */
test("each message quotes its own lifetime, and they are not the same one", () => {
  expect(verificationLifetime).toBe(60 * 60 * 24);
  expect(resetLifetime).toBe(60 * 60);

  expect(verifyYourAddress(link).text).toContain("works for 24 hours");
  expect(chooseANewPassword(link).text).toContain("works for one hour");
});

// Text only: `send.ts` puts `text` on the request and no `html`, so a message that expected to be
// rendered would reach a reader as its own markup. Nothing here should ever grow a tag.
test("no message carries markup", () => {
  for (const message of [verifyYourAddress(link), chooseANewPassword(link)]) {
    expect(message.text).not.toMatch(/<[a-z/]/i);
  }
});
