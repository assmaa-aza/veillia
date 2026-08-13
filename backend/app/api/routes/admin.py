from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.publication import (
    GeneratePublicationRequest,
    UpdatePublicationRequest,
    UpdatePublicationStatusRequest,
    RegeneratePublicationRequest,
    ArticleUpdatePayload,
    ArticleStatusUpdatePayload,
    PublicationResponse,
    GenerateImageRequest,
)
from app.services.article_service import article_service
from app.services.publication_service import publication_service, PublicationService

router = APIRouter(prefix="/admin", tags=["admin"])

# ─── Articles à valider ────────────────────────────────────────────────────────

@router.get("/articles")
def list_admin_articles(
    status: Optional[str] = Query(None, description="Filter articles by status: 'a_valider', 'valide', 'refuse', 'all'"),
    limit: int = Query(100, ge=1, le=500),
):
    """
    List articles for admin review and validation.
    """
    return article_service.get_admin_articles(art_status=status, limit=limit)

@router.patch("/articles/{article_id}")
def update_article(
    article_id: int,
    payload: ArticleUpdatePayload,
):
    """
    Review and modify an article's title, summary, content, category, image, or status.
    """
    updated = article_service.update_article(article_id, payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Article {article_id} non trouvé.")
    return updated

@router.patch("/articles/{article_id}/status")
def update_article_status(
    article_id: int,
    payload: ArticleStatusUpdatePayload,
):
    """
    Approve ('valide') or reject ('refuse') an article.
    """
    return article_service.update_article_status(article_id, payload.status)

# ─── Publications à valider ───────────────────────────────────────────────────

@router.get("/publications")
def list_publications(
    platform: Optional[str] = Query(None, description="Filter by platform: 'linkedin', 'instagram', 'all'"),
    status: Optional[str] = Query(None, description="Filter by status: 'a_valider', 'valide', 'publie', 'refuse', 'all'"),
):
    """
    List social media publications for admin validation.
    """
    return publication_service.get_publications(platform=platform, pub_status=status)

@router.post("/publications/generate")
def generate_publication(
    payload: GeneratePublicationRequest,
):
    """
    Generates a social media publication post (LinkedIn or Instagram) based on an approved article.
    """
    return publication_service.create_publication(
        article_id=payload.article_id,
        platform=payload.platform,
        language=payload.language or "Français",
    )

@router.patch("/publications/{publication_id}")
def update_publication(
    publication_id: str,
    payload: UpdatePublicationRequest,
):
    """
    Edit generated publication text, image URL, status, or language.
    """
    return publication_service.update_publication(
        pub_id=publication_id,
        content=payload.content,
        image_url=payload.image_url,
        pub_status=payload.status,
        publication_url=payload.publication_url,
        language=payload.language,
    )

@router.patch("/publications/{publication_id}/status")
def update_publication_status(
    publication_id: str,
    payload: UpdatePublicationStatusRequest,
):
    """
    Approve ('valide'), publish ('publie'), or reject ('refuse') a social media publication.
    """
    return publication_service.update_status(publication_id, payload.status)

@router.post("/publications/{publication_id}/regenerate")
def regenerate_publication(
    publication_id: str,
    payload: RegeneratePublicationRequest,
):
    """
    Regenerates social post text and/or AI image, optionally in a new language.
    """
    return publication_service.regenerate_publication(publication_id, target=payload.target, language=payload.language)

@router.post("/generate-image")
def generate_image(payload: GenerateImageRequest):
    """
    Generates a topic-focused AI image URL for articles or social posts.
    """
    topic = payload.topic or payload.prompt or "AI technology innovation"
    img_url = PublicationService._generate_topic_image(topic=topic, title=topic)
    return {"image_url": img_url}
