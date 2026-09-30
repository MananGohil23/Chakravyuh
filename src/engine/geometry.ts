import { REGIONS } from "./regions.ts";

export type Point = [number, number];

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RegionGeom {
  points: Point[];
  centroid: Point;
  bbox: BBox;
}

/** Parse an "M x y L x y ... Z" path into points. */
export function parsePoints(d: string): Point[] {
  const nums = d.replace(/[MLZ]/g, " ").trim().split(/\s+/).map(Number);
  const pts: Point[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}

export function polygonCentroid(points: Point[]): Point {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-6) {
    const n = points.length || 1;
    const sx = points.reduce((s, p) => s + p[0], 0);
    const sy = points.reduce((s, p) => s + p[1], 0);
    return [sx / n, sy / n];
  }
  return [cx / (6 * area), cy / (6 * area)];
}

export function bboxOf(points: Point[]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export const REGION_GEOM: Record<string, RegionGeom> = Object.fromEntries(
  Object.entries(REGIONS).map(([id, d]) => {
    const points = parsePoints(d);
    return [id, { points, centroid: polygonCentroid(points), bbox: bboxOf(points) }];
  }),
);
