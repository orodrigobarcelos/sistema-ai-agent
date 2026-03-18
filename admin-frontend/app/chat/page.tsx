"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatConversation, ChatMessage, ChatLeadInfo, ChatMedia } from "@/lib/types";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatLeadInfoPanel } from "@/components/chat/chat-lead-info";
import { supabaseClient } from "@/lib/supabase-client";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [leadInfo, setLeadInfo] = useState<ChatLeadInfo | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [aiPaused, setAiPaused] = useState(false);
  const [mediaMap, setMediaMap] = useState<Map<number, ChatMedia>>(new Map());

  const pollConversationsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedSessionIdRef = useRef<string | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (!res.ok) throw new Error();
      const data: ChatConversation[] = await res.json();
      setConversations(data);
    } catch {
      // Silent fail for polling
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (sessionId: string) => {
    try {
      const params = new URLSearchParams({ session_id: sessionId });
      const res = await fetch(`/api/chat/messages?${params}`);
      if (!res.ok) throw new Error();
      const data: ChatMessage[] = await res.json();
      setMessages(data);
    } catch {
      // Silent fail
    }
  }, []);

  // Fetch lead info
  const fetchLeadInfo = useCallback(async (sessionId: string) => {
    setLeadLoading(true);
    try {
      const res = await fetch(
        `/api/chat/lead?session_id=${encodeURIComponent(sessionId)}`
      );
      if (!res.ok) throw new Error();
      const data: ChatLeadInfo = await res.json();
      setLeadInfo(data);
    } catch {
      setLeadInfo(null);
    } finally {
      setLeadLoading(false);
    }
  }, []);

  // Fetch pause status
  const fetchPauseStatus = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(sessionId)}/pause`);
      if (!res.ok) return;
      const data = await res.json();
      setAiPaused(data.ai_paused);
    } catch {
      setAiPaused(false);
    }
  }, []);

  // Fetch media for session
  const fetchMedia = useCallback(async (sessionId: string) => {
    try {
      const { data } = await supabaseClient
        .from("chat_media")
        .select("*")
        .eq("session_id", sessionId);

      if (data) {
        const map = new Map<number, ChatMedia>();
        for (const m of data) {
          if (m.message_id) map.set(m.message_id, m as ChatMedia);
        }
        setMediaMap(map);
      }
    } catch {
      // Silent fail
    }
  }, []);

  // Toggle pause
  async function handleTogglePause() {
    if (!selectedSessionId) return;
    try {
      const res = await fetch(
        `/api/chat/${encodeURIComponent(selectedSessionId)}/pause`,
        { method: "PUT" }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAiPaused(data.ai_paused);
      toast.success(
        data.ai_paused
          ? "IA pausada. Responda manualmente."
          : "IA retomada. A IA voltará a responder."
      );
    } catch {
      toast.error("Erro ao alterar estado da IA.");
    }
  }

  // Initial load of conversations
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Poll conversations every 10 seconds
  useEffect(() => {
    pollConversationsRef.current = setInterval(fetchConversations, 10000);
    return () => {
      if (pollConversationsRef.current) {
        clearInterval(pollConversationsRef.current);
      }
    };
  }, [fetchConversations]);

  // Keep ref in sync with state for realtime callback
  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  // When session changes: load messages + lead info + pause status + media
  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      setLeadInfo(null);
      setAiPaused(false);
      setMediaMap(new Map());
      return;
    }

    fetchMessages(selectedSessionId);
    fetchLeadInfo(selectedSessionId);
    fetchPauseStatus(selectedSessionId);
    fetchMedia(selectedSessionId);
  }, [selectedSessionId, fetchMessages, fetchLeadInfo, fetchPauseStatus, fetchMedia]);

  // Supabase Realtime: listen for new messages + deletions + media
  useEffect(() => {
    const channel = supabaseClient
      .channel("chat-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "n8n_chat_histories_whatsapp",
        },
        (payload) => {
          const row = payload.new as {
            id: number;
            session_id: string;
            message: { type: string; content: string };
            created_at: string;
          };

          const newMessage: ChatMessage = {
            id: row.id,
            session_id: row.session_id,
            type: row.message.type as "human" | "ai",
            content: row.message.content || "",
            created_at: row.created_at,
          };

          if (row.session_id === selectedSessionIdRef.current) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) return prev;

              // Deduplicate: skip if new human message equals or contains the last human message
              // But NOT for media placeholders (they legitimately repeat, e.g. two images)
              if (newMessage.type === "human") {
                const trimmed = newMessage.content.trim();
                const isPlaceholder = trimmed.startsWith("[O usuário enviou");
                if (!isPlaceholder) {
                  const lastHuman = [...prev].reverse().find((m) => m.type === "human");
                  if (lastHuman) {
                    const lastContent = lastHuman.content.trim();
                    if (trimmed === lastContent || trimmed.includes(lastContent)) {
                      return prev;
                    }
                  }
                }
              }

              return [...prev, newMessage];
            });
          }

          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "n8n_chat_histories_whatsapp",
        },
        (payload) => {
          const oldRow = payload.old as { id: number };
          if (oldRow.id) {
            setMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_media",
        },
        (payload) => {
          const row = payload.new as ChatMedia;
          if (
            row.session_id === selectedSessionIdRef.current &&
            row.message_id
          ) {
            setMediaMap((prev) => {
              const next = new Map(prev);
              next.set(row.message_id!, row);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [fetchConversations]);

  // Send text message
  async function handleSend(message: string) {
    if (!selectedSessionId || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: selectedSessionId, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar mensagem.");
        return;
      }

      if (data.warning) {
        toast.warning(data.warning);
      }
    } catch {
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  // Send media message
  async function handleSendMedia(file: File) {
    if (!selectedSessionId || sending) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("session_id", selectedSessionId);

      const res = await fetch("/api/chat/send-media", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar mídia.");
        return;
      }

      if (data.warning) {
        toast.warning(data.warning);
      }
    } catch {
      toast.error("Erro ao enviar mídia.");
    } finally {
      setSending(false);
    }
  }

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (conv.lead_name && conv.lead_name.toLowerCase().includes(q)) ||
      conv.lead_phone.includes(q)
    );
  });

  // Get selected conversation for header info
  const selectedConversation = conversations.find(
    (c) => c.session_id === selectedSessionId
  );

  return (
    <div className="-m-8 flex h-[calc(100vh)] bg-background overflow-hidden">
      {/* Left sidebar - conversations */}
      <div className="w-[320px] flex-shrink-0">
        {loadingConversations ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        ) : (
          <ChatSidebar
            conversations={filteredConversations}
            selectedSessionId={selectedSessionId}
            onSelect={setSelectedSessionId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
      </div>

      {/* Center - chat area */}
      <div className="flex-1 flex flex-col min-w-0 border-r overflow-hidden">
        {selectedSessionId ? (
          <>
            <div className="flex-1 min-h-0">
              <ChatMessages
                messages={messages}
                leadName={selectedConversation?.lead_name || null}
                leadPhone={
                  selectedConversation?.lead_phone ||
                  selectedSessionId.replace("@s.whatsapp.net", "")
                }
                aiPaused={aiPaused}
                onTogglePause={handleTogglePause}
                mediaMap={mediaMap}
              />
            </div>
            <ChatInput onSend={handleSend} onSendMedia={handleSendMedia} disabled={sending} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <MessageSquare className="h-12 w-12 opacity-30" />
            <p className="text-sm">Selecione uma conversa para visualizar</p>
          </div>
        )}
      </div>

      {/* Right sidebar - lead info */}
      <div className="w-[280px] flex-shrink-0">
        <ChatLeadInfoPanel lead={leadInfo} loading={leadLoading} />
      </div>
    </div>
  );
}
