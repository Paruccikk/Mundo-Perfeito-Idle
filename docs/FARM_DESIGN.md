# Mundo Perfeito — Direção de Design: Fazenda Online

**Versão:** 1.0 — mudança de direção aprovada em 10/11/2026  
**Status:** especificação-base para implementação  
**Projeto:** Mundo Perfeito

> Este documento atualiza a prioridade do jogo: a experiência principal passa a ser uma fazenda online no estilo dos jogos sociais clássicos de fazenda, mantendo a cidade multiplayer e as fases de aventura já existentes. Não remover sistemas de combate, personagens, inventário, equipamentos, montarias ou fases nesta transição.

## 1. Visão atualizada

Mundo Perfeito será um jogo de fazenda online 2D isométrico, acessível pelo navegador em desktop e celular. Cada jogador possui uma propriedade particular que desenvolve ao longo do tempo. Na fazenda, prepara terrenos, planta alimentos, constrói instalações, compra e cria animais, coleta produtos e organiza sua produção.

A cidade continua sendo um espaço compartilhado: jogadores se encontram, caminham, conversam e visitam NPCs. Ela também concentra os serviços de construção, pecuária, sementes e comércio. As fases de aventura permanecem acessíveis como conteúdo paralelo de exploração e progressão.

O coração da economia será a troca entre jogadores: animais, sementes, colheitas, rações, produtos animais e materiais poderão ser negociados por meio de um mercado controlado pelo servidor.

## 2. Pilares

1. **Fazenda própria:** cada personagem possui uma fazenda persistente e identificada pelo servidor.
2. **Cidade viva:** a cidade permanece multiplayer, com presença, movimento e chat.
3. **Criação com profundidade:** animais possuem espécie, sexo, idade, saúde, fome, tier, atributos e linhagem.
4. **Produção interdependente:** plantações fornecem alimentos para animais; animais produzem recursos usados em receitas e comércio.
5. **Economia entre jogadores:** mercado seguro para compra e venda de bens permitidos.
6. **Expansão modular:** novas espécies, instalações, sementes, receitas, tiers e eventos devem ser adicionáveis por catálogo de dados.
7. **Servidor autoritativo:** custos, inventários, reprodução, colheitas, produção e negociações são validados e persistidos na API.

## 3. Navegação e mundos

O jogo terá três destinos principais:

- **Cidade:** praça multiplayer, NPCs e serviços.
- **Minha Fazenda:** propriedade particular do jogador, aberta por um novo botão/ícone de casa no HUD.
- **Fases:** mapa de aventura e combate já existente, mantido sem remoção.

A transição entre cidade, fazenda e fases deve preservar personagem, inventário, ouro, conexão e estado de sessão. O botão da fazenda deve estar acessível na cidade e nas fases. O jogador retorna à cidade pela interface da fazenda.

A primeira versão pode carregar a fazenda em uma cena própria chamada FarmScene e usar o mesmo personagem e HUD. A visita a fazendas de outros jogadores poderá ser adicionada depois, com permissões de visita.

## 4. Estrutura da fazenda

Cada propriedade começa com:
- Casa principal;
- Terreno aberto para expansão;
- Pequena área de plantio;
- Espaços reservados para construções;
- Armazém/depósito para produtos.

O terreno será uma grade isométrica com células posicionáveis. Construções ocupam uma ou mais células e não podem se sobrepor. Cada construção possui nível, custo, tempo de construção (se aplicável), capacidade e requisitos.

### Instalações iniciais

| Instalação | Uso |
|---|---|
| Casa principal | Identidade e ponto central da fazenda |
| Galinheiro | Abriga galinhas e galos |
| Curral | Abriga bovinos, como vacas e touros |
| Estábulo | Abriga cavalos, éguas e potros |
| Chiqueiro | Abriga porcos e matrizes/reprodutores |
| Aprisco | Abriga ovelhas e carneiros |
| Capril | Abriga cabras e bodes |
| Coelheira | Abriga coelhos |
| Viveiro | Abriga patos e gansos |
| Celeiro/depósito | Armazena colheitas, rações e produtos |

A lista é um catálogo expansível. Não é necessário implementar todas as espécies na primeira entrega.

## 5. NPCs e compras na cidade

Adicionar um NPC de **Construção e Propriedades**, responsável por vender projetos/instalações. O jogador compra o projeto, paga os materiais/custos e constrói na própria fazenda.

Adicionar um NPC de **Criador de Animais**, responsável por vender animais disponíveis no catálogo. A loja deve filtrar por espécie, sexo, tier e preço. A compra entrega uma instância individual do animal à fazenda, respeitando espaço e capacidade da instalação.

Os NPCs são a fonte inicial de instalações e animais. No futuro, jogadores poderão vender animais entre si; o mercado não deve depender do NPC como única fonte.

## 6. Plantio e alimentos

Cada canteiro/terreno cultivável possui estado próprio:
- Vazio;
- Preparado;
- Plantado;
- Em crescimento;
- Pronto para colher.

Uma plantação registra espécie de semente, instante de plantio, duração de crescimento, estágio visual, quantidade e qualidade potencial da colheita. A API calcula o tempo com relógio do servidor e valida a colheita.

Primeiros cultivos sugeridos:
- Milho;
- Trigo;
- Cenoura;
- Capim/feno;
- Soja ou outro grão para rações.

As culturas devem ter usos diferentes. Milho, trigo e cenoura podem alimentar espécies específicas; capim/feno sustenta herbívoros. Futuramente, receitas transformarão colheitas em rações balanceadas e produtos processados.

A primeira versão deve ter plantio, crescimento, colheita e armazenamento. Não introduzir irrigação, fertilizantes ou clima complexo antes do loop básico funcionar.

## 7. Animais

Cada animal será uma instância individual com, no mínimo:
- Espécie e raça/variante;
- Sexo (male ou female);
- Nome opcional;
- Tier/raridade;
- Idade e maturidade;
- Fome e saúde;
- Instalação atual;
- Estado (saudável, faminto, doente, gestante, em reprodução, etc.);
- Atributos de produção;
- Dados genéticos/linhagem para cruzamentos futuros;
- Proprietário atual e histórico de transferências.

Machos e fêmeas serão entidades distintas. A reprodução requer espécie compatível, macho e fêmea adultos, saudáveis e alojados em instalações adequadas. A reprodução terá tempo de gestação/incubação conforme a espécie, intervalo de descanso e chance de sucesso configurável. A cria recebe atributos herdáveis dos pais, com variação controlada.

### Catálogo planejado de espécies

| Grupo | Espécies/sexos |
|---|---|
| Aves | Galinha e galo; pata e pato; gansa e ganso |
| Bovinos | Vaca e touro |
| Equinos | Égua, cavalo e potro/potra |
| Suínos | Porca e porco |
| Ovinos | Ovelha e carneiro |
| Caprinos | Cabra e bode |
| Pequenos animais | Coelha e coelho |
| Futuras expansões | Abelhas, peixes de viveiro e espécies especiais |

O MVP deve começar com galinha/galo e vaca/touro, e adicionar cavalo/égua após o ciclo de instalação e alojamento estar estável. As demais espécies ficam previstas no catálogo, sem exigir implementação simultânea.

### Necessidades e produção

Animais consomem alimentos e precisam de condições adequadas. O servidor calcula fome, saúde e produção em intervalos controlados. Se o jogador negligenciar o animal, a produção diminui ou para; não deve haver morte punitiva na primeira versão.

Produtos iniciais:
- Galinhas: ovos;
- Vacas: leite;
- Ovelhas: lã;
- Porcos: recursos para receitas futuras;
- Cavalos: reprodução e, futuramente, montaria/serviços.

Não permitir produção ilimitada. Capacidade, alimentação, intervalos e estoque devem limitar a economia.

## 8. Tiers, raridade e genética

Tiers iniciais:
- Comum;
- Incomum;
- Raro;
- Épico;
- Lendário.

A raridade pode afetar aparência, atributos, eficiência, qualidade e potencial de produção, mas não deve simplesmente multiplicar todos os valores de forma descontrolada.

A raridade da cria será calculada no servidor a partir de herança dos pais, compatibilidade, atributos e uma chance pequena e configurável de mutação. Cruzar animais bons deve ser uma estratégia viável; comprar ovos/animais aleatórios não será a única forma de obter tiers superiores.

O sistema deve evitar pay-to-win e não prometer retorno financeiro. Raridade é um atributo de jogo, não valor monetário garantido.

## 9. Mercado entre jogadores

Mercado futuro com:
- Listagens de animais individuais;
- Venda de sementes, alimentos e rações;
- Venda de colheitas e produtos animais;
- Preço definido pelo vendedor;
- Taxa de listagem ou comissão como sumidouro de moeda;
- Prazo de anúncio;
- Cancelamento e devolução;
- Histórico de transações e reputação.

A transferência deve ocorrer em transação atômica: retirar o bem do vendedor, cobrar o comprador, transferir a propriedade e registrar o ledger. Um animal anunciado não pode ser alimentado, reproduzir, produzir ou ser anunciado novamente. Proteger contra duplicação, compra simultânea, auto-compra abusiva, preços negativos e replay de requisições.

O mercado entre jogadores será implementado depois que inventário, animais, armazenamento e ledger estiverem confiáveis. Não implementar dinheiro real, saque ou cash-out nesta fase.

## 10. Persistência e segurança

Entidades de domínio previstas:
- Farm: propriedade vinculada ao personagem;
- FarmTile: terreno e estado de cada célula;
- FarmBuilding: construção e posição;
- CropPlot/CropInstance: plantio e ciclo de crescimento;
- Animal: instância individual do animal;
- AnimalSpecies: catálogo de espécies;
- AnimalLineage: pais e linhagem;
- AnimalProduction: produção coletada/pendente;
- FarmStorage: estoque de produtos;
- FarmTransaction: histórico de compras e vendas;
- MarketListing: anúncios do mercado.

A API deve validar propriedade, capacidade, requisitos, custo e tempo. Nunca aceitar do navegador quantidade de produção, tier, resultado de reprodução, preço pago ou horário de conclusão como autoridade.

O estado da fazenda persiste mesmo se o jogador sair. A produção e o crescimento podem evoluir por relógio do servidor enquanto o jogador estiver ausente, diferente do combate idle antigo, que permanece sujeito às regras próprias já existentes. O servidor deve calcular períodos offline com limites e sem executar loops ilimitados.

## 11. Fases de implementação

### Fase A — Fazenda visual e navegação
- Criar FarmScene isométrica;
- Adicionar botão/ícone de casa ao HUD;
- Navegar cidade ↔ fazenda ↔ fases;
- Mostrar casa principal, terrenos, canteiros e espaços de construção;
- Preservar cenas e sistemas atuais.

### Fase B — Construções e NPCs
- Persistir fazenda por personagem;
- NPC de construção na cidade;
- Catálogo e compra de galinheiro, curral e estábulo;
- Posicionar e validar construções na grade;
- Capacidade por instalação.

### Fase C — Plantio
- Sementes e inventário de recursos;
- Preparar, plantar, crescer e colher;
- Relógio do servidor;
- Armazém da fazenda.

### Fase D — Animais
- NPC de compra de animais;
- Galinhas/galos e vacas/touros;
- Sexo, idade, fome, saúde, capacidade e alimentação;
- Ovos e leite;
- Cavalos/éguas em seguida.

### Fase E — Reprodução e tiers
- Maturidade e compatibilidade;
- Reprodução e nascimento;
- Herança de atributos;
- Tiers e mutações raras;
- Linhagem.

### Fase F — Mercado entre jogadores
- Anunciar e comprar animais;
- Anunciar e comprar alimentos e produtos;
- Ledger, taxas e auditoria;
- Proteções contra duplicação e fraude.

### Fase G — Expansões
- Novas espécies e construções;
- Processamento de alimentos;
- Visitas às fazendas;
- Decoração e expansão de terreno;
- Eventos sazonais e missões.

## 12. Critérios de aceite do primeiro marco

1. O botão de casa aparece no HUD sem remover os botões atuais.
2. O jogador consegue sair da cidade e entrar na fazenda, e voltar à cidade.
3. A cena de fases continua acessível e funcional.
4. A fazenda apresenta casa principal, grade de terreno, canteiros e áreas reservadas.
5. A fazenda é associada ao personagem no servidor, não apenas ao navegador.
6. Nenhuma mudança quebra login, seleção de personagem, cidade multiplayer, música ou combate.
