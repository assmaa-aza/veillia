import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Lock,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Plus,
  Bell,
  Check,
  FileText,
  Send,
  User,
  Brain,
  Eye,
  Clock,
  ChevronRight,
  TrendingUp,
  HelpCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Layers,
  CheckCircle2,
  FileSearch,
  Globe,
  Tag,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useWatchlists } from "@/hooks/use-watchlists";
import { useReport } from "@/hooks/use-report";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";
import { getArticleById, getArticlesByCategory, chatWithArticle, type Article } from "@/lib/api";
import { getArticleImage } from "@/lib/article-image";

export const Route = createFileRoute("/analyses/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Rapport d'analyse #${params.id} — VeillIA` },
      { name: "description", content: "Rapport d'analyse stratégique détaillé par l'intelligence artificielle VeillIA." },
    ],
  }),
  component: AnalysisPage,
});

function formatDate(dateStr: string | null, language: string): string {
  if (!dateStr) return "Date non spécifiée";
  try {
    const locale = language === "العربية" || language === "Darija" ? "ar" : language === "English" ? "en-GB" : "fr-FR";
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function AnalysisPage() {
  const params = Route.useParams();
  const { isAuthenticated, user, accessToken } = useAuth();
  const { lists, addItem, create } = useWatchlists();
  const { language, t } = useLanguage();
  const { toggleArticle, isArticleInReport } = useReport();

  // Article fetch state
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Related articles
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);

  // Action states
  const [saved, setSaved] = useState(false);
  const [alertCreated, setAlertCreated] = useState(false);
  const [showWL, setShowWL] = useState(false);
  const [creatingWL, setCreatingWL] = useState(false);
  const [newWLName, setNewWLName] = useState("");

  // Q&A Chat states
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string; notFound?: boolean }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch article by numeric ID
  useEffect(() => {
    const id = Number(params.id);
    if (isNaN(id) || id <= 0) {
      setError(t("analysis_not_found"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    getArticleById(id)
      .then((data) => {
        setArticle(data);
        setLoading(false);
      })
      .catch(() => {
        setError(t("analysis_error"));
        setLoading(false);
      });
  }, [params.id]);

  // Fetch related articles
  useEffect(() => {
    if (!article?.category) return;
    const CATEGORY_TO_SLUG: Record<string, string> = {
      startup: "startups",
      tendance: "tendances",
      produit_ia: "produits",
      reglementation: "regulation",
      evenement: "evenements",
      recherche: "recherche",
      ecosysteme: "ecosysteme",
    };
    const slug = CATEGORY_TO_SLUG[article.category] || article.category;
    getArticlesByCategory(slug)
      .then((articles) => {
        const filtered = articles.filter((a) => a.id !== article.id).slice(0, 3);
        setRelatedArticles(filtered);
      })
      .catch(() => {});
  }, [article?.category, article?.id]);

  // Chatbot greeting
  useEffect(() => {
    if (!article) return;
    const shortTitle = article.title.length > 60 ? article.title.slice(0, 57) + "…" : article.title;
    const greeting =
      language === "English"
        ? `Hello ${isAuthenticated ? user?.name : "Visitor"}. I am the VeillIA AI assistant. Ask me any question about "${shortTitle}".`
        : language === "العربية"
        ? `مرحباً ${isAuthenticated ? user?.name : "زائر"}. أنا مساعد VeillIA الذكي. اطرح علي أي سؤال حول "${shortTitle}".`
        : language === "Darija"
        ? `مرحبا ${isAuthenticated ? user?.name : "ضيف"}. أنا مساعد VeillIA الذكي. اسأل على "${shortTitle}".`
        : `Bonjour ${isAuthenticated ? user?.name : "Visiteur"}. Je suis l'assistant VeillIA. Posez-moi vos questions sur "${shortTitle}".`;
    setMessages([{ sender: "ai", text: greeting }]);
  }, [language, isAuthenticated, user?.name, article]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSave = () => {
    setSaved(!saved);
    toast.success(saved ? t("analysis_save") : t("analysis_saved"));
  };

  const handleAlert = () => {
    setAlertCreated(!alertCreated);
    toast.success(alertCreated ? t("analysis_alert") : t("analysis_alert_created"));
  };

  const handleAddToReport = () => {
    if (!article) return;
    const idStr = String(article.id);
    toggleArticle({
      id: idStr,
      title: article.title,
      source: article.source || "VeillIA",
      date: formatDate(article.published_at, language),
      summary: article.summary || "",
      category: article.category || "Général",
    });
    toast.success(
      isArticleInReport(idStr) ? t("analysis_add_report") : t("analysis_added_report"),
    );
  };

  const handleAddToWatchlist = (wlId: string, wlName: string) => {
    if (!article) return;
    addItem(wlId, article.title);
    setShowWL(false);
    toast.success(`${t("analysis_add_watchlist")}: "${wlName}"`);
  };

  const handleCreateWatchlist = () => {
    const name = newWLName.trim();
    if (!name) return;
    create(name, "keywords");
    setCreatingWL(false);
    setNewWLName("");
    toast.success(`${name}`);
  };

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !article) return;

    const userText = chatInput.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await chatWithArticle(
        accessToken || "",
        article.id,
        userText,
        language,
      );
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: response.answer, notFound: !response.found_in_article },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: t("analysis_chat_error"), notFound: true },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{t("analysis_loading")}</p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (error || !article) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">{error || t("analysis_not_found")}</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("analysis_error")}
          </p>
          <Link
            to={isAuthenticated ? "/dashboard" : "/"}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand hover:opacity-95"
          >
            <ArrowLeft className="h-4 w-4" /> {t("analysis_back")}
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const articleIdStr = String(article.id);
  const inReport = isArticleInReport(articleIdStr);
  const imageUrl = getArticleImage(article);

  // Extract key takeaways or sentences for Key Points section
  const summarySentences = (article.summary || "")
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 15);

  return (
    <SiteLayout>
      {/* Top Bar Navigation */}
      <div className="border-b border-border bg-card/30 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to={isAuthenticated ? "/dashboard" : "/"}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-4 w-4" /> {t("analysis_back")}
          </Link>
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rapport d'Analyse ID: <strong>#{article.id}</strong></span>
            <span>•</span>
            <span>{formatDate(article.published_at, language)}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Article Banner Header with Image */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-center p-6 sm:p-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {article.category && (
                  <span className="rounded-full bg-gradient-brand px-3 py-1 text-xs font-bold text-primary-foreground shadow-brand">
                    {article.category.toUpperCase()}
                  </span>
                )}
                {article.source && (
                  <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-foreground/80">
                    Source: {article.source}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-foreground">
                {article.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5 text-primary" /> {formatDate(article.published_at, language)}
                </span>
                {article.author && (
                  <span className="flex items-center gap-1 font-medium">
                    <User className="h-3.5 w-3.5 text-primary" /> Par {article.author}
                  </span>
                )}
              </div>
            </div>

            {/* Banner Image */}
            <div className="h-48 sm:h-56 lg:h-64 rounded-2xl overflow-hidden shadow-card border border-border relative bg-muted">
              <img
                src={imageUrl}
                alt={article.title}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Structured 6-Section Report Layout */}
        <div className="grid gap-8 lg:grid-cols-[1.8fr_1fr]">
          {/* Main 6 Sections Column */}
          <div className="space-y-6">

            {/* SECTION 1: Description */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider">
                <FileSearch className="h-4 w-4" />
                <span>1. Description (Vue d'ensemble)</span>
              </div>
              <p className="text-base text-foreground leading-relaxed font-medium">
                {article.summary || article.title}
              </p>
            </section>

            {/* SECTION 2: Category & Tags */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider">
                <Layers className="h-4 w-4" />
                <span>2. Catégorie & Domaine d'application</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-xl bg-primary/10 border border-primary/30 px-3 py-1 text-sm font-bold text-primary">
                  {article.category || "Intelligence Artificielle"}
                </span>
                {article.tags && article.tags.length > 0 && article.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground border border-border">
                    <Tag className="h-3 w-3 text-accent" /> {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* SECTION 3: Key Points / Summary */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider">
                <Brain className="h-4 w-4" />
                <span>3. Points Clés / Résumé Synthétique</span>
              </div>
              <ul className="space-y-2.5">
                {summarySentences.length > 0 ? (
                  summarySentences.map((sentence, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground leading-relaxed">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      <span>{sentence}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-start gap-2.5 text-sm text-foreground leading-relaxed">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>{article.summary || article.title}</span>
                  </li>
                )}
              </ul>
            </section>

            {/* SECTION 4: Analysis */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider">
                <FileText className="h-4 w-4" />
                <span>4. Analyse Approfondie & Contexte</span>
              </div>
              <div className="prose dark:prose-invert max-w-none text-sm text-muted-foreground leading-relaxed font-sans space-y-3">
                {article.content ? (
                  <p>{article.content}</p>
                ) : (
                  <p>
                    L'analyse détaillée du rapport s'appuie sur le pipeline de surveillance automatisée VeillIA. Les signaux faibles détectés démontrent une accélération stratégique dans le secteur de l'intelligence artificielle et confirment les tendances d'adoption auprès des acteurs industriels.
                  </p>
                )}
              </div>
            </section>

            {/* SECTION 5: Impact / Insights */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider">
                <Eye className="h-4 w-4" />
                <span>5. Impacts & Insights Clés</span>
              </div>
              {!isAuthenticated ? (
                <div className="relative mt-2">
                  <div className="pointer-events-none select-none blur-xs text-sm text-muted-foreground">
                    {t("analysis_locked_placeholder")}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 text-center p-4">
                    <Lock className="h-6 w-6 text-muted-foreground animate-bounce" />
                    <span className="mt-2 text-xs font-semibold text-muted-foreground">{t("analysis_locked_impact")}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-accent/5 p-4 border border-accent/20 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-accent">
                    {t("analysis_impact_profile")} — {user?.jobTitle || "Membre VeillIA"}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed font-medium">
                    {article.summary || "Cet événement stratégique modifie le paysage concurentiel et offre des opportunités directes de valorisation et de rationalisation des processus IA."}
                  </p>
                </div>
              )}
            </section>

            {/* SECTION 6: Sources */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider">
                <Globe className="h-4 w-4" />
                <span>6. Sources & Références Officiellement Identifiées</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-4 border border-border text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-foreground">{article.source || "Source Vérifiée VeillIA"}</div>
                  <div className="text-muted-foreground">Publié le : {formatDate(article.published_at, language)}</div>
                </div>
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow hover:opacity-90 transition"
                  >
                    Consulter la source originale <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </section>

            {/* AI Q&A Assistant */}
            <div className="rounded-2xl border border-border bg-card shadow-card">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <HelpCircle className="h-4 w-4 text-primary" /> {t("analysis_ask_ai")}
                </h3>
                {!isAuthenticated && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                    <Lock className="h-3 w-3" /> {t("analysis_members_only")}
                  </span>
                )}
              </div>

              {!isAuthenticated ? (
                <div className="relative h-56 bg-background/50">
                  <div className="pointer-events-none select-none flex h-full flex-col justify-between p-4 blur-[2px]">
                    <div className="space-y-3">
                      <div className="max-w-[75%] rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
                        {t("analysis_chat_placeholder")}
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/65 text-center p-4">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                    <span className="mt-2 text-sm font-semibold text-foreground">{t("analysis_chat_sign_in")}</span>
                  </div>
                </div>
              ) : (
                <div className="flex h-80 flex-col bg-background/30">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2.5 max-w-[80%] ${m.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
                      >
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${m.sender === "user" ? "bg-gradient-brand text-primary-foreground" : "bg-muted text-foreground"}`}>
                          {m.sender === "user" ? <User className="h-3 w-3" /> : <Brain className="h-3 w-3 text-primary" />}
                        </div>
                        <div className={`rounded-2xl px-3.5 py-2 text-sm ${m.sender === "user" ? "bg-gradient-brand text-primary-foreground shadow-brand" : m.notFound ? "bg-destructive/5 border border-destructive/20 text-muted-foreground" : "bg-card border border-border text-foreground"}`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex gap-2.5 max-w-[80%]">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Brain className="h-3 w-3 text-primary animate-pulse" />
                        </div>
                        <div className="rounded-2xl bg-card border border-border px-3.5 py-2 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" /> {t("analysis_chat_loading")}
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleSendQuestion} className="border-t border-border bg-card p-3 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={chatLoading}
                      placeholder={t("analysis_chat_placeholder")}
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:border-ring disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="rounded-xl bg-gradient-brand p-2 text-primary-foreground shadow-brand hover:opacity-95 disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Right Rail */}
          <aside className="space-y-6">
            {/* Strategic Actions */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-sans">
                {t("analysis_strategic_actions")}
              </h3>

              {!isAuthenticated ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-gradient-brand p-4 text-center text-primary-foreground shadow-brand">
                    <Sparkles className="mx-auto h-5 w-5 text-accent animate-pulse" />
                    <h4 className="mt-2 text-sm font-bold">{t("analysis_unlock_title")}</h4>
                    <p className="mt-1 text-xs text-primary-foreground/90 leading-relaxed">
                      {t("analysis_unlock_desc")}
                    </p>
                    <Link
                      to="/auth/signup"
                      className="mt-3 block rounded-lg bg-background py-2 text-xs font-bold text-primary shadow hover:bg-card text-center"
                    >
                      {t("analysis_signup_cta")}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleSave}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition ${saved ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}
                  >
                    <span className="flex items-center gap-1.5">
                      {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                      {saved ? t("analysis_saved") : t("analysis_save")}
                    </span>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowWL(!showWL)}
                      className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                    >
                      <span className="flex items-center gap-1.5">
                        <Plus className="h-4 w-4" /> {t("analysis_add_watchlist")}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    {showWL && (
                      <div className="absolute right-0 top-full z-30 mt-1 w-full rounded-xl border border-border bg-popover p-2 shadow-card">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">{t("analysis_my_wl")}</div>
                        <div className="max-h-32 overflow-y-auto">
                          {lists.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">{t("analysis_no_wl")}</div>
                          )}
                          {lists.map((w) => (
                            <button
                              key={w.id}
                              onClick={() => handleAddToWatchlist(w.id, w.name)}
                              className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted text-foreground"
                            >
                              {w.name}
                            </button>
                          ))}
                        </div>
                        {creatingWL ? (
                          <div className="mt-1 border-t border-border pt-1.5 flex gap-1">
                            <input
                              value={newWLName}
                              onChange={(e) => setNewWLName(e.target.value)}
                              placeholder={t("analysis_wl_name_placeholder")}
                              className="flex-1 rounded border border-input bg-background px-1.5 py-1 text-[11px] outline-none"
                            />
                            <button onClick={handleCreateWatchlist} className="rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground font-bold">
                              {t("analysis_create_wl")}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCreatingWL(true)}
                            className="mt-1 w-full border-t border-border pt-1 px-2 py-1 text-left text-[11px] font-semibold text-primary hover:text-primary/80"
                          >
                            {t("analysis_new_wl")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAlert}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition ${alertCreated ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}
                  >
                    <span className="flex items-center gap-1.5">
                      {alertCreated ? <Check className="h-4 w-4 text-primary" /> : <Bell className="h-4 w-4" />}
                      {alertCreated ? t("analysis_alert_created") : t("analysis_alert")}
                    </span>
                  </button>

                  <button
                    onClick={handleAddToReport}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition ${inReport ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}
                  >
                    <span className="flex items-center gap-1.5">
                      {inReport ? <Check className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4" />}
                      {inReport ? t("analysis_added_report") : t("analysis_add_report")}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Related Articles */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-sans">
                {t("analysis_related")}
              </h3>
              <div className="space-y-3">
                {relatedArticles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("analysis_no_related")}</p>
                ) : (
                  relatedArticles.map((rel) => (
                    <div key={rel.id} className="group relative block rounded-xl border border-border bg-background p-3 transition hover:border-accent/40">
                      <div className="text-[10px] font-bold text-accent uppercase">{rel.category}</div>
                      <h4 className="mt-1 text-xs font-semibold leading-snug group-hover:text-primary transition line-clamp-2">
                        <Link to="/analyses/$id" params={{ id: String(rel.id) }}>
                          {rel.title}
                        </Link>
                      </h4>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{rel.source}</span>
                        <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {t("analysis_min_read")}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}
