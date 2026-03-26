import Image from "next/image";
import { User, HardHat, Shirt, Sword, Gem } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CharacterInfo } from "@/types/game";
import { StatTooltip } from "@/components/ui/StatTooltip";
import { STAT_ACTION_HINTS } from "@/data/stat-descriptions";

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
        <div className="relative h-[120px] w-[100px] overflow-hidden rounded border border-[var(--gold)] bg-[var(--bg-card)]">
          {character.portrait ? (
            <Image
              src={character.portrait}
              alt={character.name}
              fill
              sizes="100px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User size={40} className="text-[var(--text-muted)]" />
            </div>
          )}
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
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4">
          {character.stats.map((stat) => (
            <StatTooltip key={stat.label} hint={STAT_ACTION_HINTS[stat.label] ?? ""}>
              <div
                className="flex cursor-help flex-col items-center gap-1 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] p-1.5 sm:p-3"
              >
                <span className="text-[10px] font-semibold" style={{ color: stat.color }}>
                  {stat.label}
                </span>
                <span className="font-display text-2xl font-medium text-[var(--text-primary)]">
                  {stat.value}
                </span>
              </div>
            </StatTooltip>
          ))}
        </div>
      </div>

      {/* Derived Combat Stats */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-muted)]">
          전투 수치
        </span>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {(() => {
            const s = character.stats.reduce((acc, st) => ({ ...acc, [st.label.toLowerCase()]: st.value }), {} as Record<string, number>);
            const derived = [
              { label: 'ATK', value: s.str ?? 0, hint: '근접 데미지', color: 'var(--hp-red)' },
              { label: 'DEF', value: s.con ?? 0, hint: '피해 감소', color: 'var(--info-blue)' },
              { label: 'ACC', value: s.dex ?? 0, hint: '명중률', color: 'var(--success-green)' },
              { label: 'EVA', value: Math.floor((s.dex ?? 0) * 0.6), hint: '회피율', color: 'var(--gold)' },
            ];
            return derived.map((d) => (
              <div key={d.label} title={d.hint} className="flex cursor-help items-center gap-1.5 rounded border border-[var(--border-primary)]/50 bg-[var(--bg-card)]/50 px-2 py-1.5">
                <span className="text-[9px] font-semibold" style={{ color: d.color }}>{d.label}</span>
                <span className="text-sm font-medium text-[var(--text-secondary)]">{d.value}</span>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Equipment */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-secondary)]">
          장비
        </span>
        {character.equipment.length === 0 ? (
          <span className="text-[11px] text-[var(--text-muted)]">
            장착된 장비 없음
          </span>
        ) : (
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
                  <span
                    className="text-center text-[11px] font-medium"
                    style={{ color: item.rarity ? item.color : 'var(--text-primary)' }}
                  >
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
        )}
      </div>
    </div>
  );
}
