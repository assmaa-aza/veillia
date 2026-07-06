import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Brain,
  Building2,
  Clock,
  Eye,
  Flame,
  Lightbulb,
  Plus,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Mon intelligence — VeillIA" }] }),
  component: Dashboard,
});

type Priority = "Critical" | "High" | "Medium" | "Low";

const priorityStyles: Record<Priority, string> = {
  Critical: "bg-destructive/10 text-destructive border-destructive/30",
  High: "bg-warning/10 text-warning border-warning/30",
  Medium: "bg-accent/10 text-accent border-accent/30",
  Low: "bg-muted text-muted-foreground border-border",
};

const dailyStats = {
  articles: 2847,
  sources: 412,
  signals: 38,
  noiseReduced: 94,
};

const keyInsights = [
  {
    icon: Brain,
    title: "Les agents IA autonomes dominent l'agenda",
    detail:
      "47 publications majeures cette semaine — une accélération de +62% vs. la semaine passée. Trois acteurs clés (OpenAI, Anthropic, Google) convergent sur des protocoles d'outils standardisés.",
    tag: "Tendance émergente",
  },
  {
    icon: Zap,
    title: "Pression réglementaire renforcée en Europe",
    detail:
      "L'AI Act entre dans sa phase d'application. 4 nouvelles directives sectorielles attendues d'ici Q3. Impact direct sur votre watchlist FinTech.",
    tag: "Régulation",
  },
  {
    icon: Lightbulb,
    title: "Opportunité signalée : IA frugale & Edge",
    detail:
      "Émergence d'un cluster de startups (12 levées récentes) sur l'inférence basse consommation. Aligné avec votre intérêt déclaré pour le hardware IA.",
    tag: "Opportunité",
  },
];

const recommendations = [
  {
    priority: "Critical" as Priority,
    category: "IA Générative",
    title: "OpenAI annonce GPT-5 Turbo avec contexte 2M tokens",
    summary:
      "Refonte de l'architecture, latence divisée par 3, tarifs API en baisse de 40%. Mise en production immédiate.",
    why: "Vous suivez OpenAI et l'évolution des modèles fondamentaux.",
    readTime: 4,
    source: "OpenAI Blog",
    time: "Il y a 1h",
    takeaways: [
      "Coût d'inférence -40% impacte les business plans LLM",
      "Contexte 2M tokens débloque l'analyse de corpus complets",
      "Concurrence directe avec Claude 4 et Gemini Ultra",
    ],
  },
  {
    priority: "High" as Priority,
    category: "Régulation",
    title: "L'UE finalise les obligations d'audit pour modèles >70B paramètres",
    summary:
      "Obligation de transparence sur les données d'entraînement et audits annuels par tiers indépendants à partir de 2027.",
    why: "Vous avez ajouté 'AI Act' à vos mots-clés surveillés.",
    readTime: 6,
    source: "Commission Européenne",
    time: "Il y a 3h",
    takeaways: [
      "Coût de conformité estimé 2-5M€ par modèle audité",
      "Avantage compétitif pour les acteurs européens",
      "Délai serré : préparation requise dès Q4 2026",
    ],
  },
  {
    priority: "Medium" as Priority,
    category: "Hardware IA",
    title: "Nvidia lance Blackwell Ultra pour datacenters edge",
    summary:
      "Nouvelle génération de GPU optimisée pour l'inférence distribuée, consommation -55% à performance équivalente.",
    why: "Aligné avec votre veille sur l'IA frugale et l'Edge computing.",
    readTime: 3,
    source: "Nvidia Newsroom",
    time: "Aujourd'hui",
    takeaways: [
      "Repositionnement vers l'inférence vs. entraînement",
      "Pression sur AMD MI400 et les ASIC custom",
    ],
  },
];

const trending = [
  { topic: "Agents autonomes", growth: 62, mentions: 1247 },
  { topic: "AI Act", growth: 41, mentions: 893 },
  { topic: "Edge AI", growth: 28, mentions: 612 },
  { topic: "Multimodal", growth: 18, mentions: 1502 },
  { topic: "RAG avancé", growth: -12, mentions: 384 },
];

const watchlist = {
  companies: ["OpenAI", "Anthropic", "Mistral AI", "Hugging Face"],
  technologies: ["LLM", "Agents IA", "Edge Inference", "RAG"],
  keywords: ["AI Act", "Souveraineté", "Open Source"],
};

const alerts = [
  {
    priority: "Critical" as Priority,
    title: "Mistral AI lève 600M€ — valorisation 6Mds",
    impact: "Impact fort sur l'écosystème IA souveraine européenne.",
    why: "Mistral est dans votre watchlist entreprises.",
    time: "Il y a 22 min",
  },
  {
    priority: "High" as Priority,
    title: "Fuite de prompts système chez un acteur majeur",
    impact: "Risque réputationnel et précédent juridique en cours.",
    why: "Mot-clé 'sécurité LLM' suivi.",
    time: "Il y a 2h",
  },
  {
    priority: "Medium" as Priority,
    title: "Anthropic publie un papier sur l'interprétabilité",
    impact: "Avancée significative pour la confiance et l'audit des modèles.",
    why: "Anthropic suivie + thématique 'AI Safety'.",
    time: "Il y a 5h",
  },
];
function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecommendations = recommendations.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.title.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.why.toLowerCase().includes(q)
    );
  });

  return (
    <SiteLayout>
      {/* Intelligence header */}
      <section className="border-b border-border bg-gradient-to-br from-card via-background to-card/40">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Briefing du 28 juin 2026 · généré par VeillIA
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
                Voici ce que <span className="text-gradient-brand">VeillIA a découvert</span> pour vous aujourd'hui
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Aujourd'hui, VeillIA a analysé <strong className="text-foreground">{dailyStats.articles.toLocaleString("fr-FR")}</strong> articles
                provenant de <strong className="text-foreground">{dailyStats.sources}</strong> sources, filtré
                <strong className="text-foreground"> {dailyStats.noiseReduced}%</strong> de bruit et isolé
                <strong className="text-foreground"> {dailyStats.signals} signaux</strong> stratégiques pour vous.
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-card"
            >
              <Search className="ml-2 h-5 w-5 text-muted-foreground" />
              <input
                placeholder="Interroger votre intelligence…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-muted-foreground hover:text-foreground mr-1"
                >
                  Effacer
                </button>
              )}
              <button className="rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand">
                Analyser
              </button>
            </form>
          </div>
          {/* KPI strip */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi icon={Activity} label="Articles analysés" value={dailyStats.articles.toLocaleString("fr-FR")} />
            <Kpi icon={Building2} label="Sources scannées" value={String(dailyStats.sources)} />
            <Kpi icon={Target} label="Signaux extraits" value={String(dailyStats.signals)} accent />
            <Kpi icon={Flame} label="Bruit filtré" value={`${dailyStats.noiseReduced}%`} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        {/* Main column */}
        <div className="space-y-8 lg:col-span-2">
          {/* Key insights */}
          <div>
            <SectionHeader
              icon={Brain}
              title="Insights clés générés par l'IA"
              subtitle="Synthèse stratégique — pas une liste d'articles."
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {keyInsights.map((k) => (
                <div
                  key={k.title}
                  className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-brand"
                >
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
                    <k.icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-accent">
                    {k.tag}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold leading-snug">{k.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{k.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <SectionHeader
              icon={Sparkles}
              title="Recommandé pour vous"
              subtitle="Trié par score de priorité — chaque recommandation explique pourquoi elle compte."
            />
            <div className="mt-4 space-y-4">
              {filteredRecommendations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground bg-card">
                  Aucun résultat ne correspond à votre recherche. Essayez d'autres mots-clés.
                </div>
              ) : (
                filteredRecommendations.map((r) => (
                  <article
                    key={r.title}
                    className="group rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-brand"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-md border px-2 py-0.5 font-semibold ${priorityStyles[r.priority]}`}>
                        ● {r.priority}
                      </span>
                      <span className="rounded-md bg-muted px-2 py-0.5 font-medium">{r.category}</span>
                      <span className="text-muted-foreground">{r.source}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{r.time}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {r.readTime} min de lecture
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-semibold leading-snug">
                      <Link to="/analyses/$id" params={{ id: encodeURIComponent(r.title) }} className="hover:text-primary transition">
                        {r.title}
                      </Link>
                    </h3>

                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-accent/5 px-3 py-2 text-xs text-accent">
                      <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span><strong>Pourquoi c'est pertinent :</strong> {r.why}</span>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">{r.summary}</p>

                    <div className="mt-4 rounded-xl border border-dashed border-border bg-background/50 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Key takeaways
                      </div>
                      <ul className="mt-2 space-y-1.5">
                        {r.takeaways.map((t) => (
                          <li key={t} className="flex gap-2 text-sm">
                            <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-brand" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <Link
                        to="/analyses/$id"
                        params={{ id: encodeURIComponent(r.title) }}
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        Voir l'analyse complète <ArrowUpRight className="h-4 w-4" />
                      </Link>
                      <button className="text-muted-foreground hover:text-foreground">Ajouter au dossier</button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          {/* Trending */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" /> Sujets en croissance
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Évolution vs. 7 derniers jours</p>
            <ul className="mt-4 space-y-3">
              {trending.map((t) => {
                const up = t.growth >= 0;
                return (
                  <li key={t.topic} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t.topic}</div>
                      <div className="text-xs text-muted-foreground">{t.mentions} mentions</div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                        up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {up ? "+" : ""}
                      {t.growth}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Smart alerts */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4 text-primary" /> Alertes intelligentes
            </div>
            <ul className="mt-4 space-y-3">
              {alerts.map((a) => (
                <li key={a.title} className="rounded-xl border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${priorityStyles[a.priority]}`}>
                      {a.priority}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{a.time}</span>
                  </div>
                  <div className="mt-2 text-sm font-medium leading-snug">{a.title}</div>
                  <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                    <span>{a.impact}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-accent">Pourquoi : {a.why}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Watchlist */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4 text-primary" /> Ma watchlist
              </div>
              <button className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>
            <WatchGroup label="Entreprises" items={watchlist.companies} />
            <WatchGroup label="Technologies" items={watchlist.technologies} />
            <WatchGroup label="Mots-clés" items={watchlist.keywords} />
          </div>
          <Link
            to="/watchlists"
            className="block rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground hover:border-accent/50 hover:text-foreground"
          >
            Configurer mes watchlists →
          </Link>
        </aside>
      </section>
    </SiteLayout>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-card ${
        accent ? "border-accent/30 bg-gradient-to-br from-accent/10 to-card" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
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
            className="rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:border-accent/40"
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}
