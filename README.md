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

## Como adicionar conteúdo (sem tocar na lógica do jogo)

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
