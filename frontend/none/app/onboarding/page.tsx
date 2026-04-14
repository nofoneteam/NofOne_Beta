import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Complete Your Profile - Nofone",
  description: "Set up your health profile to get personalized tracking that matches your unique needs.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
