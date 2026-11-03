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

## Criação de personagem (Etapa 1)

O cliente abre na tela de criação de personagem, busca as classes na API e envia o
personagem para o servidor. A API é a autoridade sobre nome, classe, atributos e
ouro inicial.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/v1/game/classes` | Classes disponíveis, atributos base e progressão |
| `POST` | `/api/v1/characters` | Cria um personagem (`playerId`, `name`, `classId`) |
| `GET` | `/api/v1/characters?playerId=...` | Lista os personagens do jogador |
| `GET` | `/api/v1/characters/:id?playerId=...` | Busca um personagem do jogador |

Exemplo:

```bash
curl -X POST http://localhost:3000/api/v1/characters \
  -H "Content-Type: application/json" \
  -d '{"playerId":"ply_exemplo-123","name":"Kael","classId":"warrior"}'
```

Regras do protótipo:

- Nome de 3 a 16 caracteres, único por jogador.
- Até 3 personagens por jogador.
- `playerId` é um identificador anônimo gerado no navegador e salvo no
  `localStorage`; ele será substituído por autenticação real na Etapa 3.

> **Persistência:** os personagens ficam em memória no processo da API. Um restart
> ou deploy limpa os dados. A troca para PostgreSQL/Prisma está isolada em
> `apps/api/src/game/characterRepository.ts`.

## Publicação de teste no Render
O arquivo `render.yaml` prepara o cliente estático e a API. Consulte [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md) para publicar pela branch `dev`.

## Estrutura
- `apps/web`: cliente Phaser.
- `apps/api`: API e regras de jogo.
- `packages/shared`: tipos compartilhados e constantes.
- `database`: infraestrutura local planejada.
- `docs`: documentação de design e implantação.

## Estado atual
A Etapa 1 está em andamento: já existe criação de personagem validada pelo
servidor, escolha entre Guerreiro, Mago e Patrulheiro, atributos iniciais, HUD com
nome/classe/nível/XP/ouro e recuperação do personagem ao reabrir o navegador.
A cena isométrica continua sendo um protótipo visual. Combate autoritativo,
persistência em banco, autenticação e cálculo offline ainda serão implementados.

## Próximos marcos
1. ~~Cena isométrica com personagem e monstros de teste.~~ ✅
2. ~~Criação de personagem com classes e atributos validados pela API.~~ ✅
3. Combate automático calculado pelo servidor (próximo).
4. Persistência de personagem, inventário e progresso em PostgreSQL.
5. Cálculo offline com limite e auditoria.
6. Mercado interno; RMT somente após análise jurídica, financeira e antifraude.
