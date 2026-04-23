import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getGuestCanvasData, listGuestCanvases, saveGuestCanvas } from "../documents/guestCanvases";
import { getCloudCanvas, saveCloudCanvas } from "../documents/cloudCanvases";
import { MindMapWorkspace } from "../components/MindMapWorkspace";
import { initialState, serializeState } from "../mindMapReducer";

const EMPTY_DOC = serializeState(initialState);

export function EditorPage() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<string | null>(null);
  const [title, setTitle] = useState("未命名画布");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!docId) {
        navigate("/", { replace: true });
        return;
      }
      try {
        if (user) {
          const d = await getCloudCanvas(user.uid, docId);
          if (cancelled) return;
          if (!d) {
            navigate("/", { replace: true });
            return;
          }
          setTitle(d.title);
          setPayload(d.data || EMPTY_DOC);
        } else {
          const raw = getGuestCanvasData(docId);
          if (cancelled) return;
          if (!raw) {
            navigate("/", { replace: true });
            return;
          }
          const meta = listGuestCanvases().find((x) => x.id === docId);
          setTitle(meta?.title ?? "未命名画布");
          setPayload(raw);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docId, user, navigate]);

  const persistTitle = useCallback(() => {
    if (!docId) return;
    if (user) {
      void (async () => {
        const cur = await getCloudCanvas(user.uid, docId);
        await saveCloudCanvas(user.uid, docId, title, cur?.data ?? EMPTY_DOC);
      })();
      return;
    }
    const raw = getGuestCanvasData(docId);
    if (raw) saveGuestCanvas(docId, title, raw);
  }, [docId, title, user]);

  const onPersist = useCallback(
    (json: string) => {
      if (!docId) return;
      if (user) void saveCloudCanvas(user.uid, docId, title, json);
      else saveGuestCanvas(docId, title, json);
    },
    [docId, title, user]
  );

  const trialBanner =
    user ? (
      <div className="trial-banner trial-banner--ok">
        <span>
          已登录：<strong>{user.email ?? user.displayName ?? user.uid}</strong>，画布会自动保存到你的账户。
        </span>
        <label className="doc-title-edit">
          画布名称
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={persistTitle}
          />
        </label>
      </div>
    ) : (
      <div className="trial-banner trial-banner--warn">
        <strong>试用阶段：</strong>
        数据仅保存在本浏览器，换设备或清理缓存会丢失；他人无法看到你的画布。请使用 Google 登录以云端保存并跨设备访问。
        <label className="doc-title-edit">
          画布名称（本地）
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={persistTitle}
          />
        </label>
      </div>
    );

  if (loading || payload === null) {
    return (
      <div className="page-loading">
        <p>加载画布…</p>
      </div>
    );
  }

  return (
    <MindMapWorkspace
      key={`${docId}-${user?.uid ?? "guest"}`}
      initialDataJson={payload}
      onPersist={onPersist}
      trialBanner={trialBanner}
    />
  );
}
