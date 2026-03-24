"use client";

import { useCallback, useEffect, useState } from "react";
import { BoardColumn } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ColumnManagerProps {
  boardId: string;
}

export function ColumnManager({ boardId }: ColumnManagerProps) {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [newColumnName, setNewColumnName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchColumns = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/columns`);
      if (!res.ok) throw new Error();
      setColumns(await res.json());
    } catch {
      toast.error("Erro ao carregar colunas.");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  async function handleAddColumn() {
    if (!newColumnName.trim()) return;

    const res = await fetch(`/api/boards/${boardId}/columns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newColumnName.trim() }),
    });

    if (!res.ok) {
      const body = await res.json();
      toast.error(body.error || "Erro ao adicionar coluna.");
      return;
    }

    setNewColumnName("");
    toast.success("Coluna adicionada!");
    fetchColumns();
  }

  async function handleDeleteColumn(columnId: string) {
    const res = await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      toast.error("Erro ao excluir coluna.");
      return;
    }

    toast.success("Coluna excluída!");
    fetchColumns();
  }

  async function handleMoveColumn(index: number, direction: "up" | "down") {
    const newColumns = [...columns];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newColumns.length) return;

    [newColumns[index], newColumns[swapIndex]] = [newColumns[swapIndex], newColumns[index]];

    const reordered = newColumns.map((col, i) => ({ id: col.id, position: i }));

    setColumns(newColumns.map((col, i) => ({ ...col, position: i })));

    const res = await fetch(`/api/boards/${boardId}/columns`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: reordered }),
    });

    if (!res.ok) {
      toast.error("Erro ao reordenar.");
      fetchColumns();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Colunas ({columns.length})</h3>

      {columns.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma coluna. Adicione abaixo.</p>
      )}

      <div className="space-y-2">
        {columns.map((col, index) => (
          <div
            key={col.id}
            className="flex items-center gap-2 rounded-md border bg-card px-3 py-2"
          >
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                disabled={index === 0}
                onClick={() => handleMoveColumn(index, "up")}
              >
                ▲
              </button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                disabled={index === columns.length - 1}
                onClick={() => handleMoveColumn(index, "down")}
              >
                ▼
              </button>
            </div>
            <span className="flex-1 text-sm">{col.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive h-7 px-2"
              onClick={() => handleDeleteColumn(col.id)}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newColumnName}
          onChange={(e) => setNewColumnName(e.target.value)}
          placeholder="Nome da coluna"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddColumn())}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAddColumn}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}
