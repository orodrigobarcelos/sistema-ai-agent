"use client";

import { useEffect, useState } from "react";

interface SetupInfo {
  funnel_option: number;
  supabase_project_ref: string;
  provisioning_status: string;
  completed_steps: string[];
  chatwoot_url: string | null;
  chatwoot_account_id: string | null;
}

const FUNNEL_LABELS: Record<number, string> = {
  1: "Básico (Chatwoot + N8N + Supabase)",
  2: "Básico + Captura de Leads",
  3: "Completo com Instagram",
};

export default function SettingsPage() {
  const [setup, setSetup] = useState<SetupInfo | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUserName(data.user?.name || "");
        setUserEmail(data.user?.email || "");
        setSetup(data.setup || null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Configurações</h1>
      <p className="text-muted-foreground mt-1">Dados do seu projeto Supabase e Chatwoot.</p>

      <div className="mt-8 grid gap-6 max-w-xl">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Conta</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome</span>
              <span>{userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{userEmail}</span>
            </div>
          </div>
        </div>

        {setup ? (
          <>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Supabase</h2>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arquitetura de Funil</span>
                <span>Arquitetura {setup.funnel_option} - {FUNNEL_LABELS[setup.funnel_option]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project ID</span>
                <span className="font-mono">{setup.supabase_project_ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={setup.provisioning_status === "completed" ? "text-green-500" : "text-yellow-500"}>
                  {setup.provisioning_status === "completed" ? "Configurado" : setup.provisioning_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Steps concluídos</span>
                <span>{setup.completed_steps?.length || 0}</span>
              </div>
            </div>
          </div>

          {setup.chatwoot_url && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Chatwoot</h2>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">URL</span>
                  <span className="font-mono text-xs">{setup.chatwoot_url}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account ID</span>
                  <span>{setup.chatwoot_account_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-green-500">Configurado</span>
                </div>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="rounded-lg border bg-card p-6 text-muted-foreground">
            Setup não realizado. Acesse /setup para configurar.
          </div>
        )}
      </div>
    </div>
  );
}
