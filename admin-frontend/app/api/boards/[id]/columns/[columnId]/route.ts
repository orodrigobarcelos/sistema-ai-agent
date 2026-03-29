import { NextResponse } from "next/server";
import { getStudentSupabase } from "@/lib/supabase-student";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const supabase = await getStudentSupabase();
  const { id, columnId } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from("kanban_columns")
    .update({ name: body.name })
    .eq("id", columnId)
    .eq("board_id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Já existe uma coluna com esse nome neste quadro." },
        { status: 409 }
      );
    }
    console.error("[column PUT]", error.message);
    return NextResponse.json({ error: "Erro ao renomear coluna." }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const supabase = await getStudentSupabase();
  const { id, columnId } = await params;

  const { error } = await supabase
    .from("kanban_columns")
    .delete()
    .eq("id", columnId)
    .eq("board_id", id);

  if (error) {
    console.error("[column DELETE]", error.message);
    return NextResponse.json({ error: "Erro ao excluir coluna." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
