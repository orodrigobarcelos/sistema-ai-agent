import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const CONCURRENCY = 30;
const PAGE_SIZE = 15;

interface ChatwootContact {
  id: number;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: number;
  custom_attributes: Record<string, unknown>;
}

async function chatwootGet(url: string, token: string): Promise<Response> {
  return fetch(url, { headers: { api_access_token: token } });
}

async function fetchBatch<T>(
  urls: string[],
  token: string,
  parse: (data: unknown) => T
): Promise<T[]> {
  const results = await Promise.all(
    urls.map((url) =>
      chatwootGet(url, token)
        .then((r) => r.json())
        .then(parse)
    )
  );
  return results;
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Nao autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: setup } = await supabaseAdmin
      .from("user_setups")
      .select("chatwoot_url, chatwoot_account_id, chatwoot_api_token, supabase_url, supabase_service_role_key")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!setup?.chatwoot_url || !setup?.chatwoot_api_token || !setup?.chatwoot_account_id) {
      return new Response(JSON.stringify({ error: "Chatwoot nao configurado" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { chatwoot_url, chatwoot_account_id, chatwoot_api_token } = setup;
    const baseUrl = `${chatwoot_url}/api/v1/accounts/${chatwoot_account_id}`;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Phase 1: Fetch first page to get total
          const firstRes = await chatwootGet(`${baseUrl}/contacts?page=1`, chatwoot_api_token);
          const firstData = await firstRes.json();
          const totalContacts: number = firstData.meta.count;
          const totalPages = Math.ceil(totalContacts / PAGE_SIZE);

          const allContacts: ChatwootContact[] = [...firstData.payload];
          send({ phase: "contacts", current: 1, total: totalPages, totalContacts });

          // Fetch remaining pages in batches
          let page = 2;
          while (page <= totalPages) {
            const batchPages: string[] = [];
            for (let i = 0; i < CONCURRENCY && page + i <= totalPages; i++) {
              batchPages.push(`${baseUrl}/contacts?page=${page + i}`);
            }

            const results = await fetchBatch(batchPages, chatwoot_api_token, (data: unknown) => {
              const d = data as { payload: ChatwootContact[] };
              return d.payload;
            });

            for (const contacts of results) {
              allContacts.push(...contacts);
            }

            page += batchPages.length;
            send({ phase: "contacts", current: Math.min(page - 1, totalPages), total: totalPages, totalContacts });
          }

          // Phase 2: Fetch labels for each contact
          send({ phase: "labels", current: 0, total: allContacts.length });

          const contactLabels: Record<number, string[]> = {};

          for (let i = 0; i < allContacts.length; i += CONCURRENCY) {
            const batch = allContacts.slice(i, i + CONCURRENCY);
            const urls = batch.map((c) => `${baseUrl}/contacts/${c.id}/conversations`);

            const results = await fetchBatch(urls, chatwoot_api_token, (data: unknown) => {
              const d = data as { payload: Array<{ labels?: string[] }> };
              const labels = new Set<string>();
              for (const conv of d.payload || []) {
                for (const label of conv.labels || []) {
                  labels.add(label);
                }
              }
              return Array.from(labels);
            });

            batch.forEach((c, idx) => {
              contactLabels[c.id] = results[idx];
            });

            const done = Math.min(i + batch.length, allContacts.length);
            send({ phase: "labels", current: done, total: allContacts.length });
          }

          // Phase 3: Fetch kanban positions from student's Supabase
          send({ phase: "kanban", current: 0, total: 1 });

          // kanbanByLeadId: match by lead_id from custom_attributes
          // kanbanByPhone: fallback match by last 8 digits of phone
          const kanbanByLeadId: Record<string, { board: string; column: string }> = {};
          const kanbanByPhone: Record<string, { board: string; column: string }> = {};

          if (setup.supabase_url && setup.supabase_service_role_key) {
            try {
              const studentDb = createClient(setup.supabase_url, setup.supabase_service_role_key);

              const { data: positions } = await studentDb
                .from("kanban_lead_positions")
                .select("lead_id, kanban_columns(name, kanban_boards(name))");

              // Also fetch leads to get phone for fallback matching
              const { data: leads } = await studentDb
                .from("leads")
                .select("id, whatsapp");

              const leadPhoneMap: Record<string, string> = {};
              if (leads) {
                for (const lead of leads) {
                  leadPhoneMap[lead.id] = lead.whatsapp?.replace(/\D/g, "") || "";
                }
              }

              if (positions) {
                for (const pos of positions) {
                  const col = pos.kanban_columns as unknown as { name: string; kanban_boards: { name: string } } | null;
                  if (col && pos.lead_id) {
                    const kanbanInfo = {
                      board: col.kanban_boards?.name || "",
                      column: col.name || "",
                    };
                    kanbanByLeadId[pos.lead_id] = kanbanInfo;

                    // Fallback: map by last 8 digits of phone
                    const phone = leadPhoneMap[pos.lead_id];
                    if (phone) {
                      const last8 = phone.slice(-8);
                      kanbanByPhone[last8] = kanbanInfo;
                    }
                  }
                }
              }
            } catch {
              // Kanban data is optional, continue without it
            }
          }

          send({ phase: "kanban", current: 1, total: 1 });

          // Phase 4: Generate CSV
          send({ phase: "generating", current: 0, total: 1 });

          const allAttrKeys = new Set<string>();
          for (const c of allContacts) {
            for (const key of Object.keys(c.custom_attributes || {})) {
              allAttrKeys.add(key);
            }
          }
          const attrKeys = Array.from(allAttrKeys).sort();

          const headers = ["Nome", "Email", "Telefone", "Criado em", ...attrKeys, "Labels", "Kanban Board", "Kanban Coluna"];
          const rows = allContacts.map((c) => {
            const leadId = String(c.custom_attributes?.lead_id ?? "");
            let kanban = kanbanByLeadId[leadId];
            // Fallback: match by last 8 digits of phone
            if (!kanban && c.phone_number) {
              const last8 = c.phone_number.replace(/\D/g, "").slice(-8);
              kanban = kanbanByPhone[last8];
            }
            const values = [
              c.name,
              c.email,
              c.phone_number,
              c.created_at ? new Date(c.created_at * 1000).toLocaleDateString("pt-BR") : "",
              ...attrKeys.map((k) => c.custom_attributes?.[k]),
              (contactLabels[c.id] || []).join(", "),
              kanban?.board ?? "",
              kanban?.column ?? "",
            ];
            return values.map(escapeCsv).join(",");
          });

          const csv = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows].join("\n");

          send({ phase: "complete", csv });
          controller.close();
        } catch (err) {
          send({ phase: "error", message: err instanceof Error ? err.message : String(err) });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
