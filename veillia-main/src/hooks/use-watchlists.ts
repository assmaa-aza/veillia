import { useCallback, useEffect, useState } from "react";

const KEY_PREFIX_V2 = "veillia.watchlists_v2";
const KEY_PREFIX_V1 = "veillia.watchlists";

export type WatchlistCategory = {
  id: string;
  name: string;
  createdAt: number;
};

export type SavedArticle = {
  id: string;
  title: string;
  url?: string;
  source?: string;
  category?: string;
  published_at?: string;
  savedAt: number;
};

export type Watchlist = {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  items: string[];
  articles: SavedArticle[];
  createdAt: number;
};

export type WatchlistData = {
  categories: WatchlistCategory[];
  watchlists: Watchlist[];
};

const DEFAULT_CATEGORIES: WatchlistCategory[] = [
  { id: "cat_1", name: "Entreprises & Concurrents", createdAt: 1700000000000 },
  { id: "cat_2", name: "Technologies & IA", createdAt: 1700000000001 },
  { id: "cat_3", name: "Startups & Levées", createdAt: 1700000000002 },
];

const DEFAULT_WATCHLISTS: Watchlist[] = [
  {
    id: "wl_1",
    categoryId: "cat_1",
    name: "OpenAI & Anthropic",
    description: "Suivi des annonces majeures et modèles propriétaires",
    items: ["OpenAI", "Anthropic", "Claude 3.5"],
    articles: [],
    createdAt: 1700000000000,
  },
  {
    id: "wl_2",
    categoryId: "cat_2",
    name: "LLMs Open Source & Agents",
    description: "Modèles ouverts et architectures d'agents autonomes",
    items: ["Llama 3", "Mistral AI", "AI Agents", "MCP"],
    articles: [],
    createdAt: 1700000000001,
  },
];

function keyV2(userId: string) {
  return `${KEY_PREFIX_V2}.${userId}`;
}

function keyV1(userId: string) {
  return `${KEY_PREFIX_V1}.${userId}`;
}

function readData(userId: string | null): WatchlistData {
  if (!userId || typeof window === "undefined") {
    return { categories: [], watchlists: [] };
  }
  try {
    const rawV2 = window.localStorage.getItem(keyV2(userId));
    if (rawV2) {
      return JSON.parse(rawV2) as WatchlistData;
    }

    // Attempt migration from V1
    const rawV1 = window.localStorage.getItem(keyV1(userId));
    if (rawV1) {
      const v1Lists = JSON.parse(rawV1) as Array<{
        id: string;
        name: string;
        type: string;
        items: string[];
        createdAt: number;
      }>;

      const categoryMap: Record<string, string> = {
        companies: "Entreprises",
        technologies: "Technologies",
        startups: "Startups",
        regulations: "Réglementations",
        keywords: "Mots-clés",
      };

      const categories: WatchlistCategory[] = Object.entries(categoryMap).map(
        ([key, name], index) => ({
          id: `cat_legacy_${key}`,
          name,
          createdAt: Date.now() + index,
        }),
      );

      const watchlists: Watchlist[] = v1Lists.map((item) => ({
        id: item.id || crypto.randomUUID(),
        categoryId: categoryMap[item.type]
          ? `cat_legacy_${item.type}`
          : categories[0].id,
        name: item.name,
        items: item.items || [],
        articles: [],
        createdAt: item.createdAt || Date.now(),
      }));

      const migrated: WatchlistData = { categories, watchlists };
      window.localStorage.setItem(keyV2(userId), JSON.stringify(migrated));
      return migrated;
    }

    // Default initial data for new user
    const initialData: WatchlistData = {
      categories: DEFAULT_CATEGORIES,
      watchlists: DEFAULT_WATCHLISTS,
    };
    window.localStorage.setItem(keyV2(userId), JSON.stringify(initialData));
    return initialData;
  } catch (err) {
    console.error("Error reading watchlists:", err);
    return { categories: DEFAULT_CATEGORIES, watchlists: DEFAULT_WATCHLISTS };
  }
}

function writeData(userId: string, data: WatchlistData) {
  if (!userId || typeof window === "undefined") return;
  window.localStorage.setItem(keyV2(userId), JSON.stringify(data));
  window.dispatchEvent(new Event("veillia:watchlists"));
}

/** Hook managing custom categories and multi-watchlist article assignments per user */
export function useWatchlists(userId: string | null = null) {
  const [data, setData] = useState<WatchlistData>({
    categories: [],
    watchlists: [],
  });

  useEffect(() => {
    const sync = () => setData(readData(userId));
    sync();

    const syncStorage = (event: StorageEvent) => {
      if (event.key === keyV2(userId ?? "")) sync();
    };

    window.addEventListener("veillia:watchlists", sync);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener("veillia:watchlists", sync);
      window.removeEventListener("storage", syncStorage);
    };
  }, [userId]);

  // ─── Category Operations ────────────────────────────────────────────────────

  const createCategory = useCallback(
    (name: string): WatchlistCategory | null => {
      if (!userId || !name.trim()) return null;
      const current = readData(userId);
      const newCategory: WatchlistCategory = {
        id: crypto.randomUUID(),
        name: name.trim(),
        createdAt: Date.now(),
      };
      const updated: WatchlistData = {
        ...current,
        categories: [...current.categories, newCategory],
      };
      writeData(userId, updated);
      return newCategory;
    },
    [userId],
  );

  const renameCategory = useCallback(
    (categoryId: string, newName: string) => {
      if (!userId || !newName.trim()) return;
      const current = readData(userId);
      const updated: WatchlistData = {
        ...current,
        categories: current.categories.map((c) =>
          c.id === categoryId ? { ...c, name: newName.trim() } : c,
        ),
      };
      writeData(userId, updated);
    },
    [userId],
  );

  const deleteCategory = useCallback(
    (categoryId: string) => {
      if (!userId) return;
      const current = readData(userId);
      const updated: WatchlistData = {
        categories: current.categories.filter((c) => c.id !== categoryId),
        watchlists: current.watchlists.filter((w) => w.categoryId !== categoryId),
      };
      writeData(userId, updated);
    },
    [userId],
  );

  // ─── Watchlist Operations ───────────────────────────────────────────────────

  const createWatchlist = useCallback(
    (name: string, categoryId: string, description?: string): Watchlist | null => {
      if (!userId || !name.trim() || !categoryId) return null;
      const current = readData(userId);

      // Verify category exists
      let targetCategoryId = categoryId;
      const categoryExists = current.categories.some((c) => c.id === categoryId);
      if (!categoryExists) {
        if (current.categories.length > 0) {
          targetCategoryId = current.categories[0].id;
        } else {
          // Create default category
          const created = createCategory("Général");
          if (!created) return null;
          targetCategoryId = created.id;
        }
      }

      const newWatchlist: Watchlist = {
        id: crypto.randomUUID(),
        categoryId: targetCategoryId,
        name: name.trim(),
        description: description?.trim(),
        items: [],
        articles: [],
        createdAt: Date.now(),
      };

      const freshData = readData(userId);
      const updated: WatchlistData = {
        ...freshData,
        watchlists: [...freshData.watchlists, newWatchlist],
      };
      writeData(userId, updated);
      return newWatchlist;
    },
    [userId, createCategory],
  );

  const renameWatchlist = useCallback(
    (watchlistId: string, newName: string) => {
      if (!userId || !newName.trim()) return;
      const current = readData(userId);
      const updated: WatchlistData = {
        ...current,
        watchlists: current.watchlists.map((w) =>
          w.id === watchlistId ? { ...w, name: newName.trim() } : w,
        ),
      };
      writeData(userId, updated);
    },
    [userId],
  );

  const deleteWatchlist = useCallback(
    (watchlistId: string) => {
      if (!userId) return;
      const current = readData(userId);
      const updated: WatchlistData = {
        ...current,
        watchlists: current.watchlists.filter((w) => w.id !== watchlistId),
      };
      writeData(userId, updated);
    },
    [userId],
  );

  // ─── Article Operations ─────────────────────────────────────────────────────

  const addArticleToWatchlist = useCallback(
    (watchlistId: string, article: Omit<SavedArticle, "savedAt">) => {
      if (!userId) return;
      const current = readData(userId);
      const articleIdStr = String(article.id);

      const updated: WatchlistData = {
        ...current,
        watchlists: current.watchlists.map((w) => {
          if (w.id !== watchlistId) return w;
          const exists = w.articles.some((a) => String(a.id) === articleIdStr);
          if (exists) return w;
          const newArticle: SavedArticle = {
            ...article,
            id: articleIdStr,
            savedAt: Date.now(),
          };
          return { ...w, articles: [newArticle, ...w.articles] };
        }),
      };
      writeData(userId, updated);
    },
    [userId],
  );

  const removeArticleFromWatchlist = useCallback(
    (watchlistId: string, articleId: string | number) => {
      if (!userId) return;
      const current = readData(userId);
      const articleIdStr = String(articleId);

      const updated: WatchlistData = {
        ...current,
        watchlists: current.watchlists.map((w) => {
          if (w.id !== watchlistId) return w;
          return {
            ...w,
            articles: w.articles.filter((a) => String(a.id) !== articleIdStr),
          };
        }),
      };
      writeData(userId, updated);
    },
    [userId],
  );

  const toggleArticleInWatchlists = useCallback(
    (
      selectedWatchlistIds: string[],
      article: Omit<SavedArticle, "savedAt">,
    ) => {
      if (!userId) return;
      const current = readData(userId);
      const articleIdStr = String(article.id);

      const updated: WatchlistData = {
        ...current,
        watchlists: current.watchlists.map((w) => {
          const shouldHave = selectedWatchlistIds.includes(w.id);
          const currentlyHas = w.articles.some(
            (a) => String(a.id) === articleIdStr,
          );

          if (shouldHave && !currentlyHas) {
            const newArticle: SavedArticle = {
              ...article,
              id: articleIdStr,
              savedAt: Date.now(),
            };
            return { ...w, articles: [newArticle, ...w.articles] };
          }
          if (!shouldHave && currentlyHas) {
            return {
              ...w,
              articles: w.articles.filter((a) => String(a.id) !== articleIdStr),
            };
          }
          return w;
        }),
      };
      writeData(userId, updated);
    },
    [userId],
  );

  const isArticleInWatchlist = useCallback(
    (watchlistId: string, articleId: string | number): boolean => {
      const articleIdStr = String(articleId);
      const target = data.watchlists.find((w) => w.id === watchlistId);
      return (
        target?.articles.some((a) => String(a.id) === articleIdStr) ?? false
      );
    },
    [data.watchlists],
  );

  const getWatchlistsForArticle = useCallback(
    (articleId: string | number): string[] => {
      const articleIdStr = String(articleId);
      return data.watchlists
        .filter((w) => w.articles.some((a) => String(a.id) === articleIdStr))
        .map((w) => w.id);
    },
    [data.watchlists],
  );

  // ─── Keyword / Item Operations ──────────────────────────────────────────────

  const addItemToWatchlist = useCallback(
    (watchlistId: string, item: string) => {
      if (!userId || !item.trim()) return;
      const current = readData(userId);
      const updated: WatchlistData = {
        ...current,
        watchlists: current.watchlists.map((w) => {
          if (w.id !== watchlistId) return w;
          const clean = item.trim();
          if (w.items.includes(clean)) return w;
          return { ...w, items: [...w.items, clean] };
        }),
      };
      writeData(userId, updated);
    },
    [userId],
  );

  const removeItemFromWatchlist = useCallback(
    (watchlistId: string, item: string) => {
      if (!userId) return;
      const current = readData(userId);
      const updated: WatchlistData = {
        ...current,
        watchlists: current.watchlists.map((w) => {
          if (w.id !== watchlistId) return w;
          return { ...w, items: w.items.filter((i) => i !== item) };
        }),
      };
      writeData(userId, updated);
    },
    [userId],
  );

  // ─── Legacy Backward-Compatible Helpers ─────────────────────────────────────

  const legacyCreate = useCallback(
    (name: string, categoryIdOrType?: string) => {
      const catId =
        categoryIdOrType && data.categories.some((c) => c.id === categoryIdOrType)
          ? categoryIdOrType
          : data.categories[0]?.id || "";
      return createWatchlist(name, catId);
    },
    [data.categories, createWatchlist],
  );

  return {
    categories: data.categories,
    watchlists: data.watchlists,
    lists: data.watchlists, // Alias for legacy call sites

    // Category CRUD
    createCategory,
    renameCategory,
    deleteCategory,

    // Watchlist CRUD
    createWatchlist,
    renameWatchlist,
    deleteWatchlist,

    // Article Assignment
    addArticleToWatchlist,
    removeArticleFromWatchlist,
    toggleArticleInWatchlists,
    isArticleInWatchlist,
    getWatchlistsForArticle,

    // Item/Keyword Management
    addItemToWatchlist,
    removeItemFromWatchlist,

    // Legacy Aliases
    create: legacyCreate,
    remove: deleteWatchlist,
    addItem: addItemToWatchlist,
    removeItem: removeItemFromWatchlist,
  };
}
