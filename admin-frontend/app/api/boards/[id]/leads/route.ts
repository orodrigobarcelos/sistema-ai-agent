import { NextResponse } from "next/server";
import { getStudentSupabase } from "@/lib/supabase-student";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getStudentSupabase();
  const { id } = await params;

  const { data: board, error: boardError } = await supabase
    .from("kanban_boards")
    .select("*")
    .eq("id", id)
    .single();

  if (boardError) {
    return NextResponse.json({ error: "Quadro nao encontrado." }, { status: 404 });
  }

  const { data: columns } = await supabase
    .from("kanban_columns")
    .select("*")
    .eq("board_id", id)
    .order("position");

  if (!columns || columns.length === 0) {
    return NextResponse.json({ board, columns: [] });
  }

  const columnIds = columns.map((c) => c.id);
  const { data: positions } = await supabase
    .from("kanban_lead_positions")
    .select("*, lead:leads(*)")
    .in("column_id", columnIds)
    .order("position");

  const columnsWithLeads = columns.map((col) => {
    const colPositions = (positions || []).filter((p) => p.column_id === col.id);
    const leads = colPositions
      .filter((p) => p.lead)
      .map((p) => ({
        id: p.lead.id,
        name: p.lead.name || p.lead.full_name || "",
        whatsapp: p.lead.whatsapp,
        country_code: p.lead.country_code || "",
        instagram: p.lead.instagram,
        tags: [],
        position_id: p.id,
        position: p.position,
        moved_at: p.moved_at,
      }));

    return { ...col, leads };
  });

  return NextResponse.json({ board, columns: columnsWithLeads });
}
