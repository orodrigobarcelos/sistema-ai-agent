"use client";

import { ChatConversation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ChatSidebarProps {
  conversations: ChatConversation[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

function getInitials(name: string | null, phone: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return phone.slice(-2);
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function truncateMessage(message: string, maxLength: number = 50): string {
  // Try to parse JSON message format
  try {
    const parsed = JSON.parse(message);
    if (parsed.mensagens && Array.isArray(parsed.mensagens)) {
      message = parsed.mensagens[0] || message;
    }
  } catch {
    // not JSON, use as-is
  }

  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + "...";
}

export function ChatSidebar({
  conversations,
  selectedSessionId,
  onSelect,
  searchQuery,
  onSearchChange,
}: ChatSidebarProps) {
  return (
    <div className="flex flex-col h-full border-r bg-muted/20">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma conversa encontrada
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.session_id}
              onClick={() => onSelect(conv.session_id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50 border-b border-border/50",
                selectedSessionId === conv.session_id && "bg-accent"
              )}
            >
              {conv.profile_pic_url ? (
                <img
                  src={conv.profile_pic_url}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {getInitials(conv.lead_name, conv.lead_phone)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {conv.lead_name || conv.lead_phone}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">
                    {formatRelativeTime(conv.last_message_at)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {truncateMessage(conv.last_message)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
