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

O cliente abre na tela de seleção de personagem (ou na criação, quando ainda não
há nenhum). A API é a autoridade sobre nome, classe, atributos, XP, ouro e
combate.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/v1/game/classes` | Classes disponíveis, atributos base e progressão |
| `POST` | `/api/v1/characters` | Cria um personagem (`playerId`, `name`, `classId`) |
| `GET` | `/api/v1/characters?playerId=...` | Lista os personagens do jogador |
| `GET` | `/api/v1/characters/:id?playerId=...` | Busca um personagem do jogador |
| `GET` | `/api/v1/characters/:id/combat?playerId=...` | Avança a simulação e retorna o estado do combate |

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

## Combate automático (Etapa 1)

O cliente faz polling em `GET /api/v1/characters/:id/combat` a cada segundo. Cada
chamada avança a simulação no servidor com base no tempo real decorrido (até 300
segundos por requisição), então o progresso continua mesmo com a aba fechada. O
navegador só anima os eventos retornados; ele nunca calcula dano, XP ou ouro.

- **Fase 1 — Clareira dos Aprendizes:** rotação de Slime Verde → Javali Selvagem
  → Lobo Cinzento.
- **Chefe:** após 10 abates na fase, o Rei Slime entra no lugar do monstro normal.
  Derrotá-lo conta como chefe vencido e retoma a rotação normal.
- **Recompensas por abate:** Slime 10 XP / 4 ouro; Javali 16 XP / 6 ouro; Lobo
  20 XP / 8 ouro; Rei Slime 150 XP / 90 ouro.
- **Cura:** 20% da vida máxima ao derrotar um monstro.
- **Morte:** o personagem fica 3 segundos em recuperação e volta com a vida cheia.
- **Nível:** o XP excedente transfere para o próximo nível e os atributos crescem
  conforme a classe.
- **Autoridade:** crítico, dano, morte, XP e ouro são resolvidos em
  `apps/api/src/game/combat.ts`; o cliente apenas reproduz os eventos.

O HUD mostra vida, XP, ouro, abates, progresso do chefe e o feed de eventos. O
personagem e os monstros são desenhados proceduralmente no Phaser, com animações
de idle, ataque, dano, morte e patrulha, além do cenário isométrico.


## Publicação de teste no Render
O arquivo `render.yaml` prepara o cliente estático e a API. Consulte [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md) para publicar pela branch `dev`.

## Estrutura
- `apps/web`: cliente Phaser.
- `apps/api`: API e regras de jogo.
- `packages/shared`: tipos compartilhados e constantes.
- `database`: infraestrutura local planejada.
- `docs`: documentação de design e implantação.

## Estado atual
A Etapa 1 avança com criação e seleção de personagem validadas pelo servidor,
escolha entre Guerreiro, Mago e Patrulheiro, atributos iniciais, HUD com
nome/classe/nível/XP/ouro e recuperação do personagem ao reabrir o navegador.
O combate automático já roda no servidor com três monstros, chefe com gating por
abates, XP, níveis, ouro, cura, morte/recuperação e simulação por tempo real. O
cliente exibe o novo visual isométrico animado e uma tela para trocar de
personagem. Persistência em banco, autenticação e o limite formal de recompensas
offline ainda serão implementados.

## Próximos marcos
1. ~~Cena isométrica com personagem e monstros de teste.~~ ✅
2. ~~Criação de personagem com classes e atributos validados pela API.~~ ✅
3. ~~Combate automático calculado pelo servidor, com monstros, chefe e progressão.~~ ✅
4. Persistência de personagem, inventário e progresso em PostgreSQL.
5. Cálculo offline com limite e auditoria.
6. Mercado interno; RMT somente após análise jurídica, financeira e antifraude.
