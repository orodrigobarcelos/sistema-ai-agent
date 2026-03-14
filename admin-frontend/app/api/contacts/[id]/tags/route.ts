import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { tag_id } = body;

  if (!tag_id) {
    return NextResponse.json({ error: "tag_id é obrigatório." }, { status: 400 });
  }

  // Check if already has this tag
  const { data: existing } = await supabaseAdmin
    .from("lead_tags")
    .select("id")
    .eq("lead_id", id)
    .eq("tag_id", tag_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Lead já possui esta tag." }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from("lead_tags")
    .insert({ lead_id: id, tag_id, added_by: "admin" })
    .select("tag:tags(id, name, color)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data.tag, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const tagId = searchParams.get("tag_id");

  if (!tagId) {
    return NextResponse.json({ error: "tag_id é obrigatório." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("lead_tags")
    .delete()
    .eq("lead_id", id)
    .eq("tag_id", tagId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
