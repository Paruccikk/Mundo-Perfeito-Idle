# Mundo Perfeito — Perfect World Idle

Protótipo inicial de um MMORPG Idle 2D isométrico para navegador (PC e celular).

## Decisões aprovadas
- Visual: 2D isométrico.
- Combate: automático, com progressão offline.
- Economia: preparada para possível RMT oficial no futuro; sem saque ou conversão em dinheiro nesta primeira versão.
- Plataforma: navegador (desktop e mobile).

## Stack inicial
- Cliente: Phaser 3 + TypeScript + Vite.
- Backend: Node.js + TypeScript + Fastify.
- Banco planejado: PostgreSQL + Prisma (a integrar quando houver persistência).
- Redis: reservado para cache, filas e sessões quando necessário.

O servidor será a autoridade sobre XP, ouro, drops, inventário, mercado e transações. O navegador nunca decide nem envia a recompensa final.

## Requisitos
- Node.js 20+ (recomendado LTS atual)
- npm 10+
- Docker Desktop (opcional, para banco local quando integrado)

## Desenvolvimento local
```bash
npm install
npm run dev
```

Cliente: http://localhost:5173  
API: http://localhost:3000/health

## Publicação de teste no Render
O arquivo `render.yaml` prepara o cliente estático e a API. Consulte [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md) para publicar pela branch `dev`.

## Estrutura
- `apps/web`: cliente Phaser.
- `apps/api`: API e regras de jogo.
- `packages/shared`: tipos compartilhados e constantes.
- `database`: infraestrutura local planejada.
- `docs`: documentação de design e implantação.

## Estado atual
A cena isométrica é um protótipo visual. A API possui endpoints de saúde e configuração; combate autoritativo, autenticação, persistência e cálculo offline ainda serão implementados.

## Próximos marcos
1. Cena isométrica com personagem e monstros de teste.
2. Combate automático calculado pelo servidor.
3. Persistência de personagem, inventário e progresso.
4. Cálculo offline com limite e auditoria.
5. Mercado interno; RMT somente após análise jurídica, financeira e antifraude.
