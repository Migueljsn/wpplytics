# Evolution API no EasyPanel

Guia para subir a Evolution API do zero no EasyPanel com Postgres e Redis, evitando os erros mais comuns vistos na comunidade.

Base usada:

- imagem `evoapicloud/evolution-api:v2.3.7`
- documentacao oficial de EasyPanel da Evolution
- recomendacao recorrente da comunidade para nao usar `atendai/...` nem `latest`

## Decisoes desta configuracao

- Usa `evoapicloud/evolution-api:v2.3.7`
- Nao usa `latest`
- Usa Postgres e Redis separados dentro do mesmo projeto EasyPanel
- Usa volume persistente em `/evolution/instances`
- Usa hostnames internos do EasyPanel no padrao `PROJETO_SERVICO`

## Servicos que vamos criar

1. `evolution-postgres`
2. `evolution-redis`
3. `evolution-api`

## Ordem correta no EasyPanel

1. Crie um projeto. Exemplo: `wpplytics`
2. Dentro do projeto, crie um servico `Postgres`
3. Dentro do projeto, crie um servico `Redis`
4. Dentro do projeto, crie um servico `App`
5. No servico `App`, escolha `Docker Image`
6. Use a imagem `evoapicloud/evolution-api:v2.3.7`

## Configuracao do Postgres

Use um banco dedicado para a Evolution API.

- Nome do servico: `evolution-postgres`
- Database name: `evolution`
- Username: `postgres`
- Password: gere uma senha forte

Guarde a senha. Ela entra em `DATABASE_CONNECTION_URI`.

## Configuracao do Redis

- Nome do servico: `evolution-redis`
- Password: gere uma senha forte

Guarde a senha. Ela entra em `CACHE_REDIS_URI`.

## Configuracao do App

- Nome do servico: `evolution-api`
- Source: `Docker Image`
- Image: `evoapicloud/evolution-api:v2.3.7`
- Internal port: `8080`

### Domain

Na aba `Domains`:

- adicione seu dominio
- marque como primario
- informe a porta `8080`

Sem a porta `8080`, o roteamento do EasyPanel falha.

### Storage

Na aba `Storage`, crie um volume persistente em:

`/evolution/instances`

Sem esse volume, toda sessao conectada sera perdida em restart ou redeploy.

### Environment

Use o arquivo [.env.example](/Users/macbook/Desenvolvedor/wpplytics/evolution-easypanel/.env.example) como base.

Substitua:

- `wpplytics` pelo nome real do projeto
- `CHANGE_ME_POSTGRES_PASSWORD` pela senha real do Postgres
- `CHANGE_ME_REDIS_PASSWORD` pela senha real do Redis
- `CHANGE_ME_WITH_A_LONG_RANDOM_KEY` por uma chave longa e aleatoria

## Exemplo pronto para projeto `wpplytics`

Se o projeto no EasyPanel for `wpplytics`, os hosts internos ficam:

- Postgres: `wpplytics_evolution-postgres`
- Redis: `wpplytics_evolution-redis`

As duas strings principais ficam assim:

```env
DATABASE_CONNECTION_URI=postgres://postgres:SENHA_POSTGRES@wpplytics_evolution-postgres:5432/evolution
CACHE_REDIS_URI=redis://default:SENHA_REDIS@wpplytics_evolution-redis:6379
```

## Checklist antes do deploy

- O dominio ja aponta via registro A para o IP do servidor
- O servico `evolution-api` esta usando `evoapicloud/evolution-api:v2.3.7`
- O dominio do app usa a porta `8080`
- O volume `/evolution/instances` foi criado
- As senhas de Postgres e Redis foram trocadas
- A API key foi trocada por uma chave forte
- O hostname interno usa `PROJETO_SERVICO`, nao `localhost`

## Primeiro acesso

Depois do deploy:

1. acesse `https://seu-dominio/manager`
2. informe o valor de `AUTHENTICATION_API_KEY`
3. crie uma instancia nova
4. teste o QR Code

## Pontos que ainda podem falhar

Mesmo com a imagem correta, as instancias `WHATSAPP-BAILEYS` continuam sujeitas a instabilidade do WhatsApp Web. Esta configuracao reduz erro de deploy e erro de imagem, mas nao elimina o risco estrutural das conexoes nao oficiais.

## Fontes

- Documentacao EasyPanel da Evolution: https://docs.evolutionfoundation.com.br/evolution-api/install/easypanel
- Variaveis de ambiente: https://docs.evolutionfoundation.com.br/evolution-api/configuration/env
- Compose oficial do repositorio: https://github.com/EvolutionAPI/evolution-api/blob/main/docker-compose.yaml
