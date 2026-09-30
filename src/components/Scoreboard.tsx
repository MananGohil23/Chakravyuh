import { countTerritories, neutralTerritories } from "../engine/core.ts";
import { useGame } from "../state/game.tsx";
import type { Team } from "../engine/types.ts";

const TEAM_STYLE: Record<Team, string> = {
  A: "border-blue-500/60 bg-blue-500/10 text-blue-200",
  B: "border-rose-500/60 bg-rose-500/10 text-rose-200",
};

function TeamCard({ team }: { team: Team }) {
  const { state } = useGame();
  const counts = countTerritories(state);
  const active = state.currentTeam === team && state.phase !== "GAME_OVER";
  return (
    <div
      className={`rounded-lg border p-3 ${TEAM_STYLE[team]} ${
        active ? "ring-2 ring-yellow-400" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="truncate font-semibold">{state.teamNames[team]}</span>
        <span className="text-2xl font-bold tabular-nums">{counts[team]}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs opacity-80">
        <span>{active ? "▶ playing" : "waiting"}</span>
        <span>·</span>
        <span>{state.warUsed[team] ? "War used" : "War available"}</span>
        <span>·</span>
        <span>{state.turnsTaken[team]} turns</span>
      </div>
    </div>
  );
}

export function Scoreboard() {
  const { state } = useGame();
  return (
    <div className="space-y-2">
      <TeamCard team="A" />
      <TeamCard team="B" />
      <div className="flex justify-between rounded-lg border border-stone-700 bg-stone-800/40 px-3 py-2 text-xs text-stone-300">
        <span>Neutral: {neutralTerritories(state).length}</span>
        <span>
          Questions: {state.questionsAsked} / {state.config.questionCap}
        </span>
      </div>
    </div>
  );
}
