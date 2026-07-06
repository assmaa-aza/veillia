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
  AlertTriangle,
  HelpCircle,
  Cpu,
  Shield,
  Building,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useWatchlists } from "@/hooks/use-watchlists";
import { toast } from "sonner";

export const Route = createFileRoute("/analyses/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${decodeURIComponent(params.id)} — Analyse VeillIA` },
      { name: "description", content: "Analyse stratégique détaillée par l'intelligence artificielle." },
    ],
  }),
  component: AnalysisPage,
});

// Rich mock database of analyses
const ARTICLE_ANALYSES: Record<
  string,
  {
    title: string;
    tag: string;
    source: string;
    date: string;
    readTime: number;
    importance: number;
    sentiment: "Positif" | "Neutre" | "Négatif";
    risk: "Faible" | "Moyen" | "Élevé" | "Critique";
    summary: string;
    fullContent: string;
    whyItMatters: Record<string, string>; // Tailored for student, engineer, entrepreneur, etc.
    whyRecommended: string;
    takeaways: string[];
    qaReplies: { question: string; answer: string }[];
    defaultReply: string;
  }
> = {
  "gpt-5": {
    title: "OpenAI annonce GPT-5 Turbo avec contexte 2M tokens",
    tag: "IA Générative",
    source: "OpenAI Blog",
    date: "Il y a 1h",
    readTime: 4,
    importance: 96,
    sentiment: "Positif",
    risk: "Faible",
    summary: "Refonte de l'architecture, latence divisée par 3, tarifs API en baisse de 40%. Mise en production immédiate de ce modèle fondamental.",
    fullContent: "La nouvelle architecture hybride de GPT-5 Turbo combine un décodage à faible latence et un système d'attention optimisé, permettant de supporter des contextes massifs allant jusqu'à 2 millions de tokens sans dégradation de performance. Les prix des tokens d'entrée baissent de 40%, tandis que les tokens de sortie baissent de 45%, posant une pression concurrentielle sans précédent sur les modèles de taille moyenne d'Anthropic et Google. Le modèle s'intègre nativement avec les standards MCP (Model Context Protocol) pour une interaction fluide avec les environnements locaux.",
    whyItMatters: {
      "Ingénieur": "Cette baisse de prix de 40% et la latence divisée par 3 rendent viables des architectures multi-agents complexes et l'analyse de codebases entiers directement en mémoire contextuelle.",
      "Entrepreneur": "Vos coûts opérationnels d'API vont être divisés par deux, libérant de la marge pour vos fonctionnalités à valeur ajoutée ou vous permettant d'attaquer des segments à fort volume de tokens.",
      "Investisseur": "Cela renforce la position de monopole d'OpenAI et exerce une pression immense sur les startups de LLM propriétaires. L'avantage se déplace vers les couches d'application et de tooling.",
      "Responsable innovation": "Une opportunité immédiate de revoir vos POCs d'IA internes : les tâches qui nécessitaient des pipelines RAG complexes peuvent désormais être traitées par simple injection contextuelle.",
      "Student": "C'est le moment d'étudier les nouvelles architectures d'agents autonomes rendues possibles par ce modèle de 2M tokens contextuels.",
      "default": "Cette mise à jour redéfinit le coût de l'inférence IA et élargit considérablement le champ d'application des technologies génératives dans vos tâches courantes."
    },
    whyRecommended: "Tracké via vos mots-clés suivis 'OpenAI' et vos intérêts en 'IA Générative'.",
    takeaways: [
      "Coût d'inférence en baisse de 40% restructurant les business plans LLM.",
      "Contexte de 2M tokens permettant le traitement de livres ou corpus de code entiers.",
      "Standardisation autour des protocoles MCP pour agents autonomes."
    ],
    qaReplies: [
      {
        question: "Qu'est-ce que cela change pour le RAG ?",
        answer: "Avec 2M de tokens, le RAG (Retrieval-Augmented Generation) reste pertinent pour les très grandes bases documentaires (>10 Go), mais pour les dossiers de taille moyenne (manuels, rapports annuels, codebases), vous pouvez injecter directement la donnée brute dans le contexte, éliminant les étapes de chunking et d'indexation vectorielle."
      },
      {
        question: "Les prix sont-ils stables ?",
        answer: "Oui, OpenAI applique cette tarification immédiatement sur l'API publique. C'est une baisse durable visant à dissuader les développeurs de migrer vers des modèles Open Source comme Llama 3."
      }
    ],
    defaultReply: "Ce modèle GPT-5 Turbo offre des opportunités majeures pour le traitement de volumes textuels denses et les processus multi-agents avec une latence ultra-faible."
  },
  "mistral": {
    title: "Mistral AI lève 600M€ — valorisation 6Mds",
    tag: "Startups",
    source: "Les Echos",
    date: "Il y a 22 min",
    readTime: 3,
    importance: 92,
    sentiment: "Positif",
    risk: "Faible",
    summary: "Levée de fonds record pour le champion européen de l'IA souveraine. Cette enveloppe servira à l'extension des infrastructures de calcul et à l'embauche de chercheurs de classe mondiale.",
    fullContent: "Mistral AI consolide sa position de leader européen avec une levée de 600 millions d'euros menée par des investisseurs internationaux et soutenue par des acteurs stratégiques européens. Cette valorisation à 6 milliards d'euros reflète la confiance du marché dans leur stratégie open-weight et leur positionnement axé sur la souveraineté des données et l'efficacité de calcul (modèles frugaux).",
    whyItMatters: {
      "Investisseur": "Une validation de la thèse selon laquelle des géants non-américains peuvent émerger sur le hardware et l'IA de fondation en se focalisant sur le marché B2B souverain.",
      "Entrepreneur": "Renforcement des garanties de pérennité des modèles Mistral, vous assurant une alternative solide et hébergée en Europe face aux fournisseurs américains.",
      "Ingénieur": "De nouveaux modèles très performants vont être entraînés et rendus open-source/open-weight prochainement. Attendez-vous à des modèles spécialisés pour le codage et le raisonnement logique.",
      "Responsable innovation": "Cela sécurise votre stratégie de déploiement d'IA sur site (on-premise) en vous appuyant sur des modèles européens fiables à long terme.",
      "default": "Cette levée majeure ancre l'écosystème IA européen et garantit une alternative compétitive à l'offre américaine."
    },
    whyRecommended: "Match avec votre watchlist Entreprises ('Mistral AI') et vos intérêts pour le 'Souveraineté' et 'Startups'.",
    takeaways: [
      "Extension des capacités de calcul de Mistral AI en Europe.",
      "Valorisation record de 6 milliards d'euros montrant la robustesse du secteur.",
      "Pérennité assurée pour les alternatives IA souveraines."
    ],
    qaReplies: [
      {
        question: "Quels sont les investisseurs majeurs ?",
        answer: "Le tour de table a été mené par General Catalyst avec la participation d'investisseurs historiques comme Lightspeed Venture Partners, ainsi que de partenaires industriels européens."
      },
      {
        question: "Les modèles resteront-ils open-source ?",
        answer: "Mistral maintient sa double approche : des modèles open-weight hautement compétitifs (Mistral-7B, Mixtral) et des modèles commerciaux plus larges via leur plateforme La Plateforme."
      }
    ],
    defaultReply: "Cette levée permet à Mistral d'investir massivement dans ses équipes de recherche et son infrastructure de calcul afin de concurrencer OpenAI."
  },
  "regulation": {
    title: "L'UE finalise les obligations d'audit pour modèles >70B paramètres",
    tag: "Régulation",
    source: "Commission Européenne",
    date: "Il y a 3h",
    readTime: 6,
    importance: 89,
    sentiment: "Neutre",
    risk: "Élevé",
    summary: "L'AI Act entre dans sa phase opérationnelle. Les modèles dépassant 70 milliards de paramètres seront soumis à des audits de sécurité indépendants et annuels dès 2027.",
    fullContent: "Les nouvelles directives imposent aux fournisseurs de modèles de fondation à usage général avec des capacités systémiques de déclarer leur consommation énergétique, de documenter leurs sources de données d'entraînement et de subir des tests d'évaluation des risques par des laboratoires tiers agréés. Tout manquement entraînera des amendes administratives substantielles.",
    whyItMatters: {
      "Responsable innovation": "Vous devez cartographier les LLM de taille supérieure à 70B intégrés dans vos outils afin de vous assurer de leur conformité d'ici fin 2026.",
      "Entrepreneur": "Vos fournisseurs de modèles vont devoir répercuter le coût de ces audits sur le prix des APIs. Prévoyez une légère hausse de tarification pour les modèles de pointe hébergés en Europe.",
      "Chercheur": "Cela restreint l'accès libre à certains checkpoints de modèles open-weight de grande taille, les labos devant valider la conformité avant publication.",
      "default": "Un cadre juridique strict qui augmente la conformité mais structure les responsabilités en cas d'incident IA."
    },
    whyRecommended: "Recommandé suite à la présence du tag 'AI Act' dans vos mots-clés surveillés.",
    takeaways: [
      "Audits annuels obligatoires dès 2027 pour les modèles >70B.",
      "Obligation de transparence sur les données d'entraînement (Copyright).",
      "Amendes allant jusqu'à 7% du chiffre d'affaires mondial."
    ],
    qaReplies: [
      {
        question: "Quels modèles sont concernés aujourd'hui ?",
        answer: "Les modèles comme Llama 3 70B/400B, Claude 3 Opus, et GPT-4 entrent directement sous cette réglementation."
      }
    ],
    defaultReply: "Ce cadre réglementaire vise à prévenir les risques systémiques tout en imposant de nouvelles normes de conformité."
  }
};

export function AnalysisPage() {
  const params = Route.useParams();
  const decodedId = decodeURIComponent(params.id).toLowerCase();
  const { isAuthenticated, user } = useAuth();
  const { lists, addItem, create } = useWatchlists();

  // Find corresponding mock analysis or fallback
  const analysisKey = Object.keys(ARTICLE_ANALYSES).find((k) =>
    decodedId.includes(k) || ARTICLE_ANALYSES[k].title.toLowerCase().includes(decodedId)
  ) || "gpt-5";

  const analysis = ARTICLE_ANALYSES[analysisKey];

  // Action states
  const [saved, setSaved] = useState(false);
  const [alertCreated, setAlertCreated] = useState(false);
  const [inReport, setInReport] = useState(false);
  const [showWL, setShowWL] = useState(false);
  const [creatingWL, setCreatingWL] = useState(false);
  const [newWLName, setNewWLName] = useState("");

  // Q&A Chat states
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([
    {
      sender: "ai",
      text: `Bonjour ${isAuthenticated ? user?.name : "Visiteur"}. Je suis l'assistant IA VeillIA. Posez-moi vos questions stratégiques concernant cet article.`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Actions
  const handleSave = () => {
    setSaved(!saved);
    toast.success(saved ? "Article retiré des favoris" : "Article enregistré dans vos favoris");
  };

  const handleAlert = () => {
    setAlertCreated(!alertCreated);
    toast.success(alertCreated ? "Alerte désactivée" : "Alerte configurée en temps réel pour ce sujet");
  };

  const handleAddToReport = () => {
    setInReport(!inReport);
    toast.success(inReport ? "Retiré du rapport IA" : "Ajouté à votre note de synthèse IA");
  };

  const handleAddToWatchlist = (wlId: string, wlName: string) => {
    addItem(wlId, analysis.title);
    setShowWL(false);
    toast.success(`Article ajouté à la watchlist "${wlName}"`);
  };

  const handleCreateWatchlist = () => {
    const name = newWLName.trim();
    if (!name) return;
    create(name, "keywords");
    setCreatingWL(false);
    setNewWLName("");
    toast.success(`Watchlist "${name}" créée avec succès`);
  };

  const handleSendQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");

    // Simulate AI thinking and replying
    setTimeout(() => {
      const match = analysis.qaReplies.find(
        (qa) =>
          userText.toLowerCase().includes(qa.question.toLowerCase()) ||
          qa.question.toLowerCase().includes(userText.toLowerCase())
      );
      const replyText = match ? match.answer : analysis.defaultReply;
      setMessages((prev) => [...prev, { sender: "ai", text: replyText }]);
    }, 850);
  };

  // Get user role for customized content
  const userRole = user?.jobTitle || "default";
  const tailoredImpact = analysis.whyItMatters[userRole] || analysis.whyItMatters["default"];

  return (
    <SiteLayout>
      {/* Top Navigation */}
      <div className="border-b border-border bg-card/30 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to={isAuthenticated ? "/dashboard" : "/"}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <div className="inline-flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Source: <strong>{analysis.source}</strong></span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{analysis.date}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Article Title & Badges */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gradient-brand px-3 py-1 text-xs font-semibold text-primary-foreground shadow-brand">
              {analysis.tag}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-success/10 text-success`}>
              Score d'importance: {analysis.importance}/100
            </span>
            <span className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium">
              Sentiment: {analysis.sentiment}
            </span>
            <span className="rounded-md bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-0.5 text-xs font-semibold">
              Risque: {analysis.risk}
            </span>
          </div>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            {analysis.title}
          </h1>
        </div>

        {/* Layout Grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.8fr_1fr]">
          {/* Main Column */}
          <div className="space-y-8">
            {/* AI Summary */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Brain className="h-5 w-5 text-primary" /> Synthèse stratégique par l'IA
              </h2>
              <p className="mt-3 text-base leading-relaxed text-foreground font-medium">
                {analysis.summary}
              </p>
            </div>

            {/* Complete Content */}
            <div className="prose dark:prose-invert max-w-none">
              <h2 className="text-xl font-bold">Analyse détaillée</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground font-sans">
                {analysis.fullContent}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground font-sans">
                Cette analyse prend en compte le contexte concurrentiel de l'écosystème IA au Q3 2026. L'automatisation de la surveillance permet d'identifier l'accélération des cycles de développement et de documenter l'adoption de nouveaux frameworks de travail chez les acteurs clés du secteur.
              </p>
            </div>

            {/* Authenticated / Visitor split for why this matters */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Eye className="h-5 w-5 text-accent" /> Pourquoi c'est important pour vous
              </h2>

              {!isAuthenticated ? (
                // Visitor Locked View
                <div className="relative mt-4">
                  <div className="pointer-events-none select-none blur-xs">
                    <p className="text-sm text-muted-foreground">
                      Cette annonce modifie profondément les coûts d'intégration de votre framework actuel et vous oblige à réévaluer les contrats de licence SaaS que vous utilisez pour vos clients finaux dans le domaine de la technologie.
                    </p>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 text-center p-4">
                    <Lock className="h-6 w-6 text-muted-foreground animate-bounce" />
                    <span className="mt-2 text-xs font-semibold text-muted-foreground">Connectez-vous pour débloquer l'analyse d'impact personnalisée</span>
                  </div>
                </div>
              ) : (
                // Authenticated Unlocked View
                <div className="mt-3 rounded-xl bg-accent/5 p-4 border border-accent/20">
                  <div className="text-xs font-bold uppercase tracking-wider text-accent">Impact profil — {user?.jobTitle || "Membre"}</div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    {tailoredImpact}
                  </p>
                </div>
              )}
            </div>

            {/* AI Q&A Chat */}
            <div className="rounded-2xl border border-border bg-card shadow-card">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <HelpCircle className="h-4 w-4 text-primary" /> Poser des questions à l'IA
                </h3>
                {!isAuthenticated && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                    <Lock className="h-3 w-3" /> Membres uniquement
                  </span>
                )}
              </div>

              {!isAuthenticated ? (
                // Locked Chat Box for Visitors
                <div className="relative h-64 bg-background/50">
                  <div className="pointer-events-none select-none flex h-full flex-col justify-between p-4 blur-[2px]">
                    <div className="space-y-3">
                      <div className="max-w-[75%] rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
                        Quel est l'impact de cette annonce sur la souveraineté ?
                      </div>
                      <div className="ml-auto max-w-[75%] rounded-2xl bg-primary/10 p-3 text-xs text-primary">
                        L'impact principal réside dans l'autonomie d'hébergement...
                      </div>
                    </div>
                    <div className="flex gap-2 border-t border-border pt-2">
                      <div className="flex-1 rounded-xl bg-background px-3 py-2 text-xs text-muted-foreground/40">Écrivez votre question...</div>
                      <div className="rounded-xl bg-muted p-2 text-muted-foreground/30"><Send className="h-4 w-4" /></div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/65 text-center p-4">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                    <span className="mt-2 text-sm font-semibold text-foreground">Sign in to unlock</span>
                    <p className="mt-1 text-xs text-muted-foreground max-w-xs">Rejoignez VeillIA pour interroger l'IA en temps réel sur cet article.</p>
                  </div>
                </div>
              ) : (
                // Active Interactive Chat for Users
                <div className="flex h-80 flex-col bg-background/30">
                  {/* Message History */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2.5 max-w-[80%] ${m.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
                      >
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${m.sender === "user" ? "bg-gradient-brand text-primary-foreground" : "bg-muted text-foreground"}`}>
                          {m.sender === "user" ? <User className="h-3 w-3" /> : <Brain className="h-3 w-3 text-primary" />}
                        </div>
                        <div className={`rounded-2xl px-3.5 py-2 text-sm ${m.sender === "user" ? "bg-gradient-brand text-primary-foreground shadow-brand" : "bg-card border border-border text-foreground"}`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  {/* Chat Input */}
                  <form onSubmit={handleSendQuestion} className="border-t border-border bg-card p-3 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Demandez par exemple: 'Quel impact sur l'open source ?'"
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:border-ring"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-gradient-brand p-2 text-primary-foreground shadow-brand hover:opacity-95"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Right Rail (Actions & Recommendations) */}
          <aside className="space-y-6">
            {/* Authenticated Actions */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-sans">Actions stratégiques</h3>

              {!isAuthenticated ? (
                // Locked actions with CTA
                <div className="space-y-3">
                  <div className="space-y-2 pointer-events-none select-none blur-[1px]">
                    <div className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground bg-background">
                      <span>Favoris</span><Lock className="h-3 w-3" />
                    </div>
                    <div className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground bg-background">
                      <span>Ajouter à la watchlist</span><Lock className="h-3 w-3" />
                    </div>
                  </div>
                  {/* Public CTA Card */}
                  <div className="rounded-xl bg-gradient-brand p-4 text-center text-primary-foreground shadow-brand">
                    <Sparkles className="mx-auto h-5 w-5 text-accent animate-pulse" />
                    <h4 className="mt-2 text-sm font-bold">Débloquez VeillIA</h4>
                    <p className="mt-1 text-xs text-primary-foreground/90 leading-relaxed">
                      Créez un compte pour suivre ces sujets, recevoir des alertes par e-mail et exporter des rapports IA.
                    </p>
                    <Link
                      to="/auth/signup"
                      className="mt-3 block rounded-lg bg-background py-2 text-xs font-bold text-primary shadow hover:bg-card text-center"
                    >
                      S'inscrire gratuitement
                    </Link>
                  </div>
                </div>
              ) : (
                // Active Actions
                <div className="space-y-2">
                  <button
                    onClick={handleSave}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition ${saved ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}
                  >
                    <span className="flex items-center gap-1.5">
                      {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                      {saved ? "Sauvegardé" : "Enregistrer dans mes favoris"}
                    </span>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowWL(!showWL)}
                      className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                    >
                      <span className="flex items-center gap-1.5">
                        <Plus className="h-4 w-4" /> Ajouter à une watchlist
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    {showWL && (
                      <div className="absolute right-0 top-full z-30 mt-1 w-full rounded-xl border border-border bg-popover p-2 shadow-card">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">Mes watchlists</div>
                        <div className="max-h-32 overflow-y-auto">
                          {lists.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">Aucune watchlist active.</div>
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
                              placeholder="Nom..."
                              className="flex-1 rounded border border-input bg-background px-1.5 py-1 text-[11px] outline-none"
                            />
                            <button onClick={handleCreateWatchlist} className="rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground font-bold">Créer</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCreatingWL(true)}
                            className="mt-1 w-full border-t border-border pt-1 px-2 py-1 text-left text-[11px] font-semibold text-primary hover:text-primary/80"
                          >
                            + Nouvelle watchlist
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
                      Alerte sur ce sujet
                    </span>
                  </button>

                  <button
                    onClick={handleAddToReport}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition ${inReport ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}
                  >
                    <span className="flex items-center gap-1.5">
                      {inReport ? <Check className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4" />}
                      Ajouter au rapport hebdomadaire
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Why Recommended & Watchlist matching */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-sans">Source de la recommandation</h3>
              {!isAuthenticated ? (
                // Visitor Locked State
                <div className="relative">
                  <div className="pointer-events-none select-none blur-[1px] text-xs text-muted-foreground leading-relaxed">
                    Cet article correspond à vos watchlists sur Mistral AI et OpenAI dans l'écosystème souverain européen.
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-card/60">
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Connectez-vous pour voir
                    </span>
                  </div>
                </div>
              ) : (
                // Unlocked matching why
                <div className="text-xs text-foreground leading-relaxed flex items-start gap-2 bg-muted/40 p-3 rounded-xl border border-border">
                  <TrendingUp className="h-4 w-4 shrink-0 text-success" />
                  <span>{analysis.whyRecommended}</span>
                </div>
              )}
            </div>

            {/* Related articles */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-sans">Analyses connexes</h3>
              <div className="space-y-3">
                {Object.keys(ARTICLE_ANALYSES)
                  .filter((k) => k !== analysisKey)
                  .map((k) => {
                    const related = ARTICLE_ANALYSES[k];
                    return (
                      <div key={k} className="group relative block rounded-xl border border-border bg-background p-3 transition hover:border-accent/40">
                        <div className="text-[10px] font-bold text-accent uppercase">{related.tag}</div>
                        <h4 className="mt-1 text-xs font-semibold leading-snug group-hover:text-primary transition line-clamp-2">
                          <Link to="/analyses/$id" params={{ id: encodeURIComponent(related.title) }}>
                            {related.title}
                          </Link>
                        </h4>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{related.source}</span>
                          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {related.readTime} min</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}

export default AnalysisPage;
