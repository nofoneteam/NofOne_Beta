import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Nofone - The Science of the Individual",
  description: "Nofone is built on n=1 trial principles. Your body doesn't follow a template. Track food, exercise, and sleep tailored to your unique metabolism. Ad-free, subscription-free, community-powered.",
  keywords: "n=1 trial, individual health tracking, personalized nutrition, exercise tracking, health science, metabolism tracking, health app philosophy",
  openGraph: {
    title: "About Nofone - The Science of the Individual",
    description: "Nofone is built on n=1 trial principles. Your body doesn't follow a template. Track food, exercise, and sleep tailored to your unique metabolism.",
    type: "website",
    url: "https://nofone.app/about",
    images: [
      {
        url: "/logo.png",
        width: 192,
        height: 192,
        alt: "Nofone - Move. Nourish. Evolve.",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "About Nofone - The Science of the Individual",
    description: "Built on n=1 trial principles. Your body doesn't follow a template.",
  },
};

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
        "n=1 Trials"
      ]
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#f8f9fa] to-white px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#111111] mb-6">
            About Nofone
          </h1>
          <p className="text-xl text-[#6f7680] mb-8">
            The Science of the Individual
          </p>
          <p className="text-lg text-[#8e949c] leading-relaxed">
            In clinical research, a study with a single participant is called an n=1 trial. While the world of health tech tries to average you out into a demographic, we believe that the only statistical significance that matters is yours.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold text-[#111111] mb-6">
            Our Mission
          </h2>
          <p className="text-lg text-[#6f7680] leading-relaxed mb-8">
            Nofone was born from a simple realization: Your body doesn't follow a template. Your metabolism, your recovery rate, and your relationship with food and sleep are as unique as your fingerprint. To track your health using "average" benchmarks isn't just frustrating—it's inaccurate.
          </p>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section className="bg-[#f8f9fa] px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold text-[#111111] mb-12 text-center">
            Our Three Pillars
          </h2>
          <p className="text-lg text-[#6f7680] mb-12 text-center">
            We've built a streamlined, high-performance environment for you to:
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#ecece7]">
              <div className="w-12 h-12 bg-[#fff0dd] rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🍎</span>
              </div>
              <h3 className="text-xl font-semibold text-[#111111] mb-4">
                Nourish
              </h3>
              <p className="text-[#6f7680] leading-relaxed">
                Log food, sleep and track calories with precision, tailored to your specific metabolic needs.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#ecece7]">
              <div className="w-12 h-12 bg-[#e7f4ff] rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">💪</span>
              </div>
              <h3 className="text-xl font-semibold text-[#111111] mb-4">
                Move
              </h3>
              <p className="text-[#6f7680] leading-relaxed">
                Record exercise and activity to find the "rhythm" that actually fits your lifestyle.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#ecece7]">
              <div className="w-12 h-12 bg-[#ffe9ef] rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-semibold text-[#111111] mb-4">
                Evolve
              </h3>
              <p className="text-[#6f7680] leading-relaxed">
                Monitor your progress over time to see how your unique variables interact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Difference Section */}
      <section className="px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold text-[#111111] mb-12">
            A Different Kind of App
          </h2>
          <p className="text-lg text-[#6f7680] leading-relaxed mb-8">
            Most health platforms treat you as a product. They lock your data behind monthly subscriptions, clutter your experience with intrusive ads, and sell your habits to the highest bidder.
          </p>
          <p className="text-lg text-[#6f7680] leading-relaxed mb-12">
            Nofone is built differently:
          </p>
          <div className="space-y-4 mb-12">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#166534]">
                  <span className="text-white text-sm">✓</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-[#111111] mb-2">Ad-Free</h3>
                <p className="text-[#6f7680]">
                  No distractions. Your focus should be on your health, not a digital billboard.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#166534]">
                  <span className="text-white text-sm">✓</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-[#111111] mb-2">Subscription-Free</h3>
                <p className="text-[#6f7680]">
                  Wellness shouldn't be a recurring bill. Every feature is available to everyone, regardless of their bank account.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#166534]">
                  <span className="text-white text-sm">✓</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-[#111111] mb-2">Community-Powered</h3>
                <p className="text-[#6f7680]">
                  We are sustained entirely by the community we serve. We don't have venture capitalists to answer to; we only answer to you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#166534] to-[#2d8a5f] px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl font-semibold mb-6">
            Move. Nourish. Evolve.
          </h2>
          <p className="text-lg mb-8 opacity-90">
            On your own terms.
          </p>
          <p className="text-lg leading-relaxed">
            We provide you the tools and you track yourself. Together, we prove that the most important study in the world is the one happening inside you right now.
          </p>
        </div>
      </section>
    </main>
  );
}
