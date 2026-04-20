import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  initialState,
  loadFromStorage,
  mindMapReducer,
  saveToStorage,
  serializeState,
} from "./mindMapReducer";
import { MindMapCanvas } from "./components/MindMapCanvas";
import { Toolbar, validateImportedDoc } from "./components/Toolbar";
import type { GridMode } from "./types";

export default function App() {
  const [state, dispatch] = useReducer(mindMapReducer, initialState, (base) => {
    const loaded = loadFromStorage();
    if (!loaded) return base;
    return mindMapReducer(base, { type: "persist/load", state: loaded });
  });

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => saveToStorage(state), 300);
    return () => window.clearTimeout(t);
  }, [state]);

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
    if (!window.confirm("确定清空画布？本地未导出内容将丢失。")) return;
    dispatch({ type: "board/clear" });
  }, [dispatch]);

  return (
    <div className="app-shell">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onImageFiles}
      />
      <Toolbar
        state={state}
        onInsertImage={onInsertImage}
        onGridMode={onGridMode}
        onFontSize={onFontSize}
        onFontFamily={onFontFamily}
        onExportJson={onExportJson}
        onImportJson={onImportJson}
        onClearBoard={onClearBoard}
      />
      <MindMapCanvas state={state} dispatch={dispatch} />
    </div>
  );
}
