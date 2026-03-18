import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { session_id, message } = body;

  if (!session_id || !message || typeof message !== "string" || message.trim() === "") {
    return NextResponse.json(
      { error: "Os campos 'session_id' e 'message' são obrigatórios." },
      { status: 400 }
    );
  }

  const phoneNumber = session_id.replace("@s.whatsapp.net", "");

  // 1. Insert message into chat history
  const { error: insertError } = await supabaseAdmin
    .from("n8n_chat_histories_whatsapp")
    .insert({
      session_id,
      message: {
        type: "ai",
        content: message.trim(),
        tool_calls: [],
        additional_kwargs: {},
        response_metadata: {},
        invalid_tool_calls: [],
      },
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 2. Send via Evolution API
  const { data: settingsRow, error: settingsError } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "evolution_api")
    .maybeSingle();

  if (settingsError) {
    return NextResponse.json(
      { error: "Erro ao buscar configurações da Evolution API." },
      { status: 500 }
    );
  }

  if (!settingsRow?.value) {
    return NextResponse.json({
      success: true,
      warning: "Mensagem salva, mas Evolution API não configurada.",
    });
  }

  const settings = settingsRow.value as {
    url: string;
    api_key: string;
    instance_name: string;
  };

  try {
    const apiUrl = `${settings.url.replace(/\/$/, "")}/message/sendText/${settings.instance_name}`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: settings.api_key,
      },
      body: JSON.stringify({
        number: phoneNumber,
        text: message.trim(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API error:", errorText);
      return NextResponse.json({
        success: true,
        warning: "Mensagem salva, mas houve erro ao enviar via WhatsApp.",
      });
    }
  } catch (err) {
    console.error("Evolution API fetch error:", err);
    return NextResponse.json({
      success: true,
      warning: "Mensagem salva, mas não foi possível conectar à Evolution API.",
    });
  }

  return NextResponse.json({ success: true });
}
