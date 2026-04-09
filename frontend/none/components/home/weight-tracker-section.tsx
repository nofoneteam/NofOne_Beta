"use client";

import { useState } from "react";
import { ArrowLeft, Pencil, Plus, Target } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { WeightTrackerSummary } from "@/types/domain";

function formatDateLabel(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDayNumber(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(date);
}

function buildChartPoints(points: Array<{ date: string; weight: number }>) {
  if (points.length === 0) {
    return "";
  }

  const weights = points.map((point) => point.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 18 + ((max - point.weight) / range) * 48;
      return `${x},${y}`;
    })
    .join(" ");
}

function WeightEntryModal({
  loading,
  initialValue,
  onClose,
  onSubmit,
}: {
  loading: boolean;
  initialValue: number | null;
  onClose: () => void;
  onSubmit: (value: number) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue != null ? String(initialValue) : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c2f32]/18 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-[26px] border border-[#ecece7] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
        <div className="border-b border-[#efeee7] px-5 py-4">
          <p className="text-[18px] font-semibold text-[#171717]">Update Weight</p>
          <p className="mt-1 text-[14px] text-[#7f8790]">Log today&apos;s weight in kilograms.</p>
        </div>
        <div className="px-5 py-5">
          <input
            className="w-full rounded-[16px] border border-[#e7e5dd] bg-[#fbfbf7] px-4 py-3 text-[20px] font-semibold text-[#111111] outline-none"
            onChange={(event) => setValue(event.target.value)}
            placeholder="71.5"
            step="0.1"
            type="number"
            value={value}
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-[#efeee7] px-5 py-4">
          <button
            className="rounded-[14px] px-4 py-2.5 text-[14px] font-semibold text-[#7b828b] transition-colors hover:bg-[#f4f4ef]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-w-[124px] items-center justify-center gap-2 rounded-[14px] bg-green-800 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-92 disabled:opacity-60"
            disabled={loading || !value}
            onClick={() => void onSubmit(Number(value))}
            type="button"
          >
            {loading ? <Spinner className="h-4 w-4" /> : null}
            <span>{loading ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function WeightTrackerSection({
  loading,
  saving,
  summary,
  onBack,
  onOpenEntry,
  onSaveEntry,
}: {
  loading: boolean;
  saving: boolean;
  summary: WeightTrackerSummary | null;
  onBack: () => void;
  onOpenEntry?: () => void;
  onSaveEntry: (value: number) => Promise<void>;
}) {
  const [entryOpen, setEntryOpen] = useState(false);

  const weeklyPoints = summary?.weeklyPoints ?? [];
  const history = summary?.history ?? [];
  const chartPolyline = buildChartPoints(weeklyPoints);

  const currentWeight = summary?.currentWeight ?? null;
  const targetWeight = summary?.targetWeight ?? null;
  const toGo = summary?.toGo ?? null;
  const weeklyChange = summary?.thisWeekChange ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-10 animate-fade-up">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#4b4f55] transition-colors hover:bg-[#f3f3ee]"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[32px] font-semibold tracking-tight text-[#171717]">Weight Tracker</h1>
        </div>

        <button
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-green-800 text-white shadow-[0_12px_24px_rgba(22,34,18,0.14)] transition-opacity hover:opacity-92"
          onClick={() => {
            setEntryOpen(true);
            onOpenEntry?.();
          }}
          type="button"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
          <CardContent className="p-6 text-center">
            <p className="text-[44px] font-semibold leading-none text-[#171717]">
              {loading ? "—" : currentWeight != null ? currentWeight.toFixed(1) : "—"}
            </p>
            <p className="mt-3 text-[16px] text-[#8b929b]">Current (kg)</p>
            <p className={cn("mt-4 text-[14px] font-semibold", weeklyChange <= 0 ? "text-[#699772]" : "text-[#d48f4e]")}>
              {weeklyChange <= 0 ? "↘" : "↗"} {weeklyChange.toFixed(1)} kg
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-1 text-green-800">
              <Target className="h-4 w-4" />
              <p className="text-[44px] font-semibold leading-none">
                {loading ? "—" : targetWeight != null ? targetWeight.toFixed(0) : "—"}
              </p>
              <Pencil className="mt-2 h-3.5 w-3.5 text-[#9ba1aa]" />
            </div>
            <p className="mt-3 text-[16px] text-[#8b929b]">Target (kg)</p>
            <p className="mt-4 text-[14px] font-semibold text-[#d48f4e]">
              {toGo != null ? `${toGo.toFixed(1)} kg to go` : "Set a target weight"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
        <CardContent className="p-5 sm:p-6">
          <p className="text-[14px] font-semibold text-[#171717]">This Week</p>
          <div className="mt-6 rounded-[22px] bg-[#fff]">
            <div className="relative h-[220px]">
              {weeklyPoints.length > 0 ? (
                <>
                  <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <polyline
                      fill="none"
                      points={chartPolyline}
                      stroke="#6c8f74"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.2"
                    />
                    {weeklyPoints.map((point, index) => {
                      const weights = weeklyPoints.map((item) => item.weight);
                      const min = Math.min(...weights);
                      const max = Math.max(...weights);
                      const range = max - min || 1;
                      const x = (index / Math.max(weeklyPoints.length - 1, 1)) * 100;
                      const y = 18 + ((max - point.weight) / range) * 48;
                      return (
                        <circle key={point.date} cx={x} cy={y} fill="#6c8f74" r="1.9" />
                      );
                    })}
                  </svg>

                  <div className="absolute inset-x-0 bottom-11 grid grid-cols-7 gap-1 px-1">
                    {weeklyPoints.map((point) => (
                      <div key={point.date} className="text-center">
                        <p className="text-[14px] font-medium text-[#818998]">{point.weight.toFixed(1)}</p>
                        <p className="mt-2 text-[13px] text-[#9da3ad]">{formatDayNumber(point.date)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3">
                    <div className="h-px flex-1 border-t border-dashed border-[#b7d2bb]" />
                    <p className="text-[13px] font-semibold text-[#6c8f74]">
                      Target: {targetWeight != null ? `${targetWeight.toFixed(0)} kg` : "—"}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-[14px] text-[#8b929b]">
                  No weight entries for this week yet.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
        <CardContent className="p-5 sm:p-6">
          <p className="text-[14px] font-semibold text-[#171717]">History</p>
          <div className="mt-4 divide-y divide-[#efeee7]">
            {history.length > 0 ? (
              history.map((entry) => (
                <div key={entry.date} className="flex items-center justify-between py-4">
                  <span className="text-[15px] text-[#8b929b]">{formatDateLabel(entry.date)}</span>
                  <span className="text-[16px] font-semibold text-[#171717]">{entry.weight.toFixed(1)} kg</span>
                </div>
              ))
            ) : (
              <div className="py-6 text-[14px] text-[#8b929b]">No history available yet.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {entryOpen ? (
        <WeightEntryModal
          initialValue={currentWeight}
          loading={saving}
          onClose={() => setEntryOpen(false)}
          onSubmit={async (value) => {
            await onSaveEntry(value);
            setEntryOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
