import { useEffect, useState } from "react";
import { useGame } from "./state/game.tsx";
import { MapView } from "./components/MapView.tsx";
import { Scoreboard } from "./components/Scoreboard.tsx";
import { SetupPanel } from "./components/SetupPanel.tsx";
import { ActionPanel, type Mode } from "./components/ActionPanel.tsx";
import { QuestionPanel } from "./components/QuestionPanel.tsx";
import { WarPanel } from "./components/WarPanel.tsx";
import { EventLog } from "./components/EventLog.tsx";
import { CalibrationPanel } from "./components/CalibrationPanel.tsx";
import { turnOptions } from "./engine/legal.ts";
import { TERRITORY_BY_ID } from "./engine/data.ts";
import { useCalibration } from "./state/calibration.tsx";

function phaseLabel(phase: string): string {
  return phase.replace(/_/g, " ").toLowerCase();
}

function SuddenDeathPanel() {
  const { state, act } = useGame();
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  return (
    <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
      <p className="text-xs uppercase tracking-widest text-yellow-300">Sudden death</p>
      <p className="mt-1 text-sm text-stone-200">
        Ask one question. If exactly one team is correct, they win.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {(["A", "B"] as const).map((team) => {
          const val = team === "A" ? a : b;
          const set = team === "A" ? setA : setB;
          return (
            <div key={team} className="rounded border border-stone-600 p-2">
              <p className="mb-1 text-xs">{state.teamNames[team]}</p>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => set(true)}
                  className={`rounded px-2 py-1 text-xs ${val ? "bg-emerald-500 text-stone-900" : "bg-stone-700"}`}
                >
                  Correct
                </button>
                <button
                  onClick={() => set(false)}
                  className={`rounded px-2 py-1 text-xs ${!val ? "bg-rose-600 text-white" : "bg-stone-700"}`}
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
        className="mt-3 w-full rounded-lg bg-yellow-400 px-4 py-2 font-bold text-stone-900 hover:bg-yellow-300"
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
    <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-6 text-center">
      <p className="text-xs uppercase tracking-widest text-emerald-300">Game over</p>
      <p className="mt-2 text-2xl font-bold">
        {winner ? `${state.teamNames[winner]} wins!` : "No winner"}
      </p>
    </div>
  );
}

function StatusBar() {
  const { state } = useGame();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-700 bg-stone-800/40 px-3 py-2 text-xs text-stone-300">
      <span className="uppercase tracking-widest text-stone-400">
        {phaseLabel(state.phase)}
      </span>
      {state.phase === "TURN" && (
        <span>
          Current: <b>{state.teamNames[state.currentTeam]}</b>
        </span>
      )}
      {state.pendingTravel && (
        <span className="text-amber-300">
          {state.teamNames[state.pendingTravel.team]} travels to{" "}
          {TERRITORY_BY_ID[state.pendingTravel.to]?.name} next turn
        </span>
      )}
      <span className="ml-auto">Q {state.questionsAsked}/{state.config.questionCap}</span>
    </div>
  );
}

export default function App() {
  const { state, act } = useGame();
  const { calibrating } = useCalibration();
  const [mode, setMode] = useState<Mode>(null);
  const [calId, setCalId] = useState<string | null>(null);
  const [showCal, setShowCal] = useState(false);

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
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="mx-auto max-w-[1500px] p-4">
        <header className="mb-3 flex items-baseline gap-3">
          <h1 className="text-2xl font-black tracking-widest">THE BATTLEFIELD</h1>
          <span className="text-xs uppercase tracking-widest text-stone-500">
            Round 3 · admin console
          </span>
          <button
            onClick={() => setShowCal((v) => !v)}
            className="ml-auto rounded border border-stone-600 px-2 py-1 text-xs text-stone-400 hover:bg-stone-800"
          >
            {showCal ? "Hide calibration" : "Calibrate map"}
          </button>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <StatusBar />
            <MapView
              highlight={highlight}
              onSelect={(id) => (calibrating ? setCalId(id) : handleMapSelect(id))}
            />
          </div>

          <aside className="flex max-h-[calc(100vh-6rem)] flex-col gap-3 lg:sticky lg:top-4">
            <Scoreboard />
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {showCal && (
                <CalibrationPanel selectedId={calId} onSelectId={setCalId} />
              )}
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
