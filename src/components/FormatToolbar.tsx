import { useState, type Dispatch } from "react";
import type { MindMapAction } from "../mindMapReducer";
import type { MindMapState } from "../types";
import { execDocCommand, isRichTextEditorFocused } from "../formatExec";
import { VIEWPORT_SCALE_MAX, VIEWPORT_SCALE_MIN } from "../viewportConstants";

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Georgia", value: "Georgia, Times New Roman, serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Courier New", value: '"Courier New", Courier, monospace' },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "系统 UI", value: "system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif" },
];

type Props = {
  state: MindMapState;
  dispatch: Dispatch<MindMapAction>;
  selectedFontSize: number;
  onFontSize: (px: number) => void;
  onFontFamily: (ff: string) => void;
};

function preventLoseSelection(e: React.MouseEvent) {
  e.preventDefault();
}

function StyleBlockSelect({ disabled }: { disabled: boolean }) {
  const [value, setValue] = useState("p");
  return (
    <select
      className="ft-select ft-select--wide"
      aria-label="段落样式"
      disabled={disabled}
      value={value}
      onMouseDown={preventLoseSelection}
      onChange={(e) => {
        const v = e.target.value;
        setValue(v);
        execDocCommand("formatBlock", v === "p" ? "p" : v);
      }}
    >
      <option value="p">普通文本</option>
      <option value="h1">标题 1</option>
      <option value="h2">标题 2</option>
      <option value="h3">标题 3</option>
    </select>
  );
}

function zoomCanvas(dispatch: Dispatch<MindMapAction>, scale: number, factor: number) {
  const el = document.getElementById("mindmap-canvas-wrap");
  if (!el) return;
  const r = el.getBoundingClientRect();
  const lx = r.left + r.width / 2;
  const ly = r.top + r.height / 2;
  const next = Math.min(VIEWPORT_SCALE_MAX, Math.max(VIEWPORT_SCALE_MIN, scale * factor));
  dispatch({ type: "viewport/zoom", lx, ly, nextScale: next });
}

function printOccupiedCanvas(state: MindMapState) {
  const nodes = state.nodeOrder.map((id) => state.nodes[id]).filter(Boolean);
  if (nodes.length === 0) {
    window.alert("当前没有可打印的框");
    return;
  }
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  const pad = 36;
  const w = Math.max(1, maxX - minX + pad * 2);
  const h = Math.max(1, maxY - minY + pad * 2);
  const nodeHtml = nodes
    .map((n) => {
      const left = n.x - minX + pad;
      const top = n.y - minY + pad;
      return `<div class="p-node" style="left:${left}px;top:${top}px;width:${n.width}px;height:${n.height}px;border-color:${
        n.borderColor ?? "#e2e4e8"
      };font-size:${n.fontSize}px;font-family:${n.fontFamily};">${n.text || ""}</div>`;
    })
    .join("");
  const edgesHtml = state.edges
    .map((e) => {
      const a = state.nodes[e.from];
      const b = state.nodes[e.to];
      if (!a || !b) return "";
      const x1 = a.x + a.width / 2 - minX + pad;
      const y1 = a.y + a.height / 2 - minY + pad;
      const x2 = b.x + b.width / 2 - minX + pad;
      const y2 = b.y + b.height / 2 - minY + pad;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${e.color ?? "#94a3b8"}" stroke-width="${
        e.width ?? 2
      }" />`;
    })
    .join("");

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>print</title>
  <style>
  html,body{margin:0;padding:0;background:#fff}
  .paper{position:relative;width:${w}px;height:${h}px}
  .p-svg{position:absolute;inset:0}
  .p-node{position:absolute;box-sizing:border-box;border:1px solid #e2e4e8;border-radius:10px;padding:10px 12px;overflow:hidden;background:#fff}
  @media print{ @page{margin:10mm} }
  </style></head><body>
  <div class="paper">
    <svg class="p-svg" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${edgesHtml}</svg>
    ${nodeHtml}
  </div></body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export function FormatToolbar({ state, dispatch, selectedFontSize, onFontSize, onFontFamily }: Props) {
  const sel = state.selectedNodeId ? state.nodes[state.selectedNodeId] : undefined;
  const textDisabled = !isRichTextEditorFocused();
  const edge = state.selectedEdgeId ? state.edges.find((e) => e.id === state.selectedEdgeId) : undefined;
  const pct = Math.round(state.viewport.scale * 100);

  const ff = sel?.fontFamily ?? FONT_OPTIONS[0].value;
  const fontValue = FONT_OPTIONS.some((o) => o.value === ff) ? ff : FONT_OPTIONS[0].value;

  return (
    <div className="format-toolbar" aria-label="文本格式">
      <div className="format-toolbar-inner">
        <div className="ft-group">
          <button
            type="button"
            className="ft-icon-btn"
            title="撤销"
            aria-label="撤销"
            disabled={textDisabled && state.historyPast.length === 0}
            onMouseDown={preventLoseSelection}
            onClick={() => {
              if (!execDocCommand("undo")) dispatch({ type: "history/undo" });
            }}
          >
            ↶
          </button>
          <button
            type="button"
            className="ft-icon-btn"
            title="重做"
            aria-label="重做"
            disabled={textDisabled && state.historyFuture.length === 0}
            onMouseDown={preventLoseSelection}
            onClick={() => {
              if (!execDocCommand("redo")) dispatch({ type: "history/redo" });
            }}
          >
            ↷
          </button>
          <button
            type="button"
            className="ft-text-btn"
            title="打印页面"
            aria-label="打印"
            onMouseDown={preventLoseSelection}
            onClick={() => printOccupiedCanvas(state)}
          >
            打印
          </button>
        </div>
        <span className="ft-divider" />

        <div className="ft-group">
          <button
            type="button"
            className="ft-zoom-btn"
            title="缩小画布"
            aria-label="缩小"
            onClick={() => zoomCanvas(dispatch, state.viewport.scale, 0.92)}
          >
            −
          </button>
          <span className="ft-zoom-label">{pct}%</span>
          <button
            type="button"
            className="ft-zoom-btn"
            title="放大画布"
            aria-label="放大"
            onClick={() => zoomCanvas(dispatch, state.viewport.scale, 1.08)}
          >
            +
          </button>
        </div>
        <span className="ft-divider" />

        <StyleBlockSelect disabled={textDisabled} />
        <span className="ft-divider" />

        <div className="ft-group">
          <select
            className="ft-select"
            aria-label="字体"
            disabled={!sel}
            value={fontValue}
            onMouseDown={preventLoseSelection}
            onChange={(e) => onFontFamily(e.target.value)}
          >
            {FONT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ft-num-btn"
            title="字号 −1"
            disabled={!sel}
            onMouseDown={preventLoseSelection}
            onClick={() => onFontSize(Math.max(10, selectedFontSize - 1))}
          >
            −
          </button>
          <span className="ft-num-val">{selectedFontSize}</span>
          <button
            type="button"
            className="ft-num-btn"
            title="字号 +1"
            disabled={!sel}
            onMouseDown={preventLoseSelection}
            onClick={() => onFontSize(Math.min(36, selectedFontSize + 1))}
          >
            +
          </button>
        </div>
        <span className="ft-divider" />

        <div className="ft-group">
          <button
            type="button"
            className="ft-icon-btn ft-strong"
            title="粗体"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("bold")}
          >
            B
          </button>
          <button
            type="button"
            className="ft-icon-btn ft-italic"
            title="斜体"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("italic")}
          >
            I
          </button>
          <button
            type="button"
            className="ft-icon-btn ft-under"
            title="下划线"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("underline")}
          >
            U
          </button>
          <button
            type="button"
            className="ft-icon-btn"
            title="删除线"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("strikeThrough")}
          >
            <span className="ft-strike">S</span>
          </button>
          <label className="ft-color" title="文字颜色">
            <span className="ft-color-a">A</span>
            <input
              type="color"
              aria-label="文字颜色"
              disabled={textDisabled}
              onMouseDown={preventLoseSelection}
              onChange={(e) => execDocCommand("foreColor", e.target.value)}
            />
          </label>
          <label className="ft-color ft-hi" title="高亮">
            <span className="ft-hi-icon">▉</span>
            <input
              type="color"
              aria-label="高亮颜色"
              disabled={textDisabled}
              defaultValue="#fff59d"
              onMouseDown={preventLoseSelection}
              onChange={(e) => execDocCommand("hiliteColor", e.target.value)}
            />
          </label>
        </div>
        <span className="ft-divider" />

        <div className="ft-group">
          <button
            type="button"
            className="ft-icon-btn"
            title="插入链接"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => {
              const u = window.prompt("链接地址（https://…）", "https://");
              if (u) execDocCommand("createLink", u);
            }}
          >
            链
          </button>
          <button
            type="button"
            className="ft-icon-btn"
            title="清除格式"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("removeFormat")}
          >
            清
          </button>
        </div>
        <span className="ft-divider" />

        <div className="ft-group">
          <button
            type="button"
            className="ft-icon-btn"
            title="左对齐"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("justifyLeft")}
          >
            ≡
          </button>
          <button
            type="button"
            className="ft-icon-btn"
            title="居中"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("justifyCenter")}
          >
            ≣
          </button>
          <button
            type="button"
            className="ft-icon-btn"
            title="右对齐"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("justifyRight")}
          >
            ≢
          </button>
        </div>
        <span className="ft-divider" />

        <div className="ft-group">
          <button
            type="button"
            className="ft-icon-btn"
            title="项目符号"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("insertUnorderedList")}
          >
            •
          </button>
          <button
            type="button"
            className="ft-icon-btn"
            title="编号列表"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("insertOrderedList")}
          >
            1.
          </button>
          <button
            type="button"
            className="ft-icon-btn"
            title="减少缩进"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("outdent")}
          >
            ⇤
          </button>
          <button
            type="button"
            className="ft-icon-btn"
            title="增加缩进"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("indent")}
          >
            ⇥
          </button>
        </div>

        <span className="ft-divider" />
        <div className="ft-group">
          <label className="ft-color" title="框线颜色">
            <span className="ft-color-a">框</span>
            <input
              type="color"
              aria-label="框线颜色"
              disabled={!sel}
              value={sel?.borderColor ?? "#e2e4e8"}
              onChange={(e) =>
                sel && dispatch({ type: "node/setStyle", id: sel.id, borderColor: e.target.value })
              }
            />
          </label>
          <label className="ft-color" title="连线颜色">
            <span className="ft-color-a">线</span>
            <input
              type="color"
              aria-label="连线颜色"
              disabled={!edge}
              value={edge?.color ?? "#94a3b8"}
              onChange={(e) =>
                edge && dispatch({ type: "edge/setStyle", id: edge.id, color: e.target.value })
              }
            />
          </label>
          <input
            className="ft-line-width"
            type="range"
            min={1}
            max={8}
            step={1}
            disabled={!edge}
            value={edge?.width ?? 2}
            onChange={(e) =>
              edge && dispatch({ type: "edge/setStyle", id: edge.id, width: Number(e.target.value) })
            }
            title="连线粗细"
            aria-label="连线粗细"
          />
          <span className="ft-num-val">{edge?.width ?? 2}px</span>
        </div>
      </div>
    </div>
  );
}
