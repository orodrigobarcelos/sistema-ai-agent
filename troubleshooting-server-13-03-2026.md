# Troubleshooting: Servidor Next.js travando silenciosamente

## Data do incidente
13 de marco de 2026

## Sintoma

O comando `npm run dev` (que executa `next dev --webpack`) travava **completamente sem gerar nenhum output**. Nenhuma mensagem de erro, nenhum log, nada. O processo Node.js ficava vivo mas:

- Nao exibia o banner do Next.js
- Nao bindava a porta 3000
- Nao respondia a `curl`
- Nao crashava — ficava pendurado infinitamente

Ate comandos simples como `next info` e `next build` travavam da mesma forma. Apenas `next --help` funcionava (porque nao precisa scanear o diretorio do projeto).

---

## Investigacao

### O que foi testado e NAO funcionou

1. Deletar `node_modules` e reinstalar com `npm install` — nao resolveu
2. Deletar `.next` (cache) — nao resolveu
3. Desabilitar telemetria (`NEXT_TELEMETRY_DISABLED=1`) — nao resolveu
4. Rodar sem `--webpack` (usando turbopack padrao) — nao resolveu
5. Capturar output com `spawn`, `execSync`, `stdio: 'inherit'` — zero output
6. Rodar com `NODE_DEBUG=*` — mostrou modulos carregando mas travava depois

### O que revelou a causa

1. **Profiling com `sample`**: mostrou o processo Node.js idle no event loop (`kevent`), esperando o child process `next-server` que morria silenciosamente
2. **Teste em diretorio limpo**: copiei todos os arquivos do projeto (app, components, lib, configs) para `/tmp/test-real/` **sem a pasta `_old_nm`** — o servidor **iniciou em 3 segundos**
3. **Conclusao**: o Next.js ficava travado tentando scanear a pasta `_old_nm`

---

## Causa raiz

### Pasta `_old_nm` dentro do diretorio do projeto

Uma pasta chamada `_old_nm` (backup antigo de `node_modules`) com **~91MB e milhares de arquivos/pastas duplicadas** estava dentro de `admin-frontend/`. Exemplos do conteudo:

```
_old_nm/@dnd-kit/
_old_nm/@dnd-kit 2/
_old_nm/@dnd-kit 3/
_old_nm/next/
_old_nm/next 2/
_old_nm/next 3/
_old_nm/eslint/
_old_nm/eslint 2/
... (centenas de pastas com duplicatas numeradas)
```

O Next.js, ao iniciar (`dev`, `build`, `info`), scanneia **todos os diretorios** do projeto para resolver modulos, watchers, e file tracing. Com essa pasta enorme cheia de milhares de subpastas e arquivos, o processo:

1. Travava no scan recursivo
2. Nao gerava nenhum output (o banner so aparece APOS o scan inicial)
3. O child process `next-server` morria silenciosamente
4. O processo pai ficava pendurado no event loop

### Problema secundario: Node.js v25.8.0

A maquina tem Node v25.8.0 (Homebrew) como padrao. O `nvm use 22.19.0` nao funciona corretamente em shells nao-interativos (como os do Claude Code). Era necessario setar o PATH diretamente:

```bash
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"
```

### Dependencia faltando: `sonner`

O pacote `sonner` (toast notifications) era importado em 7 arquivos do projeto mas **nao estava no `package.json`**. Foi instalado durante a correcao.

---

## Solucao aplicada

### 1. Remover a pasta `_old_nm` do projeto

```bash
# Mover para fora do projeto (mv e instantaneo, rm -rf demora muito)
mv admin-frontend/_old_nm ~/Documents/_old_nm_to_delete

# Depois deletar em background
rm -rf ~/Documents/_old_nm_to_delete &
```

### 2. Usar Node.js v22.19.0 (nao v25)

```bash
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"
```

### 3. Reinstalar dependencias limpas

```bash
cd admin-frontend
rm -rf node_modules .next package-lock.json
npm install
```

### 4. Instalar dependencia faltando

```bash
npm install sonner
```

### 5. Iniciar o servidor

```bash
npm run dev
```

**Resultado: servidor iniciou em ~1.2 segundos.**

---

## Licoes aprendidas / Regras para nunca mais repetir

### NUNCA faca isso:

| Regra | Por que |
|-------|---------|
| NUNCA deixe pastas de backup (como `_old_nm`, `node_modules_bkp`, etc) dentro do diretorio do projeto | O Next.js scanneia todos os diretorios recursivamente e trava |
| NUNCA use Node v25 com Next.js 16 | Incompatibilidade silenciosa — o servidor nao sobe e nao mostra erro |
| NUNCA renomeie `node_modules` para outra pasta dentro do mesmo diretorio | Faz o mesmo efeito — o Next.js vai scanear |
| NUNCA confie que `nvm use` funciona em scripts nao-interativos | Use `export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"` |

### SEMPRE faca isso:

| Regra | Como |
|-------|------|
| Para fazer backup de `node_modules`, mova para FORA do projeto | `mv node_modules /tmp/node_modules_bkp` |
| Verifique a versao do Node antes de rodar | `node -v` (deve ser v22.x) |
| Ao trocar de Node, delete `node_modules` e reinstale | `rm -rf node_modules .next && npm install` |
| Se o servidor travar sem output, verifique se ha pastas estranhas no diretorio | `ls -la` e procure por pastas que nao deviam estar la |

---

## Linha do tempo da investigacao

| Hora (aprox) | Acao | Resultado |
|--------------|------|-----------|
| Inicio | `npm run dev` com Node v25.8.0 | Travou sem output |
| +5min | Trocar para Node v22.19.0 via nvm | nvm nao funcionava em shell nao-interativo |
| +10min | Setar PATH direto para Node v22 | Node correto confirmado |
| +15min | Reinstalar `node_modules` limpo | Instalou OK mas servidor continuou travando |
| +20min | Instalar `sonner` faltando | OK |
| +25min | Tentar capturar output de varias formas | Zero output em todas |
| +30min | Tentar `next build`, `next info` | Todos travavam |
| +35min | Criar projeto Next.js minimo em `/tmp` | Funcionou perfeitamente |
| +40min | Copiar projeto real para `/tmp/test-real` (sem `_old_nm`) | **FUNCIONOU!** |
| +42min | Mover `_old_nm` para fora do projeto | `mv` instantaneo |
| +43min | `npm run dev` no diretorio original | **Servidor OK em 1.2s** |

---

## Versoes do ambiente

| Item | Versao | Status |
|------|--------|--------|
| Node.js (Homebrew) | v25.8.0 | NAO USAR |
| Node.js (nvm) | v22.19.0 | USAR ESTE |
| Node.js (nvm, fallback) | v18.20.8 | Disponivel |
| Next.js | 16.1.6 | OK |
| React | 19.2.3 | OK |
| macOS | Darwin 25.3.0 (ARM64) | OK |

---

## Referencia

- Incidente anterior (10/03/2026): `troubleshooting-server.md`
- Projeto Diandra Santos: `/Users/rodrigobarcelos/Documents/Projeto Diandra Santos/troubleshooting-server.md`
