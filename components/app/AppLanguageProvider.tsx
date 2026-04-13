"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type AppLang = "zh" | "en";

type AppLanguageContextValue = {
  lang: AppLang;
  setLang: (lang: AppLang) => void;
  isZh: boolean;
  clearLang: () => void;
};

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

function getInitialLang(): AppLang {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem("lang");
    return saved === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const [langState, setLangState] = useState<AppLang>(getInitialLang);

  const value = useMemo<AppLanguageContextValue>(
    () => ({
      lang: langState,
      isZh: langState === "zh",
      setLang: (next) => {
        setLangState(next);
        try {
          window.localStorage.setItem("lang", next);
        } catch {}
      },
      clearLang: () => {
        setLangState("en");
        try {
          window.localStorage.removeItem("lang");
        } catch {}
      },
    }),
    [langState]
  );

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function useAppLanguage() {
  const context = useContext(AppLanguageContext);
  if (!context) {
    throw new Error("useAppLanguage must be used within AppLanguageProvider.");
  }
  return context;
}
