import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useReport, type ReportArticle } from "@/hooks/use-report";

export const Route = createFileRoute("/mon-rapport")({
  head: () => ({
    meta: [
      { title: "Mon rapport — VeillIA" },
      {
        name: "description",
        content:
          "Composez et générez votre rapport personnalisé à partir des articles sélectionnés.",
      },
    ],
  }),
  component: MonRapport,
});

import { useLanguage } from "@/hooks/use-language";
import type { SupportedLanguage } from "@/lib/translations";

function generateMockReport(articles: ReportArticle[], lang: SupportedLanguage = "Français") {
  const categories = [...new Set(articles.map((a) => a.category).filter(Boolean))];
  const sources = [...new Set(articles.map((a) => a.source).filter(Boolean))];
  const count = articles.length;

  if (lang === "English") {
    return {
      title: `Intelligence Report — ${new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date())}`,
      executive: `This intelligence report covers ${count} article${count > 1 ? "s" : ""} across ${categories.length || "multiple"} categories. Sources analyzed include ${sources.length > 0 ? sources.join(", ") : "various AI intelligence feeds"}. Key insights compiled by VeillIA AI.`,
      sections: articles.map((a) => ({
        title: a.title,
        source: a.source || "VeillIA",
        category: a.category || "General",
        summary: a.summary || "Detailed analysis of this article highlighting key AI trends.",
        insight: `Highly relevant for your intelligence feed in ${a.category || "AI"}. Follow-up recommended.`,
      })),
      conclusion: `This report summarizes the ${count} most critical articles according to your intelligence preferences.`,
    };
  }

  if (lang === "العربية") {
    return {
      title: `تقرير الرصد الاستراتيجي — ${new Intl.DateTimeFormat("ar-SA", { dateStyle: "long" }).format(new Date())}`,
      executive: `يغطي هذا التقرير الاستراتيجي ${count} مقالاً في ${categories.length || "عدة"} تصنيفات. تضمن المصادر المحللة ${sources.join("، ") || "مصادر ذكية متعددة"}.`,
      sections: articles.map((a) => ({
        title: a.title,
        source: a.source || "VeillIA",
        category: a.category || "عام",
        summary: a.summary || "تحليل مفصل لهذا المقال يسلط الضوء على النقاط الرئيسية.",
        insight: `ذو صلة عالية بموجزك الذكي في مجالات الذكاء الاصطناعي.`,
      })),
      conclusion: `يلخص هذا التقرير المقالات الـ ${count} الأكثر أهمية وفقاً لتفضيلات الرصد الخاصة بك.`,
    };
  }

  return {
    title: `Rapport de veille — ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date())}`,
    executive: `Ce rapport de veille couvre ${count} article${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""} dans ${categories.length || "plusieurs"} catégorie${categories.length > 1 ? "s" : ""}. Les sources consultées incluent ${sources.length > 0 ? sources.join(", ") : "diverses sources de veille IA"}. Voici les points clés identifiés par l'intelligence artificielle de VeillIA.`,
    sections: articles.map((a) => ({
      title: a.title,
      source: a.source || "VeillIA",
      category: a.category || "Général",
      summary:
        a.summary ||
        "Analyse détaillée de cet article avec les points clés identifiés par VeillIA.",
      insight: `Cet article est pertinent pour votre veille dans la catégorie ${a.category || "IA"}. L'IA de VeillIA recommande un suivi approfondi de ce sujet.`,
    })),
    conclusion: `Ce rapport synthétise les ${count} articles les plus pertinents selon vos critères de veille. Continuez à affiner votre sélection pour des rapports toujours plus ciblés.`,
  };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
function MonRapport() {
  const navigate = useNavigate();
  const { isAuthenticated, ready, user } = useAuth();
  const { language, t } = useLanguage();
  const {
    reportArticles,
    count,
    removeArticle,
    clearReport,
  } = useReport();

  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<ReturnType<typeof generateMockReport> | null>(null);

  // Redirect to login if not authenticated
  if (ready && !isAuthenticated) {
    navigate({ to: "/auth/login" });
    return null;
  }
  if (!ready) return null;

  const handleGenerate = () => {
    if (count === 0) return;
    setGenerating(true);
    setTimeout(() => {
      setReport(generateMockReport(reportArticles, language));
      setGenerating(false);
    }, 1200);
  };


  const handleClearAndReset = () => {
    clearReport();
    setReport(null);
  };

  const handleDownloadTxt = () => {
    if (!report) return;
    const txtContent = `${report.title}
==================================================
Généré par VeillIA le ${new Date().toLocaleDateString()} pour ${user?.name || "Membre VeillIA"}

SYNTHÈSE EXÉCUTIVE:
${report.executive}

--------------------------------------------------
ANALYSES DES ARTICLES:
${report.sections
  .map(
    (s, idx) => `
[${idx + 1}] ${s.title}
Catégorie: ${s.category} | Source: ${s.source}
Résumé: ${s.summary}
Insight VeillIA: ${s.insight}
`
  )
  .join("\n--------------------------------------------------\n")}

==================================================
CONCLUSION:
${report.conclusion}
`;

    const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport-veillia-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <SiteLayout>
      {/* Header */}
      <section className="border-b border-border bg-gradient-to-br from-card via-background to-card/40 print:hidden">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("btn_back")}
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                <span className="text-gradient-brand">{t("report_title")}</span>
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                {count === 0
                  ? t("report_empty_desc")
                  : `${count} article${count > 1 ? "s" : ""} — ${t("btn_generate_report")}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {count > 0 && !report && (
                <>
                  <button
                    onClick={handleClearAndReset}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" /> {t("btn_clear_report")}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95 disabled:opacity-60"
                  >
                    {generating ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-spin" /> {t("btn_generating_report")}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> {t("btn_generate_report")}
                      </>
                    )}
                  </button>
                </>
              )}
              {report && (
                <button
                  onClick={() => setReport(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> {t("btn_back_selection")}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>


      {/* Generated Report View */}
      {report ? (
        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card print:border-none print:shadow-none print:p-0">
            {/* Report Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-3 py-1 text-xs font-semibold text-primary-foreground shadow-brand print:bg-primary print:text-white">
                  <Sparkles className="h-3.5 w-3.5" /> Rapport généré par VeillIA
                </div>
                <h2 className="mt-3 text-2xl font-bold">{report.title}</h2>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Généré pour {user?.name}</div>
                <div>
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "long",
                    timeStyle: "short",
                  }).format(new Date())}
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                {t("exec_summary_title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {report.executive}
              </p>
            </div>

            {/* Article Sections */}
            <div className="mt-8 space-y-6">
              {report.sections.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-background/50 p-5"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-accent/10 px-2 py-0.5 font-semibold text-accent">
                      {s.category}
                    </span>
                    <span className="text-muted-foreground">{s.source}</span>
                  </div>
                  <h4 className="mt-2 text-lg font-semibold leading-snug">
                    {s.title}
                  </h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {s.summary}
                  </p>
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-accent/5 px-3 py-2 text-xs text-accent">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong>Insight VeillIA :</strong> {s.insight}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Conclusion */}
            <div className="mt-8 rounded-xl bg-muted/50 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Conclusion
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {report.conclusion}
              </p>
            </div>

            {/* Export Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 print:hidden">
              <div className="text-xs text-muted-foreground">
                Rapport basé sur {count} article{count > 1 ? "s" : ""}{" "}
                sélectionné{count > 1 ? "s" : ""}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `${report.title}\n\n${report.executive}\n\n${report.sections.map((s) => `## ${s.title}\n${s.summary}\n${s.insight}`).join("\n\n")}\n\n${report.conclusion}`,
                    );
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                >
                  {t("btn_copy_text")}
                </button>
                <button
                  onClick={handleDownloadTxt}
                  className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                >
                  {t("btn_download_txt")}
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-brand hover:opacity-95 transition"
                >
                  {t("btn_download_pdf")}
                </button>
                <button
                  onClick={handleGenerate}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                >
                  {t("btn_regenerate")}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Article Selection View */
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {count === 0 ? (
            /* Empty State */
            <div className="mx-auto max-w-lg text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="mt-6 text-xl font-bold">
                Votre rapport est vide
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Parcourez les articles depuis votre dashboard ou les catégories
                et cliquez sur « + Ajouter au rapport » pour les inclure ici.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand hover:opacity-95"
                >
                  <Search className="h-4 w-4" /> Explorer mon flux
                </Link>
                <Link
                  to="/decouvrir"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Découvrir les catégories{" "}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            /* Article List */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <FileText className="h-5 w-5 text-primary" />
                  Articles sélectionnés
                </h2>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" /> Ajouter d'autres articles
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reportArticles.map((article) => (
                  <div
                    key={article.id}
                    className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-brand"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{article.source || article.category || "VeillIA"}</span>
                      <span>{article.date || article.published_at || "Récent"}</span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug">
                      <Link
                        to="/analyses/$id"
                        params={{
                          id: encodeURIComponent(article.title),
                        }}
                        className="hover:text-primary transition"
                      >
                        {article.title}
                      </Link>
                    </h3>
                    {article.summary && (
                      <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">
                        {article.summary}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <Link
                        to="/analyses/$id"
                        params={{
                          id: encodeURIComponent(article.title),
                        }}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        Voir l'analyse
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => removeArticle(article.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-3.5 w-3.5" /> Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Generate CTA */}
              <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold">
                  Prêt à générer votre rapport ?
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  VeillIA va analyser vos {count} article
                  {count > 1 ? "s" : ""} et produire une synthèse
                  stratégique personnalisée.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-8 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95 disabled:opacity-60"
                >
                  {generating ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />{" "}
                      Génération en cours…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Générer mon rapport
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </SiteLayout>
  );
}
