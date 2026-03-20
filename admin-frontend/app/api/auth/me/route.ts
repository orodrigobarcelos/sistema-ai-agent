import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { data: setup } = await supabaseAdmin
      .from("user_setups")
      .select("id, funnel_option, supabase_project_ref, provisioning_status, completed_steps, chatwoot_url, chatwoot_account_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      user,
      setup: setup
        ? {
            id: setup.id,
            funnel_option: setup.funnel_option,
            supabase_project_ref: setup.supabase_project_ref,
            provisioning_status: setup.provisioning_status,
            completed_steps: setup.completed_steps,
            chatwoot_url: setup.chatwoot_url,
            chatwoot_account_id: setup.chatwoot_account_id,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
