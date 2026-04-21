import { useState, type Dispatch } from "react";
import type { MindMapAction } from "../mindMapReducer";
import type { MindMapState } from "../types";
import { execDocCommand } from "../formatExec";
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

export function FormatToolbar({ state, dispatch, selectedFontSize, onFontSize, onFontFamily }: Props) {
  const sel = state.selectedNodeId ? state.nodes[state.selectedNodeId] : undefined;
  const textDisabled = false;
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
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("undo")}
          >
            ↶
          </button>
          <button
            type="button"
            className="ft-icon-btn"
            title="重做"
            aria-label="重做"
            disabled={textDisabled}
            onMouseDown={preventLoseSelection}
            onClick={() => execDocCommand("redo")}
          >
            ↷
          </button>
          <button
            type="button"
            className="ft-text-btn"
            title="打印页面"
            aria-label="打印"
            onMouseDown={preventLoseSelection}
            onClick={() => window.print()}
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
