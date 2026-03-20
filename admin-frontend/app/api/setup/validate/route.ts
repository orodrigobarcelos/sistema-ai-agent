import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { access_token, project_ref } = await request.json();

    if (!access_token || !project_ref) {
      return NextResponse.json(
        { valid: false, error: "Access Token e Project Ref sao obrigatorios" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://api.supabase.com/v1/projects/${project_ref}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { valid: false, error: "Token ou Project Ref invalidos" },
        { status: 400 }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      valid: true,
      project_name: data.name,
      project_ref: data.id,
    });
  } catch {
    return NextResponse.json(
      { valid: false, error: "Erro ao validar credenciais" },
      { status: 500 }
    );
  }
}
