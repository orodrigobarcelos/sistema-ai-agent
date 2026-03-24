"use client";

import { useState } from "react";
import { KanbanLead } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LeadDetailDialog } from "./lead-detail-dialog";

interface KanbanCardProps {
  lead: KanbanLead;
  columnId: string;
}

export function KanbanCard({ lead, columnId }: KanbanCardProps) {
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${columnId}:${lead.id}`,
    data: { lead, columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const digits = lead.whatsapp.replace(/\D/g, "");
  const isBrazil = digits.startsWith("55") && (digits.length === 12 || digits.length === 13);
  const formattedPhone = isBrazil
    ? `(${digits.slice(2, 4)}) ${digits.slice(4, digits.length - 4)}-${digits.slice(-4)}`
    : lead.whatsapp;

  const openChatwoot = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/chatwoot/conversation-url?phone=${encodeURIComponent(lead.whatsapp)}`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDetailOpen(true);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{lead.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{formattedPhone}</p>
          </div>
          <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={openDetail}
              title="Ver detalhes do lead"
              className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-muted"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={openChatwoot}
              title="Abrir conversa no Chatwoot"
              className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-muted"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {lead.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 border"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color || undefined,
                  borderColor: `${tag.color}40`,
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <LeadDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        leadId={lead.id}
        leadPhone={lead.whatsapp}
        leadName={lead.name}
      />
    </>
  );
}
