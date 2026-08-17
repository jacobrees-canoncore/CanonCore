import { codeFrom, explain, signUpFailure } from "@/auth/failures";
import { SignUpPage } from "./sign-up-page";

/**
 * Rendered per request, never at build time: it reads the query string a failed submission came
 * back with, and a prerendered copy would show one reader another's failure.
 */
export const dynamic = "force-dynamic";

export default async function SignUp({ searchParams }: PageProps<"/sign-up">) {
  const { error } = await searchParams;
  return <SignUpPage problem={explain(signUpFailure, codeFrom(error))} />;
}
