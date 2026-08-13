import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Target,
  Zap,
  TrendingUp,
  Users,
  Globe,
  Database,
  Filter,
  LineChart,
  FileText,
  Lightbulb,
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import aboutIllustration from "@/assets/about-illustration.jpg";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À propos — VeillIA" },
      { name: "description", content: "VeillIA est une plateforme de veille intelligente dédiée à l'écosystème IA." },
    ],
  }),
  component: APropos,
});

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

const stats = [
  { label: "Sources monitorées", value: "120+", icon: Globe },
  { label: "Résumés générés / semaine", value: "500+", icon: FileText },
  { label: "Utilisateurs actifs", value: "8K+", icon: Users },
  { label: "Heures économiées / mois", value: "3200", icon: Clock },
];

const values = [
  {
    icon: Target,
    title: "Précision",
    desc: "Nous filtrons le bruit pour ne garder que les signaux IA qui comptent vraiment.",
  },
  {
    icon: Zap,
    title: "Rapidité",
    desc: "L'actualité est traitée en temps réel, de la source à votre dashboard en quelques minutes.",
  },
  {
    icon: Shield,
    title: "Fiabilité",
    desc: "Chaque information est vérifiée, sourcée et contextualisée avant d'être diffusée.",
  },
  {
    icon: TrendingUp,
    title: "Intelligence",
    desc: "Nos modèles détectent les tendances émergentes et les faibles signaux dès leurs premières apparitions.",
  },
];

const timeline = [
  { icon: Database, label: "Collect", desc: "Agrégation multi-sources" },
  { icon: Filter, label: "Filter", desc: "Sélection par pertinence" },
  { icon: LineChart, label: "Analyze", desc: "Détection des tendances" },
  { icon: FileText, label: "Summarize", desc: "Résumés actionnables" },
  { icon: Lightbulb, label: "Deliver insights", desc: "Intelligence livrée claire" },
];

import { useLanguage } from "@/hooks/use-language";

function APropos() {
  const { ref: heroRef, shown: heroShown } = useReveal<HTMLDivElement>();
  const { ref: gridRef, shown: gridShown } = useReveal<HTMLDivElement>();
  const { t } = useLanguage();

  const valuesRef = useReveal<HTMLDivElement>();
  const missionRef = useReveal<HTMLDivElement>();
  const timelineRef = useReveal<HTMLDivElement>();
  const ctaRef = useReveal<HTMLDivElement>();

  return (
    <SiteLayout>
      <div className="relative overflow-hidden">
        {/* Hero */}
        <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -right-20 top-0 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/10 to-accent/5 blur-3xl" />
            <div className="absolute -left-20 bottom-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-accent/10 to-primary/5 blur-3xl" />
          </div>

          <div
            ref={heroRef}
            className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-16 transition-all duration-700 ${
              heroShown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                La veille IA, réinventée
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                À propos de{" "}
                <span className="text-gradient-brand">VeillIA</span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                VeillIA transforme le flux d'actualités IA en intelligence claire et actionnable. Fini la surcharge d'informations : nous collectons, filtrons, analysons et résumons pour vous.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/auth/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95"
                >
                  Commencer votre veille gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/decouvrir"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Découvrir les fonctionnalités
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 blur-2xl" />
              <img
                src={aboutIllustration}
                alt="Illustration du dashboard VeillIA avec données et tendances IA"
                width={1024}
                height={1024}
                loading="eager"
                className="relative rounded-2xl border border-border/50 shadow-2xl shadow-primary/10"
              />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div
            ref={gridRef}
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 transition-all duration-700 delay-100 ${
              gridShown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-brand"
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/5 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="font-display text-3xl font-bold text-gradient-brand">{stat.value}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div
            ref={valuesRef.ref}
            className={`transition-all duration-700 ${
              valuesRef.shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Nos valeurs, votre <span className="text-gradient-brand">avantage</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Chaque fonctionnalité de VeillIA est pensée pour transformer l'information en décision.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((v) => (
                <div
                  key={v.title}
                  className="group relative rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-brand"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary transition-transform duration-300 group-hover:scale-110">
                    <v.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission card */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div
            ref={missionRef.ref}
            className={`transition-all duration-700 ${
              missionRef.shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-8 text-primary-foreground shadow-brand sm:p-12 lg:p-16">
              <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                    <Target className="h-3.5 w-3.5" />
                    Notre mission
                  </div>
                  <h2 className="font-display text-2xl font-bold sm:text-3xl lg:text-4xl">
                    Donner à chaque professionnel un fil sur-mesure pour comprendre l'IA
                  </h2>
                  <p className="max-w-2xl text-primary-foreground/80">
                    Étudiants, ingénieurs, chercheurs, entrepreneurs, investisseurs et responsables innovation méritent une veille claire, fiable et actionnable — sans passer des heures à trier le bruit.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    "Sources fiables et diversifiées",
                    "Résumés clairs et contextualisés",
                    "Alertes personnalisées en temps réel",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium backdrop-blur-sm">
                      <CheckCircle className="h-4 w-4 text-primary-foreground" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div
            ref={timelineRef.ref}
            className={`transition-all duration-700 ${
              timelineRef.shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Comment fonctionne <span className="text-gradient-brand">VeillIA</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Un pipeline simple et puissant qui transforme des milliers de sources en insights clairs.
              </p>
            </div>

            <div className="mt-14">
              <div className="relative">
                {/* Connecting line */}
                <div className="absolute left-0 top-1/2 hidden h-0.5 w-full -translate-y-1/2 bg-gradient-to-r from-primary/20 via-accent/40 to-primary/20 lg:block" />

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                  {timeline.map((step, i) => (
                    <div
                      key={step.label}
                      className="group relative z-10 flex flex-col items-center text-center"
                      style={{ transitionDelay: `${i * 80}ms` }}
                    >
                      <div className="relative">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-card transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-brand">
                          <step.icon className="h-7 w-7 text-primary" />
                        </div>
                        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[10px] font-bold text-primary-foreground">
                          {i + 1}
                        </div>
                      </div>
                      <h3 className="mt-4 font-display text-base font-semibold">{step.label}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 py-16 pb-24 sm:px-6 lg:px-8">
          <div
            ref={ctaRef.ref}
            className={`transition-all duration-700 ${
              ctaRef.shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card sm:p-12">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Prêt à ne plus rien manquer de l'IA ?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Rejoignez des milliers d'utilisateurs qui sauvent du temps chaque semaine grâce à une veille intelligente et personnalisée.
              </p>
              <Link
                to="/auth/signup"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-8 py-4 text-base font-semibold text-primary-foreground shadow-brand transition hover:opacity-95"
              >
                Commencer votre veille gratuitement
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
