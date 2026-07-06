import { useEffect, useState, useCallback } from "react";

const KEY = "veillia.auth";

export type AuthUser = { name: string; email: string; jobTitle?: string };

function read(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setUser(read());
    };
    const onCustom = () => setUser(read());
    window.addEventListener("storage", onStorage);
    window.addEventListener("veillia:auth", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("veillia:auth", onCustom);
    };
  }, []);

  const signIn = useCallback((u: AuthUser) => {
    window.localStorage.setItem(KEY, JSON.stringify(u));
    window.dispatchEvent(new Event("veillia:auth"));
    setUser(u);
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("veillia:auth"));
    setUser(null);
  }, []);

  return { user, ready, isAuthenticated: !!user, signIn, signOut };
}
