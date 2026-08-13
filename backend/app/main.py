from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    description="Backend authentication and profile API for VeillIA, backed by Supabase.",
    version="1.0.0",
)

# --- CORS ---
# Keep the CORS middleware outermost so error responses (including unexpected
# 500s) still reach the browser with the appropriate CORS headers.
cors_origins = list(
    dict.fromkeys(
        [
            *settings.cors_origins_list,
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:8080",
            "http://localhost:4173",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8080",
            "http://127.0.0.1:4173",
        ]
    )
)

cors_options = dict(
    allow_origins=[
        *cors_origins,
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Normalizes error responses to a consistent shape so the frontend can
    rely on `error.message` regardless of which endpoint failed.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"message": exc.detail}},
        headers=exc.headers,
    )


@app.get("/", tags=["health"])
def root():
    return {"service": settings.app_name, "status": "ok"}


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}


app.include_router(api_router)

# Starlette's `add_middleware` places CORS inside its server-error middleware.
# Wrapping the completed app keeps the CORS headers on unhandled errors too.
app = CORSMiddleware(app=app, **cors_options)
