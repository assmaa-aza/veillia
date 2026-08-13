from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.article import ArticleResponse
from app.services.article_service import article_service

router = APIRouter(prefix="/articles", tags=["articles"])


class ArticleStatsResponse(BaseModel):
    total_articles: int
    summarized_articles: int
    distinct_sources: int


@router.get("/stats", response_model=ArticleStatsResponse)
def get_article_stats():
    """
    Returns real statistics from the articles database.
    """
    return article_service.get_article_stats()


@router.get("/latest", response_model=List[ArticleResponse])
def get_latest_articles(limit: int = Query(50, ge=1, le=100)):
    """
    Returns latest summarized articles ordered by publication date.
    """
    return article_service.get_latest_articles(limit=limit)


@router.get("/search", response_model=List[ArticleResponse])
def search_articles(
    q: str = Query("", description="Keyword search string"),
    category: Optional[str] = Query(None, description="Optional category slug"),
    limit: int = Query(50, ge=1, le=100),
):
    """
    Searches real articles by keyword across title, summary, content, source, and tags.
    """
    return article_service.search_articles(query=q, category_slug=category, limit=limit)


@router.get("/category/{category_slug}", response_model=List[ArticleResponse])
def get_articles_by_category(category_slug: str):
    """
    Returns successfully scraped, summarized, and classified articles for a given category.
    Ordered by the most recent first.
    """
    return article_service.get_classified_articles_by_category(category_slug)


@router.get("/{article_id}", response_model=ArticleResponse)
def get_article_by_id(article_id: int):
    """
    Returns a single article by its numeric ID.
    """
    article = article_service.get_article_by_id(article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article {article_id} not found.",
        )
    return article
