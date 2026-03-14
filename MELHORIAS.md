# Melhorias Planejadas — Sistema AI Agent RBX Digital

Documento com sugestoes de melhorias para maximizar a conversao do AI Agent de vendas via WhatsApp.

---

## 1. Prompt Auto-Evolutivo

**Status:** Planejado
**Impacto:** Alto | **Esforco:** Medio

### O que e
Mover o system prompt do node do n8n para uma tabela no Supabase. Um cron job periodico (semanal) analisa o historico de conversas e gera uma versao otimizada do prompt automaticamente.

### Como implementar
- Criar tabela `ai_prompts` no Supabase com versionamento (id, version, content, is_active, created_at, metrics)
- n8n passa a ler o prompt ativo da tabela via GET antes de chamar o agente
- Edge Function com schedule (ou workflow n8n separado) roda semanalmente:
  1. Busca conversas dos ultimos 7 dias
  2. Identifica pontos de falha (lead parou de responder, objecoes nao quebradas, handoff pra humano)
  3. Envia pra LLM com meta-prompt: "analise estas conversas e gere uma versao melhorada do prompt"
  4. Salva nova versao como rascunho na tabela
- Admin aprova/ativa a nova versao pelo painel (ou ativa automaticamente apos confianca no processo)

### Guardrails necessarios
- Meta-prompt deve definir o que NAO pode mudar (tom de voz, regras de negocio, limites de atuacao)
- Manter historico completo de versoes para rollback
- Metricas de conversao por versao pra comparar eficacia

---

## 2. Follow-up 5 — Personalizado por IA

**Status:** Planejado
**Impacto:** Altissimo | **Esforco:** Baixo

### O que e
Adicionar um FUP 5 ao fluxo existente de follow-up (que hoje vai ate o FUP 4). Este follow-up seria a "ultima cartada" — uma mensagem totalmente personalizada gerada por IA com base no historico completo da conversa.

### Como implementar
- No fluxo de follow-up do n8n, apos o FUP 4, adicionar um novo branch
- Buscar o historico completo da conversa do lead no Supabase
- Enviar pra OpenAI com um prompt especifico: "Baseado neste historico, gere uma mensagem de follow-up final e personalizada. Considere a ultima mensagem do lead, o ponto onde a conversa parou, e use o gatilho mental mais adequado ao contexto."
- Enviar a mensagem gerada via WhatsApp
- Marcar o lead com tag de "fup_5_enviado"

### Criterios para o prompt de geracao
- Se parou apos ver preco -> foco em garantia, risco zero, ROI
- Se parou no meio da conversa -> retomar com curiosidade/novidade
- Se demonstrou interesse mas sumiu -> escassez/urgencia
- Se teve objecao nao resolvida -> abordar a objecao diretamente com prova social

---

## 3. Lead Scoring Automatico

**Status:** Planejado
**Impacto:** Alto | **Esforco:** Medio

### O que e
Sistema de pontuacao automatica (0-100) que classifica a temperatura do lead com base nos sinais da conversa e comportamento.

### Sinais que aumentam o score
| Sinal | Pontos |
|---|---|
| Perguntou sobre preco | +20 |
| Pediu link de pagamento / pix | +30 |
| Mencionou urgencia | +15 |
| Fez pergunta tecnica detalhada | +10 |
| Respondeu rapido (< 5min) | +5 |
| Engajou com stories/conteudo | +5 |

### Sinais que diminuem o score
| Sinal | Pontos |
|---|---|
| "Vou pensar" / "Depois vejo" | -10 |
| Parou de responder (por dia) | -5 |
| "Ta caro" sem engajar depois | -10 |
| Visualizou e nao respondeu | -5 |

### O que fazer com o score
- **Score 80+** -> Alerta em tempo real pro closer humano entrar. AI acelera pra fechamento.
- **Score 50-79** -> Follow-up mais agressivo, gatilhos de urgencia/escassez
- **Score 30-49** -> Follow-up leve, nutrição com conteudo/prova social
- **Score < 30** -> Remarketing a longo prazo ou descartar
- **Automacao Kanban** -> Lead se move automaticamente entre colunas baseado no score

### Como implementar
- Usar campo personalizado `lead_score` (ja suportado pela tabela custom_fields)
- Cron job ou trigger no n8n apos cada mensagem: analisa a conversa e recalcula o score
- Regras podem ser baseadas em keywords simples (rapido/barato) ou via LLM pra analise mais sofisticada

---

## 4. Catalogo de Objecoes + Respostas Vencedoras

**Status:** Planejado
**Impacto:** Alto | **Esforco:** Medio

### O que e
Sistema que varre automaticamente o historico de conversas, identifica as objecoes mais frequentes, e cruza com as conversas que converteram MESMO tendo aquela objecao. A resposta que converteu vira a resposta padrao no prompt do agente.

### Como implementar
- Criar tabela `objections` no Supabase (id, objection_text, category, frequency, best_response, conversion_rate, updated_at)
- Edge Function ou cron semanal:
  1. Busca todas as conversas recentes
  2. Usa LLM pra extrair objecoes de cada conversa e classificar (preco, confianca, timing, autoridade, etc.)
  3. Conta frequencia de cada objecao
  4. Filtra conversas que tiveram a mesma objecao MAS converteram
  5. Extrai a resposta que quebrou a objecao nessas conversas
  6. Salva/atualiza na tabela
- O prompt do agente e alimentado com as top objecoes e suas melhores respostas

### Categorias de objecao comuns
- **Preco** — "ta caro", "nao tenho dinheiro agora"
- **Confianca** — "sera que funciona?", "ja vi coisa parecida"
- **Timing** — "agora nao e o momento", "mes que vem"
- **Autoridade** — "preciso falar com meu socio/esposa"
- **Necessidade** — "nao sei se preciso disso"

---

## 5. Teste A/B de Prompts

**Status:** Planejado
**Impacto:** Medio-Alto | **Esforco:** Medio

### O que e
Manter 2 ou mais versoes do prompt ativas simultaneamente. Cada lead novo e atribuido aleatoriamente a uma variante. Apos um volume estatisticamente relevante, comparar taxas de conversao e promover a versao vencedora.

### Como implementar
- Na tabela `ai_prompts`, adicionar campos: `variant` (A, B, C...), `is_active`, `assigned_leads`, `conversions`, `conversion_rate`
- No fluxo do n8n, ao iniciar conversa com lead novo:
  1. Sortear uma variante ativa
  2. Registrar qual variante o lead recebeu (tag ou campo personalizado)
  3. Usar o prompt correspondente
- Dashboard no admin mostrando metricas por variante
- Apos X leads por variante (minimo ~100 pra significancia), comparar e promover vencedora

### Boas praticas
- Testar UMA variavel por vez (ex: tom mais formal vs informal, ou abordagem direta vs consultiva)
- Manter volume equilibrado entre variantes
- Nao mudar variantes no meio de uma conversa em andamento

---

## 6. Alerta de Momento Quente (Hot Lead Alert)

**Status:** Planejado
**Impacto:** Altissimo | **Esforco:** Baixo

### O que e
Detectar em tempo real quando o lead demonstra forte intencao de compra e enviar alerta imediato para o closer humano entrar na conversa. Um humano entrando no momento certo converte MUITO mais que o AI sozinho.

### Gatilhos de alerta
- Lead perguntou preco / forma de pagamento
- Lead disse "quero", "como faco pra comprar", "aceita pix"
- Lead pediu link de pagamento
- Score ultrapassou 80

### Como implementar
- No fluxo principal do n8n, apos cada mensagem do lead:
  1. Checar se a mensagem contem gatilhos de intencao de compra (keywords ou analise via LLM)
  2. Se sim, disparar notificacao via Telegram/WhatsApp/Slack pro closer
  3. Notificacao inclui: nome do lead, telefone, resumo da conversa, score atual
- Opcao: pausar o AI temporariamente pra dar tempo do humano entrar

---

## 7. Analise de Sentimento em Tempo Real

**Status:** Planejado
**Impacto:** Medio | **Esforco:** Baixo

### O que e
Adicionar uma camada de analise de sentimento em cada mensagem do lead para adaptar a abordagem do agente em tempo real.

### Como implementar
- No fluxo do n8n, antes de enviar a mensagem pro agente, rodar uma analise rapida de sentimento
- Pode ser uma chamada leve de LLM ou ate regex/keywords simples
- Injetar o sentimento detectado como contexto pro agente: "O lead parece [frustrado/empolgado/confuso/resistente]. Adapte sua resposta."

### Acoes por sentimento
- **Frustrado** -> Tom mais empatico, oferecer ajuda direta, simplificar
- **Empolgado** -> Acelerar pro fechamento, nao perder momentum
- **Confuso** -> Explicar de forma mais simples, usar analogias
- **Resistente** -> Prova social, garantia, remover risco

---

## 8. Remarketing Contextualizado

**Status:** Planejado
**Impacto:** Alto | **Esforco:** Medio

### O que e
Leads que nao converteram entram num fluxo de remarketing com mensagens personalizadas baseadas no ponto exato onde a conversa parou.

### Timing
- 7 dias apos ultima interacao -> Mensagem 1
- 15 dias -> Mensagem 2
- 30 dias -> Mensagem 3 (ultima tentativa)

### Personalizacao por contexto
- Parou apos ver preco -> "Desde que conversamos, tivemos [X] novos alunos com resultados incriveis. E estamos com uma condicao especial essa semana..."
- Parou por objecao de confianca -> Enviar depoimento/resultado de cliente similar
- Parou por timing -> "Sei que o momento nao era ideal. Queria so te avisar que [novidade/oferta]..."
- Nunca respondeu -> Abordagem completamente diferente da original

### Como implementar
- Cron job diario verifica leads inativos com base no ultimo `moved_at` ou ultima mensagem
- Busca historico da conversa e identifica o motivo de parada via LLM
- Gera mensagem personalizada e envia via n8n/WhatsApp
- Tags de controle: `remarketing_1_enviado`, `remarketing_2_enviado`, etc.

---

## Ordem de Prioridade Sugerida

| # | Melhoria | Impacto | Esforco | Prioridade |
|---|---|---|---|---|
| 1 | Follow-up 5 personalizado | Altissimo | Baixo | Implementar primeiro |
| 2 | Alerta momento quente | Altissimo | Baixo | Implementar primeiro |
| 3 | Catalogo de objecoes | Alto | Medio | Segundo ciclo |
| 4 | Lead scoring | Alto | Medio | Segundo ciclo |
| 5 | Prompt auto-evolutivo | Alto | Medio | Segundo ciclo |
| 6 | Remarketing contextualizado | Alto | Medio | Terceiro ciclo |
| 7 | Teste A/B de prompts | Medio-Alto | Medio | Terceiro ciclo |
| 8 | Analise de sentimento | Medio | Baixo | Pode entrar a qualquer momento |
