import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Sparkles, Bell, BarChart3, FileText, LayoutDashboard, Zap, ArrowRight, Lock, Bookmark, TrendingUp, Loader2, ArrowUpRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ArticleActions } from "@/components/site/ArticleActions";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { getLatestArticles, searchArticles, type Article } from "@/lib/api";
import { getArticleImage } from "@/lib/article-image";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VeillIA — Veille intelligente sur l'IA" },
      { name: "description", content: "Plateforme de veille IA personnalisée : actualités, tendances, startups, réglementation et alertes en temps réel." },
      { property: "og:title", content: "VeillIA — Veille intelligente sur l'IA" },
      { property: "og:description", content: "Suivez les dernières innovations IA avec une veille personnalisée propulsée par l'intelligence artificielle." },
    ],
  }),
  component: Home,
});

const categories = [
  { icon: "📚", labelKey: "cat_name_recherche", slug: "recherche" },
  { icon: "🚀", labelKey: "cat_name_produits", slug: "produits" },
  { icon: "🏢", labelKey: "cat_name_startups", slug: "startups" },
  { icon: "⚖️", labelKey: "cat_name_regulation", slug: "regulation" },
  { icon: "🌍", labelKey: "cat_name_ecosysteme", slug: "ecosysteme" },
  { icon: "📈", labelKey: "cat_name_tendances", slug: "tendances" },
  { icon: "📅", labelKey: "cat_name_evenements", slug: "evenements" },
];

const features = [
  { icon: Sparkles, title: "Veille automatisée", desc: "Surveillez sources, papiers et annonces en continu." },
  { icon: FileText, title: "Résumés IA", desc: "Des synthèses claires en 2 lignes ou un brief complet." },
  { icon: BarChart3, title: "Analyse de tendances", desc: "Visualisez ce qui émerge avant tout le monde." },
  { icon: Bell, title: "Alertes personnalisées", desc: "Recevez les bonnes infos sur les bons sujets." },
  { icon: LayoutDashboard, title: "Dashboard interactif", desc: "Pilotez votre veille depuis un seul endroit." },
  { icon: Zap, title: "Temps réel", desc: "Soyez notifié dès qu'une innovation tombe." },
];

const suggestions = ["OpenAI", "Agents IA", "Startups", "AI Regulation", "Mistral AI"];

function Home() {
  const navigate = useNavigate();
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [query, setQuery] = useState("");
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();

  // Real Database Articles state
  const [realArticles, setRealArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);

  // Functional Search state
  const [searchResults, setSearchResults] = useState<Article[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch latest admin-approved/summarized articles from backend
  useEffect(() => {
    getLatestArticles(20)
      .then((data) => {
        setRealArticles(data);
        setLoadingArticles(false);
      })
      .catch((err) => {
        console.error("Failed to load real home articles:", err);
        setLoadingArticles(false);
      });
  }, []);

  // Auto-rotate "À la une" featured articles carousel
  const featuredArticles = realArticles.slice(0, 5);
  useEffect(() => {
    if (featuredArticles.length <= 1) return;
    const tTimer = setInterval(() => {
      setCarouselIdx((i) => (i + 1) % featuredArticles.length);
    }, 4500);
    return () => clearInterval(tTimer);
  }, [featuredArticles.length]);

  // Live search effect on query change
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(() => {
      searchArticles(trimmed)
        .then((data) => {
          setSearchResults(data);
          setIsSearching(false);
        })
        .catch((err) => {
          console.error("Search failed:", err);
          setIsSearching(false);
        });
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const targetSection = document.getElementById("actualites");
    targetSection?.scrollIntoView({ behavior: "smooth" });
  };

  const currentFeatured = featuredArticles[carouselIdx % (featuredArticles.length || 1)];

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative flex min-h-[78vh] items-center justify-center overflow-hidden">
        {/* Background Image of featured article */}
        <div className="absolute inset-0 -z-20">
          {featuredArticles.map((art, i) => (
            <img
              key={art.id}
              src={getArticleImage(art)}
              alt={art.title}
              width={1920}
              height={1080}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${i === (carouselIdx % featuredArticles.length) ? "opacity-100" : "opacity-0"}`}
            />
          ))}
        </div>

        <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,_rgba(45,12,90,0.92),_rgba(76,29,149,0.78)_45%,_rgba(15,10,40,0.92))]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.25),_transparent_65%)]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              {t("home_hero_badge")}
            </span>

            <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {isAuthenticated ? (
                <>Bon retour, <span className="text-gradient-brand">{user?.name}</span>.</>
              ) : (
                <>{t("home_hero_title")}</>
              )}
            </h1>

            <p className="mt-3 max-w-2xl text-base text-white/80 sm:text-lg">
              {t("home_hero_subtitle")}
            </p>

            {/* AI Functional Search Bar — Input text in crisp BLACK while typing */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-8 w-full max-w-2xl rounded-2xl border border-white/20 bg-white/95 p-2 shadow-brand backdrop-blur-xl ring-1 ring-primary/20"
            >
              <div className="flex items-center gap-2">
                <Search className="ml-3 h-5 w-5 text-primary shrink-0" />
                <input
                  aria-label="Recherche"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isAuthenticated ? t("home_search_placeholder_auth") : t("home_search_placeholder")}
                  className="flex-1 bg-transparent px-2 py-3 text-base text-black font-semibold outline-none placeholder:text-gray-500"
                />
                {isSearching && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0 mr-2" />
                )}
                {isAuthenticated ? (
                  <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-5 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95 shrink-0">
                    <Sparkles className="h-4 w-4" /> {t("home_search_ai_btn")}
                  </Link>
                ) : (
                  <button type="submit" className="rounded-xl bg-gradient-brand px-5 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95 shrink-0">
                    {t("home_search_btn")}
                  </button>
                )}
              </div>
            </form>

            {/* Suggestions */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-white/60">{isAuthenticated ? t("home_suggestions_auth") : t("home_suggestions")}</span>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur transition hover:border-white/40 hover:bg-white/20"
                >
                  {s}
                </button>
              ))}
            </div>

            {!isAuthenticated && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/60">
                <Lock className="h-3 w-3" />
                {t("home_search_locked")}
              </p>
            )}

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:scale-[1.02]">
                    {t("home_cta_dashboard")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/watchlists" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                    <Bookmark className="h-4 w-4" /> {t("home_cta_watchlists")}
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth/signup" className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:scale-[1.02]">
                    {t("home_hero_cta_primary")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a href="#actualites" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                    {t("home_cta_explore")}
                  </a>
                </>
              )}
            </div>

            {/* Featured Hero Showcase Card connected to REAL Database Article "À LA UNE" */}
            {currentFeatured && (
              <div className="mt-8 w-full max-w-2xl">
                <Link
                  to="/analyses/$id"
                  params={{ id: String(currentFeatured.id) }}
                  className="group block overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-4 shadow-card backdrop-blur-xl transition hover:border-white/40 hover:bg-white/15"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={getArticleImage(currentFeatured)}
                      alt={currentFeatured.title}
                      width={120}
                      height={120}
                      loading="lazy"
                      className="h-20 w-20 flex-shrink-0 rounded-xl object-cover sm:h-24 sm:w-24 shadow-sm"
                    />
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-gradient-brand px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                          {currentFeatured.category || "VeillIA"}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-white/60 font-bold">{t("home_featured_label")}</span>
                      </div>
                      <h3 className="mt-1.5 line-clamp-1 text-base font-semibold text-white sm:text-lg group-hover:text-accent transition">
                        {currentFeatured.title}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-xs text-white/70">
                        {currentFeatured.summary || "Consulter la synthèse stratégique complète..."}
                      </p>
                    </div>
                    <span className="hidden flex-shrink-0 items-center gap-1 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-white/20 sm:inline-flex">
                      {t("home_view_analysis")} <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  {featuredArticles.length > 1 && (
                    <div className="mt-3 flex justify-center gap-1">
                      {featuredArticles.map((_, i) => (
                        <span
                          key={i}
                          className={`h-1 rounded-full transition-all ${i === (carouselIdx % featuredArticles.length) ? "w-6 bg-white" : "w-1.5 bg-white/30"}`}
                        />
                      ))}
                    </div>
                  )}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* REAL ACTUALITE DU JOUR / SEARCH RESULTS FROM DATABASE */}
      <section id="actualites" className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold">
                {searchResults !== null
                  ? `Résultats de recherche pour "${query}" (${searchResults.length})`
                  : isAuthenticated ? t("home_news_title_auth") : t("home_news_title")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {searchResults !== null
                  ? "Articles réels approuvés correspondant à votre requête dans la base VeillIA."
                  : isAuthenticated ? t("home_news_subtitle_auth") : t("home_news_subtitle")}
              </p>
            </div>
            <Link to={isAuthenticated ? "/dashboard" : "/decouvrir"} className="hidden text-sm font-semibold text-primary hover:underline sm:inline">
              {isAuthenticated ? t("home_see_dashboard") : t("home_see_all")}
            </Link>
          </div>

          <div className="mt-8">
            {loadingArticles || isSearching ? (
              <div className="py-16 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm">Recherche des articles réels dans la base de données...</p>
              </div>
            ) : (searchResults !== null ? searchResults : realArticles).length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                Aucun article correspondant dans la base de données. Essayez une autre recherche.
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(searchResults !== null ? searchResults : realArticles).map((art) => {
                  const articleImg = (art as any).image_url || getArticleImage(art);
                  return (
                    <article key={art.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-brand">
                      <div className="h-44 w-full overflow-hidden bg-muted relative">
                        <img
                          src={articleImg}
                          alt={art.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        {art.category && (
                          <span className="absolute top-3 left-3 rounded-md bg-background/90 backdrop-blur px-2.5 py-0.5 text-[10px] font-bold text-primary border border-border">
                            {art.category}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4 justify-between">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{art.source || "VeillIA Source"}</span>
                            <span>
                              {art.published_at
                                ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(art.published_at))
                                : "Aujourd'hui"}
                            </span>
                          </div>
                          <h3 className="mt-2 line-clamp-2 font-bold text-base leading-snug">
                            <Link to="/analyses/$id" params={{ id: String(art.id) }} className="hover:text-primary transition">
                              {art.title}
                            </Link>
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                            {art.summary || "Synthèse d'analyse IA disponible..."}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between">
                          <Link
                            to="/analyses/$id"
                            params={{ id: String(art.id) }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            {t("home_view_analysis")} <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                          <ArticleActions articleId={String(art.id)} title={art.title} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="veille" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Une veille pensée pour vous</h2>
          <p className="mt-3 text-muted-foreground">Six briques qui transforment le bruit en signal.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold">{t("home_cat_title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("home_cat_subtitle")}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.slug}
                to="/categories/$slug"
                params={{ slug: c.slug }}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:border-accent/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">{c.icon}</div>
                <div>
                  <div className="font-semibold">{t(c.labelKey)}</div>
                  <div className="text-xs text-muted-foreground group-hover:text-primary">{t("home_cat_see")}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        {isAuthenticated ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-10 text-primary-foreground shadow-brand sm:p-14">
            <div aria-hidden className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-glow)" }} />
            <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <h2 className="text-3xl font-bold sm:text-4xl">VeillIA surveille pour vous, {user?.name}.</h2>
                <p className="mt-3 max-w-xl text-primary-foreground/90">
                  Affinez vos watchlists pour des alertes encore plus pertinentes — entreprises, technologies, réglementations.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/watchlists" className="inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 text-sm font-semibold text-primary shadow-card hover:bg-card">
                  <Bookmark className="h-4 w-4" /> Mes watchlists
                </Link>
                <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20">
                  Mon dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-10 text-center text-primary-foreground shadow-brand sm:p-14">
            <div aria-hidden className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-glow)" }} />
            <h2 className="relative text-3xl font-bold sm:text-4xl">Débloquez votre veille personnalisée</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/90">
              Watchlists, alertes intelligentes, rapports IA et recherche avancée — gratuit en moins d'une minute.
            </p>
            <Link to="/auth/signup" className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 text-sm font-semibold text-primary shadow-card hover:bg-card">
              Créer mon compte gratuit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
