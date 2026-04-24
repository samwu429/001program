export function sanitizeNodeHtml(html: string): string {
  let s = html.replace(/<\/(?:script|style|iframe|object|embed)[^>]*>/gi, "");
  s = s.replace(/<(?:script|style|iframe|object|embed)[\s\S]*?<\/(?:script|style|iframe|object|embed)>/gi, "");
  s = s.replace(/\son\w+\s*=/gi, " data-removed=");
  return s;
}

export function isRichTextEditorFocused(): boolean {
  const n = document.activeElement;
  if (!(n instanceof HTMLElement)) return false;
  if (n.isContentEditable) return true;
  return Boolean(n.closest("[data-node-editor]"));
}

export function execDocCommand(command: string, value?: string): boolean {
  if (!isRichTextEditorFocused()) return false;
  try {
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
}

/** Walk from selection anchor upward until node editor root; return first anchor href. */
export function getLinkHrefFromSelection(): string | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let n: Node | null = sel.anchorNode;
  if (n?.nodeType === Node.TEXT_NODE) n = (n as Text).parentElement;
  while (n && n instanceof HTMLElement) {
    if (n.matches("[data-node-editor]")) break;
    if (n instanceof HTMLAnchorElement) {
      const h = n.getAttribute("href");
      if (h) return h;
    }
    n = n.parentElement;
  }
  return null;
}

const UNSAFE_SCHEME = /^(javascript|data|vbscript):/i;

export function normalizeUrlForLink(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (UNSAFE_SCHEME.test(s)) return null;
  if (/^[a-z][\w+.-]*:/i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  return `https://${s}`;
}

export function restoreSelectionInNodeEditor(nodeId: string, range: Range | null): HTMLElement | null {
  const esc =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(nodeId)
      : nodeId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const ed = document.querySelector(`[data-node-id="${esc}"] [data-node-editor]`) as HTMLElement | null;
  if (!ed) return null;
  ed.focus();
  const sel = window.getSelection();
  if (!sel) return ed;
  sel.removeAllRanges();
  if (range) {
    try {
      sel.addRange(range);
    } catch {
      /* collapsed range may be invalid after DOM change */
    }
  }
  return ed;
}

