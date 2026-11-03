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
- Banco: PostgreSQL.
- ORM/migrations: Prisma.
- Redis: reservado para cache, filas e sessões quando necessário.

O servidor é a autoridade sobre XP, ouro, drops, inventário, mercado e transações. O navegador nunca decide nem envia a recompensa final.

## Requisitos
- Node.js 20+ (recomendado LTS atual)
- npm 10+
- Docker Desktop (opcional, para banco local)

## Começar
```bash
npm install
docker compose up -d
npm run dev
```

Cliente: http://localhost:5173  
API: http://localhost:3000/health

## Estrutura
- `apps/web`: cliente Phaser.
- `apps/api`: API e regras de jogo.
- `packages/shared`: tipos compartilhados e constantes.
- `database`: schema e infraestrutura local.
- `docs`: documento de design e decisões técnicas.

## Estado do protótipo
Esta é a fundação do projeto, não um jogo completo. O combate e a progressão ainda serão implementados em etapas. A API inclui apenas um endpoint de saúde e um esqueleto seguro para a futura simulação.

## Próximos marcos
1. Cena isométrica com personagem e monstros de teste.
2. Combate automático calculado pelo servidor.
3. Persistência de personagem, inventário e progresso.
4. Cálculo offline com limite e auditoria.
5. Mercado interno; RMT somente após análise jurídica, financeira e antifraude.
