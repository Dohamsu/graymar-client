import { memo } from "react";
import Image from "next/image";
import { User } from "lucide-react";

interface DialogueBubbleProps {
  /** Dialogue text (may include surrounding quotes) */
  text: string;
  /** NPC display name */
  npcName: string;
  /** NPC portrait image URL (CORE NPCs only) */
  npcImageUrl?: string;
  /** Whether to hide the portrait + name header (for consecutive same-NPC lines) */
  compact?: boolean;
}

function DialogueBubbleInner({ text, npcName, npcImageUrl, compact }: DialogueBubbleProps) {
  return (
    <div className="my-3 flex items-start gap-2 md:gap-3">
      {/* Portrait column */}
      {!compact ? (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full md:h-10 md:w-10"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          {npcImageUrl ? (
            <Image
              src={npcImageUrl}
              alt={npcName}
              width={40}
              height={40}
              sizes="40px"
              className="h-full w-full object-cover"
            />
          ) : (
            <User
              size={18}
              style={{ color: "var(--text-muted)" }}
              aria-label={npcName}
            />
          )}
        </div>
      ) : (
        /* Spacer to align with portrait above */
        <div className="w-8 shrink-0 md:w-10" />
      )}

      {/* Bubble column */}
      <div className="min-w-0 flex-1">
        {!compact && (
          <span
            className="mb-1 block text-[10px] font-semibold md:text-xs"
            style={{ color: npcImageUrl ? "var(--gold)" : "var(--text-secondary)" }}
          >
            {npcName}
          </span>
        )}
        <div
          className="dialogue-bubble rounded-xl p-3"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-primary)",
          }}
        >
          <span
            className="font-dialogue leading-[1.75]"
            style={{ color: "var(--gold)" }}
          >
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}

export const DialogueBubble = memo(DialogueBubbleInner);
