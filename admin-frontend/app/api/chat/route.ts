import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  // Get all distinct session_ids with their last message
  const { data: sessions, error } = await supabaseAdmin
    .from("n8n_chat_histories_whatsapp")
    .select("session_id, id, message, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!sessions || sessions.length === 0) {
    return NextResponse.json([]);
  }

  // Group by session_id — keep only the latest message per session
  const sessionMap = new Map<
    string,
    { session_id: string; last_message: string; last_message_at: string }
  >();

  for (const row of sessions) {
    if (sessionMap.has(row.session_id)) continue;

    const msg = row.message as { type: string; content: string };
    const content = msg.content || "";

    // Skip media description/transcription messages for preview
    if (
      content.includes("[O usuário enviou um") &&
      (content.includes("Descrição") || content.includes("Transcrição"))
    ) {
      continue;
    }

    sessionMap.set(row.session_id, {
      session_id: row.session_id,
      last_message: content,
      last_message_at: row.created_at,
    });
  }

  const conversations = Array.from(sessionMap.values());

  // Extract phone numbers for lead lookup
  const phones = conversations.map((c) =>
    c.session_id.replace("@s.whatsapp.net", "")
  );

  // Build variants: with and without country code prefix for matching
  const phoneVariants: string[] = [];
  for (const phone of phones) {
    phoneVariants.push(phone);
    if (phone.startsWith("55")) {
      phoneVariants.push("+" + phone);
      phoneVariants.push(phone.substring(2));
    } else {
      phoneVariants.push("+55" + phone);
      phoneVariants.push("55" + phone);
    }
  }

  // Fetch leads by whatsapp
  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select("id, name, whatsapp")
    .in("whatsapp", phoneVariants);

  // Build map: normalized phone -> lead
  const leadMap = new Map<string, { id: string; name: string; whatsapp: string }>();
  for (const lead of leads || []) {
    // Normalize: strip + and any leading zeros
    const normalized = lead.whatsapp.replace(/^\+/, "");
    leadMap.set(normalized, lead);
    leadMap.set(lead.whatsapp, lead);
  }

  // Fetch instagram profile pics for found leads
  const leadIds = (leads || []).map((l) => l.id);
  const { data: igData } = leadIds.length > 0
    ? await supabaseAdmin
        .from("instagram")
        .select("lead_id, profile_pic_url")
        .in("lead_id", leadIds)
    : { data: [] };

  const igMap = new Map<string, string | null>();
  for (const ig of igData || []) {
    igMap.set(ig.lead_id, ig.profile_pic_url);
  }

  // Assemble response
  const result = conversations.map((conv) => {
    const phone = conv.session_id.replace("@s.whatsapp.net", "");

    // Try to find lead with various formats
    const lead =
      leadMap.get(phone) ||
      leadMap.get("+" + phone) ||
      leadMap.get("+55" + phone) ||
      leadMap.get("55" + phone) ||
      (phone.startsWith("55") ? leadMap.get(phone.substring(2)) : null);

    const profilePic = lead ? igMap.get(lead.id) || null : null;

    return {
      session_id: conv.session_id,
      lead_name: lead?.name || null,
      lead_phone: phone,
      profile_pic_url: profilePic,
      last_message: conv.last_message,
      last_message_at: conv.last_message_at,
    };
  });

  // Sort by last_message_at descending
  result.sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() -
      new Date(a.last_message_at).getTime()
  );

  return NextResponse.json(result);
}
