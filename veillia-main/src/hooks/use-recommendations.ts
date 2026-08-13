import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./use-auth";
import * as api from "@/lib/api";
import type { RecommendedArticle } from "@/lib/api";

export function useRecommendations() {
  const { accessToken, preferences, isAuthenticated } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendedArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.getPersonalizedRecommendations(accessToken);
      if (Array.isArray(data) && data.length > 0) {
        setRecommendations(data);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Backend recommendation fetch warning, fallback to client-side engine:", e);
    }

    // Client-side fallback scoring logic based on preferences
    try {
      const interests = (preferences?.interests || []).map((i) => i.toLowerCase());
      const companies = (preferences?.followed_companies || []).map((c) => c.toLowerCase());
      const contentTypes = (preferences?.content_types || []).map((ct) => ct.toLowerCase());

      const fallbackArticles: RecommendedArticle[] = [
        {
          id: 101,
          title: "GPT-5 & les agents autonomes : analyse des capacités d'action directe",
          summary: "Les premiers retours de testeurs montrent des compétences accrues en programmation autonome et en résolution de problèmes complexes sans intervention humaine.",
          content: "Spécialement conçu pour l'orchestration multi-agents...",
          source: "OpenAI Blog",
          category: "produit_ia",
          author: "Sam Altman et al.",
          url: "https://openai.com",
          published_at: "Il y a 2h",
          tags: ["Generative AI", "LLMs", "AI Agents", "OpenAI"],
        },
        {
          id: 102,
          title: "Mistral AI consolide sa position avec une nouvelle levée de fonds majeure",
          summary: "La pépite française valorisée à plusieurs milliards accélère sur les modèles frugaux et l'Open Source pour l'Europe.",
          content: "Tour de table mené par des investisseurs majeurs...",
          source: "Le Figaro Tech",
          category: "startup",
          author: "Chloé Dupont",
          url: "https://mistral.ai",
          published_at: "Il y a 4h",
          tags: ["Mistral AI", "Startups", "Open Source AI", "Europe"],
        },
        {
          id: 103,
          title: "L'UE finalise les obligations d'audit pour les modèles de grande taille",
          summary: "L'AI Act entre dans sa phase opérationnelle. Tout modèle dépassant 70B paramètres devra être évalué par un labo tiers.",
          content: "Cadre juridique strict qui augmente la conformité...",
          source: "Commission Européenne",
          category: "reglementation",
          author: "Service de presse UE",
          url: "https://europa.eu",
          published_at: "Il y a 6h",
          tags: ["AI Regulation", "AI Act", "Europe"],
        },
        {
          id: 104,
          title: "Anthropic lance Claude 3.5 Sonnet avec capacités de contrôle d'ordinateur",
          summary: "Une mise à jour révolutionnaire permettant à l'IA d'interagir directement avec des interfaces graphiques d'ordinateur.",
          content: "Capacité inédite de naviguer sur l'écran...",
          source: "Anthropic News",
          category: "produit_ia",
          author: "Dario Amodei",
          url: "https://anthropic.com",
          published_at: "Il y a 8h",
          tags: ["Anthropic", "Claude", "AI Agents"],
        },
        {
          id: 105,
          title: "Google DeepMind présente Gemini Robotics : pont entre LLMs et corps physiques",
          summary: "Une nouvelle architecture combinant raisonnement linguistique et apprentissage par renforcement pour la manipulation d'objets.",
          content: "Performances exceptionnelles sur tâches complexes...",
          source: "Google AI Blog",
          category: "recherche",
          author: "Demis Hassabis",
          url: "https://deepmind.google",
          published_at: "Il y a 12h",
          tags: ["Google DeepMind", "Robotics", "AI Research"],
        },
      ];

      const scored = fallbackArticles.map((article) => {
        let score = 0;
        const reasons: string[] = [];

        const title = article.title.toLowerCase();
        const summary = (article.summary || "").toLowerCase();
        const tags = (article.tags || []).map((t) => t.toLowerCase());

        // Company match
        const matchedComp = companies.filter((c) => title.includes(c) || summary.includes(c) || tags.some((t) => t.includes(c)));
        if (matchedComp.length > 0) {
          score += 40 * matchedComp.length;
          reasons.push(`Entreprise: ${matchedComp.map((c) => c.toUpperCase()).join(", ")}`);
        }

        // Interest match
        const matchedInt = interests.filter((i) => title.includes(i) || summary.includes(i) || tags.some((t) => t.includes(i)));
        if (matchedInt.length > 0) {
          score += 30 * matchedInt.length;
          reasons.push(`Intérêt: ${matchedInt.slice(0, 2).join(", ")}`);
        }

        // Content type match
        if (contentTypes.some((ct) => (article.category || "").includes(ct))) {
          score += 20;
          reasons.push("Format préféré");
        }

        score += 10; // Base score

        return {
          ...article,
          relevance_score: score,
          recommendation_reason: reasons.length > 0 ? reasons.join(" • ") : "Recommandation basée sur votre profil",
        };
      });

      scored.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      setRecommendations(scored);
    } catch (e) {
      setError("Impossible de charger les recommandations.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAuthenticated, preferences]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, loading, error, refetch: fetchRecommendations };
}
