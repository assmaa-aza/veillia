import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Sparkles, Bell, BarChart3, FileText, LayoutDashboard, Zap, ArrowRight, Lock, Bookmark, TrendingUp } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ArticleActions } from "@/components/site/ArticleActions";
import { useAuth } from "@/hooks/use-auth";
import heroAi from "@/assets/hero-ai.jpg";
import innovRobot from "@/assets/innov-robot.jpg";
import innovChip from "@/assets/innov-chip.jpg";
import innovDc from "@/assets/innov-datacenter.jpg";
import innovGen from "@/assets/innov-genai.jpg";

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

const innovations = [
  { img: innovGen, tag: "IA Générative", title: "Nouveau modèle multimodal annoncé", summary: "Un saut de performance sur le raisonnement et la génération vidéo." },
  { img: innovRobot, tag: "Robotique", title: "Robots humanoïdes en production", summary: "Une nouvelle génération entre en phase industrielle." },
  { img: innovChip, tag: "Hardware", title: "Puce IA nouvelle génération", summary: "Une architecture pensée pour l'inférence à grande échelle." },
  { img: innovDc, tag: "Infrastructure", title: "Datacenters dédiés à l'IA", summary: "Les hyperscalers investissent massivement dans l'inférence." },
];

const categories = [
  { icon: "📚", label: "Recherche", slug: "recherche" },
  { icon: "🚀", label: "Produits IA", slug: "produits" },
  { icon: "🏢", label: "Startups", slug: "startups" },
  { icon: "⚖️", label: "Réglementation", slug: "regulation" },
  { icon: "🌍", label: "Écosystème", slug: "ecosysteme" },
  { icon: "📈", label: "Tendances", slug: "tendances" },
  { icon: "📅", label: "Événements", slug: "evenements" },
];

const features = [
  { icon: Sparkles, title: "Veille automatisée", desc: "Surveillez sources, papiers et annonces en continu." },
  { icon: FileText, title: "Résumés IA", desc: "Des synthèses claires en 2 lignes ou un brief complet." },
  { icon: BarChart3, title: "Analyse de tendances", desc: "Visualisez ce qui émerge avant tout le monde." },
  { icon: Bell, title: "Alertes personnalisées", desc: "Recevez les bonnes infos sur les bons sujets." },
  { icon: LayoutDashboard, title: "Dashboard interactif", desc: "Pilotez votre veille depuis un seul endroit." },
  { icon: Zap, title: "Temps réel", desc: "Soyez notifié dès qu'une innovation tombe." },
];

const suggestions = ["OpenAI", "Agents IA", "Startups", "IA Maroc"];

function Home() {
  const [idx, setIdx] = useState(0);
  const [query, setQuery] = useState("");
  const { isAuthenticated, user } = useAuth();
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % innovations.length), 4500);
    return () => clearInterval(t);
  }, []);
  const current = innovations[idx];

  return (
    <SiteLayout>
      {/* HERO — hauteur réduite, image dynamique avec overlay violet sombre */}
      <section className="relative flex min-h-[78vh] items-center justify-center overflow-hidden">
        {/* Image de fond — change selon l'actualité IA */}
        <div className="absolute inset-0 -z-20">
          {innovations.map((it, i) => (
            <img
              key={it.title}
              src={it.img}
              alt={it.title}
              width={1920}
              height={1080}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${i === idx ? "opacity-100" : "opacity-0"}`}
            />
          ))}
        </div>

        {/* Overlay violet profond pour lisibilité maximale */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,_rgba(45,12,90,0.92),_rgba(76,29,149,0.78)_45%,_rgba(15,10,40,0.92))]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.25),_transparent_65%)]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              {isAuthenticated ? `Veille active pour ${user?.name}` : "Veille IA en direct"}
            </span>

            <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {isAuthenticated ? (
                <>Bon retour, <span className="text-gradient-brand">{user?.name}</span>.</>
              ) : (
                <><span className="text-gradient-brand">VeillIA</span> — votre veille IA, intelligente.</>
              )}
            </h1>

            <p className="mt-3 max-w-2xl text-base text-white/80 sm:text-lg">
              {isAuthenticated
                ? "Voici votre flux d'intelligence IA — actualités triées, signaux faibles et alertes personnalisées."
                : "Découvrez les innovations IA en temps réel. Inscrivez-vous pour personnaliser votre veille."}
            </p>

            {/* Search bar */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-8 w-full max-w-2xl rounded-2xl border border-white/20 bg-white/95 p-2 shadow-brand backdrop-blur-xl ring-1 ring-primary/20"
            >
              <div className="flex items-center gap-2">
                <Search className="ml-3 h-5 w-5 text-primary" />
                <input
                  aria-label="Recherche"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isAuthenticated ? "Demander à l'IA : tendances, entreprises, sujets…" : "Rechercher une actualité IA…"}
                  className="flex-1 bg-transparent px-2 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
                />
                {isAuthenticated ? (
                  <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-5 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95">
                    <Sparkles className="h-4 w-4" /> Recherche IA
                  </Link>
                ) : (
                  <button className="rounded-xl bg-gradient-brand px-5 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95">
                    Rechercher
                  </button>
                )}
              </div>
            </form>

            {/* Suggestions */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-white/60">{isAuthenticated ? "Vos sujets :" : "Suggestions :"}</span>
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
                Recherche IA avancée, alertes et watchlists réservées aux membres.
              </p>
            )}

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:scale-[1.02]">
                    Mon flux IA <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/watchlists" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                    <Bookmark className="h-4 w-4" /> Mes watchlists
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth/signup" className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:scale-[1.02]">
                    Commencer gratuitement <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a href="#actualites" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                    Explorer les actualités
                  </a>
                </>
              )}
            </div>

            {/* Featured news card compacte */}
            <div className="mt-8 w-full max-w-2xl">
              <div className="group relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-4 shadow-card backdrop-blur-xl transition hover:border-white/30">
                <div className="flex items-center gap-4">
                  <img
                    src={current.img}
                    alt=""
                    width={120}
                    height={120}
                    loading="lazy"
                    className="h-20 w-20 flex-shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gradient-brand px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                        {current.tag}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-white/60">À la une</span>
                    </div>
                    <h3 className="mt-1.5 line-clamp-1 text-base font-semibold text-white sm:text-lg">
                      <Link to="/analyses/$id" params={{ id: encodeURIComponent(current.title) }} className="hover:text-primary transition">
                        {current.title}
                      </Link>
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-xs text-white/70">{current.summary}</p>
                  </div>
                  <Link
                    to="/analyses/$id"
                    params={{ id: encodeURIComponent(current.title) }}
                    className="hidden flex-shrink-0 items-center gap-1 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 sm:inline-flex"
                  >
                    Voir l'analyse <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mt-3 flex justify-center gap-1">
                  {innovations.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/30"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ACTUALITE DU JOUR */}
      <section id="actualites" className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold">
                {isAuthenticated ? "Votre flux IA du jour" : "Actualités IA du jour"}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {isAuthenticated
                  ? "Triées selon vos centres d'intérêt et vos watchlists."
                  : "Les dernières innovations détectées par notre moteur de veille."}
              </p>
            </div>
            <Link to={isAuthenticated ? "/dashboard" : "/decouvrir"} className="hidden text-sm font-semibold text-primary hover:underline sm:inline">
              {isAuthenticated ? "Voir mon dashboard →" : "Tout voir →"}
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {innovations.map((it) => (
              <article key={it.title} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-brand">
                <img src={it.img} alt="" width={400} height={300} loading="lazy" className="h-44 w-full object-cover transition group-hover:scale-105" />
                <div className="flex flex-1 flex-col p-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">{it.tag}</span>
                  <h3 className="mt-1 line-clamp-2 font-semibold">
                    <Link to="/analyses/$id" params={{ id: encodeURIComponent(it.title) }} className="hover:text-primary transition">
                      {it.title}
                    </Link>
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{it.summary}</p>
                  {isAuthenticated && (
                    <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <TrendingUp className="h-3 w-3" /> Pertinent pour vous
                    </div>
                  )}
                  <div className="mt-3 border-t border-border pt-3">
                    <ArticleActions articleId={it.title} title={it.title} />
                  </div>
                </div>
              </article>
            ))}
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
          <h2 className="text-3xl font-bold">Explorez par catégorie</h2>
          <p className="mt-2 text-muted-foreground">Choisissez vos sujets, on vous apporte le reste.</p>
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
                  <div className="font-semibold">{c.label}</div>
                  <div className="text-xs text-muted-foreground group-hover:text-primary">Voir les actualités →</div>
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
