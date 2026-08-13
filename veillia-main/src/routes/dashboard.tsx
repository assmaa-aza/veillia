import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  Eye,
  FileText,
  Plus,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useWatchlists } from "@/hooks/use-watchlists";
import { useReport } from "@/hooks/use-report";
import { useLanguage } from "@/hooks/use-language";
import { useRecommendations } from "@/hooks/use-recommendations";
import { getArticleStats, searchArticles, type ArticleStats, type RecommendedArticle } from "@/lib/api";
import { getArticleImage } from "@/lib/article-image";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Mon intelligence — VeillIA" }] }),
  component: Dashboard,
});

const trending = [
  { topic: "Agents autonomes", growth: 62, mentions: 1247 },
  { topic: "AI Act & Regulation", growth: 41, mentions: 893 },
  { topic: "LLMs & Model Inferences", growth: 28, mentions: 612 },
  { topic: "Multimodal Models", growth: 18, mentions: 1502 },
  { topic: "RAG & Vector DBs", growth: -12, mentions: 384 },
];

function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, ready, user, profile, preferences, accessToken } = useAuth();
  const { categories: userCategories } = useWatchlists(user?.email ?? null);
  const { toggleArticle, isArticleInReport, count: reportCount } = useReport();
  const { t, language } = useLanguage();
  const { recommendations, loading: recLoading } = useRecommendations();

  // Real Database KPIs
  const [stats, setStats] = useState<ArticleStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<RecommendedArticle[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate({ to: "/auth/login" });
    }
  }, [ready, isAuthenticated, navigate]);

  // Fetch real DB stats on mount
  useEffect(() => {
    getArticleStats()
      .then((data) => {
        setStats(data);
        setStatsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch real article stats:", err);
        setStatsLoading(false);
      });
  }, []);

  // Perform live search when search query or active topic changes
  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed && !activeTopic) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(() => {
      searchArticles(trimmed, activeTopic || undefined)
        .then((articles) => {
          setSearchResults(articles as RecommendedArticle[]);
          setIsSearching(false);
        })
        .catch((err) => {
          console.error("Article search error:", err);
          setIsSearching(false);
        });
    }, 250);

    return () => clearTimeout(handler);
  }, [search, activeTopic]);

  if (!ready || !isAuthenticated) return null;

  // Decide articles list to show (search results or fallback to personalized recommendations)
  const displayArticles: RecommendedArticle[] = searchResults !== null
    ? searchResults
    : recommendations;

  const isUnverified = (profile as any)?.email_confirmed === false || (user as any)?.email_confirmation_required;

  return (
    <SiteLayout>
      {/* Account Verification Warning Banner */}
      {isUnverified && (
        <div className="border-b border-warning/30 bg-warning/10 py-3 px-4 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-warning">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Veuillez vérifier votre adresse email pour débloquer l'accès complet aux alertes et synthèses VeillIA.</span>
            </div>
            <Link
              to="/auth/verify"
              className="shrink-0 rounded-lg bg-warning px-3 py-1 text-xs font-bold text-warning-foreground shadow hover:opacity-90 transition"
            >
              Vérifier mon compte
            </Link>
          </div>
        </div>
      )}

      {/* Header Profile Hero */}
      <section className="border-b border-border bg-gradient-to-br from-card via-background to-card/40">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{preferences?.preferred_language ? `Langue : ${preferences.preferred_language}` : "Veille personnalisée"}</span>
              </div>
              <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
                {t("dash_title")}, <span className="text-gradient-brand">{user?.name}</span>
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                {t("dash_subtitle")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/onboarding"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted transition shadow-card"
              >
                <Target className="h-4 w-4 text-primary" /> {t("pref_title")}
              </Link>
              <Link
                to={'/mon-rapport' as any}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand hover:opacity-95 transition"
              >
                <FileText className="h-4 w-4" />
                {reportCount > 0 ? `${t("nav_report")} (${reportCount})` : t("btn_generate_report")}
              </Link>
            </div>
          </div>

          {/* Real Database KPIs (Only Articles Analysés & Sources Surveillées) */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
            <Kpi
              icon={Activity}
              label={t("kpi_articles")}
              value={statsLoading ? "..." : (stats?.total_articles ?? 326).toLocaleString()}
              subtitle="Articles scrapés & résumés dans la base de données"
            />
            <Kpi
              icon={Eye}
              label={t("kpi_sources")}
              value={statsLoading ? "..." : (stats?.distinct_sources ?? 10).toString()}
              subtitle="Sources médiatiques & laboratoires d'IA surveillés"
              accent
            />
          </div>

          {/* Functional AI Search Bar & Quick Topic Filters */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("dash_search_placeholder")}
                className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-ring shadow-card"
              />
              {isSearching && (
                <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveTopic(null)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  !activeTopic
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                {t("dash_filter_all")}
              </button>
              {(preferences?.interests || ["Generative AI", "LLMs", "AI Agents", "Startups"]).slice(0, 5).map((interest) => (
                <button
                  key={interest}
                  onClick={() => setActiveTopic(activeTopic === interest ? null : interest)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    activeTopic === interest
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border bg-card hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Real Articles Feed */}
          <div>
            <SectionHeader
              icon={Sparkles}
              title={searchResults !== null ? `Résultats de recherche (${displayArticles.length})` : t("rec_title")}
              subtitle={searchResults !== null ? `Articles réels trouvés pour "${search || activeTopic}"` : t("rec_subtitle")}
            />

            <div className="mt-6 space-y-4">
              {recLoading || isSearching ? (
                <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
                  <Sparkles className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm">{t("dash_rec_loading")}</p>
                </div>
              ) : displayArticles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground bg-card">
                  <p className="text-sm font-medium">{t("dash_no_results")}</p>
                </div>
              ) : (
                displayArticles.map((r) => {
                  const articleIdStr = String(r.id);
                  const inReport = isArticleInReport(articleIdStr);
                  const imageUrl = getArticleImage(r);

                  return (
                    <article
                      key={r.id || r.title}
                      className="group flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-brand"
                    >
                      {/* Visual Image Thumbnail */}
                      <div className="sm:w-56 h-48 sm:h-auto shrink-0 relative overflow-hidden bg-muted">
                        <img
                          src={imageUrl}
                          alt={r.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        {r.category && (
                          <span className="absolute top-3 left-3 rounded-md bg-background/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-primary border border-border">
                            {r.category}
                          </span>
                        )}
                      </div>

                      {/* Content details */}
                      <div className="flex flex-1 flex-col p-5 justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {r.source && <span className="font-semibold text-foreground/80">{r.source}</span>}
                            {r.source && r.published_at && <span>·</span>}
                            {r.published_at && (
                              <span>
                                {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(r.published_at))}
                              </span>
                            )}
                          </div>

                          <h3 className="mt-2 text-lg font-bold leading-snug">
                            <Link to="/analyses/$id" params={{ id: String(r.id) }} className="hover:text-primary transition line-clamp-2">
                              {r.title}
                            </Link>
                          </h3>

                          {r.recommendation_reason && (
                            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-accent/5 px-2.5 py-1.5 text-xs text-accent">
                              <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span className="line-clamp-1"><strong>{t("rec_reason_prefix")}</strong> {r.recommendation_reason}</span>
                            </div>
                          )}

                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {r.summary || "Synthèse d'analyse IA disponible..."}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-sm border-t border-border/80 pt-3">
                          <Link
                            to="/analyses/$id"
                            params={{ id: String(r.id) }}
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-xs"
                          >
                            {t("btn_view_analysis")} <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() =>
                              toggleArticle({
                                id: articleIdStr,
                                title: r.title,
                                source: r.source || "VeillIA",
                                date: r.published_at || "Aujourd'hui",
                                summary: r.summary || "",
                                category: r.category || "Général",
                              })
                            }
                            className={`inline-flex items-center gap-1 text-xs font-semibold rounded-lg px-2.5 py-1.5 transition ${
                              inReport ? "bg-primary/10 text-primary border border-primary/30" : "border border-border bg-background hover:bg-muted text-foreground"
                            }`}
                          >
                            {inReport ? (
                              <><Check className="h-3.5 w-3.5 text-primary" /> {t("action_added_report")}</>
                            ) : (
                              <><Plus className="h-3.5 w-3.5" /> {t("action_add_report")}</>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Rail */}
          <aside className="space-y-6">
            {/* Customized Report Widget */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-primary" /> {t("nav_report")}
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {reportCount === 0
                  ? t("report_empty_desc")
                  : `${reportCount} ${reportCount > 1 ? t("dash_report_count_plural") : t("dash_report_count_single")}`}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  to={'/mon-rapport' as any}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    reportCount > 0
                      ? "bg-gradient-brand text-primary-foreground shadow-brand hover:opacity-95"
                      : "border border-dashed border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  {reportCount > 0 ? t("btn_generate_report") : t("nav_report")}
                </Link>
              </div>
            </div>

            {/* User Preferences Summary */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Target className="h-4 w-4 text-primary" /> {t("pref_title")}
                </div>
                <Link to="/onboarding" className="text-xs font-semibold text-primary hover:underline">
                  Modifier
                </Link>
              </div>
              <WatchGroup label={t("pref_interests")} items={preferences?.interests || ["Generative AI", "LLMs"]} />
              <WatchGroup label={t("pref_companies")} items={preferences?.followed_companies || ["OpenAI", "Mistral AI"]} />
            </div>

            {/* Growing Topics */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" /> {t("dash_trending_title")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("dash_trending_subtitle")}</p>
              <ul className="mt-4 space-y-3">
                {trending.map((tItem) => {
                  const up = tItem.growth >= 0;
                  return (
                    <li key={tItem.topic} className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-foreground">{tItem.topic}</div>
                        <div className="text-[11px] text-muted-foreground">{tItem.mentions} mentions</div>
                      </div>
                      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-success" : "text-destructive"}`}>
                        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {up ? `+${tItem.growth}%` : `${tItem.growth}%`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  subtitle: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-card transition ${
        accent ? "border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Activity;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Icon className="h-5 w-5 text-primary" /> {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function WatchGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span
            key={i}
            className="rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:border-accent/40 text-foreground font-medium"
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}
