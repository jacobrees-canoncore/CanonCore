import { passwordMinimum } from "@/auth/password";

/**
 * The two inputs both forms need, in one place because the details are the part that drifts.
 *
 * The shells around them are deliberately *not* shared: sign-up and sign-in differ in their
 * heading, their button, their third field and what they say afterwards, and a component taking all
 * of that as options would be longer than the two it replaced. What is worth sharing is the
 * attributes — the `autoComplete` tokens a password manager reads, and the `minLength` that has to
 * agree with `auth/auth.ts`.
 */

/**
 * `autoComplete="username"` rather than `"email"`, on both forms. It is the token password managers
 * pair with `current-password` and `new-password`, and this service's username *is* an email
 * address.
 */
export function EmailField() {
  return (
    <p>
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="username" required />
    </p>
  );
}

/**
 * `new-password` on sign-up and the reset form, `current-password` on sign-in, which is what tells a
 * password manager whether to offer to generate one or to fill the one it holds.
 *
 * **`minLength` on the two that choose a password, and it is not the enforcement.** `auth/auth.ts`
 * refuses a short password server-side whatever a form says; this saves a round trip and lets the
 * browser say so in its own words. Sign-in carries no minimum, because an account created before the
 * floor was raised must still be able to sign in — and because a rejection there would be a hint
 * about the password.
 *
 * **`name` is an argument because better-auth's own field names differ between endpoints**, and there
 * is nothing this application can do about that: `/sign-in/email` and `/sign-up/email` take
 * `password`, and `/reset-password` takes `newPassword`. The browser posts straight at those
 * endpoints (`../app/api/auth/[...all]/route.ts` says why it must), so the form has to spell each
 * endpoint's own name. Defaulted, so the two ordinary forms say nothing.
 */
export function PasswordField({
  purpose,
  name = "password",
}: {
  purpose: "new" | "current";
  name?: string;
}) {
  const isNew = purpose === "new";
  return (
    <p>
      {/* The `id` follows the `name` so the label still reaches its own input when there are two
          different names in play. */}
      <label htmlFor={name}>Password</label>
      <input
        id={name}
        name={name}
        type="password"
        autoComplete={isNew ? "new-password" : "current-password"}
        required
        {...(isNew ? { minLength: passwordMinimum } : {})}
      />
      {isNew ? <span className="hint">At least {passwordMinimum} characters.</span> : null}
    </p>
  );
}
