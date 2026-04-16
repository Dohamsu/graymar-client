import { memo, useState, useCallback } from "react";
import Image from "next/image";
import { User, X } from "lucide-react";

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

// ---------------------------------------------------------------------------
// Portrait Lightbox (확대 보기)
// ---------------------------------------------------------------------------

function PortraitLightbox({
  imageUrl,
  npcName,
  onClose,
}: {
  imageUrl: string;
  npcName: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-label={`${npcName} 초상화`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-[fadeIn_0.2s_ease-out_both]"
        style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      />

      {/* Portrait */}
      <div
        className="relative z-10 animate-[portraitZoomIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative h-64 w-64 overflow-hidden rounded-2xl shadow-2xl md:h-80 md:w-80"
          style={{ border: "2px solid var(--gold)" }}
        >
          <Image
            src={imageUrl}
            alt={npcName}
            fill
            sizes="320px"
            className="object-cover"
            priority
          />
        </div>

        {/* NPC name */}
        <p
          className="mt-3 text-center font-display text-lg font-semibold tracking-wider"
          style={{ color: "var(--gold)" }}
        >
          {npcName}
        </p>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-primary)",
            color: "var(--text-muted)",
          }}
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DialogueBubble
// ---------------------------------------------------------------------------

function DialogueBubbleInner({ text, npcName, npcImageUrl, compact }: DialogueBubbleProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handlePortraitClick = useCallback(() => {
    if (npcImageUrl && !imgError) setShowLightbox(true);
  }, [npcImageUrl, imgError]);

  return (
    <>
      <div className="my-3 flex items-start gap-2 md:gap-3" data-dialogue-bubble>
        {/* Portrait column */}
        {!compact ? (
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full md:h-10 md:w-10 ${npcImageUrl ? "cursor-pointer transition-transform hover:scale-110 active:scale-95" : ""}`}
            style={{ backgroundColor: "var(--bg-secondary)" }}
            onClick={handlePortraitClick}
            role={npcImageUrl ? "button" : undefined}
            aria-label={npcImageUrl ? `${npcName} 초상화 보기` : undefined}
          >
            {npcImageUrl && !imgError ? (
              <Image
                src={npcImageUrl}
                alt={npcName}
                width={40}
                height={40}
                sizes="40px"
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
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

      {/* Lightbox overlay */}
      {showLightbox && npcImageUrl && (
        <PortraitLightbox
          imageUrl={npcImageUrl}
          npcName={npcName}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
}

export const DialogueBubble = memo(DialogueBubbleInner);
