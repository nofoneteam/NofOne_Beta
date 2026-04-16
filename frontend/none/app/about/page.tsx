import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Salad,
  Dumbbell,
  TrendingUp,
  BanIcon,
  CreditCard,
  Heart,
  ArrowLeft,
  FlaskConical,
  Fingerprint,
  Users,
  ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Nofone — The Science of the Individual",
  description:
    "Nofone is built on n=1 trial principles. Your body doesn't follow a template. Track food, exercise, and sleep tailored to your unique metabolism. Ad-free, subscription-free, community-powered.",
  keywords:
    "n=1 trial, individual health tracking, personalized nutrition, exercise tracking, health science, metabolism tracking, health app philosophy",
  openGraph: {
    title: "About Nofone — The Science of the Individual",
    description:
      "Nofone is built on n=1 trial principles. Your body doesn't follow a template. Track food, exercise, and sleep tailored to your unique metabolism.",
    type: "website",
    url: "https://nofone.app/about",
    images: [
      {
        url: "/logo.png",
        width: 192,
        height: 192,
        alt: "Nofone — Move. Nourish. Evolve.",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "About Nofone — The Science of the Individual",
    description: "Built on n=1 trial principles. Your body doesn't follow a template.",
  },
};

const pillars = [
  {
    number: "01",
    title: "Nourish",
    icon: <Salad className="h-6 w-6 text-[#2a7d4f]" />,
    bg: "bg-[#edf7f1]",
    border: "border-[#c9e8d6]",
    accent: "#2a7d4f",
    description:
      "Log food, sleep and track calories with precision, tailored to your specific metabolic needs.",
  },
  {
    number: "02",
    title: "Move",
    icon: <Dumbbell className="h-6 w-6 text-[#1e6fbe]" />,
    bg: "bg-[#eaf2fc]",
    border: "border-[#bcd8f5]",
    accent: "#1e6fbe",
    description:
      'Record exercise and activity to find the "rhythm" that actually fits your lifestyle.',
  },
  {
    number: "03",
    title: "Evolve",
    icon: <TrendingUp className="h-6 w-6 text-[#8542c4]" />,
    bg: "bg-[#f3ecfb]",
    border: "border-[#d9c3f0]",
    accent: "#8542c4",
    description:
      "Monitor your progress over time to see how your unique variables interact.",
  },
];

const differences = [
  {
    icon: <BanIcon className="h-5 w-5 text-[#166534]" />,
    title: "Ad-Free",
    description:
      "No distractions. Your focus should be on your health, not a digital billboard.",
  },
  {
    icon: <CreditCard className="h-5 w-5 text-[#166534]" />,
    title: "Subscription-Free",
    description:
      "Wellness shouldn't be a recurring bill. Every feature is available to everyone, regardless of their bank account.",
  },
  {
    icon: <Heart className="h-5 w-5 text-[#166534]" />,
    title: "Donation / Self Fund-Powered",
    description:
      "We are sustained entirely by the community we serve. We don't have venture capitalists to answer to; we only answer to you.",
  },
];

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    mainEntity: {
      "@type": "Organization",
      name: "Nofone",
      description: "Health tracking platform built on n=1 trial principles",
      url: "https://nofone.app",
      logo: "https://nofone.app/logo.png",
      sameAs: [],
      foundingDate: "2024",
      knowsAbout: [
        "Health Tracking",
        "Nutrition Science",
        "Exercise Physiology",
        "Individual Health Analytics",
        "n=1 Trials",
      ],
    },
  };

  return (
    <main className="min-h-screen bg-[#f8f9f5] text-[#111111]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Top nav bar ─────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 border-b border-[#e8e8e2] bg-white/80 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/home"
            className="flex items-center gap-2 text-[13px] font-medium text-[#6f7680] transition-colors hover:text-[#111111]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Nofone Logo" width={28} height={28} className="rounded-lg" />
            <span className="text-[14px] font-semibold text-[#111111]">Nofone</span>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-8 sm:pt-28">
        {/* Background wave SVG */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1200 600"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4edde" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#b8dfc9" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M0,300 C200,200 400,450 600,300 C800,150 1000,400 1200,300 L1200,600 L0,600 Z"
            fill="url(#waveGrad)"
          />
          <path
            d="M0,400 C300,310 500,500 700,380 C900,260 1100,450 1200,370 L1200,600 L0,600 Z"
            fill="#e8f5ee"
            fillOpacity="0.4"
          />
          {/* Decorative circles */}
          <circle cx="80" cy="80" r="60" fill="#166534" fillOpacity="0.04" />
          <circle cx="1140" cy="120" r="90" fill="#166534" fillOpacity="0.05" />
          <circle cx="600" cy="30" r="40" fill="#2a7d4f" fillOpacity="0.06" />
        </svg>

        <div className="relative mx-auto max-w-3xl text-center">
          {/* n=1 badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c9e8d6] bg-[#edf7f1] px-4 py-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-[#2a7d4f]" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2a7d4f]">
              n=1 Trial Philosophy
            </span>
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#111111] sm:text-5xl lg:text-6xl">
            About{" "}
            <span className="bg-gradient-to-r from-[#166534] to-[#2a7d4f] bg-clip-text text-transparent">
              N-of-One
            </span>
          </h1>

          <p className="mt-4 text-xl font-medium text-[#3d7a57] sm:text-2xl">
            The Science of the Individual
          </p>

          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-[#6f7680]">
            In clinical research, a study with a single participant is called an{" "}
            <strong className="text-[#111111]">n=1 trial</strong>. While the world of health tech
            tries to average you out into a demographic, we believe that the only statistical
            significance that matters is{" "}
            <strong className="text-[#166534]">yours</strong>.
          </p>
        </div>
      </section>

      {/* ── Mission ─────────────────────────────────────────── */}
      <section className="px-4 pb-20 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-[#e0ece5] bg-white shadow-[0_8px_32px_rgba(22,101,52,0.06)]">
            <div className="grid lg:grid-cols-[1fr_380px]">
              <div className="p-8 sm:p-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf7f1]">
                    <Fingerprint className="h-5 w-5 text-[#166534]" />
                  </div>
                  <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#2a7d4f]">
                    Our Origin
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-[#111111] sm:text-3xl">
                  Your body doesn't follow a template.
                </h2>
                <p className="mt-5 text-[16px] leading-8 text-[#6a7280]">
                  N-of-One was born from a simple realization: your metabolism, your recovery rate,
                  and your relationship with food and sleep are as unique as your fingerprint. To
                  track your health using "average" benchmarks isn't just frustrating —
                  it's <em className="font-semibold text-[#111111] not-italic">inaccurate</em>.
                </p>
                <p className="mt-4 text-[16px] leading-8 text-[#6a7280]">
                  The only experiment that truly matters is the one you run on yourself.
                </p>
              </div>

              {/* Visual panel */}
              <div className="relative hidden lg:block bg-gradient-to-br from-[#166534] to-[#2a7d4f] p-8">
                {/* Abstract DNA-like graphic */}
                <svg
                  className="absolute inset-0 h-full w-full opacity-10"
                  viewBox="0 0 380 340"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M40 0 C40 0 340 80 340 170 C340 260 40 340 40 340" stroke="white" strokeWidth="2" fill="none"/>
                  <path d="M340 0 C340 0 40 80 40 170 C40 260 340 340 340 340" stroke="white" strokeWidth="2" fill="none"/>
                  {[40, 80, 120, 160, 200, 240, 280, 320].map((y, i) => (
                    <line key={i} x1="40" y1={y} x2="340" y2={y} stroke="white" strokeWidth="1" strokeDasharray="4 4"/>
                  ))}
                </svg>
                <div className="relative flex h-full flex-col justify-center gap-5">
                  {["Unique Metabolism", "Individual Recovery", "Personal Fingerprint"].map(
                    (label) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm"
                      >
                        <div className="h-2 w-2 rounded-full bg-white" />
                        <span className="text-[14px] font-medium text-white">{label}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three Pillars ───────────────────────────────────── */}
      <section className="px-4 pb-20 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#2a7d4f]">
              What We've Built
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[#111111] sm:text-4xl">
              Our Three Pillars
            </h2>
            <p className="mt-3 text-[16px] text-[#6f7680]">
              A streamlined, high-performance environment built around you.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className={`relative overflow-hidden rounded-3xl border ${pillar.border} ${pillar.bg} p-7`}
              >
                {/* Big number watermark */}
                <span
                  className="pointer-events-none absolute -right-3 -top-4 text-[88px] font-black leading-none opacity-[0.07]"
                  style={{ color: pillar.accent }}
                >
                  {pillar.number}
                </span>

                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm"
                  style={{ boxShadow: `0 2px 12px ${pillar.accent}22` }}
                >
                  {pillar.icon}
                </div>

                <h3 className="mt-5 text-[20px] font-bold text-[#111111]">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-[#6a7280]">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Different Kind of App ───────────────────────────── */}
      <section className="px-4 pb-20 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-[#e0ece5] bg-white shadow-[0_8px_32px_rgba(22,101,52,0.05)]">
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf7f1]">
                  <Users className="h-5 w-5 text-[#166534]" />
                </div>
                <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#2a7d4f]">
                  Our Promise
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[#111111] sm:text-3xl">
                A Different Kind of App
              </h2>
              <p className="mt-4 text-[16px] leading-8 text-[#6a7280]">
                Most health platforms treat you as a product. They lock your data behind monthly
                subscriptions, clutter your experience with intrusive ads, and sell your habits to
                the highest bidder.
              </p>
              <p className="mt-2 text-[16px] font-semibold text-[#111111]">
                N-of-One is built differently:
              </p>

              <div className="mt-8 space-y-5">
                {differences.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-4 rounded-2xl border border-[#ebf4ef] bg-[#f5fbf7] px-5 py-4"
                  >
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#edf7f1]">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#111111]">{item.title}</h3>
                      <p className="mt-1 text-[14px] leading-6 text-[#6a7280]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA / Closing ───────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-24 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#166534] to-[#2a7d4f] px-8 py-14 text-center sm:px-14">
            {/* Decorative SVG arcs */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full opacity-10"
              viewBox="0 0 800 360"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="0" cy="0" r="200" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="800" cy="360" r="240" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M0 180 Q200 80 400 180 Q600 280 800 180" stroke="white" strokeWidth="1" fill="none"/>
            </svg>

            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 backdrop-blur-sm">
                <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/90">
                  Move · Nourish · Evolve
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                On your own terms.
              </h2>

              <p className="mx-auto mt-5 max-w-xl text-[16px] leading-8 text-white/80">
                We provide you the tools and you track yourself. Together, we prove that the most
                important study in the world is the one happening{" "}
                <strong className="text-white">inside you right now.</strong>
              </p>

              <Link
                href="/home"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[#166534] transition-opacity hover:opacity-90"
              >
                Start tracking
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
