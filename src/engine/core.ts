import {
  DEFAULT_CONFIG,
  TEAMS,
  otherTeam,
  type Config,
  type GameState,
  type Team,
  type TerritoryState,
} from "./types.ts";
import { TERRITORY_IDS, neighboursOf } from "./data.ts";

export class IllegalActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalActionError";
  }
}

export function createInitialState(
  config: Config = DEFAULT_CONFIG,
  teamNames: Record<Team, string> = { A: "Team A", B: "Team B" },
): GameState {
  const territories: Record<string, TerritoryState> = {};
  for (const id of TERRITORY_IDS) territories[id] = { owner: null, fort: false };

  return {
    config,
    teamNames,
    territories,
    markers: { A: null, B: null },
    currentTeam: config.firstTeam,
    phase: "SETUP_DRAW",
    warUsed: { A: false, B: false },
    pendingQuestion: null,
    pendingTravel: null,
    war: null,
    pendingRelocate: null,
    questionsAsked: 0,
    turnsTaken: { A: 0, B: 0 },
    drawn: [],
    winner: null,
    log: [],
  };
}

export function ownedBy(state: GameState, team: Team): string[] {
  return TERRITORY_IDS.filter((id) => state.territories[id].owner === team);
}

export function countTerritories(state: GameState): Record<Team, number> {
  const counts: Record<Team, number> = { A: 0, B: 0 };
  for (const id of TERRITORY_IDS) {
    const owner = state.territories[id].owner;
    if (owner) counts[owner] += 1;
  }
  return counts;
}

export function neutralTerritories(state: GameState): string[] {
  return TERRITORY_IDS.filter((id) => state.territories[id].owner === null);
}

/** Territories from which adjacency is measured for a team. */
export function sourcesFor(state: GameState, team: Team): string[] {
  if (state.config.adjacencyBasis === "anyOwned") return ownedBy(state, team);
  const marker = state.markers[team];
  return marker ? [marker] : [];
}

export function adjacentFrom(sources: string[]): Set<string> {
  const out = new Set<string>();
  for (const s of sources) for (const n of neighboursOf(s)) out.add(n);
  return out;
}

/** Owned territories reachable from the marker via owned-territory moves. */
export function reachableOwned(state: GameState, team: Team): string[] {
  const marker = state.markers[team];
  if (!marker || state.territories[marker].owner !== team) {
    return ownedBy(state, team);
  }
  const seen = new Set<string>([marker]);
  const stack = [marker];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const n of neighboursOf(cur)) {
      if (seen.has(n)) continue;
      if (state.territories[n].owner === team) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return [...seen];
}

export function canDeclareWar(state: GameState, team: Team): boolean {
  if (state.warUsed[team]) return false;
  const adj = adjacentFrom(reachableOwned(state, team));
  return [...adj].some((id) => state.territories[id].owner === otherTeam(team));
}

export function canConquer(state: GameState, team: Team): boolean {
  const adj = adjacentFrom(reachableOwned(state, team));
  return [...adj].some((id) => state.territories[id].owner === null);
}

/** Whether any state-changing (territory-flipping) action remains. */
export function progressPossible(state: GameState): boolean {
  return TEAMS.some((t) => canConquer(state, t) || canDeclareWar(state, t));
}

export function shouldEnd(state: GameState): boolean {
  if (state.phase === "GAME_OVER" || state.phase === "SUDDEN_DEATH") return true;
  if (state.questionsAsked >= state.config.questionCap) return true;
  if (
    state.turnsTaken.A >= state.config.turnCap &&
    state.turnsTaken.B >= state.config.turnCap
  ) {
    return true;
  }
  if (!progressPossible(state)) return true;
  if (
    neutralTerritories(state).length === 0 &&
    !canDeclareWar(state, "A") &&
    !canDeclareWar(state, "B")
  ) {
    return true;
  }
  return false;
}

export function finishGame(state: GameState): GameState {
  const counts = countTerritories(state);
  if (counts.A === counts.B) return { ...state, phase: "SUDDEN_DEATH" };
  const winner: Team = counts.A > counts.B ? "A" : "B";
  return { ...state, phase: "GAME_OVER", winner };
}

/** Advance control to the other team, resolving a pending Travel first. */
export function endTurn(state: GameState): GameState {
  let next: GameState = {
    ...state,
    phase: "TURN",
    pendingQuestion: null,
    war: null,
    pendingRelocate: null,
    turnsTaken: {
      ...state.turnsTaken,
      [state.currentTeam]: state.turnsTaken[state.currentTeam] + 1,
    },
    currentTeam: otherTeam(state.currentTeam),
  };

  if (next.pendingTravel && next.pendingTravel.team === next.currentTeam) {
    const dest = next.pendingTravel.to;
    if (next.territories[dest]?.owner === next.currentTeam) {
      next = { ...next, markers: { ...next.markers, [next.currentTeam]: dest } };
    }
    next = { ...next, pendingTravel: null };
  }

  if (shouldEnd(next)) return finishGame(next);
  return next;
}
