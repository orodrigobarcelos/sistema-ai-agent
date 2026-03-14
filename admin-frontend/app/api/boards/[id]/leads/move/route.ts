import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    const body = await request.json();
    const { lead_id, from_column_id, to_column_id } = body;

    if (!lead_id || !from_column_id || !to_column_id) {
      return NextResponse.json(
        { error: "lead_id, from_column_id e to_column_id são obrigatórios." },
        { status: 400 }
      );
    }

    // Verify destination column belongs to this board
    const { data: toColumn, error: colError } = await supabaseAdmin
      .from("kanban_columns")
      .select("id")
      .eq("id", to_column_id)
      .eq("board_id", boardId)
      .single();

    if (colError || !toColumn) {
      return NextResponse.json(
        { error: "Coluna de destino não encontrada neste quadro." },
        { status: 404 }
      );
    }

    // Update the lead's position record
    const { data, error } = await supabaseAdmin
      .from("kanban_lead_positions")
      .update({
        column_id: to_column_id,
        moved_at: new Date().toISOString(),
        moved_by: "manual",
      })
      .eq("lead_id", lead_id)
      .eq("column_id", from_column_id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Lead não encontrado na coluna de origem." },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao mover lead." },
      { status: 500 }
    );
  }
}
