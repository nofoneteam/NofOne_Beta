"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { authApi, userApi } from "@/lib/api";
import { getStoredAccessToken } from "@/lib/auth/session";

export function BasicProfileSetup() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

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

        if (meResponse.data.user.onboarded) {
          router.replace("/home");
          return;
        }

        setName(profileResponse.data.user?.name ?? "");
        setAge(profileResponse.data.age != null ? String(profileResponse.data.age) : "");
      } catch {
        router.replace("/");
        return;
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getStoredAccessToken();

    if (!token) {
      router.replace("/");
      return;
    }

    const normalizedAge = Number(age);

    if (!name.trim() || !normalizedAge) {
      toast({
        title: "Missing details",
        description: "Please add your name and age before continuing.",
        variant: "error",
      });
      return;
    }

    setSaving(true);

    try {
      await userApi.saveProfile(
        {
          name: name.trim(),
          age: normalizedAge,
          activityLevel: "moderate",
          goal: "lose_weight",
        },
        token,
      );

      toast({
        title: "Welcome setup saved",
        description: "You can complete your full profile later from the Profile section.",
        variant: "success",
      });

      router.replace("/home");
    } catch (error) {
      toast({
        title: "Unable to continue",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#eef8ef] px-4 py-6 text-green-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl items-center justify-center">
          <Card className="w-full rounded-[32px] border-green-100 shadow-[0_20px_60px_rgba(22,101,52,0.08)]">
            <CardContent className="p-8 text-center text-[15px] text-green-900/70">
              Loading your setup...
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef8ef] px-4 py-6 text-green-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl items-center justify-center">
        <Card className="w-full rounded-[32px] border-green-100 shadow-[0_20px_60px_rgba(22,101,52,0.08)]">
          <CardContent className="p-8 sm:p-10">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-green-800/70">
                Quick Start
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-green-950 sm:text-4xl">
                Add the basics
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-green-900/70">
                We only need a couple of details right now. You can finish your full health profile later from the Profile section.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="welcome-name">Name</Label>
                <Input
                  id="welcome-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome-age">Age</Label>
                <Input
                  id="welcome-age"
                  type="number"
                  min="1"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  placeholder="Your age"
                />
              </div>

              <div className="rounded-[22px] border border-green-100 bg-green-50 px-4 py-3 text-[14px] leading-6 text-green-900/80">
                We&apos;ll use a generic wellness baseline for chat until you complete your full profile later.
              </div>

              <Button className="h-12 w-full rounded-full bg-green-800 text-white hover:bg-green-900" disabled={saving} type="submit">
                {saving ? "Saving..." : "Continue to Home"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
