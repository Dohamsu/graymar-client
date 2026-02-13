import {
  Sword,
  Eye,
  Footprints,
  BedSingle,
  MessageCircle,
  Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  sword: Sword,
  eye: Eye,
  footprints: Footprints,
  "bed-single": BedSingle,
  "message-circle": MessageCircle,
  package: Package,
};

interface QuickActionButtonProps {
  label: string;
  icon: string;
  color: string;
  onClick?: () => void;
}

export function QuickActionButton({ label, icon, color, onClick }: QuickActionButtonProps) {
  const IconComponent = ICON_MAP[icon];

  return (
    <button
      onClick={onClick}
      className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--border-primary)] px-4 transition-opacity hover:opacity-80"
      style={{ border: `1px solid ${color}40` }}
    >
      {IconComponent && <IconComponent size={14} style={{ color }} />}
      <span className="text-xs font-medium" style={{ color }}>
        {label}
      </span>
    </button>
  );
}
