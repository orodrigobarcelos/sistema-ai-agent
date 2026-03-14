"use client";

import { BoardListItem } from "@/lib/types";
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
import Link from "next/link";

interface BoardListProps {
  boards: BoardListItem[];
  onEdit: (board: BoardListItem) => void;
  onDelete: (board: BoardListItem) => void;
}

export function BoardList({ boards, onEdit, onDelete }: BoardListProps) {
  if (boards.length === 0) {
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
            <rect x="2" y="3" width="6" height="18" rx="1" />
            <rect x="9" y="3" width="6" height="12" rx="1" />
            <rect x="16" y="3" width="6" height="16" rx="1" />
          </svg>
        </div>
        <h3 className="text-lg font-medium">Nenhum quadro encontrado</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Crie seu primeiro quadro Kanban para começar.
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
            <TableHead>Descrição</TableHead>
            <TableHead>Colunas</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {boards.map((board) => {
            const colCount = board.kanban_columns?.[0]?.count ?? 0;
            return (
              <TableRow key={board.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/boards/${board.id}`}
                    className="hover:underline"
                  >
                    {board.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {board.description || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{colCount} colunas</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(board.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/boards/${board.id}`}>Ver Kanban</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(board)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(board)}
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
