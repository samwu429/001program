import { useRef, type Dispatch } from "react";
import type { MindMapAction } from "../mindMapReducer";
import type { GridMode, MindMapState, MindNode } from "../types";
import { FormatToolbar } from "./FormatToolbar";
import { useI18n } from "../i18n";

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
  const { t } = useI18n();
  const importInputRef = useRef<HTMLInputElement>(null);
  const sel = state.selectedNodeId ? state.nodes[state.selectedNodeId] : undefined;
  const selectionText = state.selectedNodeId
    ? t("selectedNode")
    : state.selectedEdgeId
      ? t("selectedEdge")
      : t("ready");

  return (
    <>
      <header className="toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">{t("insert")}</span>
          <div className="toolbar-cluster">
            <button type="button" className="toolbar-btn" onClick={onInsertImage} disabled={!sel}>
              {t("imageToSelected")}
            </button>
          </div>
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">{t("tools")}</span>
          <div className="toolbar-cluster toolbar-cluster--tight">
            <div className="toolbar-segmented" role="group" aria-label={t("canvasBackground")}>
              <button
                type="button"
                className={`toolbar-btn toolbar-btn--segment ${state.gridMode === "grid" ? "is-selected" : ""}`}
                onClick={() => onGridMode("grid")}
              >
                {t("lightGrid")}
              </button>
              <button
                type="button"
                className={`toolbar-btn toolbar-btn--segment ${state.gridMode === "plain" ? "is-selected" : ""}`}
                onClick={() => onGridMode("plain")}
              >
                {t("plainBoard")}
              </button>
            </div>
            <button type="button" className="toolbar-btn toolbar-btn--danger" onClick={onClearBoard}>
              {t("clearBoard")}
            </button>
          </div>
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">{t("export")}</span>
          <div className="toolbar-cluster">
            <button type="button" className="toolbar-btn toolbar-btn--primary" onClick={onExportJson}>
              {t("exportJson")}
            </button>
            <button type="button" className="toolbar-btn" onClick={() => importInputRef.current?.click()}>
              {t("importJson")}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onImportJson(f);
              }}
            />
          </div>
        </div>
        <div className="toolbar-status" aria-live="polite">
          <span className="toolbar-status-pill">{selectionText}</span>
          <span className="toolbar-status-pill">{t("autosaveOn")}</span>
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
