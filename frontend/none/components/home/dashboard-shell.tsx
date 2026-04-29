"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import {
  Bell,
  Camera,
  ChartColumn,
  ChevronDown,
  DropletIcon,
  EllipsisVertical,
  Eye,
  Flag,
  House,
  LogOut,
  Menu,
  Mic,
  MessageSquareText,
  PencilLine,
  Scale,
  Send,
  Settings,
  Share2,
  Shield,
  UserRound,
  Users,
  Target,
  Flame,
  Loader2,
  Download,
  X,
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
  NutritionDetails,
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
  nutritionDetails?: NutritionDetails | null;
}

type LoggedDashboardEntry = {
  assistantMessage: ChatMessage;
  sourceMessage: ChatMessage | null;
  parsed: ParsedNutritionData;
  loggedItem: LoggedNutritionItem;
};

type QueryKind = "text" | "image";

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

function getChatImageUrl(message?: ChatMessage | null) {
  const imageUrl = message?.metadata?.imageUrl;
  return typeof imageUrl === "string" && imageUrl.trim() ? imageUrl : null;
}

function classifyQueryKind(message?: ChatMessage | null, fallbackImageUrl?: string | null): QueryKind {
  if (fallbackImageUrl?.trim()) {
    return "image";
  }

  if (!message) {
    return "text";
  }

  return message.type === "image" || !!getChatImageUrl(message) ? "image" : "text";
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

function normaliseNutritionDetails(details?: Partial<NutritionDetails> | null): NutritionDetails | null {
  if (!details) {
    return null;
  }

  const normalized = Object.fromEntries(
    Object.entries(details).filter(([, value]) => value != null && Number.isFinite(Number(value)))
  ) as Partial<NutritionDetails>;

  return Object.keys(normalized).length > 0 ? (normalized as NutritionDetails) : null;
}

function buildNutritionDetailsFromParsed(parsed: ParsedNutritionData): NutritionDetails {
  return normaliseNutritionDetails({
    calories: parsed.totals.calories,
    protein: parsed.totals.protein,
    carbs: parsed.totals.carbs,
    fat: parsed.totals.fat,
    dietaryFibre: parsed.totals.dietaryFibre,
    starch: parsed.totals.starch,
    sugar: parsed.totals.sugar,
    addedSugars: parsed.totals.addedSugars,
    sugarAlcohols: parsed.totals.sugarAlcohols,
    otherCarbs: parsed.totals.otherCarbs,
    netCarbs: parsed.totals.netCarbs,
    saturatedFat: parsed.totals.saturatedFat,
    transFat: parsed.totals.transFat,
    polyunsaturatedFat: parsed.totals.polyunsaturatedFat,
    monounsaturatedFat: parsed.totals.monounsaturatedFat,
    otherFat: parsed.totals.otherFat,
    cholesterol: parsed.totals.cholesterol,
    sodium: parsed.totals.sodium,
    calcium: parsed.totals.calcium,
    iron: parsed.totals.iron,
    potassium: parsed.totals.potassium,
    vitaminA: parsed.totals.vitaminA,
    vitaminC: parsed.totals.vitaminC,
    vitaminD: parsed.totals.vitaminD,
  }) || {
    calories: parsed.totals.calories,
    protein: parsed.totals.protein,
    carbs: parsed.totals.carbs,
    fat: parsed.totals.fat,
  };
}

function formatLoggedTime(timestamp?: string) {
  if (!timestamp) {
    return "";
  }

  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function sumNutritionDetails(
  base?: Partial<NutritionDetails> | null,
  delta?: Partial<NutritionDetails> | null,
  direction: 1 | -1 = 1,
): NutritionDetails | null {
  const keys = new Set<string>([
    ...Object.keys(base || {}),
    ...Object.keys(delta || {}),
  ]);

  const next: Record<string, number> = {};

  for (const key of keys) {
    const baseValue = Number((base as Record<string, unknown> | null)?.[key] ?? 0);
    const deltaValue = Number((delta as Record<string, unknown> | null)?.[key] ?? 0);
    const total = Number((baseValue + direction * deltaValue).toFixed(2));

    if (Math.abs(total) > 0.0001) {
      next[key] = total;
    }
  }

  return normaliseNutritionDetails(next);
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
  const [selectedSourceMessage, setSelectedSourceMessage] = useState<ChatMessage | null>(null);
  const [selectedMessageContext, setSelectedMessageContext] = useState<string | undefined>(undefined);
  const [loggedNutritionItems, setLoggedNutritionItems] = useState<Record<string, LoggedNutritionItem>>({});
  const [nutritionSummaryOpen, setNutritionSummaryOpen] = useState(false);
  const [openLoggedEntryMenuId, setOpenLoggedEntryMenuId] = useState<string | null>(null);
  const [analyticsTarget, setAnalyticsTarget] = useState<{
    message: ChatMessage;
    sourceMessage: ChatMessage | null;
  } | null>(null);
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
              nutritionDetails: null,
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
  const loggedDashboardEntries = useMemo<LoggedDashboardEntry[]>(() => {
    const entries: LoggedDashboardEntry[] = [];

    for (let index = 0; index < chatHistory.length; index += 1) {
      const message = chatHistory[index];
      const loggedItem = loggedNutritionItems[message.id];

      if (!loggedItem || message.role !== "assistant") {
        continue;
      }

      const parsed = parseNutritionFromText(message.message);

      if (!parsed) {
        continue;
      }

      const previousMessage = index > 0 && chatHistory[index - 1]?.role === "user"
        ? chatHistory[index - 1]
        : null;

      entries.push({
        assistantMessage: message,
        sourceMessage: previousMessage,
        parsed,
        loggedItem,
      });
    }

    return entries.reverse();
  }, [chatHistory, loggedNutritionItems]);

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
      setSelectedSourceMessage(response.data.userMessage);
      setSelectedMessageContext(response.data.userMessage.message || chatInput);
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
    totals: { name: string; calories: number; carbs: number; protein: number; fat: number; exerciseMinutes: number; exerciseCalories: number; nutritionDetails?: NutritionDetails | null },
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
    const currentNutritionDetails = normaliseNutritionDetails(dashboard?.nutritionDetails ?? null);
    const withoutExistingDetails = existingLog?.nutritionDetails
      ? sumNutritionDetails(currentNutritionDetails, existingLog.nutritionDetails, -1)
      : currentNutritionDetails;
    const nextNutritionDetails = totals.nutritionDetails
      ? sumNutritionDetails(withoutExistingDetails, totals.nutritionDetails, 1)
      : withoutExistingDetails;

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
        nutritionDetails: nextNutritionDetails,
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
        nutritionDetails: totals.nutritionDetails ?? null,
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
      logPayload.nutritionDetails = normaliseNutritionDetails({
        ...(dashboard?.nutritionDetails ?? {}),
        calories: normalizedValue + prevExeCal,
      });
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
      logPayload.nutritionDetails = normaliseNutritionDetails({
        ...(dashboard?.nutritionDetails ?? {}),
        carbs: normalizedValue,
      });
    } else if (metricKey === "protein") {
      logPayload.protein = normalizedValue;
      logPayload.nutritionDetails = normaliseNutritionDetails({
        ...(dashboard?.nutritionDetails ?? {}),
        protein: normalizedValue,
      });
    } else if (metricKey === "fat") {
      logPayload.fat = normalizedValue;
      logPayload.nutritionDetails = normaliseNutritionDetails({
        ...(dashboard?.nutritionDetails ?? {}),
        fat: normalizedValue,
      });
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
                    <Menu className="h-4 w-4" />
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
                        <ChevronDown className="h-3 w-3" />
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
                    <UserRound className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="fixed top-0 left-0 right-0 z-50 grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3 bg-white px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:relative lg:top-auto lg:left-auto lg:right-auto lg:z-auto lg:bg-transparent lg:px-0 lg:py-0 lg:mb-0">
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#000000] transition-colors hover:bg-[#f3f3ee] lg:hidden"
                    onClick={() => setSidebarOpen(true)}
                    type="button"
                  >
                    <Menu className="h-4 w-4" />
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
                    <UserRound className="h-4 w-4" />
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
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <CaloriesCard
                      current={Math.round(caloriesMetric?.current ?? 0)}
                      foodCalories={totalFoodCalories}
                      exerciseCalories={totalExerciseCalories}
                      loading={loading}
                      onOpenDetails={() => setNutritionSummaryOpen(true)}
                      remaining={remainingCalories}
                      target={Math.round(caloriesMetric?.target ?? 0)}
                    />

                    <MacrosCard
                      carbs={carbsMetric}
                      fat={fatMetric}
                      loading={loading}
                      onOpenDetails={() => setNutritionSummaryOpen(true)}
                      protein={proteinMetric}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 xl:gap-3">
      <DesktopSummaryCard
        calories={Math.round(caloriesMetric?.current ?? 0)}
        completion={effectiveDashboard?.dailyGoals?.completionPercent ?? 0}
        loading={loading}
        target={Math.round(caloriesMetric?.target ?? 0)}
        water={currentWater}
      />

      <WaterCard
        current={currentWater}
        loading={loading}
        saving={savingWater}
        target={targetWater}
        onDecrement={() => handleWaterUpdate(-1)}
        onIncrement={() => handleWaterUpdate(1)}
      />
    </div>
                  
                  
                  

                  

                  <LoggedEntriesSection
                    entries={loggedDashboardEntries}
                    calorieTarget={Math.round(caloriesMetric?.target ?? 0)}
                    carbsTarget={Math.round(carbsMetric?.target ?? 0)}
                    proteinTarget={Math.round(proteinMetric?.target ?? 0)}
                    fatTarget={Math.round(fatMetric?.target ?? 0)}
                    openMenuId={openLoggedEntryMenuId}
                    onCloseMenu={() => setOpenLoggedEntryMenuId(null)}
                    onEdit={(entry) => {
                      setOpenLoggedEntryMenuId(null);
                      setSelectedSourceMessage(entry.sourceMessage);
                      setSelectedMessageContext(entry.sourceMessage?.message || entry.loggedItem.name);
                      setSelectedMessage(entry.assistantMessage);
                    }}
                    onOpenMenu={(messageId) => {
                      setOpenLoggedEntryMenuId((current) => current === messageId ? null : messageId);
                    }}
                    onViewAnalytics={(entry) => {
                      setOpenLoggedEntryMenuId(null);
                      setAnalyticsTarget({
                        message: entry.assistantMessage,
                        sourceMessage: entry.sourceMessage,
                      });
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setChatHistoryModalOpen(true)}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-[#f7f7f3] text-[14px] font-semibold text-[#111111] transition-colors hover:bg-[#efefe9]"
                  >
                    <MessageSquareText className="h-5 w-5 text-green-600" />
                    See previous messages
                  </button>
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
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto w-full bg-[#fcfcf9] p-4">
                  <ChatHistoryPanel
                    history={chatHistory}
                    loading={historyLoading}
                    loggedItems={loggedNutritionItems}
                    onSelectMessage={(msg, sourceMsg, contextName) => {
                      setSelectedSourceMessage(sourceMsg ?? null);
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
              sourceMessage={selectedSourceMessage}
              selectedIsoDate={selectedIsoDate}
              onClose={() => {
                setSelectedMessage(null);
                setSelectedSourceMessage(null);
              }}
              onLogSave={(totals) => {
                const dateIso = selectedIsoDate;
                handleCaloriesMacrosUpdate(selectedMessage.id, totals, dateIso);
              }}
              onRefetchUpdate={(newAssistantMsg, newUserMsg) => {
                const replacedMsg = { ...newAssistantMsg, id: selectedMessage.id };
                
                setChatHistory((prev) => {
                  const newHistory = [...prev];
                  const astIdx = newHistory.findIndex((m) => m.id === selectedMessage.id);
                  if (astIdx !== -1) {
                    newHistory[astIdx] = replacedMsg;
                    if (astIdx > 0 && newHistory[astIdx - 1].role === "user") {
                      newHistory[astIdx - 1] = newUserMsg;
                    }
                  }
                  return newHistory;
                });
                
                setSelectedMessage(replacedMsg);
                setSelectedSourceMessage(newUserMsg);
                setSelectedMessageContext(newUserMsg.message);
              }}
            />
          ) : null}

          {nutritionSummaryOpen ? (
            <DailyNutritionDetailsModal
              date={selectedIsoDate}
              details={dashboard?.nutritionDetails ?? null}
              caloriesMetric={caloriesMetric}
              carbsMetric={carbsMetric}
              proteinMetric={proteinMetric}
              fatMetric={fatMetric}
              foodCalories={totalFoodCalories}
              exerciseCalories={totalExerciseCalories}
              remainingCalories={remainingCalories}
              onClose={() => setNutritionSummaryOpen(false)}
            />
          ) : null}

          {analyticsTarget ? (
            <LoggedAnalyticsModal
              message={analyticsTarget.message}
              onClose={() => setAnalyticsTarget(null)}
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
          <X className="h-4 w-4" />
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
  onOpenDetails,
  remaining,
  target,
}: {
  current: number;
  exerciseCalories: number;
  foodCalories: number;
  loading: boolean;
  onOpenDetails: () => void;
  remaining: number;
  target: number;
}) {
  if (loading) {
    return (
      <BaseCard className="p-4">
        <ShimmerLine className="h-4 w-24" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          <ShimmerBlock className="h-14" />
          <ShimmerBlock className="h-14" />
          <ShimmerBlock className="h-14" />
        </div>
      </BaseCard>
    );
  }

  return (
    <button type="button" onClick={onOpenDetails} className="block w-full text-left">
    <BaseCard className="animate-fade-up border-[#dfe6f3] bg-[#eef3ff] p-1 sm:p-4 transition-colors hover:bg-[#e8effd]">
      <div className="flex items-center gap-2">
        <TinyIconCircle bg="bg-[#fff0dd]" text="text-[#f1ad60]">
          <Flame/>
        </TinyIconCircle>
        <p className="text-[14px] font-semibold text-[#111111]">Calories</p>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-3 gap-2">
        <DashboardMiniStat label="Food" value={foodCalories} />
        <DashboardMiniStat label="Exercise" value={exerciseCalories} />
        <DashboardMiniStat highlight label="Remaining" value={remaining} />
      </div>
    </BaseCard>
    </button>
  );
}

function MacrosCard({
  carbs,
  fat,
  loading,
  onOpenDetails,
  protein,
}: {
  carbs: DashboardSummary["dailyGoals"]["metrics"][number] | null;
  fat: DashboardSummary["dailyGoals"]["metrics"][number] | null;
  loading: boolean;
  onOpenDetails: () => void;
  protein: DashboardSummary["dailyGoals"]["metrics"][number] | null;
}) {
  if (loading) {
    return (
      <BaseCard className="p-2">
        <ShimmerLine className="h-4 w-20" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          <ShimmerBlock className="h-14" />
          <ShimmerBlock className="h-14" />
          <ShimmerBlock className="h-14" />
        </div>
      </BaseCard>
    );
  }

  return (
    <button type="button" onClick={onOpenDetails} className="block w-full text-left">
    <BaseCard className="animate-fade-up animation-delay-1 border-[#dfe6f3] bg-[#eef3ff] p-1 sm:p-4 transition-colors hover:bg-[#e8effd]">
      <div className="flex items-center gap-2">
        <TinyIconCircle bg="bg-[#ffe9ef]" text="text-[#e07c9f]">
          <Target/>
        </TinyIconCircle>
        <p className="text-[14px] font-semibold text-[#111111]">Macros</p>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-3 gap-2">
        <DashboardRatioStat label="Carbs (g)" metric={carbs} />
        <DashboardRatioStat label="Protein (g)" metric={protein} />
        <DashboardRatioStat label="Fat (g)" metric={fat} />
      </div>
    </BaseCard>
    </button>
  );
}

function DashboardMiniStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-[16px] bg-white/70 px-3 py-3">
      <p className={cn("text-[11px] text-[#667085]", highlight && "text-[#111111]")}>{label}</p>
      <p className={cn("mt-1 text-[16px] font-semibold text-[#111111]", highlight && "text-[18px]")}>{value}</p>
    </div>
  );
}

function DashboardRatioStat({
  label,
  metric,
}: {
  label: string;
  metric: DashboardSummary["dailyGoals"]["metrics"][number] | null;
}) {
  return (
    <div className="rounded-[16px] bg-white/70 px-3 py-3">
      <p className="text-[16px] font-semibold text-[#111111]">
        {Math.round(metric?.current ?? 0)}/{Math.round(metric?.target ?? 0)}
      </p>
      <p className="mt-1 text-[11px] text-[#667085]">{label}</p>
    </div>
  );
}

function CircularMetric({
  accent,
  current,
  label,
  target,
}: {
  accent: string;
  current: number;
  label: string;
  target: number;
}) {
  const progress = Math.min(current / Math.max(target, 1), 1);
  const progressDegrees = progress * 360;

  return (
    <div className="text-center">
      <div
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${accent} ${progressDegrees}deg, #e7edf7 0deg)`,
        }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
          <div className="text-center leading-none">
            <p className="text-[14px] font-semibold text-[#111111]">{current}</p>
            <p className="mt-1 text-[9px] text-[#8a9198]">/{target}</p>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] font-medium text-[#6b7280]">{label}</p>
    </div>
  );
}

function LoggedEntriesSection({
  calorieTarget,
  carbsTarget,
  entries,
  fatTarget,
  openMenuId,
  onCloseMenu,
  onEdit,
  onOpenMenu,
  proteinTarget,
  onViewAnalytics,
}: {
  calorieTarget: number;
  carbsTarget: number;
  entries: LoggedDashboardEntry[];
  fatTarget: number;
  openMenuId: string | null;
  onCloseMenu: () => void;
  onEdit: (entry: LoggedDashboardEntry) => void;
  onOpenMenu: (messageId: string) => void;
  proteinTarget: number;
  onViewAnalytics: (entry: LoggedDashboardEntry) => void;
}) {
  if (!entries.length) {
    return (
      <BaseCard className="p-4">
        <p className="text-[15px] font-semibold text-[#111111]">Logged dishes & exercises</p>
        <p className="mt-2 text-[13px] text-[#8a9198]">Log a dish or exercise from chat to see it here.</p>
      </BaseCard>
    );
  }

  return (
    <div className="space-y-3">
      <p className="px-1 text-[13px] font-semibold uppercase tracking-wide text-[#8a9198]">Logged dishes & exercises</p>
      {entries.map((entry) => {
        const { parsed, assistantMessage, sourceMessage, loggedItem } = entry;
        const title = loggedItem.name || parsed.dishName || sourceMessage?.message || "Logged item";

        return (
          <BaseCard key={assistantMessage.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] text-[#8a9198] line-clamp-1">{sourceMessage?.message || parsed.analysisText || "Logged from chat"}</p>
                <p className="mt-2 text-[16px] font-semibold text-[#111111]">{title}</p>
              </div>
              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(entry)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ecece7] text-[#111111] transition-colors hover:bg-[#f7f7f3]"
                >
                  <PencilLine className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenMenu(assistantMessage.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ecece7] text-[#111111] transition-colors hover:bg-[#f7f7f3]"
                >
                  <EllipsisVertical className="h-4 w-4" />
                </button>
                {openMenuId === assistantMessage.id ? (
                  <>
                    <button type="button" aria-label="Close menu" className="fixed inset-0 z-40" onClick={onCloseMenu} />
                    <div className="absolute right-0 top-11 z-50 min-w-[180px] rounded-[16px] border border-[#ecece7] bg-white p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
                      <button
                        type="button"
                        onClick={() => onViewAnalytics(entry)}
                        className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[13px] text-[#111111] transition-colors hover:bg-[#f7f7f3]"
                      >
                        <Eye className="h-[13px] w-[13px]" />
                        View detailed analytics
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <LogNutrientChip label="Calories" value={`${loggedItem.calories}`} />
              <LogNutrientChip label="Carbs" value={`${loggedItem.carbs}g`} />
              <LogNutrientChip label="Protein" value={`${loggedItem.protein}g`} />
              <LogNutrientChip label="Fat" value={`${loggedItem.fat}g`} />
            </div>

            <div className="mt-4 grid grid-cols-4 gap-3">
              <LogProgressStat label="Calories" current={loggedItem.calories} target={Math.max(calorieTarget, 1)} unit="" />
              <LogProgressStat label="Carbs" current={loggedItem.carbs} target={Math.max(carbsTarget, 1)} unit="g" />
              <LogProgressStat label="Protein" current={loggedItem.protein} target={Math.max(proteinTarget, 1)} unit="g" />
              <LogProgressStat label="Fat" current={loggedItem.fat} target={Math.max(fatTarget, 1)} unit="g" />
            </div>

            <div className="mt-4 text-[12px] text-[#6b7280]">{formatLoggedTime(sourceMessage?.timestamp || assistantMessage.timestamp)}</div>
          </BaseCard>
        );
      })}
    </div>
  );
}

function LogNutrientChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-[10px] bg-[#f4f6fb] px-2.5 py-1 text-[12px] text-[#334155]">
      {label}: {value}
    </span>
  );
}

function LogProgressStat({
  current,
  label,
  target,
  unit,
}: {
  current: number;
  label: string;
  target: number;
  unit: string;
}) {
  const percent = Math.min(Math.round((current / Math.max(target, 1)) * 100), 100);

  return (
    <div>
      <p className="text-[12px] text-[#6b7280]">{label}</p>
      <p className="mt-1 text-[16px] font-semibold text-[#111111]">{current}{unit}</p>
      <div className="mt-2 h-2 rounded-full bg-[#e7f7eb]">
        <div className="h-full rounded-full bg-[#9ebae6]" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-[#6b7280]">{percent}%</p>
    </div>
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
            <Eye className="h-[13px] w-[13px]" />
            View
          </button>
          <button
            className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
            onClick={onShare}
            type="button"
          >
            <Share2 className="h-[13px] w-[13px]" />
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
              <X className="h-4 w-4" />
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
              <Camera className="h-4 w-4" />
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
            <Send className="h-4 w-4" />
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
            <X className="h-4 w-4" />
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
  onSelectMessage: (assistantMsg: ChatMessage, sourceMsg?: ChatMessage | null, contextName?: string) => void;
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
                   onClick={() => onSelectMessage(group.assistantMsg, group.userMsg, contextName)}
                   className="w-full max-w-[90%] text-left bg-white border border-[#ecece7] rounded-[18px] shadow-sm overflow-hidden transition-transform hover:scale-[1.01] active:scale-[0.98]"
                 >
                    {group.userMsg && (
                      <div className="bg-[#fcfcf9] px-4 py-3 border-b border-[#ecece7]">
                         <p className="text-[14px] font-medium text-[#111111] line-clamp-2">
                           &quot;{group.userMsg.message}&quot;
                         </p>
                      </div>
                    )}
                    <div className="px-4 py-3 flex items-center justify-between gap-3 bg-[#edf5ee]">
                       <div className="flex items-center gap-2 font-medium text-[#2c3d30] text-[13px]">
                         <Target className="h-4 w-4 shrink-0" />
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
  sourceMessage,
  selectedIsoDate,
  onClose,
  onLogSave,
  onRefetchUpdate,
}: {
  loggedItem?: LoggedNutritionItem;
  contextName?: string;
  message: ChatMessage;
  sourceMessage?: ChatMessage | null;
  selectedIsoDate?: string;
  onClose: () => void;
  onLogSave: (totals: { name: string; calories: number; protein: number; carbs: number; fat: number; exerciseMinutes: number; exerciseCalories: number; nutritionDetails?: NutritionDetails | null }) => void;
  onRefetchUpdate?: (newAssistantMsg: ChatMessage, newUserMsg: ChatMessage) => void;
}) {
  const parsed = parseNutritionFromText(message.message);

  if (parsed) {
    return <NutritionModal messageId={message.id} sourceMessage={sourceMessage} initialImageUrl={getChatImageUrl(sourceMessage ?? null) ?? undefined} selectedIsoDate={selectedIsoDate} loggedItem={loggedItem} contextName={contextName} parsed={parsed} onClose={onClose} onLogSave={onLogSave} onRefetchUpdate={onRefetchUpdate} />;
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
            <X className="h-4 w-4" />
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
  sourceMessage,
  initialImageUrl,
  selectedIsoDate,
  loggedItem,
  contextName,
  parsed,
  onClose,
  onLogSave,
  onRefetchUpdate,
}: {
  messageId: string;
  sourceMessage?: ChatMessage | null;
  initialImageUrl?: string;
  selectedIsoDate?: string;
  loggedItem?: LoggedNutritionItem;
  contextName?: string;
  parsed: ParsedNutritionData;
  onClose: () => void;
  onLogSave: (totals: { name: string; calories: number; protein: number; carbs: number; fat: number; exerciseMinutes: number; exerciseCalories: number; nutritionDetails?: NutritionDetails | null }) => void;
  onRefetchUpdate?: (newAssistantMsg: ChatMessage, newUserMsg: ChatMessage) => void;
}) {
  const isLogged = !!loggedItem;
  const [query, setQuery] = useState(sourceMessage?.message || contextName || "");
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl ?? null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (file: File) => {
    if (imagePreview && !imagePreview.startsWith("http")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageRemoved(false);
  };

  const handleImageRemove = () => {
    if (imagePreview && !imagePreview.startsWith("http")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setImageRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const defaultContextName = contextName === "Please analyze this image for meal composition, calories, macros, or fitness relevance only." ? "Image Analysis" : contextName;
  const [localParsed, setLocalParsed] = useState(parsed);
  const [name, setName] = useState(loggedItem?.name ?? localParsed.dishName ?? defaultContextName ?? "Logged Item");
  const [cal, setCal] = useState(loggedItem?.calories ?? localParsed.totals.calories);
  const [pro, setPro] = useState(loggedItem?.protein ?? localParsed.totals.protein);
  const [crb, setCrb] = useState(loggedItem?.carbs ?? localParsed.totals.carbs);
  const [fat, setFat] = useState(loggedItem?.fat ?? localParsed.totals.fat);
  const [exerciseMin, setExerciseMin] = useState(loggedItem?.exerciseMinutes ?? localParsed.totals.exerciseMinutes);
  const [exerciseCal, setExerciseCal] = useState(loggedItem?.exerciseCalories ?? localParsed.totals.exerciseCalories);
  
  const [showDetails, setShowDetails] = useState(false);
  const activeQueryKind = classifyQueryKind(
    sourceMessage,
    imageRemoved ? null : imagePreview || initialImageUrl || null,
  );

  const handleRefetch = async () => {
    const token = getStoredAccessToken();
    if (!token || !query.trim()) return;
    setIsFetching(true);
    try {
      let res;
      if (imageFile) {
        res = await chatApi.updateImage(messageId, { message: query, image: imageFile }, token);
      } else if (imageRemoved && classifyQueryKind(sourceMessage, initialImageUrl || null) === "image") {
        res = await chatApi.updateMessage(messageId, { type: "text", message: query, removeImage: true }, token);
      } else {
        res = await chatApi.updateMessage(messageId, { type: "text", message: query }, token);
      }
      const outputText = res.data.assistantMessage.message;
      const newParsed = parseNutritionFromText(outputText);
      
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
            onRefetchUpdate(res.data.assistantMessage, res.data.userMessage);
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
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          <div className="space-y-4">
             {/* Image Editor */}
             {(imagePreview || imageRemoved || initialImageUrl) ? (
               <div className="space-y-3 p-3 rounded-[16px] bg-[#f7f7f3] border border-[#ecece7]">
                 <span className="block text-[12px] font-semibold text-[#8a9198] uppercase tracking-wider mb-1">Attached Image</span>
                 {imagePreview ? (
                   <div className="flex items-center gap-3">
                     <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[10px] border border-[#d3d3cd] bg-white">
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img src={imagePreview} alt="Attached query" className="h-full w-full object-cover" />
                     </div>
                     <button 
                       type="button" 
                       onClick={handleImageRemove}
                       className="text-[12px] font-semibold text-red-600 hover:opacity-75 transition-opacity"
                     >
                       Remove Image
                     </button>
                   </div>
                 ) : (
                   <div>
                     <input
                       ref={fileInputRef}
                       type="file"
                       accept="image/*"
                       className="hidden"
                       onChange={(e) => {
                         if (e.target.files?.[0]) handleImageSelect(e.target.files[0]);
                       }}
                     />
                     <button 
                       type="button"
                       onClick={() => fileInputRef.current?.click()}
                       className="flex items-center justify-center gap-2 rounded-[12px] border border-[#d3d3cd] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#111111] transition-colors hover:bg-[#f3f3ee] active:scale-[0.98]"
                     >
                       Attach Replacement Image
                     </button>
                   </div>
                 )}
               </div>
             ) : null}

             <div className="space-y-3 p-3 rounded-[16px] bg-[#f7f7f3] border border-[#ecece7]">
               <label className="block">
                 <div className="mb-3 flex items-center justify-between gap-3">
                   <span className="block text-[12px] font-semibold text-[#8a9198] uppercase tracking-wider">Query</span>
                   <span className={cn(
                     "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                     activeQueryKind === "image"
                       ? "bg-[#e6f4ea] text-green-900"
                       : "bg-[#f3f1eb] text-[#44474b]",
                   )}>
                     {activeQueryKind} query
                   </span>
                 </div>
                 <p className="text-[11px] text-[#8a9198] mb-2">
                   Edit the query and refetch. Image queries keep the attached image unless you remove or replace it.
                 </p>
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
                   ) : `Refetch ${activeQueryKind === "image" ? "Image" : "Text"} Query`}
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
                exerciseCalories: exerciseCal,
                nutritionDetails: buildNutritionDetailsFromParsed(localParsed),
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

function DishDetailModalBody({ parsed }: { parsed: ParsedNutritionData }) {
  const t = parsed.totals;

  return (
    <div className="w-full px-4 pb-8">
      <DetailRow label="Total Carbohydrates" value={t.carbs} unit="g" />
      <DetailRow label="Dietary Fibre" value={t.dietaryFibre} unit="g" indent />
      <DetailRow label="Starch" value={t.starch} unit="g" indent />
      <DetailRow label="Sugar" value={t.sugar} unit="g" indent />
      <DetailRow label="Added Sugars" value={t.addedSugars} unit="g" indent />
      <DetailRow label="Sugar Alcohols" value={t.sugarAlcohols} unit="g" indent />
      <DetailRow label="Other Carbs" value={t.otherCarbs} unit="g" indent />
      <DetailRow label="Net Carbs" value={t.netCarbs} unit="g" indent />

      <DetailRow label="Protein" value={t.protein} unit="g" />

      <DetailRow label="Total Fat" value={t.fat} unit="g" />
      <DetailRow label="Saturated Fat" value={t.saturatedFat} unit="g" indent />
      <DetailRow label="Trans Fat" value={t.transFat} unit="g" indent />
      <DetailRow label="Polyunsaturated Fat" value={t.polyunsaturatedFat} unit="g" indent />
      <DetailRow label="Monounsaturated Fat" value={t.monounsaturatedFat} unit="g" indent />
      <DetailRow label="Other Fat" value={t.otherFat} unit="g" indent />

      <DetailRow label="Cholesterol" value={t.cholesterol} unit="mg" />
      <DetailRow label="Sodium" value={t.sodium} unit="mg" />
      <DetailRow label="Calcium" value={t.calcium} unit="mg" />
      <DetailRow label="Iron" value={t.iron} unit="mg" />
      <DetailRow label="Potassium" value={t.potassium} unit="mg" />
      <DetailRow label="Vitamin A" value={t.vitaminA} unit="IU" />
      <DetailRow label="Vitamin C" value={t.vitaminC} unit="mg" />
      <DetailRow label="Vitamin D" value={t.vitaminD} unit="IU" />
      {parsed.analysisText ? (
        <div className="mt-5 rounded-[18px] bg-[#f7f7f3] p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a9198]">Health analysis</p>
          <div className="mt-3 text-[13px] leading-6 text-[#333538] whitespace-pre-wrap">
            <FormattedAssistantText text={parsed.analysisText} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DishDetailModal({ parsed, onClose }: { parsed: ParsedNutritionData; onClose: () => void }) {
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
        <div className="flex-1 overflow-y-auto w-full">
          <DishDetailModalBody parsed={parsed} />
        </div>
      </div>
    </div>
  );
}

function DailyNutritionDetailsModal({
  date,
  details,
  caloriesMetric,
  carbsMetric,
  proteinMetric,
  fatMetric,
  foodCalories,
  exerciseCalories,
  remainingCalories,
  onClose,
}: {
  date: string;
  details?: NutritionDetails | null;
  caloriesMetric: DashboardSummary["dailyGoals"]["metrics"][number] | null;
  carbsMetric: DashboardSummary["dailyGoals"]["metrics"][number] | null;
  proteinMetric: DashboardSummary["dailyGoals"]["metrics"][number] | null;
  fatMetric: DashboardSummary["dailyGoals"]["metrics"][number] | null;
  foodCalories: number;
  exerciseCalories: number;
  remainingCalories: number;
  onClose: () => void;
}) {
  if (!details) {
    return (
      <div className="absolute inset-0 z-[80] flex items-center justify-center bg-[#2c2f32]/18 p-4 backdrop-blur-[2px]">
        <div className="w-full max-w-md rounded-[24px] border border-[#ecece7] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-[16px] font-semibold text-[#111111]">Daily Nutrition Details</p>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#8d9399] transition-colors hover:bg-[#f3f3ee]"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[14px] text-[#6e757d]">No detailed nutrition data has been logged for {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} yet.</p>
        </div>
      </div>
    );
  }

  const parsedLike: ParsedNutritionData = {
    items: [],
    totals: {
      calories: details.calories,
      protein: details.protein,
      carbs: details.carbs,
      fat: details.fat,
      dietaryFibre: details.dietaryFibre,
      starch: details.starch,
      sugar: details.sugar,
      addedSugars: details.addedSugars,
      sugarAlcohols: details.sugarAlcohols,
      otherCarbs: details.otherCarbs,
      netCarbs: details.netCarbs,
      saturatedFat: details.saturatedFat,
      transFat: details.transFat,
      polyunsaturatedFat: details.polyunsaturatedFat,
      monounsaturatedFat: details.monounsaturatedFat,
      otherFat: details.otherFat,
      cholesterol: details.cholesterol,
      sodium: details.sodium,
      calcium: details.calcium,
      iron: details.iron,
      potassium: details.potassium,
      vitaminA: details.vitaminA,
      vitaminC: details.vitaminC,
      vitaminD: details.vitaminD,
      exerciseMinutes: 0,
      exerciseCalories: 0,
    },
    originalText: "",
    dishName: `Nutrition details for ${new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
  };

  return (
    <div className="absolute inset-0 z-[80] flex items-end sm:items-center justify-center bg-[#2c2f32]/18 p-0 sm:p-4 backdrop-blur-[2px]">
      <div className="flex h-full w-full max-w-md flex-col rounded-t-[28px] border border-[#ecece7] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] sm:h-auto sm:max-h-[85vh] sm:rounded-[24px]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#ecece7] p-4">
          <div>
            <p className="text-[16px] font-semibold text-[#111111]">Daily nutrition</p>
            <p className="mt-1 text-[12px] text-[#8a9198]">{new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#8d9399] transition-colors hover:bg-[#f3f3ee]" type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 rounded-[22px] bg-[#f7f9fd] p-4">
            <CircularMetric
              accent="#166534"
              current={Math.round(caloriesMetric?.current ?? 0)}
              label="Calories"
              target={Math.round(caloriesMetric?.target ?? 0)}
            />
            <div className="grid grid-cols-3 gap-2 self-center">
              <DashboardMiniStat label="Food" value={foodCalories} />
              <DashboardMiniStat label="Exercise" value={exerciseCalories} />
              <DashboardMiniStat highlight label="Remaining" value={remainingCalories} />
            </div>
          </div>

          <div className="mt-4 rounded-[22px] bg-[#f7f9fd] p-4">
            <div className="flex items-center gap-2">
              <TinyIconCircle bg="bg-[#ffe9ef]" text="text-[#e07c9f]">
                <Target/>
              </TinyIconCircle>
              <p className="text-[14px] font-semibold text-[#111111]">Macros</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <CircularMetric accent="#7c3aed" current={Math.round(carbsMetric?.current ?? 0)} label="Carbs (g)" target={Math.round(carbsMetric?.target ?? 0)} />
              <CircularMetric accent="#0f766e" current={Math.round(proteinMetric?.current ?? 0)} label="Protein (g)" target={Math.round(proteinMetric?.target ?? 0)} />
              <CircularMetric accent="#d97706" current={Math.round(fatMetric?.current ?? 0)} label="Fat (g)" target={Math.round(fatMetric?.target ?? 0)} />
            </div>
          </div>

          <div className="mt-4 rounded-[22px] border border-[#ecece7] bg-white p-1">
            <DishDetailModalBody parsed={parsedLike} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoggedAnalyticsModal({
  message,
  onClose,
}: {
  message: ChatMessage;
  onClose: () => void;
}) {
  const parsed = parseNutritionFromText(message.message);

  if (!parsed) {
    return null;
  }

  return <DishDetailModal parsed={parsed} onClose={onClose} />;
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
