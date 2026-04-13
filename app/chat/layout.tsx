import type { ReactNode } from "react";

import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI Chat Workspace | NexusDesk",
  description: "Public NexusDesk chat workspace for direct AI chat, drafting, and workflow collaboration.",
  path: "/chat",
  robots: {
    index: true,
    follow: true,
  },
});

export default function ChatLayout({ children }: { children: ReactNode }) {
  return children;
}
