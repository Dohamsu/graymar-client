import {
  Sword,
  Eye,
  Footprints,
  BedSingle,
  MessageCircle,
  Package,
  Shield,
  DoorOpen,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  sword: Sword,
  eye: Eye,
  footprints: Footprints,
  "bed-single": BedSingle,
  "message-circle": MessageCircle,
  package: Package,
  shield: Shield,
  "door-open": DoorOpen,
  search: Search,
};

interface QuickActionButtonProps {
  label: string;
  icon: string;
  color: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function QuickActionButton({ label, icon, color, onClick, disabled }: QuickActionButtonProps) {
  const IconComponent = ICON_MAP[icon];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--border-primary)] px-4 transition-opacity hover:opacity-80 disabled:opacity-50"
      style={{ border: `1px solid ${color}40` }}
    >
      {IconComponent && <IconComponent size={14} style={{ color }} />}
      <span className="text-xs font-medium" style={{ color }}>
        {label}
      </span>
    </button>
  );
}
