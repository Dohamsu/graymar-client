"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { href: "#world", label: "World" },
  { href: "#features", label: "Features" },
  { href: "#story", label: "Lore" },
  { href: "#how-to-play", label: "Guide" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 transition-colors"
        style={{ color: "#ffdea5" }}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 w-full border-b py-4 px-8 flex flex-col gap-4"
          style={{
            backgroundColor: "rgba(10, 10, 10, 0.95)",
            backdropFilter: "blur(20px)",
            borderColor: "rgba(78, 70, 57, 0.15)",
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-lg py-2 transition-colors hover:opacity-80"
              style={{
                fontFamily: "'Noto Serif KR', 'Noto Serif', serif",
                color: "#9a8f80",
              }}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/"
            className="mt-2 px-6 py-3 font-bold text-center"
            style={{
              backgroundColor: "#e9c176",
              color: "#6a4e0c",
              fontFamily: "'Noto Serif KR', 'Noto Serif', serif",
            }}
          >
            Play Now
          </Link>
        </div>
      )}
    </div>
  );
}
