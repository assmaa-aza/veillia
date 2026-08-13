import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./use-auth";

export interface ReportArticle {
  id: string;
  title: string;
  summary?: string;
  source?: string;
  date?: string;
  published_at?: string;
  url?: string;
  category?: string;
  readTime?: string;
}

const REPORT_EVENT = "veillia:report";

function getStorageKey(userId?: string | null): string {
  return userId ? `veillia.report.${userId}` : "veillia.report.guest";
}

function readReportStorage(userId?: string | null): ReportArticle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    return raw ? (JSON.parse(raw) as ReportArticle[]) : [];
  } catch {
    return [];
  }
}

function writeReportStorage(userId: string | null | undefined, articles: ReportArticle[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(articles));
    window.dispatchEvent(new Event(REPORT_EVENT));
  } catch (e) {
    console.error("Failed to save report to localStorage:", e);
  }
}

export function useReport() {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const [reportArticles, setReportArticles] = useState<ReportArticle[]>(() => readReportStorage(userId));

  useEffect(() => {
    setReportArticles(readReportStorage(userId));
  }, [userId]);

  useEffect(() => {
    const handleUpdate = () => {
      setReportArticles(readReportStorage(userId));
    };

    window.addEventListener(REPORT_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(REPORT_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [userId]);

  const isArticleInReport = useCallback(
    (id: string) => {
      return reportArticles.some((a) => a.id === id);
    },
    [reportArticles]
  );

  const addArticle = useCallback(
    (article: ReportArticle) => {
      const current = readReportStorage(userId);
      if (!current.some((a) => a.id === article.id)) {
        const next = [article, ...current];
        writeReportStorage(userId, next);
        setReportArticles(next);
      }
    },
    [userId]
  );

  const removeArticle = useCallback(
    (id: string) => {
      const current = readReportStorage(userId);
      const next = current.filter((a) => a.id !== id);
      writeReportStorage(userId, next);
      setReportArticles(next);
    },
    [userId]
  );

  const toggleArticle = useCallback(
    (article: ReportArticle) => {
      const current = readReportStorage(userId);
      const exists = current.some((a) => a.id === article.id);
      if (exists) {
        removeArticle(article.id);
      } else {
        addArticle(article);
      }
    },
    [userId, addArticle, removeArticle]
  );

  const clearReport = useCallback(() => {
    writeReportStorage(userId, []);
    setReportArticles([]);
  }, [userId]);

  return {
    reportArticles,
    count: reportArticles.length,
    isArticleInReport,
    addArticle,
    removeArticle,
    toggleArticle,
    clearReport,
  };
}
