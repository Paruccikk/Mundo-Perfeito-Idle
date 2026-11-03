# Arquitetura técnica — Mundo Perfeito

## Visão
Monólito modular no início. Evitar microserviços até haver necessidade real.

### Web client
Phaser 3 + TypeScript + Vite:
- renderização, input, HUD e animações;
- nunca determina drops, XP, moeda ou propriedade de itens;
- chama a API para comandos e consulta estado.

### API
Node.js + TypeScript + Fastify:
- autenticação e autorização;
- regras de combate e progressão;
- inventário e ledger;
- mercado futuro;
- cálculo offline.

### Dados
PostgreSQL:
- fonte de verdade;
- transações ACID para recompensas e comércio;
- migrations versionadas via Prisma.

Redis:
- opcional no começo;
- cache, rate limiting distribuído e filas quando a carga justificar;
- não será fonte de verdade para saldo ou propriedade.

## Regras de integridade
1. Toda recompensa nasce no servidor.
2. Operações que alteram moeda ou itens são transacionais.
3. Cada operação sensível recebe chave idempotente.
4. O ledger registra origem, destino, quantidade, motivo e referência.
5. Dados enviados pelo navegador são tratados como entrada não confiável.

## Caminho de uma sessão idle
- Cliente solicita início de caça para uma fase desbloqueada.
- API valida personagem, equipamento e estágio.
- Servidor grava estado e timestamp.
- Ao consultar/retornar, servidor calcula tempo elegível.
- Simulador gera resultado usando dados do servidor.
- API grava resumo, XP, drops e ledger numa transação.
- Cliente recebe o estado atualizado.

## Evolução
Começar com um único serviço API. Separar worker de simulação/filas somente quando métricas mostrarem necessidade.
