"use client";

import { useEffect, useState } from "react";
import { X, Check, Loader2, AlertCircle } from "lucide-react";
import {
  getLlmSettings,
  updateLlmSettings,
  type LlmSettingsResponse,
} from "@/lib/api-client";

interface LlmSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  mock: "Mock (테스트용)",
  openai: "OpenAI",
  claude: "Claude",
  gemini: "Gemini",
};

const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o4-mini"],
  claude: ["claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
  gemini: ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash"],
};

export function LlmSettingsModal({ open, onClose }: LlmSettingsModalProps) {
  const [settings, setSettings] = useState<LlmSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Draft state for editing
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState(0.8);
  const [maxTokens, setMaxTokens] = useState(1024);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    getLlmSettings()
      .then((data) => {
        setSettings(data);
        setProvider(data.provider);
        setModel(getModelForProvider(data, data.provider));
        setTemperature(data.temperature);
        setMaxTokens(data.maxTokens);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [open]);

  function getModelForProvider(
    s: LlmSettingsResponse,
    p: string,
  ): string {
    if (p === "openai") return s.openaiModel;
    if (p === "claude") return s.claudeModel;
    if (p === "gemini") return s.geminiModel;
    return "";
  }

  function handleProviderChange(newProvider: string) {
    setProvider(newProvider);
    if (settings) {
      setModel(getModelForProvider(settings, newProvider));
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const patch: Record<string, unknown> = {
        provider,
        temperature,
        maxTokens,
      };

      // Set model for the selected provider
      if (provider === "openai") patch.openaiModel = model;
      else if (provider === "claude") patch.claudeModel = model;
      else if (provider === "gemini") patch.geminiModel = model;

      const updated = await updateLlmSettings(patch);
      setSettings(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const currentModels = MODEL_OPTIONS[provider] ?? [];
  const isAvailable = (p: string) =>
    settings?.availableProviders.includes(p) ?? false;

  // Check if anything changed
  const hasChanges =
    settings &&
    (provider !== settings.provider ||
      model !== getModelForProvider(settings, provider) ||
      temperature !== settings.temperature ||
      maxTokens !== settings.maxTokens);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-5 py-4">
          <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
            AI 모델 설정
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2
                size={24}
                className="animate-spin text-[var(--text-muted)]"
              />
            </div>
          ) : (
            <>
              {/* Provider */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">
                  공급자
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["mock", "openai", "claude", "gemini"].map(
                    (p) => {
                      const available = p === "mock" || isAvailable(p);
                      const selected = provider === p;
                      return (
                        <button
                          key={p}
                          disabled={!available}
                          onClick={() => handleProviderChange(p)}
                          className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                            selected
                              ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                              : available
                                ? "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                                : "cursor-not-allowed border-[var(--border-primary)] text-[var(--text-muted)] opacity-40"
                          }`}
                        >
                          {PROVIDER_LABELS[p]}
                          {!available && p !== "mock" && (
                            <span className="ml-1 text-[10px]">(키 없음)</span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Model (only for non-mock) */}
              {provider !== "mock" && currentModels.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">
                    모델
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--gold)]"
                  >
                    {currentModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Temperature */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Temperature
                  </label>
                  <span className="text-xs font-mono text-[var(--gold)]">
                    {temperature.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-[var(--gold)]"
                />
                <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>정확한</span>
                  <span>창의적</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    최대 토큰
                  </label>
                  <span className="text-xs font-mono text-[var(--gold)]">
                    {maxTokens}
                  </span>
                </div>
                <input
                  type="range"
                  min={256}
                  max={4096}
                  step={128}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full accent-[var(--gold)]"
                />
                <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>짧게</span>
                  <span>길게</span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-[var(--hp-red)]/10 px-3 py-2 text-xs text-[var(--hp-red)]">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-center gap-2 rounded-md bg-[var(--success-green)]/10 px-3 py-2 text-xs text-[var(--success-green)]">
                  <Check size={14} />
                  설정이 저장되었습니다.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-primary)] px-5 py-3">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              닫기
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
                hasChanges
                  ? "bg-[var(--gold)] text-[var(--bg-primary)] hover:bg-[var(--gold)]/90"
                  : "cursor-not-allowed bg-[var(--border-primary)] text-[var(--text-muted)]"
              }`}
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              저장
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
