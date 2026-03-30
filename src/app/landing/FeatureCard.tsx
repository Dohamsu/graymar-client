"use client";

import type { ReactNode } from "react";

export function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <article
      className="group p-6 sm:p-8 border transition-all duration-500 relative overflow-hidden hover:border-[rgba(233,193,118,0.4)]"
      style={{
        backgroundColor: "#1c1b1b",
        borderColor: "rgba(78, 70, 57, 0.15)",
      }}
    >
      <div className="mb-4 sm:mb-6" style={{ color: "#ffdea5" }}>
        {icon}
      </div>
      <h3
        className="text-lg sm:text-xl mb-3 sm:mb-4"
        style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#ffdea5" }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "#d1c5b4" }}>
        {desc}
      </p>
      <div
        className="h-px w-0 group-hover:w-full transition-all duration-700"
        style={{ backgroundColor: "rgba(255, 222, 165, 0.3)" }}
        aria-hidden="true"
      />
    </article>
  );
}
