/**
 * The shortest password this service accepts.
 *
 * **Twelve, raised from better-auth's default of eight** ([email and
 * password](https://www.better-auth.com/docs/authentication/email-password)), because eight is
 * below current practice and **CAN-24 A signed-in and a signed-out path** is the only place the
 * number has ever been chosen. There is no maximum here: better-auth's own 128 stands, and it
 * exists to bound the hashing work rather than to shape a password.
 *
 * **Its own module because three things need it and none of them may import the other two.**
 * `auth/auth.ts` enforces it, the sign-up form declares it as `minLength` so a browser says so
 * before a round trip, and both tests read it. `auth.ts` opens a database pool, which a render test
 * of the form must not do.
 */
export const passwordMinimum = 12;
