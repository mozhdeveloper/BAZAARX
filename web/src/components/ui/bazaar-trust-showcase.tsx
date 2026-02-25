"use client";

import { useEffect, useState } from "react";
import { Shield, Award, Package, CheckCircle } from "lucide-react";
import CountUp from "react-countup";

/** Hook: respects user's motion preferences */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/** Utility: parse a metric like "98%", "3.8x", "$1,200+", "1.5M", "€23.4k" */
function parseMetricValue(raw: string) {
  const value = (raw ?? "").toString().trim();
  const m = value.match(
    /^([^\d\-+]*?)\s*([\-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*([^\d\s]*)$/
  );
  if (!m) {
    return { prefix: "", end: 0, suffix: value, decimals: 0 };
  }
  const [, prefix, num, suffix] = m;
  const normalized = num.replace(/,/g, "");
  const end = parseFloat(normalized);
  const decimals = (normalized.split(".")[1]?.length ?? 0);
  return {
    prefix: prefix ?? "",
    end: isNaN(end) ? 0 : end,
    suffix: suffix ?? "",
    decimals,
  };
}

/** Small component: one animated metric */
function MetricStat({
  value,
  label,
  sub,
  duration = 1.6,
}: {
  value: string;
  label: string;
  sub?: string;
  duration?: number;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const { prefix, end, suffix, decimals } = parseMetricValue(value);

  return (
    <div className="flex flex-col gap-2 text-left p-6">
      <p
        className="text-2xl font-medium text-gray-900 dark:text-white sm:text-4xl"
        aria-label={`${label} ${value}`}
      >
        {prefix}
        {reduceMotion ? (
          <span>
            {end.toLocaleString(undefined, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}
          </span>
        ) : (
          <CountUp
            end={end}
            decimals={decimals}
            duration={duration}
            separator=","
            enableScrollSpy
            scrollSpyOnce
          />
        )}
        {suffix}
      </p>
      <p className="font-medium text-gray-900 dark:text-white text-left">
        {label}
      </p>
      {sub ? (
        <p className="text-gray-600 dark:text-gray-400 text-left">{sub}</p>
      ) : null}
    </div>
  );
}

export default function BazaarTrustShowcase() {
  const trustCases = [
    {
      id: 1,
      quote:
        "BazaarX made selling my handcrafted products so easy. The verification process was quick, and I felt confident knowing my products are quality-tested. Sales increased by 40% in the first month!",
      name: "Maria Santos",
      role: "Verified Seller - Filipino Handicrafts",
      image:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=400&fit=crop",
      icon: Shield,
      metrics: [
        { value: "100%", label: "Seller Verification", sub: "All sellers are verified" },
        { value: "95%", label: "Customer Trust Rating", sub: "Based on verified reviews" },
      ],
    },
    {
      id: 2,
      quote:
        "I only shop on BazaarX because I know every product is quality-tested. The branded products are genuine, and I love supporting verified local sellers. Shopping here feels safe and reliable.",
      name: "Juan Dela Cruz",
      role: "Verified Buyer - Electronics Enthusiast",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop",
      icon: Award,
      metrics: [
        { value: "100%", label: "Product Authenticity", sub: "All branded items verified" },
        { value: "98%", label: "Quality Satisfaction", sub: "Customer satisfaction rate" },
      ],
    },
    {
      id: 3,
      quote:
        "From listing to shipping, BazaarX handles everything seamlessly. The quality testing process gives buyers confidence, and I can focus on what I do best - creating amazing products!",
      name: "Isabella Reyes",
      role: "Verified Seller - Beauty & Skincare",
      image:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=400&fit=crop",
      icon: Package,
      metrics: [
        { value: "3x", label: "Faster Processing", sub: "Easy listing & shipping" },
        { value: "90%", label: "Repeat Customers", sub: "Quality brings loyalty" },
      ],
    },
  ];

  return (
    <section
      className="py-16 sm:py-24 md:py-32 bg-gradient-to-b from-white to-gray-50"
      aria-labelledby="trust-showcase-heading"
    >
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 text-center max-w-3xl mx-auto mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--brand-primary)]" />
            <span className="text-[var(--brand-primary)] font-semibold text-base sm:text-lg">
              Trusted by Thousands
            </span>
          </div>
          <h2
            id="trust-showcase-heading"
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)]"
          >
            Quality You Can Trust, Every Time
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] mt-4">
            BazaarX prioritizes your safety and satisfaction. Every seller is verified,
            every product is quality-tested by our expert team, and every branded item is
            guaranteed authentic. Shop with complete confidence.
          </p>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto mb-12 sm:mb-20">
          {[
            { icon: Shield, text: "Verified Sellers Only" },
            { icon: Award, text: "Authentic Branded Products" },
            { icon: Package, text: "Quality Tested by Experts" },
            { icon: CheckCircle, text: "Easy & Secure Process" },
          ].map((badge, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                <badge.icon className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--brand-primary)]" />
              </div>
              <p className="text-sm font-medium text-center text-[var(--text-primary)]">
                {badge.text}
              </p>
            </div>
          ))}
        </div>

        {/* Cases */}
        <div className="mt-12 sm:mt-20 flex flex-col gap-12 sm:gap-20">
          {trustCases.map((study, idx) => {
            const reversed = idx % 2 === 1;
            return (
              <div
                key={study.id}
                className="grid gap-8 lg:gap-12 lg:grid-cols-3 xl:gap-24 items-center border-b border-gray-200 dark:border-gray-800 pb-8 sm:pb-12 last:border-b-0"
              >
                {/* Left: Image + Quote */}
                <div
                  className={[
                    "flex flex-col sm:flex-row gap-8 sm:gap-10 lg:col-span-2 lg:border-r lg:pr-12 xl:pr-16 text-left",
                    reversed
                      ? "lg:order-2 lg:border-r-0 lg:border-l border-gray-200 dark:border-gray-800 lg:pl-12 xl:pl-16 lg:pr-0"
                      : "border-gray-200 dark:border-gray-800",
                  ].join(" ")}
                >
                  <img
                    src={study.image}
                    alt={`${study.name} portrait`}
                    className="aspect-[3/4] h-auto w-full sm:max-w-60 rounded-2xl object-cover ring-1 ring-gray-200 hover:scale-105 transition-all duration-300 shadow-lg mx-auto sm:mx-0"
                    loading="lazy"
                    decoding="async"
                  />
                  <figure className="flex flex-col justify-between gap-6 sm:gap-8 text-left">
                    <blockquote className="text-lg sm:text-xl text-foreground leading-relaxed text-left">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                          <study.icon className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--brand-primary)]" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)]">
                          {study.id === 1 && "Verified Seller Success"}
                          {study.id === 2 && "Safe & Trusted Shopping"}
                          {study.id === 3 && "Easy Quality Process"}
                        </h3>
                      </div>
                      <p className="text-[var(--text-secondary)] leading-relaxed text-base sm:text-lg">
                        {study.quote}
                      </p>
                    </blockquote>
                    <figcaption className="flex items-center gap-4 sm:gap-6 mt-2 sm:mt-4 text-left">
                      <div className="flex flex-col gap-1">
                        <span className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                          {study.name}
                        </span>
                        <span className="text-sm text-[var(--text-secondary)]">
                          {study.role}
                        </span>
                      </div>
                    </figcaption>
                  </figure>
                </div>

                {/* Right: Metrics */}
                <div
                  className={[
                    "grid grid-cols-1 gap-6 sm:gap-10 self-center text-left",
                    reversed ? "lg:order-1" : "",
                  ].join(" ")}
                >
                  {study.metrics.map((metric, i) => (
                    <MetricStat
                      key={`${study.id}-${i}`}
                      value={metric.value}
                      label={metric.label}
                      sub={metric.sub}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
