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
import { useI18n } from "../i18n";

type Props = {
  initialDataJson: string | null;
  onPersist?: (json: string) => void;
  trialBanner?: ReactNode;
};

export function MindMapWorkspace({ initialDataJson, onPersist, trialBanner }: Props) {
  const { t, lang, setLang } = useI18n();
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
        window.alert(t("jsonParseFail"));
        return;
      }
      const doc = validateImportedDoc(raw);
      if (!doc) {
        window.alert(t("invalidFormat"));
        return;
      }
      dispatch({ type: "persist/load", state: doc });
    },
    [dispatch, t]
  );

  const onClearBoard = useCallback(() => {
    if (!window.confirm(t("clearConfirm"))) return;
    dispatch({ type: "board/clear" });
  }, [dispatch, t]);

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
            ← {t("home")}
          </Link>
          <button type="button" className="toolbar-btn" onClick={() => setLang(lang === "en" ? "zh" : "en")}>
            {t("language")} {lang === "en" ? t("chinese") : t("english")}
          </button>
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
