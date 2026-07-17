import type { ReactNode } from "react";

import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI Chat Workspace | AIWoven",
  description: "Public AIWoven chat workspace for direct AI chat, drafting, and workflow collaboration.",
  path: "/chat",
  robots: {
    index: true,
    follow: true,
  },
});

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `try{document.documentElement.dataset.aiwovenChatNav=localStorage.getItem("aiwoven:chat-sidebar-collapsed")==="true"?"collapsed":"expanded"}catch(e){document.documentElement.dataset.aiwovenChatNav="expanded"}`,
        }}
      />
      <style>{`
        html[data-aiwoven-chat-nav="collapsed"] .chat-workspace-nav { width: 80px !important; }
        html[data-aiwoven-chat-nav="collapsed"] .chat-workspace-nav .chat-nav-brand-full { display: none !important; }
        html[data-aiwoven-chat-nav="collapsed"] .chat-workspace-nav .chat-nav-brand-compact { display: block !important; }
        html[data-aiwoven-chat-nav="collapsed"] .chat-workspace-nav .chat-nav-copy {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }
        html[data-aiwoven-chat-nav="collapsed"] .chat-workspace-nav nav a,
        html[data-aiwoven-chat-nav="collapsed"] .chat-workspace-nav nav + div a,
        html[data-aiwoven-chat-nav="collapsed"] .chat-workspace-nav nav + div button {
          justify-content: center;
          gap: 0;
          padding-inline: .5rem;
        }
        html[data-aiwoven-chat-nav="collapsed"] .chat-workspace-nav .chat-nav-toggle-icon { transform: rotate(180deg); }
      `}</style>
      {children}
    </>
  );
}
