import { STORAGE_KEY } from "../mindMapReducer";
import { getCurrentLang, tr } from "../i18n";

export type CanvasListItem = { id: string; title: string; updatedAt: number };

const INDEX_KEY = "001program-guest-canvas-index-v1";
const DOC_PREFIX = "001program-guest-canvas-v1:";
export const GUEST_MAX_CANVASES = 5;

function docKey(id: string) {
  return `${DOC_PREFIX}${id}`;
}

function readIndex(): CanvasListItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x === "object")
      .map((x) => x as CanvasListItem)
      .filter((x) => typeof x.id === "string" && typeof x.title === "string" && typeof x.updatedAt === "number");
  } catch {
    return [];
  }
}

function writeIndex(items: CanvasListItem[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(items.sort((a, b) => b.updatedAt - a.updatedAt)));
}

function migrateLegacyIfNeeded(): void {
  if (typeof localStorage === "undefined") return;
  const idx = readIndex();
  if (idx.length > 0) return;
  const legacy = localStorage.getItem(STORAGE_KEY);
  if (!legacy) return;
  const id = `c_${Date.now().toString(36)}`;
  localStorage.setItem(docKey(id), legacy);
  writeIndex([{ id, title: tr(getCurrentLang(), "migratedCanvas"), updatedAt: Date.now() }]);
}

export function listGuestCanvases(): CanvasListItem[] {
  migrateLegacyIfNeeded();
  return readIndex();
}

export function getGuestCanvasData(id: string): string | null {
  return localStorage.getItem(docKey(id));
}

export function saveGuestCanvas(id: string, title: string, dataJson: string): void {
  const now = Date.now();
  localStorage.setItem(docKey(id), dataJson);
  const items = readIndex().filter((x) => x.id !== id);
  items.push({ id, title, updatedAt: now });
  writeIndex(items);
}

export function createGuestCanvas(title: string, initialDataJson: string): string {
  const items = readIndex();
  if (items.length >= GUEST_MAX_CANVASES) {
    throw new Error("guest_limit");
  }
  const id = `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  saveGuestCanvas(id, title, initialDataJson);
  return id;
}

export function deleteGuestCanvas(id: string): void {
  localStorage.removeItem(docKey(id));
  writeIndex(readIndex().filter((x) => x.id !== id));
}

export function renameGuestCanvas(id: string, title: string): void {
  const items = readIndex().map((x) => (x.id === id ? { ...x, title, updatedAt: Date.now() } : x));
  writeIndex(items);
}
