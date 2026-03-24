import { NextResponse } from "next/server";
import { getStudentSupabase } from "@/lib/supabase-student";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getStudentSupabase();
  const { id } = await params;

  const { data, error } = await supabase
    .from("kanban_columns")
    .select("*")
    .eq("board_id", id)
    .order("position");

  if (error) {
    console.error("[columns GET]", error.message);
    return NextResponse.json({ error: "Erro ao carregar colunas." }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getStudentSupabase();
  const { id } = await params;
  const body = await request.json();

  const { data: existing } = await supabase
    .from("kanban_columns")
    .select("position")
    .eq("board_id", id)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("kanban_columns")
    .insert({
      board_id: id,
      name: body.name,
      color: body.color || "#6B7280",
      position: nextPosition,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ja existe uma coluna com esse nome neste quadro." },
        { status: 409 }
      );
    }
    console.error("[columns POST]", error.message);
    return NextResponse.json({ error: "Erro ao criar coluna." }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getStudentSupabase();
  const { id } = await params;
  const body = await request.json();

  const columns = body.columns as Array<{ id: string; position: number }>;

  for (const col of columns) {
    await supabase
      .from("kanban_columns")
      .update({ position: col.position })
      .eq("id", col.id)
      .eq("board_id", id);
  }

  return NextResponse.json({ success: true });
}
