import { TERRITORY_BY_ID } from "../engine/data.ts";
import type { TurnOptions } from "../engine/legal.ts";
import { useGame } from "../state/game.tsx";

export type Mode = "move" | "conquer" | "travel" | "war" | null;

interface Props {
  opts: TurnOptions;
  mode: Mode;
  setMode: (m: Mode) => void;
}

const MODES: { key: Exclude<Mode, null>; label: string; hint: string }[] = [
  { key: "move", label: "Move", hint: "Adjacent territory you own" },
  { key: "conquer", label: "Conquer", hint: "Adjacent neutral (question)" },
  { key: "travel", label: "Travel", hint: "Own territory elsewhere (question)" },
  { key: "war", label: "War", hint: "Adjacent enemy (5 questions)" },
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
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m) => {
          const disabled = counts[m.key] === 0;
          return (
            <button
              key={m.key}
              disabled={disabled}
              onClick={() => setMode(mode === m.key ? null : m.key)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                mode === m.key
                  ? "border-yellow-400 bg-yellow-400/20"
                  : "border-stone-600 bg-stone-800 hover:bg-stone-700"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span className="font-display text-base">{m.label}</span>
              <span className="ml-1 text-xs text-stone-400">({counts[m.key]})</span>
              <span className="block text-[11px] text-stone-400">{m.hint}</span>
            </button>
          );
        })}
        <button
          disabled={!opts.canFortify}
          onClick={() => act({ type: "FORTIFY" })}
          className="rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-left text-sm hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="font-display text-base">Fortify</span>
          <span className="block text-[11px] text-stone-400">Fort your current territory</span>
        </button>
      </div>

      {mode && (
        <div className="rounded-lg border border-stone-700 bg-stone-800/40 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-stone-400">
            Choose a target for {mode}
          </p>
          {active.length === 0 ? (
            <p className="text-sm text-stone-400">No valid targets.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {active.map((id) => (
                <button
                  key={id}
                  onClick={() => dispatchTarget(id)}
                  className="font-display rounded bg-stone-700 px-3 py-1 text-base hover:bg-stone-600"
                >
                  {TERRITORY_BY_ID[id].name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs text-stone-500">
        Or click a highlighted territory on the map.
      </p>
      <p className="text-center text-[11px] text-stone-500">
        Acting: {state.teamNames[team]}
      </p>
    </div>
  );
}
