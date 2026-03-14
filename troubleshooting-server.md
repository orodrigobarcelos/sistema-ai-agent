# Troubleshooting: Erro ao iniciar o servidor Next.js

## Data do incidente
10 de marco de 2026

## Sintoma
O comando `next dev` iniciava, exibia `> next dev --webpack` mas **nunca abria a porta** e o servidor ficava inacessivel (`HTTP 000` / `ERR_CONNECTION_REFUSED`).

Nenhum erro aparecia no terminal — o processo ficava vivo mas silencioso. Multiplas tentativas (com `npx`, com `node_modules/.bin/next`, com background, com foreground) todas falharam da mesma forma.

---

## Causa raiz

**Dois problemas combinados:**

### 1. Node 25 incompativel com Next.js 16

A maquina tem Node 25.8.0 instalado via Homebrew como versao padrao. Next.js 16.1.6 tem pacotes compilados internos (`dist/compiled/`) cujos `package.json` simplificados sao incompativeis com mudancas no parser de `package.json` do Node 25.

O erro real (`ERR_INVALID_PACKAGE_CONFIG`) era **silencioso** — o Next.js captura erros internos e em cenarios de crash no Turbopack, o processo continua vivo mas sem bindar a porta.

### 2. `node_modules` corrompido com pastas duplicadas

O `node_modules` continha pastas duplicadas com espaco no nome:
```
node_modules/@dnd-kit 2/
node_modules/next 2/
node_modules/eslint-plugin-react 2/
node_modules/shadcn 2/
node_modules/@supabase 2/
... (10 pastas duplicadas)
```

Essas pastas fantasma causam conflitos de resolucao de modulos e contribuem para o crash silencioso.

---

## Solucao

```bash
# 1. Matar todos os processos Next.js pendentes
pkill -9 -f "next dev"

# 2. Deletar cache e node_modules corrompido
cd "/Users/rodrigobarcelos/Documents/Sistema AI Agent - Rodrigo Barcelos/admin-frontend"
rm -rf .next node_modules

# 3. Reinstalar dependencias com Node 22 LTS (CRITICO: usar npm ci, NAO npm install)
PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH" npm ci

# 4. Iniciar o servidor com Node 22 LTS
PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH" nohup node_modules/.bin/next dev -p 3000 > /tmp/next-admin.log 2>&1 &
disown
```

Apos a reinstalacao, o servidor iniciou em ~94 segundos (primeira compilacao com `.next` limpo). Paginas subsequentes carregam rapido.

---

## INSTRUCOES PARA A CLAUDE (ler antes de iniciar o server)

### NUNCA faca isso:
- **NUNCA** use `node` ou `npx` diretamente para iniciar o Next.js — isso usa o Node 25 do Homebrew que e incompativel
- **NUNCA** use `npm install` para reinstalar — use `npm ci` para respeitar o lockfile
- **NUNCA** tente iniciar o server multiplas vezes sem verificar se a porta ja esta ocupada
- **NUNCA** fique esperando o server subir com Node 25 — ele nunca vai subir

### SEMPRE faca isso:
1. **Verificar se ja tem processo na porta:**
   ```bash
   lsof -i :3000 -P -n
   ```

2. **Se tiver, matar:**
   ```bash
   pkill -9 -f "next dev"
   ```

3. **Iniciar com Node 22 LTS via nvm:**
   ```bash
   cd "/Users/rodrigobarcelos/Documents/Sistema AI Agent - Rodrigo Barcelos/admin-frontend"
   PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH" nohup node_modules/.bin/next dev -p 3000 > /tmp/next-admin.log 2>&1 &
   disown
   ```

4. **Esperar ~30s e verificar:**
   ```bash
   curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3000
   ```

5. **Se retornar `000` apos 2 minutos, verificar o log:**
   ```bash
   cat /tmp/next-admin.log
   ```

6. **Se aparecer `ERR_INVALID_PACKAGE_CONFIG` ou log vazio, reinstalar:**
   ```bash
   pkill -9 -f "next dev"
   rm -rf .next node_modules
   PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH" npm ci
   ```
   Depois repetir o passo 3.

---

## Versoes do ambiente

| Item | Versao | Observacao |
|------|--------|------------|
| Node.js (Homebrew) | v25.8.0 | NAO USAR — incompativel |
| Node.js (nvm, LTS) | v22.19.0 | USAR ESTE |
| Node.js (nvm, old LTS) | v18.20.8 | Disponivel como fallback |
| Next.js | 16.1.6 | |
| OS | macOS Darwin 25.3.0 (ARM64) | |
| Porta padrao | 3000 | |

---

## Referencia

Mesmo problema documentado no projeto "Diandra Santos":
- `/Users/rodrigobarcelos/Documents/Projeto Diandra Santos/troubleshooting-server.md`
- `/Users/rodrigobarcelos/Documents/Projeto Diandra Santos/pos-mortem-05-03-2026.md`
