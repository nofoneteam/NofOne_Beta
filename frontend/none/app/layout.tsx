import type { Metadata } from "next";
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
      <head>
        {/* Firebase reCAPTCHA v3 for invisible bot protection */}
        {env.firebase.recaptchaSiteKey && (
          <script
            src={`https://www.google.com/recaptcha/api.js?render=${env.firebase.recaptchaSiteKey}`}
            async
            defer
          />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
