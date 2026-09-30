// One-off tool: trace each territory's outline from the map artwork and emit
// SVG polygon paths. Run with: node scripts/extract-regions.mjs
import Jimp from "jimp";
import { writeFileSync } from "node:fs";

const IMG = "public/map.jpeg";
const OUT_TS = "src/engine/regions.ts";
const OUT_DEBUG = "C:/Users/Manan/AppData/Local/Temp/opencode/regions-debug.png";

const W = 1536;
const H = 1024;

const SEEDS = {
  hastinapura: [755, 145],
  gandhara: [470, 300],
  kamboja: [1030, 260],
  kuru: [1310, 355],
  matsya: [375, 480],
  indraprastha: [755, 375],
  magadha: [1045, 485],
  panchala: [725, 530],
  virata: [535, 665],
  dwarka: [255, 690],
  kosala: [795, 790],
  kashi: [1120, 660],
  anga: [960, 855],
  kalinga: [1185, 880],
  saurashtra: [430, 850],
};

function dilate(src, r) {
  if (r === 0) return src;
  const out = new Uint8Array(src.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let dy = -r; dy <= r && !s; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          if (src[yy * W + xx]) { s = 1; break; }
        }
      }
      out[y * W + x] = s;
    }
  }
  return out;
}

function erode(src, r) {
  if (r === 0) return src;
  const out = new Uint8Array(src.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let keep = 1;
      for (let dy = -r; dy <= r && keep; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          if (!src[yy * W + xx]) { keep = 0; break; }
        }
      }
      out[y * W + x] = keep;
    }
  }
  return out;
}

function rdp(points, eps) {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  let index = -1;
  let maxDist = 0;
  const dx = last[0] - first[0];
  const dy = last[1] - first[1];
  const denom = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const dist = Math.abs(dy * px - dx * py + last[0] * first[1] - last[1] * first[0]) / denom;
    if (dist > maxDist) { maxDist = dist; index = i; }
  }
  if (maxDist > eps) {
    const left = rdp(points.slice(0, index + 1), eps);
    const right = rdp(points.slice(index), eps);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

/** Marching-squares contour tracing of a binary mask; returns the largest loop. */
function traceContour(mask) {
  const key = (x, y) => `${Math.round(x * 2)},${Math.round(y * 2)}`;
  const segs = [];
  const val = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : mask[y * W + x]);
  for (let y = -1; y < H; y++) {
    for (let x = -1; x < W; x++) {
      const a = val(x, y);
      const b = val(x + 1, y);
      const c = val(x + 1, y + 1);
      const d = val(x, y + 1);
      const idx = a * 8 + b * 4 + c * 2 + d;
      const T = key(x + 0.5, y);
      const R = key(x + 1, y + 0.5);
      const B = key(x + 0.5, y + 1);
      const L = key(x, y + 0.5);
      const add = (p, q) => segs.push([p, q]);
      switch (idx) {
        case 1: case 14: add(L, B); break;
        case 2: case 13: add(B, R); break;
        case 3: case 12: add(L, R); break;
        case 4: case 11: add(T, R); break;
        case 6: case 9: add(T, B); break;
        case 7: case 8: add(T, L); break;
        case 5: add(T, R); add(B, L); break;
        case 10: add(T, L); add(B, R); break;
        default: break;
      }
    }
  }

  const adj = new Map();
  for (const [k1, k2] of segs) {
    if (!adj.has(k1)) adj.set(k1, []);
    if (!adj.has(k2)) adj.set(k2, []);
    adj.get(k1).push(k2);
    adj.get(k2).push(k1);
  }

  const ekey = (p, q) => (p < q ? `${p}|${q}` : `${q}|${p}`);
  const edgeUsed = new Set();
  let best = [];

  for (const [start] of adj) {
    for (const nb of adj.get(start)) {
      if (edgeUsed.has(ekey(start, nb))) continue;
      const loop = [start];
      edgeUsed.add(ekey(start, nb));
      let prev = start;
      let cur = nb;
      while (cur !== start) {
        loop.push(cur);
        const nbrs = adj.get(cur) ?? [];
        let next = null;
        for (const q of nbrs) {
          if (q !== prev && !edgeUsed.has(ekey(cur, q))) { next = q; break; }
        }
        if (next === null) break;
        edgeUsed.add(ekey(cur, next));
        prev = cur;
        cur = next;
      }
      if (loop.length > best.length) best = loop;
    }
  }

  const pts = best.map((k) => {
    const [a, b] = k.split(",");
    return [Number(a) / 2, Number(b) / 2];
  });
  return pts;
}

const image = await Jimp.read(IMG);
const { data } = image.bitmap;

const lum = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  lum[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
}

let wall = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) wall[i] = lum[i] < 110 ? 1 : 0;
wall = dilate(wall, 3);

const regions = {};
const warnings = [];

function findSeed(sx, sy) {
  let bx = -1;
  let by = -1;
  for (let y = sy - 45; y <= sy + 45; y += 3) {
    for (let x = sx - 45; x <= sx + 45; x += 3) {
      if (x < 6 || y < 6 || x >= W - 6 || y >= H - 6) continue;
      let ok = true;
      for (let dy = -6; dy <= 6 && ok; dy += 3) {
        for (let dx = -6; dx <= 6; dx += 3) {
          if (wall[(y + dy) * W + (x + dx)]) { ok = false; break; }
        }
      }
      if (ok) { bx = x; by = y; }
    }
  }
  return bx < 0 ? null : [bx, by];
}

for (const [id, [sx, sy]] of Object.entries(SEEDS)) {
  const seed = findSeed(sx, sy);
  if (!seed) { warnings.push(`${id}: no seed`); continue; }
  const [fx, fy] = seed;

  let mask = new Uint8Array(W * H);
  const stack = [fy * W + fx];
  mask[fy * W + fx] = 1;
  let count = 0;
  while (stack.length > 0) {
    const idx = stack.pop();
    count++;
    const x = idx % W;
    const y = (idx / W) | 0;
    if (x > 0 && !mask[idx - 1] && !wall[idx - 1]) { mask[idx - 1] = 1; stack.push(idx - 1); }
    if (x < W - 1 && !mask[idx + 1] && !wall[idx + 1]) { mask[idx + 1] = 1; stack.push(idx + 1); }
    if (y > 0 && !mask[idx - W] && !wall[idx - W]) { mask[idx - W] = 1; stack.push(idx - W); }
    if (y < H - 1 && !mask[idx + W] && !wall[idx + W]) { mask[idx + W] = 1; stack.push(idx + W); }
  }
  if (count > 260000) warnings.push(`${id}: leaked (${count}px)`);

  // nudge out past the wall inset, then close internal notches/peninsulas
  mask = dilate(mask, 2);
  mask = erode(dilate(mask, 7), 7);

  const contour = traceContour(mask);
  const simplified = rdp(contour, 2.0);
  const path =
    simplified
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${Math.round(x)} ${Math.round(y)}`)
      .join(" ") + " Z";
  regions[id] = path;
  console.log(`${id.padEnd(14)} pts=${simplified.length} px=${count}`);
}

const tsLines = [
  "// AUTO-GENERATED by scripts/extract-regions.mjs - do not edit by hand.",
  "// SVG path (1536x1024) for each territory, traced from public/map.jpeg.",
  "export const REGIONS: Record<string, string> = {",
];
for (const [k, v] of Object.entries(regions)) tsLines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
tsLines.push("};", "");
writeFileSync(OUT_TS, tsLines.join("\n"));

// ---- debug overlay ----
const debug = image.clone();
const colors = [
  [255, 0, 0], [0, 170, 0], [0, 0, 255], [255, 136, 0], [170, 0, 170],
  [0, 170, 170], [255, 0, 255], [128, 128, 0], [0, 100, 255], [255, 100, 100],
  [100, 255, 100], [200, 200, 0], [0, 200, 200], [150, 75, 0], [75, 0, 150],
];
function setPx(x, y, col) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const idx = (y * W + x) * 4;
  debug.bitmap.data[idx] = col[0];
  debug.bitmap.data[idx + 1] = col[1];
  debug.bitmap.data[idx + 2] = col[2];
}
let ci = 0;
for (const path of Object.values(regions)) {
  const nums = path.replace(/[MLZ]/g, " ").trim().split(/\s+/).map(Number);
  const pts = [];
  for (let i = 0; i < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  const col = colors[ci++ % colors.length];
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / steps);
      const y = Math.round(y0 + ((y1 - y0) * s) / steps);
      setPx(x, y, col);
      setPx(x + 1, y, col);
      setPx(x, y + 1, col);
    }
  }
}
await debug.writeAsync(OUT_DEBUG);
console.log("warnings:", warnings);
