"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  FileText,
  Mic,
  Pencil,
  SendHorizonal,
  Sparkles,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { UpsertHealthProfilePayload } from "@/types/api";
import type { HealthProfileWithUser, MedicalReport, ProfileAiSuggestion } from "@/types/domain";

type Option = {
  label: string;
  value: string;
};

type DraftProfile = UpsertHealthProfilePayload;
type DraftFieldKey = keyof DraftProfile;
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

const yesNoOptions: Option[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

const genderOptions: Option[] = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Non-binary", value: "Non-binary" },
  { label: "Prefer not to say", value: "Prefer not to say" },
];

const activityOptions: Option[] = [
  { label: "Sedentary", value: "sedentary" },
  { label: "Light", value: "light" },
  { label: "Moderate", value: "moderate" },
  { label: "Active", value: "active" },
  { label: "Very Active", value: "very_active" },
];

const goalOptions: Option[] = [
  { label: "Lose Weight", value: "lose_weight" },
  { label: "Gain Weight", value: "gain_weight" },
  { label: "Maintain", value: "maintain" },
  { label: "Loss", value: "loss" },
  { label: "Gain", value: "gain" },
];

const dietOptions: Option[] = [
  { label: "Balanced", value: "Balanced" },
  { label: "Keto", value: "Keto" },
  { label: "Vegan", value: "Vegan" },
  { label: "Vegetarian", value: "Vegetarian" },
  { label: "Paleo", value: "Paleo" },
  { label: "Mediterranean", value: "Mediterranean" },
  { label: "Low-FODMAP", value: "Low-FODMAP" },
  { label: "Gluten-Free", value: "Gluten-Free" },
] as const;

function toDraftProfile(profile: HealthProfileWithUser): DraftProfile {
  return {
    age: profile.age ?? undefined,
    gender: profile.gender,
    height: profile.height ?? undefined,
    weight: profile.weight ?? undefined,
    targetWeight: profile.targetWeight,
    bmi: profile.bmi,
    bmiCategory: profile.bmiCategory,
    location: profile.location,
    city: profile.city,
    ethnicityCuisine: profile.ethnicityCuisine,
    activityLevel: profile.activityLevel ?? undefined,
    goal: profile.goal ?? undefined,
    dietType: profile.dietType,
    diabetes: profile.diabetes,
    hypertension: profile.hypertension,
    cholesterol: profile.cholesterol,
    cancerSurvivor: profile.cancerSurvivor,
    hrt: profile.hrt,
    otherConditions: profile.otherConditions,
    allergies: profile.allergies ?? [],
    foodDislikes: profile.foodDislikes ?? [],
    aiNotes: profile.aiNotes ?? [],
  };
}

function normalizeValue(
  kind: "text" | "number" | "select" | "tags",
  value: string,
): string | number | string[] | null {
  if (kind === "tags") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (kind === "number") {
    if (!value.trim()) {
      return null;
    }

    return Number(value);
  }

  return value.trim() ? value.trim() : null;
}

function formatDisplayValue(field: DraftFieldKey, value: DraftProfile[DraftFieldKey]) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None";
  }

  if (value == null || value === "") {
    return "—";
  }

  if (field === "goal" || field === "activityLevel") {
    return String(value)
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return String(value);
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
      <CardContent className="p-5 sm:p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9ca3ad]">
          {title}
        </p>
        <div className="mt-3">{children}</div>
      </CardContent>
    </Card>
  );
}

function MetricStat({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <div className="px-4 text-center">
      <p className={cn("text-[40px] font-semibold leading-none", tone)}>{value}</p>
      <p className="mt-2 text-[14px] text-[#8d949c]">{label}</p>
    </div>
  );
}

function EditableRow({
  field,
  label,
  value,
  kind = "text",
  options,
  onApply,
}: {
  field: DraftFieldKey;
  label: string;
  value: DraftProfile[DraftFieldKey];
  kind?: "text" | "number" | "select" | "tags";
  options?: Option[];
  onApply: (field: DraftFieldKey, value: DraftProfile[DraftFieldKey]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(
    Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value),
  );

  function commit() {
    onApply(field, normalizeValue(kind, inputValue) as DraftProfile[DraftFieldKey]);
    setEditing(false);
  }

  function cancel() {
    setInputValue(Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value));
    setEditing(false);
  }

  return (
    <div className="group flex items-center gap-4 border-b border-[#efeee7] py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-[#8e949d]">{label}</p>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {editing ? (
          <>
            {kind === "select" ? (
              <select
                className="min-w-[156px] rounded-xl border border-[#e7e5dd] bg-[#fbfbf7] px-3 py-2 text-right text-[15px] font-semibold text-[#111111] outline-none"
                onChange={(event) => setInputValue(event.target.value)}
                value={inputValue}
              >
                <option value="">Select</option>
                {(options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="min-w-[156px] rounded-xl border border-[#e7e5dd] bg-[#fbfbf7] px-3 py-2 text-right text-[15px] font-semibold text-[#111111] outline-none"
                onChange={(event) => setInputValue(event.target.value)}
                step={kind === "number" ? "0.1" : undefined}
                type={kind === "number" ? "number" : "text"}
                value={inputValue}
              />
            )}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#2d73ff] transition-colors hover:bg-[#eef4ff]"
              onClick={commit}
              type="button"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#df5b5b] transition-colors hover:bg-[#fff1f1]"
              onClick={cancel}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <p className="text-right text-[15px] font-semibold text-[#171717]">
              {formatDisplayValue(field, value)}
            </p>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#9ba1aa] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#f4f4ef]"
              onClick={() => {
                setInputValue(
                  Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value),
                );
                setEditing(true);
              }}
              type="button"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ProfileSection({
  loading,
  profile,
  reports,
  savingProfile,
  analyzingAi,
  uploadingReport,
  onBack,
  onAnalyzeAiNote,
  onSaveProfile,
  onUploadReport,
}: {
  loading: boolean;
  profile: HealthProfileWithUser | null;
  reports: MedicalReport[];
  savingProfile: boolean;
  analyzingAi: boolean;
  uploadingReport: boolean;
  onBack: () => void;
  onAnalyzeAiNote: (note: string) => Promise<ProfileAiSuggestion>;
  onSaveProfile: (payload: DraftProfile) => Promise<void>;
  onUploadReport: (file: File, title?: string | null) => Promise<void>;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<DraftProfile | null>(() =>
    profile ? toDraftProfile(profile) : null,
  );
  const [noteInput, setNoteInput] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<ProfileAiSuggestion | null>(null);
  const [pendingNote, setPendingNote] = useState("");
  const reportInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const bmi = draft?.bmi ?? null;
  const bmiCategory = draft?.bmiCategory ?? "Normal";
  const currentWeight = draft?.weight ?? null;
  const targetWeight = draft?.targetWeight ?? null;
  const toGo =
    targetWeight != null && currentWeight != null
      ? Math.max(Number((currentWeight - targetWeight).toFixed(1)), 0)
      : null;

  const canSave = useMemo(() => {
    if (!draft) {
      return false;
    }

    return Boolean(
      draft.age != null &&
        draft.height != null &&
        draft.weight != null &&
        draft.activityLevel &&
        draft.goal,
    );
  }, [draft]);

  function applyField(field: DraftFieldKey, value: DraftProfile[DraftFieldKey]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function applySuggestion() {
    if (!pendingSuggestion) {
      return;
    }

    setDraft((current) => {
      if (!current) {
        return current;
      }

      const nextDraft = {
        ...current,
        ...pendingSuggestion.updates,
        aiNotes: pendingNote
          ? [...(current.aiNotes ?? []), pendingNote]
          : current.aiNotes,
      } as DraftProfile;

      return nextDraft;
    });
    setPendingSuggestion(null);
    setPendingNote("");
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
      setNoteInput(nextValue);

      if (finalTranscript.trim()) {
        setLiveTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setLiveTranscript("");
      recognitionRef.current = null;

      if (event.error === "not-allowed") {
        handleSpeechUnavailable(
          "Microphone permission was denied. Please allow microphone access and try again.",
        );
        return;
      }

      if (event.error === "no-speech") {
        handleSpeechUnavailable("No speech was detected. Try speaking a little closer to the microphone.");
        return;
      }

      handleSpeechUnavailable("Voice input could not start properly. Please try again.");
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

  if (loading || !profile || !draft) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-34 rounded-[26px] bg-[#f4f4ef] shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-10 animate-fade-up">
      <div className="flex items-center gap-3 px-1">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#4b4f55] transition-colors hover:bg-[#f3f3ee]"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[32px] font-semibold tracking-tight text-[#171717]">Profile</h1>
      </div>

      <Card className="rounded-[28px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-18 w-18 items-center justify-center rounded-[22px] bg-[#edf5ee] text-green-800">
              <UserRound className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[16px] text-[#8b929b]">
                {draft.age ?? "—"} yrs · {draft.gender || "—"} · {draft.city || "—"}
              </p>
              <p className="mt-1 text-[14px] text-[#a0a6af]">{profile.user.name || "NofOne user"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[42px] font-semibold leading-none text-green-800">
              {bmi ? bmi.toFixed(1) : "—"}
            </p>
            <p className="mt-2 text-[12px] uppercase tracking-[0.14em] text-[#9ca3ad]">BMI</p>
            <span className="mt-3 inline-flex rounded-full bg-[#edf5ee] px-3 py-1 text-[12px] font-semibold text-green-800">
              {bmiCategory}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
        <CardContent className="p-5 sm:p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9ca3ad]">
            Weight Journey
          </p>
          <div className="mt-4 grid grid-cols-3 divide-x divide-[#ecece7]">
            <MetricStat label="Current (kg)" tone="text-[#171717]" value={currentWeight != null ? String(currentWeight) : "—"} />
            <MetricStat label="Target (kg)" tone="text-green-800" value={targetWeight != null ? String(targetWeight) : "—"} />
            <MetricStat label="To Go (kg)" tone="text-[#e49a46]" value={toGo != null ? String(toGo) : "—"} />
          </div>
        </CardContent>
      </Card>

      <SectionCard title="Medical Records">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7b9480]">
            <FileText className="h-4 w-4" />
            <span>Medical Records</span>
          </div>

          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="rounded-[18px] bg-[#f8f7f2] px-4 py-4 text-[14px] text-[#8c939b]">
                No reports uploaded yet.
              </div>
            ) : (
              reports.map((report) => (
                <a
                  key={report.id}
                  className="block rounded-[18px] border border-[#ecece7] bg-[#fbfbf8] px-4 py-4 transition-colors hover:bg-[#f7f7f2]"
                  href={report.secureUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f2f2ed] text-[#8f97a1]">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-[#171717]">
                        {report.title || report.fileName}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[12px] text-[#9ca3ad]">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>
                          {new Date(report.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span>·</span>
                        <span>Lab Report</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-[#e7e5dd] bg-white px-4 py-3.5 text-[14px] font-semibold text-[#8e949d] transition-colors hover:bg-[#faf9f4]"
            disabled={uploadingReport}
            onClick={() => reportInputRef.current?.click()}
            type="button"
          >
            {uploadingReport ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            <span>{uploadingReport ? "Uploading Record" : "Upload Record"}</span>
          </button>
          <input
            ref={reportInputRef}
            accept=".pdf,.txt,image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void onUploadReport(file, file.name.replace(/\.[^.]+$/, ""));
              }

              event.target.value = "";
            }}
            type="file"
          />
        </div>
      </SectionCard>

      <SectionCard title="AI Notes">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7b9480]">
            <Sparkles className="h-4 w-4" />
            <span>AI Notes</span>
          </div>
          <p className="text-[14px] leading-6 text-[#8c939b]">
            Drop a note, it updates your draft profile context for smarter suggestions.
          </p>
          {aiError ? (
            <div className="rounded-[16px] border border-[#f0d7d7] bg-[#fff4f4] px-4 py-3 text-[13px] text-[#c05454]">
              {aiError}
            </div>
          ) : null}
          <div className="flex items-center gap-3 rounded-[18px] bg-[#f7f4ed] px-4 py-3">
            <input
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[#171717] outline-none placeholder:text-[#a5abb4]"
              onChange={(event) => setNoteInput(event.target.value)}
              placeholder="e.g. I'm lactose intolerant..."
              value={noteInput}
            />
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
              className="flex items-center justify-center text-green-800"
              onClick={() => {
                if (!noteInput.trim()) {
                  return;
                }
                const nextNote = noteInput.trim();
                setAiError(null);
                void onAnalyzeAiNote(nextNote)
                  .then((result) => {
                    setPendingSuggestion(result);
                    setPendingNote(nextNote);
                    setNoteInput("");
                  })
                  .catch((error) => {
                    setAiError(error instanceof Error ? error.message : "Unable to analyze note.");
                  });
              }}
              type="button"
            >
              {analyzingAi ? <Spinner className="h-4 w-4" /> : <SendHorizonal className="h-4.5 w-4.5" />}
            </button>
          </div>
          {isListening || liveTranscript ? (
            <p className="text-[12px] text-[#7f8790]">
              {isListening
                ? `Listening... ${liveTranscript || "Start speaking to update your profile note."}`
                : liveTranscript}
            </p>
          ) : null}
          <div className="space-y-3">
            {(draft.aiNotes ?? []).map((note, index) => (
              <div key={`${note}-${index}`} className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-[#b8d2bc]" />
                <p className="flex-1 text-[14px] text-[#5b6067]">{note}</p>
                <button
                  className="rounded-full p-1 text-[#d46363] transition-colors hover:bg-[#fff2f2]"
                  onClick={() =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            aiNotes: (current.aiNotes ?? []).filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          }
                        : current,
                    )
                  }
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Basic Info">
        <EditableRow field="age" kind="number" label="Age" onApply={applyField} value={draft.age} />
        <EditableRow field="gender" kind="select" label="Gender" onApply={applyField} options={genderOptions} value={draft.gender} />
        <EditableRow field="height" kind="number" label="Height (cm)" onApply={applyField} value={draft.height} />
        <EditableRow field="weight" kind="number" label="Weight (kg)" onApply={applyField} value={draft.weight} />
        <EditableRow field="targetWeight" kind="number" label="Target Weight (kg)" onApply={applyField} value={draft.targetWeight} />
      </SectionCard>

      <SectionCard title="Location & Background">
        <EditableRow field="city" label="City" onApply={applyField} value={draft.city} />
        <EditableRow field="location" label="Location" onApply={applyField} value={draft.location} />
        <EditableRow field="ethnicityCuisine" label="Ethnicity / Cuisine" onApply={applyField} value={draft.ethnicityCuisine} />
      </SectionCard>

      <SectionCard title="Activity & Goals">
        <EditableRow field="activityLevel" kind="select" label="Activity Level" onApply={applyField} options={activityOptions} value={draft.activityLevel} />
        <EditableRow field="goal" kind="select" label="Goal" onApply={applyField} options={goalOptions} value={draft.goal} />
      </SectionCard>

      <SectionCard title="Health Conditions">
        <EditableRow field="diabetes" kind="select" label="Diabetes" onApply={applyField} options={yesNoOptions} value={draft.diabetes} />
        <EditableRow field="hypertension" kind="select" label="Hypertension" onApply={applyField} options={yesNoOptions} value={draft.hypertension} />
        <EditableRow field="cholesterol" label="Cholesterol" onApply={applyField} value={draft.cholesterol} />
        <EditableRow field="cancerSurvivor" kind="select" label="Cancer Survivor" onApply={applyField} options={yesNoOptions} value={draft.cancerSurvivor} />
        <EditableRow field="hrt" kind="select" label="HRT" onApply={applyField} options={yesNoOptions} value={draft.hrt} />
        <EditableRow field="otherConditions" label="Other Conditions" onApply={applyField} value={draft.otherConditions} />
      </SectionCard>

      <SectionCard title="Allergies & Dislikes">
        <EditableRow field="allergies" kind="tags" label="Allergies" onApply={applyField} value={draft.allergies} />
        <EditableRow field="foodDislikes" kind="tags" label="Food Dislikes" onApply={applyField} value={draft.foodDislikes} />
      </SectionCard>

      <SectionCard title="Diet Preference">
        <EditableRow field="dietType" kind="select" label="Diet Type" onApply={applyField} options={dietOptions} value={draft.dietType} />
      </SectionCard>

      <div className="sticky bottom-4 flex justify-end">
        <button
          className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-[18px] bg-green-800 px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_34px_rgba(22,34,18,0.14)] transition-opacity hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSave || savingProfile}
          onClick={() => void onSaveProfile(draft)}
          type="button"
        >
          {savingProfile ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          <span>{savingProfile ? "Saving Profile..." : "Save Profile"}</span>
        </button>
      </div>

      {pendingSuggestion ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c2f32]/18 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-[26px] border border-[#ecece7] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <div className="border-b border-[#efeee7] px-5 py-4">
              <p className="text-[18px] font-semibold text-[#171717]">AI Profile Suggestion</p>
              <p className="mt-1 text-[14px] text-[#7f8790]">{pendingSuggestion.summary}</p>
            </div>
            <div className="space-y-3 px-5 py-5">
              {Object.keys(pendingSuggestion.updates).length === 0 ? (
                <div className="rounded-[16px] bg-[#f8f7f2] px-4 py-4 text-[14px] text-[#707780]">
                  No concrete profile values were extracted from that note.
                </div>
              ) : (
                Object.entries(pendingSuggestion.updates).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-[16px] bg-[#f8f7f2] px-4 py-3">
                    <span className="text-[14px] text-[#8b929b]">{key}</span>
                    <span className="text-[14px] font-semibold text-[#171717]">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-[#efeee7] px-5 py-4">
              <button
                className="rounded-[14px] px-4 py-2.5 text-[14px] font-semibold text-[#7b828b] transition-colors hover:bg-[#f4f4ef]"
                onClick={() => {
                  setPendingSuggestion(null);
                  setPendingNote("");
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-green-800 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-92"
                onClick={applySuggestion}
                type="button"
              >
                <Check className="h-4 w-4" />
                Confirm Updates
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
