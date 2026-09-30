import { TEAMS, otherTeam, type Action, type GameState } from "./types.ts";
import { TERRITORY_IDS, neighboursOf } from "./data.ts";

/** Every action that is currently legal, for validation and the UI. */
export function legalActions(state: GameState): Action[] {
  switch (state.phase) {
    case "SETUP_DRAW":
      return TERRITORY_IDS.filter((id) => !state.drawn.includes(id)).map(
        (territoryId) => ({ type: "DRAW_TERRITORY", territoryId }),
      );

    case "SETUP_MARKER": {
      const actions: Action[] = [];
      for (const team of TEAMS) {
        if (state.markers[team]) continue;
        for (const id of TERRITORY_IDS) {
          if (state.territories[id].owner === team) {
            actions.push({ type: "PLACE_MARKER", team, territoryId: id });
          }
        }
      }
      actions.push({ type: "SET_FIRST_TEAM", team: "A" });
      actions.push({ type: "SET_FIRST_TEAM", team: "B" });
      if (state.markers.A && state.markers.B) actions.push({ type: "START_GAME" });
      return actions;
    }

    case "TURN":
      return turnActions(state);

    case "QUESTION":
      return [
        { type: "RESOLVE_QUESTION", correct: true },
        { type: "RESOLVE_QUESTION", correct: false },
      ];

    case "WAR": {
      const actions: Action[] = [];
      if (state.pendingRelocate) {
        for (const id of state.pendingRelocate.options) {
          actions.push({ type: "CHOOSE_RELOCATION", territoryId: id });
        }
      }
      if (state.war?.bonusOptions) {
        for (const id of state.war.bonusOptions) {
          actions.push({ type: "CHOOSE_WAR_BONUS", territoryId: id });
        }
      }
      if (state.war && state.war.answers.length < 5) {
        for (const aCorrect of [true, false]) {
          for (const bCorrect of [true, false]) {
            actions.push({ type: "WAR_ANSWER", aCorrect, bCorrect });
          }
        }
      }
      return actions;
    }

    case "SUDDEN_DEATH": {
      const actions: Action[] = [];
      for (const aCorrect of [true, false]) {
        for (const bCorrect of [true, false]) {
          actions.push({ type: "SUDDEN_DEATH_ANSWER", aCorrect, bCorrect });
        }
      }
      return actions;
    }

    case "GAME_OVER":
      return [];
  }
}

/** Action-panel options for the acting team during a normal turn. */
export interface TurnOptions {
  moves: string[];
  conquers: string[];
  travels: string[];
  wars: string[];
  canFortify: boolean;
}

export function turnOptions(state: GameState): TurnOptions {
  const team = state.currentTeam;
  const from = state.markers[team];
  const empty: TurnOptions = {
    moves: [],
    conquers: [],
    travels: [],
    wars: [],
    canFortify: false,
  };
  if (state.phase !== "TURN" || !from) return empty;

  const adjacent = neighboursOf(from);
  const moves = adjacent.filter((id) => state.territories[id].owner === team);
  const conquers = adjacent.filter((id) => state.territories[id].owner === null);
  const wars = adjacent.filter(
    (id) => state.territories[id].owner === otherTeam(team),
  );
  const travels = TERRITORY_IDS.filter(
    (id) =>
      state.territories[id].owner === team && id !== from && !adjacent.includes(id),
  );
  const canFortify = state.territories[from].owner === team && !state.territories[from].fort;

  return {
    moves,
    conquers,
    travels,
    wars: state.warUsed[team] ? [] : wars,
    canFortify,
  };
}

function turnActions(state: GameState): Action[] {
  const opts = turnOptions(state);
  const actions: Action[] = [];
  for (const to of opts.moves) actions.push({ type: "MOVE", to });
  for (const to of opts.conquers) actions.push({ type: "DECLARE_CONQUER", to });
  for (const to of opts.travels) actions.push({ type: "DECLARE_TRAVEL", to });
  for (const target of opts.wars) actions.push({ type: "DECLARE_WAR", target });
  if (opts.canFortify) actions.push({ type: "FORTIFY" });
  return actions;
}
