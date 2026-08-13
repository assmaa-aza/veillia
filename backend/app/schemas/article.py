from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class ArticleResponse(BaseModel):
    id: int
    title: str
    summary: Optional[str] = None
    content: Optional[str] = None
    author: Optional[str] = None
    url: Optional[str] = None
    source: Optional[str] = None
    category: Optional[str] = None
    published_at: Optional[datetime] = None
    tags: List[str] = []
    status: Optional[str] = None
    image_url: Optional[str] = None
