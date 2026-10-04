import { TERRITORIES, TERRITORY_IDS } from "../engine/data.ts";
import { useGame } from "../state/game.tsx";
import { ownedBy } from "../engine/core.ts";
import { SpinWheel } from "./SpinWheel.tsx";
import type { Team } from "../engine/types.ts";

const NAME_BY_ID = Object.fromEntries(TERRITORIES.map((t) => [t.id, t.name]));

function teamForDrawIndex(index: number): Team {
  return index % 2 === 0 ? "A" : "B";
}

export function SetupPanel() {
  const { state, act, undo, setTeamNames } = useGame();

  const remaining = TERRITORY_IDS.filter((id) => !state.drawn.includes(id));
  const drawIndex = state.drawn.length;
  const nextTeam = teamForDrawIndex(drawIndex);

  return (
    <div className="overflow-y-auto flex-1 space-y-4">
      <div className="panel grid grid-cols-2 gap-2 p-3">
        {(["A", "B"] as const).map((team) => (
          <label key={team} className="etched text-[11px] uppercase tracking-wider">
            House {team} name
            <input
              className="panel-inset mt-1 w-full px-2 py-1 text-sm text-ink outline-none"
              value={state.teamNames[team]}
              onChange={(e) => setTeamNames({ ...state.teamNames, [team]: e.target.value })}
            />
          </label>
        ))}
      </div>

      {state.phase === "SETUP_DRAW" && (
        <>
          <div className="panel p-4 text-center">
            <p className="etched text-[11px] uppercase tracking-[0.25em]">
              Wheel draw {drawIndex + 1} of {state.config.drawCount}
            </p>
            <p className="gilded font-display mt-1 text-lg">
              Fate favours{" "}
              <span className={nextTeam === "A" ? "text-blue-300" : "text-rose-300"}>
                {state.teamNames[nextTeam]}
              </span>
            </p>
            <div className="mt-3">
              <SpinWheel
                items={remaining.map((id) => ({ id, name: NAME_BY_ID[id] }))}
                onResult={(id) => act({ type: "DRAW_TERRITORY", territoryId: id })}
              />
            </div>
            <button
              onClick={undo}
              disabled={state.drawn.length === 0}
              className="btn btn-iron mt-3 px-3 py-1 text-xs"
            >
              ↩ Re-spin last draw
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["A", "B"] as const).map((team) => (
              <div key={team} className="panel-inset p-2">
                <p
                  className={`font-display text-sm ${
                    team === "A" ? "text-blue-300" : "text-rose-300"
                  }`}
                >
                  {state.teamNames[team]}
                </p>
                <ul className="etched mt-1 space-y-1 text-sm">
                  {state.drawn
                    .map((id, i) => ({ id, team: teamForDrawIndex(i) }))
                    .filter((d) => d.team === team)
                    .map((d) => (
                      <li key={d.id}>{NAME_BY_ID[d.id]}</li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {state.phase === "SETUP_MARKER" && <MarkerSetup />}
    </div>
  );
}

function MarkerSetup() {
  const { state, act, setConfig } = useGame();
  const bothPlaced = Boolean(state.markers.A && state.markers.B);

  return (
    <div className="space-y-3">
      {(["A", "B"] as const).map((team) => (
        <div key={team} className="panel p-3">
          <p
            className={`font-display text-sm ${
              team === "A" ? "text-blue-300" : "text-rose-300"
            }`}
          >
            {state.teamNames[team]} — plant your banner
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ownedBy(state, team).map((id) => (
              <button
                key={id}
                onClick={() => act({ type: "PLACE_MARKER", team, territoryId: id })}
                className={`btn px-2 py-1 text-base ${
                  state.markers[team] === id ? "btn-gold" : "btn-iron"
                }`}
              >
                {NAME_BY_ID[id]}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="panel flex items-center gap-2 p-3">
        <span className="etched text-[11px] uppercase tracking-wider">First move:</span>
        {(["A", "B"] as const).map((team) => (
          <button
            key={team}
            onClick={() => act({ type: "SET_FIRST_TEAM", team })}
            className={`btn px-2 py-1 text-base ${
              state.config.firstTeam === team ? "btn-gold" : "btn-iron"
            }`}
          >
            {state.teamNames[team]}
          </button>
        ))}
      </div>

      <label className="panel block p-3 text-[11px] uppercase tracking-wider">
        <span className="etched">Question cap</span>
        <input
          type="number"
          min={1}
          value={state.config.questionCap}
          onChange={(e) => setConfig({ questionCap: Number(e.target.value) })}
          className="panel-inset mt-1 w-full px-2 py-1 text-sm text-ink outline-none"
        />
      </label>

      <button
        onClick={() => act({ type: "START_GAME" })}
        disabled={!bothPlaced}
        className="btn btn-emerald w-full px-4 py-3 text-lg"
      >
        ⚔ Sound the War Horn
      </button>
    </div>
  );
}
