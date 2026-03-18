"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChatMessage, ChatMedia } from "@/lib/types";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/lib/supabase-client";
import { Pause, Play, Image, FileAudio, FileVideo, FileDown, Sticker } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessagesProps {
  messages: ChatMessage[];
  leadName: string | null;
  leadPhone: string;
  aiPaused: boolean;
  onTogglePause: () => void;
  mediaMap: Map<number, ChatMedia>;
}

const MEDIA_PLACEHOLDERS: Record<string, string> = {
  "[O usuário enviou uma imagem]": "image",
  "[O usuário enviou um áudio]": "audio",
  "[O usuário enviou um vídeo]": "video",
  "[O usuário enviou um documento]": "document",
  "[O usuário enviou uma figurinha]": "sticker",
};

const MEDIA_DESCRIPTION_MARKER = "[O usuário enviou um";

function isMediaPlaceholder(content: string): string | null {
  const trimmed = content.trim();
  return MEDIA_PLACEHOLDERS[trimmed] ?? null;
}

function isMediaDescription(content: string): boolean {
  return content.includes(MEDIA_DESCRIPTION_MARKER) && (content.includes("Descrição") || content.includes("Transcrição"));
}


function getMediaUrl(storagePath: string): string {
  // Strip bucket name prefix if present (N8N may include it)
  const cleanPath = storagePath.replace(/^chat-media\//, "");
  const { data } = supabaseClient.storage
    .from("chat-media")
    .getPublicUrl(cleanPath);
  return data.publicUrl;
}

function MediaIcon({ mediaType }: { mediaType: string }) {
  switch (mediaType) {
    case "image": return <Image className="h-5 w-5" />;
    case "audio": return <FileAudio className="h-5 w-5" />;
    case "video": return <FileVideo className="h-5 w-5" />;
    case "sticker": return <Sticker className="h-5 w-5" />;
    default: return <FileDown className="h-5 w-5" />;
  }
}

function extractDescriptionText(content: string): string | null {
  const match = content.match(/(?:Descrição|Transcrição)[^:]*:\s*([\s\S]*)/);
  return match ? match[1].trim() : null;
}

function buildDescriptionMap(messages: ChatMessage[], mediaMap: Map<number, ChatMedia>): Map<number, string> {
  const map = new Map<number, string>();
  const mediaIds: number[] = [];

  for (const msg of messages) {
    const hasLinkedMedia = mediaMap.has(msg.id);

    // Track media messages (exact placeholder OR has linked chat_media)
    if (isMediaPlaceholder(msg.content.trim()) || hasLinkedMedia) {
      mediaIds.push(msg.id);

      // If this message itself contains description/transcription, extract it
      if (hasLinkedMedia && isMediaDescription(msg.content)) {
        const text = extractDescriptionText(msg.content);
        if (text) map.set(msg.id, text);
      }
    }

    // Separate description message (no linked media) → associate with previous media
    if (!hasLinkedMedia && isMediaDescription(msg.content)) {
      const text = extractDescriptionText(msg.content);
      if (text && mediaIds.length > 0) {
        const lastMediaId = mediaIds[mediaIds.length - 1];
        if (!map.has(lastMediaId)) {
          map.set(lastMediaId, text);
        }
      }
    }
  }

  return map;
}

function MediaContent({ media, description }: { media: ChatMedia; description?: string }) {
  const url = getMediaUrl(media.storage_path);

  switch (media.media_type) {
    case "image":
    case "sticker":
      return (
        <img
          src={url}
          alt=""
          className="max-w-full max-h-[300px] rounded-lg object-contain cursor-pointer"
          loading="lazy"
          onClick={() => window.open(url, "_blank")}
        />
      );
    case "audio":
      return (
        <div>
          <audio src={url} controls className="max-w-full min-w-[200px]" />
          {description && (
            <p className="text-xs mt-1.5 opacity-70 italic">{description}</p>
          )}
        </div>
      );
    case "video":
      return (
        <video
          src={url}
          controls
          className="max-w-full max-h-[300px] rounded-lg"
        />
      );
    case "document":
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm hover:underline"
        >
          <FileDown className="h-4 w-4" />
          <span>Abrir documento</span>
        </a>
      );
    default:
      return null;
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function parseMessageContent(content: string): string[] {
  const textToParse = content.trim();
  try {
    const parsed = JSON.parse(textToParse);
    if (parsed.mensagens && Array.isArray(parsed.mensagens)) {
      return parsed.mensagens.filter(
        (m: unknown) => typeof m === "string" && m.trim() !== ""
      );
    }
  } catch {
    const match = textToParse.match(/\{"mensagens":\s*\[/);
    if (match) {
      try {
        const cleaned = textToParse
          .replace(/\\"/g, '"')
          .replace(/\\n/g, "\n");
        const parsed = JSON.parse(cleaned);
        if (parsed.mensagens && Array.isArray(parsed.mensagens)) {
          return parsed.mensagens.filter(
            (m: unknown) => typeof m === "string" && m.trim() !== ""
          );
        }
      } catch {
        // Give up on JSON parsing
      }
    }
  }
  return [content];
}

function MessageBubble({
  content,
  type,
  time,
  messageId,
  mediaMap,
  description,
}: {
  content: string;
  type: "human" | "ai";
  time: string;
  messageId: number;
  mediaMap: Map<number, ChatMedia>;
  description?: string;
}) {
  const isHuman = type === "human";
  const mediaType = isMediaPlaceholder(content);
  const media = mediaMap.get(messageId);

  // Media message (exact placeholder OR has linked chat_media)
  if (mediaType || media) {
    const displayMediaType = mediaType || media?.media_type || "document";
    return (
      <div
        className={cn(
          "rounded-2xl px-3 py-2 shadow-sm",
          isHuman
            ? "bg-muted text-foreground rounded-bl-sm"
            : "bg-primary text-primary-foreground rounded-br-sm"
        )}
      >
        {media ? (
          <MediaContent media={media} description={description} />
        ) : (
          <div className="flex items-center gap-2 py-2 opacity-70">
            <MediaIcon mediaType={displayMediaType} />
            <span className="text-sm">
              {content.replace(/[\[\]]/g, "")}
            </span>
          </div>
        )}
        <p
          className={cn(
            "text-[10px] mt-1 text-right",
            isHuman ? "text-muted-foreground" : "text-primary-foreground/70"
          )}
        >
          {time}
        </p>
      </div>
    );
  }

  // Text message
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-2 text-sm shadow-sm",
        isHuman
          ? "bg-muted text-foreground rounded-bl-sm"
          : "bg-primary text-primary-foreground rounded-br-sm"
      )}
    >
      <p className="whitespace-pre-wrap break-words">{content}</p>
      <p
        className={cn(
          "text-[10px] mt-1 text-right",
          isHuman ? "text-muted-foreground" : "text-primary-foreground/70"
        )}
      >
        {time}
      </p>
    </div>
  );
}

export function ChatMessages({
  messages,
  leadName,
  leadPhone,
  aiPaused,
  onTogglePause,
  mediaMap,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const isFirstLoad = prevMessageCountRef.current === 0;
      scrollToBottom(isFirstLoad ? "instant" : "smooth");
      setTimeout(() => scrollToBottom("smooth"), 400);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Scroll when new media arrives (mediaMap changes but messages.length doesn't)
  const prevMediaCountRef = useRef(0);
  useEffect(() => {
    if (mediaMap.size > prevMediaCountRef.current) {
      scrollToBottom("smooth");
      setTimeout(() => scrollToBottom("smooth"), 400);
    }
    prevMediaCountRef.current = mediaMap.size;
  }, [mediaMap.size, scrollToBottom]);

  // Build description/transcription map for media messages
  const descriptionMap = buildDescriptionMap(messages, mediaMap);

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const msgDate = formatDate(msg.created_at);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-sm">
        <div>
          <h3 className="text-sm font-semibold">
            {leadName || leadPhone}
          </h3>
          {leadName && (
            <p className="text-xs text-muted-foreground">{leadPhone}</p>
          )}
        </div>
        <Button
          variant={aiPaused ? "default" : "outline"}
          size="sm"
          onClick={onTogglePause}
          className={cn(
            "gap-1.5 text-xs h-8",
            aiPaused && "bg-amber-500 hover:bg-amber-600 text-white"
          )}
        >
          {aiPaused ? (
            <>
              <Play className="h-3.5 w-3.5" />
              Retomar IA
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5" />
              Pausar IA
            </>
          )}
        </Button>
      </div>

      {/* Pause banner */}
      {aiPaused && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-center">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            IA pausada &mdash; respondendo manualmente
          </p>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-muted/10"
      >
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <span className="text-[11px] text-muted-foreground bg-muted/80 px-3 py-1 rounded-full">
                {group.date}
              </span>
            </div>

            {/* Messages in group */}
            {group.messages.map((msg) => {
              const isHuman = msg.type === "human";

              const hasLinkedMedia = mediaMap.has(msg.id);

              // Hide description messages only if they DON'T have linked media
              if (!hasLinkedMedia && isMediaDescription(msg.content)) {
                return null;
              }

              const mediaType = isMediaPlaceholder(msg.content);

              // For media messages (exact placeholder OR has linked chat_media)
              if (mediaType || hasLinkedMedia) {
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex mb-2",
                      isHuman ? "justify-start" : "justify-end"
                    )}
                  >
                    <div className={cn("max-w-[75%]", isHuman ? "items-start" : "items-end")}>
                      <MessageBubble
                        content={msg.content}
                        type={msg.type}
                        time={formatTime(msg.created_at)}
                        messageId={msg.id}
                        mediaMap={mediaMap}
                        description={descriptionMap.get(msg.id)}
                      />
                    </div>
                  </div>
                );
              }

              // For text messages, parse and render (possibly multiple bubbles)
              const bubbles = parseMessageContent(msg.content);
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex mb-2",
                    isHuman ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-col gap-1 max-w-[75%]",
                      isHuman ? "items-start" : "items-end"
                    )}
                  >
                    {bubbles.map((text, i) => (
                      <MessageBubble
                        key={`${msg.id}-${i}`}
                        content={text}
                        type={msg.type}
                        time={
                          i === bubbles.length - 1
                            ? formatTime(msg.created_at)
                            : ""
                        }
                        messageId={msg.id}
                        mediaMap={mediaMap}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Nenhuma mensagem ainda
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
