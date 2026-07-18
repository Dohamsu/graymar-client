"use client";
// [arch/77 P5a] 인증 폼 (이메일 자동완성 포함) — StartScreen.tsx에서 분리.
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";

type AuthTab = "login" | "register";

const SAVED_EMAIL_KEY = "graymar_saved_email";
const REMEMBER_EMAIL_KEY = "graymar_remember_email";

const EMAIL_DOMAINS = [
  "naver.com",
  "gmail.com",
  "kakao.com",
  "daum.net",
  "hanmail.net",
  "nate.com",
  "outlook.com",
  "icloud.com",
];

function EmailInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [showDomains, setShowDomains] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [filteredDomains, setFilteredDomains] = useState(EMAIL_DOMAINS);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const updateSuggestions = useCallback((email: string) => {
    const atIdx = email.indexOf("@");
    if (atIdx === -1 || atIdx === 0) {
      setShowDomains(false);
      return;
    }
    const typed = email.slice(atIdx + 1);
    if (EMAIL_DOMAINS.includes(typed)) {
      setShowDomains(false);
      return;
    }
    const filtered = typed
      ? EMAIL_DOMAINS.filter((d) => d.startsWith(typed.toLowerCase()))
      : EMAIL_DOMAINS;
    setFilteredDomains(filtered);
    setActiveIdx(0);
    setShowDomains(filtered.length > 0);
  }, []);

  const selectDomain = useCallback(
    (domain: string) => {
      const local = value.split("@")[0];
      onChange(`${local}@${domain}`);
      setShowDomains(false);
    },
    [value, onChange],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    updateSuggestions(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDomains) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % filteredDomains.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => (prev - 1 + filteredDomains.length) % filteredDomains.length);
    } else if (e.key === "Enter" && filteredDomains.length > 0) {
      e.preventDefault();
      selectDomain(filteredDomains[activeIdx]);
    } else if (e.key === "Escape") {
      setShowDomains(false);
    } else if (e.key === "Tab" && filteredDomains.length > 0) {
      e.preventDefault();
      selectDomain(filteredDomains[activeIdx]);
    }
  };

  useEffect(() => {
    if (!showDomains || !listRef.current) return;
    const active = listRef.current.children[activeIdx] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, showDomains]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDomains(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id="auth-email"
        name="email"
        type="text"
        inputMode="email"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        required
        autoFocus
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => updateSuggestions(value)}
        placeholder="email@example.com"
        className="h-11 w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
      />
      {showDomains && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-40 overflow-y-auto rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] py-1 shadow-lg shadow-black/40"
        >
          {filteredDomains.map((domain, idx) => {
            const local = value.split("@")[0];
            return (
              <li
                key={domain}
                role="option"
                aria-selected={idx === activeIdx}
                onMouseDown={(e) => { e.preventDefault(); selectDomain(domain); }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`flex cursor-pointer items-center px-3 py-2 text-sm transition-colors ${
                  idx === activeIdx
                    ? "bg-[rgba(201,169,98,0.15)] text-[var(--gold)]"
                    : "text-[var(--text-secondary)] hover:bg-[rgba(201,169,98,0.08)]"
                }`}
              >
                <span className="text-[var(--text-muted)]">{local}@</span>
                <span className="font-medium">{domain}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    const remember = localStorage.getItem(REMEMBER_EMAIL_KEY) === "true";
    const saved = localStorage.getItem(SAVED_EMAIL_KEY);
    return remember && saved ? saved : "";
  });
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [rememberEmail, setRememberEmail] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(REMEMBER_EMAIL_KEY) === "true";
  });

  const authLogin = useAuthStore((s) => s.login);
  const authRegister = useAuthStore((s) => s.register);
  const authLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const handleTabChange = (newTab: AuthTab) => {
    setTab(newTab);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rememberEmail) {
      localStorage.setItem(SAVED_EMAIL_KEY, email);
      localStorage.setItem(REMEMBER_EMAIL_KEY, "true");
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }

    if (tab === "login") {
      await authLogin(email, password);
    } else {
      await authRegister(email, password, nickname || undefined);
    }
    const { token } = useAuthStore.getState();
    if (token) {
      onSuccess();
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex border-b border-[var(--border-primary)]">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTabChange(t)}
            className={`flex-1 pb-3 text-center font-display text-sm tracking-wider transition-colors ${
              tab === t
                ? "border-b-2 border-[var(--gold)] text-[var(--gold)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {t === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} autoComplete="on" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-xs text-[var(--text-muted)]">이메일</label>
          <EmailInput value={email} onChange={setEmail} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-password" className="text-xs text-[var(--text-muted)]">비밀번호</label>
          <input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            required
            minLength={tab === "register" ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tab === "register" ? "8자 이상" : "비밀번호"}
            className="h-11 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
          />
        </div>

        {tab === "register" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-nickname" className="text-xs text-[var(--text-muted)]">
              닉네임 <span className="text-[var(--text-muted)]">(선택)</span>
            </label>
            <input
              id="auth-nickname"
              name="nickname"
              type="text"
              autoComplete="username"
              maxLength={30}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="게임에서 사용할 이름"
              className="h-11 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
            />
          </div>
        )}

        {tab === "login" && (
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="checkbox-gold h-4 w-4 cursor-pointer"
            />
            <span className="text-sm text-[var(--text-muted)]">이메일 저장</span>
          </label>
        )}

        {authError && <p className="text-sm text-[var(--hp-red)]">{authError}</p>}

        <button
          type="submit"
          disabled={authLoading}
          className="mt-2 flex h-12 items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-base tracking-[3px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] disabled:opacity-50"
        >
          {authLoading ? "처리 중..." : tab === "login" ? "로그인" : "가입하기"}
        </button>
      </form>
    </div>
  );
}

