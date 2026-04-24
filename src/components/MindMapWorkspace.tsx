import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  initialState,
  mindMapReducer,
  serializeState,
} from "../mindMapReducer";
import { MindMapCanvas } from "./MindMapCanvas";
import type { ImportJsonOutcome } from "./ImportJsonDialog";
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
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
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

  useEffect(
    () => () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    },
    []
  );

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3400);
  }, []);

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
    const stamp = new Date().toISOString().replace(/[:]/g, "-").split(".")[0] ?? "export";
    const blob = new Blob([serializeState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindmap-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("exportDone"));
  }, [state, showToast, t]);

  const onCopyJson = useCallback(async () => {
    const text = serializeState(state);
    try {
      await navigator.clipboard.writeText(text);
      showToast(t("exportCopied"));
    } catch {
      window.alert(t("copyJsonFail"));
    }
  }, [state, showToast, t]);

  const onApplyImportJson = useCallback(
    async (jsonText: string): Promise<ImportJsonOutcome> => {
      let raw: unknown;
      try {
        raw = JSON.parse(jsonText) as unknown;
      } catch {
        return "parse";
      }
      const doc = validateImportedDoc(raw);
      if (!doc) return "schema";
      if (state.nodeOrder.length > 0) {
        const ok = window.confirm(t("importReplaceConfirm", { count: state.nodeOrder.length }));
        if (!ok) return "canceled";
      }
      dispatch({ type: "persist/load", state: doc });
      showToast(t("importDone"));
      return "ok";
    },
    [dispatch, state.nodeOrder.length, showToast, t]
  );

  const onClearBoard = useCallback(() => {
    if (!window.confirm(t("clearConfirm"))) return;
    dispatch({ type: "board/clear" });
  }, [dispatch, t]);

  return (
    <div className="app-shell">
      {toast ? (
        <div className="app-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
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
          <div className="toolbar-home-group">
            <Link to="/" className="toolbar-btn toolbar-btn-home">
              ← {t("home")}
            </Link>
            <button type="button" className="toolbar-btn toolbar-btn-home" onClick={() => setLang(lang === "en" ? "zh" : "en")}>
              {t("language")} {lang === "en" ? t("chinese") : t("english")}
            </button>
          </div>
        </div>
        <Toolbar
          state={state}
          dispatch={dispatch as React.Dispatch<MindMapAction>}
          onInsertImage={onInsertImage}
          onGridMode={onGridMode}
          onFontSize={onFontSize}
          onFontFamily={onFontFamily}
          onExportJson={onExportJson}
          onCopyJson={onCopyJson}
          onApplyImportJson={onApplyImportJson}
          onClearBoard={onClearBoard}
        />
      </div>
      <MindMapCanvas state={state} dispatch={dispatch as React.Dispatch<MindMapAction>} />
    </div>
  );
}
