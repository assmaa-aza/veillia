import { useState } from "react";
import { Bookmark, BookmarkCheck, Bell, FileText, Sparkles, Plus, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWatchlists } from "@/hooks/use-watchlists";
import { Link } from "@tanstack/react-router";

type Props = { articleId: string; title: string; compact?: boolean };

export function ArticleActions({ articleId, title, compact = false }: Props) {
  const { isAuthenticated } = useAuth();
  const { lists, addItem, create } = useWatchlists();
  const [saved, setSaved] = useState(false);
  const [alert, setAlert] = useState(false);
  const [showWL, setShowWL] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newWLName, setNewWLName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

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
    setTimeout(() => setMsg(null), 1800);
  };

  const handleSave = () => {
    setSaved(true);
    flash("Article sauvegardé");
  };

  const handleAlert = () => {
    setAlert(true);
    flash("Alerte créée");
  };

  const handleReport = () => flash("Rapport IA en génération…");
  const handleAnalyze = () => flash("Analyse IA lancée…");

  const handleAddToWL = (id: string) => {
    addItem(id, title);
    setShowWL(false);
    flash("Ajouté à la watchlist");
  };



  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary";

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={handleSave} className={btn} aria-label="Sauvegarder">
          {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />}
          {saved ? "Sauvegardé" : "Sauvegarder"}
        </button>
        <button onClick={() => { setShowWL((v) => !v); setCreating(false); setNewWLName(""); }} className={btn}>
          <Plus className="h-3.5 w-3.5" /> Watchlist
        </button>
        <button onClick={handleAlert} className={btn}>
          {alert ? <Check className="h-3.5 w-3.5 text-primary" /> : <Bell className="h-3.5 w-3.5" />}
          Alerte
        </button>
        <button onClick={handleReport} className={btn}>
          <FileText className="h-3.5 w-3.5" /> Rapport IA
        </button>
        <button onClick={handleAnalyze} className={btn}>
          <Sparkles className="h-3.5 w-3.5" /> Analyser
        </button>
      </div>

      {showWL && (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-popover p-2 shadow-card">
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Ajouter à…</div>
          <div className="max-h-48 overflow-y-auto">
            {lists.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground">Aucune watchlist.</div>
            )}
            {lists.map((w) => (
              <button
                key={w.id}
                onClick={() => handleAddToWL(w.id)}
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                {w.name}
                <span className="ml-2 text-xs text-muted-foreground">{w.type}</span>
              </button>
            ))}
          </div>
          {creating ? (
            <div className="mt-1 border-t border-border p-2">
              <input
                value={newWLName}
                onChange={(e) => setNewWLName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const name = newWLName.trim();
                    if (name) {
                      create(name, "keywords");
                      flash("Watchlist créée");
                      setNewWLName("");
                      setCreating(false);
                    }
                  }
                }}
                placeholder="Nom de la watchlist…"
                autoFocus
                className="w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus:border-ring"
              />
              <div className="mt-1.5 flex justify-end gap-1">
                <button
                  onClick={() => setCreating(false)}
                  className="rounded px-2 py-1 text-[10px] hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const name = newWLName.trim();
                    if (name) {
                      create(name, "keywords");
                      flash("Watchlist créée");
                      setNewWLName("");
                      setCreating(false);
                    }
                  }}
                  className="rounded bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20"
                >
                  Créer
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-border px-2 py-2 text-xs font-semibold text-primary hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" /> Nouvelle watchlist
            </button>
          )}
        </div>
      )}

      {msg && (
        <div className="pointer-events-none absolute -top-9 left-0 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow">
          {msg}
        </div>
      )}
    </div>
  );
}
