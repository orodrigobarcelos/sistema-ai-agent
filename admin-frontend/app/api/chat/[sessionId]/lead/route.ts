import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const phone = sessionId.replace("@s.whatsapp.net", "");

  // Try to find lead with various phone format variants
  const variants = [phone, "+" + phone];
  if (phone.startsWith("55")) {
    variants.push("+" + phone);
    variants.push(phone.substring(2));
  } else {
    variants.push("+55" + phone);
    variants.push("55" + phone);
  }

  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select("id, name, whatsapp, utm_source, created_at")
    .in("whatsapp", variants)
    .limit(1);

  if (!leads || leads.length === 0) {
    return NextResponse.json({
      name: null,
      phone,
      profile_pic_url: null,
      ig_username: null,
      tags: [],
      utm_source: null,
      created_at: null,
      kanban_position: null,
    });
  }

  const lead = leads[0];

  // Fetch instagram, tags, and kanban position in parallel
  const [igRes, tagsRes, kanbanRes] = await Promise.all([
    supabaseAdmin
      .from("instagram")
      .select("username, profile_pic_url")
      .eq("lead_id", lead.id)
      .maybeSingle(),
    supabaseAdmin
      .from("lead_tags")
      .select("tag:tags(id, name, color)")
      .eq("lead_id", lead.id),
    supabaseAdmin
      .from("kanban_lead_positions")
      .select("column:kanban_columns(name, board:kanban_boards(name))")
      .eq("lead_id", lead.id)
      .limit(1)
      .maybeSingle(),
  ]);

  const tags = (tagsRes.data || [])
    .filter((lt) => lt.tag)
    .map(
      (lt) => lt.tag as unknown as { id: string; name: string; color: string | null }
    );

  let kanban_position = null;
  if (kanbanRes.data?.column) {
    const col = kanbanRes.data.column as unknown as {
      name: string;
      board: { name: string };
    };
    kanban_position = { board_name: col.board.name, column_name: col.name };
  }

  return NextResponse.json({
    name: lead.name,
    phone: lead.whatsapp,
    profile_pic_url: igRes.data?.profile_pic_url || null,
    ig_username: igRes.data?.username || null,
    tags,
    utm_source: lead.utm_source,
    created_at: lead.created_at,
    kanban_position,
  });
}
