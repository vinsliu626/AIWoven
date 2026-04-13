"use client";

import { SessionProvider } from "next-auth/react";
import { AppLanguageProvider } from "@/components/app/AppLanguageProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppLanguageProvider>{children}</AppLanguageProvider>
    </SessionProvider>
  );
}
