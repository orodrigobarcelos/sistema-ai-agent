"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type FunnelOption = 1 | 2 | 3;
type Step = "select" | "credentials" | "provisioning";
type StepStatus = "pending" | "running" | "done" | "error";

const FUNNEL_OPTIONS = [
  {
    value: 1 as FunnelOption,
    title: "Basico",
    subtitle: "Chatwoot + N8N + Supabase",
    description: "Ideal para quem ja tem pagina de captura",
  },
  {
    value: 2 as FunnelOption,
    title: "Basico + Captura",
    subtitle: "Tudo do Basico + Pagina de captura integrada",
    description: "Para quem quer capturar leads direto",
  },
  {
    value: 3 as FunnelOption,
    title: "Completo com Instagram",
    subtitle: "Tudo do Basico + Captura + Personalizacao via Instagram",
    description: "Maximo de personalizacao",
  },
];

function getProvisioningSteps(option: FunnelOption) {
  const steps = [
    { key: "tables", label: "Criando tabelas..." },
    { key: "rpcs", label: "Criando funcoes RPC..." },
    { key: "trigger", label: "Criando trigger..." },
    { key: "rls", label: "Ativando politicas RLS..." },
    { key: "secrets", label: "Configurando secrets..." },
    { key: "edge-chatwoot-webhook", label: "Deploy: chatwoot-webhook..." },
  ];

  if (option === 2) {
    steps.push(
      { key: "edge-process-lead-signup-simple", label: "Deploy: process-lead-signup-simple..." },
      { key: "edge-submit-lead-simple", label: "Deploy: submit-lead-simple..." }
    );
  }

  if (option === 3) {
    steps.push(
      { key: "edge-process-lead-signup", label: "Deploy: process-lead-signup..." },
      { key: "edge-submit-lead", label: "Deploy: submit-lead..." },
      { key: "edge-generate-personalization", label: "Deploy: generate-personalization..." },
      { key: "edge-instagram-profile", label: "Deploy: instagram-profile..." },
      { key: "edge-n8n-data-collect", label: "Deploy: n8n-data-collect..." },
      { key: "storage", label: "Criando bucket de storage..." }
    );
  }

  // Chatwoot config steps (all options)
  steps.push(
    { key: "chatwoot-labels", label: "Criando etiquetas no Chatwoot..." },
    { key: "chatwoot-attributes", label: "Criando atributos personalizados no Chatwoot..." },
    { key: "chatwoot-webhook", label: "Configurando webhook no Chatwoot..." }
  );

  return steps;
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");
  const [funnelOption, setFunnelOption] = useState<FunnelOption | null>(null);
  const [loading, setLoading] = useState(false);

  // Credentials
  const [accessToken, setAccessToken] = useState("");
  const [projectRef, setProjectRef] = useState("");
  const [serviceRoleKey, setServiceRoleKey] = useState("");
  const [chatwootApiToken, setChatwootApiToken] = useState("");
  const [chatwootUrl, setChatwootUrl] = useState("");
  const [chatwootAccountId, setChatwootAccountId] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [rapidApiKey, setRapidApiKey] = useState("");

  // Provisioning
  const [setupId, setSetupId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [provisionStatus, setProvisionStatus] = useState<"running" | "completed" | "failed">("running");
  const [provisionError, setProvisionError] = useState<string | null>(null);

  const pollStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/setup/status?setup_id=${id}`);
      const data = await res.json();
      setCompletedSteps(data.completed_steps || []);

      if (data.provisioning_status === "completed") {
        setProvisionStatus("completed");
        return;
      }
      if (data.provisioning_status === "failed") {
        setProvisionStatus("failed");
        const lastLog = data.provisioning_log?.[data.provisioning_log.length - 1];
        setProvisionError(lastLog?.error || "Erro desconhecido");
        return;
      }
      setTimeout(() => pollStatus(id), 2000);
    } catch {
      setTimeout(() => pollStatus(id), 3000);
    }
  }, []);

  async function handleValidateAndProvision() {
    if (!accessToken || !projectRef || !serviceRoleKey) {
      toast.error("Preencha Access Token, Project Ref e Service Role Key");
      return;
    }

    if (!chatwootApiToken || !chatwootUrl || !chatwootAccountId || !openaiApiKey || !geminiApiKey) {
      toast.error("Preencha todos os campos de secrets obrigatorios");
      return;
    }

    if (funnelOption! >= 2 && !n8nWebhookUrl) {
      toast.error("Preencha o N8N_WEBHOOK_URL");
      return;
    }

    if (funnelOption === 3 && !rapidApiKey) {
      toast.error("Preencha o RAPIDAPI_KEY");
      return;
    }

    setLoading(true);
    try {
      // Validate
      const valRes = await fetch("/api/setup/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, project_ref: projectRef }),
      });
      const valData = await valRes.json();

      if (!valData.valid) {
        toast.error(valData.error || "Credenciais invalidas");
        setLoading(false);
        return;
      }

      toast.success(`Projeto "${valData.project_name}" validado!`);

      // Build secrets
      const secrets: Record<string, string> = {
        CHATWOOT_API_TOKEN: chatwootApiToken,
        CHATWOOT_URL: chatwootUrl,
        CHATWOOT_ACCOUNT_ID: chatwootAccountId,
        OPENAI_API_KEY: openaiApiKey,
        GEMINI_API_KEY: geminiApiKey,
      };

      if (funnelOption! >= 2) {
        secrets.N8N_WEBHOOK_URL = n8nWebhookUrl;
      }
      if (funnelOption === 3) {
        secrets.RAPIDAPI_KEY = rapidApiKey;
      }

      // Start provisioning
      setStep("provisioning");
      setProvisionStatus("running");

      const provRes = await fetch("/api/setup/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnel_option: funnelOption,
          access_token: accessToken,
          project_ref: projectRef,
          service_role_key: serviceRoleKey,
          secrets,
        }),
      });
      const provData = await provRes.json();

      setSetupId(provData.setup_id);

      if (provData.status === "completed") {
        setCompletedSteps(provData.completed_steps);
        setProvisionStatus("completed");
      } else if (provData.status === "failed") {
        setCompletedSteps(provData.completed_steps || []);
        setProvisionStatus("failed");
        setProvisionError(provData.error);
      } else {
        pollStatus(provData.setup_id);
      }
    } catch {
      toast.error("Erro ao provisionar");
      setProvisionStatus("failed");
    } finally {
      setLoading(false);
    }
  }

  // Step 1: Select funnel
  if (step === "select") {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold text-center mb-2">Escolha sua Arquitetura de Funil</h1>
        <p className="text-muted-foreground text-center mb-10">Selecione a opcao que melhor se encaixa no seu cenario.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {FUNNEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFunnelOption(opt.value)}
              className={`text-left p-6 rounded-lg border-2 transition-all ${
                funnelOption === opt.value
                  ? "border-primary ring-2 ring-primary bg-accent/50"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="text-sm font-medium text-muted-foreground mb-1">Opcao {opt.value}</div>
              <h3 className="text-lg font-semibold mb-2">{opt.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">{opt.subtitle}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => funnelOption && setStep("credentials")}
            disabled={!funnelOption}
            className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            Proximo
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Credentials
  if (step === "credentials") {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold mb-2">Configure seu Supabase</h1>
        <p className="text-muted-foreground mb-8">Preencha as credenciais do seu projeto Supabase e os valores dos secrets.</p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Supabase Access Token</label>
            <input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="sbp_..." />
            <p className="text-xs text-muted-foreground mt-1">Gere em supabase.com/dashboard/account/tokens</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Project Ref</label>
            <input type="text" value={projectRef} onChange={(e) => setProjectRef(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="abcdefghijklmnop" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Service Role Key</label>
            <input type="password" value={serviceRoleKey} onChange={(e) => setServiceRoleKey(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="eyJ..." />
            <p className="text-xs text-muted-foreground mt-1">Project Settings &gt; API &gt; service_role</p>
          </div>

          <hr className="my-4" />
          <h2 className="text-lg font-semibold">Secrets</h2>

          <div>
            <label className="block text-sm font-medium mb-1">CHATWOOT_API_TOKEN</label>
            <input type="text" value={chatwootApiToken} onChange={(e) => setChatwootApiToken(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">CHATWOOT_URL</label>
            <input type="text" value={chatwootUrl} onChange={(e) => setChatwootUrl(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="https://..." />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">CHATWOOT_ACCOUNT_ID</label>
            <input type="text" value={chatwootAccountId} onChange={(e) => setChatwootAccountId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="1" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">OPENAI_API_KEY</label>
            <input type="password" value={openaiApiKey} onChange={(e) => setOpenaiApiKey(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="sk-..." />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">GEMINI_API_KEY</label>
            <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="AI..." />
          </div>

          {funnelOption! >= 2 && (
            <div>
              <label className="block text-sm font-medium mb-1">N8N_WEBHOOK_URL</label>
              <input type="text" value={n8nWebhookUrl} onChange={(e) => setN8nWebhookUrl(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="https://..." />
            </div>
          )}

          {funnelOption === 3 && (
            <div>
              <label className="block text-sm font-medium mb-1">RAPIDAPI_KEY</label>
              <input type="password" value={rapidApiKey} onChange={(e) => setRapidApiKey(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
          )}
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep("select")}
            className="rounded-md border px-6 py-2 text-sm font-medium hover:bg-accent"
          >
            Voltar
          </button>
          <button
            onClick={handleValidateAndProvision}
            disabled={loading}
            className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Validando..." : "Validar e Provisionar"}
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Provisioning
  const provSteps = getProvisioningSteps(funnelOption!);

  function getStepStatus(key: string): StepStatus {
    if (completedSteps.includes(key)) return "done";
    if (provisionStatus === "failed") {
      const lastCompleted = completedSteps[completedSteps.length - 1];
      const lastIdx = provSteps.findIndex((s) => s.key === lastCompleted);
      const thisIdx = provSteps.findIndex((s) => s.key === key);
      if (thisIdx === lastIdx + 1) return "error";
      if (thisIdx > lastIdx + 1) return "pending";
    }
    if (provisionStatus === "running") {
      const lastCompleted = completedSteps[completedSteps.length - 1];
      const lastIdx = provSteps.findIndex((s) => s.key === lastCompleted);
      const thisIdx = provSteps.findIndex((s) => s.key === key);
      if (thisIdx === lastIdx + 1 || (lastIdx === -1 && thisIdx === 0)) return "running";
    }
    return "pending";
  }

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-2">
        {provisionStatus === "completed" ? "Setup concluido!" : "Configurando seu Supabase e Chatwoot..."}
      </h1>
      <p className="text-muted-foreground mb-8">
        {provisionStatus === "completed"
          ? "Tudo pronto! Seu projeto esta configurado."
          : "Aguarde enquanto criamos toda a estrutura no seu Supabase e Chatwoot."}
      </p>

      <div className="flex flex-col gap-3">
        {provSteps.map((s) => {
          const status = getStepStatus(s.key);
          return (
            <div key={s.key} className="flex items-center gap-3">
              {status === "done" && (
                <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">&#10003;</div>
              )}
              {status === "running" && (
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              )}
              {status === "pending" && (
                <div className="h-5 w-5 rounded-full border-2 border-muted" />
              )}
              {status === "error" && (
                <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">&#10007;</div>
              )}
              <span className={status === "done" ? "text-foreground" : status === "error" ? "text-red-500" : "text-muted-foreground"}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {provisionStatus === "failed" && provisionError && (
        <div className="mt-6 p-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {provisionError}
        </div>
      )}

      {provisionStatus === "completed" && (
        <div className="mt-8">
          <button
            onClick={() => router.push("/boards")}
            className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:bg-primary/90"
          >
            Acessar painel
          </button>
        </div>
      )}
    </div>
  );
}
