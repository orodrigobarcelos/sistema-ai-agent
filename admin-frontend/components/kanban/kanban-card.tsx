"use client";

import { KanbanLead } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface KanbanCardProps {
  lead: KanbanLead;
  columnId: string;
}

export function KanbanCard({ lead, columnId }: KanbanCardProps) {
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

  const phone = lead.whatsapp.replace(/^\+55/, "");
  const formattedPhone = phone.length === 11
    ? `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`
    : phone;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <p className="font-medium text-sm truncate">{lead.name}</p>
      <p className="text-xs text-muted-foreground mt-1">{formattedPhone}</p>
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
  );
}
