import { useEffect, useState, useCallback } from "react";

const KEY = "veillia.watchlists";

export type WatchlistType = "companies" | "technologies" | "startups" | "regulations" | "keywords";

export type Watchlist = {
  id: string;
  name: string;
  type: WatchlistType;
  items: string[];
  createdAt: number;
};

function read(): Watchlist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Watchlist[]) : [];
  } catch {
    return [];
  }
}

function write(list: Watchlist[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("veillia:watchlists"));
}

export function useWatchlists() {
  const [lists, setLists] = useState<Watchlist[]>([]);

  useEffect(() => {
    setLists(read());
    const sync = () => setLists(read());
    window.addEventListener("veillia:watchlists", sync);
    window.addEventListener("storage", (e) => e.key === KEY && sync());
    return () => window.removeEventListener("veillia:watchlists", sync);
  }, []);

  const create = useCallback((name: string, type: WatchlistType) => {
    const next = [...read(), { id: crypto.randomUUID(), name, type, items: [], createdAt: Date.now() }];
    write(next);
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((w) => w.id !== id));
  }, []);

  const addItem = useCallback((id: string, item: string) => {
    write(read().map((w) => (w.id === id ? { ...w, items: Array.from(new Set([...w.items, item])) } : w)));
  }, []);

  const removeItem = useCallback((id: string, item: string) => {
    write(read().map((w) => (w.id === id ? { ...w, items: w.items.filter((i) => i !== item) } : w)));
  }, []);

  return { lists, create, remove, addItem, removeItem };
}
