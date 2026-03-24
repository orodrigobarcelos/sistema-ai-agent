import { NextResponse } from "next/server";
import { getStudentSupabase } from "@/lib/supabase-student";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";

async function updateChatwootKanbanStage(phone: string, columnName: string, boardName: string, userId: string) {
  try {
    const { data: setup } = await supabaseAdmin
      .from("user_setups")
      .select("chatwoot_url, chatwoot_account_id, chatwoot_api_token")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!setup?.chatwoot_url || !setup?.chatwoot_api_token || !setup?.chatwoot_account_id) return;

    const { chatwoot_url, chatwoot_account_id } = setup;
    const chatwoot_api_token = decrypt(setup.chatwoot_api_token);

    // Search contact by phone — fallback to last 8 digits (9th digit mismatch)
    const phoneDigits = phone.replace(/\D/g, "");
    const last8 = phoneDigits.slice(-8);

    const matchByLast8 = (contacts: { phone_number: string | null }[]) =>
      contacts.find((c) => {
        const cDigits = c.phone_number?.replace(/\D/g, "") || "";
        return cDigits.slice(-8) === last8;
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contact: any;

    const searchRes = await fetch(
      `${chatwoot_url}/api/v1/accounts/${chatwoot_account_id}/contacts/search?q=${encodeURIComponent(phone)}`,
      { headers: { api_access_token: chatwoot_api_token } }
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      contact = matchByLast8(searchData.payload || []);
    }

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

    if (!contact) return;

    // Update custom attribute
    await fetch(
      `${chatwoot_url}/api/v1/accounts/${chatwoot_account_id}/contacts/${contact.id}`,
      {
        method: "PUT",
        headers: {
          api_access_token: chatwoot_api_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          custom_attributes: { ...contact.custom_attributes, [`kanban_${boardName.replace(/\s+/g, "_").toLowerCase()}`]: columnName },
        }),
      }
    );
  } catch {
    // Non-blocking: don't fail the move if Chatwoot update fails
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const supabase = await getStudentSupabase();
    const { id: boardId } = await params;
    const body = await request.json();
    const { lead_id, from_column_id, to_column_id } = body;

    if (!lead_id || !from_column_id || !to_column_id) {
      return NextResponse.json(
        { error: "lead_id, from_column_id e to_column_id sao obrigatorios." },
        { status: 400 }
      );
    }

    // Get destination column name
    const { data: toColumn, error: colError } = await supabase
      .from("kanban_columns")
      .select("id, name")
      .eq("id", to_column_id)
      .eq("board_id", boardId)
      .single();

    if (colError || !toColumn) {
      return NextResponse.json(
        { error: "Coluna de destino nao encontrada neste quadro." },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("kanban_lead_positions")
      .update({
        column_id: to_column_id,
        moved_at: new Date().toISOString(),
        moved_by: "manual",
      })
      .eq("lead_id", lead_id)
      .eq("column_id", from_column_id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Lead nao encontrado na coluna de origem." },
        { status: 404 }
      );
    }

    // Update Chatwoot kanban attribute (non-blocking)
    if (user) {
      const { data: board } = await supabase
        .from("kanban_boards")
        .select("name")
        .eq("id", boardId)
        .single();

      const { data: lead } = await supabase
        .from("leads")
        .select("whatsapp")
        .eq("id", lead_id)
        .single();

      if (lead?.whatsapp && board?.name) {
        updateChatwootKanbanStage(lead.whatsapp, toColumn.name, board.name, user.id);
      }
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao mover lead." },
      { status: 500 }
    );
  }
}
