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

- Esta primeira publicação é um ambiente de protótipo. Ainda não há login, salvamento de personagem ou banco de dados conectado.
- O serviço gratuito do Render pode entrar em suspensão após períodos sem tráfego; o primeiro acesso depois disso pode demorar.
- Não coloque senhas, tokens ou chaves privadas no Git. Segredos devem ser configurados nas variáveis do painel Render.
- PostgreSQL será adicionado quando a API implementar persistência real e migrações.
- A URL da API ainda não é consumida pelo cliente. A integração cliente/API será feita na próxima etapa de desenvolvimento.
