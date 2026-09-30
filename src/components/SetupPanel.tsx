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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(["A", "B"] as const).map((team) => (
          <label key={team} className="text-xs text-stone-400">
            Team {team} name
            <input
              className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm text-stone-100"
              value={state.teamNames[team]}
              onChange={(e) => setTeamNames({ ...state.teamNames, [team]: e.target.value })}
            />
          </label>
        ))}
      </div>

      {state.phase === "SETUP_DRAW" && (
        <>
          <div className="rounded-lg border border-stone-700 bg-stone-800/40 p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-stone-400">
              Wheel draw {drawIndex + 1} of {state.config.drawCount}
            </p>
            <p className="mt-1 text-sm">
              Next:{" "}
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
              className="mt-2 text-xs text-stone-400 underline hover:text-stone-200 disabled:opacity-40"
            >
              Re-spin last result (undo)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["A", "B"] as const).map((team) => (
              <div key={team} className="rounded border border-stone-700 p-2">
                <p className={`text-xs font-semibold ${team === "A" ? "text-blue-300" : "text-rose-300"}`}>
                  {state.teamNames[team]}
                </p>
                <ul className="mt-1 space-y-1 text-sm">
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
        <div key={team} className="rounded border border-stone-700 p-2">
          <p className={`text-xs font-semibold ${team === "A" ? "text-blue-300" : "text-rose-300"}`}>
            {state.teamNames[team]} — choose marker territory
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ownedBy(state, team).map((id) => (
              <button
                key={id}
                onClick={() => act({ type: "PLACE_MARKER", team, territoryId: id })}
                className={`font-display rounded px-2 py-1 text-base ${
                  state.markers[team] === id
                    ? "bg-yellow-400 text-stone-900"
                    : "bg-stone-700 text-stone-100 hover:bg-stone-600"
                }`}
              >
                {NAME_BY_ID[id]}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-400">First turn:</span>
        {(["A", "B"] as const).map((team) => (
          <button
            key={team}
            onClick={() => act({ type: "SET_FIRST_TEAM", team })}
            className={`font-display rounded px-2 py-1 text-base ${
              state.config.firstTeam === team
                ? "bg-amber-500 text-stone-900"
                : "bg-stone-700 hover:bg-stone-600"
            }`}
          >
            {state.teamNames[team]}
          </button>
        ))}
      </div>

      <label className="block text-xs text-stone-400">
        Question cap
        <input
          type="number"
          min={1}
          value={state.config.questionCap}
          onChange={(e) => setConfig({ questionCap: Number(e.target.value) })}
          className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm"
        />
      </label>

      <button
        onClick={() => act({ type: "START_GAME" })}
        disabled={!bothPlaced}
        className="font-display w-full rounded-lg bg-emerald-500 px-4 py-3 text-lg text-stone-900 hover:bg-emerald-400 disabled:opacity-50"
      >
        Start the battle
      </button>
    </div>
  );
}
