import { useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Bell,
  Sparkles,
  Plus,
  Check,
  FolderPlus,
  Folder,
  Layers,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWatchlists } from "@/hooks/use-watchlists";
import { useReport } from "@/hooks/use-report";
import { Link } from "@tanstack/react-router";

type Props = {
  articleId: string;
  title: string;
  url?: string;
  source?: string;
  category?: string;
  published_at?: string;
  compact?: boolean;
};

export function ArticleActions({
  articleId,
  title,
  url,
  source,
  category,
  published_at,
  compact = false,
}: Props) {
  const { isAuthenticated, profile } = useAuth();
  const {
    categories,
    watchlists,
    createCategory,
    createWatchlist,
    addArticleToWatchlist,
    removeArticleFromWatchlist,
    getWatchlistsForArticle,
  } = useWatchlists(profile?.id ?? null);
  const { toggleArticle, isArticleInReport } = useReport();

  const [alert, setAlert] = useState(false);
  const [showWL, setShowWL] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Quick creation forms state inside popover
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingWlCatId, setCreatingWlCatId] = useState<string | null>(null);
  const [newWlName, setNewWlName] = useState("");

  if (!isAuthenticated) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
        <Link
          to="/auth/signup"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-brand"
        >
          <Sparkles className="h-3.5 w-3.5" /> S'inscrire pour sauvegarder
        </Link>
      </div>
    );
  }

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2000);
  };

  const activeWatchlistIds = getWatchlistsForArticle(articleId);
  const isSavedInAny = activeWatchlistIds.length > 0;

  const handleToggleWatchlist = (watchlistId: string) => {
    const isCurrentlySaved = activeWatchlistIds.includes(watchlistId);
    if (isCurrentlySaved) {
      removeArticleFromWatchlist(watchlistId, articleId);
      flash("Retiré de la watchlist");
    } else {
      addArticleToWatchlist(watchlistId, {
        id: articleId,
        title,
        url,
        source,
        category,
        published_at,
      });
      flash("Ajouté à la watchlist");
    }
  };

  const handleAlert = () => {
    setAlert(true);
    flash("Alerte créée");
  };

  const inReport = isArticleInReport(articleId);

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    const cat = createCategory(newCatName.trim());
    if (cat) {
      setNewCatName("");
      setCreatingCat(false);
      setCreatingWlCatId(cat.id);
      flash(`Catégorie "${cat.name}" créée`);
    }
  };

  const handleCreateWatchlist = (categoryId: string) => {
    if (!newWlName.trim()) return;
    const wl = createWatchlist(newWlName.trim(), categoryId);
    if (wl) {
      // Automatically save article to newly created watchlist
      addArticleToWatchlist(wl.id, {
        id: articleId,
        title,
        url,
        source,
        category,
        published_at,
      });
      setNewWlName("");
      setCreatingWlCatId(null);
      flash(`Watchlist "${wl.name}" créée & article ajouté`);
    }
  };

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary";

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => {
            setShowWL((v) => !v);
            setCreatingCat(false);
            setCreatingWlCatId(null);
          }}
          className={`${btn} ${isSavedInAny ? "border-primary/50 bg-primary/10 text-primary font-semibold" : ""}`}
          aria-label="Sauvegarder dans vos watchlists"
        >
          {isSavedInAny ? (
            <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Bookmark className="h-3.5 w-3.5" />
          )}
          {isSavedInAny
            ? `Sauvegardé (${activeWatchlistIds.length})`
            : "Sauvegarder"}
        </button>

        <button onClick={handleAlert} className={btn}>
          {alert ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
          Alerte
        </button>

        <button
          onClick={() =>
            toggleArticle({
              id: articleId,
              title,
              url,
              source,
              category,
              published_at,
            })
          }
          className={`${btn} ${inReport ? "border-primary/50 bg-primary/10 text-primary font-semibold" : ""}`}
        >
          {inReport ? (
            <><Check className="h-3.5 w-3.5 text-primary" /> Ajouté au rapport</>
          ) : (
            <><Plus className="h-3.5 w-3.5" /> Ajouter au rapport</>
          )}
        </button>
      </div>

      {/* Watchlist Picker Popover */}
      {showWL && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-2xl border border-border bg-popover p-3 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-border pb-2 px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" /> Vos watchlists
            </div>
            <button
              onClick={() => setShowWL(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 max-h-64 overflow-y-auto space-y-3 pr-1">
            {categories.length === 0 ? (
              <div className="py-3 text-center text-xs text-muted-foreground">
                Aucune catégorie disponible.
              </div>
            ) : (
              categories.map((cat) => {
                const catWatchlists = watchlists.filter(
                  (w) => w.categoryId === cat.id,
                );
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-1.5">
                      <span className="flex items-center gap-1">
                        <Folder className="h-3 w-3 text-primary/70" />
                        {cat.name}
                      </span>
                      <button
                        onClick={() => {
                          setCreatingWlCatId(cat.id);
                          setCreatingCat(false);
                        }}
                        className="text-primary hover:underline"
                      >
                        + Watchlist
                      </button>
                    </div>

                    {catWatchlists.length === 0 ? (
                      <div className="px-2 py-1 text-[11px] italic text-muted-foreground">
                        Aucune watchlist dans cette catégorie.
                      </div>
                    ) : (
                      catWatchlists.map((w) => {
                        const isChecked = activeWatchlistIds.includes(w.id);
                        return (
                          <label
                            key={w.id}
                            className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition ${
                              isChecked
                                ? "bg-primary/10 text-primary shadow-xs font-semibold"
                                : "hover:bg-muted text-foreground/90"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleWatchlist(w.id)}
                                className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary/30"
                              />
                              <span className="truncate">{w.name}</span>
                            </span>
                            {isChecked && (
                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                          </label>
                        );
                      })
                    )}

                    {/* Inline form to create a watchlist in this category */}
                    {creatingWlCatId === cat.id && (
                      <div className="mt-1 rounded-xl border border-primary/30 bg-primary/5 p-2 space-y-1.5">
                        <input
                          value={newWlName}
                          onChange={(e) => setNewWlName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateWatchlist(cat.id);
                          }}
                          placeholder="Nom de la watchlist…"
                          autoFocus
                          className="w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus:border-ring"
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setCreatingWlCatId(null)}
                            className="rounded px-2 py-0.5 text-[10px] hover:bg-muted"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleCreateWatchlist(cat.id)}
                            className="rounded bg-gradient-brand px-2 py-0.5 text-[10px] font-semibold text-primary-foreground"
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Form to create a new custom category */}
            {creatingCat ? (
              <div className="rounded-xl border border-border bg-card p-2 space-y-1.5">
                <div className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <FolderPlus className="h-3.5 w-3.5 text-primary" /> Nouvelle catégorie
                </div>
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCategory();
                  }}
                  placeholder="Ex: Veille Concurrentielle…"
                  autoFocus
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus:border-ring"
                />
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => setCreatingCat(false)}
                    className="rounded px-2 py-0.5 text-[10px] hover:bg-muted"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateCategory}
                    className="rounded bg-gradient-brand px-2 py-0.5 text-[10px] font-semibold text-primary-foreground"
                  >
                    Créer
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setCreatingCat(true);
                  setCreatingWlCatId(null);
                }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 transition"
              >
                <FolderPlus className="h-3.5 w-3.5" /> Nouvelle catégorie
              </button>
            )}
          </div>
        </div>
      )}

      {msg && (
        <div className="pointer-events-none absolute -top-9 left-0 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-md">
          {msg}
        </div>
      )}
    </div>
  );
}
