"use client";

import { ArrowLeft, ShieldCheck, FileText, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function TermsSection({ onBack }: { onBack: () => void }) {
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
        <h1 className="text-[32px] font-semibold tracking-tight text-[#171717]">Terms & Privacy</h1>
      </div>

      <div className="space-y-4">
        <Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)] overflow-hidden relative">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <ShieldCheck className="w-48 h-48" />
          </div>
          <CardContent className="p-6 sm:p-8 relative z-10 space-y-6">
            <div>
              <h2 className="text-[20px] font-semibold text-[#111111]">Legal Information</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-[#4b4f55]">
                Please review our terms of service and privacy policy to understand how we protect your data and the rules governing your use of our platform.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-start gap-3 rounded-2xl bg-[#f9f9f8] p-4 transition-all hover:bg-[#f3f3ee] animate-fade-up delay-100">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  <FileText className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#111111]">Terms of Service</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#4b4f55]">
                    By using this app, you agree to our terms of service. You are responsible for the information you provide and must use the platform lawfully and respectfully. Our health tracking tools are for informational purposes only and do not replace professional medical advice.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-[#f9f9f8] p-4 transition-all hover:bg-[#f3f3ee] animate-fade-up delay-200">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  <Lock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#111111]">Privacy Policy</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#4b4f55]">
                    We value your privacy. Your personal and health data is encrypted and securely stored. We will never sell your personal information to third parties. Data is only used to provide you with personalized insights and improve your overall app experience.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 rounded-2xl bg-[#f9f9f8] p-4 transition-all hover:bg-[#f3f3ee] animate-fade-up delay-300">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  <ShieldCheck className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#111111]">Data Security</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#4b4f55]">
                    We employ industry-standard security measures to protect your information against unauthorized access or alteration. You can permanently delete your data at any time from the app settings.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center text-[13px] text-[#7f8690]">
              Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
