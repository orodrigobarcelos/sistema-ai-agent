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
    const setupId = searchParams.get("setup_id");

    if (!setupId) {
      return NextResponse.json({ error: "setup_id obrigatorio" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("user_setups")
      .select("provisioning_status, completed_steps, provisioning_log")
      .eq("id", setupId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Setup nao encontrado" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
