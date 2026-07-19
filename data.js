/* ============================================================
   CHRONICLES — data.js
   Todo o conteúdo do jogo vive aqui dentro (formato idêntico ao dos
   arquivos data/*.json). Isso existe apenas para permitir abrir o
   jogo com duplo-clique no index.html sem precisar de servidor local
   (navegadores bloqueiam fetch() de arquivos JSON quando abertos via
   file://). Se você rodar por um servidor HTTP, pode ignorar este
   arquivo e usar as versões separadas em /data.
   Para adicionar conteúdo nesta versão: edite os arrays abaixo — a
   estrutura de cada objeto é idêntica à dos JSONs em /data.
   ============================================================ */

const GAME_DATA = {
  classes: [
  {
    "id": "mago",
    "emoji": "🧙",
    "nome": "Mago",
    "descricao": "Domina as artes arcanas. Frágil, porém devastador à distância.",
    "vidaMax": 70,
    "ataque": 8,
    "defesa": 2,
    "velocidade": 4,
    "manaMax": 50,
    "ouroInicial": 10
  },
  {
    "id": "guerreiro",
    "emoji": "⚔",
    "nome": "Guerreiro",
    "descricao": "Força bruta e resistência. Prospera no combate corpo a corpo.",
    "vidaMax": 110,
    "ataque": 9,
    "defesa": 7,
    "velocidade": 3,
    "manaMax": 10,
    "ouroInicial": 15
  },
  {
    "id": "arqueiro",
    "emoji": "🏹",
    "nome": "Arqueiro",
    "descricao": "Precisão e agilidade. Ataca antes de ser atacado.",
    "vidaMax": 85,
    "ataque": 8,
    "defesa": 4,
    "velocidade": 8,
    "manaMax": 20,
    "ouroInicial": 12
  },
  {
    "id": "ladino",
    "emoji": "🗡",
    "nome": "Ladino",
    "descricao": "Rápido, furtivo e oportunista. Prefere evitar do que enfrentar.",
    "vidaMax": 75,
    "ataque": 7,
    "defesa": 3,
    "velocidade": 9,
    "manaMax": 15,
    "ouroInicial": 25
  },
  {
    "id": "paladino",
    "emoji": "🛡",
    "nome": "Paladino",
    "descricao": "Guerreiro sagrado. Equilíbrio entre ataque, defesa e fé.",
    "vidaMax": 100,
    "ataque": 7,
    "defesa": 8,
    "velocidade": 4,
    "manaMax": 25,
    "ouroInicial": 10
  },
  {
    "id": "necromante",
    "emoji": "🌑",
    "nome": "Necromante",
    "descricao": "Manipula a morte a seu favor. Poderoso, mas instável.",
    "vidaMax": 65,
    "ataque": 9,
    "defesa": 2,
    "velocidade": 5,
    "manaMax": 45,
    "ouroInicial": 8
  },
  {
    "id": "druida",
    "emoji": "🍃",
    "nome": "Druida",
    "descricao": "Guardião da natureza. Versátil, com afinidade para a floresta.",
    "vidaMax": 90,
    "ataque": 6,
    "defesa": 5,
    "velocidade": 6,
    "manaMax": 35,
    "ouroInicial": 10
  },
  {
    "id": "bardo",
    "emoji": "🎸",
    "nome": "Bardo",
    "descricao": "Usa música e carisma para encantar e sobreviver. Muito rápido e cheio de truques.",
    "vidaMax": 80,
    "ataque": 6,
    "defesa": 4,
    "velocidade": 9,
    "manaMax": 40,
    "ouroInicial": 20
  },
  {
    "id": "monge",
    "emoji": "🥋",
    "nome": "Monge",
    "descricao": "Mestre do combate desarmado. Ágil e resistente, focado no equilíbrio interior.",
    "vidaMax": 95,
    "ataque": 8,
    "defesa": 6,
    "velocidade": 7,
    "manaMax": 20,
    "ouroInicial": 5
  }
],
  // Elenco de personagens recorrentes. Cada um é referenciado por cartas com
  // "efeito": { "tipo": "personagem", "personagemId": "<id>", ... }. O motor
  // guarda relacionamento e memória automaticamente (ver game.js).
  characters: [
  {
    "id": "eldrin",
    "emoji": "🧙",
    "nome": "Eldrin",
    "titulo": "O Sábio",
    "personalidade": "Paciente, enigmático, fala por parábolas.",
    "descricao": "Um velho eremita que já viu impérios nascerem e caírem.",
    "regiaoOrigem": ["aldeia", "floresta"]
  },
  {
    "id": "kael",
    "emoji": "⚔",
    "nome": "Kael",
    "titulo": "O Guerreiro",
    "personalidade": "Direto, orgulhoso, admira coragem em combate.",
    "descricao": "Um mercenário à procura de uma causa que valha a pena.",
    "regiaoOrigem": ["aldeia", "montanha"]
  },
  {
    "id": "lyra",
    "emoji": "🏹",
    "nome": "Lyra",
    "titulo": "A Caçadora",
    "personalidade": "Independente, arredia, detesta cidades.",
    "descricao": "Conhece cada trilha da floresta melhor do que seu próprio nome.",
    "regiaoOrigem": ["floresta"]
  },
  {
    "id": "seraphina",
    "emoji": "☀️",
    "nome": "Seraphina",
    "titulo": "A Curandeira",
    "personalidade": "Gentil, devota e pacífica. Repudia a violência desnecessária.",
    "descricao": "Uma sacerdotisa errante que leva a luz de sua divindade aos feridos.",
    "regiaoOrigem": ["aldeia", "templo"]
  },
  {
    "id": "grimm",
    "emoji": "🦇",
    "nome": "Grimm",
    "titulo": "O Caçador",
    "personalidade": "Sombrio, prático e de poucas palavras.",
    "descricao": "Um matador de monstros que prefere trabalhar à noite e cobrar adiantado.",
    "regiaoOrigem": ["cemiterio", "pantano"]
  }

],
  cards: [
  {
    "id": "aldeia",
    "emoji": "🏘",
    "nome": "Aldeia Natal",
    "tipo": "local",
    "raridade": "comum",
    "weight": 10,
    "inicial": true,
    "regiaoOrigem": ["aldeia"],
    "minNivel": 1,
    "historia": [
      "Você contempla mais uma vez sua aldeia natal antes de partir.",
      "As ruas da aldeia ainda guardam lembranças de sua infância."
    ],
    "cor": "azul",
    "efeito": { "tipo": "mudar_regiao", "regiao": "aldeia" },
    "desbloqueia": ["mercador", "ferreiro", "estrada_floresta", "eldrin_encontro", "kael_encontro"]
  },
  {
    "id": "eldrin_encontro",
    "emoji": "🧙",
    "nome": "Eldrin, o Sábio",
    "tipo": "personagem",
    "raridade": "incomum",
    "weight": 26,
    "regiaoOrigem": ["aldeia"],
    "minNivel": 1,
    "historia": [
      "Um velho eremita observa você da porta da taverna. \"Vejo em você uma jornada que ainda nem começou de verdade\", diz ele.",
      "Eldrin ajusta o manto surrado e sorri. \"Poucos param para conversar com um velho tolo. Isso diz algo sobre você.\""
    ],
    "cor": "roxo",
    "efeito": { "tipo": "personagem", "personagemId": "eldrin", "relacao": 8, "exp": 6 },
    "desbloqueia": ["eldrin_ensinamento"]
  },
  {
    "id": "kael_encontro",
    "emoji": "⚔",
    "nome": "Kael, o Guerreiro",
    "tipo": "personagem",
    "raridade": "incomum",
    "weight": 26,
    "regiaoOrigem": ["aldeia"],
    "minNivel": 1,
    "historia": [
      "Um mercenário de cicatrizes visíveis mede você com o olhar. \"Não parece grande coisa. Prove-me o contrário.\"",
      "Kael afia a espada sem tirar os olhos de você. \"Ouvi dizer que a floresta anda perigosa. Bom teste, se você tiver estômago.\""
    ],
    "cor": "vermelho",
    "efeito": { "tipo": "personagem", "personagemId": "kael", "relacao": 8, "exp": 6 }
  },
  {
    "id": "eldrin_ensinamento",
    "emoji": "📖",
    "nome": "Ensinamento de Eldrin",
    "tipo": "personagem",
    "raridade": "rara",
    "weight": 14,
    "regiaoOrigem": ["floresta"],
    "minNivel": 2,
    "historia": [
      "Eldrin reaparece sentado junto a uma fogueira na floresta, como se soubesse exatamente onde encontrá-lo. \"Voltamos a nos ver. Deixe-me lhe ensinar algo útil.\""
    ],
    "cor": "roxo",
    "efeito": { "tipo": "personagem", "personagemId": "eldrin", "relacao": 14, "exp": 18 }
  },
  {
    "id": "estrada_floresta",
    "emoji": "🌲",
    "nome": "Estrada da Floresta",
    "tipo": "local",
    "raridade": "comum",
    "weight": 30,
    "inicial": true,
    "regiaoOrigem": ["aldeia", "floresta"],
    "minNivel": 1,
    "historia": [
      "Você segue por uma estrada estreita que leva a uma floresta antiga.",
      "O caminho se estreita entre árvores altas e sombrias."
    ],
    "cor": "verde",
    "efeito": { "tipo": "mudar_regiao", "regiao": "floresta" },
    "desbloqueia": ["lobo", "veado", "cogumelos", "lenhador", "arvore_anciã", "acampamento", "lyra_encontro"]
  },
  {
    "id": "lyra_encontro",
    "emoji": "🏹",
    "nome": "Lyra, a Caçadora",
    "tipo": "personagem",
    "raridade": "incomum",
    "weight": 26,
    "regiaoOrigem": ["floresta"],
    "minNivel": 1,
    "historia": [
      "Uma flecha cravada numa árvore próxima anuncia sua chegada antes de qualquer palavra. \"Está pisando alto demais para quem quer passar despercebido\", diz uma voz entre as folhas.",
      "Lyra desce de um galho sem fazer ruído algum. \"A floresta fala de você. Ainda não decidi se isso é bom.\""
    ],
    "cor": "verde",
    "efeito": { "tipo": "personagem", "personagemId": "lyra", "relacao": 8, "exp": 6 }
  },
  {
    "id": "lobo",
    "emoji": "🐺",
    "nome": "Lobo",
    "tipo": "inimigo",
    "raridade": "comum",
    "weight": 90,
    "regiaoOrigem": ["floresta"],
    "minNivel": 1,
    "historia": [
      "O herói derrotou o lobo com um golpe certeiro.",
      "O lobo tentou atacar, mas caiu diante da sua arma.",
      "A batalha foi intensa, porém o herói saiu vitorioso."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 18,
      "ataqueInimigo": 5,
      "defesaInimigo": 1,
      "ouroDrop": [2, 6],
      "expDrop": 8,
      "contadorTag": "lobosDerrotados"
    },
    "desbloqueia": ["rei_dos_lobos"]
  },
  {
    "id": "veado",
    "emoji": "🦌",
    "nome": "Veado",
    "tipo": "evento",
    "raridade": "comum",
    "weight": 60,
    "regiaoOrigem": ["floresta"],
    "minNivel": 1,
    "historia": [
      "Um veado cruza seu caminho e desaparece na mata.",
      "Você observa um veado pastar tranquilamente."
    ],
    "cor": "verde",
    "efeito": { "tipo": "recompensa_leve", "ouro": [0, 2], "exp": 2 }
  },
  {
    "id": "cogumelos",
    "emoji": "🍄",
    "nome": "Cogumelos Silvestres",
    "tipo": "item",
    "raridade": "comum",
    "weight": 55,
    "regiaoOrigem": ["floresta", "pantano"],
    "minNivel": 1,
    "historia": [
      "Você colhe cogumelos que podem ser úteis para poções.",
      "Cogumelos estranhos crescem na base de uma árvore."
    ],
    "cor": "amarelo",
    "efeito": { "tipo": "item", "slot": "consumivel", "cura": 15, "nomeItem": "Cogumelos Silvestres" }
  },
  {
    "id": "lenhador",
    "emoji": "🪓",
    "nome": "Lenhador Perdido",
    "tipo": "npc",
    "raridade": "incomum",
    "weight": 30,
    "regiaoOrigem": ["floresta"],
    "minNivel": 1,
    "historia": [
      "Um lenhador perdido agradece sua ajuda e oferece uma recompensa.",
      "O lenhador compartilha rações em troca de companhia."
    ],
    "cor": "laranja",
    "efeito": { "tipo": "npc", "ouro": [3, 8], "expChance": 5 },
    "desbloqueia": ["machado_lenhador"]
  },
  {
    "id": "arvore_anciã",
    "emoji": "🌳",
    "nome": "Árvore Ancestral",
    "tipo": "misterio",
    "raridade": "rara",
    "weight": 12,
    "regiaoOrigem": ["floresta"],
    "minNivel": 2,
    "historia": [
      "A árvore ancestral sussurra segredos antigos ao seu ouvido.",
      "Você sente uma energia estranha emanar do tronco centenário."
    ],
    "cor": "cinza",
    "efeito": { "tipo": "misterio", "resultados": [
      { "chance": 50, "sub": "recompensa_leve", "ouro": [5, 12], "exp": 10 },
      { "chance": 30, "sub": "item", "slot": "acessorio", "nomeItem": "Amuleto da Floresta", "bonus": { "mana": 5 } },
      { "chance": 20, "sub": "dano", "vida": 8 }
    ] },
    "desbloqueia": ["druida_ermitao"]
  },
  {
    "id": "acampamento",
    "emoji": "🏕",
    "nome": "Acampamento Abandonado",
    "tipo": "local",
    "raridade": "comum",
    "weight": 20,
    "regiaoOrigem": ["floresta", "montanha"],
    "minNivel": 1,
    "historia": [
      "Você descansa junto às cinzas de uma fogueira apagada.",
      "Um acampamento vazio oferece um breve refúgio."
    ],
    "cor": "verde",
    "efeito": { "tipo": "recompensa_leve", "cura": 20, "exp": 3 }
  },
  {
    "id": "rei_dos_lobos",
    "emoji": "🐺👑",
    "nome": "Rei dos Lobos",
    "tipo": "chefe",
    "raridade": "epica",
    "weight": 4,
    "regiaoOrigem": ["floresta"],
    "minNivel": 4,
    "condicao": { "tag": "lobosDerrotados", "minimo": 4 },
    "historia": [
      "A alcateia toda uiva quando seu líder cai diante de você.",
      "O Rei dos Lobos reconhece sua força antes de sucumbir."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 60,
      "ataqueInimigo": 12,
      "defesaInimigo": 4,
      "ouroDrop": [20, 35],
      "expDrop": 40,
      "itemGarantido": "pele_rei_lobos"
    }
  },
  {
    "id": "bandido",
    "emoji": "🏹",
    "nome": "Bandido",
    "tipo": "inimigo",
    "raridade": "comum",
    "weight": 70,
    "regiaoOrigem": ["floresta", "ruinas", "deserto"],
    "minNivel": 1,
    "historia": [
      "O bandido foge após levar a pior no confronto.",
      "Você desarma o bandido antes que ele reaja.",
      "Um golpe rápido encerra a emboscada do bandido."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 22,
      "ataqueInimigo": 6,
      "defesaInimigo": 2,
      "ouroDrop": [4, 10],
      "expDrop": 9,
      "contadorTag": "banditosDerrotados"
    },
    "desbloqueia": ["guilda_bandidos"]
  },
  {
    "id": "guilda_bandidos",
    "emoji": "🏴",
    "nome": "Guilda dos Bandidos",
    "tipo": "chefe",
    "raridade": "epica",
    "weight": 4,
    "regiaoOrigem": ["ruinas"],
    "minNivel": 5,
    "condicao": { "tag": "banditosDerrotados", "minimo": 4 },
    "historia": [
      "O líder da guilda cai, e seus comparsas se dispersam pela noite.",
      "Você desmantela a guilda que aterrorizava a região."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 70,
      "ataqueInimigo": 13,
      "defesaInimigo": 5,
      "ouroDrop": [30, 45],
      "expDrop": 45,
      "itemGarantido": "adaga_sombria"
    }
  },
  {
    "id": "ruinas_entrada",
    "emoji": "🏛",
    "nome": "Ruínas Esquecidas",
    "tipo": "local",
    "raridade": "incomum",
    "weight": 25,
    "inicial": true,
    "regiaoOrigem": ["floresta", "aldeia"],
    "minNivel": 2,
    "historia": [
      "Pilares quebrados marcam a entrada de ruínas antigas.",
      "O silêncio das ruínas esconde perigos e tesouros."
    ],
    "cor": "azul",
    "efeito": { "tipo": "mudar_regiao", "regiao": "ruinas" },
    "desbloqueia": ["esqueleto", "bandido", "tesouro_ruinas", "portal_misterioso"]
  },
  {
    "id": "esqueleto",
    "emoji": "💀",
    "nome": "Esqueleto Guardião",
    "tipo": "inimigo",
    "raridade": "incomum",
    "weight": 20,
    "regiaoOrigem": ["ruinas", "cemiterio"],
    "minNivel": 2,
    "historia": [
      "Os ossos do guardião se espalham pelo chão de pedra.",
      "O esqueleto desaba, vencido por sua lâmina."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 28,
      "ataqueInimigo": 7,
      "defesaInimigo": 4,
      "ouroDrop": [5, 12],
      "expDrop": 12
    }
  },
  {
    "id": "tesouro_ruinas",
    "emoji": "💰",
    "nome": "Baú Antigo",
    "tipo": "item",
    "raridade": "rara",
    "weight": 15,
    "regiaoOrigem": ["ruinas", "caverna"],
    "minNivel": 2,
    "historia": [
      "Dentro do baú, moedas antigas brilham à meia-luz.",
      "Você força a fechadura enferrujada e encontra um tesouro."
    ],
    "cor": "amarelo",
    "efeito": { "tipo": "recompensa_leve", "ouro": [15, 30], "exp": 5 }
  },
  {
    "id": "portal_misterioso",
    "emoji": "🌀",
    "nome": "Portal Instável",
    "tipo": "misterio",
    "raridade": "epica",
    "weight": 6,
    "regiaoOrigem": ["ruinas", "templo"],
    "minNivel": 3,
    "historia": [
      "O portal pulsa com uma luz que não pertence a este mundo.",
      "Você atravessa o portal e sente a realidade se dobrar."
    ],
    "cor": "roxo",
    "efeito": { "tipo": "misterio", "resultados": [
      { "chance": 40, "sub": "item", "slot": "acessorio", "nomeItem": "Fragmento do Vazio", "bonus": { "ataque": 3 } },
      { "chance": 30, "sub": "recompensa_leve", "ouro": [10, 20], "exp": 15 },
      { "chance": 30, "sub": "dano", "vida": 12 }
    ] }
  },
  {
    "id": "montanha_trilha",
    "emoji": "🏔",
    "nome": "Trilha da Montanha",
    "tipo": "local",
    "raridade": "incomum",
    "weight": 25,
    "inicial": true,
    "regiaoOrigem": ["floresta", "aldeia"],
    "minNivel": 3,
    "historia": [
      "O ar fica mais frio conforme você sobe a trilha rochosa.",
      "As montanhas se erguem imponentes à sua frente."
    ],
    "cor": "azul",
    "efeito": { "tipo": "mudar_regiao", "regiao": "montanha" },
    "desbloqueia": ["aguia", "troll", "caverna_gelo", "dragao"]
  },
  {
    "id": "aguia",
    "emoji": "🦅",
    "nome": "Águia Selvagem",
    "tipo": "evento",
    "raridade": "comum",
    "weight": 55,
    "regiaoOrigem": ["montanha"],
    "minNivel": 3,
    "historia": [
      "Uma águia sobrevoa em círculos e some entre as nuvens.",
      "O grito da águia ecoa pelo desfiladeiro."
    ],
    "cor": "verde",
    "efeito": { "tipo": "recompensa_leve", "ouro": [2, 5], "exp": 4 }
  },
  {
    "id": "troll",
    "emoji": "👹",
    "nome": "Troll da Montanha",
    "tipo": "inimigo",
    "raridade": "rara",
    "weight": 20,
    "regiaoOrigem": ["montanha"],
    "minNivel": 4,
    "historia": [
      "O troll desaba com um rugido que ecoa pelas pedras.",
      "Você esquiva do porrete gigante e contra-ataca."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 45,
      "ataqueInimigo": 10,
      "defesaInimigo": 5,
      "ouroDrop": [12, 22],
      "expDrop": 22
    }
  },
  {
    "id": "caverna_gelo",
    "emoji": "🧊",
    "nome": "Caverna Congelada",
    "tipo": "local",
    "raridade": "incomum",
    "weight": 20,
    "regiaoOrigem": ["montanha"],
    "minNivel": 4,
    "historia": [
      "O gelo reflete sua tocha em mil pontos de luz.",
      "Estalactites de gelo pendem sobre sua cabeça."
    ],
    "cor": "azul",
    "efeito": { "tipo": "mudar_regiao", "regiao": "caverna" },
    "desbloqueia": ["lobo_branco", "cristal_gelo"]
  },
  {
    "id": "lobo_branco",
    "emoji": "🐺❄",
    "nome": "Lobo Branco",
    "tipo": "inimigo",
    "raridade": "incomum",
    "weight": 35,
    "regiaoOrigem": ["caverna", "montanha"],
    "minNivel": 4,
    "historia": [
      "O lobo branco se funde novamente com a neve, derrotado.",
      "Suas presas geladas não foram páreo para sua defesa."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 32,
      "ataqueInimigo": 8,
      "defesaInimigo": 3,
      "ouroDrop": [6, 14],
      "expDrop": 15
    }
  },
  {
    "id": "cristal_gelo",
    "emoji": "💎",
    "nome": "Cristal de Gelo Eterno",
    "tipo": "artefato",
    "raridade": "lendaria",
    "weight": 3,
    "regiaoOrigem": ["caverna"],
    "minNivel": 6,
    "historia": [
      "O cristal pulsa com um frio que fortalece sua vontade.",
      "Ao tocar o cristal, um poder gélido percorre suas veias."
    ],
    "cor": "roxo",
    "efeito": { "tipo": "item", "slot": "acessorio", "nomeItem": "Cristal de Gelo Eterno", "bonus": { "defesa": 5, "vidaMax": 20 } }
  },
  {
    "id": "dragao",
    "emoji": "🐉",
    "nome": "Dragão",
    "tipo": "chefe",
    "raridade": "mitica",
    "weight": 2,
    "regiaoOrigem": ["montanha"],
    "minNivel": 12,
    "condicao": { "itemRequerido": "espada_lendaria" },
    "historia": [
      "As chamas do dragão iluminam o céu antes de ele cair.",
      "Após uma batalha lendária, o dragão finalmente sucumbe."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 150,
      "ataqueInimigo": 22,
      "defesaInimigo": 10,
      "ouroDrop": [80, 150],
      "expDrop": 120,
      "itemGarantido": "coracao_dragao",
      "flagFinal": "cacador_de_dragoes"
    }
  },
  {
    "id": "mercador",
    "emoji": "👨‍💼",
    "nome": "Mercador Viajante",
    "tipo": "npc",
    "raridade": "comum",
    "weight": 30,
    "regiaoOrigem": ["aldeia", "ruinas", "deserto"],
    "minNivel": 1,
    "historia": [
      "O mercador oferece um bom negócio antes de seguir viagem.",
      "Você troca algumas moedas por suprimentos úteis."
    ],
    "cor": "laranja",
    "efeito": { "tipo": "item", "slot": "consumivel", "cura": 25, "nomeItem": "Ração de Viagem", "custoOuro": 5 }
  },
  {
    "id": "ferreiro",
    "emoji": "🔨",
    "nome": "Ferreiro da Aldeia",
    "tipo": "npc",
    "raridade": "incomum",
    "weight": 25,
    "regiaoOrigem": ["aldeia"],
    "minNivel": 1,
    "historia": [
      "O ferreiro forja uma lâmina sob encomenda especialmente para você.",
      "Faíscas voam enquanto o ferreiro finaliza seu trabalho."
    ],
    "cor": "laranja",
    "efeito": { "tipo": "item", "slot": "arma", "nomeItem": "Espada de Ferro", "bonus": { "ataque": 3 }, "custoOuro": 10 }
  },
  {
    "id": "machado_lenhador",
    "emoji": "🪓",
    "nome": "Machado do Lenhador",
    "tipo": "item",
    "raridade": "incomum",
    "weight": 18,
    "regiaoOrigem": ["floresta"],
    "minNivel": 2,
    "historia": [
      "O machado é pesado, mas corta com força brutal.",
      "Você equipa o machado deixado pelo lenhador."
    ],
    "cor": "amarelo",
    "efeito": { "tipo": "item", "slot": "arma", "nomeItem": "Machado do Lenhador", "bonus": { "ataque": 4, "velocidade": -1 } }
  },
  {
    "id": "druida_ermitao",
    "emoji": "🍃",
    "nome": "Druida Eremita",
    "tipo": "npc",
    "raridade": "rara",
    "weight": 10,
    "regiaoOrigem": ["floresta"],
    "minNivel": 3,
    "historia": [
      "O eremita compartilha um pouco de sua sabedoria ancestral.",
      "Ervas raras são oferecidas em troca de sua companhia."
    ],
    "cor": "laranja",
    "efeito": { "tipo": "item", "slot": "consumivel", "cura": 40, "nomeItem": "Elixir da Natureza" }
  },
  {
    "id": "pele_rei_lobos",
    "emoji": "🐺",
    "nome": "Pele do Rei dos Lobos",
    "tipo": "item",
    "raridade": "epica",
    "weight": 0,
    "regiaoOrigem": ["floresta"],
    "minNivel": 4,
    "oculta": true,
    "historia": ["Você veste a pele do Rei dos Lobos como um troféu de guerra."],
    "cor": "amarelo",
    "efeito": { "tipo": "item", "slot": "armadura", "nomeItem": "Pele do Rei dos Lobos", "bonus": { "defesa": 4, "vidaMax": 15 } }
  },
  {
    "id": "adaga_sombria",
    "emoji": "🗡",
    "nome": "Adaga Sombria",
    "tipo": "item",
    "raridade": "epica",
    "weight": 0,
    "regiaoOrigem": ["ruinas"],
    "minNivel": 5,
    "oculta": true,
    "historia": ["A adaga sombria parece sussurrar em sua mão."],
    "cor": "amarelo",
    "efeito": { "tipo": "item", "slot": "arma", "nomeItem": "Adaga Sombria", "bonus": { "ataque": 5, "velocidade": 2 } }
  },
  {
    "id": "espada_lendaria",
    "emoji": "⚔",
    "nome": "Espada Lendária",
    "tipo": "artefato",
    "raridade": "lendaria",
    "weight": 3,
    "regiaoOrigem": ["templo", "castelo"],
    "minNivel": 8,
    "historia": [
      "A espada canta ao sair de sua bainha de pedra.",
      "Um poder antigo desperta ao empunhar a lâmina lendária."
    ],
    "cor": "roxo",
    "efeito": { "tipo": "item", "slot": "arma", "nomeItem": "Espada Lendária", "bonus": { "ataque": 8, "defesa": 2 } }
  },
  {
    "id": "coracao_dragao",
    "emoji": "❤️‍🔥",
    "nome": "Coração de Dragão",
    "tipo": "artefato",
    "raridade": "mitica",
    "weight": 0,
    "regiaoOrigem": ["montanha"],
    "minNivel": 12,
    "oculta": true,
    "historia": ["O coração do dragão pulsa com um calor sobrenatural em suas mãos."],
    "cor": "roxo",
    "efeito": { "tipo": "item", "slot": "acessorio", "nomeItem": "Coração de Dragão", "bonus": { "ataque": 6, "defesa": 6, "vidaMax": 30 } }
  },
  {
    "id": "templo_entrada",
    "emoji": "⛪",
    "nome": "Templo Esquecido",
    "tipo": "local",
    "raridade": "rara",
    "weight": 12,
    "regiaoOrigem": ["ruinas", "deserto"],
    "minNivel": 5,
    "historia": [
      "Colunas cobertas de musgo guardam a entrada do templo.",
      "Um silêncio sagrado paira sobre o templo em ruínas."
    ],
    "cor": "azul",
    "efeito": { "tipo": "mudar_regiao", "regiao": "templo" },
    "desbloqueia": ["sacerdote_caido", "sumo_sacerdote", "espada_lendaria"]
  },
  {
    "id": "sacerdote_caido",
    "emoji": "👻",
    "nome": "Sacerdote Caído",
    "tipo": "inimigo",
    "raridade": "rara",
    "weight": 18,
    "regiaoOrigem": ["templo", "cemiterio"],
    "minNivel": 5,
    "historia": [
      "O espírito do sacerdote se dissolve em fumaça, enfim em paz.",
      "Suas orações sombrias não impediram a derrota."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 38,
      "ataqueInimigo": 9,
      "defesaInimigo": 3,
      "ouroDrop": [10, 18],
      "expDrop": 18,
      "contadorTag": "templosVisitados"
    }
  },
  {
    "id": "sumo_sacerdote",
    "emoji": "⛪",
    "nome": "Sumo Sacerdote",
    "tipo": "chefe",
    "raridade": "epica",
    "weight": 4,
    "regiaoOrigem": ["templo"],
    "minNivel": 7,
    "condicao": { "tag": "templosVisitados", "minimo": 3 },
    "historia": [
      "O Sumo Sacerdote se curva, reconhecendo sua fé mais forte.",
      "A luz do templo se apaga com a queda do Sumo Sacerdote."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 80,
      "ataqueInimigo": 14,
      "defesaInimigo": 7,
      "ouroDrop": [35, 55],
      "expDrop": 50
    }
  },
  {
    "id": "cemiterio_portao",
    "emoji": "⚰️",
    "nome": "Portão do Cemitério",
    "tipo": "local",
    "raridade": "incomum",
    "weight": 20,
    "inicial": true,
    "regiaoOrigem": ["ruinas", "pantano"],
    "minNivel": 3,
    "historia": [
      "Névoa espessa cobre as lápides ao entrar no cemitério.",
      "Os portões enferrujados rangem ao serem abertos."
    ],
    "cor": "cinza",
    "efeito": { "tipo": "mudar_regiao", "regiao": "cemiterio" },
    "desbloqueia": ["fantasma", "esqueleto", "rei_lich"]
  },
  {
    "id": "fantasma",
    "emoji": "👻",
    "nome": "Fantasma Errante",
    "tipo": "inimigo",
    "raridade": "incomum",
    "weight": 30,
    "regiaoOrigem": ["cemiterio", "pantano"],
    "minNivel": 3,
    "historia": [
      "O fantasma se dissipa com um lamento distante.",
      "Sua lâmina atravessa o fantasma, que finalmente descansa."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 26,
      "ataqueInimigo": 8,
      "defesaInimigo": 1,
      "ouroDrop": [5, 10],
      "expDrop": 13
    }
  },
  {
    "id": "rei_lich",
    "emoji": "👑💀",
    "nome": "Rei Lich",
    "tipo": "chefe",
    "raridade": "mitica",
    "weight": 2,
    "regiaoOrigem": ["cemiterio"],
    "minNivel": 15,
    "historia": [
      "A coroa do Rei Lich se estilhaça ao tocar o chão.",
      "Um silêncio eterno toma o lugar do poder do Lich."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 170,
      "ataqueInimigo": 24,
      "defesaInimigo": 9,
      "ouroDrop": [90, 160],
      "expDrop": 130,
      "flagFinal": "senhor_das_trevas"
    }
  },
  {
    "id": "pantano_entrada",
    "emoji": "🐊",
    "nome": "Pântano Nebuloso",
    "tipo": "local",
    "raridade": "incomum",
    "weight": 20,
    "regiaoOrigem": ["floresta", "cemiterio"],
    "minNivel": 3,
    "historia": [
      "O ar úmido do pântano gruda em sua pele.",
      "Sons estranhos ecoam entre as árvores retorcidas."
    ],
    "cor": "azul",
    "efeito": { "tipo": "mudar_regiao", "regiao": "pantano" },
    "desbloqueia": ["jacare", "bruxa_pantano"]
  },
  {
    "id": "jacare",
    "emoji": "🐊",
    "nome": "Jacaré Gigante",
    "tipo": "inimigo",
    "raridade": "incomum",
    "weight": 32,
    "regiaoOrigem": ["pantano"],
    "minNivel": 3,
    "historia": [
      "O jacaré submerge novamente nas águas turvas, derrotado.",
      "Suas mandíbulas poderosas não bastaram desta vez."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 34,
      "ataqueInimigo": 9,
      "defesaInimigo": 4,
      "ouroDrop": [6, 14],
      "expDrop": 16
    }
  },
  {
    "id": "bruxa_pantano",
    "emoji": "🧙‍♀️",
    "nome": "Bruxa do Pântano",
    "tipo": "npc",
    "raridade": "rara",
    "weight": 10,
    "regiaoOrigem": ["pantano"],
    "minNivel": 4,
    "historia": [
      "A bruxa oferece uma poção em troca de um pequeno favor.",
      "Seus olhos verdes brilham enquanto prepara um feitiço para você."
    ],
    "cor": "roxo",
    "efeito": { "tipo": "item", "slot": "consumivel", "cura": 35, "nomeItem": "Poção da Bruxa" }
  },
  {
    "id": "deserto_dunas",
    "emoji": "🏜",
    "nome": "Dunas Intermináveis",
    "tipo": "local",
    "raridade": "incomum",
    "weight": 18,
    "regiaoOrigem": ["ruinas", "montanha"],
    "minNivel": 4,
    "historia": [
      "O calor do deserto castiga cada passo dado.",
      "Dunas se estendem até onde a vista alcança."
    ],
    "cor": "azul",
    "efeito": { "tipo": "mudar_regiao", "regiao": "deserto" },
    "desbloqueia": ["escorpiao", "mercador"]
  },
  {
    "id": "escorpiao",
    "emoji": "🦂",
    "nome": "Escorpião Gigante",
    "tipo": "inimigo",
    "raridade": "incomum",
    "weight": 30,
    "regiaoOrigem": ["deserto"],
    "minNivel": 4,
    "historia": [
      "O ferrão do escorpião se quebra contra sua defesa.",
      "Você derrota o escorpião antes que ele ataque de novo."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 30,
      "ataqueInimigo": 9,
      "defesaInimigo": 3,
      "ouroDrop": [7, 15],
      "expDrop": 15
    }
  },
  {
    "id": "castelo_portao",
    "emoji": "🏰",
    "nome": "Portões do Castelo",
    "tipo": "local",
    "raridade": "rara",
    "weight": 8,
    "regiaoOrigem": ["deserto", "montanha"],
    "minNivel": 8,
    "historia": [
      "Os portões colossais do castelo se abrem lentamente diante de você.",
      "Bandeiras esfarrapadas tremulam sobre as muralhas do castelo."
    ],
    "cor": "azul",
    "efeito": { "tipo": "mudar_regiao", "regiao": "castelo" },
    "desbloqueia": ["cavaleiro_negro", "espada_lendaria"]
  },
  {
    "id": "cavaleiro_negro",
    "emoji": "🖤",
    "nome": "Cavaleiro Negro",
    "tipo": "chefe",
    "raridade": "epica",
    "weight": 5,
    "regiaoOrigem": ["castelo"],
    "minNivel": 9,
    "historia": [
      "A armadura negra desaba com um estrondo metálico.",
      "O Cavaleiro Negro se ajoelha, finalmente vencido."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 95,
      "ataqueInimigo": 16,
      "defesaInimigo": 8,
      "ouroDrop": [40, 70],
      "expDrop": 60,
      "flagFinal": "rei"
    }
  },
  {
    "id": "goblin",
    "emoji": "👺",
    "nome": "Goblin Saqueador",
    "tipo": "inimigo",
    "raridade": "comum",
    "weight": 85,
    "regiaoOrigem": ["floresta", "ruinas", "caverna"],
    "minNivel": 1,
    "historia": [
      "Um goblin salta de trás de uma rocha balançando uma adaga enferrujada.",
      "Você surpreende um goblin ocupado demais contando moedas roubadas."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 15,
      "ataqueInimigo": 4,
      "defesaInimigo": 1,
      "ouroDrop": [3, 9],
      "expDrop": 6,
      "contadorTag": "goblinsDerrotados"
    },
    "desbloqueia": ["rei_goblin"]
  },
  {
    "id": "rei_goblin",
    "emoji": "👹👑",
    "nome": "Rei Goblin",
    "tipo": "chefe",
    "raridade": "epica",
    "weight": 5,
    "regiaoOrigem": ["ruinas", "caverna"],
    "minNivel": 3,
    "condicao": { "tag": "goblinsDerrotados", "minimo": 4 },
    "historia": [
      "O Rei Goblin levanta de seu trono de sucata, furioso com a ousadia da sua invasão.",
      "Com um grito estridente, o Rei ordena que você entregue todo o seu ouro. Você puxa a arma."
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 55,
      "ataqueInimigo": 10,
      "defesaInimigo": 4,
      "ouroDrop": [25, 40],
      "expDrop": 35,
      "itemGarantido": "coroa_sucata",
      "flagFinal": "flagelo_goblins"
    }
  },
  {
    "id": "coroa_sucata",
    "emoji": "👑",
    "nome": "Coroa de Sucata",
    "tipo": "item",
    "raridade": "epica",
    "weight": 10,
    "regiaoOrigem": ["caverna"],
    "minNivel": 3,
    "oculta": true,
    "historia": ["Uma coroa feia e torta, mas que emite uma leve magia de proteção."],
    "cor": "amarelo",
    "efeito": { "tipo": "item", "slot": "acessorio", "nomeItem": "Coroa de Sucata", "bonus": { "defesa": 3, "vidaMax": 10 } }
  },
  {
    "id": "morcego_vampiro",
    "emoji": "🦇",
    "nome": "Morcego Vampiro",
    "tipo": "inimigo",
    "raridade": "comum",
    "weight": 65,
    "regiaoOrigem": ["caverna", "cemiterio"],
    "minNivel": 2,
    "historia": [
      "Um chiado ecoa no escuro antes da criatura alada mergulhar em sua direção.",
      "O morcego tenta cravar as presas em seu pescoço!"
    ],
    "cor": "vermelho",
    "efeito": {
      "tipo": "combate",
      "vidaInimigo": 20,
      "ataqueInimigo": 7,
      "defesaInimigo": 1,
      "ouroDrop": [2, 6],
      "expDrop": 10
    }
  },
  {
    "id": "pocao_mana",
    "emoji": "🧪",
    "nome": "Poção Arcano",
    "tipo": "item",
    "raridade": "incomum",
    "weight": 35,
    "regiaoOrigem": ["ruinas", "aldeia", "templo"],
    "minNivel": 1,
    "historia": [
      "O líquido azul brilha fracamente, prometendo restaurar sua energia mágica."
    ],
    "cor": "amarelo",
    "efeito": { "tipo": "item", "slot": "consumivel", "cura": 0, "mana": 30, "nomeItem": "Poção Arcano" }
  },
  {
    "id": "seraphina_encontro",
    "emoji": "☀️",
    "nome": "Seraphina, a Curandeira",
    "tipo": "personagem",
    "raridade": "incomum",
    "weight": 32,
    "regiaoOrigem": ["aldeia", "templo"],
    "minNivel": 1,
    "historia": [
      "Seraphina termina de enfaixar o braço de um lenhador e se volta para você. 'A luz guia seus passos?'",
      "Você sente uma aura de paz imediata ao se aproximar da curandeira."
    ],
    "cor": "roxo",
    "efeito": { "tipo": "personagem", "personagemId": "seraphina", "relacao": 10, "exp": 8 },
    "desbloqueia": ["bencao_seraphina"]
  },
  {
    "id": "bencao_seraphina",
    "emoji": "✨",
    "nome": "Bênção da Luz",
    "tipo": "personagem",
    "raridade": "rara",
    "weight": 12,
    "regiaoOrigem": ["templo", "ruinas"],
    "minNivel": 3,
    "historia": [
      "Seraphina recita uma prece antiga. Suas feridas se fecham e seu espírito se fortalece."
    ],
    "cor": "roxo",
    "efeito": { "tipo": "personagem", "personagemId": "seraphina", "relacao": 15, "cura": 50 }
  }
],
  events: [
  {
    "id": "chuva",
    "emoji": "🌧",
    "nome": "Chuva",
    "descricao": "Mais plantas e criaturas da floresta aparecem.",
    "duracaoTurnos": 4,
    "chancePorTurno": 6,
    "modificadores": { "tipo": "floresta", "multiplicador": 1.6 }
  },
  {
    "id": "incendio",
    "emoji": "🔥",
    "nome": "Incêndio",
    "descricao": "Florestas ardem e escasseiam temporariamente.",
    "duracaoTurnos": 3,
    "chancePorTurno": 4,
    "modificadores": { "regiao": "floresta", "multiplicador": 0.4 }
  },
  {
    "id": "eclipse",
    "emoji": "🌑",
    "nome": "Eclipse",
    "descricao": "Mortos-vivos ficam mais fortes e frequentes.",
    "duracaoTurnos": 3,
    "chancePorTurno": 4,
    "modificadores": { "regiao": "cemiterio", "multiplicador": 2.0, "buffInimigoAtaque": 3 }
  },
  {
    "id": "cometa",
    "emoji": "🌠",
    "nome": "Cometa",
    "descricao": "Um cometa cruza o céu, cartas raras se tornam mais prováveis.",
    "duracaoTurnos": 2,
    "chancePorTurno": 3,
    "modificadores": { "raridade": ["rara", "epica", "lendaria", "mitica"], "multiplicador": 2.5 }
  },
  {
    "id": "festival",
    "emoji": "👑",
    "nome": "Festival",
    "descricao": "Mercadores e NPCs aparecem com maior frequência.",
    "duracaoTurnos": 4,
    "chancePorTurno": 5,
    "modificadores": { "tipo": "npc", "multiplicador": 2.0 }
  },
  {
    "id": "praga",
    "emoji": "☠",
    "nome": "Praga",
    "descricao": "Inimigos se tornam mais numerosos e perigosos.",
    "duracaoTurnos": 3,
    "chancePorTurno": 4,
    "modificadores": { "tipo": "inimigo", "multiplicador": 1.7, "buffInimigoAtaque": 2 }
  },
  {
    "id": "tempestade",
    "emoji": "⚡",
    "nome": "Tempestade",
    "descricao": "O caminho fica perigoso; locais raros surgem com mais frequência.",
    "duracaoTurnos": 3,
    "chancePorTurno": 4,
    "modificadores": { "tipo": "local", "multiplicador": 1.5 }
  },
  {
    "id": "lua_cheia",
    "emoji": "🌕",
    "nome": "Noite de Lua Cheia",
    "descricao": "A luz prateada enlouquece as feras. Criaturas noturnas ficam muito mais perigosas.",
    "duracaoTurnos": 3,
    "chancePorTurno": 4,
    "modificadores": { "tipo": "inimigo", "multiplicador": 1.5, "buffInimigoAtaque": 3, "buffInimigoVelocidade": 2 }
  },
  {
    "id": "bencao_divina",
    "emoji": "🕊️",
    "nome": "Graça Divina",
    "descricao": "Uma aura de paz desce sobre o mundo. Encontros amigáveis e curas são mais frequentes.",
    "duracaoTurnos": 4,
    "chancePorTurno": 3,
    "modificadores": { "tipo": "npc", "multiplicador": 2.5 }
  }
],
  endings: [
  {
    "id": "morto",
    "emoji": "💀",
    "titulo": "Morto",
    "condicao": "vida",
    "texto": "Sua jornada termina aqui. O herói cai, mas sua história será lembrada por aqueles que a ouvirem."
  },
  {
    "id": "cacador_de_dragoes",
    "emoji": "🐉",
    "titulo": "Caçador de Dragões",
    "condicao": "flag",
    "flag": "cacador_de_dragoes",
    "texto": "Você derrotou o dragão e seu nome ecoará pelas montanhas por gerações."
  },
  {
    "id": "senhor_das_trevas",
    "emoji": "🌑",
    "titulo": "Senhor das Trevas",
    "condicao": "flag",
    "flag": "senhor_das_trevas",
    "texto": "Ao derrotar o Rei Lich, você absorveu parte de seu poder sombrio. O mundo agora teme seu nome."
  },
  {
    "id": "rei",
    "emoji": "👑",
    "titulo": "Rei",
    "condicao": "flag",
    "flag": "rei",
    "texto": "Com o Cavaleiro Negro derrotado, o castelo se curva diante de você. Uma nova era começa."
  },
  {
    "id": "arquimago",
    "emoji": "🧙",
    "titulo": "Arquimago",
    "condicao": "classe_nivel",
    "classe": "mago",
    "nivelMinimo": 15,
    "texto": "Seu domínio das artes arcanas alcança um nível quase divino. Você se torna uma lenda viva."
  },
  {
    "id": "lenda",
    "emoji": "👻",
    "titulo": "Lenda",
    "condicao": "nivel_geral",
    "nivelMinimo": 20,
    "texto": "Sua jornada se torna lenda, contada por gerações ao redor de fogueiras em todo o reino."
  },
  {
    "id": "tirano",
    "emoji": "☠",
    "titulo": "Tirano",
    "condicao": "ouro",
    "ouroMinimo": 300,
    "texto": "A riqueza acumulada corrompeu seu coração. Você governa pelo medo, não pelo respeito."
  },
  {
    "id": "flagelo_goblins",
    "emoji": "👹",
    "titulo": "Flagelo dos Goblins",
    "condicao": "flag",
    "flag": "flagelo_goblins",
    "texto": "Ao derrotar o Rei Goblin, você desmantelou o império de sucata, trazendo paz definitiva às estradas da região."
  },
  {
    "id": "heroi_povo",
    "emoji": "🛡️",
    "titulo": "Defensor dos Humildes",
    "condicao": "nivel_geral",
    "nivelMinimo": 12,
    "texto": "Embora não tenha matado deuses ou dragões, você protegeu os mais fracos e sua lenda viverá nos corações do povo simples."
  }
]
};
