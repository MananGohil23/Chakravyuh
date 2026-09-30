import { useState } from "react";
import { TERRITORY_BY_ID } from "../engine/data.ts";
import { useGame } from "../state/game.tsx";

export function WarPanel() {
  const { state, act } = useGame();
  const { war, pendingRelocate } = state;
  const [aCorrect, setACorrect] = useState(false);
  const [bCorrect, setBCorrect] = useState(false);

  if (pendingRelocate) {
    return (
      <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 p-4">
        <p className="text-xs uppercase tracking-widest text-rose-300">
          Marker displaced
        </p>
        <p className="mt-1 text-sm text-stone-200">
          {state.teamNames[pendingRelocate.team]}'s marker was captured. Relocate to:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {pendingRelocate.options.map((id) => (
            <button
              key={id}
              onClick={() => act({ type: "CHOOSE_RELOCATION", territoryId: id })}
              className="font-display rounded bg-stone-700 px-3 py-1 text-base hover:bg-stone-600"
            >
              {TERRITORY_BY_ID[id].name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!war) return null;

  if (war.bonusOptions) {
    return (
      <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4">
        <p className="text-xs uppercase tracking-widest text-emerald-300">
          War won — choose the +1 neutral territory
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {war.bonusOptions.map((id) => (
            <button
              key={id}
              onClick={() => act({ type: "CHOOSE_WAR_BONUS", territoryId: id })}
              className="font-display rounded bg-stone-700 px-3 py-1 text-base hover:bg-stone-600"
            >
              {TERRITORY_BY_ID[id].name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const aScore = war.answers.filter((x) => x.aCorrect).length;
  const bScore = war.answers.filter((x) => x.bCorrect).length;
  const qNumber = war.answers.length + 1;
  const target = TERRITORY_BY_ID[war.target]?.name ?? war.target;

  return (
    <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 p-4">
      <p className="text-xs uppercase tracking-widest text-rose-300">
        War · {state.teamNames[war.attacker]} attacking {target}
        {war.targetFort ? " (fortified)" : ""}
      </p>

      <div className="mt-2 flex justify-between text-sm">
        <span className="text-blue-200">
          {state.teamNames.A}: <b>{aScore}</b>
        </span>
        <span className="text-rose-200">
          {state.teamNames.B}: <b>{bScore}</b>
        </span>
      </div>

      {war.answers.length < 5 ? (
        <>
          <p className="mt-3 text-sm font-semibold">Question {qNumber} of 5</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(["A", "B"] as const).map((team) => {
              const val = team === "A" ? aCorrect : bCorrect;
              const set = team === "A" ? setACorrect : setBCorrect;
              return (
                <div key={team} className="rounded border border-stone-600 p-2">
                  <p className="mb-1 text-xs text-stone-300">{state.teamNames[team]}</p>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => set(true)}
                      className={`font-display rounded px-2 py-1 text-sm ${val ? "bg-emerald-500 text-stone-900" : "bg-stone-700"}`}
                    >
                      Correct
                    </button>
                    <button
                      onClick={() => set(false)}
                      className={`font-display rounded px-2 py-1 text-sm ${!val ? "bg-rose-600 text-white" : "bg-stone-700"}`}
                    >
                      Wrong
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => {
              act({ type: "WAR_ANSWER", aCorrect, bCorrect });
              setACorrect(false);
              setBCorrect(false);
            }}
            className="font-display mt-3 w-full rounded-lg bg-amber-500 px-4 py-2 text-base text-stone-900 hover:bg-amber-400"
          >
            Record answer {qNumber}
          </button>
        </>
      ) : (
        <p className="mt-3 text-sm text-stone-300">Resolving war…</p>
      )}
    </div>
  );
}
