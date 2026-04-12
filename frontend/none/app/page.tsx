import { AuthLanding } from "@/components/auth/auth-landing";

export default async function LandingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const refValue = resolvedSearchParams?.ref;
  const referralCode =
    typeof refValue === "string"
      ? refValue
      : Array.isArray(refValue)
        ? refValue[0]
        : undefined;

  return <AuthLanding initialReferralCode={referralCode} />;
}
