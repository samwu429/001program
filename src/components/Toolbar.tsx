import type { Dispatch } from "react";
import type { MindMapAction } from "../mindMapReducer";
import type { GridMode, MindMapState, MindNode } from "../types";
import { FormatToolbar } from "./FormatToolbar";

type Props = {
  state: MindMapState;
  dispatch: Dispatch<MindMapAction>;
  onInsertImage: () => void;
  onGridMode: (m: GridMode) => void;
  onFontSize: (px: number) => void;
  onFontFamily: (ff: string) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onClearBoard: () => void;
};

export function Toolbar({
  state,
  dispatch,
  onInsertImage,
  onGridMode,
  onFontSize,
  onFontFamily,
  onExportJson,
  onImportJson,
  onClearBoard,
}: Props) {
  const sel = state.selectedNodeId ? state.nodes[state.selectedNodeId] : undefined;

  return (
    <>
      <header className="toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">插入</span>
          <button type="button" className="toolbar-btn" onClick={onInsertImage} disabled={!sel}>
            图片到选中框
          </button>
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">工具</span>
          <button
            type="button"
            className={`toolbar-btn ${state.gridMode === "grid" ? "primary" : ""}`}
            onClick={() => onGridMode("grid")}
          >
            浅色网格
          </button>
          <button
            type="button"
            className={`toolbar-btn ${state.gridMode === "plain" ? "primary" : ""}`}
            onClick={() => onGridMode("plain")}
          >
            纯白画布
          </button>
          <button type="button" className="toolbar-btn" onClick={onClearBoard}>
            清空画布
          </button>
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">导出</span>
          <button type="button" className="toolbar-btn primary" onClick={onExportJson}>
            导出 JSON
          </button>
          <label className="toolbar-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            导入 JSON
            <input
              type="file"
              accept="application/json,.json"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onImportJson(f);
              }}
            />
          </label>
        </div>
      </header>
      <FormatToolbar
        state={state}
        dispatch={dispatch}
        selectedFontSize={sel?.fontSize ?? 15}
        onFontSize={onFontSize}
        onFontFamily={onFontFamily}
      />
    </>
  );
}

export function validateImportedDoc(raw: unknown): Partial<MindMapState> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!o.nodes || typeof o.nodes !== "object") return null;
  if (!Array.isArray(o.nodeOrder)) return null;
  if (!Array.isArray(o.edges)) return null;
  return {
    nodes: o.nodes as Record<string, MindNode>,
    nodeOrder: o.nodeOrder as string[],
    edges: o.edges as MindMapState["edges"],
    viewport: o.viewport as MindMapState["viewport"],
    gridMode: (o.gridMode === "plain" ? "plain" : "grid") as GridMode,
  };
}
