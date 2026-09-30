import { TERRITORY_BY_ID } from "../engine/data.ts";
import type { Action, GameState } from "../engine/types.ts";
import { useGame } from "../state/game.tsx";

function name(id: string): string {
  return TERRITORY_BY_ID[id]?.name ?? id;
}

function describe(a: Action, state: GameState): string {
  const t = state.teamNames;
  switch (a.type) {
    case "DRAW_TERRITORY":
      return `Wheel draw: ${name(a.territoryId)}`;
    case "PLACE_MARKER":
      return `${t[a.team]} marker → ${name(a.territoryId)}`;
    case "SET_FIRST_TEAM":
      return `First turn: ${t[a.team]}`;
    case "START_GAME":
      return "Game started";
    case "MOVE":
      return `Move → ${name(a.to)}`;
    case "DECLARE_CONQUER":
      return `Conquer ${name(a.to)} (question)`;
    case "DECLARE_TRAVEL":
      return `Travel → ${name(a.to)} (question)`;
    case "RESOLVE_QUESTION":
      return a.correct ? "Answer: correct" : "Answer: wrong";
    case "FORTIFY":
      return "Fortify current territory";
    case "DECLARE_WAR":
      return `Declare War on ${name(a.target)}`;
    case "WAR_ANSWER":
      return `War Q: A ${a.aCorrect ? "✓" : "✗"} / B ${a.bCorrect ? "✓" : "✗"}`;
    case "CHOOSE_WAR_BONUS":
      return `+1 bonus: ${name(a.territoryId)}`;
    case "CHOOSE_RELOCATION":
      return `Relocate marker → ${name(a.territoryId)}`;
    case "SUDDEN_DEATH_ANSWER":
      return `Sudden death: A ${a.aCorrect ? "✓" : "✗"} / B ${a.bCorrect ? "✓" : "✗"}`;
    default:
      return "Action";
  }
}

export function EventLog() {
  const { state, undo, reset } = useGame();
  const entries = state.log.map((a, i) => ({ a, i }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-stone-400">Event log</h2>
        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={state.log.length === 0}
            className="rounded bg-stone-700 px-2 py-1 text-xs hover:bg-stone-600 disabled:opacity-40"
          >
            ↩ Undo
          </button>
          <button
            onClick={() => {
              if (window.confirm("Reset the entire game? This cannot be undone.")) reset();
            }}
            className="rounded bg-rose-800 px-2 py-1 text-xs hover:bg-rose-700"
          >
            Reset
          </button>
        </div>
      </div>
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded border border-stone-800 bg-stone-900/60 p-2 text-xs">
        {entries.length === 0 && <li className="text-stone-500">No actions yet.</li>}
        {entries.map(({ a, i }) => (
          <li key={i} className="flex gap-2 text-stone-300">
            <span className="w-6 shrink-0 text-right tabular-nums text-stone-500">
              {i + 1}
            </span>
            <span>{describe(a, state)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
