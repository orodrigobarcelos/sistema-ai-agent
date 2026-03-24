import { NextResponse } from "next/server";
import { getStudentSupabase } from "@/lib/supabase-student";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getStudentSupabase();
  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from("kanban_boards")
    .update({
      name: body.name,
      description: body.description || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Já existe um quadro com esse nome." },
        { status: 409 }
      );
    }
    console.error("[boards PUT]", error.message);
    return NextResponse.json({ error: "Erro ao atualizar quadro." }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getStudentSupabase();
  const { id } = await params;

  const { error } = await supabase
    .from("kanban_boards")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[boards DELETE]", error.message);
    return NextResponse.json({ error: "Erro ao excluir quadro." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
