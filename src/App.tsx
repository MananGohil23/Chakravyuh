import { useEffect, useState } from "react";
import { useGame } from "./state/game.tsx";
import { MapView } from "./components/MapView.tsx";
import { Scoreboard } from "./components/Scoreboard.tsx";
import { SetupPanel } from "./components/SetupPanel.tsx";
import { ActionPanel, type Mode } from "./components/ActionPanel.tsx";
import { QuestionPanel } from "./components/QuestionPanel.tsx";
import { WarPanel } from "./components/WarPanel.tsx";
import { EventLog } from "./components/EventLog.tsx";
import { turnOptions } from "./engine/legal.ts";
import { TERRITORY_BY_ID } from "./engine/data.ts";

function phaseLabel(phase: string): string {
  return phase.replace(/_/g, " ").toLowerCase();
}

function SuddenDeathPanel() {
  const { state, act } = useGame();
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  return (
    <div className="panel p-4">
      <p className="gilded font-display text-sm uppercase tracking-[0.25em]">
        ⚔ Sudden Death ⚔
      </p>
      <p className="etched mt-1 text-sm">
        Ask one question. If exactly one team answers true, they seize victory.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {(["A", "B"] as const).map((team) => {
          const val = team === "A" ? a : b;
          const set = team === "A" ? setA : setB;
          return (
            <div key={team} className="panel-inset p-2">
              <p className="mb-1 text-xs">{state.teamNames[team]}</p>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => set(true)}
                  className={`btn px-2 py-1 text-sm ${val ? "btn-emerald" : "btn-iron"}`}
                >
                  Correct
                </button>
                <button
                  onClick={() => set(false)}
                  className={`btn px-2 py-1 text-sm ${!val ? "btn-blood" : "btn-iron"}`}
                >
                  Wrong
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => act({ type: "SUDDEN_DEATH_ANSWER", aCorrect: a, bCorrect: b })}
        className="btn btn-gold mt-3 w-full px-4 py-2 text-base"
      >
        Submit
      </button>
    </div>
  );
}

function GameOverPanel() {
  const { state } = useGame();
  const winner = state.winner;
  return (
    <div className="panel p-6 text-center">
      <p className="gilded font-display text-sm uppercase tracking-[0.3em]">
        ⚔ Victory ⚔
      </p>
      <p className="gilded font-display mt-2 text-3xl">
        {winner ? `${state.teamNames[winner]} conquers the field` : "No victor"}
      </p>
    </div>
  );
}

function StatusBar() {
  const { state } = useGame();
  return (
    <div className="panel-inset flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-xs">
      <span className="gilded font-display uppercase tracking-[0.2em]">
        {phaseLabel(state.phase)}
      </span>
      {state.phase === "TURN" && (
        <span className="etched">
          Banner: <b className="text-gold-bright">{state.teamNames[state.currentTeam]}</b>
        </span>
      )}
      {state.pendingTravel && (
        <span className="text-amber-300">
          {state.teamNames[state.pendingTravel.team]} marches to{" "}
          {TERRITORY_BY_ID[state.pendingTravel.to]?.name} next turn
        </span>
      )}
      <span className="etched ml-auto">
        Questions {state.questionsAsked}/{state.config.questionCap}
      </span>
    </div>
  );
}

export default function App() {
  const { state, act } = useGame();
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    setMode(null);
  }, [state.phase, state.currentTeam]);

  const opts = turnOptions(state);
  const highlight =
    state.phase === "TURN" && mode
      ? mode === "move"
        ? opts.moves
        : mode === "conquer"
          ? opts.conquers
          : mode === "travel"
            ? opts.travels
            : opts.wars
      : state.phase === "QUESTION" && state.pendingQuestion
        ? [state.pendingQuestion.to]
        : state.phase === "WAR" && state.war
          ? [state.war.target]
          : [];

  function handleMapSelect(id: string) {
    if (state.phase !== "TURN" || !mode) return;
    const targets =
      mode === "move"
        ? opts.moves
        : mode === "conquer"
          ? opts.conquers
          : mode === "travel"
            ? opts.travels
            : opts.wars;
    if (!targets.includes(id)) return;
    if (mode === "move") act({ type: "MOVE", to: id });
    else if (mode === "conquer") act({ type: "DECLARE_CONQUER", to: id });
    else if (mode === "travel") act({ type: "DECLARE_TRAVEL", to: id });
    else act({ type: "DECLARE_WAR", target: id });
    setMode(null);
  }

  const setup = state.phase === "SETUP_DRAW" || state.phase === "SETUP_MARKER";

  return (
    <div className="relative z-10 flex min-h-screen flex-col p-4 lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col">
        <header className="mb-4 text-center">
          <div className="flex items-center justify-center gap-4">
            <span className="gilded text-2xl">⚔</span>
            <h1 className="gilded font-display text-4xl tracking-[0.18em] sm:text-5xl">
              THE BATTLEFIELD
            </h1>
            <span className="gilded text-2xl">⚔</span>
          </div>
          <p className="etched mt-1 text-[11px] uppercase tracking-[0.45em] text-bronze">
            Round III · Territory War · Admin Command
          </p>
          <div className="rule mx-auto mt-3 max-w-3xl" />
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div className="flex min-h-0 flex-col gap-3">
            <StatusBar />
            <div className="panel flex min-h-0 flex-1 flex-col p-3">
              <MapView highlight={highlight} onSelect={handleMapSelect} />
            </div>
          </div>

          <aside className="flex min-h-0 flex-col gap-3">
            <Scoreboard />
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {setup && <SetupPanel />}
              {state.phase === "TURN" && (
                <ActionPanel opts={opts} mode={mode} setMode={setMode} />
              )}
              {state.phase === "QUESTION" && <QuestionPanel />}
              {state.phase === "WAR" && <WarPanel />}
              {state.phase === "SUDDEN_DEATH" && <SuddenDeathPanel />}
              {state.phase === "GAME_OVER" && <GameOverPanel />}
              <EventLog />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
