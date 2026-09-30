import { describe, it, expect } from "vitest";
import { createInitialState, apply } from "./engine.ts";
import { countTerritories, progressPossible } from "./core.ts";
import { turnOptions } from "./legal.ts";
import { DEFAULT_CONFIG, type Config, type GameState, type Team } from "./types.ts";

function makeState(opts: {
  owners: Record<string, Team>;
  markers: Partial<Record<Team, string>>;
  forts?: string[];
  warUsed?: Partial<Record<Team, boolean>>;
  config?: Partial<Config>;
  phase?: GameState["phase"];
}): GameState {
  const base = createInitialState({ ...DEFAULT_CONFIG, ...opts.config });
  const territories = { ...base.territories };
  for (const [id, team] of Object.entries(opts.owners)) {
    territories[id] = { owner: team, fort: opts.forts?.includes(id) ?? false };
  }
  return {
    ...base,
    territories,
    markers: { A: opts.markers.A ?? null, B: opts.markers.B ?? null },
    warUsed: { A: opts.warUsed?.A ?? false, B: opts.warUsed?.B ?? false },
    phase: opts.phase ?? "TURN",
    currentTeam: "A",
  };
}

function playWar(state: GameState, pairs: [boolean, boolean][]): GameState {
  let s = state;
  for (const [aCorrect, bCorrect] of pairs) {
    s = apply(s, { type: "WAR_ANSWER", aCorrect, bCorrect });
  }
  return s;
}

const ATTACKER_WINS: [boolean, boolean][] = [
  [true, false],
  [true, false],
  [true, false],
  [false, true],
  [false, true],
];

describe("war resolution variants", () => {
  it("does not cascade to other adjacent enemy territories", () => {
    const s = makeState({
      owners: { indraprastha: "A", magadha: "B", kashi: "B" },
      markers: { A: "indraprastha" },
    });
    const w = playWar(apply(s, { type: "DECLARE_WAR", target: "magadha" }), ATTACKER_WINS);
    expect(w.territories.magadha.owner).toBe("A");
    expect(w.territories.kashi.owner).toBe("B");
    expect(w.war?.bonusOptions).toHaveLength(3);
  });

  it("captures only the contested territory when it has no neutral neighbour", () => {
    const s = makeState({
      owners: {
        indraprastha: "A",
        kamboja: "A",
        kuru: "A",
        panchala: "A",
        magadha: "B",
        kashi: "B",
      },
      markers: { A: "indraprastha" },
    });
    const before = countTerritories(s).A;
    const w = playWar(apply(s, { type: "DECLARE_WAR", target: "magadha" }), ATTACKER_WINS);
    expect(w.territories.magadha.owner).toBe("A");
    expect(countTerritories(w).A).toBe(before + 1);
    expect(w.war).toBe(null);
  });

  it("relocates the defender's marker when it sat on the captured territory", () => {
    const s = makeState({
      owners: { indraprastha: "A", magadha: "B", kashi: "B", anga: "B" },
      markers: { A: "indraprastha", B: "magadha" },
    });
    const w = playWar(apply(s, { type: "DECLARE_WAR", target: "magadha" }), ATTACKER_WINS);
    expect(w.pendingRelocate?.team).toBe("B");
    expect(w.pendingRelocate?.options).toEqual(["kashi", "anga"]);

    const moved = apply(w, { type: "CHOOSE_RELOCATION", territoryId: "kashi" });
    expect(moved.markers.B).toBe("kashi");
    expect(moved.pendingRelocate).toBe(null);
    // bonus choice is still pending
    expect(moved.war?.bonusOptions).toHaveLength(3);

    const done = apply(moved, { type: "CHOOSE_WAR_BONUS", territoryId: "kuru" });
    expect(done.territories.kuru.owner).toBe("A");
    expect(done.war).toBe(null);
  });

  it("eliminates a defender whose only territory is captured", () => {
    const s = makeState({
      owners: { indraprastha: "A", magadha: "B" },
      markers: { A: "indraprastha", B: "magadha" },
    });
    const w = playWar(apply(s, { type: "DECLARE_WAR", target: "magadha" }), ATTACKER_WINS);
    expect(w.phase).toBe("GAME_OVER");
    expect(w.winner).toBe("A");
  });

  it("treats a tie as no capture and still spends the war", () => {
    const s = makeState({
      owners: { indraprastha: "A", magadha: "B" },
      markers: { A: "indraprastha" },
    });
    const tie: [boolean, boolean][] = [
      [true, true],
      [true, true],
      [false, false],
      [false, false],
      [false, false],
    ];
    const w = playWar(apply(s, { type: "DECLARE_WAR", target: "magadha" }), tie);
    expect(w.territories.magadha.owner).toBe("B");
    expect(w.warUsed.A).toBe(true);
    expect(w.currentTeam).toBe("B");
  });

  it("goes to sudden death on a tie when configured", () => {
    const s = makeState({
      owners: { indraprastha: "A", magadha: "B" },
      markers: { A: "indraprastha" },
      config: { warTieBreak: "suddenDeath" },
    });
    const tie: [boolean, boolean][] = [
      [true, true],
      [true, true],
      [false, false],
      [false, false],
      [false, false],
    ];
    const w = playWar(apply(s, { type: "DECLARE_WAR", target: "magadha" }), tie);
    expect(w.phase).toBe("SUDDEN_DEATH");
  });
});

describe("sudden death", () => {
  it("keeps asking until exactly one team is correct", () => {
    const s = makeState({ owners: {}, markers: {}, phase: "SUDDEN_DEATH" });
    const bothWrong = apply(s, { type: "SUDDEN_DEATH_ANSWER", aCorrect: false, bCorrect: false });
    expect(bothWrong.phase).toBe("SUDDEN_DEATH");
    const bothRight = apply(bothWrong, { type: "SUDDEN_DEATH_ANSWER", aCorrect: true, bCorrect: true });
    expect(bothRight.phase).toBe("SUDDEN_DEATH");
    const aOnly = apply(bothRight, { type: "SUDDEN_DEATH_ANSWER", aCorrect: true, bCorrect: false });
    expect(aOnly.phase).toBe("GAME_OVER");
    expect(aOnly.winner).toBe("A");
  });
});

describe("end of game", () => {
  it("ends when the question cap is reached", () => {
    const s = makeState({
      owners: { indraprastha: "A", hastinapura: "A", magadha: "B" },
      markers: { A: "indraprastha" },
      config: { questionCap: 1 },
    });
    const asked = apply(s, { type: "DECLARE_CONQUER", to: "kamboja" });
    const done = apply(asked, { type: "RESOLVE_QUESTION", correct: true });
    expect(done.questionsAsked).toBe(1);
    expect(done.phase).toBe("GAME_OVER");
    expect(done.winner).toBe("A");
  });

  it("ends when no neutral remains and no war is available", () => {
    const owners: Record<string, Team> = {};
    const ids = [
      "hastinapura", "gandhara", "kamboja", "kuru", "matsya", "indraprastha",
      "magadha", "panchala", "virata", "dwarka", "kosala", "kashi", "anga",
      "kalinga", "saurashtra",
    ];
    for (const id of ids) owners[id] = "A";
    const s = makeState({
      owners,
      markers: { A: "hastinapura", B: "kalinga" },
      warUsed: { A: true, B: true },
    });
    expect(progressPossible(s)).toBe(false);
    const done = apply(s, { type: "FORTIFY" });
    expect(done.phase).toBe("GAME_OVER");
    expect(done.winner).toBe("A");
  });
});

describe("travel & fortify edges", () => {
  it("loses the turn on a wrong travel answer", () => {
    const s = makeState({
      owners: { indraprastha: "A", kuru: "A" },
      markers: { A: "indraprastha" },
    });
    const asked = apply(s, { type: "DECLARE_TRAVEL", to: "kuru" });
    const failed = apply(asked, { type: "RESOLVE_QUESTION", correct: false });
    expect(failed.pendingTravel).toBe(null);
    expect(failed.markers.A).toBe("indraprastha");
    expect(failed.currentTeam).toBe("B");
  });

  it("rejects travel to an adjacent owned territory", () => {
    const s = makeState({
      owners: { hastinapura: "A", indraprastha: "A" },
      markers: { A: "hastinapura" },
    });
    expect(() => apply(s, { type: "DECLARE_TRAVEL", to: "indraprastha" })).toThrow();
  });

  it("fortifies without a question and rejects double fortify", () => {
    const s = makeState({
      owners: { indraprastha: "A", kashi: "B" },
      markers: { A: "indraprastha", B: "kashi" },
    });
    const aFort = apply(s, { type: "FORTIFY" });
    expect(aFort.territories.indraprastha.fort).toBe(true);
    expect(aFort.questionsAsked).toBe(0);
    expect(aFort.currentTeam).toBe("B");
    const bFort = apply(aFort, { type: "FORTIFY" });
    expect(bFort.currentTeam).toBe("A");
    expect(() => apply(bFort, { type: "FORTIFY" })).toThrow();
  });
});

describe("turn options", () => {
  it("exposes only legal options and blocks war when used", () => {
    const s = makeState({
      owners: { indraprastha: "A", hastinapura: "A", magadha: "B" },
      markers: { A: "indraprastha" },
      warUsed: { A: true },
    });
    const opts = turnOptions(s);
    expect(opts.moves).toContain("hastinapura");
    expect(opts.wars).toEqual([]); // war already used
    expect(opts.canFortify).toBe(true);
    expect(opts.travels).toEqual([]);
  });
});
