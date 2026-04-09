"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { AUTH_TOKEN_STORAGE_KEY, authApi, userApi } from "@/lib/api";
import { isProfileComplete } from "@/lib/profile";
import type { UpsertHealthProfilePayload } from "@/types/api";
import type { HealthProfileWithUser } from "@/types/domain";

const activityOptions = [
  { label: "Sedentary", value: "sedentary" },
  { label: "Light", value: "light" },
  { label: "Moderate", value: "moderate" },
  { label: "Active", value: "active" },
  { label: "Very Active", value: "very_active" },
] as const;

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
  { label: "Keto", value: "Keto" },
  { label: "Vegan", value: "Vegan" },
  { label: "Vegetarian", value: "Vegetarian" },
  { label: "Paleo", value: "Paleo" },
  { label: "Mediterranean", value: "Mediterranean" },
  { label: "Low-FODMAP", value: "Low-FODMAP" },
  { label: "Gluten-Free", value: "Gluten-Free" },
] as const;

function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

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
  const [form, setForm] = useState({
    age: "",
    gender: "",
    height: "",
    weight: "",
    targetWeight: "",
    activityLevel: "moderate",
    goal: "lose_weight",
    dietType: "",
    city: "",
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
        setForm({
          age: profileResponse.data.age != null ? String(profileResponse.data.age) : "",
          gender: profileResponse.data.gender ?? "",
          height: profileResponse.data.height != null ? String(profileResponse.data.height) : "",
          weight: profileResponse.data.weight != null ? String(profileResponse.data.weight) : "",
          targetWeight:
            profileResponse.data.targetWeight != null
              ? String(profileResponse.data.targetWeight)
              : "",
          activityLevel: profileResponse.data.activityLevel ?? "moderate",
          goal: profileResponse.data.goal ?? "lose_weight",
          dietType: profileResponse.data.dietType ?? "",
          city: profileResponse.data.city ?? "",
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

  function handleBack() {
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
    const targetWeight = form.targetWeight ? Number(form.targetWeight) : null;

    if (!age || !height || !weight || !form.activityLevel || !form.goal) {
      toast({
        title: "Missing fields",
        description: "Please complete the core health details before continuing.",
        variant: "error",
      });
      return;
    }

    setSaving(true);

    try {
      const bmi = calculateBmi(weight, height);
      const payload: UpsertHealthProfilePayload = {
        age,
        gender: form.gender || null,
        height,
        weight,
        targetWeight,
        bmi,
        bmiCategory: getBmiCategory(bmi),
        city: form.city || null,
        activityLevel: form.activityLevel as UpsertHealthProfilePayload["activityLevel"],
        goal: form.goal as UpsertHealthProfilePayload["goal"],
        dietType: form.dietType || null,
        allergies: profile?.allergies ?? [],
        foodDislikes: profile?.foodDislikes ?? [],
        aiNotes: profile?.aiNotes ?? [],
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
                  <StatTile label="Target Weight" value={form.targetWeight || "—"} />
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
                  Step 1 of 1
                </div>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Age">
                    <Input
                      min="1"
                      onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
                      placeholder="28"
                      type="number"
                      value={form.age}
                    />
                  </Field>
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Target Weight (kg)">
                    <Input
                      min="1"
                      onChange={(event) => setForm((current) => ({ ...current, targetWeight: event.target.value }))}
                      placeholder="68"
                      step="0.1"
                      type="number"
                      value={form.targetWeight}
                    />
                  </Field>
                  <Field label="City">
                    <Input
                      onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                      placeholder="Bengaluru"
                      value={form.city}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Activity Level">
                    <select
                      className="flex h-11 w-full rounded-[14px] border border-[#e7e5dd] bg-[#fbfbf7] px-3 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#699772]"
                      onChange={(event) => setForm((current) => ({ ...current, activityLevel: event.target.value }))}
                      value={form.activityLevel}
                    >
                      {activityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Goal">
                    <select
                      className="flex h-11 w-full rounded-[14px] border border-[#e7e5dd] bg-[#fbfbf7] px-3 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#699772]"
                      onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))}
                      value={form.goal}
                    >
                      {goalOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Diet Type">
                  <select
                    className="flex h-11 w-full rounded-[14px] border border-[#e7e5dd] bg-[#fbfbf7] px-3 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#699772]"
                    onChange={(event) => setForm((current) => ({ ...current, dietType: event.target.value }))}
                    value={form.dietType}
                  >
                    <option value="">Select diet type</option>
                    {dietOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="rounded-[20px] border border-[#edf0e8] bg-[#fafaf7] px-4 py-4 text-[14px] leading-6 text-[#67707a]">
                  Your dashboard will be generated from these values, and you can refine everything later from Profile
                </div>

                <Button
                  className="h-12 w-full rounded-2xl bg-green-800 text-[15px] font-semibold text-white hover:bg-[#5d8666]"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Creating profile..." : "Continue to Dashboard"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
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
