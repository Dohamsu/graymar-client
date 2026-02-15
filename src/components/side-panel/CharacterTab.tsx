import { User, HardHat, Shirt, Sword, Gem } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CharacterInfo } from "@/types/game";

const EQUIP_ICON_MAP: Record<string, LucideIcon> = {
  "hard-hat": HardHat,
  shirt: Shirt,
  sword: Sword,
  gem: Gem,
};

interface CharacterTabProps {
  character: CharacterInfo;
}

export function CharacterTab({ character }: CharacterTabProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Portrait Section */}
      <div className="flex gap-4">
        <div className="flex h-[120px] w-[100px] items-center justify-center rounded border border-[var(--gold)] bg-[var(--bg-card)]">
          <User size={40} className="text-[var(--text-muted)]" />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="font-display text-xl font-medium text-[var(--text-primary)]">
            {character.name}
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">
            {character.class} &middot; 레벨 {character.level}
          </span>
          <div className="mt-auto flex flex-col gap-1">
            <span className="text-[10px] font-medium text-[var(--text-muted)]">
              경험치: {character.exp.toLocaleString()} / {character.maxExp.toLocaleString()}
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-primary)]">
              <div
                className="h-full rounded-full bg-[var(--gold)]"
                style={{ width: `${Math.round((character.exp / character.maxExp) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-secondary)]">
          능력치
        </span>
        <div className="grid grid-cols-4 gap-2">
          {character.stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] p-3"
            >
              <span className="text-[10px] font-semibold" style={{ color: stat.color }}>
                {stat.label}
              </span>
              <span className="font-display text-2xl font-medium text-[var(--text-primary)]">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-secondary)]">
          장비
        </span>
        <div className="grid grid-cols-2 gap-2">
          {character.equipment.map((item) => {
            const IconComponent = EQUIP_ICON_MAP[item.icon] ?? Gem;
            return (
              <div
                key={item.slot}
                className="flex flex-col items-center gap-2 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] p-3"
                style={{
                  borderColor: item.rarity ? `${item.color}50` : undefined,
                }}
              >
                <IconComponent size={24} style={{ color: item.color }} />
                <span className="text-[11px] font-medium text-[var(--text-primary)]">
                  {item.name}
                </span>
                <span className="text-[9px] text-[var(--text-muted)]">
                  {item.rarity ? `${item.rarity} \u00b7 ` : ""}
                  {item.slot}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
