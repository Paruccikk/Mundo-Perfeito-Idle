# Publicação no Render

O repositório inclui um Blueprint em `render.yaml` para os serviços:
- `mundo-perfeito-web`: cliente Phaser publicado como site estático.
- `mundo-perfeito-api`: API Fastify com verificação em `/health`.

## Publicar

1. Entre em https://dashboard.render.com/ e conecte sua conta GitHub.
2. Escolha **New > Blueprint**.
3. Selecione o repositório `Paruccikk/Mundo-Perfeito-Idle`.
4. Selecione a branch que o Render deve acompanhar: `main` para produção ou `dev` para testes.
5. Aguarde os deploys e teste:
   - API: `https://mundo-perfeito-api.onrender.com/health`
   - Cliente: https://mundo-perfeito-web.onrender.com

## Branches e promoção

- `main` é a branch de produção; `dev` é a de integração.
- Mantenha as duas sincronizadas por fast-forward antes de publicar. Assim, qualquer branch configurada no Render entrega o mesmo estado e uma promoção de `dev` para `main` não regride funcionalidades.
- Fluxo recomendado: validar em `dev` → sincronizar `main` com `dev` → push das duas branches → confirmar `/health` e o deploy do cliente.

## PostgreSQL de teste

Foi provisionado o banco `mundo-perfeito-db` em Ohio, na mesma região da API:
https://dashboard.render.com/d/dpg-dbl1i6mgekts73fe6btg-a

Para ativar a persistência no serviço da API:

1. Abra o banco no Dashboard do Render e entre em **Connect**.
2. Copie a **Internal Database URL** (não compartilhe essa URL publicamente).
3. Abra o serviço `mundo-perfeito-api` > **Environment**.
4. Crie/atualize a variável `DATABASE_URL` com a Internal Database URL.
5. Salve e aguarde o novo deploy/restart. A API executa `prisma migrate deploy` antes de iniciar e cria o esquema versionado.
6. Crie também `JWT_SECRET` com pelo menos 32 caracteres aleatórios (por exemplo, gere 48 bytes aleatórios em um gerenciador seguro). Não reutilize senhas pessoais nem coloque o valor no Git.
7. Confirme em `/health` que `storage` é `postgres`, `databaseConfigured` é `true` e `authentication` é `true`.

O plano gratuito não tem cobrança mensal, mas o banco expira em 30 dias (03/12/2026). Faça upgrade antes do vencimento se quiser preservar os dados. O plano gratuito não oferece backups.

## Estado e limites do protótipo

- A API persiste personagens, classe, nível, XP, ouro, estágio e estado de combate em PostgreSQL quando `DATABASE_URL` está configurada.
- Se `DATABASE_URL` não estiver configurada, a API inicia em modo de memória para permitir testar o jogo, mas os dados somem quando o processo reinicia.
- O avanço de combate usa atualização condicional pelo último tick persistido para impedir que requisições simultâneas processem o mesmo intervalo e concedam recompensas duplicadas.
- O progresso offline é calculado pela API com base no relógio do servidor, limitado a 8 horas por intervalo.
- As rotas de personagem agora exigem JWT e usam o ID da conta autenticada. O cadastro tenta vincular o antigo identificador de visitante ao novo cadastro quando ele ainda está no navegador e existe no banco sem e-mail associado.
- O token JWT do protótipo fica no `localStorage` e expira em 7 dias. Migração para cookie HttpOnly, verificação de e-mail, recuperação de senha e rate limiting ainda são pendências.
- Não use bens com valor real ou abra RMT nesta fase.
- O serviço gratuito do Render pode entrar em suspensão após períodos sem tráfego; o primeiro acesso depois disso pode demorar.
- Não coloque senhas, tokens ou URLs de banco no Git nem no chat. Segredos devem ser configurados no painel Render.

Antes de produção, implementar autenticação de verdade, autorização por conta, proteção contra abuso, testes automatizados, backups e auditoria econômica.
