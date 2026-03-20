import { NextResponse } from "next/server";
import { getStudentSupabase } from "@/lib/supabase-student";

export async function GET() {
  const supabase = await getStudentSupabase();
  const { data, error } = await supabase
    .from("kanban_boards")
    .select("*, kanban_columns(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await getStudentSupabase();
  const body = await request.json();

  const { data, error } = await supabase
    .from("kanban_boards")
    .insert({
      name: body.name,
      description: body.description || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Já existe um quadro com esse nome." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
