from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel

PublicationPlatform = Literal["linkedin", "instagram"]
PublicationStatus = Literal["a_valider", "valide", "publie", "refuse"]
ArticleStatus = Literal["a_valider", "valide", "refuse"]

class GeneratePublicationRequest(BaseModel):
    article_id: int
    platform: PublicationPlatform
    language: Optional[str] = "Français"

class UpdatePublicationRequest(BaseModel):
    content: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[PublicationStatus] = None
    publication_url: Optional[str] = None
    language: Optional[str] = None

class UpdatePublicationStatusRequest(BaseModel):
    status: PublicationStatus

class RegeneratePublicationRequest(BaseModel):
    target: Literal["content", "image", "both"] = "both"
    language: Optional[str] = None

class ArticleUpdatePayload(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    source: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[ArticleStatus] = None

class ArticleStatusUpdatePayload(BaseModel):
    status: ArticleStatus

class PublicationResponse(BaseModel):
    id: str
    article_id: int
    platform: PublicationPlatform
    content: str
    image_url: Optional[str] = None
    status: PublicationStatus
    created_at: datetime
    updated_at: datetime
    article_title: Optional[str] = None
    article_category: Optional[str] = None
    publication_url: Optional[str] = None
    language: Optional[str] = "Français"

class GenerateImageRequest(BaseModel):
    prompt: Optional[str] = None
    topic: Optional[str] = None
