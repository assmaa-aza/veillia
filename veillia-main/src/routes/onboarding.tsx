import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, ChevronRight, ChevronLeft, Search, Plus, Sparkles, UserCheck, Heart, Layers, Building2, Bell, Globe } from "lucide-react";
import { AuthShell } from "@/components/site/AuthShell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Personnalisez vos recommandations — VeillIA" }] }),
  component: Onboarding,
});

// 1. Profils
const rolesList = [
  "Étudiant",
  "Développeur",
  "Data Scientist",
  "ML Engineer",
  "Entrepreneur",
  "Startup Founder",
  "Chercheur",
  "AI Enthusiast",
  "Investisseur",
  "Autre",
];

// 2. Domaines IA
const interestsList = [
  "Generative AI",
  "LLMs",
  "AI Agents",
  "Machine Learning",
  "Computer Vision",
  "NLP",
  "Robotics",
  "AI Startups",
  "Open Source AI",
  "AI Infrastructure",
  "AI Regulation",
  "AI Research",
  "Healthcare AI",
  "Education AI",
  "Finance AI",
  "Autre",
];

// 3. Types de contenu
const contentTypesList = [
  "Actualités",
  "Articles",
  "Papers de recherche",
  "Nouveaux produits IA",
  "Startups",
  "Réglementations",
  "Tutoriels",
  "Études de cas",
];

// 4. Entreprises & Organisations
const defaultCompanies = [
  "OpenAI",
  "Anthropic",
  "Google DeepMind",
  "Meta AI",
  "Microsoft",
  "NVIDIA",
  "Hugging Face",
  "Mistral AI",
  "xAI",
];

// 5. Fréquence
const frequencyOptions = [
  { id: "Temps réel", label: "Temps réel", desc: "Notifications et alertes instantanées dès publication." },
  { id: "Quotidiennement", label: "Quotidiennement", desc: "Le digest de votre veille chaque matin." },
  { id: "Hebdomadairement", label: "Hebdomadairement", desc: "Une synthèse stratégique chaque lundi." },
];

// 6. Langue préférée
const languageOptions = ["Français", "English", "العربية", "Darija", "Autre"];

function Onboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, ready, preferences, savePreferences } = useAuth();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [role, setRole] = useState<string | null>(null);
  const [customRole, setCustomRole] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [followedCompanies, setFollowedCompanies] = useState<string[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [recommendationFrequency, setRecommendationFrequency] = useState<string>("Quotidiennement");
  const [preferredLanguage, setPreferredLanguage] = useState<string>("Français");
  const [customLanguage, setCustomLanguage] = useState("");

  // Populate from existing preferences if available
  useEffect(() => {
    if (preferences) {
      if (preferences.role) setRole(preferences.role);
      if (preferences.interests) setInterests(preferences.interests);
      if (preferences.content_types) setContentTypes(preferences.content_types);
      if (preferences.followed_companies) setFollowedCompanies(preferences.followed_companies);
      if (preferences.recommendation_frequency) setRecommendationFrequency(preferences.recommendation_frequency);
      if (preferences.preferred_language) setPreferredLanguage(preferences.preferred_language);
    }
  }, [preferences]);

  // Protect route
  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate({ to: "/auth/login" });
    }
  }, [ready, isAuthenticated, navigate]);

  const toggleItem = (list: string[], setList: (val: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleAddCustomInterest = () => {
    if (!customInterest.trim()) return;
    if (!interests.includes(customInterest.trim())) {
      setInterests([...interests, customInterest.trim()]);
    }
    setCustomInterest("");
  };

  const handleAddCustomCompany = () => {
    if (!customCompany.trim()) return;
    if (!followedCompanies.includes(customCompany.trim())) {
      setFollowedCompanies([...followedCompanies, customCompany.trim()]);
    }
    setCustomCompany("");
  };

  const next = () => setStep((s) => Math.min(5, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    setSubmitting(true);
    setError(null);

    const finalRole = role === "Autre" && customRole.trim() ? customRole.trim() : role;
    const finalLanguage = preferredLanguage === "Autre" && customLanguage.trim() ? customLanguage.trim() : preferredLanguage;

    try {
      await savePreferences({
        role: finalRole,
        interests,
        content_types: contentTypes,
        followed_companies: followedCompanies,
        recommendation_frequency: recommendationFrequency,
        preferred_language: finalLanguage,
        onboarding_completed: true,
      });
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde des préférences.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepsConfig = [
    { title: "Votre Profil", icon: UserCheck, desc: "Aidez-nous à adapter l'angle de nos synthèses" },
    { title: "Centres d'intérêt", icon: Heart, desc: "Les domaines fondamentaux que vous suivez" },
    { title: "Types de contenu", icon: Layers, desc: "Format et granularité de l'information" },
    { title: "Entreprises & Écosystèmes", icon: Building2, desc: "Organisations et pépites sous votre loupe" },
    { title: "Fréquence des flux", icon: Bell, desc: "Rythme de mise à jour des recommandations" },
    { title: "Langue préférée", icon: Globe, desc: "Langue d'affichage et de synthèse des news" },
  ];

  const filteredCompanies = defaultCompanies.filter((c) =>
    c.toLowerCase().includes(companySearch.toLowerCase()),
  );

  return (
    <AuthShell
      title="Bienvenue sur VeillIA !"
      subtitle={`Étape ${step + 1} sur 6 — ${stepsConfig[step].title}`}
    >
      {/* Progress Header */}
      <div className="mb-6 space-y-2">
        <div className="flex gap-1.5">
          {stepsConfig.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-gradient-brand shadow-sm" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{stepsConfig[step].desc}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* QUESTION 1: PROFIL */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">1. Quel est votre profil ?</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {rolesList.map((r) => {
              const selected = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-medium transition ${
                    selected
                      ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
                      : "border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/40"
                  }`}
                >
                  <span>{r}</span>
                  {selected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
          {role === "Autre" && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="Précisez votre rôle ou métier..."
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
          )}
        </div>
      )}

      {/* QUESTION 2: DOMAINES IA */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              2. Quels domaines de l'IA vous intéressent ?
            </h2>
            <span className="text-xs text-muted-foreground">Sélection multiple</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {interestsList.map((item) => {
              const on = interests.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleItem(interests, setInterests, item)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                    on
                      ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
                      : "border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/40"
                  }`}
                >
                  {on && <Check className="h-3.5 w-3.5" />} {item}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Ajouter un autre domaine personnalisé..."
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomInterest())}
              className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <button
              type="button"
              onClick={handleAddCustomInterest}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted"
            >
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
        </div>
      )}

      {/* QUESTION 3: TYPES DE CONTENU */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              3. Quels types de contenu souhaitez-vous recevoir ?
            </h2>
            <span className="text-xs text-muted-foreground">Sélection multiple</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {contentTypesList.map((ct) => {
              const on = contentTypes.includes(ct);
              return (
                <button
                  key={ct}
                  type="button"
                  onClick={() => toggleItem(contentTypes, setContentTypes, ct)}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-medium transition ${
                    on
                      ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
                      : "border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/40"
                  }`}
                >
                  <span>{ct}</span>
                  {on && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* QUESTION 4: ENTREPRISES */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              4. Quelles entreprises ou organisations suivez-vous ?
            </h2>
            <span className="text-xs text-muted-foreground">Sélection & recherche</span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher une entreprise (OpenAI, Anthropic...)"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
            {filteredCompanies.map((comp) => {
              const on = followedCompanies.includes(comp);
              return (
                <button
                  key={comp}
                  type="button"
                  onClick={() => toggleItem(followedCompanies, setFollowedCompanies, comp)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                    on
                      ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
                      : "border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/40"
                  }`}
                >
                  {on && <Check className="h-3.5 w-3.5" />} {comp}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2 border-t border-border/60">
            <input
              type="text"
              placeholder="Autre entreprise / lab à suivre..."
              value={customCompany}
              onChange={(e) => setCustomCompany(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomCompany())}
              className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <button
              type="button"
              onClick={handleAddCustomCompany}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted"
            >
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
        </div>
      )}

      {/* QUESTION 5: FRÉQUENCE */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            5. À quelle fréquence souhaitez-vous recevoir des recommandations ?
          </h2>
          <div className="space-y-2.5">
            {frequencyOptions.map((opt) => {
              const selected = recommendationFrequency === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRecommendationFrequency(opt.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-accent/40 hover:bg-muted/30"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* QUESTION 6: LANGUE */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">6. Langue préférée</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {languageOptions.map((lang) => {
              const selected = preferredLanguage === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setPreferredLanguage(lang)}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-medium transition ${
                    selected
                      ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
                      : "border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/40"
                  }`}
                >
                  <span>{lang}</span>
                  {selected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
          {preferredLanguage === "Autre" && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="Indiquez votre langue préférée..."
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex items-center justify-between gap-2 border-t border-border/60 pt-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0 || submitting}
            className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2 text-sm font-medium transition disabled:opacity-40 hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" /> Retour
          </button>
          <button
            type="button"
            onClick={finish}
            disabled={submitting}
            className="rounded-xl border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            Passer
          </button>
        </div>

        {step < 5 ? (
          <button
            type="button"
            onClick={next}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-5 py-2 text-sm font-semibold text-primary-foreground shadow-brand hover:opacity-95 transition disabled:opacity-50"
          >
            Continuer <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-5 py-2 text-sm font-semibold text-primary-foreground shadow-brand hover:opacity-95 transition disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {submitting ? "Enregistrement..." : "Accéder à VeillIA"}
          </button>
        )}
      </div>
    </AuthShell>
  );
}
