"use client";

import { useState } from "react";
import { KanbanColumnWithLeads, KanbanLead } from "@/lib/types";
import { KanbanCard } from "./kanban-card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 p-2 space-y-2 overflow-y-auto min-h-24 transition-colors ${isOver ? "bg-primary/5" : ""}`}
    >
      {children}
    </div>
  );
}

interface KanbanBoardProps {
  boardId: string;
  columns: KanbanColumnWithLeads[];
  onColumnsChange: (columns: KanbanColumnWithLeads[]) => void;
}

export function KanbanBoard({ boardId, columns, onColumnsChange }: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<{ lead: KanbanLead; columnId: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Find column by card ID prefix (e.g. "col-id:lead-id" → col-id)
  function findColumnById(cardId: string) {
    const [columnId] = (cardId as string).split(":");
    return columns.find((col) => col.id === columnId);
  }

  // Find which column actually contains a lead right now (after optimistic moves)
  function findColumnOfLead(leadId: string) {
    return columns.find((col) => col.leads.some((l) => l.id === leadId));
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current as { lead: KanbanLead; columnId: string } | undefined;
    if (data) {
      setActiveCard({ ...data, columnId: data.columnId });
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeLeadId = activeId.split(":")[1];
    // Find where the lead actually is now (not where it started)
    const activeCol = findColumnOfLead(activeLeadId);
    // over can be a column ID directly or a card ID
    const overCol = columns.find((c) => c.id === overId) || findColumnById(overId);

    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    const lead = activeCol.leads.find((l) => l.id === activeLeadId);
    if (!lead) return;

    const newColumns = columns.map((col) => {
      if (col.id === activeCol.id) {
        return { ...col, leads: col.leads.filter((l) => l.id !== activeLeadId) };
      }
      if (col.id === overCol.id) {
        const hasLead = col.leads.some((l) => l.id === activeLeadId);
        if (hasLead) return col;
        return { ...col, leads: [...col.leads, lead] };
      }
      return col;
    });

    onColumnsChange(newColumns);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const originalColumnId = activeCard?.columnId;
    setActiveCard(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const leadId = activeId.split(":")[1];

    const overId = over.id as string;
    const toColumn = columns.find((c) => c.id === overId) || findColumnById(overId);

    if (!toColumn) return;
    // Use the original column from drag start (not the ID prefix which doesn't change)
    const fromColumnId = originalColumnId || activeId.split(":")[0];
    if (fromColumnId === toColumn.id) return; // Same column, no API call needed

    try {
      const res = await fetch(`/api/boards/${boardId}/leads/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          from_column_id: fromColumnId,
          to_column_id: toColumn.id,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao mover lead.");
      }
    } catch {
      toast.error("Erro ao mover lead. Recarregando...");
      window.location.reload();
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-160px)]">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex flex-col w-72 min-w-72 rounded-lg bg-muted/50 border"
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{column.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {column.leads.length}
              </Badge>
            </div>

            {/* Cards area */}
            <SortableContext
              id={column.id}
              items={column.leads.map((l) => `${column.id}:${l.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <DroppableColumn id={column.id}>
                {column.leads.map((lead) => (
                  <KanbanCard key={lead.id} lead={lead} columnId={column.id} />
                ))}
                {column.leads.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                    Solte um lead aqui
                  </div>
                )}
              </DroppableColumn>
            </SortableContext>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="rounded-lg border bg-card p-3 shadow-lg w-72 opacity-90">
            <p className="font-medium text-sm">{activeCard.lead.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCard.lead.whatsapp}
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
