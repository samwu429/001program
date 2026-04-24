import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ImportJsonOutcome = "ok" | "parse" | "schema" | "canceled";

type T = (key: string, params?: Record<string, string | number>) => string;

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (jsonText: string) => Promise<ImportJsonOutcome>;
  t: T;
  nodeCount: number;
};

export function ImportJsonDialog({ open, onClose, onApply, t, nodeCount }: Props) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPaste("");
    setFileLabel(null);
    setPendingFile(null);
    setFormError(null);
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  if (!open) return null;

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    setPendingFile(f);
    setFileLabel(f ? f.name : null);
    setFormError(null);
  };

  const runImport = async () => {
    setFormError(null);
    let text = paste.trim();
    if (!text && pendingFile) {
      try {
        text = (await pendingFile.text()).trim();
      } catch {
        setFormError(t("importReadFileFail"));
        return;
      }
    }
    if (!text) {
      setFormError(t("importNeedJson"));
      return;
    }
    setBusy(true);
    try {
      const outcome = await onApply(text);
      if (outcome === "ok") onClose();
      else if (outcome === "parse") setFormError(t("jsonParseFail"));
      else if (outcome === "schema") setFormError(t("invalidFormat"));
      else if (outcome === "canceled") setFormError(null);
    } finally {
      setBusy(false);
    }
  };

  const ui = (
    <div className="editor-dialog-root" role="presentation">
      <button type="button" className="editor-dialog-backdrop" aria-label={t("importCancel")} onClick={onClose} disabled={busy} />
      <div
        className="editor-dialog editor-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="editor-dialog-title">
          {t("importDialogTitle")}
        </h2>
        <p className="editor-dialog-desc">{t("importDialogDesc", { count: nodeCount })}</p>
        <div className="editor-dialog-row">
          <input ref={fileRef} type="file" accept="application/json,.json" className="visually-hidden" onChange={onFileChange} />
          <button type="button" className="editor-dialog-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            {t("importChooseFile")}
          </button>
          {fileLabel ? <span className="editor-dialog-file-name">{fileLabel}</span> : null}
        </div>
        <label className="editor-dialog-label">
          {t("importPasteLabel")}
          <textarea
            className="editor-dialog-textarea"
            rows={10}
            value={paste}
            onChange={(e) => {
              setPaste(e.target.value);
              setFormError(null);
            }}
            placeholder="{ ... }"
            spellCheck={false}
            disabled={busy}
          />
        </label>
        {formError ? <p className="editor-dialog-error">{formError}</p> : null}
        <div className="editor-dialog-actions">
          <button type="button" className="editor-dialog-btn editor-dialog-btn--ghost" onClick={onClose} disabled={busy}>
            {t("importCancel")}
          </button>
          <button type="button" className="editor-dialog-btn editor-dialog-btn--primary" onClick={() => void runImport()} disabled={busy}>
            {busy ? t("importWorking") : t("importApply")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
