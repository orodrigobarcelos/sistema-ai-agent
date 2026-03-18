import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("per_page") || "20");
  const search = searchParams.get("search") || "";
  const tagFilter = searchParams.get("tag") || "";
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = searchParams.get("sort_order") || "desc";

  const allowedSortFields = ["name", "whatsapp", "utm_source", "created_at"];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "created_at";
  const ascending = sortOrder === "asc";

  const offset = (page - 1) * perPage;

  // Build base query for leads that match filters
  let leadIdsQuery = supabaseAdmin.from("leads").select("id", { count: "exact" });

  if (search) {
    leadIdsQuery = leadIdsQuery.or(
      `name.ilike.%${search}%,whatsapp.ilike.%${search}%,instagram.ilike.%${search}%`
    );
  }

  if (tagFilter) {
    // Get lead IDs that have this tag
    const { data: taggedLeads } = await supabaseAdmin
      .from("lead_tags")
      .select("lead_id, tag:tags!inner(name)")
      .eq("tag.name", tagFilter);

    const taggedIds = (taggedLeads || []).map((lt) => lt.lead_id);

    if (taggedIds.length === 0) {
      return NextResponse.json({ contacts: [], total: 0, page, per_page: perPage });
    }

    leadIdsQuery = leadIdsQuery.in("id", taggedIds);
  }

  // Get total count
  const { count } = await leadIdsQuery;
  const total = count || 0;

  // Get paginated leads
  let leadsQuery = supabaseAdmin
    .from("leads")
    .select("id, name, whatsapp, country_code, instagram, utm_source, created_at")
    .order(safeSortBy, { ascending })
    .range(offset, offset + perPage - 1);

  if (search) {
    leadsQuery = leadsQuery.or(
      `name.ilike.%${search}%,whatsapp.ilike.%${search}%,instagram.ilike.%${search}%`
    );
  }

  if (tagFilter) {
    const { data: taggedLeads } = await supabaseAdmin
      .from("lead_tags")
      .select("lead_id, tag:tags!inner(name)")
      .eq("tag.name", tagFilter);

    const taggedIds = (taggedLeads || []).map((lt) => lt.lead_id);

    if (taggedIds.length === 0) {
      return NextResponse.json({ contacts: [], total: 0, page, per_page: perPage });
    }

    leadsQuery = leadsQuery.in("id", taggedIds);
  }

  const { data: leads, error } = await leadsQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ contacts: [], total, page, per_page: perPage });
  }

  const leadIds = leads.map((l) => l.id);

  // Fetch instagram data and tags in parallel
  const [instagramRes, tagsRes] = await Promise.all([
    supabaseAdmin
      .from("instagram")
      .select("lead_id, username, profile_pic_url")
      .in("lead_id", leadIds),
    supabaseAdmin
      .from("lead_tags")
      .select("lead_id, tag:tags(id, name, color)")
      .in("lead_id", leadIds),
  ]);

  const igMap: Record<string, { username: string; profile_pic_url: string | null }> = {};
  for (const ig of instagramRes.data || []) {
    igMap[ig.lead_id] = { username: ig.username, profile_pic_url: ig.profile_pic_url };
  }

  const tagsMap: Record<string, Array<{ id: string; name: string; color: string | null }>> = {};
  for (const lt of tagsRes.data || []) {
    if (!tagsMap[lt.lead_id]) tagsMap[lt.lead_id] = [];
    if (lt.tag) {
      const tag = lt.tag as unknown as { id: string; name: string; color: string | null };
      tagsMap[lt.lead_id].push(tag);
    }
  }

  // Assemble contacts
  const contacts = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    whatsapp: lead.whatsapp,
    country_code: lead.country_code,
    instagram: lead.instagram,
    utm_source: lead.utm_source,
    created_at: lead.created_at,
    profile_pic_url: igMap[lead.id]?.profile_pic_url || null,
    ig_username: igMap[lead.id]?.username || null,
    tags: tagsMap[lead.id] || [],
  }));

  return NextResponse.json({ contacts, total, page, per_page: perPage });
}
