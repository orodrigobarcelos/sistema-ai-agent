import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { getStudentSupabase } from "@/lib/supabase-student";
import { decrypt } from "@/lib/crypto";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const leadId = searchParams.get("lead_id");
    if (!phone) {
      return NextResponse.json({ error: "Telefone obrigatório" }, { status: 400 });
    }

    const { data: setup } = await supabaseAdmin
      .from("user_setups")
      .select("chatwoot_url, chatwoot_account_id, chatwoot_api_token")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!setup?.chatwoot_url || !setup?.chatwoot_api_token || !setup?.chatwoot_account_id) {
      return NextResponse.json({ error: "Chatwoot não configurado" }, { status: 400 });
    }

    const { chatwoot_url, chatwoot_account_id } = setup;

    let chatwoot_api_token: string;
    try {
      chatwoot_api_token = decrypt(setup.chatwoot_api_token);
    } catch {
      return NextResponse.json(
        { error: "Erro ao decriptar token do Chatwoot. Verifique ENCRYPTION_KEY." },
        { status: 500 }
      );
    }

    // Search contact by phone — try full number first, fallback to last 8 digits
    const phoneDigits = phone.replace(/\D/g, "");
    const last8 = phoneDigits.slice(-8);

    const matchByLast8 = (contacts: { phone_number: string | null }[]) =>
      contacts.find((c) => {
        const cDigits = c.phone_number?.replace(/\D/g, "") || "";
        return cDigits.slice(-8) === last8;
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contact: any;

    // 1st attempt: search with full phone
    const searchRes = await fetch(
      `${chatwoot_url}/api/v1/accounts/${chatwoot_account_id}/contacts/search?q=${encodeURIComponent(phone)}`,
      { headers: { api_access_token: chatwoot_api_token } }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      contact = matchByLast8(searchData.payload || []);
    }

    // 2nd attempt: search with last 8 digits (handles 9th digit mismatch)
    if (!contact) {
      const fallbackRes = await fetch(
        `${chatwoot_url}/api/v1/accounts/${chatwoot_account_id}/contacts/search?q=${encodeURIComponent(last8)}`,
        { headers: { api_access_token: chatwoot_api_token } }
      );

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        contact = matchByLast8(fallbackData.payload || []);
      }
    }

    // 3rd attempt: search by lead_id in custom_attributes (handles phone mismatch between Supabase and Chatwoot)
    if (!contact && leadId) {
      const filterRes = await fetch(
        `${chatwoot_url}/api/v1/accounts/${chatwoot_account_id}/contacts/filter`,
        {
          method: "POST",
          headers: { api_access_token: chatwoot_api_token, "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: [{ attribute_key: "lead_id", filter_operator: "equal_to", values: [leadId], query_operator: null }],
          }),
        }
      );

      if (filterRes.ok) {
        const filterData = await filterRes.json();
        const contacts = filterData.payload || [];
        if (contacts.length > 0) contact = contacts[0];
      }
    }

    if (!contact) {
      return NextResponse.json({ error: "Contato não encontrado no Chatwoot" }, { status: 404 });
    }

    // Get conversations for labels
    const convRes = await fetch(
      `${chatwoot_url}/api/v1/accounts/${chatwoot_account_id}/contacts/${contact.id}/conversations`,
      { headers: { api_access_token: chatwoot_api_token } }
    );

    let labels: string[] = [];
    let conversationUrl: string | null = null;

    if (convRes.ok) {
      const convData = await convRes.json();
      const conversations = convData.payload || [];
      if (conversations.length > 0) {
        labels = conversations[0].labels || [];
        conversationUrl = `${chatwoot_url}/app/accounts/${chatwoot_account_id}/conversations/${conversations[0].id}`;
      }
    }

    if (!conversationUrl) {
      conversationUrl = `${chatwoot_url}/app/accounts/${chatwoot_account_id}/contacts/${contact.id}`;
    }

    // Get conversation summary from student Supabase
    let summary: string | null = null;
    if (leadId) {
      try {
        const studentDb = await getStudentSupabase();
        const { data: lead } = await studentDb
          .from("leads")
          .select("session_id")
          .eq("id", leadId)
          .maybeSingle();

        if (lead?.session_id) {
          const { data: summaryData } = await studentDb
            .from("conversation_summaries")
            .select("summary")
            .eq("session_id", lead.session_id)
            .maybeSingle();

          summary = summaryData?.summary || null;
        }
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json({
      name: contact.name || null,
      phone_number: contact.phone_number || null,
      email: contact.email || null,
      thumbnail: contact.thumbnail || null,
      custom_attributes: contact.custom_attributes || {},
      labels,
      conversation_url: conversationUrl,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[contact-details]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
