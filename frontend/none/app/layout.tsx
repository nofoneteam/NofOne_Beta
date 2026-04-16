import type { Metadata } from "next";
import Script from "next/script";
import { ToastProvider } from "@/components/ui/toast";
import { env } from "@/lib/config/env";
import { OneSignalProvider } from "@/components/providers/onesignal-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nofone - Health Tracking Built For You, Not Templates",
  description: "The science of the individual. Track food, exercise, and sleep tailored to your unique body. Ad-free, subscription-free, community-powered health tracking.",
  keywords: "n=1 trial, personalized health tracking, food logging, exercise tracking, calorie counter, health app, metabolism tracking, individual health",
  authors: [{ name: "Nofone" }],
  creator: "Nofone",
  metadataBase: new URL("https://nofone.app"),
  alternates: {
    canonical: "https://nofone.app",
  },
  icons: {
    icon: [
      { url: "/favicon.jpg", type: "image/jpeg" },
    ],
    apple: [
      { url: "/favicon.jpg", type: "image/jpeg" },
    ],
    shortcut: "/favicon.jpg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Nofone - Health Tracking Built For You, Not Templates",
    description: "The science of the individual. Track food, exercise, and sleep tailored to your unique body. Ad-free, subscription-free, community-powered.",
    url: "https://nofone.app",
    siteName: "Nofone",
    locale: "en_US",
    images: [
      {
        url: "/logo.png",
        width: 192,
        height: 192,
        alt: "Nofone Logo - Move. Nourish. Evolve.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nofone - Health Tracking Built For You",
    description: "The science of the individual. Track food, exercise, and sleep tailored to your unique body.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Nofone",
    description: "Health tracking built for the individual using n=1 trial principles",
    url: "https://nofone.app",
    applicationCategory: "HealthApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Ad-free, subscription-free health tracking"
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "100"
    },
    features: [
      "Food and Calorie Logging",
      "Exercise and Activity Tracking",
      "Sleep Monitoring",
      "Personalized Health Analytics",
      "n=1 Trial Methodology"
    ]
  };

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {env.firebase.recaptchaSiteKey && (
          <Script
            src={`https://www.google.com/recaptcha/api.js?render=${env.firebase.recaptchaSiteKey}`}
            strategy="beforeInteractive"
          />
        )}
        <OneSignalProvider>
          <ToastProvider>{children}</ToastProvider>
        </OneSignalProvider>
      </body>
    </html>
  );
}
