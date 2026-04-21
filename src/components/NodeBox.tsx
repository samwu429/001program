import { useCallback, useEffect, useRef, useState } from "react";
import type { ResizeHandle } from "../geometry";
import { resizeNodeBounds } from "../geometry";
import { sanitizeNodeHtml } from "../formatExec";
import type { MindNode } from "../types";

const RESIZE_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

type Bounds = { x: number; y: number; width: number; height: number };

type Props = {
  node: MindNode;
  selected: boolean;
  worldFromClient: (clientX: number, clientY: number) => { x: number; y: number };
  onSelect: (id: string) => void;
  onStartDrag: (id: string, clientX: number, clientY: number) => void;
  onMoveDrag: (id: string, clientX: number, clientY: number) => void;
  onEndDrag: (id: string, moved: boolean) => void;
  onStartLink: (fromId: string, clientX: number, clientY: number) => void;
  onUpdateText: (id: string, text: string) => void;
  onSetBounds: (id: string, b: Bounds) => void;
  onDeleteNode: (id: string) => void;
};

export function NodeBox({
  node,
  selected,
  worldFromClient,
  onSelect,
  onStartDrag,
  onMoveDrag,
  onEndDrag,
  onStartLink,
  onUpdateText,
  onSetBounds,
  onDeleteNode,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [hoverPinned, setHoverPinned] = useState(false);
  const movedRef = useRef(false);
  const dragActive = useRef(false);
  const resizeSession = useRef<{
    handle: ResizeHandle;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
  } | null>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== node.text) el.innerHTML = node.text || "";
  }, [node.text]);

  const onEditorInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    let html = el.innerHTML;
    const cleaned = sanitizeNodeHtml(html);
    if (cleaned !== html) {
      el.innerHTML = cleaned;
      html = cleaned;
    }
    onUpdateText(node.id, html);
  }, [node.id, onUpdateText]);

  const onCardMouseEnter = useCallback(() => {
    setHoverPinned(true);
  }, []);

  const onCardMouseLeave = useCallback(() => {
    if (dragActive.current || resizeSession.current) return;
    setHoverPinned(false);
  }, []);

  const onChromeZoneEnter = useCallback(() => {
    setHoverPinned(true);
  }, []);

  const maybeCollapseChromeIfNotHovered = useCallback(() => {
    queueMicrotask(() => {
      const el = cardRef.current;
      if (!el) return;
      try {
        if (!el.matches(":hover")) setHoverPinned(false);
      } catch {
        setHoverPinned(false);
      }
    });
  }, []);

  const onDragHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      movedRef.current = false;
      dragActive.current = true;
      onSelect(node.id);
      onStartDrag(node.id, e.clientX, e.clientY);
      cardRef.current?.setPointerCapture(e.pointerId);
    },
    [node.id, onSelect, onStartDrag]
  );

  const onCardPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (resizeSession.current) return;
      if (!dragActive.current || e.buttons !== 1) return;
      movedRef.current = true;
      onMoveDrag(node.id, e.clientX, e.clientY);
    },
    [node.id, onMoveDrag]
  );

  const onCardPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 2) {
        try {
          cardRef.current?.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        return;
      }
      if (resizeSession.current) return;
      if (e.button === 0 && dragActive.current) {
        dragActive.current = false;
        try {
          cardRef.current?.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        onEndDrag(node.id, movedRef.current);
        maybeCollapseChromeIfNotHovered();
      }
    },
    [maybeCollapseChromeIfNotHovered, node.id, onEndDrag]
  );

  const onBodyPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        onSelect(node.id);
        onStartLink(node.id, e.clientX, e.clientY);
        cardRef.current?.setPointerCapture(e.pointerId);
        return;
      }
      if (e.button === 0) {
        if ((e.target as HTMLElement).closest("[data-node-editor]")) return;
        e.stopPropagation();
        onSelect(node.id);
      }
    },
    [node.id, onSelect, onStartLink]
  );

  const onResizePointerDown = useCallback(
    (handle: ResizeHandle) => (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      onSelect(node.id);
      resizeSession.current = {
        handle,
        ox: node.x,
        oy: node.y,
        ow: node.width,
        oh: node.height,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [node.height, node.id, node.width, node.x, node.y, onSelect]
  );

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = resizeSession.current;
      if (!s) return;
      const p = worldFromClient(e.clientX, e.clientY);
      const b = resizeNodeBounds(s.handle, s.ox, s.oy, s.ow, s.oh, p.x, p.y);
      onSetBounds(node.id, b);
    },
    [node.id, onSetBounds, worldFromClient]
  );

  const onResizePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (!resizeSession.current) return;
    resizeSession.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    maybeCollapseChromeIfNotHovered();
  }, [maybeCollapseChromeIfNotHovered]);

  const onDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDeleteNode(node.id);
    },
    [node.id, onDeleteNode]
  );

  const chromeVisible = selected || hoverPinned;

  return (
    <div
      ref={cardRef}
      data-node-id={node.id}
      className={`node-card${selected ? " selected" : ""}${chromeVisible ? " chrome-visible" : ""}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        fontSize: node.fontSize,
        fontFamily: node.fontFamily,
      }}
      onMouseEnter={onCardMouseEnter}
      onMouseLeave={onCardMouseLeave}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={onCardPointerMove}
      onPointerUp={onCardPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="node-hover-stack" onMouseEnter={onChromeZoneEnter}>
        <div className="node-chrome" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="node-chrome-btn node-chrome-drag"
            title="拖住移动整个框"
            aria-label="拖动"
            onPointerDown={onDragHandlePointerDown}
          >
            <span className="node-chrome-grip" aria-hidden />
            移动
          </button>
          <button
            type="button"
            className="node-chrome-btn"
            title="选中此框"
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(node.id);
            }}
          >
            选中
          </button>
          <button type="button" className="node-chrome-btn node-chrome-danger" title="删除" onClick={onDeleteClick}>
            删除
          </button>
        </div>
        <div className="node-chrome-bridge" />
      </div>

      <div className="node-body" onPointerDown={onBodyPointerDown}>
        <div
          ref={editorRef}
          className="node-editor"
          contentEditable
          role="textbox"
          aria-multiline="true"
          data-node-editor="true"
          data-placeholder="输入文字…"
          suppressContentEditableWarning
          spellCheck
          onInput={onEditorInput}
          onPointerDown={(e) => {
            if (e.button === 0) e.stopPropagation();
          }}
        />
        {node.images.length > 0 && (
          <div className="node-images">
            {node.images.map((im) => (
              <img key={im.id} src={im.src} alt={im.alt ?? ""} draggable={false} />
            ))}
          </div>
        )}
      </div>

      {selected &&
        RESIZE_HANDLES.map((h) => (
          <span
            key={h}
            role="presentation"
            className={`node-handle node-handle-${h}`}
            onPointerDown={onResizePointerDown(h)}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
          />
        ))}
    </div>
  );
}
