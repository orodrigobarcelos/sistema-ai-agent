import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MEDIA_TYPE_MAP: Record<string, string> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "audio/mpeg": "audio",
  "audio/ogg": "audio",
  "audio/wav": "audio",
  "audio/mp4": "audio",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.ms-excel": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
};

function getMediaType(mimeType: string): string {
  return MEDIA_TYPE_MAP[mimeType] || "document";
}

const PLACEHOLDER_MAP: Record<string, string> = {
  image: "[O usuário enviou uma imagem]",
  audio: "[O usuário enviou um áudio]",
  video: "[O usuário enviou um vídeo]",
  document: "[O usuário enviou um documento]",
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const sessionId = formData.get("session_id") as string | null;

  if (!file || !sessionId) {
    return NextResponse.json(
      { error: "Os campos 'file' e 'session_id' são obrigatórios." },
      { status: 400 }
    );
  }

  const mimeType = file.type;
  const mediaType = getMediaType(mimeType);
  const ext = file.name.split(".").pop() || "bin";
  const timestamp = Date.now();
  const storagePath = `${sessionId}/${timestamp}.${ext}`;

  // 1. Upload file to Storage
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from("chat-media")
    .upload(storagePath, buffer, { contentType: mimeType });

  if (uploadError) {
    return NextResponse.json(
      { error: `Erro no upload: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // 2. Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from("chat-media")
    .getPublicUrl(storagePath);

  const placeholder = PLACEHOLDER_MAP[mediaType] || "[O usuário enviou uma mídia]";

  // 3. INSERT into n8n_chat_histories_whatsapp (type "ai" - admin is business side)
  const { data: msgData, error: msgError } = await supabaseAdmin
    .from("n8n_chat_histories_whatsapp")
    .insert({
      session_id: sessionId,
      message: {
        type: "ai",
        content: placeholder,
        tool_calls: [],
        additional_kwargs: {},
        response_metadata: {},
        invalid_tool_calls: [],
      },
    })
    .select("id")
    .single();

  if (msgError) {
    return NextResponse.json(
      { error: `Erro ao salvar mensagem: ${msgError.message}` },
      { status: 500 }
    );
  }

  // 4. INSERT into chat_media
  await supabaseAdmin.from("chat_media").insert({
    session_id: sessionId,
    message_id: msgData.id,
    media_type: mediaType,
    storage_path: storagePath,
    mime_type: mimeType,
  });

  // 5. Send via Evolution API
  const { data: settingsRow } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "evolution_api")
    .maybeSingle();

  if (!settingsRow?.value) {
    return NextResponse.json({
      success: true,
      warning: "Mídia salva, mas Evolution API não configurada.",
    });
  }

  const settings = settingsRow.value as {
    url: string;
    api_key: string;
    instance_name: string;
  };

  const phoneNumber = sessionId.replace("@s.whatsapp.net", "");

  try {
    const apiUrl = `${settings.url.replace(/\/$/, "")}/message/sendMedia/${settings.instance_name}`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: settings.api_key,
      },
      body: JSON.stringify({
        number: phoneNumber,
        mediatype: mediaType,
        media: urlData.publicUrl,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        success: true,
        warning: "Mídia salva, mas houve erro ao enviar via WhatsApp.",
      });
    }
  } catch {
    return NextResponse.json({
      success: true,
      warning: "Mídia salva, mas não foi possível conectar à Evolution API.",
    });
  }

  return NextResponse.json({ success: true });
}
