import type { DailyGoalsSummary, GoalMetric } from "@/types/domain";

export type GoalOverrideMap = Partial<Record<GoalMetric["key"], number>>;

export function getDailyGoalOverrideStorageKey(scope: string) {
  return `nofone:daily-goal-targets:${scope}`;
}

export function readDailyGoalOverrides(scope: string): GoalOverrideMap {
  if (typeof window === "undefined") {
    return {};
  }

  const stored = window.localStorage.getItem(getDailyGoalOverrideStorageKey(scope));

  if (!stored) {
    return {};
  }

  try {
    const parsed = JSON.parse(stored) as GoalOverrideMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function persistDailyGoalOverrides(scope: string, overrides: GoalOverrideMap) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getDailyGoalOverrideStorageKey(scope),
    JSON.stringify(overrides),
  );
}

export function applyDailyGoalOverrides(
  summary: DailyGoalsSummary | null,
  overrides: GoalOverrideMap,
): DailyGoalsSummary | null {
  if (!summary) {
    return null;
  }

  const metrics = summary.metrics.map((metric) => {
    const target = overrides[metric.key] ?? metric.target;
    const progressPercent = target > 0 ? Math.min((metric.current / target) * 100, 100) : 0;

    return {
      ...metric,
      target,
      progressPercent: Math.round(progressPercent),
    };
  });

  const completionPercent = metrics.length
    ? Math.round(metrics.reduce((total, metric) => total + metric.progressPercent, 0) / metrics.length)
    : 0;

  return {
    metrics,
    completionPercent,
    rawMetrics: summary.rawMetrics,
  };
}
