import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import {
  apply,
  createInitialState,
  undo as undoState,
} from "../engine/engine.ts";
import {
  DEFAULT_CONFIG,
  type Action,
  type Config,
  type GameState,
  type Team,
} from "../engine/types.ts";

const STORAGE_KEY = "battlefield.state.v1";

type Meta =
  | { type: "__UNDO" }
  | { type: "__RESET" }
  | { type: "__SET_CONFIG"; patch: Partial<Config> }
  | { type: "__SET_TEAM_NAMES"; names: Record<Team, string> };

export type AnyAction = Action | Meta;

function reducer(state: GameState, action: AnyAction): GameState {
  try {
    switch (action.type) {
      case "__UNDO":
        return undoState(state);
      case "__RESET":
        return createInitialState(state.config, state.teamNames);
      case "__SET_CONFIG":
        return { ...state, config: { ...state.config, ...action.patch } };
      case "__SET_TEAM_NAMES":
        return { ...state, teamNames: action.names };
      default:
        return apply(state, action);
    }
  } catch (err) {
    console.error("Illegal action rejected:", action, err);
    return state;
  }
}

function loadInitial(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (parsed && parsed.territories && parsed.config && parsed.phase) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to restore saved game:", err);
  }
  return createInitialState(DEFAULT_CONFIG);
}

interface GameContextValue {
  state: GameState;
  act: (action: Action) => void;
  undo: () => void;
  reset: () => void;
  setConfig: (patch: Partial<Config>) => void;
  setTeamNames: (names: Record<Team, string>) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value: GameContextValue = {
    state,
    act: (action) => dispatch(action),
    undo: () => dispatch({ type: "__UNDO" }),
    reset: () => dispatch({ type: "__RESET" }),
    setConfig: (patch) => dispatch({ type: "__SET_CONFIG", patch }),
    setTeamNames: (names) => dispatch({ type: "__SET_TEAM_NAMES", names }),
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
