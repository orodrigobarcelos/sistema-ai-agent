"use client";

import { CustomField } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FIELD_TYPE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  text: { label: "Texto", variant: "secondary" },
  number: { label: "Número", variant: "outline" },
  boolean: { label: "Booleano", variant: "default" },
  date: { label: "Data", variant: "secondary" },
  datetime: { label: "Datetime", variant: "outline" },
  json: { label: "JSON", variant: "default" },
};

interface FieldListProps {
  fields: CustomField[];
  onEdit: (field: CustomField) => void;
  onDelete: (field: CustomField) => void;
}

export function FieldList({ fields, onEdit, onDelete }: FieldListProps) {
  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-muted-foreground"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>
        <h3 className="text-lg font-medium">Nenhum campo encontrado</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Crie seu primeiro campo personalizado para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field) => {
            const typeInfo = FIELD_TYPE_LABELS[field.field_type] || {
              label: field.field_type,
              variant: "secondary" as const,
            };

            return (
              <TableRow key={field.id}>
                <TableCell className="font-medium">{field.name}</TableCell>
                <TableCell>
                  <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {field.description || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(field.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(field)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(field)}
                    >
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
