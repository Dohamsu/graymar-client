"use client";

/**
 * 로비 배경(프리셋) 선택 — arch/84 후속 (2026-08-07).
 *
 * 배경: 파티 로비는 멤버 프리셋을 "가장 최근 솔로 런"에서만 가져왔다. 솔로 이력이
 * 없는 유저끼리 모이면 리더 presetId=null 로 createRun 이 거부되어 던전 시작
 * 자체가 불가했다 (실사용 차단). 여기서 직접 고르면 서버가 로비 선택을 최근 런보다
 * 우선한다.
 */

import { useEffect, useState } from "react";
import { UserRound, Check, ChevronDown } from "lucide-react";
import { getCreationBundle, type CreationBundle } from "@/lib/api-client";
import type { LobbyLoadout } from "@/types/party";

interface Props {
  /** 현재 확정된 프리셋 (로비 선택 또는 최근 런 유추) */
  currentPresetId: string | null;
  /** 로비에서 직접 고른 값인지 — false 면 "최근 여정에서 가져옴" 안내 */
  fromLobby: boolean;
  currentGender: string | null;
  scenarioId: string;
  disabled?: boolean;
  onSelect: (loadout: LobbyLoadout) => void;
}

export function LobbyLoadoutPicker({
  currentPresetId,
  fromLobby,
  currentGender,
  scenarioId,
  disabled = false,
  onSelect,
}: Props) {
  const [bundle, setBundle] = useState<CreationBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(!currentPresetId);
  const [gender, setGender] = useState<"male" | "female">(
    currentGender === "female" ? "female" : "male",
  );

  useEffect(() => {
    let alive = true;
    getCreationBundle(scenarioId)
      .then((b) => {
        if (alive) setBundle(b);
      })
      .catch(() => {
        if (alive) setLoadError("배경 목록을 불러오지 못했습니다.");
      });
    return () => {
      alive = false;
    };
  }, [scenarioId]);

  const current = bundle?.presets.find((p) => p.presetId === currentPresetId);

  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-2 text-left disabled:opacity-50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <UserRound
            size={16}
            className="shrink-0 text-[var(--text-muted)]"
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-[var(--text-primary)]">
              {current?.name ?? currentPresetId ?? "배경을 선택하세요"}
            </span>
            <span className="block truncate text-xs text-[var(--text-muted)]">
              {currentPresetId
                ? fromLobby
                  ? (current?.subtitle ?? "")
                  : "최근 여정에서 가져옴 — 바꾸려면 눌러주세요"
                : "던전을 시작하려면 배경이 필요합니다"}
            </span>
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="mt-3 border-t border-[var(--border-primary)] pt-3">
          {loadError && (
            <p className="text-xs text-[var(--color-danger,#c0392b)]">
              {loadError}
            </p>
          )}
          {!bundle && !loadError && (
            <p className="text-xs text-[var(--text-muted)]">불러오는 중…</p>
          )}

          {bundle && (
            <>
              <div className="mb-3 flex gap-2">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    disabled={disabled}
                    className={`flex-1 rounded border px-2 py-1.5 text-xs transition-colors disabled:opacity-50 ${
                      gender === g
                        ? "border-[var(--gold)] text-[var(--text-primary)]"
                        : "border-[var(--border-primary)] text-[var(--text-muted)]"
                    }`}
                  >
                    {g === "male" ? "남성" : "여성"}
                  </button>
                ))}
              </div>

              <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto overscroll-contain">
                {bundle.presets.map((p) => {
                  const selected = p.presetId === currentPresetId;
                  return (
                    <li key={p.presetId}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          onSelect({
                            presetId: p.presetId,
                            gender,
                            scenarioId,
                          });
                          setOpen(false);
                        }}
                        className={`flex w-full items-start gap-2 rounded border px-2.5 py-2 text-left transition-colors disabled:opacity-50 ${
                          selected
                            ? "border-[var(--gold)] bg-[var(--bg-primary)]"
                            : "border-[var(--border-primary)] hover:border-[var(--text-muted)]"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-[var(--text-primary)]">
                            {p.name}
                          </span>
                          <span className="block truncate text-xs text-[var(--text-muted)]">
                            {p.subtitle}
                          </span>
                        </span>
                        {selected && (
                          <Check
                            size={14}
                            className="mt-0.5 shrink-0 text-[var(--gold)]"
                            aria-hidden
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
