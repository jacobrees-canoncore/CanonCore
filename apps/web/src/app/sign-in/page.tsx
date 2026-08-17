import { codeFrom, explain, signInFailure } from "@/auth/failures";
import { SignInPage } from "./sign-in-page";

/** Per request, for `sign-up/page.tsx`'s reason: it reads the query string. */
export const dynamic = "force-dynamic";

export default async function SignIn({ searchParams }: PageProps<"/sign-in">) {
  const { error, created } = await searchParams;
  return (
    <SignInPage
      problem={explain(signInFailure, codeFrom(error))}
      // `?created` with no value, so its presence is the whole of it.
      created={created !== undefined}
    />
  );
}
