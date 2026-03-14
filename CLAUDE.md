# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Admin frontend para gerenciamento de leads — painel administrativo que consome dados do Supabase via API Routes do Next.js. O frontend nunca acessa o Supabase diretamente do cliente; tudo passa pelas API Routes do servidor.

## Stack

- **Next.js 16** (App Router) com `--webpack` flag obrigatória no dev
- **React 19** + **TypeScript 5**
- **Tailwind CSS v4** + **shadcn/ui** (via `radix-ui`) + `tw-animate-css`
- **Supabase** (service role key — acesso admin total, sem RLS)
- **@dnd-kit** para drag-and-drop no kanban
- **sonner** para toasts

## Comandos

Todos os comandos executar dentro de `admin-frontend/`:

```bash
# Desenvolvimento
npm run dev       # inicia em http://localhost:3000 (usa --webpack)

# Build / produção
npm run build
npm start

# Lint
npm run lint
```

## Estrutura e Arquitetura

```
admin-frontend/
├── app/
│   ├── api/              # API Routes (acesso ao Supabase via service role)
│   │   ├── boards/       # CRUD de kanban_boards e kanban_columns
│   │   ├── contacts/     # Listagem paginada e detalhes de leads
│   │   ├── custom-fields/# CRUD de campos customizados
│   │   └── tags/         # CRUD de tags
│   ├── boards/           # Páginas: listagem e view de board individual
│   ├── contacts/         # Página de listagem de contatos
│   ├── custom-fields/    # Página de campos customizados
│   ├── tags/             # Página de tags
│   └── page.tsx          # Redireciona para /contacts
├── components/
│   ├── boards/           # BoardList, BoardFormDialog, ColumnManager
│   ├── contacts/         # ContactList, ContactDetailDialog, ContactSearch
│   ├── custom-fields/    # FieldList, FieldFormDialog
│   ├── kanban/           # KanbanBoard (dnd-kit), KanbanCard
│   ├── layout/           # Sidebar com navegação
│   ├── tags/             # TagList, TagFormDialog
│   └── ui/               # Componentes shadcn gerados
└── lib/
    ├── supabase-admin.ts  # Cliente Supabase (service role, só usar em API Routes)
    ├── types.ts           # Interfaces TypeScript centralizadas
    └── utils.ts           # cn() helper
```

## Padrão das API Routes

Todas as rotas usam `supabaseAdmin` do `lib/supabase-admin.ts`. Erros de unicidade retornam 409 com mensagem em PT-BR. Respostas de criação retornam status 201.

## Banco de Dados (Supabase)

Tabelas principais:
- `leads` — contatos/leads com campos UTM
- `lead_tags` — relação N:N entre leads e tags
- `tags` — tags com cor
- `custom_fields` — definição de campos customizados
- `instagram` — dados de perfil IG vinculados a leads
- `kanban_boards` — quadros kanban
- `kanban_columns` — colunas de cada board
- `kanban_lead_positions` — posição dos leads nas colunas

## Variáveis de Ambiente

Arquivo: `admin-frontend/.env.local`

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Essas variáveis **não** têm prefixo `NEXT_PUBLIC_` — ficam apenas no servidor (API Routes). Nunca expor no cliente.

## Convenções

- Páginas são **Server Components** por padrão; componentes interativos usam `"use client"`.
- Tipos centralizados em `lib/types.ts` — não duplicar interfaces.
- `cn()` de `lib/utils.ts` para classes condicionais com Tailwind.
- Diálogos de criação/edição seguem o padrão `*-form-dialog.tsx`; confirmações de exclusão `*-delete-dialog.tsx`.
