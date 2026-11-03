# Mundo Perfeito — Perfect World Idle

Protótipo de um MMORPG Idle 2D isométrico para navegador (PC e celular).

## Decisões aprovadas
- Visual 2D isométrico.
- Combate automático somente enquanto o jogo estiver aberto e conectado ao servidor (inclusive minimizado, enquanto a sessão continuar ativa). Não haverá farm offline após fechar o jogo.
- Economia preparada para possível RMT oficial no futuro; sem saque ou conversão em dinheiro nesta fase.
- Plataforma navegador (desktop e mobile).

## Stack
- Cliente: Phaser 3 + TypeScript + Vite.
- Backend: Node.js + TypeScript + Fastify.
- Banco: PostgreSQL + Prisma.
- Sessões: JWT assinado no backend; senhas armazenadas com hash scrypt.
- Redis: reservado para cache, filas e sessões distribuídas quando necessário.

O servidor é a autoridade sobre XP, ouro, drops, inventário, mercado e transações. O navegador nunca decide nem envia a recompensa final.

## Requisitos
- Node.js 20+ e npm 10+.
- PostgreSQL configurado em `DATABASE_URL`.
- `JWT_SECRET` com pelo menos 32 caracteres aleatórios.

## Desenvolvimento local
```bash
npm install
npm run dev
```

Configure `DATABASE_URL` e `JWT_SECRET` no ambiente da API antes de iniciar.

Cliente: http://localhost:5173  
API: http://localhost:3000/health

## Conta e autenticação

A API oferece cadastro, login e validação da sessão:

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Cria conta com e-mail e senha (mínimo 10 caracteres) |
| `POST` | `/api/v1/auth/login` | Autentica e retorna token JWT |
| `GET` | `/api/v1/auth/me` | Valida o token e retorna a conta |

O cliente envia o token como `Authorization: Bearer <token>`. As rotas de personagens exigem autenticação e usam o identificador da conta extraído do token; não confiam mais em `playerId` informado pelo navegador.

**Progresso de visitante anterior:** no cadastro, o cliente envia o identificador anônimo antigo apenas para tentar vincular o personagem já existente à nova conta. Se o registro antigo existir e ainda não estiver associado a e-mail, o cadastro atualiza essa conta, preservando seus personagens. Se o navegador antigo/dados locais foram apagados, o progresso anônimo não pode ser recuperado automaticamente.

A sessão atual expira após 7 dias. O token fica no armazenamento local do navegador nesta versão de protótipo. Verificação de e-mail, recuperação de senha por e-mail e migração para cookie HttpOnly ainda são melhorias pendentes.

## Personagens

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/v1/game/classes` | Classes disponíveis, atributos base e progressão |
| `POST` | `/api/v1/characters` | Cria personagem autenticado (`name`, `classId`) |
| `GET` | `/api/v1/characters` | Lista personagens da conta autenticada |
| `GET` | `/api/v1/characters/:id` | Busca personagem pertencente à conta |
| `GET` | `/api/v1/characters/:id/combat` | Avança simulação e retorna o combate |

Regras:
- Nome entre 3 e 16 caracteres, único por conta.
- Até 3 personagens por conta.
- Classes: Guerreiro, Mago e Patrulheiro.
- As rotas de personagens respondem 401 sem token válido e 404 quando o personagem não pertence à conta.

## Combate automático

O cliente consulta `GET /api/v1/characters/:id/combat` periodicamente. O servidor é a autoridade do combate, mas a intenção de design é farmar apenas durante uma sessão ativa com o jogo aberto e conectado. Fechar o jogo encerra o farm; o tempo em que o jogo ficou fechado não deve gerar XP, ouro ou itens. O comportamento atual ainda usa uma janela de simulação de até 8 horas e será substituído por controle de sessão/heartbeat antes de considerar essa regra concluída. Cooldowns de ataque são persistidos para não reiniciar artificialmente a cadência entre chamadas.

- **Fase 1 — Clareira dos Aprendizes:** Slime Verde → Javali Selvagem → Lobo Cinzento.
- **Chefe:** após 10 abates na fase, aparece o Rei Slime.
- **Recompensas por abate:** Slime 10 XP / 4 ouro; Javali 16 XP / 6 ouro; Lobo 20 XP / 8 ouro; Rei Slime 150 XP / 90 ouro.
- **Cura:** 20% da vida máxima ao derrotar um monstro.
- **Morte:** recuperação de 3 segundos e retorno com vida cheia.
- **Nível:** XP excedente transfere para o próximo nível e atributos crescem conforme a classe.
- **Concorrência:** gravação condicional pelo último tick impede que duas requisições processem o mesmo intervalo e dupliquem recompensas.

## Persistência PostgreSQL — concluída (Etapa 4)

A API usa Prisma e PostgreSQL quando `DATABASE_URL` está configurada. Personagens, conta proprietária, classe, nível, XP, ouro, estágio e estado de combate são persistidos. As migrations ficam em `apps/api/prisma/migrations`.

O schema já reserva tabelas para inventário e auditoria econômica, mas **o sistema de itens/inventário ainda não está implementado no jogo**. Não confundir a existência dessas tabelas com drops funcionando.

## Publicação de teste no Render

O arquivo `render.yaml` prepara o cliente e a API. Consulte [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md) para publicar pela branch `dev` e configurar `DATABASE_URL` e `JWT_SECRET`.

- Jogo: https://mundo-perfeito-web.onrender.com
- API health: https://mundo-perfeito-api.onrender.com/health

## Estrutura
- `apps/web`: cliente Phaser.
- `apps/api`: API, autenticação e regras do jogo.
- `packages/shared`: tipos compartilhados e constantes.
- `database`: infraestrutura local.
- `docs`: documentação de design e implantação.

## Estado atual
Protótipo com tela de cadastro/login, sessão JWT, seleção e criação de personagens, três classes, cenário isométrico, combate automático, monstros e chefe, XP, níveis, ouro, cura, morte e recuperação. A API persiste personagens e combate no PostgreSQL. O cadastro tenta preservar progresso de visitante antigo quando o identificador local ainda está disponível.

A autenticação é uma primeira versão: ainda faltam verificação de e-mail, recuperação de senha, proteção anti-abuso mais completa e armazenamento de sessão HttpOnly. O identificador de visitante antigo não é uma identidade segura até ser convertido em uma conta.

## Próximos marcos

1. ~~Cena isométrica, personagens e monstros de teste.~~ ✅
2. ~~Criação de personagem com classes e atributos validados pela API.~~ ✅
3. ~~Combate automático no servidor, chefe, XP, níveis e ouro (atualmente com simulação por intervalo; regra final será apenas farm ativo).~~ ✅
4. ~~Persistência de personagens e progresso de combate em PostgreSQL.~~ ✅
5. **Autenticação e contas:** cadastro/login com JWT implementados; concluir verificação de e-mail, recuperação de senha, sessão HttpOnly, rate limiting e testes de autorização.
6. Inventário e equipamentos: implementar drops, itens, slots, atributos e persistência real dos itens.
7. Farm ativo e auditoria: processar combate somente com sessão do jogo ativa; encerrar o farm ao fechar/desconectar; tolerar minimização enquanto a conexão permanecer viva; auditar tempo ativo, XP, ouro, drops e transações; testar concorrência, reconexão e reinícios.
8. Mercado entre jogadores, com transações atômicas, taxas e prevenção de duplicação.
9. Avaliar RMT somente depois de estabilidade econômica, antifraude e análise jurídica/financeira.
