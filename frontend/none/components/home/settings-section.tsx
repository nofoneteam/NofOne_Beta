"use client";

import { ArrowLeft, Brain, FileText, History, Save, Sparkles, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { ChatPreferences } from "@/types/domain";

const SETTING_ITEMS: Array<{
  key: keyof ChatPreferences;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    key: "includeRecentMessages",
    title: "Recent chat history",
    description: "Let the assistant look at your latest conversation turns when a follow-up needs context.",
    icon: <History className="h-4.5 w-4.5" />,
  },
  {
    key: "includeLongTermMemory",
    title: "Remember older conversations",
    description: "Use relevant older chat memories when they can improve a health or nutrition answer.",
    icon: <Brain className="h-4.5 w-4.5" />,
  },
  {
    key: "includePreferenceMemory",
    title: "Use saved preferences",
    description: "Bring in learned preferences like your goals, dietary style, or response habits.",
    icon: <Sparkles className="h-4.5 w-4.5" />,
  },
  {
    key: "includeProfileContext",
    title: "Use profile and recent logs",
    description: "Include your profile, goals, and recent health logs to personalize responses better.",
    icon: <UserRound className="h-4.5 w-4.5" />,
  },
  {
    key: "includeMedicalReports",
    title: "Use uploaded medical reports",
    description: "Allow the assistant to reference parsed report summaries when they are relevant.",
    icon: <FileText className="h-4.5 w-4.5" />,
  },
];

export function SettingsSection({
  loading,
  onBack,
  onSave,
  preferences,
  saving,
  onToggle,
}: {
  loading: boolean;
  onBack: () => void;
  onSave: () => void;
  preferences: ChatPreferences | null;
  saving: boolean;
  onToggle: (key: keyof ChatPreferences) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-10 animate-fade-up">
      <div className="flex items-center gap-3 px-1">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#4b4f55] transition-colors hover:bg-[#f3f3ee]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[32px] font-semibold tracking-tight text-[#171717]">Settings</h1>
      </div>

      <Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
        <CardContent className="p-6 sm:p-7">
          <div>
            <p className="text-[14px] font-semibold text-[#171717]">Chat preferences</p>
            <p className="mt-2 text-[14px] leading-6 text-[#7a8089]">
              Control how much personal context the assistant should use when answering your health questions.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {SETTING_ITEMS.map((item) => (
              <SettingToggleCard
                key={item.key}
                checked={Boolean(preferences?.[item.key])}
                description={item.description}
                disabled={loading || !preferences}
                icon={item.icon}
                label={item.title}
                onToggle={() => onToggle(item.key)}
              />
            ))}
          </div>

          <div className="mt-6 rounded-[20px] bg-[#f7f7f3] px-4 py-4 text-[13px] leading-6 text-[#7a8089]">
            Turning more options on usually gives richer, more personalized responses. Turning them off keeps replies tighter and more current-message focused.
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              className="inline-flex h-11 min-w-34 items-center justify-center gap-2 rounded-full bg-green-800 px-5 text-white hover:bg-green-900"
              disabled={loading || saving || !preferences}
              onClick={onSave}
              type="button"
            >
              {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingToggleCard({
  checked,
  description,
  disabled,
  icon,
  label,
  onToggle,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-start gap-4 rounded-[22px] border border-[#ecece7] bg-[#fcfcf9] p-4 text-left transition-colors",
        disabled ? "opacity-70" : "hover:bg-[#f8f8f4]",
      )}
      disabled={disabled}
      onClick={onToggle}
      type="button"
    >
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#eef4ef] text-green-800">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[#1b1f24]">{label}</p>
        <p className="mt-1 text-[13px] leading-6 text-[#7c838d]">{description}</p>
      </div>
      <div
        className={cn(
          "relative mt-1 flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-green-800" : "bg-[#dfe4dc]",
        )}
      >
        <span
          className={cn(
            "absolute h-5 w-5 rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </div>
    </button>
  );
}
