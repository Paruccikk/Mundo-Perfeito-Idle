# Publicação no Render

O repositório inclui um Blueprint em `render.yaml` para criar dois serviços:
- `mundo-perfeito-web`: cliente Phaser publicado como site estático.
- `mundo-perfeito-api`: API Fastify com verificação em `/health`.

## Publicar

1. Entre em https://dashboard.render.com/ e conecte sua conta GitHub.
2. Escolha **New > Blueprint**.
3. Selecione o repositório `Paruccikk/Mundo-Perfeito-Idle`.
4. Selecione a branch `dev` para testar as mudanças antes de integrá-las à `main`.
5. O Render vai ler o `render.yaml` e mostrar os serviços que serão criados.
6. Na variável `WEB_ORIGIN` da API, informe a URL pública do serviço web depois que o site for criado (ex.: `https://mundo-perfeito-web.onrender.com`).
7. Aguarde os deploys e teste:
   - API: `https://SUA-API.onrender.com/health`
   - Cliente: URL pública do serviço estático.

## Observações

- Esta publicação é um ambiente de protótipo. A API já é consumida pelo cliente por meio de `VITE_API_URL`; criação de personagem e combate automático funcionam no servidor.
- O progresso offline é calculado pela API com base no relógio do servidor, limitado a 8 horas por intervalo. Os cooldowns de ataque são preservados entre ticks para evitar que cada consulta reinicie a cadência de combate.
- Os dados ainda ficam em memória na API: reiniciar ou fazer deploy apaga personagens e progresso. O `playerId` atual é anônimo e fica no `localStorage`; não é autenticação segura e não deve ser tratado como identidade de produção.
- O serviço gratuito do Render pode entrar em suspensão após períodos sem tráfego; o primeiro acesso depois disso pode demorar.
- Não coloque senhas, tokens ou chaves privadas no Git. Segredos devem ser configurados nas variáveis do painel Render.
- PostgreSQL será adicionado quando a API implementar persistência real e migrações.
- Antes de abrir o jogo ao público, integrar autenticação real e PostgreSQL com transações, índices únicos e registro de operações econômicas.
