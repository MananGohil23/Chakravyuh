import { describe, it, expect } from "vitest";
import { createInitialState, apply, undo } from "./engine.ts";
import { countTerritories, progressPossible } from "./core.ts";
import { validateAdjacency } from "./data.ts";
import type { GameState, Team } from "./types.ts";

/** Build a mid-game TURN state directly for focused rule tests. */
function scenario(opts: {
  owners: Record<string, Team>;
  markers: Partial<Record<Team, string>>;
  forts?: string[];
  warUsed?: Partial<Record<Team, boolean>>;
  firstTeam?: Team;
}): GameState {
  const base = createInitialState();
  const territories = { ...base.territories };
  for (const [id, team] of Object.entries(opts.owners)) {
    territories[id] = { owner: team, fort: opts.forts?.includes(id) ?? false };
  }
  return {
    ...base,
    territories,
    markers: { A: opts.markers.A ?? null, B: opts.markers.B ?? null },
    warUsed: { A: opts.warUsed?.A ?? false, B: opts.warUsed?.B ?? false },
    phase: "TURN",
    currentTeam: opts.firstTeam ?? "A",
  };
}

describe("data", () => {
  it("adjacency is symmetric, complete and connected", () => {
    const result = validateAdjacency();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("setup", () => {
  it("draws 6 distinct territories, 3 per team, 9 neutral", () => {
    let s = createInitialState();
    const draws = [
      "hastinapura",
      "gandhara",
      "indraprastha",
      "kuru",
      "kamboja",
      "matsya",
    ];
    for (const id of draws) s = apply(s, { type: "DRAW_TERRITORY", territoryId: id });
    const counts = countTerritories(s);
    expect(counts).toEqual({ A: 3, B: 3 });
    expect(Object.values(s.territories).filter((t) => t.owner === null)).toHaveLength(9);
    expect(s.phase).toBe("SETUP_MARKER");
    expect(() =>
      apply(s, { type: "DRAW_TERRITORY", territoryId: "hastinapura" }),
    ).toThrow();
  });
});

describe("move", () => {
  it("allows moving to an adjacent owned territory, rejects others", () => {
    const s = scenario({
      owners: { hastinapura: "A", indraprastha: "A", gandhara: "B" },
      markers: { A: "hastinapura" },
    });
    const moved = apply(s, { type: "MOVE", to: "indraprastha" });
    expect(moved.markers.A).toBe("indraprastha");
    expect(moved.currentTeam).toBe("B");
    expect(() => apply(s, { type: "MOVE", to: "gandhara" })).toThrow();
    expect(() => apply(s, { type: "MOVE", to: "kuru" })).toThrow();
  });
});

describe("conquer", () => {
  it("flips a neutral on a correct answer and leaves the marker put", () => {
    const s = scenario({
      owners: { indraprastha: "A" },
      markers: { A: "indraprastha" },
    });
    const asked = apply(s, { type: "DECLARE_CONQUER", to: "magadha" });
    expect(asked.phase).toBe("QUESTION");
    expect(asked.questionsAsked).toBe(1);
    const won = apply(asked, { type: "RESOLVE_QUESTION", correct: true });
    expect(won.territories.magadha.owner).toBe("A");
    expect(won.markers.A).toBe("indraprastha");
    expect(won.currentTeam).toBe("B");
  });

  it("changes nothing on a wrong answer and passes the turn", () => {
    const s = scenario({
      owners: { indraprastha: "A" },
      markers: { A: "indraprastha" },
    });
    const asked = apply(s, { type: "DECLARE_CONQUER", to: "magadha" });
    const lost = apply(asked, { type: "RESOLVE_QUESTION", correct: false });
    expect(lost.territories.magadha.owner).toBe(null);
    expect(lost.currentTeam).toBe("B");
  });
});

describe("travel", () => {
  it("defers the marker move to the start of the team's next turn", () => {
    const s = scenario({
      owners: { indraprastha: "A", kuru: "A", kashi: "B" },
      markers: { A: "indraprastha", B: "kashi" },
    });
    const asked = apply(s, { type: "DECLARE_TRAVEL", to: "kuru" });
    const pending = apply(asked, { type: "RESOLVE_QUESTION", correct: true });
    expect(pending.pendingTravel).toEqual({ team: "A", to: "kuru" });
    expect(pending.markers.A).toBe("indraprastha");
    expect(pending.currentTeam).toBe("B");

    // B takes any turn; when control returns to A, the travel resolves first.
    const afterB = apply(pending, { type: "FORTIFY" });
    expect(afterB.currentTeam).toBe("A");
    expect(afterB.markers.A).toBe("kuru");
    expect(afterB.pendingTravel).toBe(null);
  });
});

describe("war", () => {
  it("is rejected when already used or when no enemy is adjacent", () => {
    const s = scenario({
      owners: { indraprastha: "A", magadha: "B", kuru: "B" },
      markers: { A: "indraprastha" },
    });
    expect(() => apply(s, { type: "DECLARE_WAR", target: "kuru" })).toThrow();
    const used = scenario({
      owners: { indraprastha: "A", magadha: "B" },
      markers: { A: "indraprastha" },
      warUsed: { A: true },
    });
    expect(() => apply(used, { type: "DECLARE_WAR", target: "magadha" })).toThrow();
  });

  it("captures only the contested territory", () => {
    const s = scenario({
      owners: { indraprastha: "A", magadha: "B" },
      markers: { A: "indraprastha" },
    });
    const before = countTerritories(s).A;
    let w = apply(s, { type: "DECLARE_WAR", target: "magadha" });
    const answers = [
      [true, false],
      [true, false],
      [true, false],
      [false, true],
      [false, true],
    ] as const;
    for (const [a, b] of answers) w = apply(w, { type: "WAR_ANSWER", aCorrect: a, bCorrect: b });
    expect(w.territories.magadha.owner).toBe("A");
    expect(w.war).toBe(null);
    // exactly one territory gained, no bonus neutral
    expect(countTerritories(w).A).toBe(before + 1);
  });

  it("captures only the contested territory even when it was fortified", () => {
    const s = scenario({
      owners: { indraprastha: "A", magadha: "B" },
      markers: { A: "indraprastha" },
      forts: ["magadha"],
    });
    const before = countTerritories(s).A;
    let w = apply(s, { type: "DECLARE_WAR", target: "magadha" });
    const answers = [
      [true, false],
      [true, false],
      [true, false],
      [false, true],
      [false, true],
    ] as const;
    for (const [a, b] of answers) w = apply(w, { type: "WAR_ANSWER", aCorrect: a, bCorrect: b });
    expect(w.territories.magadha.owner).toBe("A");
    expect(w.territories.magadha.fort).toBe(false);
    expect(countTerritories(w).A).toBe(before + 1);
  });
});

describe("undo & endgame", () => {
  it("undo restores the exact previous state", () => {
    let s = createInitialState();
    for (const id of ["hastinapura", "gandhara", "indraprastha", "kuru", "kamboja", "matsya"]) {
      s = apply(s, { type: "DRAW_TERRITORY", territoryId: id });
    }
    s = apply(s, { type: "PLACE_MARKER", team: "A", territoryId: "hastinapura" });
    s = apply(s, { type: "PLACE_MARKER", team: "B", territoryId: "gandhara" });
    s = apply(s, { type: "SET_FIRST_TEAM", team: "A" });
    s = apply(s, { type: "START_GAME" });
    const moved = apply(s, { type: "MOVE", to: "indraprastha" });
    expect(moved.markers.A).toBe("indraprastha");
    const back = undo(moved);
    expect(back.markers.A).toBe("hastinapura");
    expect(back.log).toHaveLength(s.log.length);
  });

  it("detects when no progress is possible", () => {
    const s = scenario({
      owners: {
        hastinapura: "A",
        indraprastha: "A",
        gandhara: "A",
        kamboja: "A",
        kuru: "A",
        magadha: "A",
        panchala: "A",
        virata: "A",
        matsya: "A",
        dwarka: "A",
        kosala: "A",
        kashi: "A",
        anga: "A",
        kalinga: "A",
        saurashtra: "A",
      },
      markers: { A: "hastinapura", B: "kalinga" },
      warUsed: { A: true, B: true },
    });
    expect(progressPossible(s)).toBe(false);
    const fortified = apply(s, { type: "FORTIFY" });
    expect(fortified.phase).toBe("GAME_OVER");
    expect(fortified.winner).toBe("A");
  });
});
