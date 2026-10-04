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
      return `${t[a.team]} banner → ${name(a.territoryId)}`;
    case "SET_FIRST_TEAM":
      return `First move: ${t[a.team]}`;
    case "START_GAME":
      return "War horn sounded — battle begins";
    case "MOVE":
      return `March → ${name(a.to)}`;
    case "DECLARE_CONQUER":
      return `Conquer ${name(a.to)} (question)`;
    case "DECLARE_TRAVEL":
      return `Travel → ${name(a.to)} (question)`;
    case "RESOLVE_QUESTION":
      return a.correct ? "Verdict: correct" : "Verdict: wrong";
    case "FORTIFY":
      return "Fort raised";
    case "DECLARE_WAR":
      return `Declare war on ${name(a.target)}`;
    case "WAR_ANSWER":
      return `War Q: A ${a.aCorrect ? "✔" : "✘"} / B ${a.bCorrect ? "✔" : "✘"}`;
    case "CHOOSE_RELOCATION":
      return `Banner rallied → ${name(a.territoryId)}`;
    case "SUDDEN_DEATH_ANSWER":
      return `Sudden death: A ${a.aCorrect ? "✔" : "✘"} / B ${a.bCorrect ? "✔" : "✘"}`;
    default:
      return "Action";
  }
}

export function EventLog() {
  const { state, undo, reset } = useGame();
  const entries = state.log.map((a, i) => ({ a, i }));

  return (
    <div className="panel flex min-h-0 flex-1 flex-col p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="gilded font-display text-sm uppercase tracking-[0.2em]">
          📜 Chronicle
        </h2>
        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={state.log.length === 0}
            className="btn btn-iron px-2 py-1 text-sm"
          >
            ↩ Undo
          </button>
          <button
            onClick={() => {
              if (window.confirm("Reset the entire battle? This cannot be undone.")) reset();
            }}
            className="btn btn-blood px-2 py-1 text-sm"
          >
            Reset
          </button>
        </div>
      </div>
      <ol className="panel-inset min-h-0 flex-1 space-y-1 overflow-y-auto p-2 text-xs">
        {entries.length === 0 && (
          <li className="etched opacity-60">The chronicle is empty.</li>
        )}
        {entries.map(({ a, i }) => (
          <li key={i} className="etched flex gap-2">
            <span className="w-6 shrink-0 text-right tabular-nums text-bronze">
              {i + 1}
            </span>
            <span>{describe(a, state)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
