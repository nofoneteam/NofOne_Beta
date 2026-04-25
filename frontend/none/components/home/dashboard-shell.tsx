"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import {
  Bell,
  ChartColumn,
  Flag,
  House,
  LogOut,
  Mic,
  MessageSquareText,
  Scale,
  Settings,
  Shield,
  UserRound,
  Users,
  Target,
  GlassWaterIcon,
  DropletIcon,
  Flame,
  Loader2,
  Download,
} from "lucide-react";

import { DailyGoalsSection } from "@/components/home/daily-goals-section";
import { PlaceholderSection } from "@/components/home/placeholder-section";
import { ProfileSection } from "@/components/home/profile-section";
import { SettingsSection } from "@/components/home/settings-section";
import { WeeklySummarySection } from "@/components/home/weekly-summary-section";
import { ReminderSection } from "@/components/home/reminder-section";
import { WeightTrackerSection } from "@/components/home/weight-tracker-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/toast";
import { authApi, chatApi, logsApi, userApi } from "@/lib/api";
import { getStoredAccessToken, logoutFrontend } from "@/lib/auth/session";
import { applyDailyGoalOverrides, readDailyGoalOverrides } from "@/lib/daily-goal-overrides";
import { getHomeSectionFromPath, HOME_SECTION_ROUTES, type HomeSectionKey } from "@/lib/home-routes";
import { isProfileComplete } from "@/lib/profile";
import { cn } from "@/lib/utils";
import type {
  ChatMessage,
  ProgressReport,
  DashboardSummary,
  ChatPreferences,
  GoalMetric,
  HealthProfileWithUser,
  MedicalReport,
  User,
  WeeklyReport,
  WeightTrackerSummary,
} from "@/types/domain";
import type { ShareReportPayload, UpsertHealthProfilePayload } from "@/types/api";
import { parseNutritionFromText, type ParsedNutritionData } from "@/lib/api/nutrition-parser";

export interface LoggedNutritionItem {
  messageId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  exerciseMinutes: number;
  exerciseCalories: number;
}

type SidebarItem = {
  key: string;
  id: HomeSectionKey | "logout";
  label: string;
  icon: React.ReactNode;
};

const primarySidebarItems: SidebarItem[] = [
  { key: "home", id: "home", label: "Home", icon: <House className="h-4.25 w-4.25" /> },
  { key: "daily-goals", id: "daily", label: "Daily Goals", icon: <Flag className="h-4.25 w-4.25" /> },
  { key: "weekly", id: "weekly", label: "Weekly Summary", icon: <ChartColumn className="h-4.25 w-4.25" /> },
  { key: "weight", id: "weight", label: "Weight Tracker", icon: <Scale className="h-4.25 w-4.25" /> },
  { key: "profile", id: "profile", label: "Profile", icon: <UserRound className="h-4.25 w-4.25" /> },
  { key: "reminders", id: "reminders", label: "Reminders", icon: <Bell className="h-4.25 w-4.25" /> },
];

const secondarySidebarItems: SidebarItem[] = [
  { key: "logout", id: "logout", label: "Logout", icon: <LogOut className="h-4.25 w-4.25" /> },
  { key: "referral", id: "referral", label: "Referral Code", icon: <Users className="h-4.25 w-4.25" /> },
  { key: "terms", id: "terms", label: "Terms & Privacy", icon: <Shield className="h-4.25 w-4.25" /> },
  { key: "support", id: "support", label: "Feedback & Support", icon: <MessageSquareText className="h-4.25 w-4.25" /> },
  { key: "settings", id: "settings", label: "Settings", icon: <Settings className="h-4.25 w-4.25" /> },
];

const rotatingChatPrompts = [
  "What's on your plate today?",
  "Tell me what you ate or exercised.",
  "Log a meal, workout, or hydration update.",
  "What did you eat for breakfast or lunch?",
] as const;

function getIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildCenteredWeek(referenceDate: Date) {
  const normalized = new Date(referenceDate);
  normalized.setHours(12, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(normalized);
    value.setDate(normalized.getDate() - 2 + index);
    return value;
  });
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function getChatImageUrl(message: ChatMessage) {
  const imageUrl = message.metadata?.imageUrl;
  return typeof imageUrl === "string" && imageUrl.trim() ? imageUrl : null;
}

function renderInlineFormattedText(text: string) {
  // Split by bold (**...), inline code (`...`), or italic (*...* or _..._)
  // Using non-greedy match .*? allows multiple formats on the same line to work perfectly
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*(?!\*).*?(?<!\*)\*|_[^_]+_)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-[#111111]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={`${part}-${index}`} className="rounded bg-[#f3efe7] px-1.5 py-0.5 font-mono text-[13px] text-[#8542c4]">
          {part.slice(1, -1)}
        </code>
      );
    }

    if (
      (part.startsWith("*") && part.endsWith("*") && part.length >= 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length >= 2)
    ) {
      return (
        <em key={`${part}-${index}`} className="italic text-[#111111]">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function FormattedAssistantText({
  className,
  text,
}: {
  className?: string;
  text: string;
}) {
  const lines = text.split("\n").filter((line, index, source) => !(line.trim() === "" && source[index - 1]?.trim() === ""));
  const blocks: Array<
    | { type: "paragraph"; text: string }
    | { type: "ordered"; items: string[] }
    | { type: "unordered"; items: string[] }
    | { type: "heading"; level: number; text: string }
  > = [];

  let index = 0;
  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      index += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ordered", items });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "unordered", items });
      continue;
    }

    blocks.push({ type: "paragraph", text: trimmed });
    index += 1;
  }

  return (
    <div className={cn("space-y-2 text-[14px] leading-6 text-inherit", className)}>
      {blocks.map((block, blockIndex) => {
        if (block.type === "ordered") {
          return (
            <ol key={`ordered-${blockIndex}`} className="space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`ordered-item-${itemIndex}`} className="list-decimal">
                  {renderInlineFormattedText(item)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "unordered") {
          return (
            <ul key={`unordered-${blockIndex}`} className="space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`unordered-item-${itemIndex}`} className="list-disc">
                  {renderInlineFormattedText(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "heading") {
          const Tag = `h${block.level}` as keyof React.JSX.IntrinsicElements;
          const classes = [
            "font-bold text-[#111111]",
            block.level === 1 ? "text-[20px] mt-4 mb-2" : "",
            block.level === 2 ? "text-[18px] mt-3 mb-1.5" : "",
            block.level === 3 ? "text-[16px] mt-2 mb-1" : "",
            block.level >= 4 ? "text-[15px] mt-2 mb-1" : "",
          ].filter(Boolean).join(" ");

          return (
            <Tag key={`heading-${blockIndex}`} className={classes}>
              {renderInlineFormattedText(block.text)}
            </Tag>
          );
        }

        return <p key={`paragraph-${blockIndex}`}>{renderInlineFormattedText(block.text)}</p>;
      })}
    </div>
  );
}

function metricValue(summary: DashboardSummary | null, key: string) {
  return summary?.dailyGoals.metrics.find((metric) => metric.key === key) ?? null;
}

function getNutritionLogStorageKey(dateIso: string) {
  return `nofone:nutrition-logged:${dateIso}`;
}

function buildProfilePayload(profile: HealthProfileWithUser): UpsertHealthProfilePayload {
  return {
    age: profile.age,
    gender: profile.gender,
    height: profile.height,
    weight: profile.weight,
    targetWeight: profile.targetWeight,
    bmi: profile.bmi,
    bmiCategory: profile.bmiCategory,
    location: profile.location,
    city: profile.city,
    ethnicityCuisine: profile.ethnicityCuisine,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
    dietType: profile.dietType,
    diabetes: profile.diabetes,
    hypertension: profile.hypertension,
    cholesterol: profile.cholesterol,
    cancerSurvivor: profile.cancerSurvivor,
    hrt: profile.hrt,
    otherConditions: profile.otherConditions,
    allergies: profile.allergies,
    foodDislikes: profile.foodDislikes,
    aiNotes: profile.aiNotes,
  };
}

function calculateBmi(weight: number, height: number) {
  if (!weight || !height) {
    return null;
  }

  const heightMeters = height / 100;

  if (!heightMeters) {
    return null;
  }

  return Number((weight / (heightMeters * heightMeters)).toFixed(1));
}

function getBmiCategory(bmi: number | null) {
  if (bmi == null) {
    return null;
  }

  if (bmi < 18.5) {
    return "Underweight";
  }

  if (bmi < 25) {
    return "Normal";
  }

  if (bmi < 30) {
    return "Overweight";
  }

  return "Obese";
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal?: boolean;
    0: {
      transcript: string;
    };
  }>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
type ReportModalMode = "view" | "share";
type ReportFilterKind = "date" | "weekly" | "monthly" | "range";

type ReportFilterState = {
  kind: ReportFilterKind;
  anchorDate: Date;
  range: DateRange | undefined;
};

export function DashboardShell() {
  const router = useRouter();
  const pathname = usePathname();
  const calendarTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const [chatHistoryModalOpen, setChatHistoryModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMode, setReportMode] = useState<ReportModalMode>("view");
  const [progressReport, setProgressReport] = useState<ProgressReport | null>(null);
  const [progressReportLoading, setProgressReportLoading] = useState(false);
  const [reportFilter, setReportFilter] = useState<ReportFilterState>(() => ({
    kind: "weekly",
    anchorDate: new Date(),
    range: undefined,
  }));
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<HealthProfileWithUser | null>(null);
  const [chatPreferences, setChatPreferences] = useState<ChatPreferences | null>(null);
  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [weightTracker, setWeightTracker] = useState<WeightTrackerSummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingWater, setSavingWater] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingChatPreferences, setSavingChatPreferences] = useState(false);
  const [analyzingProfileAi, setAnalyzingProfileAi] = useState(false);
  const [weightTrackerLoading, setWeightTrackerLoading] = useState(true);
  const [savingWeightEntry, setSavingWeightEntry] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatFocused, setChatFocused] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [promptFading, setPromptFading] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [chatImage, setChatImage] = useState<File | null>(null);
  const [chatImagePreview, setChatImagePreview] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [selectedMessageContext, setSelectedMessageContext] = useState<string | undefined>(undefined);
  const [loggedNutritionItems, setLoggedNutritionItems] = useState<Record<string, LoggedNutritionItem>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const { toast } = useToast();
  const activeSection = useMemo(() => getHomeSectionFromPath(pathname), [pathname]);

  const weekDates = useMemo(() => buildCenteredWeek(selectedDate), [selectedDate]);
  const selectedIsoDate = useMemo(() => getIsoDate(selectedDate), [selectedDate]);
  const [goalOverrides, setGoalOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    const scope = user?.id ?? "guest";
    setGoalOverrides(readDailyGoalOverrides(scope));
  }, [user?.id, pathname]);

  const effectiveDailyGoals = useMemo(
    () => applyDailyGoalOverrides(dashboard?.dailyGoals ?? null, goalOverrides),
    [dashboard?.dailyGoals, goalOverrides],
  );
  const effectiveDashboard = useMemo(() => {
    if (!dashboard || !effectiveDailyGoals) {
      return dashboard;
    }

    return {
      ...dashboard,
      dailyGoals: effectiveDailyGoals,
    };
  }, [dashboard, effectiveDailyGoals]);

  const showErrorToast = useCallback((title: string, error: unknown) => {
    const message = readErrorMessage(error);
    setErrorMessage(message);
    toast({
      title,
      description: message,
      variant: "error",
    });
  }, [toast]);

  useEffect(() => {
    setReportFilter((current) => ({
      ...current,
      anchorDate: selectedDate,
      range:
        current.kind === "range"
          ? current.range
          : undefined,
    }));
  }, [selectedDate]);

  useEffect(() => {
    if (!calendarOpen) {
      return;
    }

    function updateCalendarPosition() {
      const trigger = calendarTriggerRef.current;

      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      setCalendarPosition({
        top: rect.bottom + 12,
        left: rect.left + rect.width / 2,
      });
    }

    updateCalendarPosition();
    window.addEventListener("resize", updateCalendarPosition);
    window.addEventListener("scroll", updateCalendarPosition, true);

    return () => {
      window.removeEventListener("resize", updateCalendarPosition);
      window.removeEventListener("scroll", updateCalendarPosition, true);
    };
  }, [calendarOpen]);

  const loadDashboard = useCallback(async (dateIso: string) => {
    const token = getStoredAccessToken();

    if (!token) {
      router.replace("/");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [meResponse, dashboardResponse, reportResponse] =
        await Promise.all([
          authApi.getMe(token),
          logsApi.getDashboard(dateIso, token),
          logsApi.getWeeklyReport({ endDate: dateIso }, token),
        ]);

      setUser(meResponse.data.user);
      setDashboard(dashboardResponse.data);
      setWeeklyReport(reportResponse.data);
    } catch (error) {
      const message = readErrorMessage(error);

      if (
        message.toLowerCase().includes("access token") ||
        message.toLowerCase().includes("unauthorized")
      ) {
        logoutFrontend();
        return;
      }

      showErrorToast("Unable to load dashboard", error);
    } finally {
      setLoading(false);
    }
  }, [router, showErrorToast]);

  const loadProfileData = useCallback(async () => {
    const token = getStoredAccessToken();

    if (!token) {
      router.replace("/");
      return;
    }

    setProfileLoading(true);

    try {
      const [profileResponse, reportsResponse, chatPreferencesResponse] = await Promise.all([
        userApi.getProfile(token),
        userApi.getReports(token),
        userApi.getChatPreferences(token),
      ]);

      if (!isProfileComplete(profileResponse.data)) {
        router.replace("/onboarding");
        return;
      }

      setProfile(profileResponse.data);
      setMedicalReports(reportsResponse.data.reports);
      setChatPreferences(chatPreferencesResponse.data);
    } catch (error) {
      showErrorToast("Unable to load profile", error);
    } finally {
      setProfileLoading(false);
    }
  }, [router, showErrorToast]);

  const loadWeightTracker = useCallback(async (dateIso: string) => {
    const token = getStoredAccessToken();

    if (!token) {
      return;
    }

    setWeightTrackerLoading(true);

    try {
      const response = await logsApi.getWeightTracker(
        {
          endDate: dateIso,
          days: 7,
        },
        token,
      );
      setWeightTracker(response.data);
    } catch (error) {
      showErrorToast("Unable to load weight tracker", error);
    } finally {
      setWeightTrackerLoading(false);
    }
  }, [showErrorToast]);

  const loadChatHistory = useCallback(async (dateIso: string) => {
    const token = getStoredAccessToken();
    if (!token) return;

    setHistoryLoading(true);
    try {
      const response = await chatApi.getHistory(dateIso, token);
      setChatHistory(response.data.messages);
    } catch {
      // silently ignore errors 
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(selectedIsoDate);
    void loadChatHistory(selectedIsoDate);
    void loadProfileData();
    void loadWeightTracker(selectedIsoDate);
  }, [loadDashboard, loadChatHistory, loadProfileData, loadWeightTracker, selectedIsoDate]);

  useEffect(() => {
    if (user?.id && typeof window !== "undefined") {
      import("react-onesignal").then((OneSignal) => {
         OneSignal.default.login(user.id).catch(e => console.warn("OneSignal login failed", e));
      }).catch(e => console.warn(e));
    }
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(
      getNutritionLogStorageKey(selectedIsoDate),
    );

    if (!stored) {
      setLoggedNutritionItems({});
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Migration from old string[] array format
        const migrated: Record<string, LoggedNutritionItem> = {};
        for (const id of parsed) {
          if (typeof id === "string") {
            migrated[id] = {
              messageId: id,
              name: "Logged Item",
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              exerciseMinutes: 0,
              exerciseCalories: 0,
            };
          }
        }
        setLoggedNutritionItems(migrated);
      } else {
        setLoggedNutritionItems(parsed || {});
      }
    } catch {
      setLoggedNutritionItems({});
    }
  }, [selectedIsoDate]);

  useEffect(() => {
    if (chatFocused || chatInput.trim()) {
      return;
    }

    const interval = window.setInterval(() => {
      setPromptFading(true);
      const timeout = window.setTimeout(() => {
        setPromptIndex((current) => (current + 1) % rotatingChatPrompts.length);
        setPromptFading(false);
      }, 350);
      return () => window.clearTimeout(timeout);
    }, 2800);

    return () => {
      window.clearInterval(interval);
    };
  }, [chatFocused, chatInput]);

  const caloriesMetric = metricValue(effectiveDashboard, "calories");
  const carbsMetric = metricValue(effectiveDashboard, "carbs");
  const proteinMetric = metricValue(effectiveDashboard, "protein");
  const fatMetric = metricValue(effectiveDashboard, "fat");
  const waterMetric = metricValue(effectiveDashboard, "waterIntake");

  const currentWater = Math.round(waterMetric?.current ?? 0);
  const targetWater = Math.max(1, Math.round(waterMetric?.target ?? 8));
  const totalFoodCalories = Math.round(effectiveDashboard?.dailyGoals.rawMetrics?.calories ?? 0);
  const totalExerciseCalories = Math.round(effectiveDashboard?.dailyGoals.rawMetrics?.exerciseCalories ?? 0);
  const remainingCalories = Math.round((caloriesMetric?.target ?? 0) - totalFoodCalories + totalExerciseCalories);

  async function handleLogout() {
    const token = getStoredAccessToken();

    try {
      await authApi.logout(undefined, token);
    } catch {
      // Local cleanup 
    }

    if (typeof window !== "undefined") {
      logoutFrontend({ redirectTo: "/" });
    }
  }

  async function handleWaterUpdate(delta: number) {
    const token = getStoredAccessToken();

    if (!token || savingWater || !dashboard || !waterMetric) {
      return;
    }

    const previousWater = waterMetric.current;
    const nextWater = Math.max(0, previousWater + delta);

    setSavingWater(true);
    setErrorMessage(null);
    setDashboard((current) =>
      current
        ? {
            ...current,
            dailyGoals: {
              ...current.dailyGoals,
              metrics: current.dailyGoals.metrics.map((metric) =>
                metric.key === "waterIntake"
                  ? { ...metric, current: nextWater }
                  : metric,
              ),
            },
          }
        : current,
    );

    try {
      await logsApi.saveDailyLog(
        {
          date: selectedIsoDate,
          waterIntake: nextWater,
        },
        token,
      );

      toast({
        title: "Water updated",
        description: `Hydration changed to ${nextWater} cups.`,
        variant: "success",
      });
    } catch (error) {
      const message = readErrorMessage(error);
      setDashboard((current) =>
        current
          ? {
              ...current,
              dailyGoals: {
                ...current.dailyGoals,
                metrics: current.dailyGoals.metrics.map((metric) =>
                  metric.key === "waterIntake"
                    ? { ...metric, current: previousWater }
                    : metric,
                ),
              },
            }
          : current,
      );
      setErrorMessage(message);
      toast({
        title: "Unable to update water",
        description: message,
        variant: "error",
      });
    } finally {
      setSavingWater(false);
    }
  }

  function buildSharePayload(filter: ReportFilterState): ShareReportPayload {
    if (filter.kind === "date") {
      const iso = getIsoDate(filter.anchorDate);
      return {
        period: "custom",
        startDate: iso,
        endDate: iso,
      };
    }

    if (filter.kind === "monthly") {
      return {
        period: "monthly",
        endDate: getIsoDate(filter.anchorDate),
      };
    }

    if (filter.kind === "range") {
      return {
        period: "custom",
        startDate: filter.range?.from ? getIsoDate(filter.range.from) : undefined,
        endDate: filter.range?.to ? getIsoDate(filter.range.to) : filter.range?.from ? getIsoDate(filter.range.from) : undefined,
      };
    }

    return {
      period: "weekly",
      endDate: getIsoDate(filter.anchorDate),
    };
  }

  function buildProgressQuery(filter: ReportFilterState) {
    if (filter.kind === "date") {
      const iso = getIsoDate(filter.anchorDate);
      return {
        period: "custom" as const,
        startDate: iso,
        endDate: iso,
      };
    }

    if (filter.kind === "monthly") {
      return {
        period: "monthly" as const,
        endDate: getIsoDate(filter.anchorDate),
      };
    }

    if (filter.kind === "range") {
      return {
        period: "custom" as const,
        startDate: filter.range?.from ? getIsoDate(filter.range.from) : undefined,
        endDate: filter.range?.to ? getIsoDate(filter.range.to) : filter.range?.from ? getIsoDate(filter.range.from) : undefined,
      };
    }

    return {
      period: "weekly" as const,
      endDate: getIsoDate(filter.anchorDate),
    };
  }

  async function handleShareFromModal() {
    const token = getStoredAccessToken();

    if (!token) {
      return;
    }

    setSharing(true);
    setShareMessage(null);

    try {
      const response = await logsApi.createSharedReport(
        buildSharePayload(reportFilter),
        token,
      );
      const url = `${window.location.origin}/shared/${response.data.token}`;
      await navigator.clipboard.writeText(url);
      setShareMessage("Report link copied to clipboard.");
    } catch (error) {
      showErrorToast("Unable to share report", error);
    } finally {
      setSharing(false);
    }
  }

  const loadProgressReport = useCallback(async (filter: ReportFilterState) => {
    const token = getStoredAccessToken();

    if (!token) {
      return;
    }

    setProgressReportLoading(true);

    try {
      const response = await logsApi.getProgressReport(buildProgressQuery(filter), token);
      setProgressReport(response.data);
    } catch (error) {
      showErrorToast("Unable to load report", error);
    } finally {
      setProgressReportLoading(false);
    }
  }, [showErrorToast]);

  function handleOpenReportModal(mode: ReportModalMode) {
    setReportMode(mode);
    setReportOpen(true);
  }

  useEffect(() => {
    if (!reportOpen) {
      return;
    }

    void loadProgressReport(reportFilter);
  }, [loadProgressReport, reportFilter, reportOpen]);

  async function handleQuickChatSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getStoredAccessToken();

    if (!token || (!chatInput.trim() && !chatImage) || chatting) {
      return;
    }

    setChatting(true);
    setErrorMessage(null);

    try {
      let response;

      if (chatImage) {
        response = await chatApi.uploadImage(
          {
            image: chatImage,
            message: chatInput.trim() || null,
          },
          token,
        );
        handleImageRemove();
      } else {
        response = await chatApi.createMessage(
          {
            type: "text",
            message: chatInput.trim(),
          },
          token,
        );
      }
      setChatHistory((curr) => [
        ...curr,
        response.data.userMessage,
        response.data.assistantMessage,
      ]);
      setSelectedMessageContext(chatInput);
      setSelectedMessage(response.data.assistantMessage);
      setChatInput("");
    } catch (error) {
      showErrorToast("Unable to send message", error);
    } finally {
      setChatting(false);
    }
  }

  function handleImageSelect(file: File) {
    if (chatImagePreview) {
      URL.revokeObjectURL(chatImagePreview);
    }
    setChatImage(file);
    setChatImagePreview(URL.createObjectURL(file));
  }

  function handleImageRemove() {
    if (chatImagePreview) {
      URL.revokeObjectURL(chatImagePreview);
    }
    setChatImage(null);
    setChatImagePreview(null);
  }

  function handleDateClick(date: Date) {
    startTransition(() => {
      setSelectedDate(date);
      setShareMessage(null);
      setCalendarOpen(false);
    });
  }

  const handleCaloriesMacrosUpdate = async(messageId: string,
    totals: { name: string; calories: number; carbs: number; protein: number; fat: number; exerciseMinutes: number; exerciseCalories: number },
    dateIso: string,) => {
    const token = getStoredAccessToken();
    if (!token) return;

    const existingLog = loggedNutritionItems[messageId];
    const isUpdate = !!existingLog;
    
    const diff = {
      calories: totals.calories - (existingLog?.calories ?? 0),
      carbs: totals.carbs - (existingLog?.carbs ?? 0),
      protein: totals.protein - (existingLog?.protein ?? 0),
      fat: totals.fat - (existingLog?.fat ?? 0),
      exerciseMinutes: totals.exerciseMinutes - (existingLog?.exerciseMinutes ?? 0),
      exerciseCalories: totals.exerciseCalories - (existingLog?.exerciseCalories ?? 0),
    };

    const prevExeCal = Math.round(dashboard?.dailyGoals.rawMetrics?.exerciseCalories ?? 0);
    const prevCal = Math.round(
      dashboard?.dailyGoals.rawMetrics?.calories
        ?? ((metricValue(dashboard, "calories")?.current ?? 0) + prevExeCal),
    );
    const prevCrb = Math.round(metricValue(dashboard, "carbs")?.current ?? 0);
    const prevPro = Math.round(metricValue(dashboard, "protein")?.current ?? 0);
    const prevFat = Math.round(metricValue(dashboard, "fat")?.current ?? 0);
    const prevExeMin = Math.round(metricValue(dashboard, "exerciseMinutes")?.current ?? 0);

    try {
      await logsApi.saveDailyLog({
        date: dateIso,
        calories: prevCal + diff.calories,
        carbs: prevCrb + diff.carbs,
        protein: prevPro + diff.protein,
        fat: prevFat + diff.fat,
        exerciseMinutes: prevExeMin + diff.exerciseMinutes,
        exerciseCalories: prevExeCal + diff.exerciseCalories,
      }, token);
      
      toast({
        title: isUpdate ? "Log updated successfully" : "Logged successfully",
        description: isUpdate ? "Nutrition data has been updated." : "Nutrition data added to today's log.",
        variant: "success",
      });

      const nextItem: LoggedNutritionItem = {
        messageId,
        name: totals.name,
        calories: totals.calories,
        carbs: totals.carbs,
        protein: totals.protein,
        fat: totals.fat,
        exerciseMinutes: totals.exerciseMinutes,
        exerciseCalories: totals.exerciseCalories,
      };

      const nextLoggedItems = { ...loggedNutritionItems, [messageId]: nextItem };
      setLoggedNutritionItems(nextLoggedItems);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          getNutritionLogStorageKey(dateIso),
          JSON.stringify(nextLoggedItems),
        );
      }

      void loadDashboard(dateIso);
      if (!isUpdate) {
        setSelectedMessage(null);
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not log nutrition data.",
        variant: "error",
      });
    }
  }

  async function handleSaveProfile(payload: UpsertHealthProfilePayload) {
    const token = getStoredAccessToken();

    if (!token || !profile) {
      return;
    }

    setSavingProfile(true);
    setErrorMessage(null);

    try {
      const nextPayload = {
        ...buildProfilePayload(profile),
        ...payload,
      } as UpsertHealthProfilePayload;
      const nextBmi = calculateBmi(Number(nextPayload.weight), Number(nextPayload.height));

      nextPayload.bmi = nextBmi;
      nextPayload.bmiCategory = getBmiCategory(nextBmi);

      const response = await userApi.saveProfile(nextPayload, token);
      setProfile((current) => (current ? { ...response.data, user: current.user } : null));
      toast({
        title: "Profile updated",
        description: "Your profile was saved successfully.",
        variant: "success",
      });
    } catch (error) {
      const message = readErrorMessage(error);
      setErrorMessage(message);
      toast({
        title: "Unable to update profile",
        description: message,
        variant: "error",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAnalyzeProfileAiNote(note: string) {
    const token = getStoredAccessToken();

    if (!token) {
      throw new Error("Unauthorized");
    }

    setAnalyzingProfileAi(true);

    try {
      const response = await userApi.getProfileAiSuggestion({ note }, token);
      return response.data;
    } finally {
      setAnalyzingProfileAi(false);
    }
  }

  async function handleSaveWeightEntry(value: number) {
    const token = getStoredAccessToken();

    if (!token) {
      return;
    }

    setSavingWeightEntry(true);
    setErrorMessage(null);

    try {
      await logsApi.saveDailyLog(
        {
          date: selectedIsoDate,
          weight: value,
        },
        token,
      );

      if (profile) {
        const nextPayload = {
          ...buildProfilePayload(profile),
          weight: value,
        } as UpsertHealthProfilePayload;
        const nextBmi = calculateBmi(Number(value), Number(nextPayload.height));

        nextPayload.bmi = nextBmi;
        nextPayload.bmiCategory = getBmiCategory(nextBmi);

        const profileResponse = await userApi.saveProfile(nextPayload, token);
        setProfile((current) =>
          current ? { ...profileResponse.data, user: current.user } : current,
        );
      }

      toast({
        title: "Weight updated",
        description: `Saved ${value.toFixed(1)} kg for ${selectedIsoDate}.`,
        variant: "success",
      });
      await Promise.all([
        loadWeightTracker(selectedIsoDate),
        loadDashboard(selectedIsoDate),
        loadProfileData(),
      ]);
    } catch (error) {
      const message = readErrorMessage(error);
      setErrorMessage(message);
      toast({
        title: "Unable to save weight",
        description: message,
        variant: "error",
      });
    } finally {
      setSavingWeightEntry(false);
    }
  }

  function handleProfileBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(HOME_SECTION_ROUTES.home);
  }

  function handleDailyBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(HOME_SECTION_ROUTES.home);
  }

  function handleWeightBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(HOME_SECTION_ROUTES.home);
  }

  function handleWeeklyBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(HOME_SECTION_ROUTES.home);
  }

  function handleSettingsBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(HOME_SECTION_ROUTES.home);
  }

  async function handleReportUpload(file: File, title?: string | null) {
    const token = getStoredAccessToken();

    if (!token) {
      return;
    }

    setUploadingReport(true);
    setErrorMessage(null);

    try {
      const response = await userApi.uploadReport(
        {
          title,
          report: file,
        },
        token,
      );
      setMedicalReports((current) => [response.data, ...current]);
      toast({
        title: "Report uploaded",
        description: "Medical report parsed and added to your context.",
        variant: "success",
      });
    } catch (error) {
      const message = readErrorMessage(error);
      setErrorMessage(message);
      toast({
        title: "Unable to upload report",
        description: message,
        variant: "error",
      });
    } finally {
      setUploadingReport(false);
    }
  }

  function handleToggleChatPreference(key: keyof ChatPreferences) {
    setChatPreferences((current) =>
      current
        ? {
            ...current,
            [key]: !current[key],
          }
        : current
    );
  }

  async function handleSaveChatPreferences() {
    const token = getStoredAccessToken();

    if (!token || !chatPreferences) {
      return;
    }

    setSavingChatPreferences(true);
    setErrorMessage(null);

    try {
      const response = await userApi.updateChatPreferences(chatPreferences, token);
      setChatPreferences(response.data);
      toast({
        title: "Preferences saved",
        description: "Your chat settings have been updated.",
        variant: "success",
      });
    } catch (error) {
      const message = readErrorMessage(error);
      setErrorMessage(message);
      toast({
        title: "Unable to save settings",
        description: message,
        variant: "error",
      });
    } finally {
      setSavingChatPreferences(false);
    }
  }

  async function handleSaveDailyGoalMetric(metricKey: GoalMetric["key"], currentValue: number) {
    const token = getStoredAccessToken();

    if (!token) {
      router.replace("/");
      return;
    }

    const normalizedValue = Number.isFinite(currentValue) ? currentValue : 0;

    const logPayload: Parameters<typeof logsApi.saveDailyLog>[0] = {
      date: selectedIsoDate,
    };

    if (metricKey === "calories") {
      const prevExeCal = Math.round(dashboard?.dailyGoals.rawMetrics?.exerciseCalories ?? 0);
      logPayload.calories = normalizedValue + prevExeCal;
    } else if (metricKey === "exerciseMinutes") {
      const prevExeMin = Math.round(metricValue(dashboard, "exerciseMinutes")?.current ?? 0);
      const prevExeCal = Math.round(dashboard?.dailyGoals.rawMetrics?.exerciseCalories ?? 0);
      const multiplier = prevExeMin > 0 ? (prevExeCal / prevExeMin) : 5;
      
      logPayload.exerciseMinutes = normalizedValue;
      logPayload.exerciseCalories = Math.round(normalizedValue * multiplier);
    } else if (metricKey === "waterIntake") {
      logPayload.waterIntake = normalizedValue;
    } else if (metricKey === "sleepHours") {
      logPayload.sleepHours = normalizedValue;
    } else if (metricKey === "carbs") {
      logPayload.carbs = normalizedValue;
    } else if (metricKey === "protein") {
      logPayload.protein = normalizedValue;
    } else if (metricKey === "fat") {
      logPayload.fat = normalizedValue;
    }

    await logsApi.saveDailyLog(logPayload, token);
    await loadDashboard(selectedIsoDate);
  }

  function handleSidebarSelect(sectionId: HomeSectionKey) {
    router.push(HOME_SECTION_ROUTES[sectionId]);
    setSidebarOpen(false);
  }

  function handleSpeechUnavailable(message: string) {
    toast({
      title: "Voice input unavailable",
      description: message,
      variant: "error",
    });
  }

  return (
    <main className="h-screen overflow-x-hidden overflow-y-hidden bg-white text-[#111111]">
      <div className="mx-auto flex h-screen w-full max-w-full items-start justify-center overflow-x-hidden bg-white px-0 lg:px-4 lg:py-4">
        <div className="relative flex h-screen w-full max-w-full overflow-x-hidden overflow-y-hidden bg-white lg:h-[calc(100vh-32px)] lg:rounded-[28px] lg:border lg:border-[#ecece7] lg:shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
          {sidebarOpen ? (
            <>
              <button
                aria-label="Close sidebar"
                className="absolute inset-0 z-[50] bg-[#6f746d]/12 backdrop-blur-[2px] lg:hidden"
                onClick={() => setSidebarOpen(false)}
                type="button"
              />
              <aside className="absolute left-0 top-0 z-[60] flex h-full w-70 animate-slide-in flex-col overflow-hidden border-r border-[#ecece7] bg-[#fdfdfa] lg:hidden">
            <SidebarPanel
              activeSection={activeSection}
              onAdminToggle={() => router.push("/home/admin")}
              onClose={() => setSidebarOpen(false)}
              onLogout={handleLogout}
              onSelect={handleSidebarSelect}
              user={user}
              onDownloadReport={() => handleOpenReportModal("view")}
            />
              </aside>
            </>
          ) : null}

          <aside className="hidden h-full w-70 shrink-0 overflow-hidden border-r border-[#ecece7] bg-[#fdfdfa] lg:flex lg:flex-col">
            <SidebarPanel
              activeSection={activeSection}
              onAdminToggle={() => router.push("/home/admin")}
              onClose={() => undefined}
              onLogout={handleLogout}
              onSelect={handleSidebarSelect}
              user={user}
              onDownloadReport={() => handleOpenReportModal("view")}
            />
          </aside>

          <section className="flex min-w-0 flex-1 overflow-x-hidden overflow-y-hidden">
            <div className="mx-auto flex h-full w-full max-w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto px-4 py-4 pb-32 sm:px-5 sm:py-5 sm:pb-32 md:px-6 md:py-4 md:pb-32 xl:max-w-310 xl:px-8 xl:pb-32">
              {activeSection === "home" ? (
                <div className="fixed top-0 left-0 right-0 z-50 grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3 bg-white px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:relative lg:top-auto lg:left-auto lg:right-auto lg:z-auto lg:bg-transparent lg:px-0 lg:py-0 lg:mb-0">
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#000000] transition-colors hover:bg-[#f3f3ee] lg:hidden"
                    onClick={() => setSidebarOpen(true)}
                    type="button"
                  >
                    <MenuIcon />
                  </button>

                  <div className="justify-self-center text-center">
                    <div className="relative inline-block">
                      <button
                        ref={calendarTriggerRef}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[15px] font-semibold text-[#111111]"
                        onClick={() => setCalendarOpen((open) => !open)}
                        type="button"
                      >
                        {selectedIsoDate === getIsoDate(new Date())
                          ? "Today"
                          : selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        <ChevronDownIcon />
                      </button>

                      {calendarOpen ? (
                        <>
                          <button
                            aria-label="Close calendar"
                            className="fixed inset-0 z-120"
                            onClick={() => setCalendarOpen(false)}
                            type="button"
                          />
                          <div
                            className="fixed z-130 w-[320px] -translate-x-1/2 animate-scale-in rounded-3xl border border-[#ecece7] bg-white p-2 shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
                            style={{
                              top: calendarPosition.top,
                              left: calendarPosition.left,
                            }}
                          >
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                if (date) {
                                  handleDateClick(date);
                                }
                              }}
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <button
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#edf5ee] text-[#000000] transition-colors hover:bg-[#e3efe5]"
                    onClick={() => router.push(HOME_SECTION_ROUTES.profile)}
                    type="button"
                  >
                    <UserIcon />
                  </button>
                </div>
              ) : (
                <div className="fixed top-0 left-0 right-0 z-50 grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3 bg-white px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:relative lg:top-auto lg:left-auto lg:right-auto lg:z-auto lg:bg-transparent lg:px-0 lg:py-0 lg:mb-0">
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#000000] transition-colors hover:bg-[#f3f3ee] lg:hidden"
                    onClick={() => setSidebarOpen(true)}
                    type="button"
                  >
                    <MenuIcon />
                  </button>

                  <div className="text-center">
                    {activeSection === "daily" ? (
                      <div className="text-[15px] font-semibold text-[#111111]">Daily Goals</div>
                    ) : activeSection === "profile" ? (
                      <div className="text-[15px] font-semibold text-[#111111]">Profile</div>
                    ) : activeSection === "weekly" ? (
                      <div className="text-[15px] font-semibold text-[#111111]">Weekly Summary</div>
                    ) : activeSection === "weight" ? (
                      <div className="text-[15px] font-semibold text-[#111111]">Weight Tracker</div>
                    ) : activeSection === "reminders" ? (
                      <div className="text-[15px] font-semibold text-[#111111]">Reminders</div>
                    ) : activeSection === "referral" ? (
                      <div className="text-[15px] font-semibold text-[#111111]">Referral Code</div>
                    ) : activeSection === "terms" ? (
                      <div className="text-[15px] font-semibold text-[#111111]">Terms & Privacy</div>
                    ) : activeSection === "support" ? (
                      <div className="text-[15px] font-semibold text-[#111111]">Feedback & Support</div>
                    ) : activeSection === "settings" ? (
                      <div className="text-[15px] font-semibold text-[#111111]">Settings</div>
                    ) : null}
                  </div>

                  <button
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#edf5ee] text-[#000000] transition-colors hover:bg-[#e3efe5]"
                    onClick={() => router.push(HOME_SECTION_ROUTES.profile)}
                    type="button"
                  >
                    <UserIcon />
                  </button>
                </div>
              )}

              <div className="lg:mt-0 mt-11">
              {activeSection === "home" ? (
                <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-3">
                  {weekDates.map((date) => {
                    const active = getIsoDate(date) === selectedIsoDate;
                    return (
                      <button
                        key={date.toISOString()}
                        className={cn(
                          "flex min-w-0 flex-col items-center rounded-[14px] px-1 py-2 transition-all duration-200 sm:px-2 md:py-2.5",
                          active ? "bg-green-800 text-white shadow-[0_10px_18px_rgba(105,151,114,0.26)]" : "text-[#7f8690] hover:bg-[#f3f3ee]",
                        )}
                        onClick={() => handleDateClick(date)}
                        type="button"
                      >
                        <span className={cn("text-[11px] font-medium", active ? "text-white/80" : "text-[#9da3aa]")}>
                          {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)}
                        </span>
                        <span className="mt-1 text-[19px] font-semibold leading-none">{date.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="mt-2 rounded-[18px] border border-[#f0d7d7] bg-[#fff4f4] px-4 py-3 text-[13px] text-[#c05454]">
                  {errorMessage}
                </div>
              ) : null}

              {activeSection === "daily" ? (
                <div className="mt-5">
                  <DailyGoalsSection
                    loading={loading}
                    onBack={handleDailyBack}
                    onSaveMetric={handleSaveDailyGoalMetric}
                    scope={user?.id ?? "guest"}
                    summary={effectiveDashboard?.dailyGoals ?? null}
                  />
                </div>
              ) : activeSection === "profile" ? (
                <div className="mt-2">
                  <ProfileSection
                    key={profile?.updatedAt ?? profile?.id ?? "profile"}
                    analyzingAi={analyzingProfileAi}
                    loading={profileLoading}
                    onBack={handleProfileBack}
                    onAnalyzeAiNote={handleAnalyzeProfileAiNote}
                    onSaveProfile={handleSaveProfile}
                    onUploadReport={handleReportUpload}
                    profile={profile}
                    reports={medicalReports}
                    savingProfile={savingProfile}
                    uploadingReport={uploadingReport}
                  />
                </div>
              ) : activeSection === "weekly" ? (
                <div className="mt-2">
                  <WeeklySummarySection
                    onBack={handleWeeklyBack}
                    summary={dashboard?.weeklySummary ?? null}
                  />
                </div>
              ) : activeSection === "weight" ? (
                <div className="mt-2">
                  <WeightTrackerSection
                    loading={weightTrackerLoading}
                    onBack={handleWeightBack}
                    onSaveEntry={handleSaveWeightEntry}
                    saving={savingWeightEntry}
                    summary={weightTracker}
                  />
                </div>
              ) : activeSection === "reminders" ? (
                <div className="mt-2">
                  <ReminderSection onBack={handleWeeklyBack} />
                </div>
              ) : activeSection === "referral" ? (
                <div className="mt-2">
                  <ReferralSection
                    onBack={handleWeeklyBack}
                    referralCode={user?.referralCode ?? null}
                    referralCount={user?.referralCount ?? 0}
                    referredByCode={user?.referredByCode ?? null}
                    userName={user?.name ?? "there"}
                    onShareMessage={(message) =>
                      toast({
                        title: "Referral link ready",
                        description: message,
                        variant: "success",
                      })
                    }
                  />
                </div>
              ) : activeSection === "terms" ? (
                <div className="mt-2">
                  <PlaceholderSection
                    onBack={handleWeeklyBack}
                    title="Terms & Privacy"
                  />
                </div>
              ) : activeSection === "support" ? (
                <div className="mt-2">
                  <PlaceholderSection
                    onBack={handleWeeklyBack}
                    title="Feedback & Support"
                  />
                </div>
              ) : activeSection === "settings" ? (
                <div className="mt-2">
                  <SettingsSection
                    loading={profileLoading}
                    onBack={handleSettingsBack}
                    onSave={() => void handleSaveChatPreferences()}
                    onToggle={handleToggleChatPreference}
                    preferences={chatPreferences}
                    saving={savingChatPreferences}
                  />
                </div>
              ) : activeSection === "home" ? (
                <div className="mt-5 grid min-w-0 gap-4 grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)] xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)]">
                  <div className="min-w-0 space-y-4">
                    <CaloriesCard
                      current={Math.round(caloriesMetric?.current ?? 0)}
                      foodCalories={totalFoodCalories}
                      exerciseCalories={totalExerciseCalories}
                      loading={loading}
                      remaining={remainingCalories}
                      target={Math.round(caloriesMetric?.target ?? 0)}
                    />

                    <MacrosCard
                      carbs={carbsMetric}
                      fat={fatMetric}
                      loading={loading}
                      protein={proteinMetric}
                    />

                    <div className="grid min-w-0 gap-2 grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:gap-3">
                      <DesktopSummaryCard
                        calories={Math.round(caloriesMetric?.current ?? 0)}
                        completion={effectiveDashboard?.dailyGoals.completionPercent ?? 0}
                        loading={loading}
                        target={Math.round(caloriesMetric?.target ?? 0)}
                        water={currentWater}
                      />
                      <WaterCard
                        current={currentWater}
                        loading={loading}
                        saving={savingWater}
                        target={targetWater}
                        onDecrement={() => void handleWaterUpdate(-1)}
                        onIncrement={() => void handleWaterUpdate(1)}
                      />
                    </div>
                  </div>

                  <div className="min-w-0 space-y-4">
                    <button
                      type="button"
                      onClick={() => setChatHistoryModalOpen(true)}
                      className="flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-[#f7f7f3] text-[14px] font-semibold text-[#111111] transition-colors hover:bg-[#efefe9]"
                    >
                      <MessageSquareText className="h-5 w-5 text-green-600" />
                      See previous messages
                    </button>
                  </div>
                </div>
              ) : null}
              </div>
            </div>
            
            {/* Fixed Chat Input for Home Section */}
            {activeSection === "home" ? (
              <div className="fixed bottom-2 left-0 right-0 z-40 mx-auto w-full px-4 pb-4 sm:px-5 md:px-6 lg:left-70 lg:w-[calc(100%-17.5rem)] xl:max-w-310 xl:px-8 pointer-events-none">
                <div className="pointer-events-auto">
                  <QuickInputCard
                    chatImage={chatImage}
                    chatImagePreview={chatImagePreview}
                    chatting={chatting}
                    chatInput={chatInput}
                    onChange={setChatInput}
                    onFocusChange={setChatFocused}
                    onImageRemove={handleImageRemove}
                    onImageSelect={handleImageSelect}
                    onSpeechUnavailable={handleSpeechUnavailable}
                    prompt={rotatingChatPrompts[promptIndex]}
                    promptFading={promptFading}
                    onSubmit={handleQuickChatSubmit}
                  />
                </div>
              </div>
            ) : null}
          </section>

          {reportOpen ? (
            <ReportModal
              filter={reportFilter}
              loading={progressReportLoading}
              mode={reportMode}
              onClose={() => setReportOpen(false)}
              onFilterChange={setReportFilter}
              onShare={() => void handleShareFromModal()}
              report={progressReport}
              shareMessage={shareMessage}
              sharing={sharing}
            />
          ) : null}

          {chatHistoryModalOpen ? (
            <div className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#2c2f32]/18 p-0 sm:p-4 backdrop-blur-[2px]">
              <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-[#ecece7] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] sm:rounded-[28px]">
                <div className="flex items-start justify-between border-b border-[#ecece7] px-6 py-4">
                  <p className="text-[16px] font-semibold text-[#111111]">Previous Messages</p>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#8d9399] transition-colors hover:bg-[#f3f3ee]"
                    onClick={() => setChatHistoryModalOpen(false)}
                    type="button"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto w-full bg-[#fcfcf9] p-4">
                  <ChatHistoryPanel
                    history={chatHistory}
                    loading={historyLoading}
                    loggedItems={loggedNutritionItems}
                    onSelectMessage={(msg, contextName) => {
                      setSelectedMessageContext(contextName);
                      setSelectedMessage(msg);
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {selectedMessage ? (
            <MessageModalRouter
              loggedItem={loggedNutritionItems[selectedMessage.id]}
              contextName={selectedMessageContext}
              message={selectedMessage}
              selectedIsoDate={selectedIsoDate}
              onClose={() => setSelectedMessage(null)}
              onLogSave={(totals) => {
                const dateIso = selectedIsoDate;
                handleCaloriesMacrosUpdate(selectedMessage.id, totals, dateIso);
              }}
              onRefetchUpdate={(newAssistantMsg, newUserQueryText) => {
                const replacedMsg = { ...newAssistantMsg, id: selectedMessage.id };
                
                setChatHistory((prev) => {
                  const newHistory = [...prev];
                  const astIdx = newHistory.findIndex((m) => m.id === selectedMessage.id);
                  if (astIdx !== -1) {
                    newHistory[astIdx] = replacedMsg;
                    if (astIdx > 0 && newHistory[astIdx - 1].role === "user") {
                      newHistory[astIdx - 1] = { ...newHistory[astIdx - 1], message: newUserQueryText };
                    }
                  }
                  return newHistory;
                });
                
                setSelectedMessage(replacedMsg);
                setSelectedMessageContext(newUserQueryText);
              }}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function SidebarPanel({
  activeSection,
  onAdminToggle,
  onClose,
  onLogout,
  onSelect,
  user,
  onDownloadReport,
}: {
  activeSection: HomeSectionKey;
  onAdminToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
  onSelect: (id: HomeSectionKey) => void;
  user: User | null;
  onDownloadReport?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[#ecece7] px-5 py-5">
        <Link
            href="/about"
            title="About Nofone"
            className="flex items-center gap-3 rounded-xl transition-opacity hover:opacity-75"
          >
          <Image
            src="/logo.png"
            alt="NofOne Logo"
            width={100}
            height={100}
            className="rounded-xl scale-150 ml-4"
          />
          </Link>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#8d9399] transition-colors hover:bg-[#f3f3ee] lg:hidden"
          onClick={onClose}
          type="button"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-1">
          {primarySidebarItems.map((item) => (
            <button
              key={item.key}
              className={cn(
                "flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-[15px] text-[#111111] transition-colors hover:bg-[#f4f4ef]",
                activeSection === item.id && "bg-[#f4f4ef]",
              )}
              onClick={() => {
                onSelect(item.id as HomeSectionKey);
                onClose();
              }}
              type="button"
            >
              <span className="text-[#8a9198]">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-[#ecece7] px-4 py-4">
        <div className="space-y-1">
          {user?.role === "admin" ? (
            <button
              className="flex w-full items-center justify-between rounded-[14px] border border-[#e5e7e1] bg-white px-4 py-3 text-left transition-colors hover:bg-[#f7f7f3]"
              onClick={() => {
                onAdminToggle();
                onClose();
              }}
              type="button"
            >
              <div className="flex items-center gap-3">
                <span className="text-green-800">
                  <Shield className="h-4.25 w-4.25" />
                </span>
                <div>
                  <p className="text-[15px] text-[#111111]">Admin mode</p>
                  <p className="text-[12px] text-[#8a9198]">Switch to admin</p>
                </div>
              </div>
              <ModeSidebarSwitch checked={false} />
            </button>
          ) : null}
          {secondarySidebarItems.map((item) => (
            <button
              key={item.key}
              className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-[15px] text-[#111111] transition-colors hover:bg-[#f4f4ef]"
              onClick={() => {
                if (item.id === "logout") {
                  void onLogout();
                  return;
                }
                onSelect(item.id as HomeSectionKey);
                onClose();
              }}
              type="button"
            >
              <span className="text-[#8a9198]">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          {onDownloadReport && (
            <button
              className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-[15px] text-[#111111] transition-colors hover:bg-[#f4f4ef]"
              onClick={onDownloadReport}
              type="button"
            >
              <span className="text-[#8a9198]">
                <Download className="h-[20px] w-[20px]" />
              </span>
              <span>Download Report</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModeSidebarSwitch({ checked }: { checked: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300",
        checked ? "bg-green-800" : "bg-[#dcefdc]",
      )}
    >
      <span
        className={cn(
          "absolute h-5 w-5 rounded-full bg-white transition-transform duration-300",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </div>
  );
}

function ReferralSection({
  onBack,
  onShareMessage,
  referralCode,
  referralCount,
  referredByCode,
  userName,
}: {
  onBack: () => void;
  onShareMessage: (message: string) => void;
  referralCode: string | null;
  referralCount: number;
  referredByCode: string | null;
  userName: string;
}) {
  const shareUrl = useMemo(() => {
    if (!referralCode) {
      return "";
    }

    if (typeof window !== "undefined") {
      const url = new URL("/", window.location.origin);
      url.searchParams.set("ref", referralCode);
      return url.toString();
    }

    return `/?ref=${encodeURIComponent(referralCode)}`;
  }, [referralCode]);

  async function handleCopyLink() {
    if (!shareUrl || typeof window === "undefined") {
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    onShareMessage("Referral link copied to your clipboard.");
  }

  async function handleNativeShare() {
    if (!shareUrl || typeof window === "undefined") {
      return;
    }

    const shareText = `${userName} invited you to join Nofone. Use this link to sign up: ${shareUrl}`;

    if (navigator.share) {
      await navigator.share({
        title: "Join Nofone",
        text: shareText,
        url: shareUrl,
      });
      onShareMessage("Referral link shared successfully.");
      return;
    }

    await handleCopyLink();
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-10 animate-fade-up">
      <div className="flex items-center gap-3 px-1">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#4b4f55] transition-colors hover:bg-[#f3f3ee]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeftIcon />
        </button>
        <h1 className="text-[32px] font-semibold tracking-tight text-[#171717]">Referral Code</h1>
      </div>

      <BaseCard className="overflow-hidden p-0">
        <div className="bg-[linear-gradient(135deg,#1f8a47_0%,#75c18a_100%)] px-6 py-7 text-white">
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-white/70">Share your invite</p>
          <p className="mt-3 max-w-xl text-[28px] font-semibold leading-tight">
            Invite your friends to NofOne and get notified when they sign up using your referral code.
          </p>
        </div>
        <div className="space-y-5 p-6">
          <div className="rounded-[22px] border border-[#ecece7] bg-[#fcfcf9] p-5">
            <p className="text-[13px] font-medium text-[#8b929b]">Your referral code</p>
            <p className="mt-2 text-[30px] font-semibold tracking-[0.18em] text-[#171717]">
              {referralCode || "Generating..."}
            </p>
            <p className="mt-3 text-[14px] leading-6 text-[#6e757d]">
              When someone opens your link and creates a new account, that signup is attached back to you
            </p>
          </div>

          <div className="rounded-[22px] border border-[#ecece7] bg-white p-5">
            <p className="text-[13px] font-medium text-[#8b929b]">Share URL</p>
            <div className="mt-2 rounded-[16px] bg-[#f5f6f1] px-4 py-3 text-[14px] leading-6 text-[#25292e] break-all">
              {shareUrl || "Your referral link will appear here once your code is ready."}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button disabled={!shareUrl} onClick={() => void handleCopyLink()} type="button">
                Copy Link
              </Button>
              <Button disabled={!shareUrl} onClick={() => void handleNativeShare()} type="button" variant="outline">
                Share Link
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <BaseCard className="p-5">
              <p className="text-[13px] font-medium text-[#8b929b]">Successful referrals</p>
              <p className="mt-2 text-[32px] font-semibold leading-none text-[#171717]">{referralCount}</p>
            </BaseCard>
            <BaseCard className="p-5">
              <p className="text-[13px] font-medium text-[#8b929b]">You joined with</p>
              <p className="mt-2 text-[20px] font-semibold leading-none text-[#171717]">
                {referredByCode || "No referral used"}
              </p>
            </BaseCard>
          </div>
        </div>
      </BaseCard>
    </div>
  );
}

function DesktopSummaryCard({
  calories,
  completion,
  loading,
  target,
  water,
}: {
  calories: number;
  completion: number;
  loading: boolean;
  target: number;
  water: number;
}) {
  if (loading) {
    return (
      <BaseCard className="p-4">
        <ShimmerLine className="h-4 w-28" />
        <div className="mt-3 flex gap-3">
          <ShimmerBlock className="h-24 flex-1" />
        </div>
      </BaseCard>
    );
  }

  return (
    <BaseCard className="animate-fade-up p-3 sm:p-4 h-full relative min-h-[140px]">
      <div className="flex items-center gap-2">
        <TinyIconCircle bg="bg-[#e2f1e2]" text="text-[#166534]">
          <Target/>
        </TinyIconCircle>
        <p className="text-[13px] sm:text-[14px] font-semibold text-[#111111]">Completion</p>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none pt-6 sm:pt-8">
        <p className="text-[32px] sm:text-[42px] font-semibold leading-none text-[#111111]">{completion}%</p>
        <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-[12px] text-[#9ea4ab]">Calories {calories} / {target}</p>
      </div>
    </BaseCard>
  );
}

function CaloriesCard({
  current,
  exerciseCalories,
  foodCalories,
  loading,
  remaining,
  target,
}: {
  current: number;
  exerciseCalories: number;
  foodCalories: number;
  loading: boolean;
  remaining: number;
  target: number;
}) {
  const progress = Math.min(current / Math.max(target, 1), 1);
  const progressDegrees = progress * 360;

  if (loading) {
    return (
      <BaseCard className="p-4">
        <ShimmerLine className="h-4 w-24" />
        <div className="mt-5 grid grid-cols-[86px_1fr] items-center gap-5">
          <div className="h-21.5 w-21.5 rounded-full bg-[#f3f3ee] shimmer" />
          <div className="grid grid-cols-3 gap-4">
            <ShimmerBlock className="h-16" />
            <ShimmerBlock className="h-16" />
            <ShimmerBlock className="h-16" />
          </div>
        </div>
      </BaseCard>
    );
  }

  return (
    <BaseCard className="animate-fade-up p-4">
      <div className="flex items-center gap-2">
        <TinyIconCircle bg="bg-[#fff0dd]" text="text-[#f1ad60]">
          <Flame/>
        </TinyIconCircle>
        <p className="text-[14px] font-semibold text-[#111111]">Calories</p>
      </div>

      <div className="mt-5 grid min-w-0 gap-2 grid-cols-[auto_minmax(0,1fr)] sm:gap-5">
        <div
          className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full sm:h-21.5 sm:w-21.5"
          style={{
  background: `conic-gradient(#166534 ${progressDegrees}deg, #f2efe8 0deg)`,
}}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white sm:h-18.5 sm:w-18.5">
            <div className="text-center leading-none">
              <p className="text-[16px] font-semibold text-[#111111] sm:text-[20px]">{remaining}</p>
              <p className="mt-0.5 text-[9px] text-[#a0a4aa] sm:mt-1 sm:text-[10px]">remaining</p>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2 md:gap-4">
          <SmallStat label="Food" value={foodCalories} />
          <SmallStat label="Exercise" value={exerciseCalories} />
          <SmallStat accent valueColor="text-green-800" label="Goal" value={target} />
        </div>
      </div>
    </BaseCard>
  );
}

function MacrosCard({
  carbs,
  fat,
  loading,
  protein,
}: {
  carbs: DashboardSummary["dailyGoals"]["metrics"][number] | null;
  fat: DashboardSummary["dailyGoals"]["metrics"][number] | null;
  loading: boolean;
  protein: DashboardSummary["dailyGoals"]["metrics"][number] | null;
}) {
  if (loading) {
    return (
      <BaseCard className="p-2">
        <ShimmerLine className="h-4 w-20" />
        <div className="mt-5 grid grid-cols-3 gap-4">
          <ShimmerBlock className="h-25" />
          <ShimmerBlock className="h-25" />
          <ShimmerBlock className="h-25" />
        </div>
      </BaseCard>
    );
  }

  return (
    <BaseCard className="animate-fade-up animation-delay-1 p-4">
      <div className="flex items-center gap-2">
        <TinyIconCircle bg="bg-[#ffe9ef]" text="text-[#e07c9f]">
          <Target/>
        </TinyIconCircle>
        <p className="text-[14px] font-semibold text-[#111111]">Macros</p>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-3 gap-2 justify-items-center sm:gap-3 md:gap-4">
        <MacroPill label="Carbs" metric={carbs} />
        <MacroPill label="Protein" metric={protein} />
        <MacroPill label="Fat" metric={fat} />
      </div>
    </BaseCard>
  );
}

function WaterCard({
  current,
  loading,
  onDecrement,
  onIncrement,
  saving,
  target,
}: {
  current: number;
  loading: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  saving: boolean;
  target: number;
}) {
  if (loading) {
    return (
      <BaseCard className="p-4">
        <ShimmerLine className="h-4 w-16" />
        <div className="mt-5 h-29.5 rounded-[18px] bg-[#f3f3ee] shimmer" />
      </BaseCard>
    );
  }

  return (
    <BaseCard className="animate-fade-up animation-delay-2 p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <TinyIconCircle bg="bg-[#e7f4ff]" text="text-[#6bb0e7]">
          <DropletIcon/>
        </TinyIconCircle>
        <p className="text-[13px] sm:text-[14px] font-semibold text-[#111111]">Water</p>
      </div>

      <div className="mt-2 sm:mt-3 text-center">
        <p className="text-[28px] sm:text-[39px] font-semibold leading-none text-[#111111]">{current}</p>
        <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-[#9ea4ab]">of {target} cups</p>
      </div>

      <div className="mt-2 sm:mt-3 flex justify-center gap-1">
        {Array.from({ length: target }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 w-1.5 sm:h-1.75 sm:w-1.75 rounded-full transition-colors duration-300",
              index < current ? "bg-[#69afe9]" : "bg-[#d9ecfb]",
            )}
          />
        ))}
      </div>

      <div className="mt-2 sm:mt-4 grid grid-cols-2 gap-1.5 sm:gap-2">
        <ActionPill disabled={saving || current <= 0} onClick={onDecrement}>
          -
        </ActionPill>
        <ActionPill disabled={saving} onClick={onIncrement} primary>
          +
        </ActionPill>
      </div>
    </BaseCard>
  );
}

function ReportCard({
  loading,
  onShare,
  onView,
  report,
  shareMessage,
  sharing,
}: {
  loading: boolean;
  onShare: () => void;
  onView: () => void;
  report: WeeklyReport | null;
  shareMessage: string | null;
  sharing: boolean;
}) {
  if (loading) {
    return (
      <BaseCard className="p-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#f3f3ee] shimmer" />
          <div className="flex-1 space-y-2">
            <ShimmerLine className="h-4 w-24" />
            <ShimmerLine className="h-3 w-full" />
            <ShimmerLine className="h-3 w-[78%]" />
          </div>
        </div>
        <div className="mt-4 border-t border-[#efefe9] pt-3">
          <div className="flex gap-4">
            <ShimmerLine className="h-3 w-12" />
            <ShimmerLine className="h-3 w-14" />
          </div>
        </div>
      </BaseCard>
    );
  }

  return (
    <BaseCard className="animate-fade-up animation-delay-3 p-4">
      <div className="flex gap-4 items-center">
        <Image
          src="/logo.png"
          alt="NofOne Logo"
          width={100}
          height={100}
          className="rounded-xl shrink-0 scale-125"
        />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#111111]">NofOne</p>
          <p className="mt-1 text-[14px] leading-6 text-[#8e949c]">
            {report?.subtitle || "Your report for last week is ready. Take a moment to review your progress."}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-[#efefe9] pt-3">
        <div className="flex items-center gap-5 text-[13px] text-green-800">
          <button
            className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
            onClick={onView}
            type="button"
          >
            <EyeSmallIcon />
            View
          </button>
          <button
            className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
            onClick={onShare}
            type="button"
          >
            <ShareSmallIcon />
            {sharing ? "Sharing..." : "Share"}
          </button>
        </div>
        {shareMessage ? (
          <p className="mt-2 text-[12px] text-[#8e949c]">{shareMessage}</p>
        ) : null}
      </div>
    </BaseCard>
  );
}

function QuickInputCard({
  chatImage,
  chatImagePreview,
  chatting,
  chatInput,
  onChange,
  onFocusChange,
  onImageRemove,
  onImageSelect,
  onSpeechUnavailable,
  prompt,
  promptFading,
  onSubmit,
}: {
  chatImage: File | null;
  chatImagePreview: string | null;
  chatting: boolean;
  chatInput: string;
  onChange: (value: string) => void;
  onFocusChange: (value: boolean) => void;
  onImageRemove: () => void;
  onImageSelect: (file: File) => void;
  onSpeechUnavailable: (message: string) => void;
  prompt: string;
  promptFading: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imagePickerMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isImagePickerOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!imagePickerMenuRef.current?.contains(event.target as Node)) {
        setIsImagePickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isImagePickerOpen]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
    setIsImagePickerOpen(false);
    // Reset so the same file can be re-selected
    event.target.value = "";
  }

  function openGalleryPicker() {
    setIsImagePickerOpen(false);
    galleryInputRef.current?.click();
  }

  function openCameraPicker() {
    setIsImagePickerOpen(false);
    cameraInputRef.current?.click();
  }

  function handleMicToggle() {
    if (typeof window === "undefined") {
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const RecognitionConstructor =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!RecognitionConstructor) {
      onSpeechUnavailable("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new RecognitionConstructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let transcript = "";
      let finalTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const nextTranscript = event.results[index][0]?.transcript ?? "";
        transcript += nextTranscript;

        if (event.results[index].isFinal) {
          finalTranscript += nextTranscript;
        }
      }

      const nextValue = transcript.trim();
      setLiveTranscript(nextValue);
      onChange(nextValue);

      if (finalTranscript.trim()) {
        setLiveTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setLiveTranscript("");
      recognitionRef.current = null;

      if (event.error === "not-allowed") {
        onSpeechUnavailable("Microphone permission was denied. Please allow microphone access and try again.");
        return;
      }

      if (event.error === "no-speech") {
        onSpeechUnavailable("No speech was detected. Try speaking a little closer to the microphone.");
        return;
      }

      onSpeechUnavailable("Voice input could not start properly. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
      setLiveTranscript("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  return (
    <div className="animate-fade-up animation-delay-4">
      <form
        className="relative overflow-visible rounded-[18px] bg-[#f3f1eb] shadow-[0_8px_18px_rgba(0,0,0,0.03)]"
        onSubmit={onSubmit}
      >
        {/* Image preview strip */}
        {chatImagePreview ? (
          <div className="flex items-center gap-2 border-b border-[#e8e6e0] px-3 pt-3 pb-2">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={chatImage?.name ?? "Attached image"}
                className="h-full w-full object-cover"
                src={chatImagePreview}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-[#111111]">
                {chatImage?.name ?? "Image"}
              </p>
              <p className="text-[11px] text-[#9ea4ab]">
                {chatImage ? `${(chatImage.size / 1024).toFixed(0)} KB` : ""}
              </p>
            </div>
            <button
              aria-label="Remove image"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e0ddd6] text-[#6f7680] transition-colors hover:bg-[#d5d2cb]"
              onClick={onImageRemove}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>
        ) : null}

        {/* Text + action row */}
        <div className="flex gap-2 px-4 py-3 items-center">
          <textarea
            className={cn(
              "min-w-0 flex-1 bg-transparent text-[14px] text-[#111111] focus:outline-none resize-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
              promptFading ? "placeholder-fade-out" : "placeholder-fade-in",
              "placeholder:text-[#7d848c]",
              "max-h-40 min-h-[40px]",
            )}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => onFocusChange(true)}
            onBlur={() => onFocusChange(false)}
            placeholder={chatImagePreview ? "Add a caption…" : prompt}
            value={chatInput}
            rows={1}
            style={{
              overflowY: 'auto',
            }}
          />
          <button
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/70 flex-shrink-0",
              isListening ? "bg-white text-green-800" : "text-[#7d8791]",
            )}
            disabled={chatting}
            onClick={handleMicToggle}
            type="button"
          >
            <Mic className={cn("h-4.5 w-4.5", isListening && "animate-pulse")} />
          </button>
          <div className="relative flex-shrink-0" ref={imagePickerMenuRef}>
            <button
              aria-expanded={isImagePickerOpen}
              aria-haspopup="menu"
              aria-label="Attach image"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/70",
                chatImagePreview || isImagePickerOpen ? "text-green-800" : "text-[#7d8791]",
              )}
              onClick={() => setIsImagePickerOpen((current) => !current)}
              type="button"
            >
              <CameraIcon />
            </button>

            {isImagePickerOpen ? (
              <div
                className="absolute right-0 bottom-11 z-20 w-48 overflow-hidden rounded-2xl border border-[#e5e1d8] bg-white p-1.5 shadow-[0_14px_30px_rgba(0,0,0,0.10)]"
                role="menu"
              >
                <button
                  className="flex w-full items-center rounded-[14px] px-3 py-2.5 text-left text-[13px] font-medium text-[#111111] transition-colors hover:bg-[#f5f2ea]"
                  onClick={openGalleryPicker}
                  role="menuitem"
                  type="button"
                >
                  Choose from gallery
                </button>
                <button
                  className="flex w-full items-center rounded-[14px] px-3 py-2.5 text-left text-[13px] font-medium text-[#111111] transition-colors hover:bg-[#f5f2ea]"
                  onClick={openCameraPicker}
                  role="menuitem"
                  type="button"
                >
                  Open camera
                </button>
              </div>
            ) : null}
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#111111] transition-colors hover:bg-white/70 disabled:opacity-40 flex-shrink-0 ml-auto"
            disabled={chatting || (!chatInput.trim() && !chatImagePreview)}
            type="submit"
          >
            <SendIcon />
          </button>
        </div>
      </form>

      {/* Hidden file input */}
      <input
        ref={galleryInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        type="file"
      />
      <input
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        type="file"
      />

      {chatting ? (
        <div className="mt-2 rounded-2xl bg-white px-4 py-3 text-[13px] text-[#6f7680] shadow-[0_8px_18px_rgba(0,0,0,0.03)]">
          Thinking...
        </div>
      ) : isListening ? (
        <div className="mt-2 rounded-2xl bg-white px-4 py-3 text-[13px] text-[#6f7680] shadow-[0_8px_18px_rgba(0,0,0,0.03)]">
          <p className="font-medium text-[#4c535c]">Listening...</p>
          <p className="mt-1">
            {liveTranscript || "Speak now and your message will be transcribed in real time."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ReportModal({
  filter,
  loading,
  mode,
  onClose,
  onFilterChange,
  onShare,
  report,
  shareMessage,
  sharing,
}: {
  filter: ReportFilterState;
  loading: boolean;
  mode: ReportModalMode;
  onClose: () => void;
  onFilterChange: React.Dispatch<React.SetStateAction<ReportFilterState>>;
  onShare: () => void;
  report: ProgressReport | null;
  shareMessage: string | null;
  sharing: boolean;
}) {
  const currentSummary = report?.summary;
  const currentGoals = report?.dailyGoals.metrics ?? [];
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function handleDownloadPdf() {
    if (!report) return;
    setDownloadingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 40;
      const contentW = pageW - margin * 2;
      let y = margin;

      function ensurePage(needed: number) {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      }

      // ── Header ─────────────────────────────────────────────────────────────
      // Green badge
      doc.setFillColor(22, 101, 52);
      doc.roundedRect(margin, y, 28, 28, 6, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("N1", margin + 14, y + 17, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(17, 17, 17);
      doc.text(report.report.title || "Progress Report", margin + 36, y + 19);
      y += 44;

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(142, 148, 156);
      const subtitleLines = doc.splitTextToSize(
        report.report.subtitle || `${report.metadata.startDate} to ${report.metadata.endDate} · ${report.metadata.days} day(s)`,
        contentW,
      );
      doc.text(subtitleLines, margin, y);
      y += subtitleLines.length * 14 + 8;

      // Divider
      doc.setDrawColor(239, 239, 233);
      doc.setLineWidth(1);
      doc.line(margin, y, pageW - margin, y);
      y += 20;

      // ── Section helper ─────────────────────────────────────────────────────
      function sectionTitle(text: string) {
        ensurePage(32);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(17, 17, 17);
        doc.text(text, margin, y);
        y += 18;
      }

      function chip(
        x: number,
        chipY: number,
        w: number,
        h: number,
        label: string,
        value: string,
        bg: [number, number, number] = [247, 247, 243],
      ) {
        doc.setFillColor(...bg);
        doc.roundedRect(x, chipY, w, h, 8, 8, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(158, 164, 171);
        doc.text(label.toUpperCase(), x + 10, chipY + 14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(17, 17, 17);
        doc.text(value, x + 10, chipY + 28);
      }

      // ── Summary stats ──────────────────────────────────────────────────────
      sectionTitle("Summary");
      ensurePage(70);
      const statW = (contentW - 16) / 3;
      const stats: [string, string][] = [
        ["Avg Calories", String(Math.round(currentSummary?.avgCalories ?? 0))],
        ["Goals Met", currentSummary?.goalsMet ?? "0/0"],
        ["Weight To Go", report.weightTracker.toGo != null ? `${report.weightTracker.toGo} kg` : "—"],
      ];
      stats.forEach(([label, value], i) => {
        chip(margin + i * (statW + 8), y, statW, 52, label, value);
      });
      y += 68;

      // Date range sub-label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(125, 132, 140);
      doc.text(
        `${report.metadata.startDate}  →  ${report.metadata.endDate}  ·  ${report.metadata.days} day(s)`,
        margin,
        y,
      );
      y += 24;

      // ── Highlights ────────────────────────────────────────────────────────
      sectionTitle("Highlights");
      for (const item of report.report.highlights) {
        const lines = doc.splitTextToSize(`• ${item}`, contentW - 24);
        const blockH = lines.length * 13 + 18;
        ensurePage(blockH + 8);
        doc.setFillColor(247, 247, 243);
        doc.roundedRect(margin, y, contentW, blockH, 8, 8, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(109, 116, 123);
        doc.text(lines, margin + 12, y + 14);
        y += blockH + 8;
      }
      y += 4;

      // ── Goal targets ─────────────────────────────────────────────────────
      sectionTitle("Goal Targets");
      const halfW = (contentW - 8) / 2;
      currentGoals.forEach((metric, i) => {
        const col = i % 2;
        if (col === 0) ensurePage(54);
        const gx = margin + col * (halfW + 8);
        chip(
          gx,
          y,
          halfW,
          46,
          metric.label,
          `${Math.round(metric.current)} / ${Math.round(metric.target)} ${metric.unit}`,
        );
        if (col === 1 || i === currentGoals.length - 1) {
          y += 54;
        }
      });
      y += 4;

      // ── Daily Entries ─────────────────────────────────────────────────────
      sectionTitle("Daily Entries");
      for (const entry of report.entries) {
        const rowCount = Math.ceil(9 / 3);
        const entryH = 24 + rowCount * 46 + 16;
        ensurePage(entryH + 12);

        // Entry header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(17, 17, 17);
        doc.text(entry.date, margin, y + 14);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(125, 132, 140);
        doc.text(`${entry.goals.completionPercent}% completed`, pageW - margin, y + 14, { align: "right" });
        y += 22;

        const entryMetrics: [string, string][] = [
          ["Calories", `${entry.metrics.calories} cal`],
          ["Protein", `${entry.metrics.protein} g`],
          ["Carbs", `${entry.metrics.carbs} g`],
          ["Fat", `${entry.metrics.fat} g`],
          ["Water", `${entry.metrics.waterIntake} cups`],
          ["Sleep", `${entry.metrics.sleepHours} hrs`],
          ["Exercise", `${entry.metrics.exerciseMinutes} min`],
          ["Burn", `${entry.metrics.exerciseCalories} cal`],
          ["Weight", entry.metrics.weight != null ? `${entry.metrics.weight} kg` : "—"],
        ];
        const chipW3 = (contentW - 16) / 3;
        entryMetrics.forEach(([label, value], i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          if (col === 0 && row > 0) ensurePage(46);
          chip(margin + col * (chipW3 + 8), y + row * 46, chipW3, 38, label, value);
        });
        y += Math.ceil(entryMetrics.length / 3) * 46 + 12;

        // Entry divider
        doc.setDrawColor(239, 239, 233);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageW - margin, y);
        y += 12;
      }

      // ── Footer on every page ───────────────────────────────────────────────
      const totalPages = (doc.internal as unknown as { getNumberOfPages(): number }).getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(158, 164, 171);
        doc.text(`NofOne Health Report  ·  Page ${p} of ${totalPages}`, pageW / 2, pageH - 20, { align: "center" });
      }

      const filename = `nofone-report-${report.metadata.startDate}-to-${report.metadata.endDate}.pdf`;
      doc.save(filename);
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div className="fixed inset-0 z-140 flex items-center justify-center bg-[#2c2f32]/18 p-4 backdrop-blur-[2px]">
      <button
        aria-label="Close report modal"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#ecece7] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#efefe9] px-5 py-5 sm:px-6">
          <div>
            <p className="text-[20px] font-semibold text-[#111111]">
              {mode === "share" ? "Share detailed report" : report?.report.title || "Detailed progress report"}
            </p>
            <p className="mt-2 text-[14px] leading-6 text-[#8e949c]">
              {mode === "share"
                ? "Choose a time period and generate a link with the full progress breakdown."
                : report?.report.subtitle || "Review a detailed snapshot of your nutrition, hydration, sleep, exercise, and weight."}
            </p>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8d9399] transition-colors hover:bg-[#f3f3ee]"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-4">
              <BaseCard className="p-4">
                <p className="text-[14px] font-semibold text-[#111111]">Report range</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {([
                    ["date", "Date"],
                    ["weekly", "Weekly"],
                    ["monthly", "Monthly"],
                    ["range", "Range"],
                  ] as const).map(([kind, label]) => (
                    <button
                      key={kind}
                      className={cn(
                        "rounded-[14px] border px-3 py-2 text-[13px] font-medium transition-colors",
                        filter.kind === kind
                          ? "border-green-800 bg-[#edf5ee] text-green-900"
                          : "border-[#ecece7] bg-white text-[#6f7680] hover:bg-[#f7f7f3]",
                      )}
                      onClick={() =>
                        onFilterChange((current) => ({
                          ...current,
                          kind,
                          range: kind === "range" ? current.range : undefined,
                        }))
                      }
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-[20px] border border-[#ecece7] bg-[#fcfcf9] p-2">
                  {filter.kind === "range" ? (
                    <Calendar
                      mode="range"
                      selected={filter.range}
                      onSelect={(range) =>
                        onFilterChange((current) => ({
                          ...current,
                          range,
                        }))
                      }
                    />
                  ) : (
                    <Calendar
                      mode="single"
                      selected={filter.anchorDate}
                      onSelect={(date) => {
                        if (date) {
                          onFilterChange((current) => ({
                            ...current,
                            anchorDate: date,
                          }));
                        }
                      }}
                    />
                  )}
                </div>

                <div className="mt-4">
                  <Button
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-green-800 text-[13px] font-medium text-white transition-colors hover:bg-green-900 disabled:opacity-50"
                    disabled={downloadingPdf || loading || !report}
                    onClick={() => void handleDownloadPdf()}
                    type="button"
                  >
                    <DownloadIcon />
                    {downloadingPdf ? "Generating PDF..." : "Download PDF"}
                  </Button>
                </div>
              </BaseCard>
            </div>

            <div className="space-y-4">
              {loading ? (
                <BaseCard className="p-5">
                  <ShimmerLine className="h-5 w-40" />
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <ShimmerBlock className="h-24" />
                    <ShimmerBlock className="h-24" />
                    <ShimmerBlock className="h-24" />
                  </div>
                  <ShimmerBlock className="mt-4 h-40" />
                </BaseCard>
              ) : report ? (
                <>
                  <BaseCard className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[14px] font-semibold text-[#111111]">Summary</p>
                        <p className="mt-2 text-[13px] text-[#7d848c]">
                          {report.metadata.startDate} to {report.metadata.endDate} · {report.metadata.days} day(s)
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <ReportStatCard label="Avg Calories" value={String(Math.round(currentSummary?.avgCalories ?? 0))} />
                        <ReportStatCard label="Goals Met" value={currentSummary?.goalsMet ?? "0/0"} />
                        <ReportStatCard label="Weight To Go" value={report.weightTracker.toGo != null ? `${report.weightTracker.toGo} kg` : "—"} />
                      </div>
                    </div>
                  </BaseCard>

                  <BaseCard className="p-5">
                    <p className="text-[14px] font-semibold text-[#111111]">Highlights</p>
                    <div className="mt-4 space-y-3">
                      {report.report.highlights.map((item) => (
                        <div key={item} className="rounded-2xl bg-[#f7f7f3] px-4 py-3 text-[13px] leading-6 text-[#6d747b]">
                          {item}
                        </div>
                      ))}
                    </div>
                  </BaseCard>

                  <BaseCard className="p-5">
                    <p className="text-[14px] font-semibold text-[#111111]">Goal targets</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {currentGoals.map((metric) => (
                        <div key={metric.key} className="rounded-[18px] bg-[#f7f7f3] px-4 py-3">
                          <p className="text-[13px] text-[#8a9198]">{metric.label}</p>
                          <p className="mt-2 text-[18px] font-semibold text-[#111111]">
                            {Math.round(metric.current)}/{Math.round(metric.target)} {metric.unit}
                          </p>
                        </div>
                      ))}
                    </div>
                  </BaseCard>

                  <BaseCard className="p-5">
                    <p className="text-[14px] font-semibold text-[#111111]">Daily entries</p>
                    <div className="mt-4 space-y-3">
                      {report.entries.map((entry) => (
                        <div key={entry.date} className="rounded-[18px] border border-[#efefe9] px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[14px] font-semibold text-[#111111]">{entry.date}</p>
                            <p className="text-[12px] text-[#7d848c]">{entry.goals.completionPercent}% completed</p>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            <ReportEntryChip label="Calories" value={`${entry.metrics.calories} calories`} />
                            <ReportEntryChip label="Protein" value={`${entry.metrics.protein} g`} />
                            <ReportEntryChip label="Carbs" value={`${entry.metrics.carbs} g`} />
                            <ReportEntryChip label="Fat" value={`${entry.metrics.fat} g`} />
                            <ReportEntryChip label="Water" value={`${entry.metrics.waterIntake} cups`} />
                            <ReportEntryChip label="Sleep" value={`${entry.metrics.sleepHours} hrs`} />
                            <ReportEntryChip label="Exercise" value={`${entry.metrics.exerciseMinutes} min`} />
                            <ReportEntryChip label="Exercise Burn" value={`${entry.metrics.exerciseCalories} calories`} />
                            <ReportEntryChip label="Weight" value={entry.metrics.weight != null ? `${entry.metrics.weight} kg` : "—"} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </BaseCard>
                </>
              ) : (
                <BaseCard className="p-5">
                  <p className="text-[14px] text-[#7d848c]">No report data available for the selected period.</p>
                </BaseCard>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BaseCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-[22px] border-[#efefe9] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.03)]",
        className,
      )}
    >
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function ReportStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] bg-[#f7f7f3] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#9ea4ab]">{label}</p>
      <p className="mt-2 text-[20px] font-semibold leading-none text-[#111111]">{value}</p>
    </div>
  );
}

function ReportEntryChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[14px] bg-[#f7f7f3] px-3 py-3">
      <p className="text-[11px] text-[#9ea4ab]">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-[#111111]">{value}</p>
    </div>
  );
}

function SmallStat({
  accent,
  label,
  value,
  valueColor,
}: {
  accent?: boolean;
  label: string;
  value: number;
  valueColor?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] sm:text-[11px] text-[#a0a5ad]">{label}</p>
      <p className={cn("mt-1 sm:mt-2 text-[18px] sm:text-[24px] font-semibold leading-none text-[#111111]", valueColor)}>
        {value}
      </p>
      <p className={cn("mt-0.5 sm:mt-1 text-[9px] sm:text-[11px] text-[#a0a5ad]", accent && "font-medium")}>calories</p>
    </div>
  );
}

function MacroPill({
  label,
  metric,
}: {
  label: string;
  metric: DashboardSummary["dailyGoals"]["metrics"][number] | null;
}) {
  const current = Math.round(metric?.current ?? 0);
  const target = Math.max(1, Math.round(metric?.target ?? 0));
  const progress = Math.min(current / target, 1);
  const progressDegrees = progress * 360;

  return (
    <div className="text-center">
      <div
        className="mx-auto flex h-13.5 w-13.5 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#699772 ${progressDegrees}deg, #f2efe8 0deg)`,
        }}
      >
        <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-white">
          <div className="text-center leading-none">
            <p className="text-[14px] font-semibold text-[#111111]">{current}</p>
            <p className="mt-1 text-[8px] text-[#a0a5ad]">/{target}g</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-medium text-[#8a9098]">{label}</p>
    </div>
  );
}

function TinyIconCircle({
  bg,
  children,
  text,
}: {
  bg: string;
  children: React.ReactNode;
  text: string;
}) {
  return <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", bg, text)}>{children}</span>;
}

function ActionPill({
  children,
  disabled,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={cn(
        "rounded-full px-4 py-2 text-[18px] leading-none transition-colors",
        primary ? "bg-[#e8f5ff] text-[#69afe9]" : "bg-[#f3efe7] text-[#a9a39a]",
        disabled && "opacity-50",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ShimmerLine({ className }: { className?: string }) {
  return <div className={cn("rounded-full bg-[#f3f3ee] shimmer", className)} />;
}

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={cn("rounded-[18px] bg-[#f3f3ee] shimmer", className)} />;
}

function MenuIcon() {
  return (
    <svg className="h-[16px] w-[16px]" fill="none" viewBox="0 0 24 24">
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-[16px] w-[16px]" fill="none" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="h-[12px] w-[12px]" fill="none" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-[14px] w-[14px]" fill="none" viewBox="0 0 24 24">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 1 1 14 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M12.5 3c.6 2.3 3.5 3.5 3.5 7a4 4 0 1 1-8 0c0-1.8.8-3.1 1.9-4.4.4 1.5 1.3 2.6 2.6 3.2.3-1.3.2-2.7 0-5.8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-2.75 w-2.75", className)} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function WaterIcon() {
  return (
    <svg className="h-2.75 w-2.75" fill="none" viewBox="0 0 24 24">
      <path d="M12 3c2.5 3.2 5.5 6.7 5.5 10A5.5 5.5 0 0 1 6.5 13C6.5 9.7 9.5 6.2 12 3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function EyeSmallIcon() {
  return (
    <svg className="h-[13px] w-[13px]" fill="none" viewBox="0 0 24 24">
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Zm9.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ShareSmallIcon() {
  return (
    <svg className="h-[13px] w-[13px]" fill="none" viewBox="0 0 24 24">
      <path d="M15 8 9 12l6 4M18 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="h-[16px] w-[16px]" fill="none" viewBox="0 0 24 24">
      <path d="m21 3-9.5 9.5M21 3l-6 18-3.5-8.5L3 9l18-6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg className="h-[16px] w-[16px]" fill="none" viewBox="0 0 24 24">
      <path d="M4 8h3l1.4-2h3.2L13 8h7v11H4V8Zm8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Custom UI Chat Components
// ----------------------------------------------------------------------------

function ChatHistoryPanel({
  history,
  loading,
  loggedItems,
  onSelectMessage,
}: {
  history: ChatMessage[];
  loading: boolean;
  loggedItems: Record<string, LoggedNutritionItem>;
  onSelectMessage: (msg: ChatMessage, contextName?: string) => void;
}) {
  if (loading) {
    return (
      <BaseCard className="p-4">
        <ShimmerLine className="h-4 w-28 mb-3" />
        <ShimmerBlock className="h-12 w-full mb-2" />
        <ShimmerBlock className="h-16 w-full" />
      </BaseCard>
    );
  }

  if (!history || history.length === 0) {
    return null;
  }

  type GroupedRecord = 
    | { type: "user"; msg: ChatMessage }
    | { type: "assistant"; msg: ChatMessage }
    | { type: "nutrition_pair"; userMsg: ChatMessage | null; assistantMsg: ChatMessage; parsed: ParsedNutritionData };
  
  const grouped: GroupedRecord[] = [];
  
  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    if (msg.role === "user") {
      const nextMsg = history[i + 1];
      if (nextMsg && nextMsg.role !== "user") {
        const parsed = parseNutritionFromText(nextMsg.message);
        if (parsed) {
          grouped.push({ type: "nutrition_pair", userMsg: msg, assistantMsg: nextMsg, parsed });
          i++; // skip next since it's grouped
        } else {
          grouped.push({ type: "user", msg });
        }
      } else {
        grouped.push({ type: "user", msg });
      }
    } else {
      const parsed = parseNutritionFromText(msg.message);
      if (parsed) {
        grouped.push({ type: "nutrition_pair", userMsg: null, assistantMsg: msg, parsed });
      } else {
        grouped.push({ type: "assistant", msg });
      }
    }
  }

  // Reverse so newest is at top (or bottom depending on old logic)
  // Old logic looped backwards, pushing onto an array, so newest user messages ended up at the end.
  // Wait, if we push backwards `grouped.reverse()` makes newest at the top.
  grouped.reverse();

  return (
    <div className="space-y-4 animate-fade-up animation-delay-5">
      <p className="px-1 text-[13px] font-semibold text-[#8a9198] uppercase tracking-wide">
        Today&apos;s History
      </p>
      <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {grouped.map((group, idx) => {
          if (group.type === "user") {
            const imageUrl = getChatImageUrl(group.msg);
            return (
              <div key={group.msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-[18px] rounded-br-[4px] bg-green-800 px-4 py-2.5 text-[14px] text-white shadow-sm">
                  {imageUrl ? (
                    <div className="space-y-2">
                       <div className="overflow-hidden rounded-[12px] border border-white/15">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img
                           alt={group.msg.message?.trim() ? group.msg.message : "Uploaded chat image"}
                           className="max-h-56 w-full object-cover"
                           src={imageUrl}
                         />
                       </div>
                       {group.msg.message?.trim() ? <p>{group.msg.message}</p> : null}
                    </div>
                  ) : (
                    group.msg.message
                  )}
                </div>
              </div>
            );
          }
          
          if (group.type === "assistant") {
            return (
              <div key={group.msg.id} className="flex justify-start items-center">
                <div className="max-w-[85%] rounded-[18px] rounded-bl-[4px] bg-[#f3f1eb] text-[#333538] px-4 py-2.5 text-left text-[14px] shadow-sm">
                  <FormattedAssistantText className="line-clamp-3" text={group.msg.message} />
                </div>
              </div>
            );
          }

          if (group.type === "nutrition_pair") {
             const isLogged = !!loggedItems[group.assistantMsg.id];
             const contextName = group.userMsg?.message || "Logged Item";
             
             return (
               <div key={`pair-${group.assistantMsg.id}`} className="flex justify-start w-full">
                 <button 
                   type="button" 
                   onClick={() => onSelectMessage(group.assistantMsg, contextName)}
                   className="w-full max-w-[90%] text-left bg-white border border-[#ecece7] rounded-[18px] shadow-sm overflow-hidden transition-transform hover:scale-[1.01] active:scale-[0.98]"
                 >
                    {group.userMsg && (
                      <div className="bg-[#fcfcf9] px-4 py-3 border-b border-[#ecece7]">
                         <p className="text-[14px] font-medium text-[#111111] line-clamp-2">
                           "{group.userMsg.message}"
                         </p>
                      </div>
                    )}
                    <div className="px-4 py-3 flex items-center justify-between gap-3 bg-[#edf5ee]">
                       <div className="flex items-center gap-2 font-medium text-[#2c3d30] text-[13px]">
                         <TargetIcon className="w-4 h-4 shrink-0" />
                         <span>Nutrition Data ({group.parsed.totals.calories} kcal)</span>
                       </div>
                       {isLogged ? (
                         <span className="rounded-full bg-green-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                           Logged
                         </span>
                       ) : null}
                    </div>
                 </button>
               </div>
             );
          }
        })}
      </div>
    </div>
  );
}

function MessageModalRouter({
  loggedItem,
  contextName,
  message,
  selectedIsoDate,
  onClose,
  onLogSave,
  onRefetchUpdate,
}: {
  loggedItem?: LoggedNutritionItem;
  contextName?: string;
  message: ChatMessage;
  selectedIsoDate?: string;
  onClose: () => void;
  onLogSave: (totals: { name: string; calories: number; protein: number; carbs: number; fat: number; exerciseMinutes: number; exerciseCalories: number }) => void;
  onRefetchUpdate?: (newAssistantMsg: ChatMessage, newUserQueryText: string) => void;
}) {
  const parsed = parseNutritionFromText(message.message);

  if (parsed) {
    return <NutritionModal messageId={message.id} selectedIsoDate={selectedIsoDate} loggedItem={loggedItem} contextName={contextName} parsed={parsed} onClose={onClose} onLogSave={onLogSave} onRefetchUpdate={onRefetchUpdate} />;
  }

  return <PlainMessageModal text={message.message} onClose={onClose} />;
}

function PlainMessageModal({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-[#2c2f32]/18 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-[24px] border border-[#ecece7] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <p className="text-[16px] font-semibold text-[#111111]">Assistant</p>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8d9399] transition-colors hover:bg-[#f3f3ee]"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="rounded-[16px] bg-[#f7f7f3] px-4 py-3 text-[#111111]">
          <FormattedAssistantText text={text} />
        </div>
      </div>
    </div>
  );
}

function NutritionModal({
  messageId,
  selectedIsoDate,
  loggedItem,
  contextName,
  parsed,
  onClose,
  onLogSave,
  onRefetchUpdate,
}: {
  messageId: string;
  selectedIsoDate?: string;
  loggedItem?: LoggedNutritionItem;
  contextName?: string;
  parsed: ParsedNutritionData;
  onClose: () => void;
  onLogSave: (totals: { name: string; calories: number; protein: number; carbs: number; fat: number; exerciseMinutes: number; exerciseCalories: number }) => void;
  onRefetchUpdate?: (newAssistantMsg: ChatMessage, newUserQueryText: string) => void;
}) {
  const isLogged = !!loggedItem;
  const [query, setQuery] = useState(contextName ?? "");
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();
  
  const [localParsed, setLocalParsed] = useState(parsed);
  const [name, setName] = useState(loggedItem?.name ?? localParsed.dishName ?? contextName ?? "Logged Item");
  const [cal, setCal] = useState(loggedItem?.calories ?? localParsed.totals.calories);
  const [pro, setPro] = useState(loggedItem?.protein ?? localParsed.totals.protein);
  const [crb, setCrb] = useState(loggedItem?.carbs ?? localParsed.totals.carbs);
  const [fat, setFat] = useState(loggedItem?.fat ?? localParsed.totals.fat);
  const [exerciseMin, setExerciseMin] = useState(loggedItem?.exerciseMinutes ?? localParsed.totals.exerciseMinutes);
  const [exerciseCal, setExerciseCal] = useState(loggedItem?.exerciseCalories ?? localParsed.totals.exerciseCalories);
  
  const [showDetails, setShowDetails] = useState(false);

  const handleRefetch = async () => {
    const token = getStoredAccessToken();
    if (!token || !query.trim()) return;
    setIsFetching(true);
    try {
      const res = await chatApi.updateMessage(messageId, { type: "text", message: query }, token);
      const outputText = res.data.assistantMessage.message;
      console.log("Raw Output from Assistant:", outputText);

      const newParsed = parseNutritionFromText(outputText);
      console.log("Parsed Output:", newParsed);
      
      if (newParsed) {
        setLocalParsed(newParsed);
        setName(newParsed.dishName ? newParsed.dishName : query);
        setCal(newParsed.totals.calories);
        setPro(newParsed.totals.protein);
        setCrb(newParsed.totals.carbs);
        setFat(newParsed.totals.fat);
        setExerciseMin(newParsed.totals.exerciseMinutes);
        setExerciseCal(newParsed.totals.exerciseCalories);
        
        toast({
           title: "Live Refetch Complete",
           description: "Values have been successfully updated.",
           variant: "success"
        });
        
        if (onRefetchUpdate) {
            onRefetchUpdate(res.data.assistantMessage, query);
        }
      } else {
        toast({
           title: "Refetch failed",
           description: "Could not parse valid nutrition data for that query.",
           variant: "error"
        });
      }
    } catch (err) {
      console.error("Refetch Error:", err);
      toast({
         title: "Refetch Error",
         description: "Failed to connect to the backend or chat API.",
         variant: "error"
      });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-[#2c2f32]/18 p-4 backdrop-blur-[2px]">
      <div className="flex flex-col max-h-[85vh] w-full max-w-md rounded-[24px] border border-[#ecece7] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
        <div className="flex shrink-0 items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[18px] font-semibold text-[#111111]">Nutrition Info</p>
            <p className="mt-1 text-[13px] text-[#8a9198]">Verify and adjust values before logging.</p>
            {isLogged ? (
              <p className="mt-2 inline-flex rounded-full bg-green-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                Logged
              </p>
            ) : null}
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8d9399] transition-colors hover:bg-[#f3f3ee]"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          <div className="space-y-4">
             <div className="space-y-3 p-3 rounded-[16px] bg-[#f7f7f3] border border-[#ecece7]">
               <label className="block">
                 <span className="block text-[12px] font-semibold text-[#8a9198] uppercase tracking-wider mb-1">Query</span>
                 <p className="text-[11px] text-[#8a9198] mb-2">Edit your query and refetch from AI if the initial estimate was incorrect.</p>
                 <input
                   type="text"
                   value={query}
                   onChange={(e) => setQuery(e.target.value)}
                   className="w-full rounded-[14px] border border-[#d3d3cd] bg-white px-4 py-3 text-[14px] text-[#111111] outline-none transition-colors focus:border-green-600 mb-3"
                 />
                 <button
                   type="button"
                   onClick={handleRefetch}
                   disabled={isFetching || !query.trim()}
                   className="w-full flex items-center justify-center rounded-[14px] bg-green-800 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                 >
                   {isFetching ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Refetching...
                      </>
                   ) : "Refetch Query"}
                 </button>
               </label>
             </div>

             <label className="block">
               <span className="block text-[12px] font-semibold text-[#8a9198] uppercase tracking-wider mb-1">Name</span>
               <input
                 type="text"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="w-full rounded-[14px] border border-[#ecece7] bg-[#fcfcf9] px-4 py-3 text-[15px] text-[#111111] font-medium outline-none transition-colors focus:border-green-600"
               />
             </label>
          </div>

          <div className="rounded-[16px] bg-[#f7f7f3] px-3 py-3 text-[12px] leading-5 text-[#333538] whitespace-pre-wrap">
            {localParsed.originalText}
          </div>
          
          <button 
             onClick={() => setShowDetails(true)} 
             className="w-full flex items-center justify-between rounded-[14px] border border-[#ecece7] bg-white px-4 py-3.5 text-[14px] font-semibold text-[#111111] transition-colors hover:bg-[#f7f7f3]"
          >
             View Detailed Analysis
             <span className="text-[#8a9198]">→</span>
          </button>

          <div className="space-y-3">
            <p className="text-[14px] font-semibold text-[#111111]">Edit Macros</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block rounded-[12px] border border-[#ecece7] p-2 bg-[#fdfdfa]">
                <span className="block text-[11px] font-semibold text-[#a0a5ad] uppercase tracking-wider">Calories</span>
                <input
                  type="number"
                  value={cal}
                  onChange={(e) => setCal(Number(e.target.value) || 0)}
                  className="mt-1 block w-full bg-transparent text-[16px] font-semibold outline-none"
                />
              </label>
              <label className="block rounded-[12px] border border-[#ecece7] p-2 bg-[#fdfdfa]">
                <span className="block text-[11px] font-semibold text-[#a0a5ad] uppercase tracking-wider">Protein (g)</span>
                <input
                  type="number"
                  value={pro}
                  onChange={(e) => setPro(Number(e.target.value) || 0)}
                  className="mt-1 block w-full bg-transparent text-[16px] font-semibold outline-none"
                />
              </label>
              <label className="block rounded-[12px] border border-[#ecece7] p-2 bg-[#fdfdfa]">
                <span className="block text-[11px] font-semibold text-[#a0a5ad] uppercase tracking-wider">Carbs (g)</span>
                <input
                  type="number"
                  value={crb}
                  onChange={(e) => setCrb(Number(e.target.value) || 0)}
                  className="mt-1 block w-full bg-transparent text-[16px] font-semibold outline-none"
                />
              </label>
              <label className="block rounded-[12px] border border-[#ecece7] p-2 bg-[#fdfdfa]">
                <span className="block text-[11px] font-semibold text-[#a0a5ad] uppercase tracking-wider">Fat (g)</span>
                <input
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(Number(e.target.value) || 0)}
                  className="mt-1 block w-full bg-transparent text-[16px] font-semibold outline-none"
                />
              </label>
              <label className="block rounded-[12px] border border-[#ecece7] p-2 bg-[#fdfdfa]">
                <span className="block text-[11px] font-semibold text-[#a0a5ad] uppercase tracking-wider">Exercise (min)</span>
                <input
                  type="number"
                  value={exerciseMin}
                  onChange={(e) => setExerciseMin(Number(e.target.value) || 0)}
                  className="mt-1 block w-full bg-transparent text-[16px] font-semibold outline-none"
                />
              </label>
              <label className="block rounded-[12px] border border-[#ecece7] p-2 bg-[#fdfdfa]">
                <span className="block text-[11px] font-semibold text-[#a0a5ad] uppercase tracking-wider">Burned (Calories)</span>
                <input
                  type="number"
                  value={exerciseCal}
                  onChange={(e) => setExerciseCal(Number(e.target.value) || 0)}
                  className="mt-1 block w-full bg-transparent text-[16px] font-semibold outline-none"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="shrink-0 pt-5 mt-auto border-t border-[#f2efe8]">
          <button
            type="button"
            className="w-full rounded-[14px] bg-green-800 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
            onClick={() => {
              onLogSave({ 
                name,
                calories: cal, 
                protein: pro, 
                carbs: crb, 
                fat: fat, 
                exerciseMinutes: exerciseMin, 
                exerciseCalories: exerciseCal 
              });
              setTimeout(() => {
                onClose();
              }, 400); // Small 400ms delay to feel the click response before closing
            }}
          >
            {isLogged 
               ? "Update Log" 
               : (!selectedIsoDate || selectedIsoDate === getIsoDate(new Date()) 
                   ? "Log to Today" 
                   : `Log to ${new Date(selectedIsoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`)}
          </button>
        </div>
      </div>
      
      {showDetails && (
        <DishDetailModal 
          parsed={localParsed} 
          onClose={() => setShowDetails(false)} 
        />
      )}
    </div>
  );
}

function DetailRow({ label, value, unit, indent = false }: { label: string, value: number | undefined, unit: string, indent?: boolean }) {
  const displayValue = value !== undefined ? `${value}${unit}` : `-`;
  return (
    <div className={`flex justify-between border-b border-[#f2efe8] py-4 ${indent ? 'pl-6' : 'px-1'}`}>
       <span className="text-[14px] text-[#333538] font-medium">{label}</span>
       <span className="text-[14px] text-[#111111] font-semibold">{displayValue}</span>
    </div>
  );
}

function DishDetailModal({ parsed, onClose }: { parsed: ParsedNutritionData; onClose: () => void }) {
  const t = parsed.totals;
  return (
    <div className="absolute inset-0 z-[80] flex items-end sm:items-center justify-center bg-[#2c2f32]/18 p-0 sm:p-4 backdrop-blur-[2px]">
      <div className="flex flex-col max-h-[85vh] w-full max-w-md rounded-t-[28px] sm:rounded-[24px] border border-[#ecece7] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] h-full sm:h-auto">
        <div className="flex shrink-0 items-center justify-between p-4 border-b border-[#ecece7]">
          <button onClick={onClose} className="p-2 -ml-2 text-[#111111] hover:bg-[#f3f3ee] rounded-full transition-colors">
            <ArrowLeftIcon />
          </button>
          <p className="text-[16px] font-semibold text-[#111111]">{parsed.dishName || "Detailed Nutrition"}</p>
          <div className="w-9" />
        </div>
        <div className="flex-1 overflow-y-auto w-full px-4 pb-8">
           <DetailRow label="Total Carbohydrates" value={t.carbs} unit="g" />
           <DetailRow label="Dietary Fibre" value={t.dietaryFibre} unit="g" indent />
           <DetailRow label="Sugar" value={t.sugar} unit="g" indent />
           <DetailRow label="Added Sugars" value={t.addedSugars} unit="g" indent />
           <DetailRow label="Sugar Alcohols" value={t.sugarAlcohols} unit="g" indent />
           <DetailRow label="Net Carbs" value={t.netCarbs} unit="g" indent />
           
           <DetailRow label="Protein" value={t.protein} unit="g" />
           
           <DetailRow label="Total Fat" value={t.fat} unit="g" />
           <DetailRow label="Saturated Fat" value={t.saturatedFat} unit="g" indent />
           <DetailRow label="Trans Fat" value={t.transFat} unit="g" indent />
           <DetailRow label="Polyunsaturated Fat" value={t.polyunsaturatedFat} unit="g" indent />
           <DetailRow label="Monounsaturated Fat" value={t.monounsaturatedFat} unit="g" indent />
           
           <DetailRow label="Cholesterol" value={t.cholesterol} unit="mg" />
           <DetailRow label="Sodium" value={t.sodium} unit="mg" />
           <DetailRow label="Calcium" value={t.calcium} unit="mg" />
           <DetailRow label="Iron" value={t.iron} unit="mg" />
           <DetailRow label="Potassium" value={t.potassium} unit="mg" />
           <DetailRow label="Vitamin A" value={t.vitaminA} unit="IU" />
           <DetailRow label="Vitamin C" value={t.vitaminC} unit="mg" />
           <DetailRow label="Vitamin D" value={t.vitaminD} unit="IU" />
        </div>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-[14px] w-[14px]" fill="none" viewBox="0 0 24 24">
      <path d="M12 3v13M7 11l5 5 5-5M4 20h16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
