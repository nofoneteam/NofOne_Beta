"use client";

import { ArrowLeft, Mail, MessageSquareText, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function SupportSection({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-10 animate-fade-up">
      <div className="flex items-center gap-3 px-1">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#4b4f55] transition-colors hover:bg-[#f3f3ee]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[32px] font-semibold tracking-tight text-[#171717]">Feedback & Support</h1>
      </div>

      <div className="space-y-4">
        <Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)] overflow-hidden relative">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <MessageSquareText className="w-48 h-48" />
          </div>
          <CardContent className="p-6 sm:p-8 relative z-10 space-y-6">
            <div>
              <h2 className="text-[20px] font-semibold text-[#111111]">We&apos;re here to help</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-[#4b4f55]">
                If you have any questions, faced a bug, or want to share ideas on how we can improve, please reach out. Below are some examples of what you can contact us for.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                {
                  icon: <AlertCircle className="h-5 w-5 text-red-500" />,
                  title: "Report a Bug",
                  description: "App crashing? Nutritional analysis incorrect? Let us know.",
                  delay: "delay-100",
                },
                {
                  icon: <MessageSquareText className="h-5 w-5 text-blue-500" />,
                  title: "Share Feedback",
                  description: "Have a feature request or thoughts on the design?",
                  delay: "delay-200",
                },
                {
                  icon: <RefreshCw className="h-5 w-5 text-green-500" />,
                  title: "Account Issues",
                  description: "Trouble logging in, updating profile, or managing data.",
                  delay: "delay-300",
                },
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start gap-3 rounded-2xl bg-[#f9f9f8] p-4 transition-all hover:bg-[#f3f3ee] animate-fade-up ${item.delay}`}
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#111111]">{item.title}</h3>
                    <p className="mt-0.5 text-[14px] text-[#4b4f55]">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-green-50 p-5 sm:p-6 text-center shadow-sm border border-green-100">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 mb-3">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-[16px] font-semibold text-[#111111]">Contact Us</h3>
              <p className="mt-1 text-[14px] text-[#4b4f55] mb-4">
                Send us an email and our team will get back to you as soon as possible.
              </p>
              <a 
                href="mailto:nofoneteam@gmail.com"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-[15px] font-medium text-white transition-all hover:bg-green-800 hover:shadow-md"
              >
                <Mail className="h-4 w-4" />
                nofoneteam@gmail.com
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
