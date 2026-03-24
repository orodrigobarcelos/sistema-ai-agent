import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha sao obrigatorios" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter no minimo 6 caracteres" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("admin_users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Este email ja esta cadastrado" },
        { status: 409 }
      );
    }

    const password_hash = await hashPassword(password);

    const { data: user, error } = await supabaseAdmin
      .from("admin_users")
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash,
      })
      .select("id, email, name")
      .single();

    if (error) {
      console.error("[register]", error.message);
      return NextResponse.json({ error: "Erro ao criar conta." }, { status: 500 });
    }

    const token = await signToken(user);

    return NextResponse.json(
      { success: true, user: { id: user.id, email: user.email, name: user.name } },
      { status: 201, headers: setAuthCookie(token) }
    );
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
