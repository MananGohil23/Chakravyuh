import { TERRITORY_BY_ID } from "../engine/data.ts";
import { useGame } from "../state/game.tsx";

export function QuestionPanel() {
  const { state, act } = useGame();
  const pq = state.pendingQuestion;
  if (!pq) return null;
  const target = TERRITORY_BY_ID[pq.to]?.name ?? pq.to;
  const teamName = state.teamNames[pq.team];

  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
      <p className="text-xs uppercase tracking-widest text-amber-300">
        {pq.kind === "conquer" ? "Conquer attempt" : "Travel attempt"}
      </p>
      <p className="mt-1 text-lg font-semibold">
        {teamName} → {target}
      </p>
      <p className="mt-1 text-xs text-stone-300">
        Ask a Mahabharata question aloud, then record the result.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => act({ type: "RESOLVE_QUESTION", correct: true })}
          className="rounded-lg bg-emerald-500 px-4 py-3 text-lg font-bold text-stone-900 hover:bg-emerald-400"
        >
          Correct
        </button>
        <button
          onClick={() => act({ type: "RESOLVE_QUESTION", correct: false })}
          className="rounded-lg bg-rose-600 px-4 py-3 text-lg font-bold text-white hover:bg-rose-500"
        >
          Wrong
        </button>
      </div>
    </div>
  );
}
