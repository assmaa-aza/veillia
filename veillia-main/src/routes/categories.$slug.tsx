import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ArticleActions } from "@/components/site/ArticleActions";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { getArticlesByCategory, type Article } from "@/lib/api";
import { Lock, Sparkles } from "lucide-react";

const CATS: Record<string, { labelKey: string; defaultLabel: string; icon: string; descKey: string; desc: string }> = {
  recherche: { labelKey: "cat_name_recherche", defaultLabel: "Recherche", icon: "📚", descKey: "cat_desc_recherche", desc: "Papiers, prépublications et résultats de laboratoires." },
  produits: { labelKey: "cat_name_produits", defaultLabel: "Produits IA", icon: "🚀", descKey: "cat_desc_produits", desc: "Nouveaux modèles, APIs et applications IA." },
  startups: { labelKey: "cat_name_startups", defaultLabel: "Startups", icon: "🏢", descKey: "cat_desc_startups", desc: "Levées de fonds, lancements et acquisitions." },
  regulation: { labelKey: "cat_name_regulation", defaultLabel: "Réglementation", icon: "⚖️", descKey: "cat_desc_regulation", desc: "Lois, normes et cadres juridiques de l'IA." },
  ecosysteme: { labelKey: "cat_name_ecosysteme", defaultLabel: "Écosystème", icon: "🌍", descKey: "cat_desc_ecosysteme", desc: "Initiatives publiques, écoles, communautés." },
  tendances: { labelKey: "cat_name_tendances", defaultLabel: "Tendances", icon: "📈", descKey: "cat_desc_tendances", desc: "Signaux faibles et thématiques émergentes." },
  evenements: { labelKey: "cat_name_evenements", defaultLabel: "Événements", icon: "📅", descKey: "cat_desc_evenements", desc: "Conférences, hackathons et webinaires." },
};

export const Route = createFileRoute("/categories/$slug")({
  loader: async ({ params }) => {
    const cat = CATS[params.slug];
    if (!cat) throw notFound();
    const articles = await getArticlesByCategory(params.slug);
    return { cat, slug: params.slug, articles };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.cat.defaultLabel} — VeillIA` },
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
  const { cat, articles } = Route.useLoaderData();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  return (
    <SiteLayout>
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-3xl">{cat.icon}</div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold sm:text-4xl">{t(cat.labelKey) || cat.defaultLabel}</h1>
            <p className="mt-1 text-muted-foreground">{t(cat.descKey) || cat.desc}</p>
          </div>
          {isAuthenticated && (
            <Link to="/watchlists" className="hidden items-center gap-1.5 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand sm:inline-flex">
              <Sparkles className="h-4 w-4" /> {t("nav_watchlists")}
            </Link>
          )}
        </div>
      </section>

      {!isAuthenticated && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-foreground/80">
              <Lock className="h-4 w-4 text-primary" />
              <span>{t("home_cta_subtitle")}</span>
            </div>
            <Link to="/auth/signup" className="rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-brand">
              {t("nav_signup")}
            </Link>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {articles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("cat_empty_desc")}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <article key={a.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:shadow-brand">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{a.source || "VeillIA"}</span>
                  <span>
                    {a.published_at
                      ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(a.published_at))
                      : "Récent"}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold">
                  <Link to="/analyses/$id" params={{ id: encodeURIComponent(a.id.toString()) }} className="hover:text-primary transition">
                    {a.title}
                  </Link>
                </h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">
                  {a.summary || "Résumé d'analyse IA."}
                </p>
                <Link
                  to="/analyses/$id"
                  params={{ id: encodeURIComponent(a.id.toString()) }}
                  className="mt-4 self-start text-sm font-semibold text-primary hover:underline"
                >
                  {t("btn_view_analysis")} →
                </Link>
                <div className="mt-4 border-t border-border pt-3">
                  <ArticleActions articleId={a.id.toString()} title={a.title} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
