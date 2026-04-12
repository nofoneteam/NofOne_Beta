const ApiError = require("../utils/apiError");
const DailyLogModel = require("../models/dailyLog.model");
const HealthProfileModel = require("../models/healthProfile.model");
const UserModel = require("../models/user.model");
const { normalizeDate } = require("../utils/date");
const {
  getFirestore,
  serializeDocument,
} = require("../utils/firestore");
const { refreshUserContextSummary } = require("./userContext.service");
const { createSharedReportRecord, getSharedReportByToken } = require("./sharedReport.service");

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function addDays(date, offset) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + offset);
  return next;
}

function toIsoDate(value) {
  return normalizeDate(value).toISOString().slice(0, 10);
}

function buildDateRange(endDate, days) {
  const normalizedEnd = normalizeDate(endDate || new Date());
  const dates = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    dates.push(addDays(normalizedEnd, -offset));
  }

  return dates;
}

function buildMonthRange(referenceDate) {
  const normalized = normalizeDate(referenceDate || new Date());
  const year = normalized.getUTCFullYear();
  const month = normalized.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  const dates = [];

  for (let cursor = new Date(first); cursor <= last; cursor = addDays(cursor, 1)) {
    dates.push(new Date(cursor));
  }

  return dates;
}

function buildCustomRange({ startDate, endDate, dates }) {
  if (Array.isArray(dates) && dates.length > 0) {
    return dates.map((value) => normalizeDate(value));
  }

  const normalizedStart = normalizeDate(startDate);
  const normalizedEnd = normalizeDate(endDate || startDate);
  const result = [];

  for (
    let cursor = new Date(normalizedStart);
    cursor <= normalizedEnd;
    cursor = addDays(cursor, 1)
  ) {
    result.push(new Date(cursor));
  }

  return result;
}

async function ensureUserExists(userId) {
  const db = getFirestore();
  const userSnapshot = await db.collection(UserModel.collectionName).doc(userId).get();
  const user = serializeDocument(userSnapshot);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}

async function getHealthProfile(userId) {
  const db = getFirestore();
  const profileSnapshot = await db
    .collection(HealthProfileModel.collectionName)
    .doc(userId)
    .get();

  return serializeDocument(profileSnapshot);
}

async function getDailyLogsForDates(userId, dates) {
  const db = getFirestore();
  // Daily logs use deterministic doc ids, so range dashboards can read exact documents
  // without Firestore composite indexes or collection scans.
  const refs = dates.map((date) =>
    db
      .collection(DailyLogModel.collectionName)
      .doc(DailyLogModel.createDocumentId(userId, normalizeDate(date)))
  );
  const snapshots = await db.getAll(...refs);

  return snapshots
    .map(serializeDocument)
    .filter(Boolean)
    .sort((first, second) => String(first.date).localeCompare(String(second.date)));
}

function round(value, precision = 1) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(precision));
}

function normalizeGoal(goal) {
  if (goal === "lose_weight") {
    return "loss";
  }

  if (goal === "gain_weight") {
    return "gain";
  }

  return goal || "maintain";
}

function getCalorieAdjustment(goal) {
  const normalizedGoal = normalizeGoal(goal);

  if (normalizedGoal === "loss") {
    return -450;
  }

  if (normalizedGoal === "gain") {
    return 300;
  }

  return 0;
}

function estimateDailyGoals(profile = {}) {
  const weight = Number(profile.weight) || 70;
  const height = Number(profile.height) || 170;
  const age = Number(profile.age) || 30;
  const gender = String(profile.gender || "").toLowerCase();
  const activityFactor =
    ACTIVITY_FACTORS[profile.activityLevel] || ACTIVITY_FACTORS.moderate;
  const bmrBase = 10 * weight + 6.25 * height - 5 * age;
  const genderOffset = gender === "male" ? 5 : gender === "female" ? -161 : 0;
  const maintenanceCalories = (bmrBase + genderOffset) * activityFactor;
  const calorieTarget = Math.max(
    1200,
    Math.round(maintenanceCalories + getCalorieAdjustment(profile.goal))
  );
  const proteinTarget = round(
    weight * (normalizeGoal(profile.goal) === "loss" ? 1.35 : 1.2),
    0
  );
  const fatTarget = round((calorieTarget * 0.25) / 9, 0);
  const carbTarget = round(
    Math.max(calorieTarget - proteinTarget * 4 - fatTarget * 9, 0) / 4,
    0
  );

  // These targets are intentionally simple and stable so the dashboard can render quickly
  // and stay consistent even when users have sparse logs.
  return {
    calories: calorieTarget,
    exerciseMinutes: 30,
    waterIntake: 8,
    sleepHours: 8,
    carbs: carbTarget,
    protein: proteinTarget,
    fat: fatTarget,
  };
}

function calculateCompletion(current, target) {
  if (!target) {
    return 0;
  }

  return Math.min(current / target, 1);
}

function buildDailyGoals(log, goals) {
  const metrics = [
    {
      key: "calories",
      label: "Calories",
      unit: "Calories",
      current: Math.max(round((log?.calories ?? 0) - (log?.exerciseCalories ?? 0), 0), 0),
      target: goals.calories,
    },
    {
      key: "exerciseMinutes",
      label: "Exercise",
      unit: "min",
      current: round(log?.exerciseMinutes ?? 0, 0),
      target: goals.exerciseMinutes,
    },
    {
      key: "waterIntake",
      label: "Water",
      unit: "cups",
      current: round(log?.waterIntake ?? 0, 0),
      target: goals.waterIntake,
    },
    {
      key: "sleepHours",
      label: "Sleep",
      unit: "hrs",
      current: round(log?.sleepHours ?? 0, 0),
      target: goals.sleepHours,
    },
    {
      key: "carbs",
      label: "Carbs",
      unit: "g",
      current: round(log?.carbs ?? 0, 0),
      target: goals.carbs,
    },
    {
      key: "protein",
      label: "Protein",
      unit: "g",
      current: round(log?.protein ?? 0, 0),
      target: goals.protein,
    },
    {
      key: "fat",
      label: "Fat",
      unit: "g",
      current: round(log?.fat ?? 0, 0),
      target: goals.fat,
    },
  ].map((metric) => ({
    ...metric,
    progressPercent: round(
      calculateCompletion(metric.current, metric.target) * 100,
      0
    ),
  }));

  const completionPercent = round(
    (metrics.reduce((sum, metric) => sum + metric.progressPercent, 0) /
      metrics.length),
    0
  );

  return {
    metrics,
    completionPercent,
    rawMetrics: {
      calories: round(log?.calories ?? 0, 0),
      exerciseCalories: round(log?.exerciseCalories ?? 0, 0),
    },
  };
}

function buildWeightTracker(logs, profile) {
  const weightedLogs = logs.filter(
    (log) => log.weight != null && Number.isFinite(Number(log.weight))
  );
  const currentWeight =
    Number(weightedLogs[weightedLogs.length - 1]?.weight) ||
    Number(profile?.weight) ||
    null;
  const targetWeight = Number(profile?.targetWeight) || null;
  const oldestWeeklyWeight = Number(weightedLogs[0]?.weight) || currentWeight;
  const thisWeekChange =
    currentWeight != null && oldestWeeklyWeight != null
      ? round(currentWeight - oldestWeeklyWeight, 1)
      : 0;

  return {
    currentWeight,
    targetWeight,
    toGo:
      currentWeight != null && targetWeight != null
        ? round(Math.abs(currentWeight - targetWeight), 1)
        : null,
    thisWeekChange,
    weeklyPoints: weightedLogs.map((log) => ({
      date: toIsoDate(log.date),
      weight: round(Number(log.weight), 1),
    })),
    history: [...weightedLogs]
      .reverse()
      .map((log) => ({
        date: toIsoDate(log.date),
        weight: round(Number(log.weight), 1),
      })),
  };
}

function average(values) {
  const filteredValues = values.filter((value) => Number.isFinite(value));

  if (filteredValues.length === 0) {
    return 0;
  }

  return filteredValues.reduce((sum, value) => sum + value, 0) / filteredValues.length;
}

function getGoalsMetCount(logs, goals) {
  return logs.reduce((count, log) => {
    const completion = buildDailyGoals(log, goals).completionPercent;
    return count + (completion >= 100 ? 1 : 0);
  }, 0);
}

function buildWeeklySummary(logs, goals) {
  const weightedLogs = logs.filter(
    (log) => log.weight != null && Number.isFinite(Number(log.weight))
  );
  const latestWeight = Number(weightedLogs[weightedLogs.length - 1]?.weight);
  const earliestWeight = Number(weightedLogs[0]?.weight);

  return {
    avgCalories: round(average(logs.map((log) => Number(log.calories) || 0)), 0),
    kgLost:
      Number.isFinite(earliestWeight) && Number.isFinite(latestWeight)
        ? round(earliestWeight - latestWeight, 1)
        : 0,
    goalsMet: `${getGoalsMetCount(logs, goals)}/${logs.length || 7}`,
    calorieIntake: logs.map((log) => ({
      date: toIsoDate(log.date),
      calories: round(Number(log.calories) || 0, 0),
    })),
    averageMacros: {
      carbs: {
        actual: round(average(logs.map((log) => Number(log.carbs) || 0)), 0),
        target: goals.carbs,
      },
      protein: {
        actual: round(average(logs.map((log) => Number(log.protein) || 0)), 0),
        target: goals.protein,
      },
      fat: {
        actual: round(average(logs.map((log) => Number(log.fat) || 0)), 0),
        target: goals.fat,
      },
    },
  };
}

function buildWeeklyReport(logs, goals, profile) {
  const summary = buildWeeklySummary(logs, goals);
  const latestLog = logs[logs.length - 1] || null;
  const highlights = [];

  if (summary.kgLost > 0) {
    highlights.push(`You lost ${summary.kgLost} kg this week.`);
  } else if (summary.kgLost < 0) {
    highlights.push(`Weight increased by ${Math.abs(summary.kgLost)} kg this week.`);
  } else {
    highlights.push("Your weight stayed roughly stable this week.");
  }

  if (summary.avgCalories <= goals.calories) {
    highlights.push("Your average calories stayed within your target.");
  } else {
    highlights.push("Your average calories were above the current target.");
  }

  if ((latestLog?.protein || 0) < goals.protein) {
    highlights.push("Protein intake still has room to improve.");
  }

  return {
    title: "Your report for last week is ready",
    subtitle: "Take a moment to review your progress.",
    profileSnapshot: {
      weight: profile?.weight ?? null,
      targetWeight: profile?.targetWeight ?? null,
      goal: profile?.goal ?? null,
      activityLevel: profile?.activityLevel ?? null,
    },
    summary,
    highlights,
  };
}

function buildPeriodMetadata(period, dates) {
  return {
    period,
    startDate: toIsoDate(dates[0] || new Date()),
    endDate: toIsoDate(dates[dates.length - 1] || new Date()),
    days: dates.length,
  };
}

function buildDetailedDailyEntries(logs, goals) {
  return logs.map((log) => ({
    date: toIsoDate(log.date),
    goals: buildDailyGoals(log, goals),
    metrics: {
      calories: round(Number(log.calories) || 0, 0),
      protein: round(Number(log.protein) || 0, 0),
      carbs: round(Number(log.carbs) || 0, 0),
      fat: round(Number(log.fat) || 0, 0),
      waterIntake: round(Number(log.waterIntake) || 0, 0),
      sleepHours: round(Number(log.sleepHours) || 0, 1),
      exerciseMinutes: round(Number(log.exerciseMinutes) || 0, 0),
      exerciseCalories: round(Number(log.exerciseCalories) || 0, 0),
      weight: log.weight != null ? round(Number(log.weight), 1) : null,
    },
  }));
}

async function buildProgressReport(userId, options = {}) {
  await ensureUserExists(userId);
  const period = options.period || "weekly";
  const dates =
    period === "monthly"
      ? buildMonthRange(options.endDate || new Date())
      : period === "custom"
        ? buildCustomRange(options)
        : buildDateRange(options.endDate || new Date(), 7);
  const [profile, logs] = await Promise.all([
    getHealthProfile(userId),
    getDailyLogsForDates(userId, dates),
  ]);
  const goals = estimateDailyGoals(profile || {});
  const currentLog = logs[logs.length - 1] || null;

  return {
    metadata: buildPeriodMetadata(period, dates),
    dailyGoals: buildDailyGoals(currentLog, goals),
    weightTracker: buildWeightTracker(logs, profile || {}),
    summary: buildWeeklySummary(logs, goals),
    report: buildWeeklyReport(logs, goals, profile || {}),
    entries: buildDetailedDailyEntries(logs, goals),
  };
}

async function createOrUpdateDailyLog(userId, payload) {
  const db = getFirestore();
  await ensureUserExists(userId);

  const normalizedDate = normalizeDate(payload.date);
  const logRef = db
    .collection(DailyLogModel.collectionName)
    .doc(DailyLogModel.createDocumentId(userId, normalizedDate));
  const existingLog = await logRef.get();
  const logPayload = DailyLogModel.createPayload(
    userId,
    payload,
    normalizedDate,
    existingLog.exists ? existingLog.data() : null
  );

  await logRef.set(logPayload, { merge: true });
  refreshUserContextSummary(userId).catch(() => null);

  return serializeDocument(await logRef.get());
}

async function getDailyLogByDate(userId, date) {
  const db = getFirestore();
  const normalizedDate = normalizeDate(date);
  const logSnapshot = await db
    .collection(DailyLogModel.collectionName)
    .doc(DailyLogModel.createDocumentId(userId, normalizedDate))
    .get();
  const log = serializeDocument(logSnapshot);

  if (!log) {
    throw new ApiError(404, "Daily log not found for the requested date");
  }

  return log;
}

async function getDashboardSummary(userId, date) {
  await ensureUserExists(userId);
  const [profile, currentLog, weeklyLogs] = await Promise.all([
    getHealthProfile(userId),
    getDailyLogByDate(userId, date).catch(() => null),
    getDailyLogsForDates(userId, buildDateRange(date, 7)),
  ]);
  const goals = estimateDailyGoals(profile || {});

  return {
    date: toIsoDate(date || new Date()),
    dailyGoals: buildDailyGoals(currentLog, goals),
    weightTracker: buildWeightTracker(weeklyLogs, profile || {}),
    weeklySummary: buildWeeklySummary(weeklyLogs, goals),
  };
}

async function getWeightTracker(userId, days = 7, endDate = new Date()) {
  await ensureUserExists(userId);
  const [profile, logs] = await Promise.all([
    getHealthProfile(userId),
    getDailyLogsForDates(userId, buildDateRange(endDate, days)),
  ]);

  return buildWeightTracker(logs, profile || {});
}

async function getWeeklySummary(userId, endDate = new Date()) {
  await ensureUserExists(userId);
  const [profile, logs] = await Promise.all([
    getHealthProfile(userId),
    getDailyLogsForDates(userId, buildDateRange(endDate, 7)),
  ]);
  const goals = estimateDailyGoals(profile || {});

  return buildWeeklySummary(logs, goals);
}

async function getWeeklyReport(userId, endDate = new Date()) {
  const result = await buildProgressReport(userId, {
    period: "weekly",
    endDate,
  });

  return result.report;
}

async function createSharedProgressReport(userId, options = {}) {
  const report = await buildProgressReport(userId, options);

  return createSharedReportRecord({
    userId,
    period: report.metadata.period,
    startDate: report.metadata.startDate,
    endDate: report.metadata.endDate,
    report,
  });
}

async function getProgressReport(userId, options = {}) {
  return buildProgressReport(userId, options);
}

async function getSharedProgressReport(token) {
  const sharedReport = await getSharedReportByToken(token);

  if (!sharedReport) {
    throw new ApiError(404, "Shared report not found");
  }

  return sharedReport;
}

module.exports = {
  createOrUpdateDailyLog,
  getDailyLogByDate,
  getDashboardSummary,
  getWeightTracker,
  getWeeklySummary,
  getWeeklyReport,
  getProgressReport,
  createSharedProgressReport,
  getSharedProgressReport,
};
