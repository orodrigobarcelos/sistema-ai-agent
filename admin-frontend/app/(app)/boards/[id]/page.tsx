"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Board, KanbanColumnWithLeads } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { ColumnManager } from "@/components/boards/column-manager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

export default function BoardKanbanPage() {
  const params = useParams();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<KanbanColumnWithLeads[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/leads`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBoard(data.board);
      setColumns(data.columns);
    } catch {
      toast.error("Erro ao carregar quadro.");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h3 className="text-lg font-medium">Quadro não encontrado</h3>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/boards">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/boards">← Voltar</Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{board.name}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setColumnsOpen(true)}>
            Gerenciar Colunas
          </Button>
          <Button variant="outline" onClick={fetchBoard}>
            Atualizar
          </Button>
        </div>
      </div>

      {columns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-lg font-medium">Nenhuma coluna</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione colunas para começar a usar o Kanban.
          </p>
          <Button className="mt-4" onClick={() => setColumnsOpen(true)}>
            Gerenciar Colunas
          </Button>
        </div>
      ) : (
        <KanbanBoard
          boardId={boardId}
          columns={columns}
          onColumnsChange={setColumns}
        />
      )}

      <Dialog open={columnsOpen} onOpenChange={(open) => {
        setColumnsOpen(open);
        if (!open) fetchBoard(); // Refresh after managing columns
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Colunas: Kanban {board.name}</DialogTitle>
          </DialogHeader>
          <ColumnManager boardId={boardId} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
