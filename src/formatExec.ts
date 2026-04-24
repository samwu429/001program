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
