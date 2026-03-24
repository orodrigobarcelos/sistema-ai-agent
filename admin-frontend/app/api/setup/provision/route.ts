import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { getTablesSql, getRpcsSql, getTriggerSql, getRlsSql, getStorageSql } from "@/lib/provisioning/sql-templates";
import { getEdgeFunctionSource } from "@/lib/provisioning/edge-function-sources";
import { encrypt } from "@/lib/crypto";


interface ProvisionRequest {
  funnel_option: 1 | 2 | 3;
  access_token: string;
  project_ref: string;
  service_role_key: string;
  secrets: Record<string, string>;
  kanban_board_name?: string;
}

async function runSql(accessToken: string, projectRef: string, query: string) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL failed: ${text}`);
  }
  return res.json();
}

async function setSecrets(accessToken: string, projectRef: string, secrets: Array<{ name: string; value: string }>) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/secrets`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(secrets),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Secrets failed: ${text}`);
  }
}

async function deployEdgeFunction(accessToken: string, projectRef: string, name: string, sourceCode: string) {
  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob(
      [JSON.stringify({ name, verify_jwt: false, entrypoint_path: "index.ts" })],
      { type: "application/json" }
    )
  );
  formData.append(
    "file",
    new Blob([sourceCode], { type: "application/typescript" }),
    "index.ts"
  );

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=${name}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Deploy ${name} failed: ${text}`);
  }
  return res.json();
}

async function chatwootApi(chatwootUrl: string, chatwootToken: string, accountId: string, path: string, body: unknown) {
  const res = await fetch(
    `${chatwootUrl}/api/v1/accounts/${accountId}${path}`,
    {
      method: "POST",
      headers: { api_access_token: chatwootToken, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  // 422 = already exists, treat as ok
  if (!res.ok && res.status !== 422) {
    const text = await res.text();
    throw new Error(`Chatwoot ${path} failed: ${text}`);
  }
}

async function setupChatwootLabels(chatwootUrl: string, chatwootToken: string, accountId: string) {
  const labels = [
    { title: "é_lead", color: "#8F4A1F", show_on_sidebar: true },
    { title: "followup_1", color: "#F101FE", show_on_sidebar: true },
    { title: "followup_2", color: "#37A376", show_on_sidebar: true },
    { title: "followup_3", color: "#B8049E", show_on_sidebar: true },
    { title: "followup_4", color: "#42D6A0", show_on_sidebar: true },
    { title: "pago", color: "#4CFF00", show_on_sidebar: true },
    { title: "pausar_ia", color: "#FF0000", show_on_sidebar: true },
  ];
  for (const label of labels) {
    await chatwootApi(chatwootUrl, chatwootToken, accountId, "/labels", label);
  }
}

async function setupChatwootAttributes(chatwootUrl: string, chatwootToken: string, accountId: string, option: 1 | 2 | 3, boardName: string = "Vendas") {
  const kanbanAttrKey = `kanban_${boardName.toLowerCase().replace(/\s+/g, "_")}`;
  const baseAttrs = [
    "first_name", "lead_id", "utm_source", "utm_medium", "utm_campaign",
    "utm_content", "utm_term", "pagamento_concluido", "pix_qr_code",
    "checkout_url", "abandonou_carrinho", "gerou_pix",
    "compra_recusada", "status_compra", kanbanAttrKey,
  ];

  if (option >= 2) baseAttrs.push("passou_inicio");
  if (option === 3) baseAttrs.push("instagram", "insta_bio");

  for (const key of baseAttrs) {
    await chatwootApi(chatwootUrl, chatwootToken, accountId, "/custom_attribute_definitions", {
      attribute_display_name: key,
      attribute_display_type: 0,
      attribute_description: key,
      attribute_model: 1,
      attribute_key: key,
    });
  }
}

async function setupChatwootWebhook(chatwootUrl: string, chatwootToken: string, accountId: string, webhookUrl: string) {
  await chatwootApi(chatwootUrl, chatwootToken, accountId, "/webhooks", {
    webhook: {
      url: webhookUrl,
      name: "Salvar historico de mensagens no Supabase",
      subscriptions: ["message_created", "conversation_updated", "conversation_typing_on", "contact_updated"],
    },
  });
}

async function updateSetup(setupId: string, completedSteps: string[], log: Array<{ step: string; status: string; error?: string }>, status?: string) {
  const update: Record<string, unknown> = {
    completed_steps: completedSteps,
    provisioning_log: log,
    updated_at: new Date().toISOString(),
  };
  if (status) update.provisioning_status = status;
  await supabaseAdmin.from("user_setups").update(update).eq("id", setupId);
}

async function runProvisioning(
  setupId: string,
  funnel_option: 1 | 2 | 3,
  access_token: string,
  project_ref: string,
  _service_role_key: string,
  secrets: Record<string, string>,
  boardName: string,
  supabaseUrl: string
) {
  const completedSteps: string[] = [];
  const log: Array<{ step: string; status: string; error?: string }> = [];
  const option = funnel_option;

  try {
    // Step 1: Tables
    await runSql(access_token, project_ref, getTablesSql(option, boardName));
    completedSteps.push("tables");
    log.push({ step: "tables", status: "done" });
    await updateSetup(setupId, completedSteps, log);

    // Step 2: RPCs
    await runSql(access_token, project_ref, getRpcsSql(option));
    completedSteps.push("rpcs");
    log.push({ step: "rpcs", status: "done" });
    await updateSetup(setupId, completedSteps, log);

    // Step 3: Trigger
    await runSql(access_token, project_ref, getTriggerSql());
    completedSteps.push("trigger");
    log.push({ step: "trigger", status: "done" });
    await updateSetup(setupId, completedSteps, log);

    // Step 4: RLS
    await runSql(access_token, project_ref, getRlsSql(option));
    completedSteps.push("rls");
    log.push({ step: "rls", status: "done" });
    await updateSetup(setupId, completedSteps, log);

    // Step 5: Secrets
    const secretsList = Object.entries(secrets).map(([name, value]) => ({ name, value }));
    await setSecrets(access_token, project_ref, secretsList);
    completedSteps.push("secrets");
    log.push({ step: "secrets", status: "done" });
    await updateSetup(setupId, completedSteps, log);

    // Step 6: Edge functions
    const edgeFunctions: string[] = ["chatwoot-webhook"];
    if (option >= 2) {
      edgeFunctions.push("process-lead-signup-simple", "submit-lead-simple");
    }
    if (option === 3) {
      edgeFunctions.splice(edgeFunctions.indexOf("process-lead-signup-simple"), 1, "process-lead-signup-sales");
      edgeFunctions.splice(edgeFunctions.indexOf("submit-lead-simple"), 1, "submit-lead-sales");
      edgeFunctions.push("generate-personalization-sales", "instagram-profile", "convert-images-base64");
    }

    for (const fn of edgeFunctions) {
      const source = getEdgeFunctionSource(fn);
      await deployEdgeFunction(access_token, project_ref, fn, source);
      completedSteps.push(`edge-${fn}`);
      log.push({ step: `edge-${fn}`, status: "done" });
      await updateSetup(setupId, completedSteps, log);
    }

    // Step 7: Storage (option 3 only)
    if (option === 3) {
      await runSql(access_token, project_ref, getStorageSql());
      completedSteps.push("storage");
      log.push({ step: "storage", status: "done" });
      await updateSetup(setupId, completedSteps, log);
    }

    // Step 8: Chatwoot
    const cUrl = secrets.CHATWOOT_URL;
    const cToken = secrets.CHATWOOT_API_TOKEN;
    const cAccount = secrets.CHATWOOT_ACCOUNT_ID;

    if (cUrl && cToken && cAccount) {
      await setupChatwootLabels(cUrl, cToken, cAccount);
      completedSteps.push("chatwoot-labels");
      log.push({ step: "chatwoot-labels", status: "done" });
      await updateSetup(setupId, completedSteps, log);

      await setupChatwootAttributes(cUrl, cToken, cAccount, option, boardName);
      completedSteps.push("chatwoot-attributes");
      log.push({ step: "chatwoot-attributes", status: "done" });
      await updateSetup(setupId, completedSteps, log);

      const webhookUrl = `${supabaseUrl}/functions/v1/chatwoot-webhook`;
      await setupChatwootWebhook(cUrl, cToken, cAccount, webhookUrl);
      completedSteps.push("chatwoot-webhook");
      log.push({ step: "chatwoot-webhook", status: "done" });
      await updateSetup(setupId, completedSteps, log);
    }

    // Done
    await updateSetup(setupId, completedSteps, log, "completed");
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.push({ step: "error", status: "failed", error: errorMsg });
    await updateSetup(setupId, completedSteps, log, "failed");
  }
}

export const maxDuration = 300; // 5 minutes

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const body: ProvisionRequest = await request.json();
    const { funnel_option, access_token, project_ref, service_role_key, secrets, kanban_board_name } = body;
    const boardName = (kanban_board_name || "Vendas").trim();

    if (!project_ref || !funnel_option) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    if (!access_token || !service_role_key) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const supabaseUrl = `https://${project_ref}.supabase.co`;

    // Create setup record
    const { data: setup, error: insertError } = await supabaseAdmin
      .from("user_setups")
      .insert({
        user_id: user.id,
        funnel_option,
        supabase_project_ref: project_ref,
        supabase_url: supabaseUrl,
        supabase_service_role_key: encrypt(service_role_key),
        provisioning_status: "in_progress",
        completed_steps: [],
        provisioning_log: [],
        chatwoot_url: secrets.CHATWOOT_URL || null,
        chatwoot_account_id: secrets.CHATWOOT_ACCOUNT_ID || null,
        chatwoot_api_token: secrets.CHATWOOT_API_TOKEN ? encrypt(secrets.CHATWOOT_API_TOKEN) : null,
        kanban_board_name: boardName,
      })
      .select("id")
      .single();

    if (insertError || !setup) {
      return NextResponse.json({ error: "Erro ao criar setup" }, { status: 500 });
    }

    const setupId = setup.id;

    // Run provisioning in background (fire-and-forget)
    runProvisioning(setupId, funnel_option, access_token, project_ref, service_role_key, secrets, boardName, supabaseUrl);

    // Return immediately so frontend can start polling
    return NextResponse.json({
      setup_id: setupId,
      status: "in_progress",
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
