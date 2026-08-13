import os
import json
from fastapi import HTTPException, status
from app.database.supabase_client import get_supabase_admin
from app.schemas.article import ArticleResponse
from typing import List, Optional, Dict, Any

LOCAL_ARTICLES_OVERRIDE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "article_overrides.json")

def _ensure_override_dir():
    os.makedirs(os.path.dirname(LOCAL_ARTICLES_OVERRIDE_PATH), exist_ok=True)
    if not os.path.exists(LOCAL_ARTICLES_OVERRIDE_PATH):
        with open(LOCAL_ARTICLES_OVERRIDE_PATH, "w", encoding="utf-8") as f:
            json.dump({}, f)

def _read_article_overrides() -> Dict[str, Dict[str, Any]]:
    _ensure_override_dir()
    try:
        with open(LOCAL_ARTICLES_OVERRIDE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _write_article_overrides(overrides: Dict[str, Dict[str, Any]]):
    _ensure_override_dir()
    with open(LOCAL_ARTICLES_OVERRIDE_PATH, "w", encoding="utf-8") as f:
        json.dump(overrides, f, ensure_ascii=False, indent=2)

class ArticleService:
    CATEGORY_MAP = {
        "startups": "startup",
        "tendances": "tendance",
        "produits": "produit_ia",
        "regulation": "reglementation",
        "evenements": "evenement",
        "recherche": "recherche",
        "ecosysteme": "ecosysteme"
    }

    @staticmethod
    def _apply_override(art: dict) -> dict:
        if not art or "id" not in art:
            return art
        overrides = _read_article_overrides()
        art_id = str(art["id"])
        if art_id in overrides:
            art.update(overrides[art_id])
        if "status" not in art or not art["status"]:
            # Default summarized articles to 'valide'
            art["status"] = "valide" if art.get("summary") else "a_valider"
        return art

    @staticmethod
    def get_classified_articles_by_category(category_slug: str, limit: int = 50) -> List[dict]:
        admin = get_supabase_admin()
        db_category = ArticleService.CATEGORY_MAP.get(category_slug, category_slug)
        
        def _cat_matches(article_cat: str, target_db_cat: str, target_slug: str) -> bool:
            """Fuzzy match: handles singular/plural, slug/db variants."""
            if not article_cat:
                return False
            c = article_cat.lower().strip()
            targets = {target_db_cat.lower(), target_slug.lower()}
            # Also check stripped trailing 's' for singular/plural match
            targets.add(target_db_cat.lower().rstrip("s"))
            targets.add(target_slug.lower().rstrip("s"))
            return c in targets or c.rstrip("s") in targets

        try:
            # Fetch articles matching the DB category
            response = (
                admin.table("articles")
                .select("*")
                .eq("category", db_category)
                .not_.is_("summary", "null")
                .order("published_at", desc=True)
                .limit(limit)
                .execute()
            )
            raw = response.data or []
            
            # Also fetch a broader set to catch articles whose category was overridden
            try:
                broad_response = (
                    admin.table("articles")
                    .select("*")
                    .not_.is_("summary", "null")
                    .order("published_at", desc=True)
                    .limit(200)
                    .execute()
                )
                broad = broad_response.data or []
            except Exception:
                broad = []

            # Merge: apply overrides, then filter by category match
            seen_ids = set()
            results = []
            for a in raw + broad:
                if a["id"] in seen_ids:
                    continue
                seen_ids.add(a["id"])
                a = ArticleService._apply_override(a)
                art_cat = a.get("category", "")
                if _cat_matches(art_cat, db_category, category_slug) and a.get("status") != "refuse":
                    results.append(a)
            
            results.sort(key=lambda x: x.get("published_at") or "", reverse=True)
            return results[:limit]
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch articles for category {category_slug}: {exc}",
            )

    @staticmethod
    def get_article_by_id(article_id: int) -> Optional[dict]:
        admin = get_supabase_admin()
        try:
            response = (
                admin.table("articles")
                .select("*")
                .eq("id", article_id)
                .limit(1)
                .execute()
            )
            if response.data:
                return ArticleService._apply_override(response.data[0])
            return None
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch article {article_id}: {exc}",
            )

    @staticmethod
    def get_article_stats() -> dict:
        admin = get_supabase_admin()
        try:
            res = admin.table("articles").select("id, source, summary, category").execute()
            data = [ArticleService._apply_override(a) for a in (res.data or [])]
            total_articles = len(data)
            summarized_articles = sum(1 for a in data if a.get("summary"))
            validated_articles = sum(1 for a in data if a.get("status") == "valide")
            pending_articles = sum(1 for a in data if a.get("status") == "a_valider")
            sources = set(a["source"].strip() for a in data if a.get("source") and a["source"].strip())
            return {
                "total_articles": total_articles,
                "summarized_articles": summarized_articles,
                "validated_articles": validated_articles,
                "pending_articles": pending_articles,
                "distinct_sources": len(sources),
            }
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch article stats: {exc}",
            )

    @staticmethod
    def get_latest_articles(limit: int = 50, only_approved: bool = True) -> List[dict]:
        admin = get_supabase_admin()
        try:
            response = (
                admin.table("articles")
                .select("*")
                .not_.is_("summary", "null")
                .order("published_at", desc=True)
                .limit(limit * 2)
                .execute()
            )
            raw = [ArticleService._apply_override(a) for a in (response.data or [])]
            if only_approved:
                filtered = [a for a in raw if a.get("status") in ["valide", "publie"]]
                return (filtered if filtered else raw)[:limit]
            return raw[:limit]
        except Exception:
            try:
                # Fallback query without filter if order/column fails
                response = admin.table("articles").select("*").limit(limit).execute()
                raw = [ArticleService._apply_override(a) for a in (response.data or [])]
                return raw[:limit]
            except Exception:
                return []

    @staticmethod
    def get_admin_articles(art_status: Optional[str] = None, limit: int = 100) -> List[dict]:
        admin = get_supabase_admin()
        try:
            response = (
                admin.table("articles")
                .select("*")
                .order("published_at", desc=True)
                .limit(limit)
                .execute()
            )
            raw = [ArticleService._apply_override(a) for a in (response.data or [])]
            if art_status and art_status != "all":
                raw = [a for a in raw if a.get("status") == art_status]
            return raw
        except Exception:
            try:
                response = admin.table("articles").select("*").limit(limit).execute()
                raw = [ArticleService._apply_override(a) for a in (response.data or [])]
                if art_status and art_status != "all":
                    raw = [a for a in raw if a.get("status") == art_status]
                return raw
            except Exception:
                return []

    @staticmethod
    def update_article(article_id: int, payload: dict) -> dict:
        admin = get_supabase_admin()
        clean_payload = {k: v for k, v in payload.items() if v is not None}
        
        # Try updating Supabase database
        try:
            res = admin.table("articles").update(clean_payload).eq("id", article_id).execute()
            if res.data:
                return ArticleService._apply_override(res.data[0])
        except Exception:
            pass

        # Persist override in local store if column doesn't exist yet in DB table
        overrides = _read_article_overrides()
        art_id_str = str(article_id)
        if art_id_str not in overrides:
            overrides[art_id_str] = {}
        overrides[art_id_str].update(clean_payload)
        _write_article_overrides(overrides)

        existing = ArticleService.get_article_by_id(article_id) or {"id": article_id}
        existing.update(clean_payload)
        return existing

    @staticmethod
    def update_article_status(article_id: int, new_status: str) -> dict:
        if new_status not in ["a_valider", "valide", "refuse"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Statut invalide.")
        return ArticleService.update_article(article_id, {"status": new_status})

    @staticmethod
    def search_articles(query: str, category_slug: Optional[str] = None, limit: int = 50) -> List[dict]:
        admin = get_supabase_admin()
        clean_q = (query or "").strip().lower()

        try:
            builder = admin.table("articles").select("*").not_.is_("summary", "null")
            if category_slug:
                db_cat = ArticleService.CATEGORY_MAP.get(category_slug, category_slug)
                builder = builder.eq("category", db_cat)

            response = builder.order("published_at", desc=True).limit(150).execute()
            raw = [ArticleService._apply_override(a) for a in (response.data or [])]
            raw = [a for a in raw if a.get("status") != "refuse"]

            if not clean_q:
                return raw[:limit]

            results = []
            keywords = clean_q.split()

            for article in raw:
                title = (article.get("title") or "").lower()
                summary = (article.get("summary") or "").lower()
                content = (article.get("content") or "").lower()
                source = (article.get("source") or "").lower()
                category = (article.get("category") or "").lower()
                tags = [t.lower() for t in (article.get("tags") or [])]

                score = 0
                for kw in keywords:
                    if kw in title:
                        score += 5
                    if kw in summary:
                        score += 3
                    if kw in source or kw in category:
                        score += 2
                    if any(kw in tag for tag in tags):
                        score += 3
                    if kw in content:
                        score += 1

                if score > 0:
                    results.append((article, score))

            results.sort(key=lambda x: x[1], reverse=True)
            return [r[0] for r in results[:limit]]
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Search failed for query '{query}': {exc}",
            )

article_service = ArticleService()
