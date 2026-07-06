import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ArticleActions } from "@/components/site/ArticleActions";
import { useAuth } from "@/hooks/use-auth";
import { Lock, Sparkles } from "lucide-react";

const CATS: Record<string, { label: string; icon: string; desc: string }> = {
  recherche: { label: "Recherche", icon: "📚", desc: "Papiers, prépublications et résultats de laboratoires." },
  produits: { label: "Produits IA", icon: "🚀", desc: "Nouveaux modèles, APIs et applications IA." },
  startups: { label: "Startups", icon: "🏢", desc: "Levées de fonds, lancements et acquisitions." },
  regulation: { label: "Réglementation", icon: "⚖️", desc: "Lois, normes et cadres juridiques de l'IA." },
  ecosysteme: { label: "Écosystème", icon: "🌍", desc: "Initiatives publiques, écoles, communautés." },
  tendances: { label: "Tendances", icon: "📈", desc: "Signaux faibles et thématiques émergentes." },
  evenements: { label: "Événements", icon: "📅", desc: "Conférences, hackathons et webinaires." },
};

export const Route = createFileRoute("/categories/$slug")({
  loader: ({ params }) => {
    const cat = CATS[params.slug];
    if (!cat) throw notFound();
    return { cat, slug: params.slug };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.cat.label} — VeillIA` },
          { name: "description", content: loaderData.cat.desc },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Catégorie introuvable</h1>
        <p className="mt-2 text-muted-foreground">Cette catégorie n'existe pas.</p>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </SiteLayout>
  ),
  component: Category,
});

function Category() {
  const { cat } = Route.useLoaderData();
  const { isAuthenticated } = useAuth();

  const fakeArticles = Array.from({ length: 6 }).map((_, i) => ({
    title: `${cat.label} — Article ${i + 1}`,
    summary: "Résumé court de l'article généré par VeillIA. Restez informé des dernières actualités de cette catégorie.",
    date: "Il y a 2h",
    source: "VeillIA",
  }));

  return (
    <SiteLayout>
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-3xl">{cat.icon}</div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold sm:text-4xl">{cat.label}</h1>
            <p className="mt-1 text-muted-foreground">{cat.desc}</p>
          </div>
          {isAuthenticated && (
            <Link to="/watchlists" className="hidden items-center gap-1.5 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand sm:inline-flex">
              <Sparkles className="h-4 w-4" /> Suivre cette catégorie
            </Link>
          )}
        </div>
      </section>

      {!isAuthenticated && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-foreground/80">
              <Lock className="h-4 w-4 text-primary" />
              Vous parcourez en mode visiteur. Inscrivez-vous pour suivre cette catégorie et créer des alertes.
            </div>
            <Link to="/auth/signup" className="rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-brand">
              Créer un compte
            </Link>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {fakeArticles.map((a, i) => (
            <article key={i} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:shadow-brand">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{a.source}</span><span>{a.date}</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold">
                <Link to="/analyses/$id" params={{ id: encodeURIComponent(a.title) }} className="hover:text-primary transition">
                  {a.title}
                </Link>
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{a.summary}</p>
              <Link
                to="/analyses/$id"
                params={{ id: encodeURIComponent(a.title) }}
                className="mt-4 self-start text-sm font-semibold text-primary hover:underline"
              >
                Lire l'analyse →
              </Link>
              <div className="mt-4 border-t border-border pt-3">
                <ArticleActions articleId={`${cat.label}-${i}`} title={a.title} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
