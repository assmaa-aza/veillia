import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./use-auth";
import { SupportedLanguage, translations, LANGUAGE_OPTIONS } from "@/lib/translations";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string, defaultText?: string) => string;
  options: typeof LANGUAGE_OPTIONS;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LOCAL_STORAGE_LANG_KEY = "veillia.language";

function normalizeLanguage(input?: string | null): SupportedLanguage {
  if (!input) return "Français";
  const lower = input.toLowerCase();
  if (lower.includes("darija") || lower.includes("دارجة") || lower.includes("moroccan") || lower === "darija") return "Darija";
  if (lower.includes("en") || lower.includes("english")) return "English";
  if (lower.includes("ar") || lower.includes("عرب") || lower.includes("arabic") || lower.includes("العربية")) return "العربية";
  return "Français";
}

/** Languages that use RTL script. */
const RTL_LANGUAGES: SupportedLanguage[] = ["العربية", "Darija"];

/** Apply dir and lang attributes to the document root based on active language. */
function applyDocumentDir(lang: SupportedLanguage) {
  if (typeof document === "undefined") return;
  const isRtl = RTL_LANGUAGES.includes(lang);
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.documentElement.lang = lang === "العربية" ? "ar" : lang === "Darija" ? "ar-MA" : lang === "English" ? "en" : "fr";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { preferences, savePreferences, isAuthenticated } = useAuth();
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_STORAGE_LANG_KEY);
      if (stored) return normalizeLanguage(stored);
    }
    return "Français";
  });

  // Apply RTL/LTR direction on initial render and language changes
  useEffect(() => {
    applyDocumentDir(language);
  }, [language]);

  // Sync when preferences change from auth profile
  useEffect(() => {
    if (preferences?.preferred_language) {
      const normalized = normalizeLanguage(preferences.preferred_language);
      setLanguageState(normalized);
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_LANG_KEY, normalized);
      }
    }
  }, [preferences?.preferred_language]);


  const setLanguage = useCallback(
    async (newLang: SupportedLanguage) => {
      setLanguageState(newLang);
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_LANG_KEY, newLang);
      }
      if (isAuthenticated) {
        try {
          await savePreferences({ preferred_language: newLang });
        } catch (err) {
          console.error("Failed to persist language preference:", err);
        }
      }
    },
    [isAuthenticated, savePreferences]
  );

  const t = useCallback(
    (key: string, defaultText?: string): string => {
      const dict = translations[language] || translations["Français"];
      if (dict && key in dict) {
        return dict[key];
      }
      const fallbackDict = translations["Français"];
      if (fallbackDict && key in fallbackDict) {
        return fallbackDict[key];
      }
      return defaultText || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, options: LANGUAGE_OPTIONS }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
