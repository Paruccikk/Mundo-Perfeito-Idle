# Mundo Perfeito — Documento de Design (GDD)
**Versão:** 0.1 — Fundação do projeto  
**Nome de trabalho:** Mundo Perfeito / Perfect World Idle

## 1. Visão do produto
Mundo Perfeito é um RPG Idle 2D isométrico jogado no navegador, com suporte a desktop e dispositivos móveis. O jogador desenvolve um personagem, escolhe regiões para caçar, derrota monstros automaticamente, coleta recursos, melhora equipamentos e desbloqueia novas fases. O progresso persiste entre sessões e pode avançar enquanto o jogador está offline, dentro de limites definidos pelo servidor.

A experiência combina sessões curtas de gestão com progressão de longo prazo. O jogador deve ter decisões relevantes — onde farmar, quais atributos priorizar, quais itens equipar e quando tentar um chefe — sem exigir controle manual constante.

## 2. Pilares
1. **Idle acessível:** iniciar, pausar e configurar uma rotina de caça é simples.
2. **Progressão legível:** cada fase apresenta metas, inimigos, recompensas e um chefe.
3. **Economia sustentável:** itens têm utilidade; fontes e sumidouros de moeda são monitorados.
4. **Integridade:** o servidor valida todas as ações econômicas e recompensas.
5. **Web-first:** interface responsiva, carregamento leve e controles adequados a mouse e toque.

## 3. Público e plataformas
- Navegador desktop e mobile.
- Interface responsiva; sem exigir instalação.
- A mesma conta e personagem em diferentes dispositivos.
- A primeira versão não terá cliente nativo.

## 4. Loop principal
1. Entrar e selecionar personagem.
2. Escolher região e estágio desbloqueado.
3. Configurar alvo/rotina de caça.
4. Iniciar combate automático.
5. Receber XP, ouro e itens validados pelo servidor.
6. Equipar, vender ou guardar itens.
7. Melhorar atributos/equipamentos.
8. Derrotar o chefe da região para desbloquear a próxima fase.

## 5. Combate automático
O cliente exibe a simulação e animações; o servidor calcula os resultados. O primeiro protótipo usará combate determinístico por intervalos de simulação, com atributos e tabelas de monstros definidos em dados.

Atributos iniciais propostos:
- Nível
- Vida máxima
- Ataque
- Defesa
- Velocidade de ataque
- Chance de crítico
- Multiplicador crítico
- Precisão e esquiva (posteriores)

A fórmula inicial deverá ser simples e ajustável por configuração. Exemplo conceitual:
`dano = max(1, ataque_do_jogador - defesa_do_monstro)`.
O tempo para derrotar um monstro depende do dano por golpe, velocidade de ataque e vida do monstro. O servidor aplica limites e validações.

## 6. Progressão por fases
A primeira região é um conteúdo de tutorial. Números abaixo são parâmetros provisórios, sujeitos a playtests.

| Região | Estágios | Nível sugerido | Tema |
|---|---:|---:|---|
| Clareira dos Aprendizes | 1–10 | 1–15 | slimes, javalis e lobos |
| Vale dos Orcs | 11–20 | 15–30 | orcs e saqueadores |
| Cripta Esquecida | 21–30 | 30–45 | esqueletos e necromantes |
| Terras Sombrias | 31–40 | 45–65 | espectros e criaturas corrompidas |
| Abismo Celestial | 41–50 | 65+ | guardiões e chefes |

Cada região contém:
- Monstros comuns e, opcionalmente, variantes raras.
- Um chefe de progressão.
- Tabela de drops específica.
- Requisito de desbloqueio.
- Faixa recomendada de poder.

O jogador pode repetir fases anteriores para buscar materiais, completar coleções e otimizar rendimento.

## 7. Itens e inventário
Raridades propostas:
- Comum
- Incomum
- Raro
- Épico
- Lendário
- Mítico

Categorias iniciais:
- Arma
- Armadura
- Elmo
- Acessório
- Material
- Consumível

Cada item deve ter um identificador estável, definição de catálogo, atributos e, quando aplicável, instância individual. Itens únicos negociáveis exigem rastreabilidade e histórico de propriedade.

## 8. Economia e RMT — política de lançamento
**A economia será projetada para não bloquear uma futura análise de RMT, mas o MVP não permitirá saque, cash-out, conversão em dinheiro ou promessa de valor financeiro.**

Fase inicial:
- Ouro interno sem valor resgatável.
- Mercado entre jogadores apenas após o inventário e a auditoria estarem confiáveis.
- Taxa de mercado como sumidouro de moeda.
- Registro imutável de movimentações (ledger).
- Limites de listagem, compra e transferência.
- Monitoramento de concentração de riqueza, transferências circulares e preços atípicos.

Antes de qualquer RMT:
- Parecer jurídico para os países de operação.
- Análise tributária, consumerista, regulatória e de pagamentos.
- KYC/AML quando aplicável e parceiro de pagamentos autorizado.
- Política de chargeback, fraude, contas comprometidas e disputas.
- Regras de saque, limites, taxas, reservas e encerramento de conta.
- Testes econômicos contra inflação, bots e exploração.

Não venderemos itens aleatórios com promessa de retorno financeiro. Não se deve apresentar drops como investimento ou renda garantida.

## 9. Farm offline
O servidor guarda o último instante de progresso confirmado e a configuração de caça. No retorno, calcula o tempo elegível, aplica um teto configurável e simula lotes de combate.

Regras de segurança:
- Usar horário do servidor, nunca o relógio informado pelo navegador.
- Definir teto inicial de horas offline por configuração.
- Validar fase, equipamento, capacidade de inventário e sobrevivência.
- Usar uma chave/idempotency para impedir resgate duplicado.
- Persistir resumo da simulação e ledger de recompensas em transação.
- Não aceitar do cliente valores de XP, ouro, drop ou duração.
- Limitar o tamanho do lote e evitar loops por segundo offline.

## 10. Monetização inicial
Não faz parte do primeiro protótipo. Futuras opções a avaliar:
- Cosméticos sem vantagem competitiva.
- Passe de conveniência com limites claros.
- Expansões de aparência e personalização.

Qualquer benefício pago que afete a economia deve passar por simulação de impacto e revisão de equilíbrio.

## 11. Antiabuso e segurança
- Servidor autoritativo.
- Validação de sessão e propriedade de personagem.
- Rate limit por conta/IP/ação.
- Logs de auditoria para inventário e moeda.
- Transações atômicas para comércio.
- IDs de operação idempotentes.
- Alertas para padrões anormais.
- Ferramentas administrativas com permissões e trilha de auditoria.

## 12. Escopo do MVP
Incluído:
- Login de desenvolvimento (substituir por autenticação real antes de produção).
- Uma cena isométrica de teste.
- Um personagem, três monstros de teste.
- Combate automático básico.
- XP e nível.
- Uma região com estágios.
- Inventário simples.
- API autoritativa e PostgreSQL.

Fora do MVP:
- RMT/cash-out.
- Mercado real entre jogadores.
- Guildas, PvP, chat global.
- Aplicativos nativos.
- NFTs, blockchain ou tokens externos.
- Conteúdo massivo e dezenas de classes.

## 13. Critérios de sucesso do primeiro protótipo
- Abrir no navegador desktop e mobile.
- Personagem e monstros visíveis em uma cena isométrica.
- Combate automático reproduzível.
- Recompensas calculadas no servidor.
- Progresso salvo e recuperado.
- Simulação offline sem duplicação de recompensas.
