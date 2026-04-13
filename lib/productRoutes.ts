import type { ChatMode } from "@/components/chat/ui/workflow/types";

export const PRODUCT_ROUTES = {
  chat: "/chat",
  converter: "/converter",
  aiNote: "/ai-note",
  aiDetector: "/ai-detector",
  aiStudy: "/ai-study",
  aiHumanizer: "/ai-humanizer",
} as const;

export function routeForMode(mode: ChatMode): string {
  switch (mode) {
    case "workflow":
      return `${PRODUCT_ROUTES.chat}?mode=workflow`;
    case "normal":
      return PRODUCT_ROUTES.chat;
    case "detector":
      return PRODUCT_ROUTES.aiDetector;
    case "note":
      return PRODUCT_ROUTES.aiNote;
    case "study":
      return PRODUCT_ROUTES.aiStudy;
    case "humanizer":
      return PRODUCT_ROUTES.aiHumanizer;
    case "converter":
      return PRODUCT_ROUTES.converter;
    default:
      return PRODUCT_ROUTES.chat;
  }
}
