import { useCallback, useRef } from "react";
import type { MindNode } from "../types";

type Props = {
  node: MindNode;
  selected: boolean;
  onSelect: (id: string) => void;
  onStartDrag: (id: string, clientX: number, clientY: number) => void;
  onMoveDrag: (id: string, clientX: number, clientY: number) => void;
  onEndDrag: (id: string, moved: boolean) => void;
  onStartLink: (fromId: string, clientX: number, clientY: number) => void;
  onUpdateText: (id: string, text: string) => void;
};

export function NodeBox({
  node,
  selected,
  onSelect,
  onStartDrag,
  onMoveDrag,
  onEndDrag,
  onStartLink,
  onUpdateText,
}: Props) {
  const movedRef = useRef(false);
  const dragActive = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 0) {
        e.stopPropagation();
        movedRef.current = false;
        dragActive.current = true;
        onSelect(node.id);
        onStartDrag(node.id, e.clientX, e.clientY);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        onSelect(node.id);
        onStartLink(node.id, e.clientX, e.clientY);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [node.id, onSelect, onStartDrag, onStartLink]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragActive.current || e.buttons !== 1) return;
      movedRef.current = true;
      onMoveDrag(node.id, e.clientX, e.clientY);
    },
    [node.id, onMoveDrag]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 0 && dragActive.current) {
        dragActive.current = false;
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        onEndDrag(node.id, movedRef.current);
      }
      if (e.button === 2) {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
    },
    [node.id, onEndDrag]
  );

  return (
    <div
      data-node-id={node.id}
      className={`node-card${selected ? " selected" : ""}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        fontSize: node.fontSize,
        fontFamily: node.fontFamily,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <textarea
        value={node.text}
        onChange={(e) => onUpdateText(node.id, e.target.value)}
        onPointerDown={(e) => {
          if (e.button === 0) e.stopPropagation();
        }}
        placeholder="输入文字…"
      />
      {node.images.length > 0 && (
        <div className="node-images">
          {node.images.map((im) => (
            <img key={im.id} src={im.src} alt={im.alt ?? ""} draggable={false} />
          ))}
        </div>
      )}
    </div>
  );
}
