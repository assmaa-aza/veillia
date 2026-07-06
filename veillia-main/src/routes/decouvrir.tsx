import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Bell,
  BarChart3,
  FileText,
  LayoutDashboard,
  Zap,
  ArrowRight,
  ArrowDown,
  Check,
  X,
  TrendingUp,
  Globe,
  Newspaper,
  Inbox,
  Filter,
  Clock,
  Mail,
  PieChart,
  AlertTriangle,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/decouvrir")({
  head: () => ({
    meta: [
      { title: "Découvrir VeillIA — La veille IA réinventée" },
      {
        name: "description",
        content:
          "Explorez en profondeur les fonctionnalités de VeillIA : actualités intelligentes, veille personnalisée, alertes temps réel, tendances et rapports IA.",
      },
      { property: "og:title", content: "Découvrir VeillIA" },
      {
        property: "og:description",
        content:
          "Avant / après VeillIA : transformez le chaos informationnel en intelligence actionnable.",
      },
    ],
  }),
  component: Decouvrir,
});

/* -------------------------------------------------------------------------- */
/*  Hook : fade-in au scroll                                                  */
/* -------------------------------------------------------------------------- */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, shown };
}

/* -------------------------------------------------------------------------- */
/*  Hook : compteur animé                                                     */
/* -------------------------------------------------------------------------- */
function useCounter(target: number, active: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return val;
}

/* -------------------------------------------------------------------------- */
/*  Données features                                                          */
/* -------------------------------------------------------------------------- */
type Feature = {
  id: string;
  num: string;
  icon: typeof Sparkles;
  title: string;
  tagline: string;
  before: { icon: typeof X; text: string }[];
  after: { icon: typeof Check; text: string }[];
  example: {
    tag: string;
    title: string;
    summary: string;
    trend: number; // 0-100
    badge: string;
  };
};

const features: Feature[] = [
  {
    id: "actualites",
    num: "01",
    icon: Sparkles,
    title: "Actualités intelligentes",
    tagline:
      "Des centaines de sources lues, filtrées et résumées en continu pour ne garder que ce qui compte.",
    before: [
      { icon: Newspaper, text: "20 onglets ouverts en parallèle" },
      { icon: Inbox, text: "Newsletters en doublon, à trier à la main" },
      { icon: Clock, text: "1h+ par jour perdue à scanner les sources" },
    ],
    after: [
      { icon: Check, text: "Un fil unique, dédupliqué automatiquement" },
      { icon: Check, text: "Résumés en 2 lignes par notre IA" },
      { icon: Check, text: "Lecture quotidienne en moins de 5 min" },
    ],
    example: {
      tag: "IA Générative",
      title: "OpenAI dévoile un modèle multimodal nouvelle génération",
      summary:
        "Un saut majeur sur le raisonnement vidéo, la latence et la compréhension de longs contextes — disponibilité API annoncée pour Q3.",
      trend: 86,
      badge: "+312% mentions / 24h",
    },
  },
  {
    id: "veille",
    num: "02",
    icon: FileText,
    title: "Veille personnalisée",
    tagline:
      "Indiquez vos sujets, entreprises et technologies suivies. Votre fil s'ajuste à mesure que vous interagissez.",
    before: [
      { icon: Filter, text: "Aucun filtrage par centre d'intérêt" },
      { icon: Globe, text: "Trop de bruit, peu de signal pertinent" },
      { icon: X, text: "Impossible de suivre 10 sujets en parallèle" },
    ],
    after: [
      { icon: Check, text: "Sujets, entreprises et techs configurables" },
      { icon: Check, text: "Score de pertinence par article" },
      { icon: Check, text: "Apprentissage continu de vos préférences" },
    ],
    example: {
      tag: "Veille — Agents IA",
      title: "Lancement d'un framework open-source pour agents autonomes",
      summary:
        "Architecture multi-agents avec mémoire long-terme et outils MCP natifs. Adoption rapide chez les early adopters.",
      trend: 72,
      badge: "Match pertinence 94%",
    },
  },
  {
    id: "tendances",
    num: "03",
    icon: BarChart3,
    title: "Analyse des tendances",
    tagline:
      "Visualisez les signaux faibles : nouvelles thématiques, acteurs émergents, accélérations de publications.",
    before: [
      { icon: X, text: "Détection des tendances trop tardive" },
      { icon: X, text: "Aucune vision macro de l'écosystème" },
      { icon: X, text: "Données dispersées, impossibles à comparer" },
    ],
    after: [
      { icon: Check, text: "Graphes d'évolution par thématique" },
      { icon: Check, text: "Alerte sur signaux faibles émergents" },
      { icon: Check, text: "Comparaison d'acteurs et de marchés" },
    ],
    example: {
      tag: "Tendance détectée",
      title: "Explosion des modèles « small language models » open-source",
      summary:
        "Volume de publications x4 en 60 jours, 3 nouveaux acteurs majeurs identifiés sur le segment edge.",
      trend: 91,
      badge: "Signal fort — émergent",
    },
  },
  {
    id: "alertes",
    num: "04",
    icon: Bell,
    title: "Alertes en temps réel",
    tagline:
      "Soyez notifié dès qu'une annonce majeure tombe sur un sujet suivi — email, push ou digest quotidien.",
    before: [
      { icon: Clock, text: "Information découverte avec 24h de retard" },
      { icon: X, text: "Annonces concurrentes manquées" },
      { icon: Mail, text: "Boîte mail saturée de notifications inutiles" },
    ],
    after: [
      { icon: Check, text: "Push instantané sur événements critiques" },
      { icon: Check, text: "Filtres fins : sujet, sévérité, source" },
      { icon: Check, text: "Digest quotidien ou hebdo paramétrable" },
    ],
    example: {
      tag: "Alerte critique",
      title: "Régulation IA — accord européen sur le AI Act renforcé",
      summary:
        "Nouveau périmètre sur les modèles fondationnels. Obligations de transparence étendues aux acteurs hors UE.",
      trend: 78,
      badge: "Notification envoyée à 09:42",
    },
  },
  {
    id: "rapports",
    num: "05",
    icon: LayoutDashboard,
    title: "Rapports IA",
    tagline:
      "Générez des notes de synthèse exportables (PDF, Notion) pour partager votre veille avec vos équipes.",
    before: [
      { icon: X, text: "Synthèses rédigées manuellement chaque semaine" },
      { icon: X, text: "Mise en forme chronophage, peu réutilisable" },
      { icon: X, text: "Partage compliqué avec les équipes" },
    ],
    after: [
      { icon: Check, text: "Rapports générés en un clic par notre IA" },
      { icon: Check, text: "Export PDF, Notion, Markdown" },
      { icon: Check, text: "Templates par équipe et par usage" },
    ],
    example: {
      tag: "Rapport hebdo",
      title: "Synthèse IA — Semaine du 18 juin",
      summary:
        "12 annonces majeures, 4 tendances émergentes, 3 levées de fonds notables. Export Notion prêt à partager.",
      trend: 65,
      badge: "Généré en 4 secondes",
    },
  },
  {
    id: "dashboard",
    num: "06",
    icon: Zap,
    title: "Dashboard interactif",
    tagline:
      "Tableau de bord unifié pour piloter sources, alertes, sujets et collaborateurs depuis un seul écran.",
    before: [
      { icon: X, text: "5 outils différents pour la même veille" },
      { icon: X, text: "Aucune vue d'ensemble centralisée" },
      { icon: X, text: "Collaboration impossible entre équipes" },
    ],
    after: [
      { icon: Check, text: "Vue unifiée : sources, alertes, équipes" },
      { icon: Check, text: "Widgets personnalisables par profil" },
      { icon: Check, text: "Partage et commentaires en équipe" },
    ],
    example: {
      tag: "Dashboard",
      title: "Vue d'équipe — Cellule Innovation IA",
      summary:
        "23 sujets suivis, 8 alertes actives, 4 collaborateurs. Pulse hebdo automatique partagé sur Slack.",
      trend: 88,
      badge: "Temps réel",
    },
  },
];

/* -------------------------------------------------------------------------- */
/*  Composants                                                                */
/* -------------------------------------------------------------------------- */
function Stat({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const n = useCounter(value, shown);
  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-border bg-card/70 p-6 text-center shadow-card backdrop-blur transition-all duration-700 ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="font-display text-4xl font-bold text-gradient-brand sm:text-5xl">
        {n.toLocaleString("fr-FR")}
        {suffix}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function ExampleCard({ ex }: { ex: Feature["example"] }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-brand">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[var(--gradient-glow)] opacity-60 blur-2xl"
      />
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-gradient-brand px-3 py-1 text-xs font-semibold text-primary-foreground shadow-brand">
          {ex.tag}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
          <TrendingUp className="h-3 w-3 text-success" /> {ex.badge}
        </span>
      </div>
      <h4 className="mt-4 line-clamp-2 text-base font-semibold leading-snug">{ex.title}</h4>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{ex.summary}</p>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Intensité du signal</span>
          <span className="font-semibold text-foreground">{ex.trend}/100</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-brand transition-all duration-700 group-hover:brightness-110"
            style={{ width: `${ex.trend}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function BeforeCard({ items }: { items: Feature["before"] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-background/60 px-3 py-1 text-xs font-semibold text-destructive backdrop-blur">
        <AlertTriangle className="h-3.5 w-3.5" /> Avant VeillIA
      </div>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-destructive/15 text-destructive">
              <it.icon className="h-3.5 w-3.5" />
            </span>
            <span className="text-foreground/80">{it.text}</span>
          </li>
        ))}
      </ul>
      <div
        aria-hidden
        className="mt-5 flex items-center gap-1.5 opacity-70"
        title="Chaos informationnel"
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="h-1 rounded-full bg-destructive/40"
            style={{ width: `${4 + ((i * 7) % 18)}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function AfterCard({ items }: { items: Feature["after"] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-6 shadow-card">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: "var(--gradient-glow)" }}
      />
      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-brand px-3 py-1 text-xs font-semibold text-primary-foreground shadow-brand">
          <Sparkles className="h-3.5 w-3.5" /> Après VeillIA
        </div>
        <ul className="space-y-3">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-brand text-primary-foreground shadow-brand">
                <it.icon className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium text-foreground">{it.text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center gap-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[92%] rounded-full bg-gradient-brand" />
          </div>
          <span className="text-xs font-semibold text-primary">92%</span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">Signal extrait du bruit</div>
      </div>
    </div>
  );
}

function FeatureSection({ f }: { f: Feature }) {
  const { ref, shown } = useReveal<HTMLElement>();
  return (
    <section
      ref={ref}
      id={f.id}
      className={`scroll-mt-24 transition-all duration-700 ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold text-accent backdrop-blur">
            <span className="font-display">{f.num}</span>
            <span className="h-1 w-1 rounded-full bg-accent/60" />
            Fonctionnalité
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            {f.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {f.tagline}
          </p>
        </div>

        {/* Avant → Après : layout identique pour toutes les sections */}
        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <div className="h-full">
            <BeforeCard items={f.before} />
          </div>

          {/* Flèche de transformation */}
          <div className="flex h-full items-center justify-center">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground shadow-brand lg:h-16 lg:w-16">
              <span
                aria-hidden
                className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/40"
                style={{ animationDuration: "2.5s" }}
              />
              <ArrowRight className="hidden h-6 w-6 lg:block" />
              <ArrowDown className="h-6 w-6 lg:hidden" />
            </div>
          </div>

          <div className="h-full">
            <AfterCard items={f.after} />
          </div>
        </div>

        {/* Exemple réel */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground/70">
              <PieChart className="h-3.5 w-3.5 text-primary" /> Exemple réel
            </div>
            <h3 className="mt-3 font-display text-xl font-bold sm:text-2xl">
              Une vraie carte générée par VeillIA
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Voici à quoi ressemble un article produit par notre moteur de veille pour cette
              fonctionnalité — titre, résumé, catégorie et indicateur de tendance.
            </p>
          </div>
          <ExampleCard ex={f.example} />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
function Decouvrir() {
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-90"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, rgba(124,58,237,0.22), transparent 70%), radial-gradient(40% 50% at 80% 30%, rgba(168,85,247,0.18), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
        />
        <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Plateforme de veille IA nouvelle génération
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold leading-tight sm:text-6xl lg:text-7xl">
            Découvrez la puissance de{" "}
            <span className="text-gradient-brand">VeillIA</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            VeillIA automatise votre veille sur l'intelligence artificielle. Sources lues,
            résumées, classées et envoyées à la bonne personne — sans effort, en temps réel.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#actualites"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-muted"
            >
              Explorer les fonctionnalités
            </a>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-3">
            <Stat value={500} suffix="+" label="Sources surveillées" />
            <Stat value={24} suffix="/7" label="Veille en continu" />
            <Stat value={92} suffix="%" label="Bruit en moins" />
          </div>
        </div>
      </section>

      {/* SECTIONS FEATURES */}
      <div className="space-y-28 bg-background py-24 sm:space-y-36">
        {features.map((f) => (
          <FeatureSection key={f.id} f={f} />
        ))}
      </div>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-10 text-center text-primary-foreground shadow-brand sm:p-16">
          <div
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{ background: "var(--gradient-glow)" }}
          />
          <h2 className="relative font-display text-3xl font-bold sm:text-4xl">
            Passez de la lecture passive à l'intelligence active.
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/90">
            Créez votre espace VeillIA en moins d'une minute. Premières alertes en quelques
            heures.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 text-sm font-semibold text-primary shadow-card hover:bg-card"
            >
              Commencer gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/a-propos"
              className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/30 bg-transparent px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
            >
              En savoir plus
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
