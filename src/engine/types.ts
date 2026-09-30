export type Team = "A" | "B";
export type Owner = Team | null;

export const TEAMS: readonly Team[] = ["A", "B"] as const;

export function otherTeam(team: Team): Team {
  return team === "A" ? "B" : "A";
}

/** Static map metadata: identity, display name, and map-image geometry. */
export interface TerritoryMeta {
  id: string;
  number: number;
  name: string;
  /** centroid in map-image pixel space (1536x1024) */
  cx: number;
  cy: number;
  /** click/overlay radius in map-image pixel space */
  r: number;
}

/** Dynamic per-territory state. */
export interface TerritoryState {
  owner: Owner;
  fort: boolean;
}

export type Phase =
  | "SETUP_DRAW"
  | "SETUP_MARKER"
  | "TURN"
  | "QUESTION"
  | "WAR"
  | "SUDDEN_DEATH"
  | "GAME_OVER";

export interface Config {
  /** total questions allowed before the round ends */
  questionCap: number;
  /** safety-net turn cap (equal turns per team) */
  turnCap: number;
  /** number of wheel draws during setup (6 -> 3 per team) */
  drawCount: number;
  /** territories each team starts with */
  territoriesPerTeam: number;
  /** whether adjacency is measured from the marker or any owned territory */
  adjacencyBasis: "marker" | "anyOwned";
  /** wheel assignment order */
  wheelAssignOrder: "alternate" | "block";
  /** how a drawn war is broken */
  warTieBreak: "none" | "suddenDeath";
  /** who moves first */
  firstTeam: Team;
}

export const DEFAULT_CONFIG: Config = {
  questionCap: 40,
  turnCap: 40,
  drawCount: 6,
  territoriesPerTeam: 3,
  adjacencyBasis: "marker",
  wheelAssignOrder: "alternate",
  warTieBreak: "none",
  firstTeam: "A",
};

export interface PendingQuestion {
  kind: "conquer" | "travel";
  team: Team;
  to: string;
}

export interface PendingTravel {
  team: Team;
  to: string;
}

export interface WarAnswer {
  aCorrect: boolean;
  bCorrect: boolean;
}

export interface WarState {
  attacker: Team;
  defender: Team;
  /** contested enemy territory */
  target: string;
  /** whether the target was fortified at declaration */
  targetFort: boolean;
  answers: WarAnswer[];
  /** neutral territories the attacker may pick from as the +1 bonus */
  bonusOptions: string[] | null;
}

export interface PendingRelocate {
  team: Team;
  options: string[];
}

export interface GameState {
  config: Config;
  teamNames: Record<Team, string>;
  territories: Record<string, TerritoryState>;
  markers: Record<Team, string | null>;
  currentTeam: Team;
  phase: Phase;
  warUsed: Record<Team, boolean>;
  pendingQuestion: PendingQuestion | null;
  pendingTravel: PendingTravel | null;
  war: WarState | null;
  pendingRelocate: PendingRelocate | null;
  questionsAsked: number;
  turnsTaken: Record<Team, number>;
  /** territory ids drawn from the wheel so far */
  drawn: string[];
  winner: Team | null;
  /** append-only action log; drives Undo */
  log: Action[];
}

export type Action =
  | { type: "DRAW_TERRITORY"; territoryId: string }
  | { type: "PLACE_MARKER"; team: Team; territoryId: string }
  | { type: "SET_FIRST_TEAM"; team: Team }
  | { type: "START_GAME" }
  | { type: "MOVE"; to: string }
  | { type: "DECLARE_CONQUER"; to: string }
  | { type: "DECLARE_TRAVEL"; to: string }
  | { type: "RESOLVE_QUESTION"; correct: boolean }
  | { type: "FORTIFY" }
  | { type: "DECLARE_WAR"; target: string }
  | { type: "WAR_ANSWER"; aCorrect: boolean; bCorrect: boolean }
  | { type: "CHOOSE_WAR_BONUS"; territoryId: string }
  | { type: "CHOOSE_RELOCATION"; territoryId: string }
  | { type: "SUDDEN_DEATH_ANSWER"; aCorrect: boolean; bCorrect: boolean };

export type ActionType = Action["type"];
