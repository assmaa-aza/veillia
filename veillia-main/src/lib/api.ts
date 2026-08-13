/**
 * Centralised API client for the VeillIA FastAPI backend.
 * All auth operations go through here — never call the backend directly from route files.
 */

const API_URL = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenSession {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_in: number | null;
}

export interface RegisterResponse {
  id: string;
  email: string | null;
  session: TokenSession | null;
  /** true when Supabase requires email confirmation before issuing a session */
  email_confirmation_required: boolean;
}

export interface LoginResponse {
  user_id: string;
  email: string | null;
  session: TokenSession;
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  created_at: string;
}

export interface Article {
  id: number;
  title: string;
  summary: string | null;
  content: string | null;
  author: string | null;
  url: string | null;
  source: string | null;
  category: string | null;
  published_at: string | null;
  tags: string[];
}

// ─── Internal helper ──────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const { headers: optHeaders, ...restOptions } = options;

  let authToken = token;
  if (!authToken && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("veillia.session");
      if (raw) {
        const parsed = JSON.parse(raw);
        authToken = parsed?.access_token || undefined;
      }
    } catch {
      // ignore parse errors
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((optHeaders as Record<string, string>) ?? {}),
  };

  if (authToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...restOptions,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    let message = "Une erreur est survenue.";
    if (data && typeof data === "object") {
      const errObj = (data as { error?: { message?: unknown }; detail?: unknown }).error;
      const detail = (data as { detail?: unknown }).detail;
      if (errObj && typeof errObj === "object" && "message" in errObj && typeof errObj.message === "string") {
        message = errObj.message;
      } else if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map((d: { msg?: string }) => d?.msg || JSON.stringify(d)).join(", ");
      } else if (detail && typeof detail === "object") {
        message = JSON.stringify(detail);
      }
    }
    throw new Error(message);
  }

  return data as T;
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

/**
 * Creates a Supabase auth user + a matching profiles row.
 * When email confirmation is enabled, session will be null and
 * email_confirmation_required will be true.
 */
export async function register(
  email: string,
  password: string,
  username: string,
  full_name?: string,
): Promise<RegisterResponse> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, username, full_name }),
  });
}

/**
 * Signs in with email + password, returns access/refresh tokens.
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Verifies the 6-digit OTP emailed to the user on sign-up.
 * Returns a full session so the user is immediately authenticated.
 */
export async function verifyOtp(
  email: string,
  token: string,
): Promise<LoginResponse> {
  return request("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, token }),
  });
}

/** Requests another sign-up OTP for an unconfirmed email address. */
export async function resendOtp(email: string): Promise<void> {
  await request("/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * Exchanges a refresh token for a fresh access/refresh pair.
 */
export async function refreshSession(
  refresh_token: string,
): Promise<TokenSession> {
  return request("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  });
}

/**
 * Revokes the current session in Supabase (best-effort).
 */
export async function logout(accessToken: string): Promise<void> {
  await request("/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Fetches the authenticated user's profile from the profiles table.
 */
export async function getMe(accessToken: string): Promise<UserProfile> {
  return request("/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface UserPreferences {

  id: string;
  user_id: string;
  role: string | null;
  interests: string[];
  content_types: string[];
  followed_companies: string[];
  preferred_language: string;
  recommendation_frequency: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches the authenticated user's preferences.
 */
export async function getPreferences(accessToken: string): Promise<UserPreferences> {
  return request("/preferences/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Updates the authenticated user's preferences.
 */
export async function updatePreferences(
  accessToken: string,
  payload: Partial<Omit<UserPreferences, "id" | "user_id" | "created_at" | "updated_at">>,
): Promise<UserPreferences> {
  return request("/preferences/me", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

/**
 * Fetches real metrics directly from the backend articles database.
 */
export interface ArticleStats {
  total_articles: number;
  summarized_articles: number;
  distinct_sources: number;
}

export async function getArticleStats(): Promise<ArticleStats> {
  return request("/articles/stats");
}

/**
 * Fetches latest summarized articles across all categories.
 */
export async function getLatestArticles(limit: number = 50): Promise<Article[]> {
  return request(`/articles/latest?limit=${limit}`);
}

/**
 * Searches real articles by keyword query across title, summary, content, source, and tags.
 */
export async function searchArticles(query: string, categorySlug?: string, limit: number = 50): Promise<Article[]> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (categorySlug) params.set("category", categorySlug);
  params.set("limit", String(limit));
  return request(`/articles/search?${params.toString()}`);
}

/**
 * Fetches successfully scraped and classified articles by category.
 */
export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  return request(`/articles/category/${encodeURIComponent(categorySlug)}`);
}

/**
 * Fetches a single article by its numeric ID.
 */
export async function getArticleById(id: number): Promise<Article> {
  return request(`/articles/${id}`);
}

export interface RecommendedArticle extends Article {
  relevance_score?: number;
  recommendation_reason?: string;
}

/**
 * Fetches personalized article recommendations for the authenticated user.
 */
export async function getPersonalizedRecommendations(accessToken: string): Promise<RecommendedArticle[]> {
  return request("/recommendations/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface ChatResponse {
  answer: string;
  language: string;
  found_in_article: boolean;
}

/**
 * Sends a question about a specific article to the AI chatbot backend.
 * Returns a contextual answer extracted from the article's content.
 */
export async function chatWithArticle(
  accessToken: string,
  articleId: number,
  question: string,
  language: string,
): Promise<ChatResponse> {
  return request(`/chat/article/${articleId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ question, preferred_language: language }),
  });
}

// ─── Admin & Social Publications Endpoints ────────────────────────────────────

export interface AdminArticle extends Article {
  status?: "a_valider" | "valide" | "refuse";
  image_url?: string | null;
}

export type PublicationPlatform = "linkedin" | "instagram";
export type PublicationStatus = "a_valider" | "valide" | "publie" | "refuse";

export interface SocialPublication {
  id: string;
  article_id: number;
  platform: PublicationPlatform;
  content: string;
  image_url?: string | null;
  status: PublicationStatus;
  created_at: string;
  updated_at: string;
  article_title?: string | null;
  article_category?: string | null;
  publication_url?: string | null;
  language?: string | null;
}

/**
 * Admin: List articles for review and validation.
 */
export async function getAdminArticles(status?: string): Promise<AdminArticle[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  return request(`/admin/articles?${params.toString()}`);
}

/**
 * Admin: Update article title, summary, content, category, image, or status.
 */
export async function updateArticle(
  articleId: number,
  payload: Partial<AdminArticle>,
): Promise<AdminArticle> {
  return request(`/admin/articles/${articleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Admin: Update article validation status ('a_valider', 'valide', 'refuse').
 */
export async function updateArticleStatus(
  articleId: number,
  status: "a_valider" | "valide" | "refuse",
): Promise<AdminArticle> {
  return request(`/admin/articles/${articleId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/**
 * Admin: List social media publications filtered by platform or status.
 */
export async function getSocialPublications(
  platform?: string,
  status?: string,
): Promise<SocialPublication[]> {
  const params = new URLSearchParams();
  if (platform) params.set("platform", platform);
  if (status) params.set("status", status);
  return request(`/admin/publications?${params.toString()}`);
}

/**
 * Admin: Generate a social media post (LinkedIn or Instagram) for an approved article.
 */
export async function generateSocialPublication(
  articleId: number,
  platform: PublicationPlatform,
  language: string = "Français",
): Promise<SocialPublication> {
  return request("/admin/publications/generate", {
    method: "POST",
    body: JSON.stringify({ article_id: articleId, platform, language }),
  });
}

/**
 * Admin: Edit a social media publication's text, image URL, status, or language.
 */
export async function updateSocialPublication(
  publicationId: string,
  payload: { content?: string; image_url?: string; status?: PublicationStatus; publication_url?: string; language?: string },
): Promise<SocialPublication> {
  return request(`/admin/publications/${publicationId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Admin: Update publication status ('a_valider' -> 'valide' -> 'publie' / 'refuse').
 */
export async function updateSocialPublicationStatus(
  publicationId: string,
  status: PublicationStatus,
): Promise<SocialPublication> {
  return request(`/admin/publications/${publicationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/**
 * Admin: Regenerate publication post content and/or AI image, optionally changing language.
 */
export async function regeneratePublication(
  publicationId: string,
  target: "content" | "image" | "both" = "both",
  language?: string,
): Promise<SocialPublication> {
  return request(`/admin/publications/${publicationId}/regenerate`, {
    method: "POST",
    body: JSON.stringify({ target, language }),
  });
}

/**
 * Admin: Generate topic-related AI image URL.
 */
export async function generateAiImage(topic?: string, prompt?: string): Promise<{ image_url: string }> {
  return request("/admin/generate-image", {
    method: "POST",
    body: JSON.stringify({ topic, prompt }),
  });
}

