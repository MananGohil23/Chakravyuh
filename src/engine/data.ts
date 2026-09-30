import type { TerritoryMeta } from "./types.ts";

/**
 * Territory metadata extracted from the organizer's map image (1536x1024).
 *
 * Adjacency was traced from the connector dots on the map image and confirmed
 * correct by the organizer. See `validateAdjacency` and the data test for the
 * invariants enforced (symmetric, complete, connected).
 */
export const TERRITORIES: readonly TerritoryMeta[] = [
  { id: "hastinapura", number: 1, name: "Hastinapura", cx: 755, cy: 145, r: 78 },
  { id: "gandhara", number: 2, name: "Gandhara", cx: 470, cy: 300, r: 88 },
  { id: "kamboja", number: 3, name: "Kamboja", cx: 1030, cy: 260, r: 82 },
  { id: "kuru", number: 4, name: "Kuru", cx: 1310, cy: 355, r: 92 },
  { id: "matsya", number: 5, name: "Matsya", cx: 375, cy: 480, r: 95 },
  { id: "indraprastha", number: 6, name: "Indraprastha", cx: 755, cy: 375, r: 92 },
  { id: "magadha", number: 7, name: "Magadha", cx: 1045, cy: 485, r: 88 },
  { id: "panchala", number: 8, name: "Panchala", cx: 725, cy: 530, r: 88 },
  { id: "virata", number: 9, name: "Virata", cx: 535, cy: 665, r: 92 },
  { id: "dwarka", number: 10, name: "Dwarka", cx: 255, cy: 690, r: 95 },
  { id: "kosala", number: 11, name: "Kosala", cx: 795, cy: 790, r: 95 },
  { id: "kashi", number: 12, name: "Kashi", cx: 1120, cy: 660, r: 92 },
  { id: "anga", number: 13, name: "Anga", cx: 960, cy: 855, r: 88 },
  { id: "kalinga", number: 14, name: "Kalinga", cx: 1185, cy: 880, r: 88 },
  { id: "saurashtra", number: 15, name: "Saurashtra", cx: 430, cy: 850, r: 95 },
];

export const TERRITORY_IDS: readonly string[] = TERRITORIES.map((t) => t.id);

export const TERRITORY_BY_ID: Record<string, TerritoryMeta> = Object.fromEntries(
  TERRITORIES.map((t) => [t.id, t]),
);

/** Undirected adjacency graph (organizer-confirmed). */
export const ADJACENCY: Record<string, string[]> = {
  hastinapura: ["gandhara", "kamboja", "indraprastha"],
  gandhara: ["hastinapura", "matsya", "indraprastha"],
  kamboja: ["hastinapura", "kuru", "indraprastha", "magadha"],
  kuru: ["kamboja", "magadha", "kashi"],
  matsya: ["gandhara", "panchala", "virata", "dwarka"],
  indraprastha: ["hastinapura", "gandhara", "kamboja", "magadha", "panchala"],
  magadha: ["kamboja", "kuru", "indraprastha", "panchala", "kashi"],
  panchala: ["matsya", "indraprastha", "magadha", "virata", "kosala", "kashi"],
  virata: ["matsya", "panchala", "dwarka", "kosala"],
  dwarka: ["matsya", "virata", "saurashtra"],
  kosala: ["panchala", "virata", "anga", "saurashtra"],
  kashi: ["kuru", "magadha", "panchala", "anga", "kalinga"],
  anga: ["kosala", "kashi", "kalinga"],
  kalinga: ["kashi", "anga"],
  saurashtra: ["dwarka", "kosala"],
};

export interface AdjacencyValidation {
  ok: boolean;
  errors: string[];
}

/** Enforces the invariants the rules engine relies on. */
export function validateAdjacency(
  adjacency: Record<string, string[]> = ADJACENCY,
  ids: readonly string[] = TERRITORY_IDS,
): AdjacencyValidation {
  const errors: string[] = [];
  const idSet = new Set(ids);

  for (const id of ids) {
    const neighbours = adjacency[id];
    if (!neighbours) {
      errors.push(`missing adjacency entry for "${id}"`);
      continue;
    }
    if (new Set(neighbours).size !== neighbours.length) {
      errors.push(`"${id}" has duplicate neighbours`);
    }
    if (neighbours.includes(id)) {
      errors.push(`"${id}" is adjacent to itself`);
    }
    for (const n of neighbours) {
      if (!idSet.has(n)) {
        errors.push(`"${id}" references unknown territory "${n}"`);
        continue;
      }
      if (!adjacency[n]?.includes(id)) {
        errors.push(`asymmetric edge: "${id}" -> "${n}" has no reverse`);
      }
    }
  }

  // connectivity (all 15 reachable from the first id)
  if (ids.length > 0) {
    const start = ids[0];
    const seen = new Set<string>();
    const stack = [start];
    while (stack.length > 0) {
      const cur = stack.pop() as string;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const n of adjacency[cur] ?? []) stack.push(n);
    }
    if (seen.size !== ids.length) {
      errors.push(
        `graph not connected: reached ${seen.size}/${ids.length} territories`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

export function neighboursOf(id: string): string[] {
  return ADJACENCY[id] ?? [];
}

export function areAdjacent(a: string, b: string): boolean {
  return neighboursOf(a).includes(b);
}
