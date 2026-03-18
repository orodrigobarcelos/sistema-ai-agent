"use client";

import { ChatLeadInfo } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Phone,
  Instagram,
  Tag,
  Globe,
  Calendar,
  Columns3,
} from "lucide-react";

interface ChatLeadInfoProps {
  lead: ChatLeadInfo | null;
  loading?: boolean;
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <div className="text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export function ChatLeadInfoPanel({ lead, loading }: ChatLeadInfoProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
        Selecione uma conversa para ver os detalhes do lead
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto border-l">
      {/* Header with avatar */}
      <div className="flex flex-col items-center p-4 border-b">
        {lead.profile_pic_url ? (
          <img
            src={lead.profile_pic_url}
            alt=""
            className="h-16 w-16 rounded-full object-cover mb-2"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold mb-2">
            {lead.name
              ? lead.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              : "?"}
          </div>
        )}
        <h3 className="text-sm font-semibold text-center">
          {lead.name || "Sem nome"}
        </h3>
        <p className="text-xs text-muted-foreground">{lead.phone}</p>
      </div>

      {/* Details */}
      <div className="p-4 space-y-1 divide-y divide-border/50">
        <InfoRow icon={User} label="Nome">
          {lead.name ? <span>{lead.name}</span> : null}
        </InfoRow>

        <InfoRow icon={Phone} label="Telefone">
          <span>{lead.phone}</span>
        </InfoRow>

        {lead.ig_username && (
          <InfoRow icon={Instagram} label="Instagram">
            <a
              href={`https://instagram.com/${lead.ig_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @{lead.ig_username}
            </a>
          </InfoRow>
        )}

        {lead.tags.length > 0 && (
          <InfoRow icon={Tag} label="Tags">
            <div className="flex flex-wrap gap-1 mt-1">
              {lead.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                  style={
                    tag.color
                      ? {
                          backgroundColor: tag.color + "20",
                          color: tag.color,
                          borderColor: tag.color + "40",
                        }
                      : undefined
                  }
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </InfoRow>
        )}

        {lead.utm_source && (
          <InfoRow icon={Globe} label="Origem (UTM)">
            <span>{lead.utm_source}</span>
          </InfoRow>
        )}

        {lead.kanban_position && (
          <InfoRow icon={Columns3} label="Kanban">
            <span>
              {lead.kanban_position.board_name} &rarr;{" "}
              {lead.kanban_position.column_name}
            </span>
          </InfoRow>
        )}

        {lead.created_at && (
          <InfoRow icon={Calendar} label="Inscrito em">
            <span>
              {new Date(lead.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </InfoRow>
        )}
      </div>
    </div>
  );
}
