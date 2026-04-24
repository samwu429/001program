import type { MindNode } from "./types";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function resizeNodeBounds(
  handle: ResizeHandle,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
  wx: number,
  wy: number,
  minW = 96,
  minH = 56
): { x: number; y: number; width: number; height: number } {
  const right = ox + ow;
  const bottom = oy + oh;
  switch (handle) {
    case "se":
      return {
        x: ox,
        y: oy,
        width: Math.max(minW, wx - ox),
        height: Math.max(minH, wy - oy),
      };
    case "e":
      return { x: ox, y: oy, width: Math.max(minW, wx - ox), height: oh };
    case "s":
      return { x: ox, y: oy, width: ow, height: Math.max(minH, wy - oy) };
    case "w": {
      const nw = Math.max(minW, right - wx);
      return { x: right - nw, y: oy, width: nw, height: oh };
    }
    case "n": {
      const nh = Math.max(minH, bottom - wy);
      return { x: ox, y: bottom - nh, width: ow, height: nh };
    }
    case "nw": {
      const nw = Math.max(minW, right - wx);
      const nh = Math.max(minH, bottom - wy);
      return { x: right - nw, y: bottom - nh, width: nw, height: nh };
    }
    case "ne": {
      const nw = Math.max(minW, wx - ox);
      const nh = Math.max(minH, bottom - wy);
      return { x: ox, y: bottom - nh, width: nw, height: nh };
    }
    case "sw": {
      const nw = Math.max(minW, right - wx);
      const nh = Math.max(minH, wy - oy);
      return { x: right - nw, y: oy, width: nw, height: nh };
    }
    default:
      return { x: ox, y: oy, width: ow, height: oh };
  }
}

export function nodeCenter(n: MindNode): { x: number; y: number } {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
}

export function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function distPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - x1, py - y1);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - x2, py - y2);
  const t = c1 / c2;
  const projX = x1 + t * vx;
  const projY = y1 + t * vy;
  return Math.hypot(px - projX, py - projY);
}

export function normalizeRect(d: { x1: number; y1: number; x2: number; y2: number }) {
  const x = Math.min(d.x1, d.x2);
  const y = Math.min(d.y1, d.y2);
  const width = Math.abs(d.x2 - d.x1);
  const height = Math.abs(d.y2 - d.y1);
  return { x, y, width, height };
}
