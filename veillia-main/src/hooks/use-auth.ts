import { useEffect, useState, useCallback } from "react";
import * as api from "@/lib/api";
import type { UserProfile, UserPreferences } from "@/lib/api";

// ─── Storage ──────────────────────────────────────────────────────────────────

const SESSION_KEY = "veillia.session";

interface StoredSession {
  access_token: string;
  refresh_token: string | null;
  profile: UserProfile;
  preferences?: UserPreferences | null;
}

function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeSession(s: StoredSession): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("veillia:auth"));
}

function clearSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("veillia:auth"));
}

// ─── Public types (kept compatible with existing Navbar / route usage) ────────

/** Shape expected by Navbar and other UI components */
export type AuthUser = {
  name: string;
  email: string;
  jobTitle?: string;
  avatar_url?: string | null;
  role?: string;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from storage on mount and keep in sync across tabs
  useEffect(() => {
    setSession(readSession());
    setReady(true);

    const syncStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) setSession(readSession());
    };
    const syncCustom = () => setSession(readSession());

    window.addEventListener("storage", syncStorage);
    window.addEventListener("veillia:auth", syncCustom);
    return () => {
      window.removeEventListener("storage", syncStorage);
      window.removeEventListener("veillia:auth", syncCustom);
    };
  }, []);

  /**
   * Sign in with email + password.
   * Calls POST /auth/login then GET /users/me and persists the session.
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const loginResult = await api.login(email, password);
        const profile = await api.getMe(loginResult.session.access_token);
        let preferences: UserPreferences | null = null;
        try {
          preferences = await api.getPreferences(loginResult.session.access_token);
        } catch {
          // preferences can be initialized on demand
        }
        const stored: StoredSession = {
          access_token: loginResult.session.access_token,
          refresh_token: loginResult.session.refresh_token,
          profile,
          preferences,
        };
        writeSession(stored);
        setSession(stored);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Connexion échouée";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Used after OTP verification: we already have an access token from the
   * verify-otp response, so we just fetch the profile and store the session.
   */
  const signInWithSession = useCallback(
    async (
      accessToken: string,
      refreshToken: string | null,
    ): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const profile = await api.getMe(accessToken);
        let preferences: UserPreferences | null = null;
        try {
          preferences = await api.getPreferences(accessToken);
        } catch {
          // fallback if preferences record isn't generated yet
        }
        const stored: StoredSession = {
          access_token: accessToken,
          refresh_token: refreshToken,
          profile,
          preferences,
        };
        writeSession(stored);
        setSession(stored);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur d'authentification";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Sign out: revokes the session on the backend and clears local storage.
   */
  const signOut = useCallback(async (): Promise<void> => {
    const s = readSession();
    if (s?.access_token) {
      try {
        await api.logout(s.access_token);
      } catch {
        // best-effort — if the token is already invalid, local logout is still correct
      }
    }
    clearSession();
    setSession(null);
  }, []);

  /** Reload the profile & preferences from the API */
  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    const current = readSession();
    if (!current?.access_token) return null;

    try {
      const profile = await api.getMe(current.access_token);
      let preferences = current.preferences ?? null;
      try {
        preferences = await api.getPreferences(current.access_token);
      } catch {
        // preserve old if fetch fails
      }
      const stored = { ...current, profile, preferences };
      writeSession(stored);
      setSession(stored);
      return profile;
    } catch (e) {
      if (e instanceof Error && /401|credential|bearer/i.test(e.message)) {
        clearSession();
        setSession(null);
      }
      throw e;
    }
  }, []);

  /** Save updated preferences to state & API */
  const savePreferences = useCallback(
    async (payload: Partial<Omit<UserPreferences, "id" | "user_id" | "created_at" | "updated_at">>) => {
      const current = readSession();
      if (!current?.access_token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      const updated = await api.updatePreferences(current.access_token, payload);
      const stored = { ...current, preferences: updated };
      writeSession(stored);
      setSession(stored);
      return updated;
    },
    [],
  );

  // Derive the AuthUser shape that Navbar and other components expect
  const user: AuthUser | null = session?.profile
    ? {
        name: session.profile.full_name ?? session.profile.username,
        email: session.profile.username,
        avatar_url: session.profile.avatar_url,
        role: session.profile.role,
      }
    : null;

  return {
    /** User info compatible with existing Navbar/UI components */
    user,
    /** Full Supabase profile row */
    profile: session?.profile ?? null,
    /** Preferences row */
    preferences: session?.preferences ?? null,
    /** Raw access token for authenticated API calls */
    accessToken: session?.access_token ?? null,
    ready,
    loading,
    error,
    isAuthenticated: !!session,
    signIn,
    signInWithSession,
    signOut,
    refreshProfile,
    savePreferences,
  };
}

