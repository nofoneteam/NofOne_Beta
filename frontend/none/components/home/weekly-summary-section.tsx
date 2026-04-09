"use client";

import { ArrowDownRight, ArrowLeft, ArrowUpRight, Flame, Target, TrendingDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WeeklySummary } from "@/types/domain";

function MacroBar({
  label,
  actual,
  target,
  tone,
}: {
  label: string;
  actual: number;
  target: number;
  tone: string;
}) {
  const progress = Math.max(0, Math.min(100, target ? (actual / target) * 100 : 0));

  return (
    <div>
      <div className="flex items-center justify-between text-[15px]">
        <span className="text-[#8b929b]">{label}</span>
        <span className="font-semibold text-[#171717]">
          {Math.round(actual)}g / {Math.round(target)}g
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[#efeee7]">
        <div
          className={cn("h-full rounded-full", tone)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function WeeklySummarySection({
  summary,
  onBack,
}: {
  summary: WeeklySummary | null;
  onBack: () => void;
}) {
  const calorieIntake = summary?.calorieIntake ?? [];

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
        <h1 className="text-[32px] font-semibold tracking-tight text-[#171717]">Weekly Summary</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={<Flame className="h-4 w-4" />}
          value={summary ? Math.round(summary.avgCalories).toString() : "—"}
          label="Avg Calories"
          tone="text-[#171717]"
        />
        <MetricCard
          icon={<TrendingDown className="h-4 w-4" />}
          value={summary ? summary.kgLost.toFixed(1) : "—"}
          label="kg Lost"
          sublabel={summary ? "" : undefined}
          tone="text-[#699772]"
        />
        <MetricCard
          icon={<Target className="h-4 w-4" />}
          value={summary?.goalsMet ?? "—"}
          label="Goals Met"
          tone="text-[#171717]"
          accent="text-[#d49348]"
        />
      </div>

      <Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
        <CardContent className="p-5 sm:p-6">
          <p className="text-[14px] font-semibold text-[#171717]">Calorie Intake</p>
          <div className="mt-6 h-[220px] rounded-[22px]">
            {calorieIntake.length > 0 ? (
              <div className="flex h-full items-end justify-between gap-3">
                {calorieIntake.map((entry, index) => {
                  const day = new Date(entry.date).toLocaleDateString("en-US", {
                    weekday: "short",
                  });
                  const maxCalories = Math.max(...calorieIntake.map((item) => item.calories), 1);
                  const height = Math.max(24, (entry.calories / maxCalories) * 132);

                  return (
                    <div key={entry.date} className="flex flex-1 flex-col items-center">
                      <div className="mb-3 text-[14px] font-medium text-[#7f8794]">
                        {Math.round(entry.calories)}
                      </div>
                      <div
                        className={cn(
                          "w-full max-w-[42px] rounded-t-[14px] bg-[#dfe9e1] transition-all",
                          index === calorieIntake.length - 1 && "bg-[#699772]",
                        )}
                        style={{ height }}
                      />
                      <div className="mt-3 text-[14px] text-[#8b929b]">{day}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[14px] text-[#8b929b]">
                No weekly calorie data yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
        <CardContent className="p-5 sm:p-6">
          <p className="text-[14px] font-semibold text-[#171717]">Average Macros</p>
          <div className="mt-5 space-y-5">
            <MacroBar
              actual={summary?.averageMacros.carbs.actual ?? 0}
              label="Carbs"
              target={summary?.averageMacros.carbs.target ?? 0}
              tone="bg-[#dd9a43]"
            />
            <MacroBar
              actual={summary?.averageMacros.protein.actual ?? 0}
              label="Protein"
              target={summary?.averageMacros.protein.target ?? 0}
              tone="bg-[#c65b8a]"
            />
            <MacroBar
              actual={summary?.averageMacros.fat.actual ?? 0}
              label="Fat"
              target={summary?.averageMacros.fat.target ?? 0}
              tone="bg-[#4d73d9]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  value,
  label,
  tone,
  accent,
  sublabel,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone: string;
  accent?: string;
  sublabel?: string;
}) {
  const trendIcon =
    label === "kg Lost" ? (
      <ArrowDownRight className="h-4 w-4 text-[#699772]" />
    ) : label === "Goals Met" ? (
      <ArrowUpRight className="h-4 w-4 text-[#d49348]" />
    ) : null;

  return (
    <Card className="rounded-[22px] border-[#ecece7] bg-white shadow-[0_8px_24px_rgba(17,17,17,0.04)]">
      <CardContent className="p-5 text-center">
        <div className="flex items-center justify-center gap-1.5">
          {trendIcon || icon}
          <p className={cn("text-[24px] font-semibold leading-none", tone, accent)}>{value}</p>
        </div>
        <p className="mt-3 text-[16px] text-[#8b929b]">{label}</p>
        {sublabel ? <p className="mt-1 text-[13px] text-[#9ca3ad]">{sublabel}</p> : null}
      </CardContent>
    </Card>
  );
}
