import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, Plus, Trash2, X, Building2, Cpu, Rocket, Scale, Hash, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useWatchlists, type WatchlistType } from "@/hooks/use-watchlists";
import { Link, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/watchlists")({
  head: () => ({ meta: [{ title: "Mes watchlists — VeillIA" }] }),
  component: WatchlistsPage,
});

const TYPES: { value: WatchlistType; label: string; icon: typeof Building2; hint: string }[] = [
  { value: "companies", label: "Entreprises", icon: Building2, hint: "OpenAI, Anthropic, Mistral…" },
  { value: "technologies", label: "Technologies", icon: Cpu, hint: "RAG, Agents, Multimodal…" },
  { value: "startups", label: "Startups", icon: Rocket, hint: "Levées, lancements, pivots." },
  { value: "regulations", label: "Réglementations", icon: Scale, hint: "AI Act, normes, éthique." },
  { value: "keywords", label: "Mots-clés", icon: Hash, hint: "Surveillez des sujets précis." },
];

function WatchlistsPage() {
  const { isAuthenticated, ready } = useAuth();
  const navigate = useNavigate();
  const { lists, create, remove, addItem, removeItem } = useWatchlists();
  const [name, setName] = useState("");
  const [type, setType] = useState<WatchlistType>("companies");
  const [itemInputs, setItemInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/auth/login" });
  }, [ready, isAuthenticated, navigate]);

  if (!ready || !isAuthenticated) return null;

  const grouped = TYPES.map((t) => ({ ...t, items: lists.filter((l) => l.type === t.value) }));

  return (
    <SiteLayout>
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Bookmark className="h-4 w-4" /> Vos suivis personnalisés
          </div>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Mes <span className="text-gradient-brand">watchlists</span>
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            VeillIA surveille en continu vos entreprises, technologies, startups, réglementations et mots-clés.
            Recevez des alertes intelligentes dès qu'un signal pertinent apparaît.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold">Créer une watchlist</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  create(name.trim(), type);
                  setName("");
                }
              }}
              placeholder="Ex. Modèles open source"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as WatchlistType)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button
              onClick={() => { if (name.trim()) { create(name.trim(), type); setName(""); } }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand"
            >
              <Plus className="h-4 w-4" /> Créer
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {grouped.map((g) => (
            <div key={g.value}>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground shadow-brand">
                  <g.icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{g.label}</h3>
                  <p className="text-xs text-muted-foreground">{g.hint}</p>
                </div>
              </div>

              {g.items.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
                  Aucune watchlist dans cette catégorie.
                </div>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {g.items.map((w) => (
                    <div key={w.id} className="rounded-2xl border border-border bg-card p-4 shadow-card transition hover:shadow-brand">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{w.name}</div>
                          <div className="text-xs text-muted-foreground">{w.items.length} éléments suivis</div>
                        </div>
                        <button onClick={() => remove(w.id)} aria-label="Supprimer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {w.items.map((it) => (
                          <span key={it} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                            {it}
                            <button onClick={() => removeItem(w.id, it)} aria-label="Retirer">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <input
                          value={itemInputs[w.id] ?? ""}
                          onChange={(e) => setItemInputs((s) => ({ ...s, [w.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const v = (itemInputs[w.id] ?? "").trim();
                              if (v) {
                                addItem(w.id, v);
                                setItemInputs((s) => ({ ...s, [w.id]: "" }));
                              }
                            }
                          }}
                          placeholder="Ajouter un élément"
                          className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none focus:border-ring"
                        />
                        <button
                          onClick={() => {
                            const v = (itemInputs[w.id] ?? "").trim();
                            if (!v) return;
                            addItem(w.id, v);
                            setItemInputs((s) => ({ ...s, [w.id]: "" }));
                          }}
                          className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                        >
                          Ajouter
                        </button>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3 text-accent" /> VeillIA surveille en temps réel
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
          <p className="text-sm text-muted-foreground">Besoin d'inspiration ?</p>
          <Link to="/decouvrir" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Explorer les fonctionnalités de veille →
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
