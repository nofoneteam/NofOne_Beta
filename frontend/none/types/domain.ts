import type {
  ACTIVITY_LEVELS,
  AUTH_PROVIDERS,
  CHAT_MESSAGE_TYPES,
  CHAT_RESPONSE_SOURCES,
  HEALTH_GOALS,
  SHARE_REPORT_PERIODS,
  USER_ROLES,
  YES_NO_OPTIONS,
} from "@/lib/api/constants";

export type UserRole = (typeof USER_ROLES)[number];
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];
export type HealthGoal = (typeof HEALTH_GOALS)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type YesNo = (typeof YES_NO_OPTIONS)[number];
export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number];
export type ShareReportPeriod = (typeof SHARE_REPORT_PERIODS)[number];
export type ChatResponseSource = (typeof CHAT_RESPONSE_SOURCES)[number];

export interface User {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  firebaseUid: string | null;
  authProvider?: AuthProvider;
  role: UserRole;
  onboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatPreferences {
  includeRecentMessages: boolean;
  includeLongTermMemory: boolean;
  includePreferenceMemory: boolean;
  includeProfileContext: boolean;
  includeMedicalReports: boolean;
}

export interface HealthProfile {
  id: string;
  userId: string;
  age: number;
  gender: string | null;
  height: number;
  weight: number;
  targetWeight: number | null;
  bmi: number | null;
  bmiCategory: string | null;
  location: string | null;
  city: string | null;
  ethnicityCuisine: string | null;
  activityLevel: ActivityLevel;
  goal: HealthGoal;
  dietType: string | null;
  diabetes: YesNo | null;
  hypertension: YesNo | null;
  cholesterol: string | null;
  cancerSurvivor: YesNo | null;
  hrt: YesNo | null;
  otherConditions: string | null;
  allergies: string[];
  foodDislikes: string[];
  aiNotes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HealthProfileWithUser extends HealthProfile {
  user: User;
}

export interface MedicalReport {
  id: string;
  userId: string;
  title: string | null;
  fileName: string;
  mimeType: string;
  resourceType: string;
  secureUrl: string;
  publicId: string | null;
  assetId: string | null;
  bytes: number | null;
  summary: string | null;
  extractedTextPreview: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileAiSuggestion {
  summary: string;
  updates: Record<string, unknown>;
}

export interface DailyLog {
  id: string;
  userId: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterIntake: number;
  sleepHours: number;
  exerciseMinutes: number;
  exerciseCalories: number;
  weight: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  revokedAt: string | null;
  replacedByTokenHash: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface SharedReportRecord {
  id: string;
  userId: string;
  token: string;
  period: ShareReportPeriod;
  startDate: string;
  endDate: string;
  encryptedPayload: string;
  iv: string;
  tag: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  role: "user" | "assistant" | string;
  type: ChatMessageType;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

export interface ChatMemory {
  id: string;
  userId: string;
  kind: string;
  role: string | null;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

export interface ChatConfig {
  id: string;
  systemPrompt: string | null;
  imageSystemPrompt: string | null;
  updatedAt: string;
}

export interface OtpCode {
  id: string;
  channel: "email" | "phone";
  identifier: string;
  otpHash: string;
  purpose: "signup" | "login";
  expiresAt: string;
  attempts: number;
  verifiedAt: string | null;
  metadata: {
    name: string | null;
  };
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession extends AuthTokens {
  user: User;
}

export interface OtpDelivery {
  provider?: string;
  status?: string;
  sid?: string;
  previewUrl?: string | null;
  [key: string]: unknown;
}

export interface OtpRequestResult {
  channel: "email" | "phone";
  identifier: string;
  purpose: "signup" | "login";
  expiresAt: string;
  delivery: OtpDelivery | null;
}

export interface GoalMetric {
  key:
    | "calories"
    | "exerciseMinutes"
    | "waterIntake"
    | "sleepHours"
    | "carbs"
    | "protein"
    | "fat";
  label: string;
  unit: string;
  current: number;
  target: number;
  progressPercent: number;
}

export interface DailyGoalsSummary {
  metrics: GoalMetric[];
  completionPercent: number;
  rawMetrics?: {
    calories: number;
    exerciseCalories: number;
  };
}

export interface WeightHistoryPoint {
  date: string;
  weight: number;
}

export interface WeightTrackerSummary {
  currentWeight: number | null;
  targetWeight: number | null;
  toGo: number | null;
  thisWeekChange: number;
  weeklyPoints: WeightHistoryPoint[];
  history: WeightHistoryPoint[];
}

export interface MacroAverage {
  actual: number;
  target: number;
}

export interface WeeklySummary {
  avgCalories: number;
  kgLost: number;
  goalsMet: string;
  calorieIntake: Array<{
    date: string;
    calories: number;
  }>;
  averageMacros: {
    carbs: MacroAverage;
    protein: MacroAverage;
    fat: MacroAverage;
  };
}

export interface WeeklyReport {
  title: string;
  subtitle: string;
  profileSnapshot: {
    weight: number | null;
    targetWeight: number | null;
    goal: HealthGoal | null;
    activityLevel: ActivityLevel | null;
  };
  summary: WeeklySummary;
  highlights: string[];
}

export interface ProgressReportMetadata {
  period: ShareReportPeriod;
  startDate: string;
  endDate: string;
  days: number;
}

export interface ProgressReportEntry {
  date: string;
  goals: DailyGoalsSummary;
  metrics: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    waterIntake: number;
    sleepHours: number;
    exerciseMinutes: number;
    exerciseCalories: number;
    weight: number | null;
  };
}

export interface ProgressReport {
  metadata: ProgressReportMetadata;
  dailyGoals: DailyGoalsSummary;
  weightTracker: WeightTrackerSummary;
  summary: WeeklySummary;
  report: WeeklyReport;
  entries: ProgressReportEntry[];
}

export interface SharedProgressReport {
  token: string;
  period: ShareReportPeriod;
  startDate: string;
  endDate: string;
  createdAt: string;
  report: ProgressReport;
}

export interface CreatedSharedReport {
  token: string;
  report: ProgressReport;
  encryptedReport: string;
  iv: string;
  tag: string;
}

export interface ChatMemoryMatch {
  id: string;
  kind: string;
  role: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  timestamp: string;
  score: number | null;
}

export interface ChatTurnResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  responseSource: ChatResponseSource;
  contextMessages?: ChatMessage[];
  recalledMemories?: {
    preferences: ChatMemoryMatch[];
    semantic: ChatMemoryMatch[];
  };
}

export interface DashboardSummary {
  date: string;
  dailyGoals: DailyGoalsSummary;
  weightTracker: WeightTrackerSummary;
  weeklySummary: WeeklySummary;
}
