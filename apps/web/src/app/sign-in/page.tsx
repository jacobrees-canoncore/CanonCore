import { codeFrom, explain, signInFailure } from "@/auth/failures";
import { SignInPage } from "./sign-in-page";

/** Per request, for `sign-up/page.tsx`'s reason: it reads the query string. */
export const dynamic = "force-dynamic";

export default async function SignIn({ searchParams }: PageProps<"/sign-in">) {
  const { error, created, verified, reset } = await searchParams;
  return (
    <SignInPage
      problem={explain(signInFailure, codeFrom(error))}
      // Each with no value, so presence is the whole of it. `route.ts` → `flows` is what sets them,
      // except `verified`, which better-auth sets when a link from an email has been followed.
      created={created !== undefined}
      verified={verified !== undefined}
      reset={reset !== undefined}
    />
  );
}
