import { countTerritories, neutralTerritories } from "../engine/core.ts";
import { useGame } from "../state/game.tsx";
import type { Team } from "../engine/types.ts";

const BANNER: Record<Team, string> = {
  A: "linear-gradient(180deg, #1e3a8a, #0f1f4d)",
  B: "linear-gradient(180deg, #7f1d1d, #3f0a0a)",
};

const CREST: Record<Team, string> = { A: "🔱", B: "🔥" };

function TeamCard({ team }: { team: Team }) {
  const { state } = useGame();
  const counts = countTerritories(state);
  const active = state.currentTeam === team && state.phase !== "GAME_OVER";
  return (
    <div
      className="panel relative overflow-hidden p-3"
      style={active ? { boxShadow: "0 0 0 2px #f0c94a, 0 10px 26px rgba(0,0,0,.55)" } : undefined}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{ background: BANNER[team] }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <span className="gilded font-display truncate text-xl">
          <span className="mr-1">{CREST[team]}</span>
          {state.teamNames[team]}
        </span>
        <span className="gilded font-display text-3xl tabular-nums">{counts[team]}</span>
      </div>
      <div className="etched relative mt-1 flex items-center gap-2 text-[11px] uppercase tracking-wider">
        <span>{active ? "◀ holding the banner" : "awaiting orders"}</span>
        <span>·</span>
        <span>{state.warUsed[team] ? "War spent" : "War ready"}</span>
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
      <div className="panel-inset flex justify-between px-3 py-2 text-[11px] uppercase tracking-wider">
        <span className="etched">Neutral lands: {neutralTerritories(state).length}</span>
        <span className="etched">
          Questions: {state.questionsAsked} / {state.config.questionCap}
        </span>
      </div>
    </div>
  );
}
