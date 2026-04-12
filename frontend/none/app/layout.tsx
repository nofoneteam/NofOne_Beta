import type { Metadata } from "next";
import Script from "next/script";
import { ToastProvider } from "@/components/ui/toast";
import { env } from "@/lib/config/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nofone",
  description: "Health-focused authentication and progress companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head />
      <body className="min-h-full flex flex-col">
        {env.firebase.recaptchaSiteKey && (
          <Script
            src={`https://www.google.com/recaptcha/api.js?render=${env.firebase.recaptchaSiteKey}`}
            strategy="beforeInteractive"
          />
        )}
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
