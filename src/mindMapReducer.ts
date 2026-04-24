import type { DraftRect, GridMode, HistorySnapshot, MindEdge, MindMapState, MindNode, Viewport } from "./types";
import { dist, nodeCenter, normalizeRect } from "./geometry";
import { VIEWPORT_SCALE_MAX, VIEWPORT_SCALE_MIN } from "./viewportConstants";

const STORAGE_KEY = "001program-mindmap-v1";
const MIN_NODE_W = 96;
const MIN_NODE_H = 56;
export const MIN_DRAFT = 24;
const AUTO_LINK_RADIUS = 100;
const MAX_HISTORY = 120;

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export const initialState: MindMapState = {
  nodes: {},
  nodeOrder: [],
  edges: [],
  viewport: { x: 0, y: 0, scale: 1 },
  gridMode: "grid",
  selectedNodeId: null,
  selectedEdgeId: null,
  draftRect: null,
  linkingFromId: null,
  linkCursor: null,
  panPointerId: null,
  panLast: null,
  dragNode: null,
  historyPast: [],
  historyFuture: [],
};

export type MindMapAction =
  | { type: "viewport/pan"; dx: number; dy: number }
  | { type: "viewport/zoom"; lx: number; ly: number; nextScale: number }
  | { type: "draft/start"; rect: DraftRect }
  | { type: "draft/update"; rect: DraftRect }
  | { type: "draft/cancel" }
  | { type: "draft/commit" }
  | { type: "node/startDrag"; id: string }
  | { type: "node/move"; id: string; x: number; y: number }
  | { type: "node/endDrag"; id: string; moved: boolean }
  | { type: "link/start"; fromId: string; x: number; y: number }
  | { type: "link/move"; x: number; y: number }
  | { type: "link/end"; targetId: string | null }
  | { type: "select/node"; id: string | null }
  | { type: "select/edge"; id: string | null }
  | { type: "node/updateText"; id: string; text: string }
  | { type: "node/commitText"; id: string }
  | { type: "node/addImages"; id: string; images: MindNode["images"] }
  | { type: "node/setStyle"; id: string; fontSize?: number; fontFamily?: string; borderColor?: string }
  | { type: "edge/setStyle"; id: string; color?: string; width?: number }
  | { type: "node/setBoundsPreview"; id: string; x: number; y: number; width: number; height: number }
  | { type: "node/setBoundsCommit"; id: string }
  | { type: "node/delete"; id: string }
  | { type: "delete/selection" }
  | { type: "grid/set"; mode: GridMode }
  | { type: "persist/load"; state: Partial<MindMapState> }
  | { type: "edge/remove"; id: string }
  | { type: "board/clear" }
  | { type: "pan/start"; pointerId: number; sx: number; sy: number }
  | { type: "pan/move"; sx: number; sy: number }
  | { type: "pan/end" }
  | { type: "history/undo" }
  | { type: "history/redo" };

function snapshotOf(state: MindMapState): HistorySnapshot {
  return {
    nodes: state.nodes,
    nodeOrder: state.nodeOrder,
    edges: state.edges,
    viewport: state.viewport,
    gridMode: state.gridMode,
    selectedNodeId: state.selectedNodeId,
    selectedEdgeId: state.selectedEdgeId,
  };
}

function withHistory(prev: MindMapState, next: MindMapState): MindMapState {
  if (next === prev) return prev;
  const past = [...prev.historyPast, snapshotOf(prev)];
  if (past.length > MAX_HISTORY) past.shift();
  return { ...next, historyPast: past, historyFuture: [] };
}

function closestNodeForAutoLink(
  nodes: Record<string, MindNode>,
  order: string[],
  selfId: string,
  self: MindNode
): string | null {
  const cSelf = nodeCenter(self);
  let best: { id: string; d: number } | null = null;
  for (const id of order) {
    if (id === selfId) continue;
    const n = nodes[id];
    if (!n) continue;
    const d = dist(cSelf, nodeCenter(n));
    if (d <= AUTO_LINK_RADIUS && (!best || d < best.d)) best = { id, d };
  }
  return best?.id ?? null;
}

export function mindMapReducer(state: MindMapState, action: MindMapAction): MindMapState {
  switch (action.type) {
    case "history/undo": {
      const last = state.historyPast[state.historyPast.length - 1];
      if (!last) return state;
      const rest = state.historyPast.slice(0, -1);
      return {
        ...state,
        ...last,
        draftRect: null,
        linkingFromId: null,
        linkCursor: null,
        panPointerId: null,
        panLast: null,
        dragNode: null,
        historyPast: rest,
        historyFuture: [snapshotOf(state), ...state.historyFuture].slice(0, MAX_HISTORY),
      };
    }
    case "history/redo": {
      const nextSnap = state.historyFuture[0];
      if (!nextSnap) return state;
      return {
        ...state,
        ...nextSnap,
        draftRect: null,
        linkingFromId: null,
        linkCursor: null,
        panPointerId: null,
        panLast: null,
        dragNode: null,
        historyPast: [...state.historyPast, snapshotOf(state)].slice(-MAX_HISTORY),
        historyFuture: state.historyFuture.slice(1),
      };
    }
    case "viewport/pan":
      return {
        ...state,
        viewport: {
          ...state.viewport,
          x: state.viewport.x + action.dx,
          y: state.viewport.y + action.dy,
        },
      };
    case "viewport/zoom": {
      const { lx, ly, nextScale: raw } = action;
      const nextScale = Math.min(VIEWPORT_SCALE_MAX, Math.max(VIEWPORT_SCALE_MIN, raw));
      const { x: vx, y: vy, scale: prev } = state.viewport;
      if (nextScale === prev) return state;
      const worldX = (lx - vx) / prev;
      const worldY = (ly - vy) / prev;
      const nx = lx - worldX * nextScale;
      const ny = ly - worldY * nextScale;
      return {
        ...state,
        viewport: { x: nx, y: ny, scale: nextScale },
      };
    }
    case "draft/start":
      return { ...state, draftRect: action.rect, selectedNodeId: null, selectedEdgeId: null };
    case "draft/update":
      return state.draftRect ? { ...state, draftRect: action.rect } : state;
    case "draft/cancel":
      return { ...state, draftRect: null };
    case "draft/commit": {
      if (!state.draftRect) return state;
      const { x, y, width, height } = normalizeRect(state.draftRect);
      if (width < MIN_DRAFT || height < MIN_DRAFT) return { ...state, draftRect: null };
      const id = uid("n");
      const node: MindNode = {
        id,
        x,
        y,
        width: Math.max(MIN_NODE_W, width),
        height: Math.max(MIN_NODE_H, height),
        text: "",
        fontSize: 15,
        fontFamily: "system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        borderColor: "#e2e4e8",
        images: [],
      };
      return withHistory(state, {
        ...state,
        draftRect: null,
        nodes: { ...state.nodes, [id]: node },
        nodeOrder: [...state.nodeOrder, id],
        selectedNodeId: id,
        selectedEdgeId: null,
      });
    }
    case "node/startDrag":
      return {
        ...state,
        dragNode: { id: action.id },
        selectedNodeId: action.id,
        selectedEdgeId: null,
      };
    case "node/move": {
      const n = state.nodes[action.id];
      if (!n) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.id]: { ...n, x: action.x, y: action.y },
        },
      };
    }
    case "node/endDrag": {
      const n = state.nodes[action.id];
      if (!n) return { ...state, dragNode: null };
      if (!action.moved) return { ...state, dragNode: null };
      const other = closestNodeForAutoLink(state.nodes, state.nodeOrder, action.id, n);
      if (!other || other === action.id) return { ...state, dragNode: null };
      const exists = state.edges.some((e) => e.from === action.id && e.to === other);
      const edges = exists
        ? state.edges
        : [...state.edges, { id: uid("e"), from: action.id, to: other, color: "#94a3b8", width: 2 }];
      return withHistory(state, { ...state, dragNode: null, edges });
    }
    case "link/start":
      return {
        ...state,
        linkingFromId: action.fromId,
        linkCursor: { x: action.x, y: action.y },
        selectedNodeId: action.fromId,
        selectedEdgeId: null,
      };
    case "link/move":
      return state.linkingFromId ? { ...state, linkCursor: { x: action.x, y: action.y } } : state;
    case "link/end": {
      const from = state.linkingFromId;
      if (!from) return { ...state, linkingFromId: null, linkCursor: null };
      const to = action.targetId;
      const next = { ...state, linkingFromId: null, linkCursor: null };
      if (!to || to === from) return next;
      return withHistory(state, {
        ...next,
        edges: [...next.edges, { id: uid("e"), from, to, color: "#94a3b8", width: 2 }],
        selectedNodeId: to,
      });
    }
    case "select/node":
      return { ...state, selectedNodeId: action.id, selectedEdgeId: null };
    case "select/edge":
      return { ...state, selectedEdgeId: action.id, selectedNodeId: null };
    case "node/updateText": {
      const n = state.nodes[action.id];
      if (!n) return state;
      if (n.text === action.text) return state;
      return {
        ...state,
        nodes: { ...state.nodes, [action.id]: { ...n, text: action.text } },
      };
    }
    case "node/commitText": {
      if (!state.nodes[action.id]) return state;
      return withHistory(state, { ...state });
    }
    case "node/addImages": {
      const n = state.nodes[action.id];
      if (!n) return state;
      return withHistory(state, {
        ...state,
        nodes: {
          ...state.nodes,
          [action.id]: { ...n, images: [...n.images, ...action.images] },
        },
      });
    }
    case "node/setStyle": {
      const n = state.nodes[action.id];
      if (!n) return state;
      return withHistory(state, {
        ...state,
        nodes: {
          ...state.nodes,
          [action.id]: {
            ...n,
            fontSize: action.fontSize ?? n.fontSize,
            fontFamily: action.fontFamily ?? n.fontFamily,
            borderColor: action.borderColor ?? n.borderColor ?? "#e2e4e8",
          },
        },
      });
    }
    case "edge/setStyle":
      return withHistory(state, {
        ...state,
        edges: state.edges.map((e) =>
          e.id === action.id
            ? {
                ...e,
                color: action.color ?? e.color ?? "#94a3b8",
                width: action.width ?? e.width ?? 2,
              }
            : e
        ),
      });
    case "node/setBoundsPreview": {
      const n = state.nodes[action.id];
      if (!n) return state;
      if (n.x === action.x && n.y === action.y && n.width === action.width && n.height === action.height) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.id]: {
            ...n,
            x: action.x,
            y: action.y,
            width: action.width,
            height: action.height,
          },
        },
      };
    }
    case "node/setBoundsCommit": {
      if (!state.nodes[action.id]) return state;
      return withHistory(state, { ...state });
    }
    case "node/delete": {
      const id = action.id;
      if (!state.nodes[id]) return state;
      const { [id]: _, ...rest } = state.nodes;
      return withHistory(state, {
        ...state,
        nodes: rest,
        nodeOrder: state.nodeOrder.filter((x) => x !== id),
        edges: state.edges.filter((e) => e.from !== id && e.to !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      });
    }
    case "delete/selection": {
      if (state.selectedEdgeId) {
        return withHistory(state, {
          ...state,
          edges: state.edges.filter((e) => e.id !== state.selectedEdgeId),
          selectedEdgeId: null,
        });
      }
      if (state.selectedNodeId) {
        const id = state.selectedNodeId;
        const { [id]: _, ...rest } = state.nodes;
        return withHistory(state, {
          ...state,
          nodes: rest,
          nodeOrder: state.nodeOrder.filter((x) => x !== id),
          edges: state.edges.filter((e) => e.from !== id && e.to !== id),
          selectedNodeId: null,
        });
      }
      return state;
    }
    case "edge/remove":
      return withHistory(state, {
        ...state,
        edges: state.edges.filter((e) => e.id !== action.id),
        selectedEdgeId: state.selectedEdgeId === action.id ? null : state.selectedEdgeId,
      });
    case "board/clear":
      return withHistory(state, {
        ...initialState,
        viewport: state.viewport,
        gridMode: state.gridMode,
      });
    case "grid/set":
      return { ...state, gridMode: action.mode };
    case "persist/load": {
      const p = action.state;
      const vp = p.viewport as Viewport | undefined;
      const viewport: Viewport =
        vp && typeof vp.x === "number" && typeof vp.y === "number" && typeof vp.scale === "number"
          ? {
              x: vp.x,
              y: vp.y,
              scale: Math.min(VIEWPORT_SCALE_MAX, Math.max(VIEWPORT_SCALE_MIN, vp.scale)),
            }
          : initialState.viewport;
      const nodes =
        p.nodes && typeof p.nodes === "object"
          ? Object.fromEntries(
              Object.entries(p.nodes as Record<string, MindNode>).map(([id, n]) => [
                id,
                { ...n, borderColor: n.borderColor ?? "#e2e4e8" },
              ])
            )
          : {};
      const nodeOrder = Array.isArray(p.nodeOrder) ? (p.nodeOrder as string[]) : [];
      const edges = Array.isArray(p.edges)
        ? (p.edges as MindEdge[]).map((e) => ({
            ...e,
            color: e.color ?? "#94a3b8",
            width: e.width ?? 2,
          }))
        : [];
      const gridMode: GridMode = p.gridMode === "plain" ? "plain" : "grid";
      return withHistory(state, {
        ...initialState,
        nodes,
        nodeOrder,
        edges,
        viewport,
        gridMode,
        selectedNodeId: null,
        selectedEdgeId: null,
      });
    }
    case "pan/start":
      return { ...state, panPointerId: action.pointerId, panLast: { sx: action.sx, sy: action.sy } };
    case "pan/move": {
      if (state.panLast == null) return state;
      const dx = action.sx - state.panLast.sx;
      const dy = action.sy - state.panLast.sy;
      return {
        ...state,
        viewport: { ...state.viewport, x: state.viewport.x + dx, y: state.viewport.y + dy },
        panLast: { sx: action.sx, sy: action.sy },
      };
    }
    case "pan/end":
      return { ...state, panPointerId: null, panLast: null };
    default:
      return state;
  }
}

export function serializeState(s: MindMapState): string {
  const { nodes, nodeOrder, edges, viewport, gridMode } = s;
  return JSON.stringify({ nodes, nodeOrder, edges, viewport, gridMode });
}

export function tryLoadState(json: string): Partial<MindMapState> | null {
  try {
    const o = JSON.parse(json) as Partial<MindMapState>;
    if (!o || typeof o !== "object") return null;
    return o;
  } catch {
    return null;
  }
}

export function loadFromStorage(): Partial<MindMapState> | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return tryLoadState(raw);
}

export function saveToStorage(s: MindMapState): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, serializeState(s));
}

export { STORAGE_KEY, AUTO_LINK_RADIUS };
