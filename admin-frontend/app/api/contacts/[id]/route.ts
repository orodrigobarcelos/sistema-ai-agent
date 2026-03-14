import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Fetch all data in parallel
  const [leadRes, igRes, tagsRes, cfRes, kanbanRes, ordersRes] = await Promise.all([
    supabaseAdmin.from("leads").select("*").eq("id", id).single(),
    supabaseAdmin
      .from("instagram")
      .select("username, full_name, profile_pic_url, biography, followers_count")
      .eq("lead_id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("lead_tags")
      .select("tag:tags(id, name, color)")
      .eq("lead_id", id),
    supabaseAdmin
      .from("lead_custom_fields")
      .select("value, field:custom_fields(name, field_type)")
      .eq("lead_id", id),
    supabaseAdmin
      .from("kanban_lead_positions")
      .select("column:kanban_columns(name, board:kanban_boards(name))")
      .eq("lead_id", id)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("ticto_events")
      .select("id, status, status_date, product_name, offer_name, paid_amount, payment_method, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (leadRes.error) {
    return NextResponse.json({ error: "Contato não encontrado." }, { status: 404 });
  }

  const lead = leadRes.data;
  const ig = igRes.data;

  // Fetch last interaction and conversation summary using session_id
  let last_interaction: string | null = null;
  let conversation_summary: string | null = null;

  if (lead.session_id) {
    const [lastMsgRes, summaryRes] = await Promise.all([
      supabaseAdmin
        .from("n8n_chat_histories_whatsapp")
        .select("created_at")
        .eq("session_id", lead.session_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("conversation_summaries")
        .select("summary")
        .eq("session_id", lead.session_id)
        .maybeSingle(),
    ]);

    last_interaction = lastMsgRes.data?.created_at || null;
    conversation_summary = summaryRes.data?.summary || null;
  }

  const tags = (tagsRes.data || [])
    .filter((lt) => lt.tag)
    .map((lt) => lt.tag as unknown as { id: string; name: string; color: string | null });

  const custom_fields = (cfRes.data || [])
    .filter((cf) => cf.field)
    .map((cf) => {
      const field = cf.field as unknown as { name: string; field_type: string };
      return { name: field.name, value: cf.value, field_type: field.field_type };
    });

  let kanban_position = null;
  if (kanbanRes.data?.column) {
    const col = kanbanRes.data.column as unknown as { name: string; board: { name: string } };
    kanban_position = { board_name: col.board.name, column_name: col.name };
  }

  const contact = {
    id: lead.id,
    name: lead.name,
    whatsapp: lead.whatsapp,
    country_code: lead.country_code,
    instagram: lead.instagram,
    utm_source: lead.utm_source,
    utm_campaign: lead.utm_campaign,
    utm_medium: lead.utm_medium,
    utm_content: lead.utm_content,
    utm_term: lead.utm_term,
    session_id: lead.session_id,
    created_at: lead.created_at,
    profile_pic_url: ig?.profile_pic_url || null,
    ig_username: ig?.username || null,
    ig_full_name: ig?.full_name || null,
    ig_bio: ig?.biography || null,
    ig_followers: ig?.followers_count || null,
    tags,
    custom_fields,
    kanban_position,
    orders: ordersRes.data || [],
    last_interaction,
    conversation_summary,
  };

  return NextResponse.json(contact);
}
