import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getGuestCanvasData, listGuestCanvases, saveGuestCanvas } from "../documents/guestCanvases";
import { getCloudCanvas, saveCloudCanvas } from "../documents/cloudCanvases";
import { MindMapWorkspace } from "../components/MindMapWorkspace";
import { initialState, serializeState } from "../mindMapReducer";
import { useI18n } from "../i18n";

const EMPTY_DOC = serializeState(initialState);

export function EditorPage() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<string | null>(null);
  const [title, setTitle] = useState(t("unnamedCanvas"));

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
          setTitle(meta?.title ?? t("unnamedCanvas"));
          setPayload(raw);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docId, user, navigate, t]);

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
          {t("signedInBanner")}
          <strong>{user.email ?? user.displayName ?? user.uid}</strong>, {t("autoSaveCloud")}
        </span>
        <label className="doc-title-edit">
          {t("canvasName")}
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
        <strong>{t("trialBannerTitle")}</strong>
        {t("trialBannerDesc")}
        <label className="doc-title-edit">
          {t("canvasNameLocal")}
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
        <p>{t("loadingCanvas")}</p>
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
