from typing import List, Dict, Any
from app.database.supabase_client import get_supabase_admin
import re
from datetime import datetime, timezone


class RecommendationService:
    CATEGORY_TAG_MAP = {
        "generative ai": ["startup", "tendance", "produit_ia", "recherche"],
        "llms": ["produit_ia", "recherche", "tendance"],
        "ai agents": ["tendance", "produit_ia", "recherche"],
        "machine learning": ["recherche", "tendance"],
        "computer vision": ["recherche", "produit_ia"],
        "nlp": ["recherche", "produit_ia"],
        "robotics": ["tendance", "ecosysteme"],
        "ai startups": ["startup", "ecosysteme"],
        "open source ai": ["recherche", "produit_ia", "ecosysteme"],
        "ai infrastructure": ["tendance", "startup"],
        "ai regulation": ["reglementation"],
        "ai research": ["recherche"],
        "healthcare ai": ["recherche", "startup"],
        "education ai": ["tendance", "produit_ia"],
        "finance ai": ["startup", "tendance"],
    }

    @staticmethod
    def get_recommendations(user_id: str, preferences: Dict[str, Any], limit: int = 20) -> List[Dict[str, Any]]:
        admin = get_supabase_admin()

        interests = [i.lower() for i in (preferences.get("interests") or [])]
        companies = [c.lower() for c in (preferences.get("followed_companies") or [])]
        content_types = [ct.lower() for ct in (preferences.get("content_types") or [])]
        preferred_language = preferences.get("preferred_language", "Français")

        try:
            res = (
                admin.table("articles")
                .select("*")
                .not_.is_("summary", "null")
                .order("published_at", desc=True)
                .limit(100)
                .execute()
            )
            raw_articles = res.data or []
        except Exception as e:
            print(f"Error fetching articles for recommendations: {e}")
            raw_articles = []

        scored_articles = []

        for article in raw_articles:
            score = 0
            reasons = []

            title = (article.get("title") or "").lower()
            summary = (article.get("summary") or "").lower()
            category = (article.get("category") or "").lower()
            tags = [t.lower() for t in (article.get("tags") or [])]
            source = (article.get("source") or "").lower()

            # 1. Company Match
            matched_companies = []
            for comp in companies:
                if comp in title or comp in summary or comp in source:
                    matched_companies.append(comp.title())
            if matched_companies:
                score += 40 * len(matched_companies)
                reasons.append(f"Suivi d'entreprise ({', '.join(matched_companies)})")

            # 2. Interest Match
            matched_interests = []
            for interest in interests:
                if interest in title or interest in summary or any(interest in t for t in tags):
                    matched_interests.append(interest.title())
                else:
                    mapped_cats = RecommendationService.CATEGORY_TAG_MAP.get(interest, [])
                    if category in mapped_cats:
                        matched_interests.append(interest.title())

            matched_interests = list(dict.fromkeys(matched_interests))
            if matched_interests:
                score += 30 * len(matched_interests)
                reasons.append(f"Intérêts ({', '.join(matched_interests[:2])})")

            # 3. Content Type / Category Match
            if content_types:
                for ct in content_types:
                    if ct in category or ct in title or ct in summary:
                        score += 20
                        reasons.append(f"Format ({ct.title()})")
                        break

            # 4. Base Recency Boost
            score += 10

            if score > 0 or len(scored_articles) < limit:
                explanation = " • ".join(reasons) if reasons else "Sélection intelligente VeillIA"
                scored_articles.append({
                    **article,
                    "relevance_score": score,
                    "recommendation_reason": explanation,
                })

        # Sort by relevance_score descending, then published_at
        scored_articles.sort(key=lambda x: (x["relevance_score"], x.get("published_at") or ""), reverse=True)
        return scored_articles[:limit]


recommendation_service = RecommendationService()
