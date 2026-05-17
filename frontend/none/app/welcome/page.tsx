import type { Metadata } from "next";

import { BasicProfileSetup } from "@/components/onboarding/basic-profile-setup";

export const metadata: Metadata = {
  title: "Quick Setup - Nofone",
  description: "Add a few basics before you start using Nofone.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function WelcomePage() {
  return <BasicProfileSetup />;
}
