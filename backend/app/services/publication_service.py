import os
import json
import uuid
import urllib.parse
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status

from app.database.supabase_client import get_supabase_admin
from app.services.article_service import ArticleService
from app.services.social_publishers import publish_to_platform, SocialPublishError

LOCAL_STORAGE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "social_publications.json")

def _ensure_local_dir():
    os.makedirs(os.path.dirname(LOCAL_STORAGE_PATH), exist_ok=True)
    if not os.path.exists(LOCAL_STORAGE_PATH):
        with open(LOCAL_STORAGE_PATH, "w", encoding="utf-8") as f:
            json.dump([], f)

def _read_local_publications() -> List[Dict[str, Any]]:
    _ensure_local_dir()
    try:
        with open(LOCAL_STORAGE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def _write_local_publications(pubs: List[Dict[str, Any]]):
    _ensure_local_dir()
    with open(LOCAL_STORAGE_PATH, "w", encoding="utf-8") as f:
        json.dump(pubs, f, ensure_ascii=False, indent=2)

class PublicationService:
    """
    Service for managing social media publications (LinkedIn & Instagram).
    Connects to Supabase `social_publications` with transparent local persistence fallback.
    """

    @staticmethod
    def _generate_topic_image(topic: str, category: str = "", title: str = "") -> str:
        """
        Generates a clean, topic-focused AI image URL for social media posts.
        Uses high quality Pollinations AI image endpoint with tailored prompts.
        """
        clean_topic = (topic or title or "Artificial Intelligence innovation").strip()
        category_hint = f"{category} " if category else ""
        prompt_text = f"Futuristic visual, {category_hint}topic {clean_topic}, minimal geometric purple glow tech digital art 4k"
        encoded_prompt = urllib.parse.quote(prompt_text)
        # Unique seed to ensure distinct images per topic
        seed = abs(hash(clean_topic + str(title))) % 10000
        return f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&seed={seed}&nologo=true"

    @staticmethod
    def generate_content_for_platform(article: Dict[str, Any], platform: str, language: str = "Français") -> Dict[str, str]:
        """
        Generates tailored social media text + AI image prompt based on article analysis.
        Supports 4 languages: Français, English, العربية, and Darija.
        - LinkedIn: Structured analysis, strategic takeaways, professional tone.
        - Instagram: Concise caption, emojis, bullet points, engaging call to action.
        """
        title = article.get("title") or "Innovation IA VeillIA"
        summary = article.get("summary") or "Dernières actualités stratégiques et avancées technologiques en IA."
        category = article.get("category") or "Tech"
        source = article.get("source") or "VeillIA"
        analysis = article.get("analysis")

        # Parse key takeaways if analysis exists
        takeaways = []
        if isinstance(analysis, dict):
            takeaways = analysis.get("key_takeaways") or []
        elif isinstance(analysis, str) and analysis:
            try:
                parsed = json.loads(analysis)
                takeaways = parsed.get("key_takeaways", [])
            except Exception:
                takeaways = []

        takeaway_str = ""
        if takeaways:
            takeaway_str = "\n".join([f"• {t}" for t in takeaways[:3]])
        else:
            takeaway_str = f"• {summary[:120]}..."

        lang = (language or "Français").strip().lower()
        if "eng" in lang or "en" in lang:
            lang_key = "english"
        elif "ar" in lang or "عرب" in lang:
            lang_key = "arabic"
        elif "dar" in lang or "دارجة" in lang:
            lang_key = "darija"
        else:
            lang_key = "french"

        if lang_key == "english":
            if platform == "linkedin":
                content = (
                    f"🚀 [AI Intelligence] {title}\n\n"
                    f"📊 Summary:\n{summary}\n\n"
                    f"💡 Key Takeaways:\n{takeaway_str}\n\n"
                    f"🔍 Source: {source}\n"
                    f"👉 Read the full strategic analysis on VeillIA!\n\n"
                    f"#VeillIA #{category.capitalize() if category else 'AI'} #ArtificialIntelligence #TechNews #Innovation #DeepTech"
                )
            else:
                content = (
                    f"✨ {title}\n\n"
                    f"📌 Summary:\n{summary}\n\n"
                    f"⚡ Key Highlights:\n{takeaway_str}\n\n"
                    f"💬 What are your thoughts? Drop a comment below!\n"
                    f"🔗 Link to full analysis in bio.\n\n"
                    f"#VeillIA #{category.lower() if category else 'ai'} #ai #tech #innov #future"
                )
        elif lang_key == "arabic":
            if platform == "linkedin":
                content = (
                    f"🚀 [رصد الذكاء الاصطناعي] {title}\n\n"
                    f"📊 الملخص الاستراتيجي:\n{summary}\n\n"
                    f"💡 أهم النقاط المستفادة:\n{takeaway_str}\n\n"
                    f"🔍 المصدر: {source}\n"
                    f"👉 اقرأ التحليل الاستراتيجي الكامل عبر منصة VeillIA!\n\n"
                    f"#VeillIA #ذكاء_اصطناعي #تكنولوجيا #ابتكار #AI_News"
                )
            else:
                content = (
                    f"✨ {title}\n\n"
                    f"📌 ملخص سريع:\n{summary}\n\n"
                    f"⚡ أهم المعلومات:\n{takeaway_str}\n\n"
                    f"💬 ما رأيكم في هذا التطور؟ شاركونا آراءكم في التعليقات!\n"
                    f"🔗 رابط التحليل الكامل في البايو.\n\n"
                    f"#VeillIA #ذكاء_اصطناعي #تكنولوجيا #ابتكار"
                )
        elif lang_key == "darija":
            if platform == "linkedin":
                content = (
                    f"🚀 [VeillIA - الأخبار د الذكاء الاصطناعي] {title}\n\n"
                    f"📊 الخلاصة والاستراتيجية:\n{summary}\n\n"
                    f"💡 أهم النقط اللي خاصك تعرف:\n{takeaway_str}\n\n"
                    f"🔍 المصدر: {source}\n"
                    f"👉 اكتشف التحليل الكامل ومزيد من التفاصيل فمنصة VeillIA!\n\n"
                    f"#VeillIA #ذكاء_اصطناعي #المغرب #تكنولوجيا #الابتكار"
                )
            else:
                content = (
                    f"✨ {title}\n\n"
                    f"📌 خلاصة سريعة:\n{summary}\n\n"
                    f"⚡ شنو خاصك تعرف:\n{takeaway_str}\n\n"
                    f"💬 أشنو رأيكم فهاد التطور؟ شاركونا فالملاحظات!\n"
                    f"🔗 الرابط الكامل فالبايو.\n\n"
                    f"#VeillIA #ذكاء_اصطناعي #تكنولوجيا #المغرب"
                )
        else:
            # French default
            if platform == "linkedin":
                content = (
                    f"🚀 [Veille IA] {title}\n\n"
                    f"📊 Synthèse :\n{summary}\n\n"
                    f"💡 Points clés à retenir :\n{takeaway_str}\n\n"
                    f"🔍 Source : {source}\n"
                    f"👉 Retrouvez l'analyse stratégique complète sur VeillIA !\n\n"
                    f"#VeillIA #{category.capitalize() if category else 'IA'} #ArtificialIntelligence #TechNews #Innovation #DeepTech"
                )
            else:
                content = (
                    f"✨ {title}\n\n"
                    f"📌 En résumé :\n{summary}\n\n"
                    f"⚡️ Ce qu'il faut savoir :\n{takeaway_str}\n\n"
                    f"💬 Qu'en pensez-vous ? Réagissez en commentaire !\n"
                    f"🔗 Lien vers l'analyse dans la bio.\n\n"
                    f"#VeillIA #{category.lower() if category else 'ia'} #ai #tech #innov #future"
                )

        image_url = article.get("image_url")
        if not image_url or "placeholder" in image_url.lower():
            image_url = PublicationService._generate_topic_image(title, category, title)

        return {
            "content": content,
            "image_url": image_url
        }

    @staticmethod
    def create_publication(article_id: int, platform: str, content: Optional[str] = None, image_url: Optional[str] = None, language: str = "Français") -> Dict[str, Any]:
        """
        Creates a new social publication draft for an approved article.
        Status defaults to 'a_valider'.
        """
        article = ArticleService.get_article_by_id(article_id)
        if not article:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Article {article_id} non trouvé.")

        if not content or not image_url:
            gen = PublicationService.generate_content_for_platform(article, platform, language=language)
            content = content or gen["content"]
            image_url = image_url or gen["image_url"]

        pub_data = {
            "id": str(uuid.uuid4()),
            "article_id": article_id,
            "platform": platform,
            "content": content,
            "image_url": image_url,
            "status": "a_valider",
            "language": language or "Français",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "article_title": article.get("title"),
            "article_category": article.get("category"),
        }

        # Try saving to Supabase DB, fallback to local storage if table missing
        admin = get_supabase_admin()
        try:
            db_payload = {
                "article_id": article_id,
                "platform": platform,
                "content": content,
                "image_url": image_url,
                "status": "a_valider",
                "language": language or "Français",
            }
            res = admin.table("social_publications").insert(db_payload).execute()
            if res.data:
                saved = res.data[0]
                saved["article_title"] = article.get("title")
                saved["article_category"] = article.get("category")
                return saved
        except Exception:
            # Fallback local storage
            local_pubs = _read_local_publications()
            local_pubs.insert(0, pub_data)
            _write_local_publications(local_pubs)

        return pub_data

    @staticmethod
    def get_publications(platform: Optional[str] = None, pub_status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetches all social publications filtered by platform or status.
        """
        admin = get_supabase_admin()
        try:
            builder = admin.table("social_publications").select("*, articles(title, category)")
            if platform and platform != "all":
                builder = builder.eq("platform", platform)
            if pub_status and pub_status != "all":
                builder = builder.eq("status", pub_status)
            
            res = builder.order("created_at", desc=True).execute()
            result = []
            for row in (res.data or []):
                art_meta = row.get("articles") or {}
                row["article_title"] = art_meta.get("title") if isinstance(art_meta, dict) else None
                row["article_category"] = art_meta.get("category") if isinstance(art_meta, dict) else None
                result.append(row)
            return result
        except Exception:
            # Fallback to local persistence
            pubs = _read_local_publications()
            filtered = []
            for p in pubs:
                if platform and platform != "all" and p.get("platform") != platform:
                    continue
                if pub_status and pub_status != "all" and p.get("status") != pub_status:
                    continue
                filtered.append(p)
            return filtered

    @staticmethod
    def update_publication(pub_id: str, content: Optional[str] = None, image_url: Optional[str] = None, pub_status: Optional[str] = None, publication_url: Optional[str] = None, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Updates content, image_url, status, publication_url, or language of a publication.
        """
        admin = get_supabase_admin()
        updates = {"updated_at": datetime.now().isoformat()}
        if content is not None:
            updates["content"] = content
        if image_url is not None:
            updates["image_url"] = image_url
        if pub_status is not None:
            updates["status"] = pub_status
        if publication_url is not None:
            updates["publication_url"] = publication_url
        if language is not None:
            updates["language"] = language

        try:
            res = admin.table("social_publications").update(updates).eq("id", pub_id).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass

        # Fallback local update
        pubs = _read_local_publications()
        found = None
        for p in pubs:
            if str(p.get("id")) == str(pub_id):
                if content is not None:
                    p["content"] = content
                if image_url is not None:
                    p["image_url"] = image_url
                if pub_status is not None:
                    p["status"] = pub_status
                if publication_url is not None:
                    p["publication_url"] = publication_url
                if language is not None:
                    p["language"] = language
                p["updated_at"] = datetime.now().isoformat()
                found = p
                break
        if found:
            _write_local_publications(pubs)
            return found

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Publication {pub_id} non trouvée.")

    @staticmethod
    def _get_publication_by_id(pub_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetches a single publication by id, from Supabase or local fallback.
        """
        admin = get_supabase_admin()
        try:
            res = admin.table("social_publications").select("*").eq("id", pub_id).limit(1).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass

        local_pubs = _read_local_publications()
        return next((p for p in local_pubs if str(p.get("id")) == str(pub_id)), None)

    @staticmethod
    def update_status(pub_id: str, new_status: str) -> Dict[str, Any]:
        """
        Updates publication status (a_valider -> valide -> publie / refuse).

        When new_status == "publie", this actually calls the LinkedIn or
        Instagram API to publish the post for real. The status is only set
        to "publie" in the database if that call succeeds — otherwise an
        HTTPException is raised and the publication stays in its previous
        status, so the admin knows the publish failed and can retry.
        """
        if new_status not in ["a_valider", "valide", "publie", "refuse"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Statut invalide.")

        if new_status != "publie":
            return PublicationService.update_publication(pub_id, pub_status=new_status)

        pub = PublicationService._get_publication_by_id(pub_id)
        if not pub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Publication {pub_id} non trouvée.")

        platform = pub.get("platform")
        content = pub.get("content")
        image_url = pub.get("image_url")

        if not content or not image_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de publier: contenu ou image manquant.",
            )

        try:
            result = publish_to_platform(platform, content, image_url)
        except SocialPublishError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Échec de la publication sur {platform}: {e}",
            )

        return PublicationService.update_publication(
            pub_id,
            pub_status="publie",
            publication_url=result.get("post_url") or None,
        )

    @staticmethod
    def regenerate_publication(pub_id: str, target: str = "both", language: Optional[str] = None) -> Dict[str, Any]:
        """
        Regenerates content and/or image for a social publication, optionally in a new language.
        """
        # Fetch current publication
        admin = get_supabase_admin()
        pub = None
        try:
            res = admin.table("social_publications").select("*").eq("id", pub_id).limit(1).execute()
            if res.data:
                pub = res.data[0]
        except Exception:
            pass

        if not pub:
            local_pubs = _read_local_publications()
            pub = next((p for p in local_pubs if str(p.get("id")) == str(pub_id)), None)

        if not pub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publication non trouvée.")

        article_id = pub.get("article_id")
        platform = pub.get("platform", "linkedin")
        lang_to_use = language or pub.get("language") or "Français"
        article = ArticleService.get_article_by_id(article_id) if article_id else None

        if not article:
            article = {
                "title": pub.get("article_title") or "Article VeillIA",
                "summary": pub.get("content", "")[:200],
                "category": pub.get("article_category") or "IA",
            }

        gen = PublicationService.generate_content_for_platform(article, platform, language=lang_to_use)
        new_content = gen["content"] if target in ["content", "both"] else pub.get("content")
        new_image = PublicationService._generate_topic_image(
            article.get("title", ""), article.get("category", ""), f"{article.get('title', '')}-{datetime.now().timestamp()}"
        ) if target in ["image", "both"] else pub.get("image_url")

        return PublicationService.update_publication(pub_id, content=new_content, image_url=new_image, language=lang_to_use)

publication_service = PublicationService()