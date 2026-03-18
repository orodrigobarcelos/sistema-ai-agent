import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const { data, error } = await supabaseAdmin
    .from("chat_control")
    .select("ai_paused")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ai_paused: data?.ai_paused ?? false });
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const { data: existing } = await supabaseAdmin
    .from("chat_control")
    .select("ai_paused")
    .eq("session_id", sessionId)
    .maybeSingle();

  const newPaused = !(existing?.ai_paused ?? false);

  const { error } = await supabaseAdmin
    .from("chat_control")
    .upsert(
      {
        session_id: sessionId,
        ai_paused: newPaused,
        paused_at: newPaused ? new Date().toISOString() : null,
      },
      { onConflict: "session_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ai_paused: newPaused });
}
