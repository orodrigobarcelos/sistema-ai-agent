"use client";

import { useCallback, useEffect, useState } from "react";
import { Tag } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { TagList } from "@/components/tags/tag-list";
import { TagFormDialog } from "@/components/tags/tag-form-dialog";
import { TagDeleteDialog } from "@/components/tags/tag-delete-dialog";
import { toast } from "sonner";

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error("Erro ao carregar tags");
      const data = await res.json();
      setTags(data);
    } catch {
      toast.error("Erro ao carregar tags.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  function handleCreate() {
    setEditingTag(null);
    setFormOpen(true);
  }

  function handleEdit(tag: Tag) {
    setEditingTag(tag);
    setFormOpen(true);
  }

  function handleDeleteClick(tag: Tag) {
    setDeletingTag(tag);
    setDeleteOpen(true);
  }

  async function handleFormSubmit(data: {
    name: string;
    color: string;
    description: string;
  }) {
    const isEditing = !!editingTag;
    const url = isEditing ? `/api/tags/${editingTag.id}` : "/api/tags";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "Erro ao salvar tag.");
    }

    toast.success(isEditing ? "Tag atualizada!" : "Tag criada!");
    fetchTags();
  }

  async function handleDeleteConfirm() {
    if (!deletingTag) return;

    const res = await fetch(`/api/tags/${deletingTag.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "Erro ao excluir tag.");
    }

    toast.success("Tag excluída!");
    fetchTags();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tags</h2>
          <p className="text-muted-foreground">
            Gerencie as tags que podem ser atribuídas aos leads.
          </p>
        </div>
        <Button onClick={handleCreate}>Nova Tag</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <TagList tags={tags} onEdit={handleEdit} onDelete={handleDeleteClick} />
      )}

      <TagFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tag={editingTag}
        onSubmit={handleFormSubmit}
      />

      <TagDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tag={deletingTag}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
