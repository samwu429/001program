import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../i18n";
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
import { SiteFooter } from "../components/SiteFooter";
import heroArt from "../assets/hero-dashboard.png";

const EMPTY = serializeState(initialState);

export function HomePage() {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, signOutApp, cloudAvailable } = useAuth();
  const { lang, setLang, t } = useI18n();
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
      window.alert(t("listFailed", { msg }));
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
        const id = await createCloudCanvas(user.uid, t("unnamedCanvas"), EMPTY);
        navigate(`/c/${id}`);
        return;
      }
      const id = createGuestCanvas(t("unnamedCanvas"), EMPTY);
      navigate(`/c/${id}`);
    } catch (e) {
      if ((e as Error).message === "guest_limit") {
        window.alert(t("guestLimit", { limit: GUEST_MAX_CANVASES }));
        return;
      }
      window.alert(t("createFailed"));
    }
  }, [navigate, t, user]);

  const onRename = useCallback(
    (id: string) => {
      const nextTitle = window.prompt(t("renamePrompt"), items.find((x) => x.id === id)?.title ?? "");
      if (!nextTitle) return;
      if (user) {
        void (async () => {
          const cur = await getCloudCanvas(user.uid, id);
          await saveCloudCanvas(user.uid, id, nextTitle, cur?.data ?? EMPTY);
          void refresh();
        })();
      } else {
        renameGuestCanvas(id, nextTitle);
        void refresh();
      }
    },
    [items, refresh, t, user]
  );

  const onDelete = useCallback(
    (id: string) => {
      if (!window.confirm(t("deleteConfirm"))) return;
      if (user) {
        void deleteCloudCanvas(user.uid, id).then(refresh);
      } else {
        deleteGuestCanvas(id);
        void refresh();
      }
    },
    [refresh, t, user]
  );

  if (loading) {
    return (
      <div className="page-loading">
        <p>{t("loadingAuth")}</p>
      </div>
    );
  }

  const totalCount = items.length;
  const guestUsage = `${Math.min(totalCount, GUEST_MAX_CANVASES)}/${GUEST_MAX_CANVASES}`;
  const modeText = user ? t("cloudAccountMode") : t("localTrialMode");

  return (
    <div className="home-page home-shell console-home">
      <header className="console-home-top">
        <div className="console-home-brand-plate">
          <div className="console-brand">
            <p className="console-brand-kicker">{t("homeBrandKicker")}</p>
            <span className="console-brand-overline" aria-hidden />
            <p className="console-brand-tag">{t("brand")}</p>
            <h1 className="home-title">{t("appTitle")}</h1>
          </div>
        </div>
        <div className="console-home-top-auth">
          <div className="console-auth">
            <button type="button" className="home-btn home-btn-metal" onClick={() => setLang(lang === "en" ? "zh" : "en")}>
              {t("language")} {lang === "en" ? t("chinese") : t("english")}
            </button>
            {user ? (
              <>
                <span className="console-status console-status-ok">{user.email ?? user.displayName ?? t("signedIn")}</span>
                <button type="button" className="home-btn home-btn-metal" onClick={() => void signOutApp()}>
                  {t("signOut")}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="home-btn home-btn-metal home-btn-primary" onClick={() => void signInWithGoogle()}>
                  {t("signInGoogle")}
                </button>
                <span className="console-status console-status-warn">{t("trialMode")}</span>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="console-frame">
        <div className="console-control-strip">
          <button type="button" className="home-btn home-btn-wood" onClick={() => void onNew()}>
            {t("newCanvas")}
          </button>
          <button type="button" className="home-btn home-btn-metal" onClick={() => void refresh()}>
            {t("refresh")}
          </button>
          <div className="console-meter" aria-label="overview">
            <div className="console-meter-item">
              <span>{t("canvases")}</span>
              <strong>{totalCount}</strong>
            </div>
            <div className="console-meter-item">
              <span>{t("status")}</span>
              <strong>{user ? t("cloud") : t("local", { usage: guestUsage })}</strong>
            </div>
          </div>
        </div>

        <section className="console-hero" aria-labelledby="home-hero-title">
          <span className="visually-hidden">{t("homeHeroImgAlt")}</span>
          <div className="console-hero-media" aria-hidden="true">
            <img src={heroArt} alt="" width={2560} height={1097} decoding="async" />
            <div className="console-hero-scrim" />
          </div>
          <div className="console-hero-copy">
            <div className="console-hero-accent">
              <span className="console-hero-overline" aria-hidden />
              <p className="console-hero-kicker">{t("homeHeroKicker")}</p>
            </div>
            <h2 id="home-hero-title" className="console-hero-title">
              {t("homeHeroTitle")}
            </h2>
            <p className="console-hero-deck">{t("homeHeroEyebrow")}</p>
            <p className="console-hero-lead">{t("homeHeroLead")}</p>
            <ul className="console-hero-features">
              <li>{t("homeHeroF1")}</li>
              <li>{t("homeHeroF2")}</li>
              <li>{t("homeHeroF3")}</li>
            </ul>
            <button type="button" className="home-btn home-btn-wood console-hero-cta" onClick={() => void onNew()}>
              {t("newCanvas")}
            </button>
          </div>
        </section>

        <section className="console-content-grid">
          <div className="console-panel console-panel-wood">
            <div className="console-panel-head">
              <p className="console-panel-kicker">{t("panelKickerMyCanvases")}</p>
              <span className="console-panel-overline" aria-hidden />
              <h2>{t("myCanvases")}</h2>
            </div>
            {listLoading ? (
              <p className="home-empty">{t("loadingList")}</p>
            ) : items.length === 0 ? (
              <p className="home-empty">{t("emptyCanvases")}</p>
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
                        {t("rename")}
                      </button>
                      <button type="button" className="home-btn home-btn-metal" onClick={() => onDelete(it.id)}>
                        {t("delete")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="console-panel console-panel-metal">
            <div className="console-panel-head">
              <p className="console-panel-kicker">{t("panelKickerAccount")}</p>
              <span className="console-panel-overline" aria-hidden />
              <h3>{t("accountStorage")}</h3>
            </div>
            {!user ? (
              <div className="console-note console-note-warn">
                <strong>{t("trialMode")}:</strong>
                {t("trialDesc")}
              </div>
            ) : (
              <div className="console-note console-note-ok">
                <strong>{t("cloud")}:</strong>
                {t("cloudDesc")}
              </div>
            )}
            {!cloudAvailable && (
              <p className="home-hint">{t("cloudHint")}</p>
            )}
          </aside>
        </section>

        <section className="console-bottom-grid">
          <div className="console-panel console-panel-metal">
            <div className="console-panel-head">
              <p className="console-panel-kicker">{t("panelKickerQuickActions")}</p>
              <span className="console-panel-overline" aria-hidden />
              <h3>{t("quickActions")}</h3>
            </div>
            <div className="console-quick-list">
              <button type="button" className="home-btn home-btn-wood" onClick={() => void onNew()}>
                {t("newBlankCanvas")}
              </button>
              <button type="button" className="home-btn home-btn-metal" onClick={() => void refresh()}>
                {t("syncList")}
              </button>
              {!user && (
                <button type="button" className="home-btn home-btn-metal home-btn-primary" onClick={() => void signInWithGoogle()}>
                  {t("signInEnableCloud")}
                </button>
              )}
            </div>
          </div>

          <div className="console-panel console-panel-wood">
            <div className="console-panel-head">
              <p className="console-panel-kicker">{t("panelKickerWorkspace")}</p>
              <span className="console-panel-overline" aria-hidden />
              <h3>{t("workspaceStatus")}</h3>
            </div>
            <div className="console-badge-row">
              <span className="console-card-index">{modeText}</span>
              <span className="console-card-index">{t("currentCanvases", { count: totalCount })}</span>
              <span className="console-card-index">{user ? t("crossDevice") : t("localLimit", { usage: guestUsage })}</span>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
