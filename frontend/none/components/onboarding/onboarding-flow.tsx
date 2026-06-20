"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mic, Sparkles, Check, SendHorizonal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { authApi, userApi } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth/session";
import { isProfileComplete } from "@/lib/profile";
import type { UpsertHealthProfilePayload } from "@/types/api";
import type { HealthProfileWithUser, ProfileAiSuggestion } from "@/types/domain";

const activityOptions = [
  { label: "Sedentary", value: "sedentary" },
  { label: "Light", value: "light" },
  { label: "Moderate", value: "moderate" },
  { label: "Active", value: "active" },
  { label: "Very Active", value: "very_active" },
] as const;

type SuggestionSelectionMap = Record<string, boolean>;

function formatSuggestionLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase())
    .trim();
}

function formatSuggestionValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None";
  }
  if (value == null || value === "") {
    return "—";
  }
  if (typeof value === "string") {
    return value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return String(value);
}

function formatDisplayValue(key: string, value: any) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None";
  }
  if (value == null || value === "") {
    return "—";
  }
  if (key === "goal" || key === "activityLevel") {
    return String(value)
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return String(value);
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

const goalOptions = [
  { label: "Lose Weight", value: "lose_weight" },
  { label: "Gain Weight", value: "gain_weight" },
  { label: "Maintain", value: "maintain" },
] as const;

const genderOptions = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Non-binary", value: "Non-binary" },
  { label: "Prefer not to say", value: "Prefer not to say" },
] as const;

const dietOptions = [
  { label: "Balanced", value: "Balanced" },
  { label: "High-Protein", value: "High-Protein" },
  { label: "Low-Carb", value: "Low-Carb" },
  { label: "Low-Fat", value: "Low-Fat" },
  { label: "Low-Sodium", value: "Low-Sodium" },
  { label: "Diabetic-Friendly", value: "Diabetic-Friendly" },
  { label: "Heart-Healthy", value: "Heart-Healthy" },
  { label: "Keto", value: "Keto" },
  { label: "Vegan", value: "Vegan" },
  { label: "Vegetarian", value: "Vegetarian" },
  { label: "Pescatarian", value: "Pescatarian" },
  { label: "Paleo", value: "Paleo" },
  { label: "Mediterranean", value: "Mediterranean" },
  { label: "Low-FODMAP", value: "Low-FODMAP" },
  { label: "Gluten-Free", value: "Gluten-Free" },
  { label: "Dairy-Free", value: "Dairy-Free" },
  { label: "Jain", value: "Jain" },
  { label: "Halal", value: "Halal" },
  { label: "Kosher", value: "Kosher" },
  { label: "Intermittent Fasting", value: "Intermittent Fasting" },
  { label: "Other", value: "Other" },
] as const;

const presetDietValues = new Set<string>(dietOptions.map((option) => option.value));

function calculateBmi(weight: number, height: number) {
  const heightInMeters = height / 100;

  if (!weight || !heightInMeters) {
    return null;
  }

  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
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

export function OnboardingFlow() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<HealthProfileWithUser | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [note, setNote] = useState("");
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [suggestion, setSuggestion] = useState<ProfileAiSuggestion | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [acceptedAiNote, setAcceptedAiNote] = useState<string | null>(null);
  const [selectedSuggestionKeys, setSelectedSuggestionKeys] = useState<SuggestionSelectionMap>({});

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    activityLevel: "moderate",
    goal: "lose_weight",
    dietType: "",
    dietTypeOther: "",
    city: "",
    targetCalories: null as number | null,
    targetBurn: null as number | null,
    targetCarbs: null as number | null,
    targetProtein: null as number | null,
    targetFat: null as number | null,
  });

  useEffect(() => {
    async function load() {
      const token = getStoredAccessToken();

      if (!token) {
        router.replace("/");
        return;
      }

      try {
        const [meResponse, profileResponse] = await Promise.all([
          authApi.getMe(token),
          userApi.getProfile(token),
        ]);

        if (!meResponse.data.user) {
          router.replace("/");
          return;
        }

        if (isProfileComplete(profileResponse.data)) {
          router.replace("/home");
          return;
        }

        setProfile(profileResponse.data);
        const resolvedDietType = profileResponse.data.dietType ?? "";
        const isCustomDietType = resolvedDietType && !presetDietValues.has(resolvedDietType);

        setForm({
          name: profileResponse.data.user?.name ?? "",
          age: profileResponse.data.age != null ? String(profileResponse.data.age) : "",
          gender: profileResponse.data.gender ?? "",
          height: profileResponse.data.height != null ? String(profileResponse.data.height) : "",
          weight: profileResponse.data.weight != null ? String(profileResponse.data.weight) : "",
          activityLevel: profileResponse.data.activityLevel ?? "moderate",
          goal: profileResponse.data.goal ?? "lose_weight",
          dietType: isCustomDietType ? "Other" : resolvedDietType,
          dietTypeOther: isCustomDietType ? resolvedDietType : "",
          city: profileResponse.data.city ?? "",
          targetCalories: profileResponse.data.targetCalories ?? null,
          targetBurn: profileResponse.data.targetBurn ?? null,
          targetCarbs: profileResponse.data.targetCarbs ?? null,
          targetProtein: profileResponse.data.targetProtein ?? null,
          targetFat: profileResponse.data.targetFat ?? null,
        });
      } catch {
        router.replace("/");
        return;
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const bmiPreview = useMemo(() => {
    const height = Number(form.height);
    const weight = Number(form.weight);

    if (!height || !weight) {
      return null;
    }

    const bmi = calculateBmi(weight, height);

    if (bmi == null) {
      return null;
    }

    return {
      value: bmi,
      label: getBmiCategory(bmi),
    };
  }, [form.height, form.weight]);

  async function handleAiSubmit() {
    if ((!note.trim() && !liveTranscript.trim()) || analyzingAi) return;
    const token = getStoredAccessToken();
    if (!token) return;

    setAnalyzingAi(true);
    setAiError(null);
    try {
      const currentNote = note.trim() || liveTranscript.trim();
      const response = await userApi.getProfileAiSuggestion({ note: currentNote }, token);
      setSuggestion(response.data);
      setSelectedSuggestionKeys(
        Object.fromEntries(Object.keys(response.data.updates).map((key) => [key, true]))
      );
      setAcceptedAiNote(currentNote);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to analyze note.");
    } finally {
      setAnalyzingAi(false);
    }
  }

  function applySuggestionAndSave() {
    if (!suggestion) return;

    const selectedUpdates = Object.fromEntries(
      Object.entries(suggestion.updates).filter(([key]) => selectedSuggestionKeys[key])
    );

    setForm(current => {
      const next = { ...current };
      for (const [key, val] of Object.entries(selectedUpdates)) {
        if (key in next) {
          if (key === "dietType") {
             const dt = String(val);
             if (presetDietValues.has(dt)) {
               next.dietType = dt;
               next.dietTypeOther = "";
             } else {
               next.dietType = "Other";
               next.dietTypeOther = dt;
             }
          } else {
             (next as any)[key] = val;
          }
        }
      }
      return next;
    });

    setSuggestion(null);

    setTimeout(() => {
        const formElement = document.getElementById("onboarding-form") as HTMLFormElement | null;
        if (formElement) {
          formElement.requestSubmit();
        }
    }, 100);
  }

  function handleSpeechUnavailable(message: string) {
    toast({
      title: "Voice input unavailable",
      description: message,
      variant: "error",
    });
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
      handleSpeechUnavailable("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!recognitionRef.current) {
      try {
        const recognition = new RecognitionConstructor();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let currentTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const transcriptSegment = event.results[i]?.[0]?.transcript ?? "";
            currentTranscript += transcriptSegment;
          }

          setLiveTranscript(currentTranscript);
          setNote(currentTranscript);
        };

        recognition.onerror = (event: { error?: string }) => {
          if (event.error !== "no-speech") {
            setIsListening(false);
            handleSpeechUnavailable(
              "Microphone access was denied or failed. Please check your permissions.",
            );
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch {
        handleSpeechUnavailable("Could not initialize speech recognition.");
        return;
      }
    }

    try {
      setLiveTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      handleSpeechUnavailable("Please allow microphone access to use voice input.");
    }
  }

  function nextStep() {
    if (!form.name || !form.age || !form.height || !form.weight) {
      toast({
        title: "Missing fields",
        description: "Please complete your name and core health details before continuing.",
        variant: "error",
      });
      return;
    }
    setStep(2);
  }

  function handleBack() {
    if (step === 2) {
      setStep(1);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getStoredAccessToken();

    if (!token) {
      router.replace("/");
      return;
    }

    const age = Number(form.age);
    const height = Number(form.height);
    const weight = Number(form.weight);
    const resolvedDietType =
      form.dietType === "Other"
        ? form.dietTypeOther.trim()
        : form.dietType.trim();

    if (!form.name || !age || !height || !weight || !form.activityLevel || !form.goal) {
      toast({
        title: "Missing fields",
        description: "Please complete your name and core health details before continuing.",
        variant: "error",
      });
      return;
    }

    if (form.dietType === "Other" && !resolvedDietType) {
      toast({
        title: "Add your diet type",
        description: "Please enter your diet type when selecting Other.",
        variant: "error",
      });
      return;
    }

    setSaving(true);

    try {
      const bmi = calculateBmi(weight, height);
      const payload: UpsertHealthProfilePayload = {
        name: form.name.trim() || null,
        age,
        gender: form.gender || null,
        height,
        weight,
        targetWeight: null,
        bmi,
        bmiCategory: getBmiCategory(bmi),
        city: form.city || null,
        activityLevel: form.activityLevel as UpsertHealthProfilePayload["activityLevel"],
        goal: form.goal as UpsertHealthProfilePayload["goal"],
        dietType: resolvedDietType || null,
        allergies: profile?.allergies ?? [],
        foodDislikes: profile?.foodDislikes ?? [],
        aiNotes: acceptedAiNote ? [...(profile?.aiNotes ?? []), acceptedAiNote] : (profile?.aiNotes ?? []),
        targetCalories: form.targetCalories,
        targetBurn: form.targetBurn,
        targetCarbs: form.targetCarbs,
        targetProtein: form.targetProtein,
        targetFat: form.targetFat,
      };

      await userApi.saveProfile(payload, token);
      toast({
        title: "Profile created",
        description: "Your onboarding is complete.",
        variant: "success",
      });
      router.replace("/home");
    } catch (error) {
      toast({
        title: "Unable to save profile",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="h-[420px] rounded-[36px] bg-[#eef5ef] shimmer" />
            <div className="h-[420px] rounded-[36px] bg-[#f7f5ef] shimmer" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="relative overflow-hidden rounded-[36px] border border-[#e6ece6] bg-[#f3f8f3] p-6 sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(106,151,114,0.14),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(188,219,191,0.35),transparent_42%)]" />
            <div className="relative">
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[#425248] shadow-sm transition-colors hover:bg-white"
                onClick={handleBack}
                type="button"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#699772] shadow-sm">
                Health Setup
              </span>
              <h1 className="mt-5 max-w-md text-[38px] font-semibold leading-[1.02] tracking-tight text-[#111111] sm:text-[48px]">
                Build your health profile .
              </h1>
              <p className="mt-4 max-w-lg text-[16px] leading-7 text-[#66707a]">
                We use these details to calibrate calorie targets, macros, progress summaries, and smarter chat context.
              </p>

              <div className="mt-8 rounded-[28px] bg-white/80 p-5 shadow-[0_16px_46px_rgba(105,151,114,0.08)] backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-[#9da4ad]">
                    Live Overview
                  </p>
                  {bmiPreview ? (
                    <span className="rounded-full bg-[#edf5ee] px-3 py-1 text-[12px] font-semibold text-[#699772]">
                      {bmiPreview.label}
                    </span>
                  ) : null}
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <StatTile label="BMI" value={bmiPreview ? bmiPreview.value.toFixed(1) : "—"} />
                  <StatTile label="Goal" value={goalOptions.find((option) => option.value === form.goal)?.label ?? "—"} />
                  <StatTile label="Activity" value={activityOptions.find((option) => option.value === form.activityLevel)?.label ?? "—"} />
                  <StatTile label="City" value={form.city || "—"} />
                </div>
              </div>

              <div className="mt-8 flex justify-center lg:justify-start">
                <AnimatedHealthScene />
              </div>
            </div>
          </section>

          <Card className="overflow-hidden rounded-[36px] border-[#ecece7] bg-white shadow-[0_24px_70px_rgba(17,17,17,0.06)]">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-[#9da4ad]">
                    Onboarding
                  </p>
                  <h2 className="mt-2 text-[30px] font-semibold tracking-tight text-[#111111]">
                    Create your profile
                  </h2>
                </div>
                <div className="rounded-full bg-[#edf5ee] px-3 py-1 text-[12px] font-semibold text-[#699772]">
                  {`Step ${step} of 2`}
                </div>
              </div>

              {step === 1 ? (
                <div className="mt-2 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Name">
                      <Input
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="eg. Alex John"
                        type="text"
                        value={form.name}
                      />
                    </Field>
                    <Field label="Age">
                      <Input
                        min="1"
                        onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
                        placeholder="28"
                        type="number"
                        value={form.age}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Gender">
                      <select
                        className="flex h-11 w-full rounded-[14px] border border-[#e7e5dd] bg-[#fbfbf7] px-3 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#699772]"
                        onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
                        value={form.gender}
                      >
                        <option value="">Select gender</option>
                        {genderOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Height (cm)">
                      <Input
                        min="1"
                        onChange={(event) => setForm((current) => ({ ...current, height: event.target.value }))}
                        placeholder="175"
                        type="number"
                        value={form.height}
                      />
                    </Field>
                    <Field label="Weight (kg)">
                      <Input
                        min="1"
                        onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))}
                        placeholder="71.5"
                        step="0.1"
                        type="number"
                        value={form.weight}
                      />
                    </Field>
                  </div>

                  <Button
                    className="mt-4 h-12 w-full rounded-2xl bg-green-800 text-[15px] font-semibold text-white hover:bg-[#5d8666]"
                    onClick={nextStep}
                    type="button"
                  >
                    Next: Set Goals
                  </Button>
                </div>
              ) : (
                <div className="mt-2 space-y-5">
                  <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7b9480]">
                    <Sparkles className="h-4 w-4" />
                    <span>AI Notes</span>
                  </div>
                  <p className="text-[14px] leading-6 text-[#8c939b]">
                    Tell Nofone about your body metrics, routine, health conditions, allergies, diet type, dislikes, and training goals. It will update your profile draft and refresh your daily calorie targets after save.
                  </p>
                  {aiError ? (
                    <div className="rounded-[16px] border border-[#f0d7d7] bg-[#fff4f4] px-4 py-3 text-[13px] text-[#c05454]">
                      {aiError}
                    </div>
                  ) : null}
                  <div className="rounded-[18px] bg-[#f7f4ed] px-4 py-3">
                    <textarea
                      className="min-h-[108px] w-full resize-none bg-transparent text-[15px] leading-6 text-[#171717] outline-none placeholder:text-[#a5abb4]"
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Tell me about yourself, your health conditions, allergies, diet, dislikes, and goals"
                      value={note}
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-[13px] text-[#7f8790]">
                        Example: &quot;I live in Bengaluru, training for a marathon, and want my profile and daily goals set.&quot;
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          className={cn(
                            "transition-colors",
                            isListening ? "text-green-800" : "text-[#9aa0a8]",
                          )}
                          onClick={handleMicToggle}
                          type="button"
                        >
                          <Mic className="h-4.5 w-4.5" />
                        </button>
                        <button
                          className="flex items-center justify-center text-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={analyzingAi || (!note.trim() && !liveTranscript.trim())}
                          onClick={() => void handleAiSubmit()}
                          type="button"
                        >
                          {analyzingAi ? <Spinner className="h-4 w-4" /> : <SendHorizonal className="h-4.5 w-4.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {isListening || liveTranscript ? (
                    <p className="text-[12px] text-[#7f8790]">
                      {isListening
                        ? `Listening... ${liveTranscript || "Start speaking to update your profile note."}`
                        : liveTranscript}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-4">
                    <Button
                      className="h-12 w-full rounded-2xl bg-white border border-[#e7e5dd] text-[15px] font-semibold text-[#111111] hover:bg-[#fbfbf7]"
                      onClick={() => {
                        const formElement = document.getElementById("onboarding-form") as HTMLFormElement | null;
                        if (formElement) formElement.requestSubmit();
                      }}
                      type="button"
                      disabled={saving}
                    >
                      Skip for now
                    </Button>
                  </div>
                  
                  {/* Invisible form to keep handleSubmit structure */}
                  <form id="onboarding-form" className="hidden" onSubmit={handleSubmit} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {suggestion ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c2f32]/18 p-4 backdrop-blur-[2px]">
          <div className="flex w-full max-w-lg flex-col max-h-[90vh] rounded-[26px] border border-[#ecece7] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <div className="border-b border-[#efeee7] px-5 py-4 shrink-0">
              <p className="text-[18px] font-semibold text-[#171717]">AI Profile Suggestion</p>
              <p className="mt-1 text-[14px] text-[#7f8790]">{suggestion.summary}</p>
            </div>
            <div className="space-y-3 px-5 py-5 overflow-y-auto">
              {(() => {
                const effectiveUpdates = Object.entries(suggestion.updates).filter(([key, value]) => {
                  const oldVal = formatDisplayValue(key, (form as any)[key]);
                  const newVal = formatSuggestionValue(value);
                  return oldVal !== newVal;
                });

                if (effectiveUpdates.length === 0) {
                  return (
                    <div className="rounded-[16px] bg-[#f8f7f2] px-4 py-4 text-[14px] text-[#707780]">
                      No changes made based on the provided note.
                    </div>
                  );
                }

                return effectiveUpdates.map(([key, value]) => (
                  <div key={key} className="rounded-[16px] bg-[#f8f7f2] px-4 py-3">
                    <label className="flex items-start gap-3">
                      <input
                        checked={selectedSuggestionKeys[key] ?? false}
                        className="mt-1 h-4 w-4 rounded border-[#cfd4dc] text-green-800 focus:ring-green-700"
                        onChange={(event) =>
                          setSelectedSuggestionKeys((current) => ({
                            ...current,
                            [key]: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-[#8b929b]">
                          {formatSuggestionLabel(key)}
                        </p>
                        <p className="mt-1 text-[14px] text-[#5b6067]">
                          Change from{" "}
                          <span className="font-semibold text-[#171717]">
                            {formatDisplayValue(key, (form as any)[key])}
                          </span>{" "}
                          to{" "}
                          <span className="font-semibold text-[#171717]">
                            {formatSuggestionValue(value)}
                          </span>
                        </p>
                      </div>
                    </label>
                  </div>
                ));
              })()}
              <p className="mt-4 text-[13px] text-[#7f8790]">
                You can change these things later as well.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#efeee7] px-5 py-4 shrink-0">
              <button
                className="rounded-[14px] px-4 py-2.5 text-[14px] font-semibold text-[#7b828b] transition-colors hover:bg-[#f4f4ef]"
                onClick={() => {
                  setSuggestion(null);
                  setSelectedSuggestionKeys({});
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-green-800 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                onClick={applySuggestionAndSave}
                type="button"
              >
                {saving ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {saving ? "Saving..." : "Apply and Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#9da4ad]">
        {label}
      </Label>
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#edf0e8] bg-white px-4 py-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9da4ad]">
        {label}
      </p>
      <p className="mt-2 text-[26px] font-semibold leading-none text-[#111111]">{value}</p>
    </div>
  );
}

function AnimatedHealthScene() {
  return (
    <svg
      className="h-auto w-full max-w-[420px]"
      fill="none"
      viewBox="0 0 420 260"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="28" y="38" width="210" height="148" rx="28" fill="white" />
      <rect x="248" y="84" width="144" height="120" rx="30" fill="#E7F2E8" />
      <circle cx="316" cy="70" r="28" fill="#C7DDCB" className="animate-pulse-soft" />
      <path
        d="M76 156c10-30 36-51 71-51 46 0 74 30 83 67"
        stroke="#699772"
        strokeLinecap="round"
        strokeWidth="10"
      />
      <path
        d="M105 118c0-24 19-43 43-43s43 19 43 43"
        stroke="#B9D1BD"
        strokeLinecap="round"
        strokeWidth="16"
      />
      <rect x="73" y="62" width="58" height="12" rx="6" fill="#E8EFE8" />
      <rect x="73" y="82" width="102" height="10" rx="5" fill="#F1F5F1" />
      <rect x="272" y="112" width="96" height="12" rx="6" fill="white" />
      <rect x="272" y="136" width="82" height="10" rx="5" fill="white" opacity="0.88" />
      <rect x="272" y="158" width="56" height="10" rx="5" fill="white" opacity="0.72" />
      <g className="origin-center animate-float-soft">
        <circle cx="340" cy="58" r="11" fill="#699772" />
        <path d="M340 52v12M334 58h12" stroke="white" strokeLinecap="round" strokeWidth="2.4" />
      </g>
      <g className="origin-center animate-float-soft-delayed">
        <rect x="180" y="12" width="76" height="34" rx="17" fill="#F7FBF7" />
        <path d="M199 29h38" stroke="#699772" strokeLinecap="round" strokeWidth="3" />
      </g>
    </svg>
  );
}
