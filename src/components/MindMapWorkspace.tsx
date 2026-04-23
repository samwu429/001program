import { useCallback, useEffect, useReducer, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  initialState,
  mindMapReducer,
  serializeState,
} from "../mindMapReducer";
import { MindMapCanvas } from "./MindMapCanvas";
import { Toolbar, validateImportedDoc } from "./Toolbar";
import type { GridMode } from "../types";
import type { MindMapAction } from "../mindMapReducer";

type Props = {
  /** 初次载入的画布 JSON（与导出格式一致） */
  initialDataJson: string | null;
  /** 状态变化时回调（用于自动保存） */
  onPersist?: (json: string) => void;
  /** 顶部试用提示 */
  trialBanner?: ReactNode;
};

export function MindMapWorkspace({ initialDataJson, onPersist, trialBanner }: Props) {
  const [state, dispatch] = useReducer(mindMapReducer, initialDataJson, (raw) => {
    if (!raw) return initialState;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const doc = validateImportedDoc(parsed);
      if (!doc) return initialState;
      return mindMapReducer(initialState, { type: "persist/load", state: doc });
    } catch {
      return initialState;
    }
  });

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!onPersist) return;
    const t = window.setTimeout(() => onPersist(serializeState(state)), 500);
    return () => window.clearTimeout(t);
  }, [state, onPersist]);

  const onInsertImage = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const onImageFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !file.type.startsWith("image/") || !state.selectedNodeId) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = typeof reader.result === "string" ? reader.result : "";
        if (!src) return;
        dispatch({
          type: "node/addImages",
          id: state.selectedNodeId!,
          images: [{ id: `img_${Date.now().toString(36)}`, src }],
        });
      };
      reader.readAsDataURL(file);
    },
    [dispatch, state.selectedNodeId]
  );

  const onGridMode = useCallback((m: GridMode) => {
    dispatch({ type: "grid/set", mode: m });
  }, []);

  const onFontSize = useCallback(
    (px: number) => {
      if (!state.selectedNodeId) return;
      dispatch({ type: "node/setStyle", id: state.selectedNodeId, fontSize: px });
    },
    [dispatch, state.selectedNodeId]
  );

  const onFontFamily = useCallback(
    (ff: string) => {
      if (!state.selectedNodeId) return;
      dispatch({ type: "node/setStyle", id: state.selectedNodeId, fontFamily: ff });
    },
    [dispatch, state.selectedNodeId]
  );

  const onExportJson = useCallback(() => {
    const blob = new Blob([serializeState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindmap.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const onImportJson = useCallback(
    async (file: File) => {
      const text = await file.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text) as unknown;
      } catch {
        window.alert("JSON 解析失败");
        return;
      }
      const doc = validateImportedDoc(raw);
      if (!doc) {
        window.alert("文件格式不正确");
        return;
      }
      dispatch({ type: "persist/load", state: doc });
    },
    [dispatch]
  );

  const onClearBoard = useCallback(() => {
    if (!window.confirm("确定清空画布？未导出内容将丢失。")) return;
    dispatch({ type: "board/clear" });
  }, [dispatch]);

  return (
    <div className="app-shell">
      {trialBanner}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onImageFiles}
      />
      <div className="toolbar-stack">
        <div className="toolbar-home-row">
          <Link to="/" className="toolbar-btn">
            ← 主页
          </Link>
        </div>
        <Toolbar
          state={state}
          dispatch={dispatch as React.Dispatch<MindMapAction>}
          onInsertImage={onInsertImage}
          onGridMode={onGridMode}
          onFontSize={onFontSize}
          onFontFamily={onFontFamily}
          onExportJson={onExportJson}
          onImportJson={onImportJson}
          onClearBoard={onClearBoard}
        />
      </div>
      <MindMapCanvas state={state} dispatch={dispatch as React.Dispatch<MindMapAction>} />
    </div>
  );
}
