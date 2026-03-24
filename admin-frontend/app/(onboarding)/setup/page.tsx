"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type FunnelOption = 1 | 2 | 3;
type Step = "select" | "credentials" | "provisioning";
type StepStatus = "pending" | "running" | "done" | "error";

const FUNNEL_OPTIONS = [
  {
    value: 1 as FunnelOption,
    title: "Básico",
    subtitle: "",
    description: "Para quem não possui página de captura",
  },
  {
    value: 2 as FunnelOption,
    title: "Básico com captura",
    subtitle: "",
    description: "Para quem possui página de captura",
  },
  {
    value: 3 as FunnelOption,
    title: "Completo com Instagram",
    subtitle: "",
    description: "Para quem possui página de captura e coleta Instagram",
  },
];

function getProvisioningSteps(option: FunnelOption) {
  const steps = [
    { key: "tables", label: "Criando tabelas..." },
    { key: "rpcs", label: "Criando funções RPC..." },
    { key: "trigger", label: "Criando trigger..." },
    { key: "rls", label: "Ativando políticas RLS..." },
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
      { key: "edge-process-lead-signup-sales", label: "Deploy: process-lead-signup-sales..." },
      { key: "edge-submit-lead-sales", label: "Deploy: submit-lead-sales..." },
      { key: "edge-generate-personalization-sales", label: "Deploy: generate-personalization-sales..." },
      { key: "edge-instagram-profile", label: "Deploy: instagram-profile..." },
      { key: "edge-convert-images-base64", label: "Deploy: convert-images-base64..." },
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
  const [kanbanBoardName, setKanbanBoardName] = useState("Vendas");

  // Provisioning
  const [setupId, setSetupId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [provisionStatus, setProvisionStatus] = useState<"running" | "completed" | "failed">("running");
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (provisionStatus === "completed" && summaryRef.current) {
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [provisionStatus]);

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
      toast.error("Preencha Access Token, Project ID e Service Role Key");
      return;
    }

    if (!kanbanBoardName.trim()) {
      toast.error("Preencha o nome do Kanban");
      return;
    }

    if (!chatwootApiToken || !chatwootUrl || !chatwootAccountId || !openaiApiKey || !geminiApiKey) {
      toast.error("Preencha todos os campos de Secrets obrigatórios");
      return;
    }

    if (funnelOption! >= 2 && funnelOption! <= 3 && !n8nWebhookUrl) {
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
        toast.error(valData.error || "Credenciais inválidas");
        setLoading(false);
        return;
      }

      // Validação OK — segue direto para provisioning

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
      toast.success("Configuração de projeto iniciada!");

      const provRes = await fetch("/api/setup/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnel_option: funnelOption,
          access_token: accessToken,
          project_ref: projectRef,
          service_role_key: serviceRoleKey,
          secrets,
          kanban_board_name: kanbanBoardName.trim(),
        }),
      });
      const provData = await provRes.json();

      if (!provRes.ok && !provData.setup_id) {
        toast.error(provData.error || "Erro ao iniciar provisioning");
        setStep("credentials");
        setProvisionStatus("running");
        return;
      }

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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // Step 1: Select funnel
  if (step === "select") {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 relative">
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          title="Sair"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
        <h1 className="text-3xl font-bold text-center mb-2">Escolha sua arquitetura de funil abaixo 👇🏻</h1>
        <p className="text-muted-foreground text-center mb-10">Selecione a opção que melhor se encaixa no seu cenário.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {FUNNEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFunnelOption(opt.value)}
              className={`text-left p-6 rounded-lg border transition-all ${
                funnelOption === opt.value
                  ? "border-white ring-2 ring-white bg-zinc-700/60"
                  : "border-zinc-600 bg-zinc-800/80 hover:border-zinc-400"
              }`}
            >
              <div className="text-sm font-medium text-muted-foreground mb-1">Arquitetura {opt.value}</div>
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
            Próximo
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Credentials
  if (step === "credentials") {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold mb-2">Configure sua infra</h1>
        <p className="text-muted-foreground mb-8">
          Preencha as credenciais do seu projeto Supabase, Chatwoot e chaves API.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Supabase Access Token</label>
            <input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600" placeholder="sbp_..." />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Project ID</label>
            <input type="text" value={projectRef} onChange={(e) => setProjectRef(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600" placeholder="abcdefghijklmnop" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Service Role Key</label>
            <input type="password" value={serviceRoleKey} onChange={(e) => setServiceRoleKey(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600" placeholder="eyJ..." />
          </div>

          <hr className="my-4 border-zinc-700" />
          <h2 className="text-lg font-semibold">Kanban</h2>

          <div>
            <input type="text" value={kanbanBoardName} onChange={(e) => setKanbanBoardName(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600" placeholder="Vendas" />
            <p className="text-xs text-muted-foreground mt-1">Nome do quadro kanban que será criado no Supabase e vinculado ao Chatwoot</p>
          </div>

          <hr className="my-4 border-zinc-700" />
          <h2 className="text-lg font-semibold">Secrets</h2>

          <div>
            <label className="block text-sm font-medium mb-1">CHATWOOT_API_TOKEN</label>
            <input type="text" value={chatwootApiToken} onChange={(e) => setChatwootApiToken(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">CHATWOOT_URL</label>
            <input type="text" value={chatwootUrl} onChange={(e) => setChatwootUrl(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600" placeholder="https://..." />
            <p className="text-xs text-muted-foreground mt-1">Sem barra no final</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">CHATWOOT_ACCOUNT_ID</label>
            <input type="text" value={chatwootAccountId} onChange={(e) => setChatwootAccountId(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600" placeholder="1" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">OPENAI_API_KEY</label>
            <input type="password" value={openaiApiKey} onChange={(e) => setOpenaiApiKey(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600" placeholder="sk-..." />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">GEMINI_API_KEY</label>
            <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600" placeholder="AI..." />
          </div>

          {funnelOption! >= 2 && funnelOption! <= 3 && (
            <div>
              <label className="block text-sm font-medium mb-1">N8N_WEBHOOK_URL</label>
              <input type="text" value={n8nWebhookUrl} onChange={(e) => setN8nWebhookUrl(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600" placeholder="https://..." />
              <p className="text-xs text-muted-foreground mt-1">Production URL do fluxo inicial do n8n</p>
            </div>
          )}

          {funnelOption === 3 && (
            <div>
              <label className="block text-sm font-medium mb-1">RAPIDAPI_KEY</label>
              <input type="password" value={rapidApiKey} onChange={(e) => setRapidApiKey(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600" />
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
            {loading ? "Configurando..." : "Validar e Provisionar"}
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
        {provisionStatus === "completed" ? "Setup concluído!" : "Configurando sua infra..."}
      </h1>
      <p className="text-muted-foreground mb-8">
        {provisionStatus === "completed"
          ? "Tudo pronto! Seu projeto está configurado."
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
        <div className="mt-8" ref={summaryRef}>
          <div className="rounded-lg border border-zinc-600 bg-zinc-800/80 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">O que foi criado no seu projeto:</h2>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Supabase — Tabelas</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li><code className="text-zinc-300">leads</code> — contatos/leads com campos UTM</li>
                <li><code className="text-zinc-300">n8n_chat_histories_whatsapp</code> — histórico de mensagens</li>
                <li><code className="text-zinc-300">kanban_boards</code> — quadros kanban</li>
                <li><code className="text-zinc-300">kanban_columns</code> — colunas de cada board</li>
                <li><code className="text-zinc-300">kanban_lead_positions</code> — posição dos leads nas colunas</li>
                <li><code className="text-zinc-300">chat_control</code> — controle de pausa da IA</li>
                <li><code className="text-zinc-300">conversation_summaries</code> — resumos de conversa</li>
                <li><code className="text-zinc-300">workflow_control</code> — controle de execução de workflows</li>
                <li><code className="text-zinc-300">message_buffer</code> — buffer de mensagens</li>
                {funnelOption === 3 && (
                  <>
                    <li><code className="text-zinc-300">instagram</code> — dados de perfil Instagram</li>
                    <li><code className="text-zinc-300">personalizations</code> — mensagens personalizadas</li>
                  </>
                )}
              </ul>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Supabase — RPCs (funções)</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li><code className="text-zinc-300">delete_duplicate_human_message</code></li>
                <li><code className="text-zinc-300">get_lead_board_column</code></li>
                <li><code className="text-zinc-300">get_leads_pending_followup</code></li>
                <li><code className="text-zinc-300">mark_followup_done</code></li>
                <li><code className="text-zinc-300">mark_followup_attempted</code></li>
                <li><code className="text-zinc-300">is_ai_paused</code></li>
                <li><code className="text-zinc-300">move_lead_to_board_column</code></li>
                <li><code className="text-zinc-300">try_start_workflow / stop_workflow</code></li>
                <li><code className="text-zinc-300">count_chat_messages</code></li>
                <li><code className="text-zinc-300">get_messages_for_summary</code></li>
                <li><code className="text-zinc-300">get_last_messages</code></li>
                {funnelOption === 3 && (
                  <>
                    <li><code className="text-zinc-300">get_insta_infos</code></li>
                    <li><code className="text-zinc-300">get_lead_data</code></li>
                  </>
                )}
              </ul>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Supabase — Trigger</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li><code className="text-zinc-300">trg_link_lead_session_id</code> — vincula lead ao session_id automaticamente</li>
              </ul>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Supabase — Edge Functions</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li><code className="text-zinc-300">chatwoot-webhook</code> — recebe eventos do Chatwoot</li>
                {funnelOption === 2 && (
                  <>
                    <li><code className="text-zinc-300">process-lead-signup-simple</code></li>
                    <li><code className="text-zinc-300">submit-lead-simple</code></li>
                  </>
                )}
                {funnelOption === 3 && (
                  <>
                    <li><code className="text-zinc-300">process-lead-signup-sales</code></li>
                    <li><code className="text-zinc-300">submit-lead-sales</code></li>
                    <li><code className="text-zinc-300">generate-personalization-sales</code></li>
                    <li><code className="text-zinc-300">instagram-profile</code></li>
                    <li><code className="text-zinc-300">convert-images-base64</code></li>
                  </>
                )}
              </ul>
            </div>

            {funnelOption === 3 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-2">Supabase — Storage</h3>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li><code className="text-zinc-300">instagram_avatars</code> — bucket público para fotos de perfil</li>
                </ul>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Supabase — RLS + Secrets</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>RLS ativado em todas as tabelas (acesso restrito a <code className="text-zinc-300">service_role</code>)</li>
                <li>Secrets configurados: CHATWOOT_API_TOKEN, CHATWOOT_URL, CHATWOOT_ACCOUNT_ID, OPENAI_API_KEY, GEMINI_API_KEY{funnelOption! >= 2 ? ", N8N_WEBHOOK_URL" : ""}{funnelOption === 3 ? ", RAPIDAPI_KEY" : ""}</li>
              </ul>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Supabase — Kanban</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Board <code className="text-zinc-300">{kanbanBoardName}</code> com 10 colunas: RECEBIDO, RESPONDEU, EM FECHAMENTO, FALAR C/ HUMANO, CARRINHO ABANDONADO, COMPRA RECUSADA, PAGAMENTO GERADO, FECHADO, PERDIDO, REEMBOLSO</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Chatwoot</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Etiquetas: é_lead, followup_1, followup_2, followup_3, followup_4, pago, pausar_ia</li>
                <li>Atributos personalizados: first_name, lead_id, UTMs, status de compra, kanban_{kanbanBoardName.toLowerCase().replace(/\s+/g, "_")}{funnelOption! >= 2 ? ", passou_inicio" : ""}{funnelOption === 3 ? ", instagram, insta_bio" : ""}</li>
                <li>Webhook configurado para salvar histórico de mensagens no Supabase</li>
              </ul>
            </div>
          </div>

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
