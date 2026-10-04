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
      <div className="panel p-4">
        <p className="gilded font-display text-sm uppercase tracking-[0.25em]">
          Marker Displaced
        </p>
        <p className="etched mt-1 text-sm">
          {state.teamNames[pendingRelocate.team]}'s banner was captured. Rally to:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {pendingRelocate.options.map((id) => (
            <button
              key={id}
              onClick={() => act({ type: "CHOOSE_RELOCATION", territoryId: id })}
              className="btn btn-iron px-3 py-1 text-base"
            >
              {TERRITORY_BY_ID[id].name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!war) return null;

  const aScore = war.answers.filter((x) => x.aCorrect).length;
  const bScore = war.answers.filter((x) => x.bCorrect).length;
  const qNumber = war.answers.length + 1;
  const target = TERRITORY_BY_ID[war.target]?.name ?? war.target;

  return (
    <div className="panel p-4">
      <p className="gilded font-display text-sm uppercase tracking-[0.25em]">
        ⚔ War · {state.teamNames[war.attacker]} → {target}
        {war.targetFort ? " 🛡" : ""}
      </p>

      <div className="panel-inset mt-2 flex justify-between px-3 py-1 text-sm">
        <span className="text-blue-300">
          {state.teamNames.A}: <b>{aScore}</b>
        </span>
        <span className="text-rose-300">
          {state.teamNames.B}: <b>{bScore}</b>
        </span>
      </div>

      {war.answers.length < 5 ? (
        <>
          <p className="etched mt-3 text-sm">
            Question {qNumber} of 5 — mark each host's answer
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(["A", "B"] as const).map((team) => {
              const val = team === "A" ? aCorrect : bCorrect;
              const set = team === "A" ? setACorrect : setBCorrect;
              return (
                <div key={team} className="panel-inset p-2">
                  <p className="etched mb-1 text-xs">{state.teamNames[team]}</p>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => set(true)}
                      className={`btn px-2 py-1 text-sm ${val ? "btn-emerald" : "btn-iron"}`}
                    >
                      ✔
                    </button>
                    <button
                      onClick={() => set(false)}
                      className={`btn px-2 py-1 text-sm ${!val ? "btn-blood" : "btn-iron"}`}
                    >
                      ✘
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
            className="btn btn-gold mt-3 w-full px-4 py-2 text-base"
          >
            Record Answer {qNumber}
          </button>
        </>
      ) : (
        <p className="etched mt-3 text-sm">Resolving the battle…</p>
      )}
    </div>
  );
}
