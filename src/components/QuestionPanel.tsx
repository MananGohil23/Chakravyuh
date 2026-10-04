import { TERRITORY_BY_ID } from "../engine/data.ts";
import { useGame } from "../state/game.tsx";

export function QuestionPanel() {
  const { state, act } = useGame();
  const pq = state.pendingQuestion;
  if (!pq) return null;
  const target = TERRITORY_BY_ID[pq.to]?.name ?? pq.to;
  const teamName = state.teamNames[pq.team];

  return (
    <div className="panel p-4">
      <p className="gilded font-display text-sm uppercase tracking-[0.25em]">
        {pq.kind === "conquer" ? "⚔ Conquer Attempt" : "🐎 Travel Attempt"}
      </p>
      <p className="etched mt-1 text-lg">
        <b className="text-gold-bright">{teamName}</b> → {target}
      </p>
      <p className="etched mt-1 text-xs opacity-80">
        Pose a Mahabharata question aloud, then record the verdict.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => act({ type: "RESOLVE_QUESTION", correct: true })}
          className="btn btn-emerald px-4 py-3 text-lg"
        >
          ✔ Correct
        </button>
        <button
          onClick={() => act({ type: "RESOLVE_QUESTION", correct: false })}
          className="btn btn-blood px-4 py-3 text-lg"
        >
          ✘ Wrong
        </button>
      </div>
    </div>
  );
}
