import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bookmark,
  Plus,
  Trash2,
  X,
  Sparkles,
  FolderPlus,
  Folder,
  Edit2,
  Check,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useWatchlists, type WatchlistCategory, type Watchlist, type SavedArticle } from "@/hooks/use-watchlists";

export const Route = createFileRoute("/watchlists")({
  head: () => ({ meta: [{ title: "Mes watchlists — VeillIA" }] }),
  component: WatchlistsPage,
});

function WatchlistsPage() {
  const { isAuthenticated, ready, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const {
    categories,
    watchlists,
    createCategory,
    renameCategory,
    deleteCategory,
    createWatchlist,
    renameWatchlist,
    deleteWatchlist,
    removeArticleFromWatchlist,
    addItemToWatchlist,
    removeItemFromWatchlist,
  } = useWatchlists(profile?.id ?? null);


  // Creation & Edit States
  const [newCatName, setNewCatName] = useState("");
  const [showCreateCat, setShowCreateCat] = useState(false);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catEditName, setCatEditName] = useState("");

  const [creatingWlCatId, setCreatingWlCatId] = useState<string | null>(null);
  const [newWlName, setNewWlName] = useState("");
  const [newWlDesc, setNewWlDesc] = useState("");

  const [editingWlId, setEditingWlId] = useState<string | null>(null);
  const [wlEditName, setWlEditName] = useState("");

  const [itemInputs, setItemInputs] = useState<Record<string, string>>({});
  const [expandedArticles, setExpandedArticles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/auth/login" });
  }, [ready, isAuthenticated, navigate]);

  if (!ready || !isAuthenticated) return null;

  const handleCreateCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCatName.trim()) return;
    createCategory(newCatName.trim());
    setNewCatName("");
    setShowCreateCat(false);
  };

  const handleSaveCatRename = (catId: string) => {
    if (catEditName.trim()) {
      renameCategory(catId, catEditName.trim());
    }
    setEditingCatId(null);
  };

  const handleCreateWatchlist = (catId: string) => {
    if (!newWlName.trim()) return;
    createWatchlist(newWlName.trim(), catId, newWlDesc.trim());
    setNewWlName("");
    setNewWlDesc("");
    setCreatingWlCatId(null);
  };

  const handleSaveWlRename = (wlId: string) => {
    if (wlEditName.trim()) {
      renameWatchlist(wlId, wlEditName.trim());
    }
    setEditingWlId(null);
  };

  const toggleArticlesExpand = (wlId: string) => {
    setExpandedArticles((prev) => ({ ...prev, [wlId]: !prev[wlId] }));
  };

  return (
    <SiteLayout>
      {/* Hero Banner */}
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Bookmark className="h-4 w-4" /> {t("wl_hero_badge")}
          </div>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            {t("wl_title")}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {t("wl_subtitle")}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCreateCat((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand hover:opacity-95 transition"
            >
              <FolderPlus className="h-4 w-4" /> {t("wl_new_category_btn")}
            </button>
          </div>

          {/* Create Category Form */}
          {showCreateCat && (
            <form
              onSubmit={handleCreateCategory}
              className="mt-4 max-w-md rounded-2xl border border-primary/30 bg-card p-4 shadow-card animate-in fade-in duration-150 space-y-3"
            >
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <FolderPlus className="h-4 w-4 text-primary" /> {t("wl_create_cat_title")}
              </h3>
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder={t("wl_create_cat_placeholder")}
                autoFocus
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCat(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  {t("btn_cancel")}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-gradient-brand px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-brand"
                >
                  {t("wl_create_cat_submit")}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Main Categories & Watchlists Content */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Folder className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-3 text-lg font-bold">{t("wl_empty_cats_title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("wl_empty_cats_desc")}
            </p>
            <button
              onClick={() => setShowCreateCat(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand"
            >
              <FolderPlus className="h-4 w-4" /> {t("wl_create_cat_submit")}
            </button>
          </div>
        ) : (
          categories.map((cat) => {
            const catWatchlists = watchlists.filter((w) => w.categoryId === cat.id);
            return (
              <div
                key={cat.id}
                className="rounded-2xl border border-border bg-card/60 p-6 shadow-xs space-y-5"
              >
                {/* Category Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
                      <Folder className="h-5 w-5" />
                    </div>

                    {editingCatId === cat.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={catEditName}
                          onChange={(e) => setCatEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveCatRename(cat.id);
                          }}
                          autoFocus
                          className="rounded-lg border border-input bg-background px-3 py-1 text-base font-bold outline-none focus:border-ring"
                        />
                        <button
                          onClick={() => handleSaveCatRename(cat.id)}
                          className="rounded-lg bg-primary/10 p-1.5 text-primary hover:bg-primary/20"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-foreground">{cat.name}</h2>
                          <button
                            onClick={() => {
                              setEditingCatId(cat.id);
                              setCatEditName(cat.name);
                            }}
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Renommer la catégorie"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {catWatchlists.length} watchlist{catWatchlists.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCreatingWlCatId(cat.id);
                        setNewWlName("");
                        setNewWlDesc("");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                    >
                      <Plus className="h-4 w-4" /> Watchlist
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Supprimer la catégorie "${cat.name}" et toutes ses watchlists ?`,
                          )
                        ) {
                          deleteCategory(cat.id);
                        }
                      }}
                      className="rounded-xl border border-destructive/20 p-2 text-destructive hover:bg-destructive/10 transition"
                      title="Supprimer la catégorie"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Create Watchlist inline form inside category */}
                {creatingWlCatId === cat.id && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                      <Plus className="h-4 w-4" /> {t("wl_new_wl_in")} "{cat.name}"
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={newWlName}
                        onChange={(e) => setNewWlName(e.target.value)}
                        placeholder={t("wl_name_placeholder")}
                        autoFocus
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                      />
                      <input
                        value={newWlDesc}
                        onChange={(e) => setNewWlDesc(e.target.value)}
                        placeholder={t("wl_desc_placeholder")}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setCreatingWlCatId(null)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        {t("btn_cancel")}
                      </button>
                      <button
                        onClick={() => handleCreateWatchlist(cat.id)}
                        className="rounded-lg bg-gradient-brand px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-brand"
                      >
                        {t("wl_create_wl_submit")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Watchlists Grid inside Category */}
                {catWatchlists.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
                    {t("wl_no_wl_in")} "{cat.name}".{" "}
                    <button
                      onClick={() => setCreatingWlCatId(cat.id)}
                      className="font-semibold text-primary hover:underline"
                    >
                      {t("wl_create_one_now")}
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {catWatchlists.map((w) => {
                      const articlesCount = w.articles?.length || 0;
                      const itemsCount = w.items?.length || 0;
                      const isExpanded = expandedArticles[w.id] ?? true;

                      return (
                        <div
                          key={w.id}
                          className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-brand"
                        >
                          <div>
                            {/* Watchlist Card Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                {editingWlId === w.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      value={wlEditName}
                                      onChange={(e) => setWlEditName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          handleSaveWlRename(w.id);
                                      }}
                                      autoFocus
                                      className="rounded-md border border-input bg-background px-2 py-1 text-sm font-semibold outline-none focus:border-ring"
                                    />
                                    <button
                                      onClick={() => handleSaveWlRename(w.id)}
                                      className="rounded p-1 text-primary hover:bg-primary/10"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <h3 className="font-bold text-base text-foreground">
                                      {w.name}
                                    </h3>
                                    <button
                                      onClick={() => {
                                        setEditingWlId(w.id);
                                        setWlEditName(w.name);
                                      }}
                                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}

                                {w.description && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {w.description}
                                  </p>
                                )}
                              </div>

                              <button
                                onClick={() => deleteWatchlist(w.id)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                title="Supprimer la watchlist"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Saved Articles Section */}
                            <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                                <span className="flex items-center gap-1.5">
                                  <FileText className="h-3.5 w-3.5 text-primary" />
                                  {t("wl_saved_articles_label")} ({articlesCount})
                                </span>
                                {articlesCount > 0 && (
                                  <button
                                    onClick={() => toggleArticlesExpand(w.id)}
                                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                  >
                                    {isExpanded ? (
                                      <>{t("wl_hide")} <ChevronUp className="h-3 w-3" /></>
                                    ) : (
                                      <>{t("wl_show")} <ChevronDown className="h-3 w-3" /></>
                                    )}
                                  </button>
                                )}
                              </div>

                              {articlesCount === 0 ? (
                                <p className="text-xs italic text-muted-foreground py-1">
                                  {t("wl_no_articles_saved")}
                                </p>
                              ) : (
                                isExpanded && (
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {w.articles.map((art) => (
                                      <div
                                        key={art.id}
                                        className="flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-xs transition hover:bg-muted/60"
                                      >
                                        <div className="truncate flex-1">
                                          <Link
                                            to={`/analyses/$id`}
                                            params={{ id: encodeURIComponent(art.id) }}
                                            className="font-medium hover:text-primary transition flex items-center gap-1.5 truncate"
                                          >
                                            <span className="truncate">{art.title}</span>
                                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                                          </Link>
                                          {art.source && (
                                            <span className="text-[10px] text-muted-foreground block">
                                              {art.source}
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => removeArticleFromWatchlist(w.id, art.id)}
                                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                                          title="Retirer l'article de la watchlist"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )
                              )}
                            </div>

                            {/* Keywords / Topics Section */}
                            <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                              <div className="text-xs font-semibold text-foreground">
                                {t("wl_topics_keywords")} ({itemsCount})
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {w.items.map((it) => (
                                  <span
                                    key={it}
                                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                                  >
                                    {it}
                                    <button
                                      onClick={() => removeItemFromWatchlist(w.id, it)}
                                      className="rounded-full hover:bg-primary/20 p-0.5"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>

                              {/* Input to add a new topic keyword */}
                              <div className="flex gap-1.5 pt-1">
                                <input
                                  value={itemInputs[w.id] ?? ""}
                                  onChange={(e) =>
                                    setItemInputs((s) => ({
                                      ...s,
                                      [w.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const v = (itemInputs[w.id] ?? "").trim();
                                      if (v) {
                                        addItemToWatchlist(w.id, v);
                                        setItemInputs((s) => ({
                                          ...s,
                                          [w.id]: "",
                                        }));
                                      }
                                    }
                                  }}
                                  placeholder={t("wl_add_keyword_placeholder")}
                                  className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus:border-ring"
                                />
                                <button
                                  onClick={() => {
                                    const v = (itemInputs[w.id] ?? "").trim();
                                    if (!v) return;
                                    addItemToWatchlist(w.id, v);
                                    setItemInputs((s) => ({
                                      ...s,
                                      [w.id]: "",
                                    }));
                                  }}
                                  className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                                >
                                  {t("wl_add_btn")}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-2 flex items-center justify-between border-t border-border/40 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-accent" /> {t("wl_ia_active")}
                            </span>
                            <span>{articlesCount} articles</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}

        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
          <p className="text-sm text-muted-foreground">Besoin d'inspiration ?</p>
          <Link
            to="/decouvrir"
            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Explorer les fonctionnalités de veille →
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
