"use client";

import { ArrowLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderSection({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
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
        <h1 className="text-[32px] font-semibold tracking-tight text-[#171717]">{title}</h1>
      </div>

      <Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
        <CardContent className="h-28 p-6 sm:h-32 sm:p-8" />
      </Card>
    </div>
  );
}
