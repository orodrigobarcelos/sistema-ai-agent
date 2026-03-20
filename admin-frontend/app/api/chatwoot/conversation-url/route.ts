import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    if (!phone) {
      return NextResponse.json({ error: "Telefone obrigatorio" }, { status: 400 });
    }

    const { data: setup } = await supabaseAdmin
      .from("user_setups")
      .select("chatwoot_url, chatwoot_account_id, chatwoot_api_token")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!setup?.chatwoot_url || !setup?.chatwoot_api_token || !setup?.chatwoot_account_id) {
      return NextResponse.json({ error: "Chatwoot nao configurado" }, { status: 400 });
    }

    const { chatwoot_url, chatwoot_account_id, chatwoot_api_token } = setup;

    // Search contact by phone
    const searchRes = await fetch(
      `${chatwoot_url}/api/v1/accounts/${chatwoot_account_id}/contacts/search?q=${encodeURIComponent(phone)}`,
      { headers: { api_access_token: chatwoot_api_token } }
    );

    if (!searchRes.ok) {
      return NextResponse.json({ error: "Erro ao buscar contato" }, { status: 500 });
    }

    const searchData = await searchRes.json();
    const contacts = searchData.payload || [];

    // Find exact match by phone
    const contact = contacts.find((c: { phone_number: string }) => {
      const normalized = c.phone_number?.replace(/\D/g, "");
      const searchNormalized = phone.replace(/\D/g, "");
      return normalized === searchNormalized || normalized?.endsWith(searchNormalized) || searchNormalized.endsWith(normalized || "");
    });

    if (!contact) {
      return NextResponse.json({ error: "Contato nao encontrado no Chatwoot" }, { status: 404 });
    }

    // Get conversations for this contact
    const convRes = await fetch(
      `${chatwoot_url}/api/v1/accounts/${chatwoot_account_id}/contacts/${contact.id}/conversations`,
      { headers: { api_access_token: chatwoot_api_token } }
    );

    if (!convRes.ok) {
      // Fallback: open contact page
      return NextResponse.json({
        url: `${chatwoot_url}/app/accounts/${chatwoot_account_id}/contacts/${contact.id}`,
      });
    }

    const convData = await convRes.json();
    const conversations = convData.payload || [];

    if (conversations.length === 0) {
      // No conversations, open contact page
      return NextResponse.json({
        url: `${chatwoot_url}/app/accounts/${chatwoot_account_id}/contacts/${contact.id}`,
      });
    }

    // Open the most recent conversation
    const latestConv = conversations[0];
    return NextResponse.json({
      url: `${chatwoot_url}/app/accounts/${chatwoot_account_id}/conversations/${latestConv.id}`,
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
