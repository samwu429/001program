import { useCallback, useEffect, useMemo, useRef } from "react";
import type { MindMapAction } from "../mindMapReducer";
import type { MindEdge, MindMapState, MindNode } from "../types";
import { distPointToSegment, nodeCenter, normalizeRect } from "../geometry";
import { NodeBox } from "./NodeBox";

type Props = {
  state: MindMapState;
  dispatch: React.Dispatch<MindMapAction>;
};

function pairOffset(edges: MindEdge[], e: MindEdge): number {
  const same = edges.filter((x) => x.from === e.from && x.to === e.to);
  const i = same.findIndex((x) => x.id === e.id);
  const spread = 12;
  return (i - (same.length - 1) / 2) * spread;
}

function edgeSegment(
  a: MindNode,
  b: MindNode,
  edges: MindEdge[],
  e: MindEdge
): { x1: number; y1: number; x2: number; y2: number } {
  const ca = nodeCenter(a);
  const cb = nodeCenter(b);
  const dx = cb.x - ca.x;
  const dy = cb.y - ca.y;
  const len = Math.hypot(dx, dy) || 1;
  const off = pairOffset(edges, e);
  const px = (-dy / len) * off;
  const py = (dx / len) * off;
  return { x1: ca.x + px, y1: ca.y + py, x2: cb.x + px, y2: cb.y + py };
}

export function MindMapCanvas({ state, dispatch }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef({ dx: 0, dy: 0 });
  const draftPointerId = useRef<number | null>(null);
  const panPointerId = useRef<number | null>(null);
  const draftAnchor = useRef<{ x1: number; y1: number } | null>(null);

  const { viewport, gridMode, nodes, nodeOrder, edges, draftRect, linkingFromId, linkCursor } = state;

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      const lx = clientX - r.left;
      const ly = clientY - r.top;
      const { x: vx, y: vy, scale } = viewport;
      return { x: (lx - vx) / scale, y: (ly - vy) / scale };
    },
    [viewport]
  );

  useEffect(() => {
    if (!linkingFromId) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") dispatch({ type: "link/end", targetId: null });
    };
    window.addEventListener("keydown", onKey);
    const move = (ev: PointerEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const lx = ev.clientX - r.left;
      const ly = ev.clientY - r.top;
      const { x: vx, y: vy, scale } = viewport;
      dispatch({ type: "link/move", x: (lx - vx) / scale, y: (ly - vy) / scale });
    };
    const up = (ev: PointerEvent) => {
      if (ev.button !== 2) return;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const card = el?.closest?.("[data-node-id]") as HTMLElement | null;
      const targetId = card?.dataset.nodeId ?? null;
      dispatch({ type: "link/end", targetId });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dispatch, linkingFromId, viewport]);

  const hitWorld = 10;
  const pickNearestEdgeId = useCallback(
    (wx: number, wy: number) => {
      let best: { id: string; d: number } | null = null;
      for (const edge of edges) {
        const a = nodes[edge.from];
        const b = nodes[edge.to];
        if (!a || !b) continue;
        const seg = edgeSegment(a, b, edges, edge);
        const d = distPointToSegment(wx, wy, seg.x1, seg.y1, seg.x2, seg.y2);
        if (d <= hitWorld && (!best || d < best.d)) best = { id: edge.id, d };
      }
      return best?.id ?? null;
    },
    [edges, nodes]
  );

  const onBoardPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 0) {
        e.preventDefault();
        const w = screenToWorld(e.clientX, e.clientY);
        const edgeId = pickNearestEdgeId(w.x, w.y);
        if (edgeId) {
          dispatch({ type: "select/edge", id: edgeId });
          return;
        }
        draftPointerId.current = e.pointerId;
        draftAnchor.current = { x1: w.x, y1: w.y };
        dispatch({ type: "draft/start", rect: { x1: w.x, y1: w.y, x2: w.x, y2: w.y } });
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
      if (e.button === 2 || e.button === 1) {
        e.preventDefault();
        panPointerId.current = e.pointerId;
        dispatch({ type: "pan/start", pointerId: e.pointerId, sx: e.clientX, sy: e.clientY });
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [dispatch, pickNearestEdgeId, screenToWorld]
  );

  const onBoardPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draftPointerId.current === e.pointerId && e.buttons === 1 && draftAnchor.current) {
        const w = screenToWorld(e.clientX, e.clientY);
        dispatch({
          type: "draft/update",
          rect: { ...draftAnchor.current, x2: w.x, y2: w.y },
        });
      }
      /* 部分环境下拖右键时 e.buttons 不稳定，只要仍是当前平移指针就继续跟手 */
      if (panPointerId.current === e.pointerId) {
        dispatch({ type: "pan/move", sx: e.clientX, sy: e.clientY });
      }
    },
    [dispatch, screenToWorld]
  );

  const onBoardPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (draftPointerId.current === e.pointerId && e.button === 0) {
        draftPointerId.current = null;
        draftAnchor.current = null;
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        dispatch({ type: "draft/commit" });
      }
      if (panPointerId.current === e.pointerId && (e.button === 2 || e.button === 1)) {
        panPointerId.current = null;
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        dispatch({ type: "pan/end" });
      }
    },
    [dispatch]
  );

  const onBoardPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (draftPointerId.current === e.pointerId) {
        draftPointerId.current = null;
        draftAnchor.current = null;
        dispatch({ type: "draft/cancel" });
      }
      if (panPointerId.current === e.pointerId) {
        panPointerId.current = null;
        dispatch({ type: "pan/end" });
      }
    },
    [dispatch]
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const lx = e.clientX - r.left;
      const ly = e.clientY - r.top;
      const prev = viewport.scale;
      const nextScale = Math.min(2.5, Math.max(0.35, prev * (e.deltaY > 0 ? 0.92 : 1.08)));
      dispatch({ type: "viewport/zoom", lx, ly, nextScale });
    },
    [dispatch, viewport.scale]
  );

  const handleStartNodeDrag = useCallback(
    (id: string, clientX: number, clientY: number) => {
      const w = screenToWorld(clientX, clientY);
      const n = state.nodes[id];
      if (!n) return;
      grabRef.current = { dx: w.x - n.x, dy: w.y - n.y };
      dispatch({ type: "node/startDrag", id });
    },
    [dispatch, screenToWorld, state.nodes]
  );

  const handleMoveNodeDrag = useCallback(
    (id: string, clientX: number, clientY: number) => {
      const w = screenToWorld(clientX, clientY);
      dispatch({
        type: "node/move",
        id,
        x: w.x - grabRef.current.dx,
        y: w.y - grabRef.current.dy,
      });
    },
    [dispatch, screenToWorld]
  );

  const handleEndNodeDrag = useCallback(
    (id: string, moved: boolean) => {
      dispatch({ type: "node/endDrag", id, moved });
    },
    [dispatch]
  );

  const handleStartLink = useCallback(
    (fromId: string, clientX: number, clientY: number) => {
      const w = screenToWorld(clientX, clientY);
      dispatch({ type: "link/start", fromId, x: w.x, y: w.y });
    },
    [dispatch, screenToWorld]
  );

  const draftStyle = useMemo(() => {
    if (!draftRect) return null;
    const { x, y, width, height } = normalizeRect(draftRect);
    return { left: x, top: y, width, height };
  }, [draftRect]);

  const linkPreview = useMemo(() => {
    if (!linkingFromId || !linkCursor) return null;
    const n = nodes[linkingFromId];
    if (!n) return null;
    const c = nodeCenter(n);
    return { x1: c.x, y1: c.y, x2: linkCursor.x, y2: linkCursor.y };
  }, [linkCursor, linkingFromId, nodes]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = document.activeElement;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      if (t instanceof HTMLElement && t.isContentEditable) return;
      if (t instanceof HTMLElement && t.closest("[data-node-editor]")) return;
      e.preventDefault();
      dispatch({ type: "delete/selection" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);

  return (
    <div
      id="mindmap-canvas-wrap"
      ref={wrapRef}
      className={`canvas-wrap${gridMode === "plain" ? " plain" : ""}`}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="world"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
      >
        <div className="grid-layer" aria-hidden />
        <div
          className="board-hit"
          onPointerDown={onBoardPointerDown}
          onPointerMove={onBoardPointerMove}
          onPointerUp={onBoardPointerUp}
          onPointerCancel={onBoardPointerCancel}
        />
        <svg className="edges-svg">
          {edges.map((edge) => {
            const a = nodes[edge.from];
            const b = nodes[edge.to];
            if (!a || !b) return null;
            const seg = edgeSegment(a, b, edges, edge);
            const selected = state.selectedEdgeId === edge.id;
            return (
              <g key={edge.id}>
                <line
                  className="hit"
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={seg.x2}
                  y2={seg.y2}
                  stroke="transparent"
                  strokeWidth={18}
                />
                <line
                  className="visible"
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={seg.x2}
                  y2={seg.y2}
                  stroke={selected ? "#2563eb" : "#94a3b8"}
                  strokeWidth={selected ? 3 : 2}
                />
              </g>
            );
          })}
          {linkPreview && (
            <line
              className="link-preview-line"
              x1={linkPreview.x1}
              y1={linkPreview.y1}
              x2={linkPreview.x2}
              y2={linkPreview.y2}
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="6 6"
            />
          )}
        </svg>
        <div className="nodes-layer">
          {nodeOrder.map((id) => {
            const n = nodes[id];
            if (!n) return null;
            return (
              <NodeBox
                key={id}
                node={n}
                selected={state.selectedNodeId === id}
                worldFromClient={(cx, cy) => screenToWorld(cx, cy)}
                onSelect={(nid) => dispatch({ type: "select/node", id: nid })}
                onStartDrag={handleStartNodeDrag}
                onMoveDrag={handleMoveNodeDrag}
                onEndDrag={handleEndNodeDrag}
                onStartLink={handleStartLink}
                onUpdateText={(nid, text) => dispatch({ type: "node/updateText", id: nid, text })}
                onSetBounds={(nid, b) =>
                  dispatch({ type: "node/setBounds", id: nid, x: b.x, y: b.y, width: b.width, height: b.height })
                }
                onDeleteNode={(nid) => dispatch({ type: "node/delete", id: nid })}
              />
            );
          })}
        </div>
        {draftStyle && <div className="draft-rect" style={draftStyle} />}
      </div>
      <div className="hint">
        顶栏第二行为类似 Google Docs 的格式（粗体、颜色、列表、对齐等）；请先在框内点一下再点格式按钮。悬停框上小条可移动/删除。左键空白拖新框；空白右键或中键拖画布。Ctrl + 滚轮缩放。
      </div>
    </div>
  );
}
