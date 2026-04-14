import type { Metadata } from "next";
import { AuthLanding } from "@/components/auth/auth-landing";

export const metadata: Metadata = {
  title: "Nofone - Health Tracking Built For You, Not Templates",
  description: "The science of the individual. Track food, exercise, and sleep tailored to your unique body. Built on n=1 trial principles. Ad-free, subscription-free, community-powered.",
  keywords: "health tracking, food logging, exercise tracking, calorie counter, personalized health, n=1 trial",
  openGraph: {
    title: "Nofone - Health Tracking Built For You",
    description: "The science of the individual. Track food, exercise, and sleep tailored to your unique body.",
  },
};

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
