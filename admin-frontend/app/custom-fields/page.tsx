"use client";

import { useCallback, useEffect, useState } from "react";
import { CustomField } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FieldList } from "@/components/custom-fields/field-list";
import { FieldFormDialog } from "@/components/custom-fields/field-form-dialog";
import { FieldDeleteDialog } from "@/components/custom-fields/field-delete-dialog";
import { toast } from "sonner";

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingField, setDeletingField] = useState<CustomField | null>(null);

  const fetchFields = useCallback(async () => {
    try {
      const res = await fetch("/api/custom-fields");
      if (!res.ok) throw new Error("Erro ao carregar campos");
      const data = await res.json();
      setFields(data);
    } catch {
      toast.error("Erro ao carregar campos personalizados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  function handleCreate() {
    setEditingField(null);
    setFormOpen(true);
  }

  function handleEdit(field: CustomField) {
    setEditingField(field);
    setFormOpen(true);
  }

  function handleDeleteClick(field: CustomField) {
    setDeletingField(field);
    setDeleteOpen(true);
  }

  async function handleFormSubmit(data: {
    name: string;
    field_type: string;
    description: string;
  }) {
    const isEditing = !!editingField;
    const url = isEditing
      ? `/api/custom-fields/${editingField.id}`
      : "/api/custom-fields";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "Erro ao salvar campo.");
    }

    toast.success(isEditing ? "Campo atualizado!" : "Campo criado!");
    fetchFields();
  }

  async function handleDeleteConfirm() {
    if (!deletingField) return;

    const res = await fetch(`/api/custom-fields/${deletingField.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "Erro ao excluir campo.");
    }

    toast.success("Campo excluído!");
    fetchFields();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Campos Personalizados
          </h2>
          <p className="text-muted-foreground">
            Gerencie os campos personalizados que podem ser atribuídos aos
            leads.
          </p>
        </div>
        <Button onClick={handleCreate}>Novo Campo</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <FieldList
          fields={fields}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      )}

      <FieldFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        field={editingField}
        onSubmit={handleFormSubmit}
      />

      <FieldDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        field={deletingField}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
