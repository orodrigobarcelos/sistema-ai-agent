"use client";

import { useEffect, useState } from "react";
import { CustomField } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "boolean", label: "Booleano" },
  { value: "date", label: "Data" },
  { value: "datetime", label: "Datetime" },
  { value: "json", label: "JSON" },
];

interface FieldFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: CustomField | null;
  onSubmit: (data: {
    name: string;
    field_type: string;
    description: string;
  }) => Promise<void>;
}

export function FieldFormDialog({
  open,
  onOpenChange,
  field,
  onSubmit,
}: FieldFormDialogProps) {
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(field?.name || "");
      setFieldType(field?.field_type || "text");
      setDescription(field?.description || "");
      setError("");
    }
  }, [open, field]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("O nome é obrigatório.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onSubmit({
        name: name.trim(),
        field_type: fieldType,
        description: description.trim(),
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar campo.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const isEditing = !!field;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Campo" : "Novo Campo"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Altere os dados do campo personalizado."
                : "Preencha os dados para criar um novo campo personalizado."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: score_qualificacao"
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="field_type">Tipo</Label>
              <Select value={fieldType} onValueChange={setFieldType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o uso deste campo..."
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
