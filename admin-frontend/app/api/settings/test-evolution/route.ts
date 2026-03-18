import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { url, api_key, instance_name } = await request.json();

  if (!url || !api_key || !instance_name) {
    return NextResponse.json(
      { error: "Todos os campos são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${url}/instance/connectionState/${instance_name}`,
      {
        headers: { apikey: api_key },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Erro ${res.status}: ${text}` },
        { status: 400 }
      );
    }

    const data = await res.json();
    const state = data?.instance?.state || data?.state || "unknown";

    if (state === "open") {
      return NextResponse.json({
        message: "Conexão OK! Instância conectada ao WhatsApp.",
        state,
      });
    }

    return NextResponse.json({
      message: `Instância encontrada, mas o estado é: ${state}`,
      state,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Não foi possível conectar: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      },
      { status: 500 }
    );
  }
}
