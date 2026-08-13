from fastapi import APIRouter

from app.api.routes import auth, preferences, users, articles, recommendations, chat, admin

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(preferences.router)
api_router.include_router(articles.router)
api_router.include_router(recommendations.router)
api_router.include_router(chat.router)
api_router.include_router(admin.router)
