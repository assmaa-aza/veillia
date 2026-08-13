import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Edit3,
  RefreshCw,
  Sparkles,
  Share2,
  Linkedin,
  Instagram,
  FileText,
  Clock,
  Filter,
  Check,
  Send,
  Loader2,
  AlertCircle,
  Eye,
  ImageIcon,
  Save,
  Plus,
  ArrowRight,
  ExternalLink,
  Link2,
  Globe,
  Copy,
  Settings
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import {
  getAdminArticles,
  updateArticle,
  updateArticleStatus,
  getSocialPublications,
  generateSocialPublication,
  updateSocialPublication,
  updateSocialPublicationStatus,
  regeneratePublication,
  generateAiImage,
  type AdminArticle,
  type SocialPublication,
  type PublicationPlatform,
  type PublicationStatus
} from "@/lib/api";
import { getArticleImage } from "@/lib/article-image";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "VeillIA — Administration & Validation" },
      { name: "description", content: "Espace d'administration VeillIA : validation des articles et gestion des publications réseaux sociaux." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"articles" | "publications">("articles");

  // --- Articles State ---
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [articleFilter, setArticleFilter] = useState<string>("all"); // 'all', 'a_valider', 'valide', 'refuse'
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [editingArticle, setEditingArticle] = useState<AdminArticle | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | string | null>(null);

  // --- Publications State ---
  const [publications, setPublications] = useState<SocialPublication[]>([]);
  const [pubPlatformFilter, setPubPlatformFilter] = useState<string>("all"); // 'all', 'linkedin', 'instagram'
  const [pubStatusFilter, setPubStatusFilter] = useState<string>("all"); // 'all', 'a_valider', 'valide', 'publie', 'refuse'
  const [loadingPublications, setLoadingPublications] = useState(true);
  const [editingPub, setEditingPub] = useState<SocialPublication | null>(null);

  // --- Generation & Multilingual State ---
  const [selectedGenLang, setSelectedGenLang] = useState<string>("Français");
  const [generatingForArticleId, setGeneratingForArticleId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // --- Official Social Media Accounts Links State ---
  const [officialLinkedin, setOfficialLinkedin] = useState<string>(() => {
    if (typeof window === "undefined") return "https://www.linkedin.com/in/veillia-system-714815428/";
    try {
      const saved = localStorage.getItem("veillia_admin_linkedin");
      if (!saved || saved.includes("company/veillia")) {
        return "https://www.linkedin.com/in/veillia-system-714815428/";
      }
      return saved;
    } catch {
      return "https://www.linkedin.com/in/veillia-system-714815428/";
    }
  });
  const [officialInstagram, setOfficialInstagram] = useState<string>(() => {
    if (typeof window === "undefined") return "https://www.instagram.com/veillia__official/";
    try {
      const saved = localStorage.getItem("veillia_admin_instagram");
      if (!saved || saved.includes("veillia_ai")) {
        return "https://www.instagram.com/veillia__official/";
      }
      return saved;
    } catch {
      return "https://www.instagram.com/veillia__official/";
    }
  });
  const [showSocialAccountsConfig, setShowSocialAccountsConfig] = useState(false);

  const LANGUAGES = [
    { id: "Français", label: "Français", flag: "🇫🇷" },
    { id: "English", label: "English", flag: "🇬🇧" },
    { id: "العربية", label: "العربية", flag: "🇸🇦" },
    { id: "Darija", label: "Darija (دارجة)", flag: "🇲🇦" },
  ];

  const handleSaveSocialAccounts = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("veillia_admin_linkedin", officialLinkedin);
      localStorage.setItem("veillia_admin_instagram", officialInstagram);
    }
    showToast("Liens des comptes officiels sauvegardés !");
    setShowSocialAccountsConfig(false);
  };

  const handlePublishToSocialPage = (pub: SocialPublication) => {
    const isLinkedin = pub.platform === "linkedin";
    const targetUrl = isLinkedin ? officialLinkedin : officialInstagram;

    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pub.content);
      showToast(`Texte copié dans le presse-papier ! Redirection vers ${isLinkedin ? "LinkedIn" : "Instagram"}...`);
    } else {
      showToast(`Redirection vers ${isLinkedin ? "LinkedIn" : "Instagram"}...`);
    }

    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank");
    }
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Articles
  const fetchArticles = () => {
    setLoadingArticles(true);
    getAdminArticles(articleFilter === "all" ? undefined : articleFilter)
      .then((data) => {
        setArticles(data);
        setLoadingArticles(false);
      })
      .catch((err) => {
        console.error("Erreur chargement articles:", err);
        setLoadingArticles(false);
      });
  };

  // Fetch Publications
  const fetchPublications = () => {
    setLoadingPublications(true);
    getSocialPublications(
      pubPlatformFilter === "all" ? undefined : pubPlatformFilter,
      pubStatusFilter === "all" ? undefined : pubStatusFilter
    )
      .then((data) => {
        setPublications(data);
        setLoadingPublications(false);
      })
      .catch((err) => {
        console.error("Erreur chargement publications:", err);
        setLoadingPublications(false);
      });
  };

  useEffect(() => {
    fetchArticles();
  }, [articleFilter]);

  useEffect(() => {
    fetchPublications();
  }, [pubPlatformFilter, pubStatusFilter]);

  // --- Article Actions ---
  const handleArticleStatusChange = async (articleId: number, newStatus: "a_valider" | "valide" | "refuse") => {
    setActionLoadingId(articleId);
    try {
      // Find the article in local state to grab any pending edits
      const art = articles.find((a) => a.id === articleId);
      if (art && newStatus === "valide") {
        // Save category, summary, content, image changes alongside validation
        await updateArticle(articleId, {
          title: art.title,
          summary: art.summary,
          category: art.category,
          source: art.source,
          image_url: art.image_url,
          content: art.content,
        });
      }
      await updateArticleStatus(articleId, newStatus);
      showToast(
        newStatus === "valide"
          ? "Article validé et publié sur le site avec les modifications !"
          : newStatus === "refuse"
          ? "Article refusé."
          : "Article repassé en attente de validation."
      );
      fetchArticles();
    } catch (err) {
      showToast("Erreur lors de la mise à jour de l'article", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveArticleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;
    setActionLoadingId(editingArticle.id);
    try {
      await updateArticle(editingArticle.id, {
        title: editingArticle.title,
        summary: editingArticle.summary,
        category: editingArticle.category,
        source: editingArticle.source,
        image_url: editingArticle.image_url,
        content: editingArticle.content,
      });
      showToast("Modifications de l'article enregistrées !");
      setEditingArticle(null);
      fetchArticles();
    } catch (err) {
      showToast("Erreur lors de l'enregistrement de l'article", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- Social Publication Generation ---
  const handleGeneratePublication = async (articleId: number, platform: PublicationPlatform, lang: string = selectedGenLang) => {
    setGeneratingForArticleId(articleId);
    try {
      const newPub = await generateSocialPublication(articleId, platform, lang);
      showToast(`Publication ${platform === "linkedin" ? "LinkedIn" : "Instagram"} (${lang}) générée avec succès !`);
      setActiveTab("publications");
      fetchPublications();
    } catch (err) {
      showToast("Erreur lors de la génération de la publication", "error");
    } finally {
      setGeneratingForArticleId(null);
    }
  };

  // --- Publication Actions ---
  const handlePublicationStatusChange = async (pubId: string, status: PublicationStatus) => {
    setActionLoadingId(pubId);
    try {
      // When marking as published, copy text and open social platform
      if (status === "publie") {
        const pub = publications.find((p) => p.id === pubId);
        if (pub) {
          handlePublishToSocialPage(pub);
        }
      }

      await updateSocialPublicationStatus(pubId, status);
      const label =
        status === "valide"
          ? "Publication validée !"
          : status === "publie"
          ? "Publication marquée comme PUBLIÉE ! N'oubliez pas de coller le texte sur la plateforme."
          : status === "refuse"
          ? "Publication refusée."
          : "Statut mis à jour.";
      showToast(label);
      fetchPublications();
    } catch (err) {
      showToast("Erreur lors du changement de statut", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSavePubEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPub) return;
    setActionLoadingId(editingPub.id);
    try {
      await updateSocialPublication(editingPub.id, {
        content: editingPub.content,
        image_url: editingPub.image_url,
        publication_url: editingPub.publication_url || undefined,
        language: editingPub.language || undefined,
      });
      showToast("Modifications de la publication enregistrées !");
      setEditingPub(null);
      fetchPublications();
    } catch (err) {
      showToast("Erreur lors de l'enregistrement de la publication", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRegeneratePub = async (pubId: string, target: "content" | "image" | "both", lang?: string) => {
    setActionLoadingId(pubId);
    try {
      await regeneratePublication(pubId, target, lang || selectedGenLang);
      showToast(
        target === "image"
          ? "Image IA régénérée !"
          : target === "content"
          ? "Texte régénéré !"
          : "Publication régénérée !"
      );
      fetchPublications();
    } catch (err) {
      showToast("Erreur lors de la régénération", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Stats Counters
  const pendingArticlesCount = articles.filter((a) => (a.status || "valide") === "a_valider").length;
  const pendingPubsCount = publications.filter((p) => p.status === "a_valider").length;
  const validatedPubsCount = publications.filter((p) => p.status === "valide").length;
  const publishedCount = publications.filter((p) => p.status === "publie").length;

  return (
    <SiteLayout>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-brand transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {toastMessage.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="border-b border-border bg-card/60 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                  Espace Modération
                </span>
                <span className="text-xs text-muted-foreground">VeillIA Admin</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Tableau de bord Administrateur
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Validation des articles scientifiques & modération des publications réseaux sociaux.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <div className="rounded-xl border border-border bg-card p-3 text-center sm:w-28">
                <div className="text-xs text-muted-foreground font-medium">Articles pending</div>
                <div className="text-xl font-bold text-amber-500">{pendingArticlesCount}</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 text-center sm:w-28">
                <div className="text-xs text-muted-foreground font-medium">Pubs à valider</div>
                <div className="text-xl font-bold text-primary">{pendingPubsCount}</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 text-center sm:w-28">
                <div className="text-xs text-muted-foreground font-medium">Publiées</div>
                <div className="text-xl font-bold text-emerald-500">{publishedCount}</div>
              </div>
            </div>
          </div>

          {/* MAIN TABS SWITCHER */}
          <div className="mt-8 flex border-b border-border">
            <button
              onClick={() => setActiveTab("articles")}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
                activeTab === "articles"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Articles à valider</span>
              {pendingArticlesCount > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  {pendingArticlesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("publications")}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
                activeTab === "publications"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Share2 className="h-4 w-4" />
              <span>Publications à valider</span>
              {pendingPubsCount > 0 && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                  {pendingPubsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ================= SECTION 1: ARTICLES A VALIDER ================= */}
        {activeTab === "articles" && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Filtrer par statut :</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "Tous" },
                  { id: "a_valider", label: "À valider" },
                  { id: "valide", label: "Validés" },
                  { id: "refuse", label: "Refusés" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setArticleFilter(f.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      articleFilter === f.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Articles List */}
            {loadingArticles ? (
              <div className="py-16 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm">Chargement des articles en base de données...</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                Aucun article trouvé dans cette catégorie.
              </div>
            ) : (
              <div className="grid gap-4">
                {articles.map((art) => {
                  const artStatus = art.status || "valide";
                  const artImg = art.image_url || getArticleImage(art);
                  const isGenerating = generatingForArticleId === art.id;

                  return (
                    <div
                      key={art.id}
                      className="group flex flex-col sm:flex-row gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/40"
                    >
                      {/* Image Thumbnail */}
                      <div className="h-32 w-full sm:w-44 shrink-0 overflow-hidden rounded-xl bg-muted relative">
                        <img
                          src={artImg}
                          alt={art.title}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        <span className="absolute top-2 left-2 rounded-md bg-background/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-primary border border-border">
                          {art.category || "General"}
                        </span>
                      </div>

                      {/* Content Info */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {art.source || "VeillIA Source"} • {art.published_at ? new Date(art.published_at).toLocaleDateString("fr-FR") : "Récent"}
                            </span>

                            {/* Status Badge */}
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                artStatus === "valide"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : artStatus === "refuse"
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {artStatus === "valide" && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {artStatus === "refuse" && <XCircle className="h-3.5 w-3.5" />}
                              {artStatus === "a_valider" && <Clock className="h-3.5 w-3.5" />}
                              {artStatus === "valide" ? "Validé & Publié" : artStatus === "refuse" ? "Refusé" : "À valider"}
                            </span>
                          </div>

                          <h3 className="mt-2 text-base font-bold leading-snug text-foreground">
                            {art.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                            {art.summary || art.content || "Aucun résumé disponible."}
                          </p>
                        </div>

                        {/* Card Actions Toolbar */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/70">
                          {/* Left: Modify & View */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingArticle(art)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Modifier
                            </button>
                            <Link
                              to="/analyses/$id"
                              params={{ id: String(art.id) }}
                              target="_blank"
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                            >
                              <Eye className="h-3.5 w-3.5" /> Voir l'article
                            </Link>
                          </div>

                          {/* Right: Validation & Social Generation */}
                          <div className="flex flex-wrap items-center gap-2">
                            {artStatus !== "valide" && (
                              <button
                                onClick={() => handleArticleStatusChange(art.id, "valide")}
                                disabled={actionLoadingId === art.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                              >
                                {actionLoadingId === art.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                Valider
                              </button>
                            )}

                            {artStatus !== "refuse" && (
                              <button
                                onClick={() => handleArticleStatusChange(art.id, "refuse")}
                                disabled={actionLoadingId === art.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 disabled:opacity-50"
                              >
                                Refuser
                              </button>
                            )}

                            {/* Social Post Generation Buttons for LinkedIn / Instagram with Language Selector */}
                            <div className="flex flex-wrap items-center gap-1.5 border-l border-border pl-2">
                              <div className="flex items-center gap-1 bg-muted/70 border border-border/80 rounded-lg px-2 py-1" title="Choisir la langue de génération">
                                <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                                <select
                                  value={selectedGenLang}
                                  onChange={(e) => setSelectedGenLang(e.target.value)}
                                  className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer"
                                >
                                  {LANGUAGES.map((l) => (
                                    <option key={l.id} value={l.id}>
                                      {l.flag} {l.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <button
                                onClick={() => handleGeneratePublication(art.id, "linkedin", selectedGenLang)}
                                disabled={isGenerating}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#0A66C2] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                title={`Générer un post LinkedIn en ${selectedGenLang}`}
                              >
                                {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Linkedin className="h-3.5 w-3.5" />}
                                LinkedIn
                              </button>
                              <button
                                onClick={() => handleGeneratePublication(art.id, "instagram", selectedGenLang)}
                                disabled={isGenerating}
                                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                title={`Générer une légende Instagram en ${selectedGenLang}`}
                              >
                                {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Instagram className="h-3.5 w-3.5" />}
                                Instagram
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION 2: PUBLICATIONS A VALIDER ================= */}
        {activeTab === "publications" && (
          <div className="space-y-6">
            {/* Official Social Media Accounts Banner */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-xl bg-primary/10 p-2 text-primary border border-primary/20">
                    <Share2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      Comptes Officiels VeillIA
                    </h4>
                    <p className="text-xs text-muted-foreground">Raccourcis directs vers les pages officielles de l'organisation pour publier</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={officialLinkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A66C2]/15 text-[#0A66C2] px-3.5 py-1.5 text-xs font-bold hover:bg-[#0A66C2]/25 border border-[#0A66C2]/30 transition shadow-sm"
                  >
                    <Linkedin className="h-3.5 w-3.5" /> Page LinkedIn Officielle <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={officialInstagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400 px-3.5 py-1.5 text-xs font-bold hover:bg-pink-500/25 border border-pink-500/30 transition shadow-sm"
                  >
                    <Instagram className="h-3.5 w-3.5" /> Profil Instagram Officiel <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    onClick={() => setShowSocialAccountsConfig(!showSocialAccountsConfig)}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Settings className="h-3.5 w-3.5" /> Configurer les liens
                  </button>
                </div>
              </div>

              {/* Collapsible Accounts Link Settings Form */}
              {showSocialAccountsConfig && (
                <form onSubmit={handleSaveSocialAccounts} className="mt-4 pt-4 border-t border-border grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground">URL Compte / Page LinkedIn Officielle</label>
                    <input
                      type="url"
                      value={officialLinkedin}
                      onChange={(e) => setOfficialLinkedin(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      placeholder="https://www.linkedin.com/in/veillia-system-714815428/"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground">URL Compte / Profil Instagram Officiel</label>
                    <input
                      type="url"
                      value={officialInstagram}
                      onChange={(e) => setOfficialInstagram(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      placeholder="https://www.instagram.com/veillia__official/"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-brand hover:opacity-95"
                    >
                      <Save className="h-3.5 w-3.5" /> Enregistrer les liens des comptes
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
              {/* Platform Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Plateforme :</span>
                <div className="flex gap-1.5">
                  {[
                    { id: "all", label: "Toutes" },
                    { id: "linkedin", label: "LinkedIn", icon: Linkedin },
                    { id: "instagram", label: "Instagram", icon: Instagram },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPubPlatformFilter(p.id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        pubPlatformFilter === p.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {p.icon && <p.icon className="h-3.5 w-3.5" />}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Statut :</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "all", label: "Tous" },
                    { id: "a_valider", label: "À valider" },
                    { id: "valide", label: "Validés" },
                    { id: "publie", label: "Publiés" },
                    { id: "refuse", label: "Refusés" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setPubStatusFilter(s.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        pubStatusFilter === s.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Publications List */}
            {loadingPublications ? (
              <div className="py-16 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm">Chargement des publications réseaux sociaux...</p>
              </div>
            ) : publications.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                Aucune publication réseaux sociaux trouvée. Vous pouvez générer un post à partir des articles à valider.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {publications.map((pub) => {
                  const isLinkedin = pub.platform === "linkedin";
                  const statusLabel =
                    pub.status === "valide"
                      ? "Validé"
                      : pub.status === "publie"
                      ? "Publié"
                      : pub.status === "refuse"
                      ? "Refusé"
                      : "À valider";

                  return (
                    <div
                      key={pub.id}
                      className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card transition hover:border-primary/40"
                    >
                      <div>
                        {/* Post Platform, Language & Status Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white ${
                                isLinkedin
                                  ? "bg-[#0A66C2]"
                                  : "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500"
                              }`}
                            >
                              {isLinkedin ? <Linkedin className="h-3.5 w-3.5" /> : <Instagram className="h-3.5 w-3.5" />}
                              {isLinkedin ? "LinkedIn Post" : "Instagram Caption"}
                            </span>

                            {/* Language Badge */}
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/80 px-2.5 py-0.5 text-xs font-bold text-foreground">
                              <Globe className="h-3 w-3 text-primary" />
                              {pub.language || "Français"}
                            </span>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              pub.status === "publie"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : pub.status === "valide"
                                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                : pub.status === "refuse"
                                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        {/* Article Reference */}
                        {pub.article_title && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            Article associé : <span className="font-semibold text-foreground">{pub.article_title}</span>
                          </div>
                        )}

                        {/* AI Generated Post Image Preview */}
                        {pub.image_url && (
                          <div className="mt-3 overflow-hidden rounded-xl bg-muted border border-border h-48 w-full relative">
                            <img
                              src={pub.image_url}
                              alt="Visuel IA généré"
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur">
                              <Sparkles className="h-3 w-3 text-accent" /> Visuel IA Généré
                            </span>
                          </div>
                        )}

                        {/* Generated Content Body */}
                        <div className="mt-4 rounded-xl border border-border/80 bg-muted/40 p-4">
                          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">
                            {pub.content}
                          </pre>
                        </div>

                        {/* Publication URL (if published) */}
                        {pub.publication_url && (
                          <div className="mt-3 flex items-center gap-2">
                            <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            <a
                              href={pub.publication_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline truncate"
                            >
                              {pub.publication_url}
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </div>
                        )}
                        {!pub.publication_url && pub.status === "publie" && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>Lien de publication non renseigné — cliquez Éditer pour l'ajouter</span>
                          </div>
                        )}
                      </div>

                      {/* Publication Actions Toolbar */}
                      <div className="mt-5 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
                        {/* Edit & Regenerate & Quick Publish Link */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setEditingPub(pub)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Éditer
                          </button>

                          <button
                            onClick={() => handleRegeneratePub(pub.id, "both")}
                            disabled={actionLoadingId === pub.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                            title="Regénérer le texte et l'image IA"
                          >
                            {actionLoadingId === pub.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 text-primary" />
                            )}
                            Regénérer
                          </button>

                          <button
                            onClick={() => handlePublishToSocialPage(pub)}
                            className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
                            title="Copier le texte et ouvrir le compte officiel"
                          >
                            <Copy className="h-3.5 w-3.5" /> Poster sur {isLinkedin ? "LinkedIn" : "Instagram"}
                          </button>
                        </div>

                        {/* Status Change Buttons */}
                        <div className="flex items-center gap-1.5">
                          {pub.status !== "valide" && pub.status !== "publie" && (
                            <button
                              onClick={() => handlePublicationStatusChange(pub.id, "valide")}
                              disabled={actionLoadingId === pub.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                            >
                              Valider
                            </button>
                          )}

                          {pub.status !== "publie" && (
                            <button
                              onClick={() => handlePublicationStatusChange(pub.id, "publie")}
                              disabled={actionLoadingId === pub.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                            >
                              <Send className="h-3.5 w-3.5" /> Publier
                            </button>
                          )}

                          {pub.status !== "refuse" && (
                            <button
                              onClick={() => handlePublicationStatusChange(pub.id, "refuse")}
                              disabled={actionLoadingId === pub.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 disabled:opacity-50"
                            >
                              Refuser
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* EDIT ARTICLE MODAL */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-brand my-8">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" /> Modifier l'article #{editingArticle.id}
            </h3>

            <form onSubmit={handleSaveArticleEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground">Titre de l'article</label>
                <input
                  type="text"
                  value={editingArticle.title}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">Catégorie</label>
                <input
                  type="text"
                  value={editingArticle.category || ""}
                  onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">Résumé IA</label>
                <textarea
                  rows={4}
                  value={editingArticle.summary || ""}
                  onChange={(e) => setEditingArticle({ ...editingArticle, summary: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Analyse / Contenu détaillé</span>
                </label>
                <textarea
                  rows={5}
                  value={editingArticle.content || ""}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  placeholder="Contenu de l'analyse approfondie (Section 4 de la page article)..."
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">URL de l'image</label>
                <input
                  type="text"
                  value={editingArticle.image_url || ""}
                  onChange={(e) => setEditingArticle({ ...editingArticle, image_url: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingArticle(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === editingArticle.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-brand hover:opacity-95 disabled:opacity-50"
                >
                  {actionLoadingId === editingArticle.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PUBLICATION MODAL */}
      {editingPub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-brand">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" /> Modifier la publication {editingPub.platform}
            </h3>

            <form onSubmit={handleSavePubEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground">Texte de la publication</label>
                <textarea
                  rows={6}
                  value={editingPub.content}
                  onChange={(e) => setEditingPub({ ...editingPub, content: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">URL du visuel / image IA</label>
                <input
                  type="text"
                  value={editingPub.image_url || ""}
                  onChange={(e) => setEditingPub({ ...editingPub, image_url: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
                    Lien de la publication {editingPub.platform === "linkedin" ? "LinkedIn" : "Instagram"}
                  </span>
                </label>
                <input
                  type="url"
                  value={editingPub.publication_url || ""}
                  onChange={(e) => setEditingPub({ ...editingPub, publication_url: e.target.value })}
                  placeholder={editingPub.platform === "linkedin" ? "https://www.linkedin.com/posts/..." : "https://www.instagram.com/p/..."}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-primary" /> Langue de la publication</span>
                </label>
                <select
                  value={editingPub.language || "Français"}
                  onChange={(e) => setEditingPub({ ...editingPub, language: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary cursor-pointer"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingPub(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === editingPub.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-brand hover:opacity-95 disabled:opacity-50"
                >
                  {actionLoadingId === editingPub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SiteLayout>
  );
}
