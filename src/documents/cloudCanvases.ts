import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import type { CanvasListItem } from "./guestCanvases";
import { getDb } from "../firebase/client";
import { getCurrentLang, tr } from "../i18n";

function col(uid: string) {
  const db = getDb();
  if (!db) throw new Error("no_db");
  return collection(db, "users", uid, "canvases");
}

export async function listCloudCanvases(uid: string): Promise<CanvasListItem[]> {
  const db = getDb();
  if (!db) return [];
  const q = query(col(uid), orderBy("updatedAt", "desc"), limit(80));
  const snap = await getDocs(q);
  const out: CanvasListItem[] = [];
  snap.forEach((d) => {
    const v = d.data() as { title?: string; updatedAt?: number };
    out.push({
      id: d.id,
      title: typeof v.title === "string" ? v.title : tr(getCurrentLang(), "unnamedCanvas"),
      updatedAt: typeof v.updatedAt === "number" ? v.updatedAt : 0,
    });
  });
  return out;
}

export async function getCloudCanvas(uid: string, id: string): Promise<{ title: string; data: string } | null> {
  const db = getDb();
  if (!db) return null;
  const ref = doc(db, "users", uid, "canvases", id);
  const s = await getDoc(ref);
  if (!s.exists()) return null;
  const v = s.data() as { title?: string; data?: string };
  return {
    title: typeof v.title === "string" ? v.title : tr(getCurrentLang(), "unnamedCanvas"),
    data: typeof v.data === "string" ? v.data : "{}",
  };
}

export async function saveCloudCanvas(uid: string, id: string, title: string, dataJson: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("no_db");
  const ref = doc(db, "users", uid, "canvases", id);
  await setDoc(
    ref,
    {
      title,
      updatedAt: Date.now(),
      data: dataJson,
    },
    { merge: true }
  );
}

export async function createCloudCanvas(uid: string, title: string, initialDataJson: string): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("no_db");
  const id = `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await saveCloudCanvas(uid, id, title, initialDataJson);
  return id;
}

export async function deleteCloudCanvas(uid: string, id: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("no_db");
  await deleteDoc(doc(db, "users", uid, "canvases", id));
}
