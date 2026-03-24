"use client";

import { useCallback, useEffect, useState } from "react";
import { BoardListItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { BoardList } from "@/components/boards/board-list";
import { BoardFormDialog } from "@/components/boards/board-form-dialog";
import { BoardDeleteDialog } from "@/components/boards/board-delete-dialog";
import { ColumnManager } from "@/components/boards/column-manager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function BoardsPage() {
  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<BoardListItem | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState<BoardListItem | null>(null);

  const [columnsOpen, setColumnsOpen] = useState(false);
  const [managingBoard, setManagingBoard] = useState<BoardListItem | null>(null);

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch("/api/boards");
      if (!res.ok) throw new Error();
      setBoards(await res.json());
    } catch {
      toast.error("Erro ao carregar quadros.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  function handleCreate() {
    setEditingBoard(null);
    setFormOpen(true);
  }

  function handleEdit(board: BoardListItem) {
    setEditingBoard(board);
    setFormOpen(true);
  }

  function handleDeleteClick(board: BoardListItem) {
    setDeletingBoard(board);
    setDeleteOpen(true);
  }

  function handleManageColumns(board: BoardListItem) {
    setManagingBoard(board);
    setColumnsOpen(true);
  }

  async function handleFormSubmit(data: { name: string; description: string }) {
    const isEditing = !!editingBoard;
    const url = isEditing ? `/api/boards/${editingBoard.id}` : "/api/boards";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "Erro ao salvar quadro.");
    }

    toast.success(isEditing ? "Quadro atualizado!" : "Quadro criado!");
    fetchBoards();
  }

  async function handleDeleteConfirm() {
    if (!deletingBoard) return;

    const res = await fetch(`/api/boards/${deletingBoard.id}`, { method: "DELETE" });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "Erro ao excluir quadro.");
    }

    toast.success("Quadro excluído!");
    fetchBoards();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quadros Kanban</h2>
          <p className="text-muted-foreground">
            Gerencie os quadros de pipeline para acompanhar seus leads.
          </p>
        </div>
        <Button onClick={handleCreate}>Novo quadro</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <BoardList
          boards={boards}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      )}

      <BoardFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        board={editingBoard}
        onSubmit={handleFormSubmit}
      />

      <BoardDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        board={deletingBoard}
        onConfirm={handleDeleteConfirm}
      />

      <Dialog open={columnsOpen} onOpenChange={setColumnsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Colunas: Kanban {managingBoard?.name}</DialogTitle>
          </DialogHeader>
          {managingBoard && <ColumnManager boardId={managingBoard.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
