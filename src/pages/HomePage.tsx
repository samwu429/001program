import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  GUEST_MAX_CANVASES,
  createGuestCanvas,
  deleteGuestCanvas,
  listGuestCanvases,
  renameGuestCanvas,
  type CanvasListItem,
} from "../documents/guestCanvases";
import { createCloudCanvas, deleteCloudCanvas, getCloudCanvas, listCloudCanvases, saveCloudCanvas } from "../documents/cloudCanvases";
import { initialState, serializeState } from "../mindMapReducer";

const EMPTY = serializeState(initialState);

export function HomePage() {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, signOutApp, cloudAvailable } = useAuth();
  const [items, setItems] = useState<CanvasListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const refresh = useCallback(async () => {
    setListLoading(true);
    try {
      if (user) {
        const list = await listCloudCanvases(user.uid);
        setItems(list);
      } else {
        setItems(listGuestCanvases());
      }
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onNew = useCallback(async () => {
    try {
      if (user) {
        const id = await createCloudCanvas(user.uid, "未命名画布", EMPTY);
        navigate(`/c/${id}`);
        return;
      }
      const id = createGuestCanvas("未命名画布", EMPTY);
      navigate(`/c/${id}`);
    } catch (e) {
      if ((e as Error).message === "guest_limit") {
        window.alert(`试用阶段每个浏览器最多保存 ${GUEST_MAX_CANVASES} 个画布。请登录 Google 以使用云端无限画布。`);
        return;
      }
      window.alert("创建失败，请检查网络或 Firebase 配置。");
    }
  }, [navigate, user]);

  const onRename = useCallback(
    (id: string) => {
      const t = window.prompt("新名称", items.find((x) => x.id === id)?.title ?? "");
      if (!t) return;
      if (user) {
        void (async () => {
          const cur = await getCloudCanvas(user.uid, id);
          await saveCloudCanvas(user.uid, id, t, cur?.data ?? EMPTY);
          void refresh();
        })();
      } else {
        renameGuestCanvas(id, t);
        void refresh();
      }
    },
    [items, refresh, user]
  );

  const onDelete = useCallback(
    (id: string) => {
      if (!window.confirm("删除该画布？此操作不可恢复。")) return;
      if (user) {
        void deleteCloudCanvas(user.uid, id).then(refresh);
      } else {
        deleteGuestCanvas(id);
        void refresh();
      }
    },
    [refresh, user]
  );

  if (loading) {
    return (
      <div className="page-loading">
        <p>正在检查登录状态…</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {!user && (
        <div className="trial-banner trial-banner--warn home-trial">
          <strong>试用阶段：</strong>
          当前未登录，画布仅保存在本机浏览器，不会同步到云端，也不会被他人看到。请使用 Google 登录以启用个人云端画布（仅本人可见）。
        </div>
      )}

      <header className="home-header">
        <div>
          <h1 className="home-title">001 思维导图</h1>
          <p className="home-sub">创建、打开并自动保存你的画布</p>
        </div>
        <div className="home-auth">
          {user ? (
            <>
              <span className="home-user">{user.email ?? user.displayName}</span>
              <button type="button" className="toolbar-btn" onClick={() => void signOutApp()}>
                退出
              </button>
            </>
          ) : (
            <>
              <button type="button" className="toolbar-btn primary" onClick={() => void signInWithGoogle()}>
                Google 登录
              </button>
              {!cloudAvailable && (
                <span className="home-hint">（未配置 Firebase 时仅本地试用）</span>
              )}
            </>
          )}
        </div>
      </header>

      <section className="home-actions">
        <button type="button" className="toolbar-btn primary" onClick={() => void onNew()}>
          新建画布
        </button>
        {!user && (
          <span className="home-limit-hint">
            试用最多 {GUEST_MAX_CANVASES} 个本地画布 · 已用 {items.length}/{GUEST_MAX_CANVASES}
          </span>
        )}
      </section>

      <section className="home-list">
        <h2>我的画布</h2>
        {listLoading ? (
          <p>加载列表…</p>
        ) : items.length === 0 ? (
          <p className="home-empty">还没有画布，点击「新建画布」开始。</p>
        ) : (
          <ul className="home-cards">
            {items.map((it) => (
              <li key={it.id} className="home-card">
                <Link to={`/c/${it.id}`} className="home-card-link">
                  <div className="home-card-title">{it.title}</div>
                  <div className="home-card-meta">{new Date(it.updatedAt).toLocaleString()}</div>
                </Link>
                <div className="home-card-actions">
                  <button type="button" className="toolbar-btn" onClick={() => onRename(it.id)}>
                    重命名
                  </button>
                  <button type="button" className="toolbar-btn" onClick={() => onDelete(it.id)}>
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
