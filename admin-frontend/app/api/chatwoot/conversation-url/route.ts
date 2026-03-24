import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";

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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[conversation-url]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
