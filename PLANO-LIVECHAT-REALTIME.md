# Plano de Implementação — Live Chat Real-Time v3

## Contexto

**Problema:** As mensagens do lead só aparecem no live chat quando o AI Agent processa (~45-70s de delay). Mídia não é exibida. Não há como pausar a IA.

**Solução:** Nodes no N8N + RPC functions + Supabase Storage + ajustes no frontend.

---

## Cenário 1: AI Agent RESPONDENDO

### 1A. Usuário envia TEXTO

```
Recebe msg → ... → Verifica tipo arquivo → Branch "Texto" (Edit Fields)
  ─── NODE: INSERT na n8n_chat_histories_whatsapp (type "human", content real) ───
  │    → Realtime → aparece no live chat
  → Merge → Buffer 30s → Concatenar → AI Agent
  → Postgres Chat Memory insere msg concatenada (type "human")
  ─── NODE: DELETE concatenada (RPC delete_duplicate_human_message) ───
  → AI responde → Postgres Chat Memory insere (type "ai") → aparece no live chat
  → Envia pro WhatsApp
```

### 1B. Usuário envia MÍDIA

```
Recebe msg → ... → Verifica tipo arquivo → Branch mídia
  → Extrair Base64
  ─── NODE: Converter pra binary ───
  ─── NODE: Upload pro Supabase Storage (PUT direto) ───
  ─── NODE: RPC insert_chat_media_message ───
  │    Placeholder: "[O usuário enviou uma imagem]"
  │    → Realtime → mídia aparece no live chat
  → Analisar (GPT-4o/Whisper/Gemini) → Preparar descrição
  ─── NODE: INSERT caption + descrição na n8n_chat_histories_whatsapp ───
  │    Content: "[O usuário enviou uma imagem]\nDescrição da imagem: ..."
  │    Type: "human"
  │    → NÃO aparece no live chat (frontend filtra)
  │    → Registro separado, permanece na tabela (contexto histórico)
  → Merge → Buffer 30s → Concatenar → AI Agent
  → Postgres Chat Memory insere concatenada
  ─── NODE: DELETE concatenada (RPC) ───
  │    → Descrição do NODE SEPARADO permanece (outro registro)
  → AI responde → aparece no live chat → Envia pro WhatsApp
```

### 1C. AI Agent responde com MÍDIA

```
  → Mídia já está no bucket
  ─── NODE: RPC insert_chat_media_message (type "ai") ───
  │    → Realtime → mídia aparece no live chat
  → Envia mídia via Evolution API pro lead
```

---

## Cenário 2: AI Agent PAUSADO

### 2A. Texto (pausado)

```
  → INSERT na tabela → aparece no live chat
  → Merge → CHECK PAUSA → pausado → PARA
```

### 2B. Mídia (pausado)

```
  → Upload bucket + RPC → mídia aparece no live chat
  → Análise gera descrição
  → INSERT descrição na tabela (node separado, não aparece no chat)
  → Merge → CHECK PAUSA → pausado → PARA
  → (descrição preservada pra quando IA voltar)
```

### 2C. Admin envia TEXTO via live chat

```
  → INSERT na n8n_chat_histories_whatsapp (type "ai")
  → aparece no live chat via Realtime
  → Envia via Evolution API pro lead
```

### 2D. Admin envia MÍDIA via live chat

```
  → Frontend envia FormData pra API Route /api/chat/send-media
  → API Route: upload Storage → INSERT tabelas → envia URL pra Evolution
  → aparece no live chat via Realtime
```

---

## RPC Functions

### insert_chat_media_message (Supabase)

Chamada pelo N8N após upload pro Storage.

**Parâmetros:**
- `p_session_id` TEXT
- `p_storage_path` TEXT
- `p_media_type` TEXT (image, audio, video, document, sticker)
- `p_mime_type` TEXT
- `p_msg_type` TEXT DEFAULT 'human' (ou 'ai')

**Faz:**
1. INSERT placeholder na n8n_chat_histories_whatsapp
2. INSERT na chat_media com message_id

**Placeholders:**
- image → [O usuário enviou uma imagem]
- audio → [O usuário enviou um áudio]
- video → [O usuário enviou um vídeo]
- document → [O usuário enviou um documento]
- sticker → [O usuário enviou uma figurinha]

**Chamada do N8N:**
```
POST https://suexauxtxrdjnyoslrzu.supabase.co/rest/v1/rpc/insert_chat_media_message
Headers: apikey + Authorization (SERVICE_ROLE_KEY)
Body: { "p_session_id": "...", "p_storage_path": "...", "p_media_type": "image", "p_mime_type": "image/jpeg" }
```

### delete_duplicate_human_message (Supabase)

Chamada pelo N8N após AI Agent.

**Parâmetros:**
- `p_session_id` TEXT
- `p_content` TEXT (conteúdo exato da msg concatenada)

**Chamada do N8N:**
```
POST https://suexauxtxrdjnyoslrzu.supabase.co/rest/v1/rpc/delete_duplicate_human_message
Headers: apikey + Authorization (SERVICE_ROLE_KEY)
Body: { "p_session_id": "...", "p_content": "{{mensagem_concatenada}}" }
```

---

## Nodes no N8N

### INSERT texto (1 node)
- **Onde:** Branch "Texto" (após Edit Fields), antes do Merge
- **O que:** Supabase INSERT ou HTTP Request
- **Tabela:** n8n_chat_histories_whatsapp
- **Body:** `{ session_id, message: { type: "human", content: "{{texto}}", ... } }`

### Upload mídia (3 nodes por branch × 5 branches = 15 nodes)
- **Node 1:** Converter base64 pra binary (já existe no áudio)
- **Node 2:** Upload pro Storage: `PUT https://suexauxt.../storage/v1/object/chat-media/{{session_id}}/{{timestamp}}.{{ext}}`
- **Node 3:** RPC insert_chat_media_message

### INSERT descrição (5 nodes, 1 por branch mídia)
- **Onde:** Após "Preparar descrição", antes do Merge
- **O que:** INSERT na n8n_chat_histories_whatsapp
- **Body:** `{ session_id, message: { type: "human", content: "[O usuário enviou uma imagem]\nDescrição: ...", ... } }`
- **Nota:** Frontend filtra esta mensagem (não exibe)

### CHECK PAUSA (1 node)
- **Onde:** Após Merge, antes de Preparar dados buffer
- **O que:** GET chat_control, IF ai_paused = true → PARA

### DELETE concatenada (1 node)
- **Onde:** Após AGENTE DE I.A.
- **O que:** RPC delete_duplicate_human_message

**Total: 23 nodes novos no N8N**

---

## Frontend (implementado)

### Arquivos criados/alterados:

| Arquivo | O que faz |
|---------|----------|
| `lib/types.ts` | Interface ChatMedia adicionada |
| `app/api/chat/[sessionId]/pause/route.ts` | GET/PUT toggle pausa |
| `app/api/chat/send-media/route.ts` | Upload mídia admin → Storage → tabelas → Evolution |
| `components/chat/chat-messages.tsx` | Renderiza mídia, filtra descrições, botão pausar IA |
| `components/chat/chat-input.tsx` | Botão anexar arquivo (Paperclip) + file picker |
| `app/chat/page.tsx` | Estado pausa/mídia, Realtime DELETE + chat_media INSERT |

### Frontend filtra descrições de mídia:
- Se `content` contém `[O usuário enviou um` E contém `Descrição` → não renderiza
- Se `content` é exatamente um placeholder → renderiza mídia do Storage

---

## Tabelas Supabase

| Tabela/Recurso | Status |
|----------------|--------|
| `chat_control` | Criada |
| `chat_media` | Criada |
| Bucket `chat-media` | Criado |
| RPC `delete_duplicate_human_message` | Criada |
| RPC `insert_chat_media_message` | Criada |
| RLS policies | Criadas |
| Realtime publication (chat_media) | Configurada |

---

## Decisões Técnicas

- Postgres Chat Memory permanece na n8n_chat_histories_whatsapp (SEM tabela separada)
- Webhook Evolution vai SÓ pro N8N (URL única)
- Frontend usa supabase-client.ts (anon key) para Realtime
- Mídia do lead: N8N faz upload direto pro Storage (binary), depois chama RPC
- Mídia do admin: API Route recebe FormData, faz upload, envia URL pra Evolution
- Descrição de mídia: node separado insere na tabela (registro independente, não deletado pelo Node 2)
- Frontend filtra descrições pelo marcador "[O usuário enviou um" + "Descrição"
- Admin envia como type "ai" (lado do negócio)
- DELETE por conteúdo exato (RPC), evita race condition
