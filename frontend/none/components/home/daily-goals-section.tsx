"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  applyDailyGoalOverrides,
  persistDailyGoalOverrides,
  readDailyGoalOverrides,
  type GoalOverrideMap,
} from "@/lib/daily-goal-overrides";
import { cn } from "@/lib/utils";
import type { DailyGoalsSummary, GoalMetric } from "@/types/domain";

const DAILY_GOAL_META: Record<
  GoalMetric["key"],
  {
    color: string;
    track: string;
    iconBg: string;
    step: string;
  }
> = {
  calories: {
    color: "bg-[#e59a3b]",
    track: "bg-[#f3eee6]",
    iconBg: "bg-[#e59a3b]",
    step: "1",
  },
  exerciseMinutes: {
    color: "bg-[#5e9874]",
    track: "bg-[#e7efe9]",
    iconBg: "bg-[#5e9874]",
    step: "1",
  },
  waterIntake: {
    color: "bg-[#5aa6dc]",
    track: "bg-[#e8f1f9]",
    iconBg: "bg-[#5aa6dc]",
    step: "1",
  },
  sleepHours: {
    color: "bg-[#7b60c6]",
    track: "bg-[#ede8fa]",
    iconBg: "bg-[#7b60c6]",
    step: "0.5",
  },
  carbs: {
    color: "bg-[#e59a3b]",
    track: "bg-[#f3eee6]",
    iconBg: "bg-[#e59a3b]",
    step: "1",
  },
  protein: {
    color: "bg-[#c95b89]",
    track: "bg-[#f7e7ee]",
    iconBg: "bg-[#c95b89]",
    step: "1",
  },
  fat: {
    color: "bg-[#5b7ed8]",
    track: "bg-[#e9eefc]",
    iconBg: "bg-[#5b7ed8]",
    step: "1",
  },
};

function formatMetricValue(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export function DailyGoalsSection({
  loading,
  onBack,
  onSaveMetric,
  scope,
  summary,
}: {
  loading: boolean;
  onBack: () => void;
  onSaveMetric: (metricKey: GoalMetric["key"], currentValue: number) => Promise<void>;
  scope: string;
  summary: DailyGoalsSummary | null;
}) {
  const [editingMetricKey, setEditingMetricKey] = useState<GoalMetric["key"] | null>(null);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [draftCurrent, setDraftCurrent] = useState("");
  const [draftTarget, setDraftTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [targetOverrides, setTargetOverrides] = useState<GoalOverrideMap>({});

  useEffect(() => {
    setTargetOverrides(readDailyGoalOverrides(scope));
  }, [scope]);

  const effectiveMetrics = useMemo(() => {
    return applyDailyGoalOverrides(summary, targetOverrides)?.metrics ?? [];
  }, [summary, targetOverrides]);

  const effectiveCompletion = useMemo(() => {
    if (!effectiveMetrics.length) {
      return 0;
    }

    return Math.round(
      effectiveMetrics.reduce((total, metric) => total + metric.progressPercent, 0) / effectiveMetrics.length,
    );
  }, [effectiveMetrics]);

  const editingMetric = useMemo(
    () => effectiveMetrics.find((metric) => metric.key === editingMetricKey) ?? null,
    [editingMetricKey, effectiveMetrics],
  );

  function persistOverrides(nextOverrides: GoalOverrideMap) {
    setTargetOverrides(nextOverrides);
    persistDailyGoalOverrides(scope, nextOverrides);
  }

  function openEditor(metric: GoalMetric) {
    setEditingMetricKey(metric.key);
    setDraftCurrent(formatMetricValue(metric.current));
    setDraftTarget(formatMetricValue(targetOverrides[metric.key] ?? metric.target));
  }

  function openAddGoal() {
    setAddGoalOpen(true);
  }

  function closeEditor() {
    setEditingMetricKey(null);
    setDraftCurrent("");
    setDraftTarget("");
  }

  function closeAddGoal() {
    setAddGoalOpen(false);
  }

  function handleAddGoalSelect(metric: GoalMetric) {
    setAddGoalOpen(false);
    openEditor(metric);
  }

  async function handleSave() {
    if (!editingMetric) {
      return;
    }

    const nextCurrent = Number(draftCurrent);
    const nextTarget = Number(draftTarget);

    if (!Number.isFinite(nextCurrent) || nextCurrent < 0 || !Number.isFinite(nextTarget) || nextTarget <= 0) {
      return;
    }

    setSaving(true);

    try {
      await onSaveMetric(editingMetric.key, nextCurrent);
      persistOverrides({
        ...targetOverrides,
        [editingMetric.key]: nextTarget,
      });
      closeEditor();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-10 animate-fade-up">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#4b4f55] transition-colors hover:bg-[#f3f3ee]"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[32px] font-semibold tracking-tight text-[#171717]">Daily Goals</h1>
        </div>

        <button
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#699772] text-white transition-transform duration-200 hover:scale-[1.03]"
          onClick={openAddGoal}
          type="button"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <Card className="rounded-[24px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
        <CardContent className="p-0">
          <button
            className="flex w-full items-center justify-between rounded-[24px] px-5 py-5 text-left transition-colors hover:bg-[#faf9f5]"
            onClick={openAddGoal}
            type="button"
          >
            <span className="text-[20px] font-medium text-[#8f96a0]">Add a goal</span>
            <Plus className="h-5 w-5 text-[#8f96a0]" />
          </button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading
          ? Array.from({ length: 7 }, (_, index) => (
              <GoalSkeleton key={index} />
            ))
          : effectiveMetrics.map((metric) => (
              <GoalMetricCard key={metric.key} metric={metric} onEdit={() => openEditor(metric)} />
            ))}
      </div>

      <Card className="rounded-[24px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
        <CardContent className="p-8 text-center">
          <div className="text-[56px] font-semibold leading-none text-[#699772]">{effectiveCompletion}%</div>
          <p className="mt-3 text-[16px] text-[#8a9198]">of daily goals completed</p>
        </CardContent>
      </Card>

      {addGoalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            aria-label="Close add goal modal"
            className="absolute inset-0 bg-[#111111]/18 backdrop-blur-[1px]"
            onClick={closeAddGoal}
            type="button"
          />
          <div className="relative z-10 w-full max-w-md rounded-[28px] border border-[#ecece7] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.12)] animate-scale-in">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-semibold text-[#171717]">Add a goal</h2>
                <p className="mt-1 text-[14px] text-[#8b929b]">
                  Choose which daily goal you want to edit or personalize.
                </p>
              </div>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#8e949c] transition-colors hover:bg-[#f3f3ee]"
                onClick={closeAddGoal}
                type="button"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {effectiveMetrics.map((metric) => {
                const meta = DAILY_GOAL_META[metric.key];

                return (
                  <button
                    key={metric.key}
                    className="flex items-center gap-3 rounded-[18px] border border-[#ecece7] bg-[#fcfcf9] px-4 py-4 text-left transition-colors hover:bg-[#f7f7f2]"
                    onClick={() => handleAddGoalSelect(metric)}
                    type="button"
                  >
                    <div className={cn("h-8.5 w-8.5 rounded-[12px]", meta.iconBg)} />
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[#22262b]">{metric.label}</p>
                      <p className="mt-0.5 text-[13px] text-[#8b929b]">
                        {formatMetricValue(metric.current)}/{formatMetricValue(metric.target)} {metric.unit}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {editingMetric ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            aria-label="Close goal editor"
            className="absolute inset-0 bg-[#111111]/18 backdrop-blur-[1px]"
            onClick={closeEditor}
            type="button"
          />
          <div className="relative z-10 w-full max-w-md rounded-[28px] border border-[#ecece7] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.12)] animate-scale-in">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-semibold text-[#171717]">{editingMetric.label}</h2>
                <p className="mt-1 text-[14px] text-[#8b929b]">
                  Update today&apos;s logged amount and your preferred target.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#545a61]">Current value</label>
                <Input
                  inputMode="decimal"
                  min="0"
                  step={DAILY_GOAL_META[editingMetric.key].step}
                  value={draftCurrent}
                  onChange={(event) => setDraftCurrent(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#545a61]">Target value</label>
                <Input
                  inputMode="decimal"
                  min="0"
                  step={DAILY_GOAL_META[editingMetric.key].step}
                  value={draftTarget}
                  onChange={(event) => setDraftTarget(event.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1f1] text-[#d45959] transition-colors hover:bg-[#ffe7e7]"
                onClick={closeEditor}
                type="button"
              >
                <X className="h-4.5 w-4.5" />
              </button>
              <Button
                className="flex h-10 min-w-24 items-center justify-center gap-2 rounded-full bg-[#4f82ff] px-5 text-white hover:bg-[#3f74f1]"
                disabled={saving}
                onClick={() => void handleSave()}
                type="button"
              >
                {saving ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GoalMetricCard({
  metric,
  onEdit,
}: {
  metric: GoalMetric;
  onEdit: () => void;
}) {
  const meta = DAILY_GOAL_META[metric.key];

  return (
    <Card className="rounded-[24px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)] transition-transform duration-200 hover:-translate-y-0.5">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn("h-8.5 w-8.5 rounded-[12px]", meta.iconBg)} />
            <p className="truncate text-[16px] font-semibold text-[#2c3136]">{metric.label}</p>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-right text-[16px] font-semibold text-[#2c3136]">
              {formatMetricValue(metric.current)}/{formatMetricValue(metric.target)} {metric.unit}
            </p>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#8e949c] transition-colors hover:bg-[#f3f3ee] hover:text-[#4e545b]"
              onClick={onEdit}
              type="button"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className={cn("mt-4 h-2.5 rounded-full", meta.track)}>
          <div
            className={cn("h-full rounded-full transition-all duration-300", meta.color)}
            style={{ width: `${Math.min(metric.progressPercent, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function GoalSkeleton() {
  return (
    <Card className="rounded-[24px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8.5 w-8.5 rounded-[12px] bg-[#f2f0ea] shimmer" />
            <div className="h-4 w-24 rounded-full bg-[#f2f0ea] shimmer" />
          </div>
          <div className="h-4 w-28 rounded-full bg-[#f2f0ea] shimmer" />
        </div>
        <div className="mt-4 h-2.5 rounded-full bg-[#f2f0ea] shimmer" />
      </CardContent>
    </Card>
  );
}
