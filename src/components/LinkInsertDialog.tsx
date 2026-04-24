import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { execDocCommand, normalizeUrlForLink, restoreSelectionInNodeEditor } from "../formatExec";

type T = (key: string, params?: Record<string, string | number>) => string;

type Props = {
  open: boolean;
  onClose: () => void;
  nodeId: string | undefined;
  savedRange: Range | null;
  initialHref: string;
  t: T;
};

export function LinkInsertDialog({ open, onClose, nodeId, savedRange, initialHref, t }: Props) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [newTab, setNewTab] = useState(true);

  useEffect(() => {
    if (!open) return;
    const href = (initialHref || "").trim();
    setUrl(href || "https://");
    setErr(null);
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, initialHref]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !nodeId) return null;

  const apply = () => {
    const normalized = normalizeUrlForLink(url);
    if (!normalized) {
      setErr(t("linkInvalidUrl"));
      return;
    }
    const ed = restoreSelectionInNodeEditor(nodeId, savedRange);
    if (!ed) {
      setErr(t("linkLostSelection"));
      return;
    }
    if (!execDocCommand("createLink", normalized)) {
      setErr(t("linkCommandFailed"));
      return;
    }
    if (newTab) {
      try {
        const sel = window.getSelection();
        let n: Node | null = sel?.anchorNode ?? null;
        if (n?.nodeType === Node.TEXT_NODE) n = (n as Text).parentElement;
        while (n && n instanceof HTMLElement) {
          if (n.matches("[data-node-editor]")) break;
          if (n instanceof HTMLAnchorElement) {
            n.setAttribute("target", "_blank");
            n.setAttribute("rel", "noopener noreferrer");
            break;
          }
          n = n.parentElement;
        }
      } catch {
        /* ignore */
      }
    }
    onClose();
  };

  const remove = () => {
    const ed = restoreSelectionInNodeEditor(nodeId, savedRange);
    if (!ed) {
      setErr(t("linkLostSelection"));
      return;
    }
    execDocCommand("unlink");
    onClose();
  };

  const ui = (
    <div className="editor-dialog-root" role="presentation">
      <button type="button" className="editor-dialog-backdrop" aria-label={t("linkCancel")} onClick={onClose} />
      <div
        className="editor-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="editor-dialog-title">
          {t("linkDialogTitle")}
        </h2>
        <label className="editor-dialog-label">
          {t("linkUrlLabel")}
          <input
            ref={inputRef}
            type="url"
            className="editor-dialog-input"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setErr(null);
            }}
            placeholder="https://"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
          />
        </label>
        {err ? <p className="editor-dialog-error">{err}</p> : null}
        <label className="editor-dialog-check">
          <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} />
          {t("linkOpenNewTab")}
        </label>
        <div className="editor-dialog-actions">
          <button type="button" className="editor-dialog-btn editor-dialog-btn--ghost" onClick={onClose}>
            {t("linkCancel")}
          </button>
          <button type="button" className="editor-dialog-btn editor-dialog-btn--ghost" onClick={remove}>
            {t("linkRemove")}
          </button>
          <button type="button" className="editor-dialog-btn editor-dialog-btn--primary" onClick={apply}>
            {t("linkApply")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
