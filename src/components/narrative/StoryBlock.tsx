import type { StoryMessage } from "@/types/game";

const LABEL_COLORS: Record<string, string> = {
  SYSTEM: "var(--gold)",
  NARRATOR: "var(--success-green)",
  PLAYER: "var(--text-secondary)",
  CHOICE: "var(--info-blue)",
};

const LABEL_TEXT: Record<string, string> = {
  SYSTEM: "SYSTEM",
  NARRATOR: "NARRATOR",
  PLAYER: "YOUR ACTION",
  CHOICE: "WHAT DO YOU DO?",
};

interface StoryBlockProps {
  message: StoryMessage;
  onChoiceSelect?: (choiceId: string) => void;
}

export function StoryBlock({ message, onChoiceSelect }: StoryBlockProps) {
  const labelColor = LABEL_COLORS[message.type] ?? "var(--text-muted)";
  const isPlayer = message.type === "PLAYER";
  const borderColor = isPlayer ? "var(--gold)" : "var(--border-primary)";
  const bgColor = message.type === "CHOICE" || isPlayer ? "var(--bg-secondary)" : "var(--bg-card)";

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-none p-4"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${isPlayer ? `${borderColor}30` : borderColor}`,
      }}
    >
      <span
        className="text-[10px] font-semibold tracking-[1px]"
        style={{ color: labelColor }}
      >
        {LABEL_TEXT[message.type]}
      </span>

      {message.type === "CHOICE" && message.choices ? (
        <div className="flex flex-col gap-2">
          {message.choices.map((choice, i) => (
            <button
              key={choice.id}
              onClick={() => onChoiceSelect?.(choice.id)}
              className="cursor-pointer text-left font-display text-sm leading-[1.5] transition-colors hover:text-[var(--gold)]"
              style={{
                color: choice.disabled
                  ? "var(--text-secondary)"
                  : "var(--text-primary)",
              }}
            >
              {i + 1}. {choice.label}
            </button>
          ))}
        </div>
      ) : (
        <p
          className={`font-display text-[15px] leading-[1.6] whitespace-pre-line ${
            isPlayer ? "italic" : ""
          }`}
          style={{
            color: isPlayer ? "var(--text-secondary)" : "var(--text-primary)",
          }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
