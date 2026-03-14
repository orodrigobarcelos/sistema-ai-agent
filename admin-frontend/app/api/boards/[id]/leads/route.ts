import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Get board info
  const { data: board, error: boardError } = await supabaseAdmin
    .from("kanban_boards")
    .select("*")
    .eq("id", id)
    .single();

  if (boardError) {
    return NextResponse.json({ error: "Quadro não encontrado." }, { status: 404 });
  }

  // 2. Get all columns ordered by position
  const { data: columns } = await supabaseAdmin
    .from("kanban_columns")
    .select("*")
    .eq("board_id", id)
    .order("position");

  if (!columns || columns.length === 0) {
    return NextResponse.json({ board, columns: [] });
  }

  // 3. Get all lead positions with lead data
  const columnIds = columns.map((c) => c.id);
  const { data: positions } = await supabaseAdmin
    .from("kanban_lead_positions")
    .select("*, lead:leads(id, name, whatsapp, country_code, instagram)")
    .in("column_id", columnIds)
    .order("position");

  // 4. Get tags for all leads in board
  const leadIds = [
    ...new Set((positions || []).map((p) => p.lead_id)),
  ];

  let leadTagsMap: Record<string, Array<{ id: string; name: string; color: string | null }>> = {};

  if (leadIds.length > 0) {
    const { data: leadTags } = await supabaseAdmin
      .from("lead_tags")
      .select("lead_id, tag:tags(id, name, color)")
      .in("lead_id", leadIds);

    for (const lt of leadTags || []) {
      if (!leadTagsMap[lt.lead_id]) leadTagsMap[lt.lead_id] = [];
      if (lt.tag) {
        const tag = lt.tag as unknown as { id: string; name: string; color: string | null };
        leadTagsMap[lt.lead_id].push(tag);
      }
    }
  }

  // 5. Assemble columns with leads
  const columnsWithLeads = columns.map((col) => {
    const colPositions = (positions || []).filter((p) => p.column_id === col.id);
    const leads = colPositions
      .filter((p) => p.lead)
      .map((p) => ({
        id: p.lead.id,
        name: p.lead.name,
        whatsapp: p.lead.whatsapp,
        country_code: p.lead.country_code,
        instagram: p.lead.instagram,
        tags: leadTagsMap[p.lead_id] || [],
        position_id: p.id,
        position: p.position,
        moved_at: p.moved_at,
      }));

    return { ...col, leads };
  });

  return NextResponse.json({ board, columns: columnsWithLeads });
}
