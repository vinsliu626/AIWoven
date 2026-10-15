"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSession, signIn, signOut, getProviders, type ClientSafeProvider } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// Existing components
import { ProTrialWheelModal, ProTrialWheelReminderPrompt } from "@/components/billing/ProTrialWheelModal";
import { PlanPillButton } from "@/components/chat/billing/PlanPill";
import { PlanModal } from "@/components/chat/billing/PlanModal";
import { RedeemModal } from "@/components/chat/billing/RedeemModal";
import { SettingsModal } from "@/components/chat/settings/SettingsModal";
import { ChatHistoryRow } from "@/components/chat/sidebar/ChatHistoryRow";
import { DetectorUI } from "@/components/workspace/detector/DetectorUI";
import { HumanizerUI } from "@/components/workspace/humanizer/HumanizerUI";
import { NoteUI } from "@/components/workspace/note/NoteUI";
import { StudyUI } from "@/components/workspace/study/StudyUI";
import { ConverterUI } from "@/components/workspace/converter/ConverterUI";
import { AiFormattedText } from "@/components/shared/AiFormattedText";
import { NexusOrb } from "@/components/shared/NexusOrb";
import { AIWovenAppNav } from "@/components/app/AIWovenAppNav";
import { HeaderAuthMenu, WorkspaceBreadcrumb, workspaceModeTitle } from "@/components/app/WorkspaceHeader";
import { CopyButton } from "@/components/ui/copy-button";
import { WorkspaceSignInPrompt } from "@/components/auth/WorkspaceSignInPrompt";
import { useAppLanguage } from "@/components/app/AppLanguageProvider";
import { useProTrialWheel } from "@/lib/hooks/useProTrialWheel";

// workflow UI
import { Bubble } from "@/components/chat/ui/workflow/Bubble";
import { ModeDropdown } from "@/components/chat/ui/workflow/ModeDropdown";
import type { ChatMode, WorkflowMessage } from "@/components/chat/ui/workflow/types";
import { uid } from "@/components/chat/ui/workflow/types";
import { tryParseWorkflowReply } from "@/components/chat/ui/workflow/parseWorkflow";
import { routeForMode } from "@/lib/productRoutes";

/** ===================== Types ===================== */
type ChatSession = {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

type PlanId = "basic" | "pro" | "ultra" | "gift";
type Entitlement = {
  ok: true;
  plan: PlanId;
  source?: "developer_override" | "paid_subscription" | "promo" | "free";
  stripeStatus?: string | null;
  daysLeft?: number | null;
  unlimited: boolean;

  detectorWordsPerWeek: number | null;
  noteSecondsPerWeek: number | null;
  chatPerDay: number | null;

  usedDetectorWordsThisWeek: number;
  usedNoteSecondsThisWeek: number;
  usedHumanizerWordsThisWeek: number;
  usedChatCountToday: number;
  usedNoteGeneratesToday?: number;
  usedChatInputCharsWindow?: number;
  usedStudyCountToday: number;

  chatInputMaxChars?: number;
  chatBudgetCharsPerWindow?: number;
  chatBudgetWindowHours?: number;
  chatCooldownMs?: number;
  noteGeneratesPerDay?: number;
  noteInputMaxChars?: number;
  noteMaxItems?: number;
  noteCooldownMs?: number;
  humanizerWordsPerWeek: number;
  humanizerMaxInputWords: number;
  humanizerMinInputWords: number;
  humanizerCooldownMs?: number;
  studyGenerationsPerDay: number;
  studyMaxFileSizeBytes: number;
  studyMaxExtractedChars: number;
  studyMaxQuizQuestions: number;
  studyMaxSelectableModes?: number;
  studyAllowedDifficulties: ("easy" | "medium" | "hard")[];
  usedConverterCountToday?: number;
  converterConversionsPerDay?: number;
  converterMaxFileSizeBytes?: number;
  converterBatchMaxFiles?: number;
  converterAllowAdvancedVideo?: boolean;
  converterAllowLinkToAudio?: boolean;
  converterPriority?: "standard" | "fast" | "priority";

  canSeeSuspiciousSentences: boolean;
};
type RedeemSuccessState = {
  plan: string;
  grantEndAt: string | null;
};
type AuthProviderMap = Record<string, ClientSafeProvider>;

/** ===================== helpers ===================== */
async function safeReadJson(res: Response) {
  const text = await res.text().catch(() => "");
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { text, data };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 60000, ...rest } = init;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, { ...rest, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeFetchError(err: any, isZh: boolean) {
  if (err?.name === "AbortError") {
    return isZh
      ? "请求超时：后端可能卡住了，或者正在重启。"
      : "Request timed out: backend may be stuck or restarting.";
  }
  const msg = String(err?.message || err || "");
  if (msg.toLowerCase().includes("failed to fetch")) {
    return isZh
      ? "网络请求失败：后端连接断开、崩溃，或者正在重启。"
      : "Network request failed: backend disconnected/crashed/restarting.";
  }
  return (isZh ? "请求失败：" : "Request failed: ") + msg;
}

function workflowFailureMessage(error: any, isZh: boolean) {
  const code = String(error?.code || error?.error || "");
  const message = String(error?.message || "");

  if (code === "UPSTREAM_TIMEOUT" || code === "OPENROUTER_TIMEOUT" || code === "GROQ_TIMEOUT" || /timeout/i.test(message)) {
    return isZh ? "Workflow 超时，请重试。" : "Workflow timed out. Please try again.";
  }
  if (code === "ALL_WORKFLOW_MODELS_FAILED") {
    return isZh ? "AIWoven 工作流暂时不可用，请稍后再试。" : "The AIWoven workflow is temporarily unavailable. Please try again later.";
  }
  return isZh ? "Workflow 生成失败，请重试。" : "Workflow generation failed. Please try again.";
}

function buildHttpErrorMessage(opts: { res: Response; data: any; text: string; isZh: boolean }) {
  const { res, data, text, isZh } = opts;
  const payload =
    data && typeof data === "object"
      ? JSON.stringify({ status: res.status, data })
      : `status=${res.status}, body=${(text || "").slice(0, 800)}`;

  const hint =
    res.status === 401
      ? isZh
        ? "（可能未登录 / 未携带 session cookie）"
        : "(likely not signed in / missing session cookie)"
      : res.status === 404
      ? isZh
        ? "（会话不存在，或不属于当前账号）"
        : "(session not found or not owned by current user)"
      : res.status === 400
      ? isZh
        ? "（请求参数不正确，比如 sessionId 为空）"
        : "(bad request, e.g. missing sessionId)"
      : "";

  return (data?.message || data?.error || `HTTP_${res.status}`) + " " + hint + "\n" + payload;
}

/** ===================== Entitlement Hook ===================== */
function useEntitlement(sessionExists: boolean) {
  const [ent, setEnt] = useState<Entitlement | null>(null);
  const [loadingEnt, setLoadingEnt] = useState(false);

  async function refresh() {
    if (!sessionExists) {
      setEnt(null);
      return;
    }
    setLoadingEnt(true);
    try {
      const res = await fetchWithTimeout("/api/billing/status", { cache: "no-store", timeoutMs: 15000, credentials: "include" });
      const { data } = await safeReadJson(res);
      if (res.ok && data?.ok) setEnt(data as Entitlement);
    } catch {
    } finally {
      setLoadingEnt(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionExists]);

  return { ent, loadingEnt, refresh, setEnt };
}

/** ===================== SSE parsing ===================== */
type SSEPacket = { event: string; data: any };

function parseSSEChunks(buffer: string) {
  const parts = buffer.split("\n\n");
  const remain = parts.pop() ?? "";
  const packets: SSEPacket[] = [];

  for (const block of parts) {
    const lines = block.split("\n");
    let event = "message";
    let dataStr = "";

    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
    }

    if (!dataStr) continue;
    try {
      packets.push({ event, data: JSON.parse(dataStr) });
    } catch {
      packets.push({ event, data: dataStr });
    }
  }

  return { packets, remain };
}

function formatGiftGrantEndAt(grantEndAt: string | null, isZh: boolean) {
  if (!grantEndAt) return isZh ? "瀹稿弶绺哄ú?" : "Active now";
  const parsed = new Date(grantEndAt);
  if (!Number.isFinite(parsed.getTime())) return grantEndAt;
  return new Intl.DateTimeFormat(isZh ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatGiftPlan(plan: string, isZh: boolean) {
  if (plan.toLowerCase() === "pro") return "Pro";
  if (plan.toLowerCase() === "ultra") return isZh ? "Ultra 专业版" : "Ultra Pro";
  return plan;
}

function getRequestedMode(value: string | null): ChatMode | null {
  switch (value) {
    case "workflow":
    case "normal":
    case "detector":
    case "note":
    case "study":
    case "humanizer":
    case "converter":
      return value;
    default:
      return null;
  }
}

/** ===================== Main ===================== */
function ChatPageInner() {
  const { data: session } = useSession();
  const sessionExists = !!session;
  const effectiveSession = session;
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMode = getRequestedMode(searchParams.get("mode"));

  // UI
  const [settingsOpen, setSettingsOpen] = useState(false);

  // chat core
  const [messages, setMessages] = useState<WorkflowMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // settings
  const { lang, setLang, isZh, clearLang } = useAppLanguage();

  // dropdown mode
  const [mode, setMode] = useState<ChatMode>(requestedMode ?? "normal");

  // sessions sidebar
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceNavOpen, setWorkspaceNavOpen] = useState(false);
  const [workspaceNavCollapsed, setWorkspaceNavCollapsed] = useState(false);
  const [workspaceNavTransitionReady, setWorkspaceNavTransitionReady] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const querySessionLoadedRef = useRef<string | null>(null);

  // billing modal
  const [planOpen, setPlanOpen] = useState(false);
  const [signInPromptMode, setSignInPromptMode] = useState<ChatMode | null>(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCodeValue, setRedeemCodeValue] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<RedeemSuccessState | null>(null);
  const [authProviders, setAuthProviders] = useState<AuthProviderMap>({});

  const { ent, refresh: refreshEnt } = useEntitlement(sessionExists);
  const trialWheel = useProTrialWheel({
    sessionExists,
    userId: effectiveSession?.user?.id ?? effectiveSession?.user?.email ?? null,
  });

  // login gating
  const detectorLocked = !sessionExists;
  const humanizerLocked = !sessionExists;
  const noteLocked = !sessionExists;
  const studyLocked = !sessionExists;
  const converterLocked = !sessionExists;

  // Stripe redirect: success/canceled
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    if (success === "1" || canceled === "1") {
      refreshEnt();
      setPlanOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (requestedMode) {
      setMode(requestedMode);
    }
  }, [requestedMode]);

  useEffect(() => {
    try {
      const collapsed = localStorage.getItem("aiwoven:chat-sidebar-collapsed") === "true";
      setWorkspaceNavCollapsed(collapsed);
      document.documentElement.dataset.aiwovenChatNav = collapsed ? "collapsed" : "expanded";
    } catch {
      document.documentElement.dataset.aiwovenChatNav = "expanded";
    }
    setWorkspaceNavTransitionReady(true);
  }, []);

  function toggleWorkspaceNav() {
    setWorkspaceNavCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem("aiwoven:chat-sidebar-collapsed", String(next));
      } catch {}
      document.documentElement.dataset.aiwovenChatNav = next ? "collapsed" : "expanded";
      return next;
    });
  }

  // Escape closes either mobile workspace navigation or the chat-history drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
        setWorkspaceNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      try {
        const providers = await getProviders();
        if (!cancelled) {
          setAuthProviders(providers ?? {});
        }
      } catch {
        if (!cancelled) {
          setAuthProviders({});
        }
      }
    }

    if (!sessionExists) {
      loadProviders();
    }

    return () => {
      cancelled = true;
    };
  }, [sessionExists]);

  useEffect(() => {
    if (mode === "study") {
      setSidebarOpen(false);
    }
  }, [mode]);

  // auto scroll to bottom when messages change
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (!copiedMessageId) return;
    const timer = window.setTimeout(() => setCopiedMessageId(null), 1500);
    return () => window.clearTimeout(timer);
  }, [copiedMessageId]);

  // ===== Sessions =====
  async function loadSessions() {
    if (!sessionExists) {
      setSessions([]);
      return;
    }
    try {
      setSessionsLoading(true);
      const res = await fetchWithTimeout("/api/chat/sessions", {
        timeoutMs: 15000,
        cache: "no-store",
        credentials: "include",
      });
      const { data } = await safeReadJson(res);
      if (res.ok) setSessions(data?.sessions ?? []);
      else setSessions([]);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionExists]);

  async function handleSelectSession(sessionId: string) {
    if (!sessionExists) return;
    if (isLoading) return;

    if (!sessionId || typeof sessionId !== "string") {
      setMessages([{ id: uid(), stage: "assistant", title: "AI", subtitle: "Error", content: isZh ? "无效的会话 ID" : "Invalid session id" }]);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetchWithTimeout(`/api/chat/session/${sessionId}`, {
        timeoutMs: 20000,
        cache: "no-store",
        credentials: "include",
      });

      const { data, text } = await safeReadJson(res);

      if (!res.ok) {
        throw new Error(buildHttpErrorMessage({ res, data, text, isZh }));
      }

      const msgs: WorkflowMessage[] = (data?.messages ?? []).map((m: { role: string; content: string }) => {
        if (m.role === "assistant") {
          return {
            id: uid(),
            stage: "assistant",
            title: mode === "workflow" ? "AI" : "Assistant",
            subtitle: mode === "workflow" ? "Reply" : undefined,
            content: m.content ?? "",
          };
        }
        return { id: uid(), stage: "user", title: "You", content: m.content ?? "" };
      });

      setMessages(msgs);
      setChatSessionId(sessionId);
      setSidebarOpen(false);
    } catch (err: any) {
      const msg = normalizeFetchError(err, isZh);
      setMessages([{ id: uid(), stage: "assistant", title: "AI", subtitle: "Error", content: msg }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewChat() {
    if (isLoading) return;
    setMessages([]);
    setInput("");
    setChatSessionId(null);
    setSidebarOpen(false);
  }

  // ===== SSE workflow runner =====
  const abortRef = useRef<AbortController | null>(null);

  async function runWorkflowSSE(historyForApi: { role: "user" | "assistant"; content: string }[]) {
    const controller = new AbortController();
    abortRef.current = controller;
    let plannerId = "";
    let writerId = "";
    let reviewerId = "";
    let plannerDone = false;
    let writerDone = false;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: historyForApi,
          mode: "team",
          chatSessionId,
          lang,
        }),
        signal: controller.signal,
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok || !res.body) {
        const { text, data } = await safeReadJson(res);
        const msg = data?.message || data?.error || text?.slice(0, 800) || `HTTP_${res.status}`;
        throw new Error(msg);
      }

      plannerId = uid();
      writerId = uid();
      reviewerId = uid();

      setMessages((prev) => [
        ...prev,
        { id: plannerId, stage: "planner", title: "Planner", subtitle: isZh ? "瑙勫垝" : "Plan", content: "" },
        { id: writerId, stage: "writer", title: "Writer", subtitle: isZh ? "鍒濊崏" : "Draft", content: "" },
        { id: reviewerId, stage: "reviewer", title: isZh ? "审阅 + 结论" : "Reviewer + Conclusion", subtitle: isZh ? "修订后的最终稿" : "Improved Final Draft", content: "" },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { packets, remain } = parseSSEChunks(buffer);
        buffer = remain;

        for (const p of packets) {
          if (p.event === "error") {
            const err: any = new Error(p.data?.message || p.data?.error || "Unknown SSE error");
            err.code = p.data?.error;
            err.extra = p.data?.extra;
            throw err;
          }

          if (p.event === "stage_done") {
            const stage = String(p.data?.stage || "");
            const content = String(p.data?.content || "");

            if (stage === "planner") {
              plannerDone = true;
              setMessages((prev) => prev.map((m) => (m.id === plannerId ? { ...m, content } : m)));
            }

            if (stage === "writer") {
              writerDone = true;
              setMessages((prev) => prev.map((m) => (m.id === writerId ? { ...m, content: content || (isZh ? "（无输出）" : "(No output)") } : m)));
            }

            if (stage === "reviewer" || stage === "final") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === reviewerId
                    ? {
                        ...m,
                        stage: "reviewer",
                        title: isZh ? "审阅 + 结论" : "Reviewer + Conclusion",
                        subtitle: isZh ? "修订后的最终稿" : "Improved Final Draft",
                        content: content || (isZh ? "（无输出）" : "(No output)"),
                      }
                    : m
                )
              );
            }
          }

          if (p.event === "stage_delta") {
            const stage = String(p.data?.stage || "");
            if (stage === "writer") {
              const content = String(p.data?.content || "");
              setMessages((prev) => prev.map((m) => (m.id === writerId ? { ...m, content } : m)));
            }
            if (stage === "reviewer" || stage === "final") {
              const content = String(p.data?.content || "");
              setMessages((prev) => prev.map((m) => (m.id === reviewerId ? { ...m, stage: "reviewer", content } : m)));
            }
          }

          if (p.event === "done") {
            const sid = p.data?.chatSessionId;
            if (sessionExists && sid) {
              setChatSessionId(sid);
              loadSessions();
            }
            if (sessionExists) refreshEnt();
          }
        }
      }
    } catch (error: any) {
      const content = workflowFailureMessage(error, isZh);
      const failedSubtitle = isZh ? "失败" : "Failed";

      if (!plannerId || !writerId || !reviewerId) {
        setMessages((prev) =>
          prev.concat({
            id: uid(),
            stage: "reviewer",
            title: isZh ? "审阅 + 结论" : "Reviewer + Conclusion",
            subtitle: failedSubtitle,
            content,
          })
        );
        return;
      }

      setMessages((prev) =>
        prev.map((m) => {
          if (!plannerDone && m.id === plannerId) {
            return { ...m, subtitle: failedSubtitle, content };
          }
          if (plannerDone && !writerDone && m.id === writerId) {
            const nextContent = m.content?.trim() ? `${m.content}\n\n${content}` : content;
            return { ...m, subtitle: failedSubtitle, content: nextContent };
          }
          if (plannerDone && writerDone && m.id === reviewerId) {
            return { ...m, stage: "reviewer", subtitle: failedSubtitle, content };
          }
          return m;
        })
      );
    } finally {
      abortRef.current = null;
    }
  }

  useEffect(() => {
    const requestedSessionId = searchParams.get("session");
    if (!sessionExists || !requestedSessionId || querySessionLoadedRef.current === requestedSessionId) return;
    querySessionLoadedRef.current = requestedSessionId;
    void handleSelectSession(requestedSessionId);
    // The URL is the source of truth for navigation from the persistent sidebar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, sessionExists]);

  async function handleSend() {
    if (mode === "detector" || mode === "note" || mode === "study") return;
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    setIsLoading(true);

    const userMsg: WorkflowMessage = { id: uid(), stage: "user", title: "You", content: userText };

    const historyForApi = [
      ...messages.map((m) => ({ role: m.stage === "user" ? ("user" as const) : ("assistant" as const), content: m.content })),
      { role: "user" as const, content: userText },
    ];

    setMessages((prev) => [...prev, userMsg]);

    try {
      if (mode === "workflow") {
        await runWorkflowSSE(historyForApi);
        return;
      }

      const placeholderId = uid();
      const placeholder: WorkflowMessage = {
        id: placeholderId,
        stage: "assistant",
        title: "Assistant",
        subtitle: isZh ? "生成中" : "Thinking",
        content: "",
      };
      setMessages((prev) => [...prev, placeholder]);

      const res = await fetchWithTimeout("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyForApi,
          mode: "single",
          chatSessionId,
          lang,
        }),
        timeoutMs: 90000,
        credentials: "include",
        cache: "no-store",
      });

      const { text, data } = await safeReadJson(res);

      if (!res.ok) {
        const quotaHit =
          (data?.error && String(data.error).toLowerCase().includes("quota")) ||
          (data?.message && String(data.message).toLowerCase().includes("quota")) ||
          (text && text.toLowerCase().includes("quota"));

        const msg = quotaHit
          ? isZh
            ? "今日额度已用完，请升级套餐。"
            : "Quota exceeded. Please upgrade."
          : data?.message || data?.error || text?.slice(0, 800) || `HTTP_${res.status}`;

        if (quotaHit) setPlanOpen(true);

        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? { ...m, stage: "assistant", title: "AI", subtitle: "Error", content: msg } : m))
        );
        return;
      }

      const okData = data && typeof data === "object" ? data : {};
      const reply: string = okData.reply ?? (isZh ? "AI 暂时没有返回内容。" : "No response from AI.");

      if (sessionExists && okData.chatSessionId) {
        setChatSessionId(okData.chatSessionId);
        loadSessions();
      }
      if (sessionExists) refreshEnt();

      const parsed = (okData?.workflow ? tryParseWorkflowReply(reply) : null) as WorkflowMessage[] | null;
      if (parsed && parsed.length) {
        let finalStep = parsed.find((s) => s.stage === "final") || null;
        if (!finalStep) finalStep = parsed[parsed.length - 1];

        const children = parsed.filter((s) => s !== finalStep).map((s) => ({ ...s, id: uid() }));

        const finalMsg: WorkflowMessage = {
          id: uid(),
          stage: "final",
          title: finalStep.title ?? (isZh ? "结论" : "Conclusion"),
          subtitle: finalStep.subtitle ?? (isZh ? "最终输出" : "Final"),
          content: finalStep.content,
          children,
          collapsed: true,
        };

        setMessages((prev) => prev.filter((m) => m.id !== placeholderId).concat(finalMsg));
        return;
      }

      const fullReply = reply;
      const step = 2;
      let i = 0;

      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          i += step;
          const slice = fullReply.slice(0, i);

          setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, content: slice } : m)));

          if (i >= fullReply.length) {
            clearInterval(timer);
            resolve();
          }
        }, 20);
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? { ...m, stage: "assistant", title: "Assistant", subtitle: undefined, content: fullReply } : m))
      );
    } catch (err: any) {
      if (mode === "workflow") return;
      const msg = normalizeFetchError(err, isZh);
      setMessages((prev) => prev.concat({ id: uid(), stage: "assistant", title: "AI", subtitle: "Error", content: msg }));
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mode === "detector" || mode === "note" || mode === "study") return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function redeemCode(code: string) {
    setRedeemError(null);
    if (!code) return;
    setRedeemLoading(true);
    try {
      const res = await fetchWithTimeout("/api/billing/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        timeoutMs: 20000,
        credentials: "include",
        cache: "no-store",
      });
      const { data } = await safeReadJson(res);
      if (!res.ok || data?.ok === false) throw new Error(data?.message || data?.error || `Redeem error: ${res.status}`);
      setRedeemSuccess({
        plan: String(data?.plan || "pro"),
        grantEndAt: data?.grantEndAt ? String(data.grantEndAt) : null,
      });
      setRedeemCodeValue("");
      await refreshEnt();
    } catch (e: any) {
      setRedeemError(e?.message || (isZh ? "兑换失败" : "Redeem failed"));
    } finally {
      setRedeemLoading(false);
    }
  }

  useEffect(() => {
    if (!redeemOpen || !redeemSuccess) return;
    const timer = window.setTimeout(() => {
      setRedeemOpen(false);
    }, 1850);
    return () => window.clearTimeout(timer);
  }, [redeemOpen, redeemSuccess]);

  function openRedeemModal(prefillCode = "") {
    setRedeemError(null);
    setRedeemSuccess(null);
    setRedeemCodeValue(prefillCode);
    setRedeemOpen(true);
  }

  async function manageBilling(plan: "pro" | "ultra") {
    try {
      const billingRoute = ent?.plan === plan ? "/api/billing/portal" : "/api/billing/checkout";
      const res = await fetchWithTimeout(billingRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeoutMs: 20000,
        credentials: "include",
        cache: "no-store",
        ...(billingRoute === "/api/billing/checkout" ? { body: JSON.stringify({ plan }) } : {}),
      });

      const { text, data } = await safeReadJson(res);

      if (!res.ok) {
        alert(`Checkout API failed (${res.status})\n` + (data?.error ? `error: ${data.error}\n` : "") + `raw: ${text}`);
        return;
      }

      if (!data?.url) {
        alert(`No checkout url returned.\nraw: ${text}`);
        return;
      }

      window.location.href = data.url;
    } catch (e: any) {
      alert(`Request error: ${e?.message || String(e)}`);
    }
  }

  const visibleAuthProviders = ["google", "github", "e2e-credentials"]
    .map((id) => authProviders[id])
    .filter((provider): provider is ClientSafeProvider => Boolean(provider));
  const userInitial = effectiveSession?.user?.name?.[0] || effectiveSession?.user?.email?.[0] || "U";
  const userLabel = effectiveSession?.user?.name || effectiveSession?.user?.email || "User";
  const userEmail = effectiveSession?.user?.email || "";

  function openAccountPage() {
    window.location.href = "/account";
  }

  function clearLocalData() {
    clearLang();
    try {
      localStorage.removeItem("theme");
    } catch {}
  }

  function setModeSafely(next: ChatMode) {
    if (!sessionExists && (next === "detector" || next === "note" || next === "study" || next === "humanizer" || next === "converter")) {
      setSignInPromptMode(next);
      return;
    }
    if (next !== "normal" && next !== "workflow") {
      router.push(routeForMode(next));
      return;
    }
    setMode(next);
  }

  return (
    <main className="aiwoven-workspace relative h-screen w-screen overflow-hidden bg-[var(--app-canvas)] font-sans text-slate-800">
      <div className="relative z-10 h-full w-full flex">
        <AIWovenAppNav
          isOwner={effectiveSession?.user?.role === "OWNER"}
          collapsible
          collapsed={workspaceNavCollapsed}
          transitionReady={workspaceNavTransitionReady}
          onToggleCollapsed={toggleWorkspaceNav}
          onBilling={() => { void refreshEnt(); setPlanOpen(true); }}
          onSettings={() => setSettingsOpen(true)}
        />
        {/* Global overlay shown only while the sidebar is open. */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar stays hidden until the menu trigger is used. */}
        <aside
          className={[
            "fixed z-50 left-0 top-0 h-full w-[280px]",
            "border-r border-slate-200 bg-white",
            "transform transition-transform duration-300 ease-out flex flex-col",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar Header */}
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-6 w-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-blue-50 blur-sm" />
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse " />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-[.06em] text-slate-500">Terminal</p>
                <p className="text-sm font-bold text-slate-800">{isZh ? "AI 工作台" : "Workspace"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNewChat}
                className="h-7 w-7 rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors flex items-center justify-center text-slate-600 shadow-sm"
                title={isZh ? "新对话" : "New Chat"}
              >
                +
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="h-7 w-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                title={isZh ? "关闭侧边栏" : "Close sidebar"}
              >
                ×
              </button>
            </div>
          </div>

          <div className="px-5 pb-2">
            <div className="h-px w-full bg-gradient-to-r from-slate-50 to-transparent" />
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 space-y-0.5 custom-scrollbar">
            {!sessionExists && (
              <div className="px-3 py-4 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                {isZh ? "未登录：不会保存历史会话。" : "Not signed in: sessions are not saved."}
              </div>
            )}

            {sessionExists && sessionsLoading && (
              <div className="px-3 py-4 text-xs text-slate-500 font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-ping" />
                {isZh ? "加载缓存中..." : "Loading cache..."}
              </div>
            )}

            {sessionExists && !sessionsLoading && sessions.length === 0 && (
              <div className="px-3 py-4 text-xs text-slate-500 italic">
                {isZh ? "暂无连接记录。" : "No connections found."}
              </div>
            )}

            {sessionExists &&
              sessions.map((s) => (
                <ChatHistoryRow
                  key={s.id}
                  s={s}
                  isActive={s.id === chatSessionId}
                  isZh={isZh}
                  busy={isLoading}
                  onSelect={() => handleSelectSession(s.id)}
                  onRenamed={() => loadSessions()}
                  onPinnedChange={() => loadSessions()}
                  onDeleted={() => {
                    if (chatSessionId === s.id) {
                      setMessages([]);
                      setInput("");
                      setChatSessionId(null);
                    }
                    loadSessions();
                  }}
                />
              ))}
          </div>

          {/* Sidebar Footer (Settings & User) */}
          <div className="p-4 mt-auto border-t border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                {isZh ? "设置" : "Settings"}
              </button>

              {sessionExists ? (
                <button
                  onClick={() => signOut()}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100"
                  title={effectiveSession?.user?.email || ""}
                >
                  <span className="text-[11px] font-semibold text-slate-800">{String(userInitial).toUpperCase()}</span>
                </button>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors text-xs font-medium"
                >
                  {isZh ? "登录" : "Sign in"}
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div data-testid="chat-main-content" className="flex-1 flex flex-col relative min-w-0 bg-white">
          {/* Header */}
          <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur md:gap-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button onClick={() => setWorkspaceNavOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 lg:hidden" aria-label="Open workspace navigation">
                <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4"><path d="M3.5 6h13M3.5 10h13M3.5 14h13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              </button>
              <button
                onClick={() => {
                  if (mode === "study") {
                    window.dispatchEvent(new Event("study:open-history"));
                    return;
                  }
                  setSidebarOpen(true);
                }}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                title={mode === "study" ? "Open Study History" : isZh ? "对话记录" : "Conversation history"}
                aria-label={mode === "study" ? "Open Study History" : isZh ? "对话记录" : "Conversation history"}
              >
                <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 8V4m0 0h4M4.7 4.3A8.5 8.5 0 1 1 3.8 15"/><path d="M12 7.5V12l3 2"/></svg>
              </button>
              <WorkspaceBreadcrumb title={workspaceModeTitle(mode, isZh)} isZh={isZh} />
            </div>

            <div className="flex items-center gap-1.5 md:gap-3">
              <ModeDropdown value={mode} onChange={setModeSafely} lang={lang} disabled={isLoading} />
              <div className="hidden md:block">
                <PlanPillButton
                  isZh={isZh}
                  plan={ent?.plan ?? "basic"}
                  unlimited={!!ent?.unlimited}
                  onClick={() => {
                    refreshEnt();
                    setPlanOpen(true);
                  }}
                />
              </div>
              <span className="hidden h-6 w-px bg-slate-200 md:block" aria-hidden />
              <HeaderAuthMenu
                isZh={isZh}
                sessionExists={sessionExists}
                userInitial={String(userInitial)}
                userLabel={userLabel}
                userEmail={userEmail}
                visibleAuthProviders={visibleAuthProviders}
                onOpenAccount={openAccountPage}
                onOpenBilling={() => {
                  refreshEnt();
                  setPlanOpen(true);
                }}
                onOpenSettings={() => setSettingsOpen(true)}
                isOwner={effectiveSession?.user?.role === "OWNER"}
                onSignOut={() => signOut()}
              />
            </div>
          </header>

          {redeemSuccess && (
            <div className="px-4 pt-4 md:px-8">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50 to-emerald-50 px-4 py-4 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-slate-100 ">
                      <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-blue-300 via-white to-emerald-300 " />
                    </div>
                    <div>
                      <p className="bg-gradient-to-r from-blue-200 via-white to-emerald-200 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
                        {isZh ? "恭喜，礼包已生效" : "Congratulations, your gift is live"}
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {formatGiftPlan(redeemSuccess.plan, isZh)} {isZh ? "已解锁，有效期至" : "unlocked, active until"}{" "}
                        <span className="font-semibold text-slate-900">{formatGiftGrantEndAt(redeemSuccess.grantEndAt, isZh)}</span>
                      </p>
                      <p className="mt-1 text-[12px] text-slate-500">
                        {isZh ? "现在可以使用已解锁的高级功能。" : "Your upgraded features are ready to use now."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setRedeemSuccess(null)}
                    className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[12px] font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    {isZh ? "知道了" : "Dismiss"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="sr-only">
            <p>AI Chat</p>
            <h1>AIWoven AI chat workspace for direct conversations and workflow collaboration</h1>
            <p>
              Use this route for direct chat with AIWoven. You can stay in normal chat, switch to workflow chat, or jump into the dedicated tool routes for AI Note, AI Detector, AI Study, AI Humanizer, and Converter.
            </p>
          </div>

          {/* Body */}
          {mode === "detector" ? (
            <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-8">
              <DetectorUI isLoadingGlobal={isLoading} isZh={isZh} locked={detectorLocked} canSeeSuspicious={!!ent?.canSeeSuspiciousSentences} />
            </div>
          ) : mode === "humanizer" ? (
            <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-8">
              <HumanizerUI isZh={isZh} locked={humanizerLocked} entitlement={ent} onUsageRefresh={refreshEnt} />
            </div>
          ) : mode === "converter" ? (
            <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-8">
              <ConverterUI isZh={isZh} locked={converterLocked} entitlement={ent} />
            </div>
          ) : mode === "note" ? (
            <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-8">
              <NoteUI isLoadingGlobal={isLoading} isZh={isZh} locked={noteLocked} entitlement={ent} onUsageRefresh={refreshEnt} />
            </div>
          ) : mode === "study" ? (
            <StudyUI isZh={isZh} locked={studyLocked} entitlement={ent} onUsageRefresh={refreshEnt} />
          ) : (
            <>
              {/* Chat Message Area */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 custom-scrollbar scroll-smooth">
                {messages.length === 0 && !isLoading && (
                  <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center py-8 text-center">
                    <NexusOrb sizeClass="h-10 w-10" className="mb-5" />
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                      {mode === "workflow"
                        ? isZh ? "规划、撰写、审阅，一步到位" : "Plan, draft, and review in one run"
                        : isZh ? "今天想完成什么？" : "What can I help you with today?"}
                    </h2>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                      {mode === "workflow"
                        ? isZh ? "工作流模式会依次调用规划、撰写和审阅代理，给出更完整的结果。" : "Workflow mode routes your request through a planner, writer, and reviewer for more complete answers."
                        : isZh ? "提问、起草、总结或学习——AIWoven 助手会在同一个工作区中帮你完成。" : "Ask questions, draft, summarize, or study — AIWoven Assistant works alongside your other tools."}
                    </p>
                    <div className="mt-8 grid w-full gap-3 text-left sm:grid-cols-2">
                      {(isZh
                        ? [
                            { title: "总结讲座内容", body: "把一段讲座笔记整理成要点和关键术语", prompt: "请把以下讲座内容总结成要点，并列出关键术语：\n\n" },
                            { title: "通俗解释概念", body: "用简单的例子解释一个复杂的概念", prompt: "请用简单的例子向大学新生解释这个概念：" },
                            { title: "检测 AI 写作", body: "打开 AI 检测器检查你的文稿", href: "/ai-detector" },
                            { title: "从文档生成闪卡", body: "上传 PDF、DOCX 或 PPTX 开始学习", href: "/ai-study" },
                          ]
                        : [
                            { title: "Summarize a lecture", body: "Turn lecture notes into key points and terms", prompt: "Summarize the following lecture into key points and list the important terms:\n\n" },
                            { title: "Explain a concept simply", body: "Get a clear explanation with an everyday example", prompt: "Explain this concept to a first-year student using a simple example: " },
                            { title: "Check writing for AI", body: "Open the AI Detector to review a draft", href: "/ai-detector" },
                            { title: "Make flashcards from a file", body: "Upload a PDF, DOCX, or PPTX in AI Study", href: "/ai-study" },
                          ]
                      ).map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => {
                            if ("href" in item && item.href) {
                              router.push(item.href);
                              return;
                            }
                            if ("prompt" in item && item.prompt) setInput(item.prompt);
                          }}
                          className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
                        >
                          <span className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                            {item.title}
                            <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"><path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                          <span className="mt-1 block text-[13px] leading-5 text-slate-500">{item.body}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {mode === "workflow" ? (
                  messages.map((m) => (
                    <Bubble
                      key={m.id}
                      msg={m}
                      isZh={isZh}
                      onToggle={(id) => {
                        setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, collapsed: !(x.collapsed !== false) } : x)));
                      }}
                    />
                  ))
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex w-full ${m.stage === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={[
                          "px-4 py-3 rounded-2xl text-[14px] leading-relaxed max-w-[85%] md:max-w-[75%] whitespace-pre-wrap transition-all",
                          m.stage === "user"
                            ? "bg-blue-600 text-white rounded-br-md"
                            : copiedMessageId === m.id
                            ? "bg-white text-slate-800 border border-emerald-200 rounded-bl-sm shadow-[0_0_0_1px_rgba(52,211,153,0.18)]"
                            : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm",
                        ].join(" ")}
                      >
                        {m.stage === "assistant" ? <AiFormattedText text={m.content} className="text-[14px] leading-relaxed" /> : m.content}
                        {m.stage === "assistant" ? (
                          <div className="mt-3 flex items-center justify-end pt-1">
                            <CopyButton text={m.content} onCopied={() => setCopiedMessageId(m.id)} className="bg-white hover:bg-white" />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}

                {isLoading && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm" role="status">
                    <span className="flex gap-1" aria-hidden>
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                    </span>
                    <span className="text-[13px] text-slate-500">{isZh ? "正在思考…" : "Thinking…"}</span>
                  </div>
                )}

                <div className="h-4" />
              </div>

              {/* Input Area (Console Style) */}
              <div className="shrink-0 bg-gradient-to-t from-[var(--app-canvas)] via-[var(--app-canvas)] to-transparent p-4 pt-2 md:px-8 md:pb-6">
                <div
                  id="chat-composer"
                  data-testid="chat-composer"
                  className={`mx-auto flex w-full flex-col gap-2 transition-[max-width] duration-200 ease-out motion-reduce:transition-none ${workspaceNavCollapsed ? "max-w-6xl" : "max-w-5xl"}`}
                >
                  <div className="relative flex items-end rounded-2xl border border-slate-300 bg-white shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <textarea
                      className="custom-scrollbar max-h-40 min-h-[56px] w-full flex-1 resize-none bg-transparent px-4 py-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                      placeholder={isZh ? "给 AIWoven 助手发送消息…" : "Message AIWoven Assistant…"}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      rows={1}
                      style={{ height: "auto" }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
                      }}
                    />

                    <div className="pr-3 pb-3 shrink-0">
                      <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="flex h-10 w-10 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none md:w-auto md:px-4"
                      >
                        <span className="hidden md:inline">{isZh ? "发送" : "Send"}</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 px-2 text-[12px] text-slate-400">
                    <span className="hidden sm:inline">{isZh ? "Enter 发送 · Shift + Enter 换行 · AI 可能出错，请核实重要信息。" : "Enter to send · Shift + Enter for a new line · AI can make mistakes; verify important information."}</span>
                  {sessionExists && ent && !ent.unlimited && ent.plan === "basic" && (
                    <div className="flex shrink-0 items-center gap-3 text-[12px] text-slate-500">
                      <span>
                        {isZh ? "今日额度" : "Today"}{" "}
                        <span className="font-medium tabular-nums text-slate-700">
                          {ent.usedChatCountToday}/{ent.chatPerDay}
                        </span>
                      </span>
                      <button onClick={() => setPlanOpen(true)} className="font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline">
                        {isZh ? "升级" : "Upgrade"}
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {workspaceNavOpen ? <div className="fixed inset-0 z-[80] lg:hidden"><button type="button" className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setWorkspaceNavOpen(false)} aria-label="Close workspace navigation"/><div className="absolute inset-y-0 left-0"><AIWovenAppNav mobile isOwner={effectiveSession?.user?.role === "OWNER"} onClose={() => setWorkspaceNavOpen(false)} onBilling={() => { void refreshEnt(); setPlanOpen(true); }} onSettings={() => setSettingsOpen(true)} /></div></div> : null}

      {/* Modals */}
      {signInPromptMode ? (
        <WorkspaceSignInPrompt
          modal
          isZh={isZh}
          toolName={workspaceModeTitle(signInPromptMode, isZh)}
          callbackUrl={routeForMode(signInPromptMode)}
          providers={visibleAuthProviders}
          onClose={() => setSignInPromptMode(null)}
        />
      ) : null}
      <PlanModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        isZh={isZh}
        sessionExists={sessionExists}
        ent={ent}
        onOpenRedeem={() => {
          if (!sessionExists) return signIn();
          openRedeemModal();
        }}
        onManageBilling={manageBilling}
        refreshEnt={refreshEnt}
      />

      <ProTrialWheelReminderPrompt
        open={trialWheel.reminderOpen}
        dontRemindAgain={trialWheel.reminderDismissed}
        onDontRemindAgainChange={trialWheel.setReminderDismissed}
        onSpinNow={trialWheel.openWheelFromReminder}
        onMaybeLater={() => trialWheel.closeReminder({ dontRemindAgain: trialWheel.reminderDismissed })}
      />

      <ProTrialWheelModal
        open={trialWheel.open}
        onClose={trialWheel.closeWheel}
        onUseCode={(code) => {
          openRedeemModal(code);
          trialWheel.clearSpinResult();
          trialWheel.closeWheel();
        }}
        status={trialWheel.status}
        spinResult={trialWheel.spinResult}
        spinSequence={trialWheel.spinSequence}
        spinning={trialWheel.spinning}
        error={trialWheel.error}
        onSpin={trialWheel.spinWheel}
      />

      <RedeemModal
        open={redeemOpen}
        onClose={() => setRedeemOpen(false)}
        isZh={isZh}
        code={redeemCodeValue}
        onCodeChange={setRedeemCodeValue}
        onRedeem={redeemCode}
        onOpenTrialWheel={() => void trialWheel.openWheel()}
        loading={redeemLoading}
        error={redeemError}
        success={redeemSuccess}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isZh={isZh}
        lang={lang}
        setLang={setLang}
        sessionExists={sessionExists}
        accountLabel={effectiveSession?.user?.email ?? effectiveSession?.user?.name ?? null}
        ent={ent}
        mode={mode}
        onOpenPlan={() => {
          refreshEnt();
          setPlanOpen(true);
        }}
        onOpenRedeem={() => {
          if (!sessionExists) return signIn();
          openRedeemModal();
        }}
        onSignOut={sessionExists ? () => signOut() : undefined}
        onClearLocalData={clearLocalData}
      />

      <style jsx global>{`
        .base-grid {
          background-image: radial-gradient(rgba(15, 23, 42, 0.06) 1px, transparent 1px);
          background-size: 24px 24px;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.28);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.45);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 116, 139, 0.35) transparent;
        }

        textarea {
          outline: none;
        }
      `}</style>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-white flex items-center justify-center text-slate-500 font-mono text-sm">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-3" />
          INITIALIZING...
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}


