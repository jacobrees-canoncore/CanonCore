import { codeFrom, explain, resetPasswordFailure } from "@/auth/failures";
import { ResetPasswordPage } from "./reset-password-page";

/**
 * Per request, and here it is not only the query string that requires it: the token in the URL is a
 * one-hour capability over one account, so a prerendered or cached copy of this page would be one
 * person's reset link served to whoever asked next.
 */
export const dynamic = "force-dynamic";

export default async function ResetPassword({ searchParams }: PageProps<"/reset-password">) {
  const { error, token } = await searchParams;
  return (
    <ResetPasswordPage
      // A repeated `?token=a&token=b` arrives as an array, which is not a token — so it is treated as
      // no token at all, and the page says the link is needed rather than submitting one of the two.
      token={typeof token === "string" ? token : undefined}
      problem={explain(resetPasswordFailure, codeFrom(error))}
    />
  );
}
