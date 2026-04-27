# WPPlytics

Produto interno para conectar instancias via Evolution API, capturar historico de conversas do WhatsApp a partir da data de conexao e disponibilizar:

- lista de conversas com UI de chat em modo leitura
- historico interno para inspecao manual
- botao para gerar relatorio quantitativo
- botao para gerar relatorio qualitativo

A regra central do produto e:

- os relatorios so podem ser acionados quando existir no minimo `5 dias` de historico coletado para a instancia

## Stack adotada

- `Next.js` com `App Router`
- `TypeScript`
- `Supabase` como base de dados/autenticacao/infra existente
- `Prisma` para schema e acesso transacional ao Postgres
- `Route Handlers` para webhook da Evolution e disparo de analises

Observacao:

- nesta etapa, a base foi estruturada
- ingestao real de webhook, consolidacao de conversas e geracao real dos relatorios ainda estao marcadas como proximas implementacoes
- o dashboard esta com dados mockados para permitir desenvolvimento da UI e do fluxo

## O que ja foi codado

- dashboard principal de cliente/instancia
- UI de lista de conversas e painel de chat somente leitura
- regra de bloqueio/liberacao da analise por minimo de 5 dias
- endpoint de webhook da Evolution API:
  - `POST /api/evolution/webhook`
- endpoint para acionar fila/execucao de relatorio:
  - `POST /api/clients/:clientId/instances/:instanceId/reports/:reportType`
- schema Prisma com tabelas principais:
  - `Client`
  - `WaInstance`
  - `Contact`
  - `Message`
  - `Conversation`
  - `WebhookEvent`
  - `AnalysisRun`

## Setup

1. Copie `.env.example` para `.env.local`
2. Preencha as chaves do Supabase e da Evolution API
3. Instale dependencias
4. Gere o client Prisma
5. Rode as migrations
6. Suba o projeto

Comandos:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Variaveis esperadas

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EVOLUTION_WEBHOOK_SECRET`
- `EVOLUTION_API_BASE_URL`
- `EVOLUTION_API_KEY`
- `OPENAI_API_KEY` opcional para etapa qualitativa futura
- `REDIS_URL` opcional para fila futura

## Proximos passos imediatos

1. ligar `WaInstance`, `WebhookEvent` e `Message` ao webhook real da Evolution
2. consolidar mensagens em `Conversation`
3. habilitar dashboard por dados reais no Supabase
4. implementar analise quantitativa real por janela de datas
5. implementar analise qualitativa real e persistencia de `AnalysisRun`
6. gerar PDFs dos dois relatorios
