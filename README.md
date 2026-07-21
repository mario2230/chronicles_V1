# Chronicles — Protótipo

Motor de histórias ramificadas 100% data-driven, feito em HTML + CSS + JavaScript puro,
conforme o GDD. Nenhuma carta, inimigo, item ou narrativa está escrita no código — tudo
vem dos arquivos em `data/*.json`.

## Como rodar

Basta dar duplo-clique no `index.html`. Não precisa de servidor local: todo o
conteúdo do jogo (`classes.json`, `cards.json`, `events.json`, `endings.json`) está
embutido em `data.js` como uma constante `GAME_DATA`, carregada antes do `game.js`.

Isso existe porque navegadores bloqueiam `fetch()` de arquivos locais abertos via
`file://` (CORS). Se preferir editar os JSONs separadamente durante o desenvolvimento,
veja a nota no fim deste README sobre como voltar a usar arquivos `.json` soltos com
um servidor local.

## O que já está implementado

- **Loop principal completo**: 3 cartas → escolha → consequência → herói/árvore/história
  atualizados → novas cartas.
- **Game Director**: seleção procedural ponderada por `weight`, `raridade` (escalando
  com o nível do herói), região atual, anti-repetição e incentivo a cartas nunca vistas.
- **7 classes** com stats iniciais diferentes (Mago, Guerreiro, Arqueiro, Ladino,
  Paladino, Necromante, Druida).
- **43 cartas** cobrindo locais, inimigos, NPCs, itens, eventos, mistérios, artefatos
  e chefes, espalhadas por 10 regiões (aldeia, floresta, montanha, ruínas, caverna,
  pântano, deserto, templo, cemitério, castelo).
- **Combate automático** (ataque × defesa × sorte), equipamentos que alteram status,
  progressão de nível/experiência.
- **Mundo reativo**: matar vários lobos libera o chefe "Rei dos Lobos"; vários bandidos
  liberam a "Guilda dos Bandidos"; visitar o templo repetidamente libera o "Sumo
  Sacerdote" — tudo via `condicao` nos cards e contadores (`tags`).
- **Eventos globais temporários** (chuva, incêndio, eclipse, cometa, festival, praga,
  tempestade) que modificam pesos de cartas por algumas rodadas.
- **Sistema de Seed**: cada partida tem uma seed visível/editável; a mesma seed sempre
  gera a mesma sequência de cartas e combates.
- **7 finais possíveis** (Morto, Caçador de Dragões, Senhor das Trevas, Rei, Arquimago,
  Lenda, Tirano), cada um com condições diferentes lidas de `endings.json`.
- **Autosave** em `localStorage` — fechar e reabrir a aba retoma a partida.

## Estrutura

```
index.html
style.css
game.js    ← engine (interpreta os dados, nunca contém conteúdo do jogo)
data.js    ← GAME_DATA = { classes, cards, events, endings } — todo o conteúdo do jogo
```

### Voltando para JSONs separados (opcional, útil para editar conteúdo)

Se preferir editar `classes.json`, `cards.json`, `events.json` e `endings.json` como
arquivos separados em vez de mexer dentro de `data.js`, crie uma pasta `data/` com
esses quatro arquivos e troque a função `loadData()` em `game.js` para usar
`fetch("data/classes.json")` etc. em vez de `GAME_DATA`. Nesse caso será necessário
rodar um servidor local (`python3 -m http.server` na pasta do projeto), pois
navegadores bloqueiam `fetch()` de arquivos abertos via `file://`.

## Correções e novidades desta rodada

**🎯 Sistema de Habilidades de Classe (novo):** cada uma das 9 classes agora tem
4 habilidades próprias que desbloqueiam com o nível (1, 4, 8 e 14), aparecendo como
ícones redondos com emoji logo acima das cartas. Mistura de passivas (sempre ativas)
e ativas (clique, custam mana, têm recarga em turnos):

- **Passivas fixas**: bônus/malus permanente aplicado uma vez ao desbloquear (ex.:
  Mago ganha +15 mana mas -1 defesa).
- **Passivas dinâmicas**: escalam com o que a run acumulou — Guerreiro fica mais
  resistente a cada chefe derrotado, Ladino fica mais letal quanto mais ouro carrega,
  Druida fica mais rápido a cada região explorada, Paladino mais defensivo a cada
  aliado conquistado, Necromante mais forte a cada inimigo abatido no total, Bardo
  ganha mana por personagem conhecido, Monge fica mais forte quanto mais cheia sua
  mana, Mago ganha mana por item descoberto. Isso é o que faz duas partidas com a
  mesma classe jogarem diferente dependendo das cartas que você foi pegando.
- **Ativas**: desde golpes de dano em combate (Rajada Arcana, Tiro Certeiro, Punho de
  Ferro...) até buffs temporários (Grito de Guerra, Casca de Carvalho, Melodia
  Inspiradora), curas (Mãos Sagradas, Renascimento Selvagem) e ações especiais únicas
  (Sumiço do Ladino garante fuga; Mão Leve rouba ouro; Bis! do Bardo reseta recargas).

O motor (`game.js`) interpreta os dados de forma genérica — nenhuma classe tem código
próprio, só parâmetros diferentes em `DATA.classes[].habilidades`, no mesmo espírito
data-driven do resto do jogo. Isso significa que dá pra ajustar qualquer habilidade
(ou criar novas) só editando `data.js`, sem tocar no `game.js`.

**🐛 2 bugs corrigidos de passagem:** uma opção de escolha guardava `ouro` como
número simples em vez de `[min, max]` e quebrava o jogo (`resolveEscolha` agora aceita
os dois formatos); e os dois pontos onde ouro de combate era entregue não
consideravam bônus passivos de ouro — corrigido para that o Bardo realmente ganhe
mais ouro por vitória.

**✅ Testado:** simulação automatizada de 90 partidas completas (9 classes × 10
partidas, até 500 turnos cada, decisões aleatórias incluindo uso aleatório de
habilidades ativas dentro e fora de combate) — todas as 36 combinações classe+
habilidade foram acionadas pelo menos uma vez, zero erros de runtime.


**🐛 Bug crítico corrigido:** várias cartas de mistério (`orin_biblioteca_perdida`,
`cronica_dos_reis`, `bencao_da_fogueira` e outras) usavam campos que a função
`resolverMisterio` não sabia interpretar, e uma delas nem tinha o campo `ouro` que
o código lia sem checar. Isso derrubava o jogo com um erro no meio da partida —
quase sempre o próximo clique ficava travado (cartas sem resposta), e a única saída
parecia ser clicar em "Nova Aventura". A função foi reescrita para aceitar qualquer
combinação de `ouro`/`exp`/`cura`/`vida`/`nomeItem`, então isso não deve mais
acontecer, mesmo com mistérios futuros que usem campos diferentes.

**🐛 Item faltante corrigido:** o combate `vessa_duelo` prometia o item
`medalha_da_exilada` como recompensa, mas essa carta nunca tinha sido criada —
o jogador vencia e não recebia nada. Criado.

**⚔ Inimigos elite:** 8 inimigos raros/épicos que já existiam (Lobo Alfa, Espectro
da Torre, Necromante Iniciante, Arena de Combate, Horror Abissal, Guarda Real, O
Treino de Vessa, Mercenário Rival) agora carregam `"elite": true`. Isso dá a eles o
mesmo tremor de tela e prefixo de destaque no diário que um chefe tem, e recompensas
40% maiores — sem contar como "chefe" nem encerrar a run. 4 inimigos elite novos
foram adicionados: Xamã Goblin, Javali Ancestral, Morcego Rei e Salamandra Matriarca.

**👑 Dois subchefes novos** (não encerram a partida): Matriarca do Pântano (gatilho:
3 jacarés derrotados) e Senhor das Areias (gatilho: 3 escorpiões derrotados), cada um
com um item exclusivo garantido.

**👑 Chefes finais viraram uma escolha, não uma armadilha:** cartas cujo efeito tem
`flagFinal` (Dragão, Rei Lich, Cavaleiro Negro, Coração do Vulcão, Rainha Usurpada,
Devorador do Abismo, Último Covil, Rei Esqueleto, Behemoth Dourado, Leviatã) ainda
aparecem marcadas com a tag "👑 Chefe Final", mas derrotá-las não encerra mais a
run automaticamente. Ao vencer, o jogador vê um modal perguntando se quer **aceitar
aquele final agora** ou **continuar a aventura** guardando a conquista (ouro, exp e
item garantido continuam sendo recebidos de qualquer forma). Só quando o jogador
escolhe aceitar o final é que a run realmente termina.



Basta adicionar um novo objeto ao array `cards` dentro de `data.js`. Exemplo de uma
nova carta de inimigo na floresta:

```json
{
  "id": "urso",
  "emoji": "🐻",
  "nome": "Urso Feroz",
  "tipo": "inimigo",
  "raridade": "incomum",
  "weight": 40,
  "regiaoOrigem": ["floresta"],
  "minNivel": 2,
  "historia": ["O urso recua, ferido, e desaparece na mata."],
  "cor": "vermelho",
  "efeito": {
    "tipo": "combate",
    "vidaInimigo": 30, "ataqueInimigo": 8, "defesaInimigo": 3,
    "ouroDrop": [5, 12], "expDrop": 14
  }
}
```

Para que ela apareça no jogo, adicione `"urso"` ao array `desbloqueia` de alguma carta
já acessível (ex.: `estrada_floresta`) — ou marque `"inicial": true` para que já comece
disponível. Depois de editar `data.js`, é só recarregar a página (F5).

## Próximos passos sugeridos

- Tela de códice/descobertas dedicada (já há contador no painel do herói).
- Inventário de consumíveis usável a qualquer momento (hoje o consumível é usado na hora).
- Sistema de missões com múltiplas etapas (hoje resolve instantaneamente).
- Sons e música (pasta `assets/` já reservada no GDD).
- Cadeias narrativas ramificadas mais longas (§45 do GDD) — hoje o `desbloqueia`
  já cria ramificações, mas não há rastreamento de "linha de missão" dedicado.




  # Copyright

© 2026 Mario Gonçalves de Freitas Junior.

Este projeto está protegido por direitos autorais.

Não é permitida a cópia, redistribuição, modificação, comercialização ou utilização do código sem autorização expressa do autor.
