# Implementacao — Sistema de Resumo de Historico de Conversas

Tabela `conversation_summaries` ja criada no Supabase.

Estrutura da tabela de historico do n8n:
- Tabela: `n8n_chat_histories_whatsapp`
- Colunas: `id` (int), `session_id` (varchar), `message` (jsonb: {type: "ai"|"human", content: "..."}), `created_at` (timestamptz)

---

## COMO FUNCIONA

- O AI Agent envia as ultimas 20 mensagens pro OpenAI (janela de contexto)
- Quando o total de mensagens ultrapassa 20, TODA mensagem nova dispara a geracao/atualizacao do resumo
- O resumo e incremental: envia o resumo anterior + apenas as mensagens novas que cairam fora da janela
- O resumo e injetado no prompt do AI Agent como contexto historico
- Custo por chamada de resumo: ~$0.0004 (gpt-4o-mini)

---

## PARTE 1 — Nodes ANTES do AGENTE DE I.A.

Inserir entre "Concatenar mensagens" e "AGENTE DE I.A."

---

### Node 1: "Buscar resumo existente" (HTTP Request)

- **Tipo:** HTTP Request
- **Method:** GET
- **URL:**
```
https://suexauxtxrdjnyoslrzu.supabase.co/rest/v1/conversation_summaries?session_id=eq.{{ $('Recebe mensagem').item.json.body.data.key.remoteJid }}&select=summary,total_messages_at_summary
```
- **Headers:**
  - `apikey` = SUPABASE_SERVICE_ROLE_KEY
  - `Authorization` = `Bearer {SUPABASE_SERVICE_ROLE_KEY}`
- **Settings:** "Always Output Data" = ON (para nao quebrar o fluxo quando nao existe resumo)
- **Response:** Array. Se existir resumo, retorna `[{ summary: "...", total_messages_at_summary: 45 }]`. Se nao, retorna `[]`.

---

### Node 2: "Preparar contexto" (Code)

Substitui o antigo node IF "Tem resumo?" — trata ambos os casos internamente.

- **Tipo:** Code (JavaScript)
- **Code:**
```javascript
const resumoData = $('Buscar resumo existente').first().json;
const mensagem = $('Concatenar mensagens').first().json.mensagem;

let contexto = mensagem;

if (resumoData && resumoData.length > 0 && resumoData[0].summary) {
  contexto = `[CONTEXTO HISTORICO - Resumo das mensagens anteriores]\n${resumoData[0].summary}\n\n[MENSAGENS RECENTES]\n${mensagem}`;
}

return [{ json: { mensagem: contexto } }];
```

No node AGENTE DE I.A., o campo "Prompt (User Message)" deve referenciar este node:
```
{{ $('Preparar contexto').item.json.mensagem }}
```

---

## PARTE 2 — Nodes DEPOIS do envio da resposta

Inserir DEPOIS do "Limpar buffer" (nao bloqueia a conversa — o lead ja recebeu a resposta).

**Logica:** Toda mensagem nova apos 20 mensagens totais dispara a geracao/atualizacao do resumo.

---

### Node 3: "Contar mensagens totais" (HTTP Request)

- **Tipo:** HTTP Request
- **Method:** GET
- **URL:**
```
https://suexauxtxrdjnyoslrzu.supabase.co/rest/v1/n8n_chat_histories_whatsapp?session_id=eq.{{ $('Recebe mensagem').item.json.body.data.key.remoteJid }}&select=id
```
- **Headers:**
  - `apikey` = SUPABASE_SERVICE_ROLE_KEY
  - `Authorization` = `Bearer {SUPABASE_SERVICE_ROLE_KEY}`
- **Response:** Array com todos os IDs. O total e `$json.length` no proximo node.

---

### Node 4: "Buscar resumo atual" (HTTP Request)

- **Tipo:** HTTP Request
- **Method:** GET
- **URL:**
```
https://suexauxtxrdjnyoslrzu.supabase.co/rest/v1/conversation_summaries?session_id=eq.{{ $('Recebe mensagem').item.json.body.data.key.remoteJid }}&select=summary,total_messages_at_summary
```
- **Headers:**
  - `apikey` = SUPABASE_SERVICE_ROLE_KEY
  - `Authorization` = `Bearer {SUPABASE_SERVICE_ROLE_KEY}`

---

### Node 5: "Precisa resumir?" (Code)

Substituiu o node IF pois a expressao booleana complexa nao funciona bem no IF do n8n.
Retorna `[]` (array vazio) para parar o fluxo quando NAO precisa resumir.

- **Tipo:** Code (JavaScript)
- **Code:**
```javascript
const totalMessages = $('Contar mensagens totais').all().length;
const resumoData = $('Buscar resumo atual').first().json;
const lastTotal = resumoData && resumoData[0]
  ? resumoData[0].total_messages_at_summary
  : 0;

// Resumo roda quando:
// 1. Total > 20 (janela de contexto)
// 2. Total > lastTotal (tem mensagem nova desde o ultimo resumo)
// A condicao 2 evita re-processar em caso de retry/execucao duplicada
if (totalMessages > 20 && totalMessages > lastTotal) {
  return [{ json: { precisa_resumir: true, total_messages: totalMessages, last_total: lastTotal } }];
}

// Retorna array vazio = para o fluxo aqui
return [];
```

---

### Node 6: "Buscar mensagens pra resumir" (HTTP Request)

- **Tipo:** HTTP Request
- **Method:** GET
- **URL:**
```
https://suexauxtxrdjnyoslrzu.supabase.co/rest/v1/n8n_chat_histories_whatsapp?session_id=eq.{{ $('Recebe mensagem').item.json.body.data.key.remoteJid }}&select=id,message,created_at&order=id.asc
```
- **Headers:**
  - `apikey` = SUPABASE_SERVICE_ROLE_KEY
  - `Authorization` = `Bearer {SUPABASE_SERVICE_ROLE_KEY}`

---

### Node 7: "Formatar mensagens pra resumo" (Code)

Extrai APENAS as mensagens novas que cairam fora da janela de 20 desde o ultimo resumo.

- **Tipo:** Code (JavaScript)
- **Code:**
```javascript
const allMessages = $input.all().map(item => item.json);
const total = allMessages.length;
const windowSize = 20;

const lastTotal = $('Precisa resumir?').first().json.last_total;

// Msgs fora da janela: posicoes 0 ate (total - windowSize - 1)
const outsideWindow = allMessages.slice(0, Math.max(0, total - windowSize));

// Msgs novas: apenas as que cairam desde o ultimo resumo
const lastOutside = Math.max(0, lastTotal - windowSize);
const newMessages = outsideWindow.slice(lastOutside);

// Formatar pra texto
const formatted = newMessages.map(m => {
  const role = m.message.type === 'human' ? 'Lead' : 'Agente';
  return `${role}: ${m.message.content}`;
}).join('\n');

return [{ json: { messages_text: formatted, count: total } }];
```

---

### Node 8a: "Preparar body OpenAI" (Code)

Necessario porque o texto das mensagens contem quebras de linha, aspas e markdown
que quebram o JSON quando interpolados diretamente no HTTP Request do n8n.

- **Tipo:** Code (JavaScript)
- **Code:**
```javascript
const resumoAtual = $('Buscar resumo atual').first().json;
const messagesText = $('Formatar mensagens pra resumo').first().json.messages_text;

let userContent;
if (resumoAtual && resumoAtual[0] && resumoAtual[0].summary) {
  userContent = 'Resumo anterior:\n' + resumoAtual[0].summary + '\n\nNovas mensagens para incorporar ao resumo:\n' + messagesText;
} else {
  userContent = 'Gere o resumo desta conversa:\n' + messagesText;
}

const body = {
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'Voce e um assistente que gera resumos de conversas de vendas via WhatsApp. Gere um resumo conciso e completo mantendo TODAS as informacoes essenciais: nome do lead e dados pessoais mencionados, produto/servico discutido, interesse demonstrado, objecoes levantadas e como foram tratadas, compromissos feitos, estagio da negociacao, e qualquer informacao relevante pra continuar a conversa. Seja objetivo mas nao omita informacoes importantes.'
    },
    {
      role: 'user',
      content: userContent
    }
  ],
  temperature: 0.3,
  max_tokens: 1500
};

return [{ json: { requestBody: JSON.stringify(body) } }];
```

---

### Node 8b: "Gerar resumo" (HTTP Request — OpenAI)

- **Tipo:** HTTP Request
- **Method:** POST
- **URL:** `https://api.openai.com/v1/chat/completions`
- **Authentication:** Header Auth com `Authorization: Bearer {OPENAI_API_KEY}`
- **Headers:**
  - `Content-Type` = `application/json`
- **Body Content Type:** Raw
- **Body:** `{{ $json.requestBody }}`

---

### Node 9a: "Preparar body Supabase" (Code)

Mesmo motivo do Node 8a — o resumo gerado contem markdown e caracteres especiais.

- **Tipo:** Code (JavaScript)
- **Code:**
```javascript
const sessionId = $('Recebe mensagem').first().json.body.data.key.remoteJid;
const summary = $('Gerar resumo').first().json.choices[0].message.content;
const totalMessages = $('Formatar mensagens pra resumo').first().json.count;

const body = {
  session_id: sessionId,
  summary: summary,
  total_messages_at_summary: totalMessages,
  updated_at: new Date().toISOString()
};

return [{ json: { requestBody: JSON.stringify(body) } }];
```

---

### Node 9b: "Salvar resumo" (HTTP Request — Supabase UPSERT)

- **Tipo:** HTTP Request
- **Method:** POST
- **URL:** `https://suexauxtxrdjnyoslrzu.supabase.co/rest/v1/conversation_summaries?on_conflict=session_id`
- **Headers:**
  - `apikey` = SUPABASE_SERVICE_ROLE_KEY
  - `Authorization` = `Bearer {SUPABASE_SERVICE_ROLE_KEY}`
  - `Content-Type` = `application/json`
  - `Prefer` = `resolution=merge-duplicates`
- **Body Content Type:** Raw
- **Body:** `{{ $json.requestBody }}`

O `on_conflict=session_id` + `Prefer: resolution=merge-duplicates` faz UPSERT — se ja existe, atualiza. Se nao, insere.

---

## RESUMO VISUAL DO FLUXO COMPLETO

```
=== ANTES DO AI AGENT ===

Concatenar mensagens
       |
Buscar resumo existente (GET Supabase) [Always Output Data = ON]
       |
Preparar contexto (Code) ← injeta resumo se existir, senao passa mensagem normal
       |
AGENTE DE I.A.  ← Prompt referencia {{ $('Preparar contexto').item.json.mensagem }}
       |
SEPARA MENSAGENS2
       |
Loop Over Items1
       |
Enviar presenca → Envia mensagem → DELAY 2s
       |
Limpar buffer


=== DEPOIS DO ENVIO (nao bloqueia) ===

Limpar buffer
       |
Contar mensagens totais (GET Supabase)
       |
Buscar resumo atual (GET Supabase)
       |
Precisa resumir? (Code) ← retorna [] pra parar se total <= 20 ou sem msgs novas
       |
Buscar mensagens pra resumir (GET Supabase)
       |
Formatar mensagens pra resumo (Code)
       |
Preparar body OpenAI (Code)
       |
Gerar resumo (POST OpenAI - gpt-4o-mini) [raw body]
       |
Preparar body Supabase (Code)
       |
Salvar resumo (POST Supabase - UPSERT) [raw body, ?on_conflict=session_id]
       |
     fim
```

---

## LICOES APRENDIDAS (n8n)

1. **Nodes Code nao suportam `fetch`** — precisa separar em Code (prepara dados) + HTTP Request (faz a chamada)
2. **JSON com texto dinamico quebra no HTTP Request** — quando o texto contem `\n`, `"`, `**` (markdown), a interpolacao direta no body JSON do n8n gera JSON invalido. Solucao: usar Code node com `JSON.stringify()` e enviar como raw body.
3. **Expressoes booleanas complexas no IF nao funcionam** — usar Code node que retorna `[]` para parar o fluxo
4. **UPSERT no Supabase REST** — precisa de `Prefer: resolution=merge-duplicates` header + `?on_conflict=session_id` na URL
5. **"Always Output Data"** — ativar em nodes que podem retornar vazio (ex: busca de resumo inexistente) pra nao quebrar o fluxo

---

## CHECKLIST DE IMPLEMENTACAO

- [x] Tabela `conversation_summaries` criada no Supabase
- [x] Node "Buscar resumo existente" (HTTP Request GET, Always Output Data ON)
- [x] Node "Preparar contexto" (Code — substitui o IF "Tem resumo?")
- [x] Alterar Prompt do AGENTE DE I.A. pra referenciar "Preparar contexto"
- [x] Node "Contar mensagens totais" (HTTP Request GET) — apos Limpar buffer
- [x] Node "Buscar resumo atual" (HTTP Request GET)
- [x] Node "Precisa resumir?" (Code — retorna [] pra parar fluxo)
- [x] Node "Buscar mensagens pra resumir" (HTTP Request GET)
- [x] Node "Formatar mensagens pra resumo" (Code)
- [x] Node "Preparar body OpenAI" (Code — JSON.stringify)
- [x] Node "Gerar resumo" (HTTP Request POST OpenAI, raw body)
- [x] Node "Preparar body Supabase" (Code — JSON.stringify)
- [x] Node "Salvar resumo" (HTTP Request POST Supabase UPSERT, raw body, on_conflict)
- [x] Testado com lead 555592262992@s.whatsapp.net (36+ mensagens)
