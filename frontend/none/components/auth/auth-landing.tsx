"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { signInWithPhoneNumber, signInWithPopup } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, AUTH_TOKEN_STORAGE_KEY, REFERRAL_CODE_STORAGE_KEY } from "@/lib/api";
import {
  createPhoneRecaptchaVerifier,
  createGoogleProvider,
  getFirebaseAuth,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";
type OtpMethod = "email" | "phone";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M21.8 12.23c0-.73-.06-1.25-.2-1.8H12.2v3.56h5.52c-.11.88-.68 2.2-1.94 3.09l-.02.12 2.86 2.18.2.02c1.88-1.71 2.98-4.24 2.98-7.17Z"
        fill="#4285F4"
      />
      <path
        d="M12.2 21.9c2.7 0 4.97-.87 6.63-2.38l-3.16-2.32c-.85.58-1.99.99-3.47.99-2.65 0-4.9-1.71-5.7-4.09l-.12.01-2.98 2.27-.04.11c1.65 3.21 5.05 5.41 8.84 5.41Z"
        fill="#34A853"
      />
      <path
        d="M6.5 14.1a5.76 5.76 0 0 1-.33-1.9c0-.67.12-1.3.31-1.9l-.01-.13-3.02-2.3-.1.05A9.6 9.6 0 0 0 2.3 12.2c0 1.54.37 3 1.04 4.28l3.16-2.38Z"
        fill="#FBBC05"
      />
      <path
        d="M12.2 6.2c1.87 0 3.14.79 3.86 1.45l2.82-2.7C17.15 3.4 14.9 2.5 12.2 2.5c-3.79 0-7.19 2.2-8.84 5.41l3.13 2.38c.82-2.38 3.08-4.09 5.71-4.09Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function ArrowBadge() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <path
          d="M7 12h10m0 0-4-4m4 4-4 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function AuthLanding({ initialReferralCode }: { initialReferralCode?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [otpMethod, setOtpMethod] = useState<OtpMethod>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeReferralCode, setActiveReferralCode] = useState<string | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

    if (savedToken) {
      router.replace("/home");
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const incomingReferralCode = initialReferralCode?.trim().toUpperCase() || null;

    if (incomingReferralCode) {
      window.localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, incomingReferralCode);
      setActiveReferralCode(incomingReferralCode);
      return;
    }

    const storedReferralCode = window.localStorage.getItem(REFERRAL_CODE_STORAGE_KEY);
    setActiveReferralCode(storedReferralCode?.trim().toUpperCase() || null);
  }, [initialReferralCode]);

  useEffect(() => {
    setOtpRequested(false);
    setOtp("");
    setStatusMessage(null);
    setErrorMessage(null);
  }, [mode, otpMethod]);

  useEffect(() => {
    return () => {
      confirmationResultRef.current = null;
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  function persistSession(accessToken: string) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
  }

  function clearStoredReferralCode() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
    setActiveReferralCode(null);
  }

  async function handleRequestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      if (otpMethod === "phone") {
        if (!isFirebaseClientConfigured()) {
          throw new Error(
            "Firebase Phone Auth is not configured in the frontend environment yet. Add the NEXT_PUBLIC_FIREBASE_* values first.",
          );
        }

        if (!recaptchaContainerRef.current) {
          throw new Error("Phone verification could not start. Recaptcha container is missing.");
        }

        if (!recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current = createPhoneRecaptchaVerifier(recaptchaContainerRef.current);
        }

        confirmationResultRef.current = await signInWithPhoneNumber(
          getFirebaseAuth(),
          phoneNumber,
          recaptchaVerifierRef.current,
        );
        setOtpRequested(true);
        setStatusMessage("A verification code was sent to your phone.");
        return;
      }

      const payload =
        {
          email,
          ...(mode === "signup" && name.trim() ? { name: name.trim() } : {}),
          ...(mode === "signup" && activeReferralCode ? { referralCode: activeReferralCode } : {}),
        };

      const response =
        mode === "signup"
          ? await authApi.requestSignupOtp(payload)
          : await authApi.requestLoginOtp(payload);

      setOtpRequested(true);
      setStatusMessage(
        response.message ||
          "A one-time code was sent to your email.",
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to request OTP");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      if (otpMethod === "phone") {
        if (!confirmationResultRef.current) {
          throw new Error("Please request a phone verification code first.");
        }

        const credential = await confirmationResultRef.current.confirm(otp);
        const idToken = await credential.user.getIdToken();
        const response = await authApi.phoneLogin({
          idToken,
          mode,
          ...(mode === "signup" && name.trim() ? { name: name.trim() } : {}),
          ...(mode === "signup" && activeReferralCode ? { referralCode: activeReferralCode } : {}),
        });

        persistSession(response.data.accessToken);
        if (mode === "signup") {
          clearStoredReferralCode();
        }
        confirmationResultRef.current = null;
        router.push("/home");
        return;
      }

      const payload =
        {
          email,
          otp,
          ...(mode === "signup" && name.trim() ? { name: name.trim() } : {}),
          ...(mode === "signup" && activeReferralCode ? { referralCode: activeReferralCode } : {}),
        };

      const response =
        mode === "signup"
          ? await authApi.verifySignupOtp(payload)
          : await authApi.verifyLoginOtp(payload);

      persistSession(response.data.accessToken);
      if (mode === "signup") {
        clearStoredReferralCode();
      }
      router.push("/home");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to verify OTP");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleAuth() {
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      if (!isFirebaseClientConfigured()) {
        throw new Error(
          "Google OAuth is not configured in the frontend environment yet. Add the NEXT_PUBLIC_FIREBASE_* values first.",
        );
      }

      const credential = await signInWithPopup(
        getFirebaseAuth(),
        createGoogleProvider(),
      );
      const idToken = await credential.user.getIdToken();
      const response = await authApi.googleLogin({
        idToken,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(mode === "signup" && activeReferralCode ? { referralCode: activeReferralCode } : {}),
      });

      persistSession(response.data.accessToken);
      if (mode === "signup") {
        clearStoredReferralCode();
      }
      router.push("/home");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to continue with Google");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef8ef] px-4 py-6 text-green-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-4xl border border-green-100 bg-white shadow-[0_20px_60px_rgba(22,101,52,0.08)] lg:grid-cols-[0.92fr_1.08fr]">
          <section className="relative overflow-hidden bg-white p-8 sm:p-10 lg:p-12">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-600 text-lg font-semibold text-white">
                  N
                </div>
                <div>
                  <p className="text-base font-semibold text-green-950">Nofone</p>
                  <p className="text-sm text-green-700/75">Health companion</p>
                </div>
              </div>
              
            </div>

            <div className="mt-10 flex items-center gap-2 rounded-2xl bg-green-50 p-1">
              {(["signup", "login"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    "flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                    mode === item
                      ? "bg-white text-green-950 shadow-sm"
                      : "text-green-700 hover:bg-white/70",
                  )}
                >
                  {item === "signup" ? "Sign up" : "Login"}
                </button>
              ))}
            </div>

            <div className="mt-10">
              <p className="text-sm font-medium text-green-700">
                {mode === "signup" ? "Already a member?" : "New to Nofone?"}
                {" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                  className="text-green-950 underline decoration-green-300 underline-offset-4"
                >
                  {mode === "signup" ? "Login" : "Create account"}
                </button>
              </p>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-green-950 sm:text-5xl">
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </h1>
              <p className="mt-3 max-w-md text-base leading-7 text-green-900/70">
                {mode === "signup"
                  ? "Start your health journey with a clean, secure onboarding flow."
                  : "Access your progress, logs, and reports with the method you prefer."}
              </p>
              {mode === "signup" && activeReferralCode ? (
                <div className="mt-4 inline-flex items-center rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-900">
                  Referral applied: {activeReferralCode}
                </div>
              ) : null}
            </div>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={() => {
                  void handleGoogleAuth();
                }}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-green-200 bg-white px-4 py-3.5 text-sm font-medium text-green-950 transition-colors hover:bg-green-50"
              >
                <GoogleIcon />
                <span>
                  {isSubmitting
                    ? "Connecting..."
                    : mode === "signup"
                      ? "Sign up with Google"
                      : "Continue with Google"}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOtpMethod("email")}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                    otpMethod === "email"
                      ? "border-green-600 bg-green-50 text-green-950"
                      : "border-green-100 bg-white text-green-700 hover:border-green-300",
                  )}
                >
                  Continue with email
                </button>
                <button
                  type="button"
                  onClick={() => setOtpMethod("phone")}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                    otpMethod === "phone"
                      ? "border-green-600 bg-green-50 text-green-950"
                      : "border-green-100 bg-white text-green-700 hover:border-green-300",
                  )}
                >
                  Continue with phone
                </button>
              </div>
            </div>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-green-100" />
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-green-700/70">
                OTP Access
              </span>
              <div className="h-px flex-1 bg-green-100" />
            </div>

            {!otpRequested ? (
              <form className="space-y-5" onSubmit={handleRequestOtp}>
                {mode === "signup" ? (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Anubhav Mishra"
                      required
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="contact">
                    {otpMethod === "phone" ? "Phone number" : "Email address"}
                  </Label>
                  <Input
                    id="contact"
                    value={otpMethod === "phone" ? phoneNumber : email}
                    onChange={(event) =>
                      otpMethod === "phone"
                        ? setPhoneNumber(event.target.value)
                        : setEmail(event.target.value)
                    }
                    placeholder={
                      otpMethod === "phone" ? "+91 98765 43210" : "name@example.com"
                    }
                    type={otpMethod === "phone" ? "tel" : "email"}
                    required
                  />
                </div>

                <Button className="mt-2 w-full" disabled={isSubmitting} size="lg" type="submit">
                  {isSubmitting
                    ? "Sending code..."
                    : mode === "signup"
                      ? "Send verification code"
                      : "Send login code"}
                </Button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleVerifyOtp}>
                {mode === "signup" ? (
                  <div className="space-y-2">
                    <Label htmlFor="verify-name">Full name</Label>
                    <Input
                      id="verify-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Anubhav Mishra"
                      required
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="otp">One-time password</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    inputMode="numeric"
                    placeholder="Enter the code you received"
                    required
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
                    {isSubmitting ? "Verifying..." : "Verify and continue"}
                  </Button>
                  <Button
                    className="w-full"
                    disabled={isSubmitting}
                    onClick={() => {
                      setOtpRequested(false);
                      confirmationResultRef.current = null;
                    }}
                    size="lg"
                    type="button"
                    variant="outline"
                  >
                    Edit details
                  </Button>
                </div>
              </form>
            )}

            {statusMessage ? (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                {statusMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {!isFirebaseClientConfigured() ? (
              <Card className="mt-5 border-amber-200 bg-amber-50">
                <CardContent className="p-4 text-sm leading-6 text-amber-900">
                  Google and phone auth need Firebase web config in the frontend env before they can work.
                </CardContent>
              </Card>
            ) : null}
            <div ref={recaptchaContainerRef} id="firebase-phone-recaptcha" />
          </section>

          <section className="relative overflow-hidden bg-[#1f8a47] p-8 text-white sm:p-10 lg:p-12">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-bl-[48px] bg-[#2ca85b]" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-tr-[64px] bg-[#58b977]" />
            <div className="absolute right-12 top-24 h-28 w-28 rounded-[28px] bg-[#3ca563]" />

            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-6">
                <div className="max-w-sm">
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/70">
                    Health-first experience
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Built for a calmer, more professional health workflow.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-white/82">
                    Secure sign-in, guided onboarding, and structured daily tracking all in
                    one place.
                  </p>
                </div>
                <ArrowBadge />
              </div>

              <div className="mt-10 space-y-5">
                <div className="ml-auto w-full max-w-60 rounded-[28px] bg-white p-5 text-green-950">
                  <p className="text-sm text-green-700">Today</p>
                  <p className="mt-2 text-3xl font-semibold">78%</p>
                  <div className="mt-5 flex items-end gap-2">
                    <div className="h-8 w-2 rounded-full bg-green-200" />
                    <div className="h-14 w-2 rounded-full bg-green-500" />
                    <div className="h-10 w-2 rounded-full bg-green-300" />
                    <div className="h-16 w-2 rounded-full bg-green-700" />
                    <div className="h-12 w-2 rounded-full bg-green-400" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[28px] bg-white p-6 text-green-950">
                    <div className="h-1.5 w-16 rounded-full bg-green-400" />
                    <p className="mt-6 text-xl font-semibold">Your data, your routine</p>
                    <p className="mt-3 text-sm leading-6 text-green-900/70">
                      Progress logs, reports, and personal insights stay organized behind a
                      clean authentication flow that feels built for a product, not a demo.
                    </p>
                  </div>

                  <div className="rounded-[28px] bg-[#75c18a] p-5 text-white">
                    <p className="text-sm font-medium text-white/80">Weekly goals</p>
                    <div className="mt-5 space-y-3">
                      <div className="rounded-2xl bg-white/18 px-3 py-2 text-sm">
                        Water intake
                      </div>
                      <div className="rounded-2xl bg-white/18 px-3 py-2 text-sm">
                        Sleep balance
                      </div>
                      <div className="rounded-2xl bg-white/18 px-3 py-2 text-sm">
                        Weight trend
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
