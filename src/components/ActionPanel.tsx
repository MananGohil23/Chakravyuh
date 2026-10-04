import { TERRITORY_BY_ID } from "../engine/data.ts";
import type { TurnOptions } from "../engine/legal.ts";
import { useGame } from "../state/game.tsx";

export type Mode = "move" | "conquer" | "travel" | "war" | null;

interface Props {
  opts: TurnOptions;
  mode: Mode;
  setMode: (m: Mode) => void;
}

const MODES: {
  key: Exclude<Mode, null>;
  label: string;
  hint: string;
  icon: string;
  accent: string;
}[] = [
  { key: "move", label: "Move", hint: "March to an adjacent holding", icon: "🏳️", accent: "btn-iron" },
  { key: "conquer", label: "Conquer", hint: "Storm an adjacent neutral land", icon: "⚔️", accent: "btn-gold" },
  { key: "travel", label: "Travel", hint: "Ride to a distant holding", icon: "🐎", accent: "btn-iron" },
  { key: "war", label: "War", hint: "Declare war on an adjacent foe", icon: "🔥", accent: "btn-blood" },
];

function targetsFor(opts: TurnOptions, mode: Mode): string[] {
  switch (mode) {
    case "move":
      return opts.moves;
    case "conquer":
      return opts.conquers;
    case "travel":
      return opts.travels;
    case "war":
      return opts.wars;
    default:
      return [];
  }
}

export function ActionPanel({ opts, mode, setMode }: Props) {
  const { state, act } = useGame();
  const team = state.currentTeam;
  const active = targetsFor(opts, mode);

  const counts: Record<string, number> = {
    move: opts.moves.length,
    conquer: opts.conquers.length,
    travel: opts.travels.length,
    war: opts.wars.length,
  };

  function dispatchTarget(id: string) {
    if (mode === "move") act({ type: "MOVE", to: id });
    else if (mode === "conquer") act({ type: "DECLARE_CONQUER", to: id });
    else if (mode === "travel") act({ type: "DECLARE_TRAVEL", to: id });
    else if (mode === "war") act({ type: "DECLARE_WAR", target: id });
    setMode(null);
  }

  return (
    <div className="panel space-y-3 p-3">
      <p className="gilded font-display text-center text-xs uppercase tracking-[0.3em]">
        Orders of {state.teamNames[team]}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m) => {
          const disabled = counts[m.key] === 0;
          const selected = mode === m.key;
          return (
            <button
              key={m.key}
              disabled={disabled}
              onClick={() => setMode(selected ? null : m.key)}
              className={`btn ${m.accent} px-3 py-2 text-left`}
              style={selected ? { boxShadow: "0 0 0 2px #f0c94a" } : undefined}
            >
              <span className="text-base">
                {m.icon} {m.label}
              </span>
              <span className="ml-1 text-xs opacity-70">({counts[m.key]})</span>
              <span className="block text-[11px] opacity-70">{m.hint}</span>
            </button>
          );
        })}
      </div>

      {mode && (
        <div className="panel-inset p-3">
          <p className="etched mb-2 text-[11px] uppercase tracking-widest">
            Select target — {mode}
          </p>
          {active.length === 0 ? (
            <p className="etched text-sm">No valid targets.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {active.map((id) => (
                <button
                  key={id}
                  onClick={() => dispatchTarget(id)}
                  className="btn btn-iron px-3 py-1 text-base"
                >
                  {TERRITORY_BY_ID[id].name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="etched text-center text-[11px] opacity-70">
        …or strike a highlighted land on the map.
      </p>
    </div>
  );
}
