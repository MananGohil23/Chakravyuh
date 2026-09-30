import {
  otherTeam,
  type Action,
  type Config,
  type GameState,
  type Owner,
  type Team,
  type TerritoryState,
} from "./types.ts";
import { neighboursOf } from "./data.ts";
import {
  IllegalActionError,
  createInitialState,
  endTurn as _endTurn,
  ownedBy,
} from "./core.ts";

function teamForDrawIndex(index: number, config: Config): Team {
  if (config.wheelAssignOrder === "block") {
    return index < config.territoriesPerTeam ? "A" : "B";
  }
  return index % 2 === 0 ? "A" : "B";
}

function setOwner(
  state: GameState,
  id: string,
  owner: Owner,
  fort?: boolean,
): GameState {
  const prev = state.territories[id];
  const next: TerritoryState = {
    owner,
    fort: fort ?? (owner === prev.owner ? prev.fort : false),
  };
  return { ...state, territories: { ...state.territories, [id]: next } };
}

function resolveWar(state: GameState): GameState {
  const war = state.war;
  if (!war) throw new IllegalActionError("no war in progress");

  const aScore = war.answers.filter((x) => x.aCorrect).length;
  const bScore = war.answers.filter((x) => x.bCorrect).length;
  const attackerScore = war.attacker === "A" ? aScore : bScore;
  const defenderScore = war.defender === "A" ? aScore : bScore;

  if (attackerScore <= defenderScore) {
    if (attackerScore === defenderScore && state.config.warTieBreak === "suddenDeath") {
      return { ...state, war: null, phase: "SUDDEN_DEATH" };
    }
    return _endTurn(state);
  }

  let next = setOwner(state, war.target, war.attacker, false);

  if (next.markers[war.defender] === war.target) {
    const remaining = ownedBy(next, war.defender);
    if (remaining.length === 0) {
      return { ...next, war: null, phase: "GAME_OVER", winner: war.attacker };
    }
    if (remaining.length === 1) {
      next = { ...next, markers: { ...next.markers, [war.defender]: remaining[0] } };
    } else {
      next = { ...next, pendingRelocate: { team: war.defender, options: remaining } };
    }
  }

  let bonusOptions: string[] | null = null;
  if (!war.targetFort) {
    const neutrals = neighboursOf(war.target).filter(
      (id) => next.territories[id].owner === null,
    );
    if (neutrals.length === 1) {
      next = setOwner(next, neutrals[0], war.attacker, false);
    } else if (neutrals.length > 1) {
      bonusOptions = neutrals;
    }
  }

  next = { ...next, war: { ...war, bonusOptions } };
  if (bonusOptions || next.pendingRelocate) return next;
  return _endTurn(next);
}

function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "DRAW_TERRITORY": {
      if (state.phase !== "SETUP_DRAW")
        throw new IllegalActionError("not in setup draw phase");
      const { territoryId } = action;
      if (!state.territories[territoryId])
        throw new IllegalActionError(`unknown territory "${territoryId}"`);
      if (state.drawn.includes(territoryId))
        throw new IllegalActionError(`"${territoryId}" already drawn`);
      if (state.drawn.length >= state.config.drawCount)
        throw new IllegalActionError("all draws used");
      const team = teamForDrawIndex(state.drawn.length, state.config);
      let next = setOwner(state, territoryId, team, false);
      next = { ...next, drawn: [...next.drawn, territoryId] };
      if (next.drawn.length >= next.config.drawCount) {
        next = { ...next, phase: "SETUP_MARKER" };
      }
      return next;
    }

    case "PLACE_MARKER": {
      if (state.phase !== "SETUP_MARKER")
        throw new IllegalActionError("not in marker placement phase");
      const { team, territoryId } = action;
      if (state.territories[territoryId].owner !== team)
        throw new IllegalActionError("marker must be placed on an owned territory");
      return { ...state, markers: { ...state.markers, [team]: territoryId } };
    }

    case "SET_FIRST_TEAM": {
      if (state.phase !== "SETUP_MARKER")
        throw new IllegalActionError("cannot set first team now");
      return { ...state, config: { ...state.config, firstTeam: action.team } };
    }

    case "START_GAME": {
      if (state.phase !== "SETUP_MARKER")
        throw new IllegalActionError("cannot start game now");
      if (!state.markers.A || !state.markers.B)
        throw new IllegalActionError("both markers must be placed first");
      return { ...state, phase: "TURN", currentTeam: state.config.firstTeam };
    }

    case "MOVE": {
      requireTurn(state);
      const team = state.currentTeam;
      const from = state.markers[team];
      if (!from) throw new IllegalActionError("no marker");
      if (state.territories[action.to].owner !== team)
        throw new IllegalActionError("can only move to an owned territory");
      if (!neighboursOf(from).includes(action.to))
        throw new IllegalActionError("destination is not adjacent");
      const moved = { ...state, markers: { ...state.markers, [team]: action.to } };
      return _endTurn(moved);
    }

    case "DECLARE_CONQUER": {
      requireTurn(state);
      const from = state.markers[state.currentTeam];
      if (!from) throw new IllegalActionError("no marker");
      if (state.territories[action.to].owner !== null)
        throw new IllegalActionError("target is not neutral");
      if (!neighboursOf(from).includes(action.to))
        throw new IllegalActionError("target is not adjacent");
      return {
        ...state,
        phase: "QUESTION",
        questionsAsked: state.questionsAsked + 1,
        pendingQuestion: { kind: "conquer", team: state.currentTeam, to: action.to },
      };
    }

    case "DECLARE_TRAVEL": {
      requireTurn(state);
      const team = state.currentTeam;
      const from = state.markers[team];
      if (!from) throw new IllegalActionError("no marker");
      if (state.territories[action.to].owner !== team)
        throw new IllegalActionError("can only travel to an owned territory");
      if (action.to === from) throw new IllegalActionError("already there");
      if (neighboursOf(from).includes(action.to))
        throw new IllegalActionError("adjacent destinations use Move");
      return {
        ...state,
        phase: "QUESTION",
        questionsAsked: state.questionsAsked + 1,
        pendingQuestion: { kind: "travel", team, to: action.to },
      };
    }

    case "RESOLVE_QUESTION": {
      if (state.phase !== "QUESTION" || !state.pendingQuestion)
        throw new IllegalActionError("no pending question");
      const pq = state.pendingQuestion;
      let next: GameState = { ...state, pendingQuestion: null };
      if (action.correct) {
        if (pq.kind === "conquer") {
          next = setOwner(next, pq.to, pq.team, false);
        } else {
          next = { ...next, pendingTravel: { team: pq.team, to: pq.to } };
        }
      }
      return _endTurn(next);
    }

    case "FORTIFY": {
      requireTurn(state);
      const team = state.currentTeam;
      const at = state.markers[team];
      if (!at) throw new IllegalActionError("no marker");
      if (state.territories[at].owner !== team)
        throw new IllegalActionError("cannot fortify a territory you do not own");
      if (state.territories[at].fort)
        throw new IllegalActionError("already fortified");
      const next = setOwner(state, at, team, true);
      return _endTurn(next);
    }

    case "DECLARE_WAR": {
      requireTurn(state);
      const team = state.currentTeam;
      if (state.warUsed[team]) throw new IllegalActionError("war already used");
      const from = state.markers[team];
      if (!from) throw new IllegalActionError("no marker");
      if (!neighboursOf(from).includes(action.target))
        throw new IllegalActionError("target is not adjacent");
      if (state.territories[action.target].owner !== otherTeam(team))
        throw new IllegalActionError("target is not enemy-controlled");
      return {
        ...state,
        phase: "WAR",
        warUsed: { ...state.warUsed, [team]: true },
        war: {
          attacker: team,
          defender: otherTeam(team),
          target: action.target,
          targetFort: state.territories[action.target].fort,
          answers: [],
          bonusOptions: null,
        },
      };
    }

    case "WAR_ANSWER": {
      if (state.phase !== "WAR" || !state.war)
        throw new IllegalActionError("no war in progress");
      if (state.war.answers.length >= 5)
        throw new IllegalActionError("war already fully answered");
      const answers = [
        ...state.war.answers,
        { aCorrect: action.aCorrect, bCorrect: action.bCorrect },
      ];
      let next: GameState = {
        ...state,
        questionsAsked: state.questionsAsked + 1,
        war: { ...state.war, answers },
      };
      if (answers.length >= 5) next = resolveWar(next);
      return next;
    }

    case "CHOOSE_WAR_BONUS": {
      if (state.phase !== "WAR" || !state.war?.bonusOptions)
        throw new IllegalActionError("no bonus choice pending");
      if (!state.war.bonusOptions.includes(action.territoryId))
        throw new IllegalActionError("invalid bonus territory");
      let next = setOwner(state, action.territoryId, state.war.attacker, false);
      next = { ...next, war: { ...state.war, bonusOptions: null } };
      if (next.pendingRelocate) return next;
      return _endTurn(next);
    }

    case "CHOOSE_RELOCATION": {
      if (!state.pendingRelocate) throw new IllegalActionError("no relocation pending");
      if (!state.pendingRelocate.options.includes(action.territoryId))
        throw new IllegalActionError("invalid relocation territory");
      const team = state.pendingRelocate.team;
      const next: GameState = {
        ...state,
        markers: { ...state.markers, [team]: action.territoryId },
        pendingRelocate: null,
      };
      if (next.war?.bonusOptions) return next;
      return _endTurn(next);
    }

    case "SUDDEN_DEATH_ANSWER": {
      if (state.phase !== "SUDDEN_DEATH")
        throw new IllegalActionError("not in sudden death");
      if (action.aCorrect && !action.bCorrect)
        return { ...state, phase: "GAME_OVER", winner: "A" };
      if (action.bCorrect && !action.aCorrect)
        return { ...state, phase: "GAME_OVER", winner: "B" };
      return { ...state, questionsAsked: state.questionsAsked + 1 };
    }

    default:
      throw new IllegalActionError("unknown action");
  }
}

function requireTurn(state: GameState): void {
  if (state.phase !== "TURN") throw new IllegalActionError("not a turn");
}

/** Apply an action, appending it to the log. Throws on illegal actions. */
export function apply(state: GameState, action: Action): GameState {
  const next = reduce(state, action);
  return { ...next, log: [...next.log, action] };
}

/** Replay a sequence of actions from a fresh state (used for Undo). */
export function replay(config: Config, teamNames: Record<Team, string>, actions: Action[]): GameState {
  let state = createInitialState(config, teamNames);
  for (const a of actions) state = reduce(state, a);
  return { ...state, log: [...actions] };
}

/** Undo the most recent logged action. */
export function undo(state: GameState): GameState {
  if (state.log.length === 0) return state;
  return replay(state.config, state.teamNames, state.log.slice(0, -1));
}

export { shouldEnd, createInitialState } from "./core.ts";
