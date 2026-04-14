import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - Nofone",
  description: "Track your food, exercise, sleep, and health metrics with personalized insights tailored to you.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
