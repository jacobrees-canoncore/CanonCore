import { codeFrom, explain, forgotPasswordFailure } from "@/auth/failures";
import { ForgotPasswordPage } from "./forgot-password-page";

/** Per request, for `sign-up/page.tsx`'s reason: it reads the query string. */
export const dynamic = "force-dynamic";

export default async function ForgotPassword({ searchParams }: PageProps<"/forgot-password">) {
  const { error, sent } = await searchParams;
  return (
    <ForgotPasswordPage
      problem={explain(forgotPasswordFailure, codeFrom(error))}
      // `?sent` with no value, so its presence is the whole of it.
      sent={sent !== undefined}
    />
  );
}
