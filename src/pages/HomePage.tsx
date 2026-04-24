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
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      console.error("list canvases failed", e);
      window.alert(`加载画布列表失败：${msg}`);
      setItems([]);
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

  const totalCount = items.length;
  const guestUsage = `${Math.min(totalCount, GUEST_MAX_CANVASES)}/${GUEST_MAX_CANVASES}`;

  return (
    <div className="home-page home-shell console-home">
      <div className="console-frame">
        <header className="console-header">
          <div className="console-brand">
            <p className="console-brand-tag">Mind Map Studio</p>
            <h1 className="home-title">001 思维导图</h1>
            <p className="home-sub">统一材质工作台 · 木质承载内容 · 金属承载控制</p>
          </div>
          <div className="console-auth">
            {user ? (
              <>
                <span className="console-status console-status-ok">{user.email ?? user.displayName ?? "已登录"}</span>
                <button type="button" className="home-btn home-btn-metal" onClick={() => void signOutApp()}>
                  退出
                </button>
              </>
            ) : (
              <>
                <button type="button" className="home-btn home-btn-metal home-btn-primary" onClick={() => void signInWithGoogle()}>
                  Google 登录
                </button>
                <span className="console-status console-status-warn">试用模式</span>
              </>
            )}
          </div>
        </header>

        <div className="console-control-strip">
          <button type="button" className="home-btn home-btn-wood" onClick={() => void onNew()}>
            + 新建画布
          </button>
          <button type="button" className="home-btn home-btn-metal" onClick={() => void refresh()}>
            刷新
          </button>
          <div className="console-meter" aria-label="overview">
            <div className="console-meter-item">
              <span>画布</span>
              <strong>{totalCount}</strong>
            </div>
            <div className="console-meter-item">
              <span>状态</span>
              <strong>{user ? "云端" : `本地 ${guestUsage}`}</strong>
            </div>
          </div>
          <div className="console-knob" aria-hidden>
            <div className="console-knob-core" />
          </div>
        </div>

        <section className="console-content-grid">
          <div className="console-panel console-panel-wood">
            <div className="console-panel-head">
              <h2>我的画布</h2>
            </div>
            {listLoading ? (
              <p className="home-empty">加载列表…</p>
            ) : items.length === 0 ? (
              <p className="home-empty">还没有画布，点击「新建画布」开始。</p>
            ) : (
              <ul className="console-card-list">
                {items.map((it, idx) => (
                  <li key={it.id} className="console-card">
                    <div className="console-card-screw" aria-hidden />
                    <Link to={`/c/${it.id}`} className="console-card-main">
                      <div className="home-card-title">{it.title}</div>
                      <div className="home-card-meta">{new Date(it.updatedAt).toLocaleString()}</div>
                      <div className="console-card-index">#{idx + 1}</div>
                    </Link>
                    <div className="console-card-actions">
                      <button type="button" className="home-btn home-btn-metal" onClick={() => onRename(it.id)}>
                        重命名
                      </button>
                      <button type="button" className="home-btn home-btn-metal" onClick={() => onDelete(it.id)}>
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="console-panel console-panel-metal">
            <div className="console-panel-head">
              <h3>账号与存储</h3>
            </div>
            {!user ? (
              <div className="console-note console-note-warn">
                <strong>试用阶段：</strong>
                当前未登录，画布仅保存在本机浏览器，不会同步到云端，也不会被他人看到。请登录以启用账号隔离与跨设备访问。
              </div>
            ) : (
              <div className="console-note console-note-ok">
                <strong>云端已启用：</strong>
                你的画布会自动保存到当前账号，默认仅你本人可访问。
              </div>
            )}
            {!cloudAvailable && (
              <p className="home-hint">当前站点未读取到 Firebase 环境变量，登录异常时请检查 Secrets 与部署状态。</p>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
