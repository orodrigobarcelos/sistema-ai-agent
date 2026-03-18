import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  let query = supabaseAdmin
    .from("n8n_chat_histories_whatsapp")
    .select("id, session_id, message, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (after) {
    query = query.gt("id", parseInt(after));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const messages = (data || []).map((row) => {
    const msg = row.message as { type: string; content: string };
    return {
      id: row.id,
      session_id: row.session_id,
      type: msg.type as "human" | "ai",
      content: msg.content || "",
      created_at: row.created_at,
    };
  });

  return NextResponse.json(messages);
}
