/* ============================================================
   CHRONICLES — engine.js
   Motor 100% data-driven. Todo conteúdo vem de /data/*.json.
   Este arquivo apenas interpreta os dados e aplica as regras.
   ============================================================ */

let DATA = { classes: [], cards: [], events: [], endings: [] };
let state = null;

const RARITY_ORDER = ["comum", "incomum", "rara", "epica", "lendaria", "mitica"];
const RARITY_LABEL = {
  comum: "Comum", incomum: "Incomum", rara: "Rara",
  epica: "Épica", lendaria: "Lendária", mitica: "Mítica",
};
const COR_CLASS = {
  verde: "c-verde", azul: "c-azul", vermelho: "c-vermelho",
  roxo: "c-roxo", amarelo: "c-amarelo", cinza: "c-cinza", laranja: "c-laranja",
};

const REGIAO_META = {
  aldeia: { emoji: "🏘", nome: "Aldeia" },
  floresta: { emoji: "🌲", nome: "Floresta" },
  montanha: { emoji: "⛰", nome: "Montanha" },
  ruinas: { emoji: "🏛", nome: "Ruínas" },
  caverna: { emoji: "🕳", nome: "Caverna" },
  pantano: { emoji: "🐊", nome: "Pântano" },
  deserto: { emoji: "🏜", nome: "Deserto" },
  templo: { emoji: "⛩", nome: "Templo" },
  cemiterio: { emoji: "⚰", nome: "Cemitério" },
  castelo: { emoji: "🏰", nome: "Castelo" },
  vulcao: { emoji: "🌋", nome: "Vulcão" },
  capital: { emoji: "🏙", nome: "Capital" },
  abismo: { emoji: "🕳", nome: "Abismo" },
};

// níveis de relacionamento com personagens, do mais hostil ao mais próximo
const REL_TIERS = [
  { min: -999, emoji: "🖤", label: "Medo" },
  { min: -40, emoji: "😡", label: "Ódio" },
  { min: -10, emoji: "⚔", label: "Rivalidade" },
  { min: 10, emoji: "🤝", label: "Neutro" },
  { min: 30, emoji: "👑", label: "Respeito" },
  { min: 60, emoji: "❤️", label: "Amizade" },
  { min: 90, emoji: "✨", label: "Admiração" },
];
function relTier(score) {
  let t = REL_TIERS[0];
  for (const tier of REL_TIERS) if (score >= tier.min) t = tier;
  return t;
}

// classes de ambiente aplicadas ao <body> conforme o evento global ativo —
// a interface deve refletir o estado do mundo, não só o texto
const WEATHER_CLASS = {
  chuva: "weather-chuva",
  incendio: "weather-incendio",
  eclipse: "weather-eclipse",
  cometa: "weather-cometa",
  festival: "weather-festival",
  praga: "weather-praga",
  tempestade: "weather-tempestade",
  neve: "weather-neve",
  corrupcao: "weather-corrupcao",
  lua_cheia: "weather-lua-cheia",
  bencao_divina: "weather-bencao-divina"
};

/* ---------------------- RNG com seed (mulberry32) ---------------------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rnd() { return state.rng(); }
function rndInt(min, max) { return Math.floor(rnd() * (max - min + 1)) + min; }
function pickRandom(arr) { return arr[Math.floor(rnd() * arr.length)]; }

// escolhe uma linha de história sem repetir até esgotar todas as variações
// disponíveis para aquela carta — evita que o Diário pareça repetitivo depois
// de algumas horas de jogo.
function pickStoryLine(card, poolOverride, poolKey) {
  const arr = poolOverride || card.historia;
  if (!arr || !arr.length) return "";
  if (arr.length === 1) return arr[0];
  if (!state.seenLines) state.seenLines = {};
  const key = poolKey || card.id;
  let seen = state.seenLines[key];
  if (!seen || seen.length >= arr.length) seen = state.seenLines[key] = [];
  let idx, guard = 0;
  do { idx = Math.floor(rnd() * arr.length); guard++; } while (seen.includes(idx) && guard < 20);
  seen.push(idx);
  return arr[idx];
}
function newSeed() { return Math.floor(rnd0() * 900000000) + 100000000; }
function rnd0() { return Math.random(); } // apenas para gerar a seed inicial, fora do RNG determinístico

/* ---------------------- carregamento de dados ----------------------
   O conteúdo do jogo vem do objeto global GAME_DATA, definido em
   data.js (carregado antes deste arquivo via <script> no index.html).
   Isso permite abrir o jogo com duplo-clique, sem servidor local.
   Se quiser voltar a carregar de arquivos JSON separados via fetch
   (útil ao editar /data enquanto roda por um servidor HTTP), troque
   esta função para usar fetch() novamente.
--------------------------------------------------------------------- */
async function loadData() {
  try {
    if (typeof GAME_DATA === "undefined") throw new Error("GAME_DATA não encontrado (data.js não carregou)");
    DATA = GAME_DATA;
    return true;
  } catch (err) {
    console.error("Falha ao carregar dados do jogo:", err);
    document.getElementById("app").innerHTML =
      '<div style="padding:40px;max-width:600px;margin:60px auto;text-align:center;">' +
      '<h2 style="color:#F87171;">Não foi possível carregar os dados do jogo.</h2>' +
      '<p style="color:#8a8a8a;font-size:0.85rem;line-height:1.6;">Verifique se o arquivo <code>data.js</code> está na mesma pasta que o <code>index.html</code> e se ele é carregado ' +
      "antes do <code>game.js</code> (confira a ordem dos &lt;script&gt; no HTML).</p></div>";
    return false;
  }
}

/* ============================================================
   ESTADO DO JOGO
   ============================================================ */
function novoEstado(classeId, seed) {
  const classe = DATA.classes.find((c) => c.id === classeId);
  return {
    seed,
    rng: mulberry32(seed),
    turno: 0,
    gameOver: false,
    regiao: "aldeia",
    hero: {
      nome: classe.nome,
      classeId: classe.id,
      emoji: classe.emoji,
      nivel: 1,
      exp: 0,
      expProxNivel: 20,
      vida: classe.vidaMax,
      vidaMax: classe.vidaMax,
      mana: classe.manaMax,
      manaMax: classe.manaMax,
      ataqueBase: classe.ataque,
      defesaBase: classe.defesa,
      velocidadeBase: classe.velocidade,
      ouro: classe.ouroInicial,
      equipamentos: { arma: null, armadura: null, acessorio: null },
      inventario: [],
      conquistas: [],
      escolas: [],
    },
    tags: {},
    itensObtidos: new Set(),
    derrotados: new Set(),
    descobertos: new Set(),
    regioesVisitadas: new Set(["aldeia"]),
    recentDrawn: [],
    lastDrawnTurno: {}, // cardId -> turno em que foi sorteada pela última vez
    vezesVista: {}, // cardId -> quantas vezes já apareceu (nunca reseta)
    availableCardIds: new Set(DATA.cards.filter((c) => c.inicial).map((c) => c.id)),
    tree: [],
    story: [],
    capituloAtual: 0,
    personagens: {}, // charId -> { relacao, memorias, tierBonusApplied, lastSeenTurno, saudade }
    activeEvent: null,
    activeEventTurnsLeft: 0,
    currentCards: [],
    seenLines: {},
    faseAnunciada: 1,
  };
}

function heroStat(base) {
  const h = state.hero;
  let bonus = 0;
  Object.values(h.equipamentos).forEach((it) => {
    if (it && it.bonus && it.bonus[base] != null) bonus += it.bonus[base];
  });
  return bonus;
}
function getAtaque() { return state.hero.ataqueBase + heroStat("ataque"); }
function getDefesa() { return state.hero.defesaBase + heroStat("defesa"); }
function getVelocidade() { return state.hero.velocidadeBase + heroStat("velocidade"); }
function getVidaMax() { return state.hero.vidaMax + heroStat("vidaMax"); }
function getManaMax() { return state.hero.manaMax + heroStat("mana"); }

/* ============================================================
   GAME DIRECTOR — seleção procedural de cartas
   ============================================================ */
function rarityMultiplier(nivel, raridade) {
  const tiers = { comum: 0, incomum: 3, rara: 6, epica: 10, lendaria: 16, mitica: 22 };
  const req = tiers[raridade] || 0;
  if (nivel < req - 3) return 0.05;
  const ramp = Math.min(1, (nivel - req + 3) / 7);
  return 0.25 + 0.75 * Math.max(0, ramp);
}

/* ============================================================
   FASES DA CAMPANHA
   Ritmo dividido em fases. Cada fase libera cartas próprias
   (faseMin/faseMax) e aumenta a exigência estratégica — nas fases
   finais, erros custam muito mais.
   ============================================================ */
const FASES = [
  { numero: 1, nome: "O Início da Jornada", turnoMin: 0, dificuldade: 1 },
  { numero: 2, nome: "O Mundo se Complica", turnoMin: 14, dificuldade: 1.15 },
  { numero: 3, nome: "O Peso do Destino", turnoMin: 32, dificuldade: 1.3 },
  { numero: 4, nome: "A Hora Final", turnoMin: 55, dificuldade: 1.5 },
];
function currentFase() {
  let f = FASES[0];
  for (const fase of FASES) if (state.turno >= fase.turnoMin) f = fase;
  return f;
}
function checkFaseTransition() {
  const fase = currentFase();
  if (state.faseAnunciada !== fase.numero) {
    state.faseAnunciada = fase.numero;
    if (fase.numero > 1) {
      addStory(`📜 ${fase.nome} — o mundo se torna mais perigoso e as escolhas pesam mais.`, "roxo");
      state.tree.push({ emoji: "🕯", nome: `Fase ${fase.numero}: ${fase.nome}`, tipo: "fase" });
    }
  }
}

function cardIsValid(card) {
  if (card.oculta) return false;
  if (!state.availableCardIds.has(card.id)) return false;
  if (card.minNivel && state.hero.nivel < card.minNivel) return false;
  if (card.regiaoOrigem && !card.regiaoOrigem.includes(state.regiao)) return false;
  if (card.tipo === "chefe" && state.derrotados.has(card.id)) return false;
  if (card.tipo === "artefato" && state.itensObtidos.has(card.id)) return false;
  const fase = currentFase().numero;
  if (card.faseMin && fase < card.faseMin) return false;
  if (card.faseMax && fase > card.faseMax) return false;
  if (card.condicao) {
    if (card.condicao.tag && (state.tags[card.condicao.tag] || 0) < card.condicao.minimo) return false;
    if (card.condicao.itemRequerido && !state.itensObtidos.has(card.condicao.itemRequerido)) return false;
    if (card.condicao.classe && state.hero.classeId !== card.condicao.classe) return false;
    if (card.condicao.tagAusente && state.tags[card.condicao.tagAusente]) return false;
  }
  return true;
}

function computeWeight(card) {
  // comprime a faixa de pesos-base (raiz quadrada) — sem isso, uma carta
  // comum com weight 60 domina completamente uma rara com weight 10, e o
  // sorteio vira sempre as mesmas 4-5 cartas. Comprimir a faixa mantém a
  // hierarquia comum > incomum > rara, mas sem esmagar a variedade.
  let w = Math.sqrt(Math.max(0.001, card.weight || 1)) * 3;

  w *= rarityMultiplier(state.hero.nivel, card.raridade);

  // anti-repetição: penalidade suave baseada em quantos turnos se passaram
  // desde a última vez que a carta apareceu, com recuperação total ao
  // longo de ~10 turnos. Isso evita tanto repetição imediata (a mesma
  // carta nas 3 opções logo depois de já ter aparecido) quanto o padrão
  // anterior de "sempre as mesmas 4-5 cartas" em pools pequenos.
  const lastSeen = state.lastDrawnTurno[card.id];
  if (lastSeen != null) {
    const gap = state.turno - lastSeen;
    const cooldown = 14;
    const ratio = Math.min(1, gap / cooldown);
    const penalty = gap >= cooldown ? 1 : 0.015 + 0.9 * ratio * ratio * ratio;
    w *= penalty;
  }

  // incentivo à descoberta: cartas nunca vistas se destacam bastante;
  // cartas vistas poucas vezes ainda recebem um empurrão menor. O bônus
  // desaparece gradualmente em vez de cair a zero de uma vez.
  const vistas = state.vezesVista[card.id] || 0;
  if (vistas === 0) w *= 1.8;
  else if (vistas < 3) w *= 1.25;

  // evento global ativo
  if (state.activeEvent) {
    const mod = state.activeEvent.modificadores;
    if (mod.tipo && mod.tipo === card.tipo) w *= mod.multiplicador;
    if (mod.regiao && card.regiaoOrigem && card.regiaoOrigem.includes(mod.regiao)) w *= mod.multiplicador;
    if (mod.raridade && mod.raridade.includes(card.raridade)) w *= mod.multiplicador;
  }

  // sinergia de build: cartas que reforçam um caminho que o jogador já vem
  // escolhendo aparecem com mais frequência.
  if (card.sinergiaTag) {
    card.sinergiaTag.forEach((t) => { if (state.tags[t]) w *= 1.55; });
  }

  // um personagem que o jogador não vê há muitos turnos volta a aparecer
  // com mais frequência — reforça o sistema de saudade/vínculo.
  if (card.efeito && card.efeito.personagemId) {
    const rel = state.personagens[card.efeito.personagemId];
    if (rel && rel.lastSeenTurno != null) {
      const gap = state.turno - rel.lastSeenTurno;
      if (gap > 8) w *= 1.4;
      if (gap > 16) w *= 1.4;
    }
  }

  return Math.max(0.001, w);
}

function drawThreeCards() {
  const pool = DATA.cards.filter(cardIsValid);

  // tenta primeiro excluir por completo as cartas vistas nos últimos 2
  // turnos; se a região não tiver cartas suficientes para isso, relaxa
  // para excluir só o turno anterior; se ainda assim não bastar, usa o
  // pool inteiro (a penalidade de peso continua se aplicando nesse caso).
  function freshSince(turnsBack) {
    return pool.filter((c) => {
      const last = state.lastDrawnTurno[c.id];
      return last == null || state.turno - last > turnsBack;
    });
  }
  let sourcePool = freshSince(2);
  if (sourcePool.length < 3) sourcePool = freshSince(1);
  if (sourcePool.length < 3) sourcePool = pool;

  const chosen = [];
  const workingPool = sourcePool.map((c) => ({ card: c, w: computeWeight(c) }));

  for (let i = 0; i < 3 && workingPool.length > 0; i++) {
    const total = workingPool.reduce((s, e) => s + e.w, 0);
    let r = rnd() * total;
    let idx = 0;
    for (; idx < workingPool.length; idx++) {
      r -= workingPool[idx].w;
      if (r <= 0) break;
    }
    idx = Math.min(idx, workingPool.length - 1);
    chosen.push(workingPool[idx].card);
    workingPool.splice(idx, 1);
  }

  // fallback: se não houver cartas suficientes no contexto atual, permite cartas de
  // local de qualquer região — mas ainda respeitando peso/anti-repetição, para não
  // sempre cair na mesma primeira carta "local" da lista.
  while (chosen.length < 3) {
    const fallbackPool = DATA.cards
      .filter((c) => c.tipo === "local" && state.availableCardIds.has(c.id) && !chosen.includes(c))
      .map((c) => ({ card: c, w: computeWeight(c) }));
    if (!fallbackPool.length) break;
    const total = fallbackPool.reduce((s, e) => s + e.w, 0);
    let r = rnd() * total;
    let idx = 0;
    for (; idx < fallbackPool.length; idx++) {
      r -= fallbackPool[idx].w;
      if (r <= 0) break;
    }
    idx = Math.min(idx, fallbackPool.length - 1);
    chosen.push(fallbackPool[idx].card);
  }

  state.currentCards = chosen;
  chosen.forEach((c) => {
    state.lastDrawnTurno[c.id] = state.turno;
    state.vezesVista[c.id] = (state.vezesVista[c.id] || 0) + 1;
    state.descobertos.add(c.id);
  });
}

/* ============================================================
   EVENTOS GLOBAIS
   ============================================================ */
function tickGlobalEvent() {
  if (state.activeEvent) {
    state.activeEventTurnsLeft--;
    if (state.activeEventTurnsLeft <= 0) {
      addStory(`O efeito de ${state.activeEvent.nome} se dissipa.`, "cinza");
      state.activeEvent = null;
    }
    return;
  }
  for (const ev of DATA.events) {
    if (rndInt(1, 100) <= ev.chancePorTurno) {
      state.activeEvent = ev;
      state.activeEventTurnsLeft = ev.duracaoTurnos;
      addStory(`${ev.emoji} ${ev.nome} — ${ev.descricao}`, "roxo");
      break;
    }
  }
}

/* ============================================================
   RESOLUÇÃO DE EFEITOS
   ============================================================ */
function addStory(texto, cor) {
  state.story.push({ tipo: "linha", texto, cor });
}

// vira um capítulo do Diário sempre que o herói muda de região
function addChapter(regiao) {
  state.capituloAtual++;
  const meta = REGIAO_META[regiao] || { emoji: "🌍", nome: regiao };
  state.story.push({ tipo: "capitulo", numero: state.capituloAtual, regiao, meta });
}

// realça números e palavras-chave da narrativa (+ouro, -vida, ⭐ etc.)
// para o diário parecer escrito, não um log cru
function enhanceStoryText(texto) {
  return texto
    .replace(/\(([^)]*[+\-]\d[^)]*)\)/g, '<span class="story-meta">$1</span>')
    .replace(/(\+\d+\s?(ouro|exp|vida|ataque|defesa|veloc\.?|mana))/gi, '<b class="story-pos">$1</b>')
    .replace(/(-\d+\s?(ouro|exp|vida|ataque|defesa|veloc\.?|mana))/gi, '<b class="story-neg">$1</b>')
    .replace(/(💥[^.!?]*[.!?])/g, '<b class="story-highlight-crit">$1</b>')
    .replace(/(⭐[^.!?]*[.!?])/g, '<b class="story-highlight">$1</b>')
    .replace(/(💀[^.!?]*[.!?])/g, '<b class="story-highlight-dark">$1</b>');
}

/* ============================================================
   PERSONAGENS — relacionamento e memória
   ============================================================ */
// tema de afinidade de cada personagem e recompensa passiva concedida ao
// avançar de nível de vínculo — assim a relação vira parte real do build,
// não só um texto de sabor. "saudade" ativa o acúmulo de sabedoria/exp
// quando o jogador passa muitos turnos sem visitar o personagem.
const PERSONAGEM_AFINIDADE = {
  eldrin: { tema: "sabedoria arcana", statPorTier: { manaMax: 4 }, saudade: true },
  kael: { tema: "força e coragem", statPorTier: { ataque: 1 } },
  lyra: { tema: "instinto selvagem", statPorTier: { velocidade: 1 } },
  seraphina: { tema: "fé e cuidado", statPorTier: { vidaMax: 6 } },
  grimm: { tema: "instinto sombrio", statPorTier: { defesa: 1 } },
};

function getRelacao(charId) {
  if (!state.personagens[charId]) {
    state.personagens[charId] = { relacao: 0, memorias: [], lastSeenTurno: null };
  }
  return state.personagens[charId];
}

function ajustarRelacao(charId, delta, motivo) {
  const rel = getRelacao(charId);
  const antes = relTier(rel.relacao);
  rel.relacao += delta;
  if (motivo) rel.memorias = [motivo, ...rel.memorias].slice(0, 12);
  const depois = relTier(rel.relacao);
  if (depois.label !== antes.label) {
    const personagem = DATA.characters && DATA.characters.find((p) => p.id === charId);
    const nome = personagem ? personagem.nome : charId;
    addStory(`${depois.emoji} Seu vínculo com ${nome} agora é: ${depois.label}.`, "roxo");

    // recompensa permanente só quando o vínculo AVANÇA (nunca ao regredir),
    // e a partir de "Respeito" em diante — vínculos fracos não geram build.
    const idxAntes = REL_TIERS.indexOf(antes);
    const idxDepois = REL_TIERS.indexOf(depois);
    const afin = PERSONAGEM_AFINIDADE[charId];
    if (afin && afin.statPorTier && idxDepois > idxAntes && idxDepois >= 4) {
      applyStatDelta(afin.statPorTier, `${nome} reconhece seu vínculo de ${afin.tema}`);
    }
  }
}

// registra um encontro com o personagem. Se ele tem "saudade" (ex: Eldrin) e
// o jogador ficou muitos turnos sem visitá-lo, entrega um bônus de exp
// proporcional ao tempo afastado — o personagem "aprendeu sozinho" enquanto
// esperava, e passa isso adiante no reencontro.
function registrarEncontro(charId) {
  const rel = getRelacao(charId);
  const afin = PERSONAGEM_AFINIDADE[charId];
  if (afin && afin.saudade && rel.lastSeenTurno != null) {
    const gap = state.turno - rel.lastSeenTurno;
    if (gap >= 6) {
      const bonus = Math.min(60, gap * 2);
      ganharExp(bonus);
      const personagem = DATA.characters.find((p) => p.id === charId);
      addStory(
        `${personagem.emoji} "Enquanto esteve fora, refleti muito sobre o que vivemos", diz ${personagem.nome}. (+${bonus} exp de sabedoria acumulada)`,
        "roxo"
      );
    }
  }
  rel.lastSeenTurno = state.turno;
}

function resolverPersonagem(card) {
  const ef = card.efeito;
  const personagem = DATA.characters && DATA.characters.find((p) => p.id === ef.personagemId);
  const nomeExibicao = personagem ? `${personagem.emoji} ${personagem.nome}` : card.nome;

  addStory(`${nomeExibicao} — ${pickStoryLine(card)}`, card.cor);

  if (ef.relacao) ajustarRelacao(ef.personagemId, ef.relacao, pickStoryLine(card));
  else getRelacao(ef.personagemId); // garante que o personagem passe a ser "conhecido"
  registrarEncontro(ef.personagemId);

  if (ef.ouro) {
    const g = rndInt(ef.ouro[0], ef.ouro[1]);
    state.hero.ouro += g;
    addStory(`(+${g} ouro)`, "amarelo");
  }
  if (ef.exp) ganharExp(ef.exp);
  if (ef.cura) curar(ef.cura);
  if (ef.itemGarantido) {
    const itemCard = DATA.cards.find((c) => c.id === ef.itemGarantido);
    if (itemCard) obterItem(itemCard);
  }
}

function addTreeNode(card, alternativas) {
  // as cartas oferecidas mas não escolhidas viram "ramos" pendurados no nó
  // anterior — o ponto exato onde o caminho se dividiu. Isso faz a árvore
  // crescer de verdade (lateralmente), não só numa lista vertical.
  const parent = state.tree[state.tree.length - 1];
  if (parent && alternativas && alternativas.length) {
    parent.ramos = alternativas.map((c) => ({
      emoji: c.emoji,
      nome: c.nome,
      tipo: c.tipo,
      raridade: c.raridade,
      dica: (c.historia && c.historia[0]) || "",
    }));
  }
  state.tree.push({ emoji: card.emoji, nome: card.nome, tipo: card.tipo, ramos: [] });
}

function ganharExp(qtd) {
  state.hero.exp += qtd;
  while (state.hero.exp >= state.hero.expProxNivel) {
    state.hero.exp -= state.hero.expProxNivel;
    state.hero.nivel++;
    state.hero.expProxNivel = Math.round(20 + (state.hero.nivel - 1) * 15);
    state.hero.vidaMax += 10;
    state.hero.ataqueBase += 1;
    state.hero.defesaBase += 1;
    state.hero.manaMax += 5;
    state.hero.vida = Math.min(getVidaMax(), state.hero.vida + 15);
    addStory(`⭐ Você subiu para o nível ${state.hero.nivel}!`, "amarelo");
  }
}

function curar(qtd) {
  const antes = state.hero.vida;
  state.hero.vida = Math.min(getVidaMax(), state.hero.vida + qtd);
  const ganho = state.hero.vida - antes;
  if (ganho > 0) {
    spawnFloatingText(`+${ganho} vida`, "dmg-heal");
    flashHeroPanel("heal");
  }
}

// aplica um "build" permanente ao herói vindo de uma escolha, vínculo ou
// recompensa — é assim que decisões e relações passam a moldar o
// personagem de verdade, não só o inventário.
function applyStatDelta(delta, motivoPrefix) {
  if (!delta) return;
  const h = state.hero;
  const partes = [];
  if (delta.ataque) { h.ataqueBase += delta.ataque; partes.push(`${delta.ataque > 0 ? "+" : ""}${delta.ataque} ataque`); }
  if (delta.defesa) { h.defesaBase += delta.defesa; partes.push(`${delta.defesa > 0 ? "+" : ""}${delta.defesa} defesa`); }
  if (delta.velocidade) { h.velocidadeBase += delta.velocidade; partes.push(`${delta.velocidade > 0 ? "+" : ""}${delta.velocidade} veloc.`); }
  if (delta.vidaMax) { h.vidaMax += delta.vidaMax; h.vida = Math.max(0, h.vida + Math.max(0, delta.vidaMax)); partes.push(`${delta.vidaMax > 0 ? "+" : ""}${delta.vidaMax} vida máx.`); }
  if (delta.manaMax) { h.manaMax += delta.manaMax; partes.push(`${delta.manaMax > 0 ? "+" : ""}${delta.manaMax} mana máx.`); }
  if (partes.length) {
    const prefixo = motivoPrefix || "Sua jornada te molda";
    addStory(`${prefixo}: ${partes.join(", ")}.`, "roxo");
  }
}

function obterItem(card, bonusOverride, nomeOverride) {
  const nome = nomeOverride || card.efeito.nomeItem || card.nome;
  const bonus = bonusOverride || card.efeito.bonus || {};
  const slot = card.efeito.slot;

  state.itensObtidos.add(card.id);

  if (slot === "consumivel") {
    curar(card.efeito.cura || 0);
    addStory(`Você usou ${nome} e recuperou vitalidade.`, "amarelo");
    return;
  }

  const item = { id: card.id, nome, bonus, slot };
  state.hero.equipamentos[slot] = item;
  addStory(`Você equipou ${nome}.`, "amarelo");
}

function resolverCombate(card) {
  const ef = card.efeito;
  const dificuldade = currentFase().dificuldade;
  let vidaInimigo = Math.round(ef.vidaInimigo * dificuldade);
  let ataqueInimigo = Math.round(ef.ataqueInimigo * (1 + (dificuldade - 1) * 0.6));
  const defesaInimigo = ef.defesaInimigo;
  const vidaInimigoMax = vidaInimigo;

  if (state.activeEvent && state.activeEvent.modificadores.buffInimigoAtaque) {
    const mod = state.activeEvent.modificadores;
    if ((mod.regiao && card.regiaoOrigem.includes(mod.regiao)) || (mod.tipo && mod.tipo === card.tipo)) {
      ataqueInimigo += mod.buffInimigoAtaque;
    }
  }

  // chance de crítico escala com velocidade — um build rápido literalmente
  // acerta mais forte, com mais frequência, e isso precisa ser visível.
  const critChance = Math.min(0.45, 0.08 + getVelocidade() * 0.012);

  let rounds = 0;
  let dmgTotalCausado = 0;
  let dmgTotalSofrido = 0;
  let maiorGolpeSofrido = 0;
  let maiorGolpeDado = 0;
  let criticos = 0;
  while (vidaInimigo > 0 && state.hero.vida > 0 && rounds < 60) {
    rounds++;
    const sorteHeroi = rndInt(-2, 3);
    const isCrit = rnd() < critChance;
    let dmgHeroi = Math.max(1, getAtaque() - defesaInimigo + sorteHeroi);
    if (isCrit) { dmgHeroi = Math.round(dmgHeroi * 1.7); criticos++; }
    vidaInimigo -= dmgHeroi;
    dmgTotalCausado += dmgHeroi;
    if (dmgHeroi > maiorGolpeDado) maiorGolpeDado = dmgHeroi;
    if (vidaInimigo <= 0) break;

    const sorteInimigo = rndInt(-2, 2);
    const dmgInimigo = Math.max(1, ataqueInimigo - getDefesa() + sorteInimigo);
    state.hero.vida -= dmgInimigo;
    dmgTotalSofrido += dmgInimigo;
    if (dmgInimigo > maiorGolpeSofrido) maiorGolpeSofrido = dmgInimigo;
  }

  // feedback visual do combate — precisa ficar claro e imediato, não apenas
  // escrito em prosa no diário. Golpes grandes tremem a tela.
  const vidaMaxHero = getVidaMax();
  if (criticos > 0) {
    spawnFloatingText(`💥 ${criticos}x CRÍTICO! -${maiorGolpeDado}`, "dmg-crit");
  }
  if (dmgTotalSofrido > 0) {
    spawnFloatingText(`-${dmgTotalSofrido} vida`, "dmg-neg");
    flashHeroPanel("hit");
  }
  if (maiorGolpeSofrido >= Math.max(6, vidaMaxHero * 0.16) || card.tipo === "chefe") {
    shakeScreen(card.tipo === "chefe" ? "strong" : "normal");
  }

  if (state.hero.vida <= 0) {
    state.hero.vida = 0;
    addStory(`💀 Você foi derrotado por ${card.nome}.`, "vermelho");
    spawnFloatingText("💀 DERROTA", "dmg-fatal");
    return;
  }

  const ouro = rndInt(ef.ouroDrop[0], ef.ouroDrop[1]);
  state.hero.ouro += ouro;
  ganharExp(ef.expDrop);

  // mostra ao jogador o quanto seu equipamento e build pesaram na vitória —
  // decisões de build precisam ser sentidas, não só numéricas nos bastidores.
  const bonusEquip = heroStat("ataque");
  let sufixoBuild = "";
  if (bonusEquip >= 3) sufixoBuild = ` Seu equipamento sozinho contribuiu com +${bonusEquip} de ataque no combate.`;
  else if (criticos >= 2) sufixoBuild = ` Sua velocidade garantiu ${criticos} acertos críticos.`;

  addStory(`${pickStoryLine(card)} (+${ouro} ouro, +${ef.expDrop} exp)${sufixoBuild}`, card.cor);
  spawnFloatingText(`${Math.max(0, Math.round(vidaInimigoMax))} dano total causado`, "dmg-pos");

  if (ef.contadorTag) state.tags[ef.contadorTag] = (state.tags[ef.contadorTag] || 0) + 1;
  if (card.tipo === "chefe") state.derrotados.add(card.id);

  if (ef.itemGarantido) {
    const itemCard = DATA.cards.find((c) => c.id === ef.itemGarantido);
    if (itemCard) obterItem(itemCard);
  }
  if (ef.flagFinal) state.tags["flag_" + ef.flagFinal] = true;
}

// texto flutuante de dano/cura sobre o painel do herói — o combate precisa
// ser lido de relance, não apenas descrito em prosa no diário.
function spawnFloatingText(text, cls) {
  const host = document.getElementById("heroPanel");
  if (!host) return;
  const el = document.createElement("div");
  el.className = `floating-dmg ${cls}`;
  el.textContent = text;
  el.style.left = `${40 + rnd0() * 20}%`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function flashHeroPanel(kind) {
  const host = document.getElementById("heroPanel");
  if (!host) return;
  host.classList.remove("flash-hit", "flash-heal");
  void host.offsetWidth; // força reflow para permitir reativar a animação
  host.classList.add(kind === "hit" ? "flash-hit" : "flash-heal");
  setTimeout(() => host.classList.remove("flash-hit", "flash-heal"), 500);
}

function shakeScreen(intensity) {
  const app = document.getElementById("app");
  if (!app) return;
  app.classList.remove("screen-shake", "screen-shake-strong");
  void app.offsetWidth;
  app.classList.add(intensity === "strong" ? "screen-shake-strong" : "screen-shake");
  setTimeout(() => app.classList.remove("screen-shake", "screen-shake-strong"), 450);
}

function resolverMisterio(card) {
  const total = card.efeito.resultados.reduce((s, r) => s + r.chance, 0);
  let r = rnd() * total;
  let escolhido = card.efeito.resultados[0];
  for (const res of card.efeito.resultados) {
    r -= res.chance;
    if (r <= 0) { escolhido = res; break; }
  }
  if (escolhido.sub === "recompensa_leve") {
    const ouro = rndInt(escolhido.ouro[0], escolhido.ouro[1]);
    state.hero.ouro += ouro;
    if (escolhido.exp) ganharExp(escolhido.exp);
    addStory(`${pickStoryLine(card)} (+${ouro} ouro)`, card.cor);
  } else if (escolhido.sub === "item") {
    obterItem(card, escolhido.bonus, escolhido.nomeItem);
    addStory(pickStoryLine(card), card.cor);
  } else if (escolhido.sub === "dano") {
    state.hero.vida = Math.max(0, state.hero.vida - escolhido.vida);
    addStory(`${pickStoryLine(card)} (-${escolhido.vida} vida)`, "vermelho");
  }
}

// resolve uma opção escolhida dentro de uma carta de "escolha" (diálogo ou
// gameplay). A opção usa os mesmos campos que os outros efeitos (ouro, exp,
// cura, dano, statDelta, relacao, tag, itemGarantido, flagFinal, desbloqueia).
function resolveEscolha(card, opcao) {
  const texto = pickStoryLine(card, opcao.historia, card.id + ":" + opcao.id);
  addStory(texto, opcao.cor || card.cor);

  if (opcao.ouro) {
    const [min, max] = opcao.ouro;
    const g = rndInt(min, max);
    state.hero.ouro += g;
    addStory(`(${g >= 0 ? "+" : ""}${g} ouro)`, "amarelo");
  }
  if (opcao.exp) ganharExp(opcao.exp);
  if (opcao.cura) curar(opcao.cura);
  if (opcao.dano) {
    state.hero.vida = Math.max(0, state.hero.vida - opcao.dano);
    spawnFloatingText(`-${opcao.dano} vida`, "dmg-neg");
    flashHeroPanel("hit");
    if (opcao.dano >= 10) shakeScreen("normal");
  }
  if (opcao.statDelta) applyStatDelta(opcao.statDelta);
  if (opcao.relacao && opcao.personagemId) {
    ajustarRelacao(opcao.personagemId, opcao.relacao, texto);
    registrarEncontro(opcao.personagemId);
  }
  if (opcao.tag) state.tags[opcao.tag] = (state.tags[opcao.tag] || 0) + 1;
  if (opcao.itemGarantido) {
    const itemCard = DATA.cards.find((c) => c.id === opcao.itemGarantido);
    if (itemCard) obterItem(itemCard);
  }
  if (opcao.flagFinal) state.tags["flag_" + opcao.flagFinal] = true;
  if (opcao.desbloqueia) opcao.desbloqueia.forEach((id) => state.availableCardIds.add(id));

  if (state.hero.vida <= 0) {
    state.hero.vida = 0;
    addStory(`💀 O peso dessa escolha foi fatal.`, "vermelho");
  }
}

// Escolas de magia: compromisso permanente assumido uma única vez. Concede
// um bônus fixo ao herói e marca a tag "escola_<id>", que outras cartas
// (armas/relíquias exclusivas) podem exigir via condicao.tag.
function resolverEscola(card) {
  const ef = card.efeito;
  const tagId = "escola_" + ef.escolaId;
  if (state.tags[tagId]) {
    addStory(`Você já pertence à ${card.nome}.`, card.cor);
    return;
  }
  state.tags[tagId] = 1;
  state.hero.escolas.push({ id: ef.escolaId, nome: card.nome, emoji: card.emoji });

  const b = ef.bonus || {};
  if (b.ataque) state.hero.ataqueBase += b.ataque;
  if (b.defesa) state.hero.defesaBase += b.defesa;
  if (b.velocidade) state.hero.velocidadeBase += b.velocidade;
  if (b.vidaMax) { state.hero.vidaMax += b.vidaMax; state.hero.vida += b.vidaMax; }
  if (b.mana) { state.hero.manaMax += b.mana; state.hero.mana += b.mana; }

  addStory(pickStoryLine(card), card.cor);
}

function resolveCard(card, alternativas, escolhaOpcao) {
  addTreeNode(card, alternativas);
  const ef = card.efeito;

  switch (ef.tipo) {
    case "escolha":
      resolveEscolha(card, escolhaOpcao);
      break;
    case "mudar_regiao":
      state.regiao = ef.regiao;
      state.regioesVisitadas.add(ef.regiao);
      addChapter(ef.regiao);
      addStory(pickStoryLine(card), card.cor);
      break;
    case "combate":
      resolverCombate(card);
      break;
    case "personagem":
      resolverPersonagem(card);
      break;
    case "item":
      if (ef.custoOuro) {
        if (state.hero.ouro < ef.custoOuro) {
          addStory(`Você não tem ouro suficiente para ${card.nome} (${ef.custoOuro}💰).`, "cinza");
          break;
        }
        state.hero.ouro -= ef.custoOuro;
      }
      obterItem(card);
      addStory(pickStoryLine(card), card.cor);
      break;
    case "npc":
      if (ef.ouro) {
        const g = rndInt(ef.ouro[0], ef.ouro[1]);
        state.hero.ouro += g;
        addStory(`${pickStoryLine(card)} (+${g} ouro)`, card.cor);
      } else {
        addStory(pickStoryLine(card), card.cor);
      }
      if (ef.expChance && rndInt(1, 100) <= 50) ganharExp(ef.expChance);
      break;
    case "recompensa_leve":
      if (ef.ouro) state.hero.ouro += rndInt(ef.ouro[0], ef.ouro[1]);
      if (ef.exp) ganharExp(ef.exp);
      if (ef.cura) curar(ef.cura);
      addStory(pickStoryLine(card), card.cor);
      break;
    case "misterio":
      resolverMisterio(card);
      break;
    case "escola":
      resolverEscola(card);
      break;
    default:
      addStory(pickStoryLine(card), card.cor);
  }

  if (card.desbloqueia) {
    card.desbloqueia.forEach((id) => state.availableCardIds.add(id));
  }
}

/* ============================================================
   FINAIS
   ============================================================ */
function checkEndings() {
  if (state.hero.vida <= 0) return DATA.endings.find((e) => e.id === "morto");

  for (const end of DATA.endings) {
    if (end.condicao === "flag" && state.tags["flag_" + end.flag]) return end;
    if (end.condicao === "classe_nivel" && state.hero.classeId === end.classe && state.hero.nivel >= end.nivelMinimo) return end;
    if (end.condicao === "nivel_geral" && state.hero.nivel >= end.nivelMinimo) return end;
    if (end.condicao === "ouro" && state.hero.ouro >= end.ouroMinimo) return end;
  }
  return null;
}

/* ============================================================
   AÇÕES DO JOGADOR
   ============================================================ */
function onCardClick(cardId) {
  if (state.gameOver) return;
  const card = state.currentCards.find((c) => c.id === cardId);
  if (!card) return;
  const alternativas = state.currentCards.filter((c) => c.id !== cardId);

  if (card.efeito.tipo === "escolha") {
    showChoiceModal(card, alternativas);
    return;
  }

  advanceTurn(card, alternativas);
}

// dispara a animação de saída da carta e resolve o turno. Compartilhado
// entre cliques diretos e escolhas feitas dentro do modal de diálogo.
function advanceTurn(card, alternativas, escolhaOpcao) {
  document.querySelectorAll(".game-card").forEach((el) => {
    if (el.dataset.id !== card.id) el.style.pointerEvents = "none";
  });
  const clickedEl = document.querySelector(`.game-card[data-id="${card.id}"]`);
  if (clickedEl) {
    clickedEl.classList.add("leaving");
    spawnCardBurst(clickedEl, card.cor);
  }

  setTimeout(() => {
    state.turno++;
    checkFaseTransition();
    resolveCard(card, alternativas, escolhaOpcao);
    tickGlobalEvent();

    const ending = checkEndings();
    if (ending) {
      state.gameOver = true;
      renderAll();
      showEndingModal(ending);
      return;
    }

    drawThreeCards();
    renderAll();
  }, 220);
}

// modal de escolha — usado tanto para diálogos com personagens quanto para
// decisões de gameplay (arriscar vs jogar seguro). Cada opção mostra
// claramente o que está em jogo antes do jogador confirmar.
function showChoiceModal(card, alternativas) {
  const root = document.getElementById("modalRoot");
  const opcoes = card.efeito.opcoes || [];
  root.innerHTML = `
    <div class="modal-overlay" id="choiceOverlay">
      <div class="modal-box choice-box">
        <div class="choice-header">
          <span class="choice-emoji">${card.emoji}</span>
          <h2 style="margin:0;">${card.nome}</h2>
        </div>
        <p class="sub" style="margin-bottom:18px;">${card.efeito.intro || card.historia[0]}</p>
        <div class="choice-options">
          ${opcoes
            .map(
              (op, i) => `
            <div class="choice-option" data-idx="${i}">
              <div class="choice-option-label">${op.label}</div>
              ${op.dica ? `<div class="choice-option-dica">${op.dica}</div>` : ""}
            </div>`
            )
            .join("")}
        </div>
      </div>
    </div>`;

  root.querySelectorAll(".choice-option").forEach((el) => {
    el.addEventListener("click", () => {
      const opcao = opcoes[parseInt(el.dataset.idx, 10)];
      root.innerHTML = "";
      advanceTurn(card, alternativas, opcao);
    });
  });
}

function spawnCardBurst(cardEl, cor) {
  const rect = cardEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 10; i++) {
    const p = document.createElement("div");
    p.className = `card-particle ${COR_CLASS[cor] || ""}`;
    const angle = (Math.PI * 2 * i) / 10 + rnd0() * 0.5;
    const dist = 40 + rnd0() * 50;
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    p.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 650);
  }
}

/* ============================================================
   RENDERIZAÇÃO
   ============================================================ */
function renderHero() {
  const h = state.hero;
  const vidaPct = Math.max(0, Math.round((h.vida / getVidaMax()) * 100));
  const manaPct = getManaMax() > 0 ? Math.round((h.mana / getManaMax()) * 100) : 0;
  const expPct = Math.round((h.exp / h.expProxNivel) * 100);

  const equipHtml = ["arma", "armadura", "acessorio"]
    .map((slot) => {
      const it = h.equipamentos[slot];
      if (!it) return `<div class="equip-item"><span class="slot">${slot}</span><span class="empty-note">vazio</span></div>`;
      const bonusTxt = Object.entries(it.bonus).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(", ");
      return `<div class="equip-item"><span class="slot">${slot}</span><span>${it.nome}<br><small style="color:#00E5FF">${bonusTxt}</small></span></div>`;
    })
    .join("");

  document.getElementById("heroContent").innerHTML = `
    <div class="hero-avatar">${h.emoji}</div>
    <div class="hero-name">${h.nome}</div>
    <div class="hero-class">Nível ${h.nivel} · ${state.regiao}</div>

    <div class="stat-bar-wrap">
      <div class="stat-bar-label"><span>Vida</span><b>${Math.round(h.vida)} / ${getVidaMax()}</b></div>
      <div class="stat-bar-track"><div class="stat-bar-fill fill-vida" style="width:${vidaPct}%"></div></div>
    </div>
    <div class="stat-bar-wrap">
      <div class="stat-bar-label"><span>Mana</span><b>${h.mana} / ${getManaMax()}</b></div>
      <div class="stat-bar-track"><div class="stat-bar-fill fill-mana" style="width:${manaPct}%"></div></div>
    </div>
    <div class="stat-bar-wrap">
      <div class="stat-bar-label"><span>Exp.</span><b>${h.exp} / ${h.expProxNivel}</b></div>
      <div class="stat-bar-track"><div class="stat-bar-fill fill-exp" style="width:${expPct}%"></div></div>
    </div>

    <div class="stat-grid">
      <div class="stat-chip"><span>⚔ Ataque</span><span>${getAtaque()}</span></div>
      <div class="stat-chip"><span>🛡 Defesa</span><span>${getDefesa()}</span></div>
      <div class="stat-chip"><span>💨 Veloc.</span><span>${getVelocidade()}</span></div>
      <div class="stat-chip"><span>💰 Ouro</span><span>${h.ouro}</span></div>
    </div>

    <div class="hero-section-title">Equipamentos</div>
    <div class="equip-list">${equipHtml}</div>

    ${h.escolas.length ? `
    <div class="hero-section-title">Escola</div>
    <div class="equip-list">${h.escolas.map((e) => `<div class="equip-item"><span>${e.emoji} ${e.nome}</span></div>`).join("")}</div>
    ` : ""}

    <div class="hero-section-title">Descobertas</div>
    <div class="empty-note codex-link" onclick="showCodexModal()">${state.descobertos.size} / ${DATA.cards.filter((c) => !c.oculta).length} cartas descobertas — abrir Códice ›</div>

    <div class="hero-section-title">Relacionamentos</div>
    <div class="rel-list">${renderRelacoes()}</div>
  `;
}

function renderRelacoes() {
  const ids = Object.keys(state.personagens);
  if (!ids.length) return `<div class="empty-note">Nenhum vínculo formado ainda.</div>`;
  return ids
    .map((id) => {
      const p = DATA.characters && DATA.characters.find((c) => c.id === id);
      const rel = state.personagens[id];
      const tier = relTier(rel.relacao);
      const nome = p ? p.nome : id;
      const emoji = p ? p.emoji : "❔";
      return `<div class="rel-item"><span>${emoji} ${nome}</span><span title="${tier.label}">${tier.emoji}</span></div>`;
    })
    .join("");
}

function renderBranch(ramo, side, nodeIndex, ramoIndex) {
  const line = `<div class="branch-line"></div>`;
  const twig = `
    <div class="twig type-${ramo.tipo}" title="${ramo.nome} — caminho não seguido: ${ramo.dica}">
      <div class="twig-emoji">${ramo.emoji}</div>
      <div class="twig-label">${ramo.nome}</div>
    </div>`;
  return side === "left" ? twig + line : line + twig;
}

function renderTree() {
  const el = document.getElementById("treeContent");

  el.innerHTML = state.tree
    .map((n, i) => {
      const ramos = n.ramos || [];
      // 2 ramos → um de cada lado. 1 ramo → alterna de lado a cada nó, pra
      // a árvore não crescer sempre para o mesmo lado.
      let left = null, right = null;
      if (ramos.length === 2) { left = ramos[0]; right = ramos[1]; }
      else if (ramos.length === 1) { if (i % 2 === 0) left = ramos[0]; else right = ramos[0]; }

      const swayCls = i % 2 === 0 ? "sway-left" : "sway-right";
      return `
      ${i > 0 ? `<div class="tree-connector ${swayCls}"></div>` : ""}
      <div class="tree-row">
        <div class="branch-slot left">${left ? renderBranch(left, "left", i, 0) : ""}</div>
        <div class="tree-node type-${n.tipo} ${i === state.tree.length - 1 ? "tree-node-newest" : ""}">
          <div class="tree-emoji">${n.emoji}</div>
          <div class="tree-label">${n.nome}</div>
        </div>
        <div class="branch-slot right">${right ? renderBranch(right, "right", i, 1) : ""}</div>
      </div>`;
    })
    .join("");

  el.scrollTop = el.scrollHeight;
  const panel = document.getElementById("treePanel");
  panel.scrollTop = panel.scrollHeight;
}

function renderStory() {
  const el = document.getElementById("storyContent");
  const last = state.story.length - 1;
  el.innerHTML = state.story
    .map((s, i) => {
      if (s.tipo === "capitulo") {
        return `
        <div class="chapter-divider">
          <span class="chapter-num">Capítulo ${s.numero}</span>
          <span class="chapter-title">${s.meta.emoji} ${s.meta.nome}</span>
        </div>`;
      }
      // as últimas entradas continuam brilhando por um instante, guiando o
      // olhar do jogador até onde a história está acontecendo agora.
      const distFromLast = last - i;
      const novaClasse = distFromLast === 0 ? "story-entry-new" : distFromLast === 1 ? "story-entry-recent" : "";
      return `<div class="story-entry ${COR_CLASS[s.cor] || ""} ${novaClasse}">${enhanceStoryText(s.texto)}</div>`;
    })
    .join("");

  // quem tem a barra de rolagem é o .panel (storyPanel), não a div interna —
  // por isso o auto-scroll precisa mirar no painel, não no storyContent.
  const storyPanel = document.getElementById("storyPanel");
  storyPanel.scrollTop = storyPanel.scrollHeight;
}

function renderCards() {
  const el = document.getElementById("cardsFooter");
  el.innerHTML = state.currentCards
    .map((c) => {
      const isNew = !state.tree.some((n) => n.nome === c.nome);
      const isEscolha = c.efeito && c.efeito.tipo === "escolha";
      const desc = isEscolha ? (c.efeito.intro || c.historia[0]) : c.historia[0];
      return `
      <div class="game-card entering card-rarity-${c.raridade} ${isEscolha ? "card-escolha" : ""}" data-id="${c.id}" onclick="onCardClick('${c.id}')">
        <div class="card-top">
          <span class="card-emoji">${c.emoji}</span>
          <span class="card-rarity rarity-${c.raridade}">${RARITY_LABEL[c.raridade]}</span>
        </div>
        ${isNew ? '<span class="card-new">NOVO</span>' : ""}
        ${isEscolha ? '<span class="card-choice-tag">💬 Decisão</span>' : ""}
        <div class="card-name">${c.nome}</div>
        <div class="card-type">${c.tipo}</div>
        <div class="card-desc">${desc}</div>
      </div>`;
    })
    .join("");
}

function renderEventBanner() {
  const existing = document.querySelector(".world-event");
  if (existing) existing.remove();
  if (state.activeEvent) {
    const banner = document.createElement("div");
    banner.className = "world-event";
    banner.innerHTML = `${state.activeEvent.emoji} <b>${state.activeEvent.nome}</b> ativo`;
    document.body.appendChild(banner);
  }
}

function applyWeather() {
  Object.values(WEATHER_CLASS).forEach((cls) => document.body.classList.remove(cls));
  if (state.activeEvent && WEATHER_CLASS[state.activeEvent.id]) {
    document.body.classList.add(WEATHER_CLASS[state.activeEvent.id]);
  }
}

function renderAll() {
  document.getElementById("seedDisplay").textContent = `seed: ${state.seed}`;
  const fase = currentFase();
  const faseEl = document.getElementById("faseDisplay");
  if (faseEl) faseEl.textContent = `Fase ${fase.numero} · ${fase.nome}`;
  renderHero();
  renderTree();
  renderStory();
  renderCards();
  renderEventBanner();
  applyWeather();
  saveGame();
}

/* ============================================================
   MODAIS
   ============================================================ */
function showClassSelectModal() {
  const seedSugerida = newSeed();
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-box">
        <h2>Escolha sua Classe</h2>
        <p class="sub">Cada classe altera completamente sua árvore de possibilidades.</p>
        <div class="class-grid">
          ${DATA.classes
            .map(
              (c) => `
            <div class="class-option" data-classe="${c.id}">
              <div class="co-top"><span class="co-emoji">${c.emoji}</span><span class="co-name">${c.nome}</span></div>
              <div class="co-desc">${c.descricao}</div>
            </div>`
            )
            .join("")}
        </div>
        <p class="sub" style="margin-top:18px;">Seed da aventura (compartilhe para jogar a mesma história):</p>
        <input id="seedInput" value="${seedSugerida}" style="width:100%;background:#101010;border:1px solid #262626;color:#EEE;padding:10px;border-radius:8px;font-size:0.85rem;margin-bottom:6px;" />
      </div>
    </div>`;

  root.querySelectorAll(".class-option").forEach((elm) => {
    elm.addEventListener("click", () => {
      const classeId = elm.dataset.classe;
      const seedVal = parseInt(document.getElementById("seedInput").value, 10) || newSeed();
      root.innerHTML = "";
      startGame(classeId, seedVal);
    });
  });
}

function showCodexModal() {
  const root = document.getElementById("modalRoot");

  const totalCards = DATA.cards.filter((c) => !c.oculta).length;
  const cardsHtml = DATA.cards
    .filter((c) => !c.oculta)
    .sort((a, b) => RARITY_ORDER.indexOf(a.raridade) - RARITY_ORDER.indexOf(b.raridade))
    .map((c) => {
      const found = state.descobertos.has(c.id);
      return `<div class="codex-item ${found ? "" : "codex-locked"}">
        <span class="codex-emoji">${found ? c.emoji : "❔"}</span>
        <span class="codex-name">${found ? c.nome : "???"}</span>
        <span class="codex-rarity rarity-${c.raridade}">${found ? RARITY_LABEL[c.raridade] : ""}</span>
      </div>`;
    })
    .join("");

  const totalRegioes = Object.keys(REGIAO_META).length;
  const regioesHtml = Object.entries(REGIAO_META)
    .map(([id, meta]) => {
      const found = state.regioesVisitadas.has(id);
      return `<div class="codex-item ${found ? "" : "codex-locked"}">
        <span class="codex-emoji">${found ? meta.emoji : "❔"}</span>
        <span class="codex-name">${found ? meta.nome : "???"}</span>
      </div>`;
    })
    .join("");

  const charIds = Object.keys(state.personagens);
  const personagensHtml = charIds.length
    ? charIds
        .map((id) => {
          const p = DATA.characters && DATA.characters.find((c) => c.id === id);
          const rel = state.personagens[id];
          const tier = relTier(rel.relacao);
          return `<div class="codex-item">
            <span class="codex-emoji">${p ? p.emoji : "❔"}</span>
            <span class="codex-name">${p ? p.nome : id}</span>
            <span class="codex-rarity" title="${tier.label}">${tier.emoji}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-note">Nenhum personagem conhecido ainda.</div>`;

  root.innerHTML = `
    <div class="modal-overlay" id="codexOverlay">
      <div class="modal-box codex-box">
        <h2>📖 Códice</h2>
        <p class="sub">Tudo que você já descobriu nesta aventura.</p>

        <div class="codex-section-title">Regiões — ${state.regioesVisitadas.size} / ${totalRegioes}</div>
        <div class="codex-grid">${regioesHtml}</div>

        <div class="codex-section-title">Cartas — ${state.descobertos.size} / ${totalCards}</div>
        <div class="codex-grid">${cardsHtml}</div>

        <div class="codex-section-title">Personagens — ${charIds.length}</div>
        <div class="codex-grid">${personagensHtml}</div>

        <button class="btn-primary" id="btnCloseCodex" style="margin-top:18px;">Fechar</button>
      </div>
    </div>`;

  document.getElementById("btnCloseCodex").addEventListener("click", () => (root.innerHTML = ""));
  document.getElementById("codexOverlay").addEventListener("click", (e) => {
    if (e.target.id === "codexOverlay") root.innerHTML = "";
  });
}

function showEndingModal(ending) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-box">
        <div class="ending-emoji">${ending.emoji}</div>
        <div class="ending-title">${ending.titulo}</div>
        <div class="ending-text">${ending.texto}</div>
        <div class="ending-stats">
          <div class="ending-stat"><b>${state.hero.nivel}</b><span>Nível</span></div>
          <div class="ending-stat"><b>${state.turno}</b><span>Turnos</span></div>
          <div class="ending-stat"><b>${state.hero.ouro}</b><span>Ouro</span></div>
          <div class="ending-stat"><b>${state.descobertos.size}</b><span>Descobertas</span></div>
        </div>
        <button class="btn-primary" id="btnRestart">Nova Aventura</button>
      </div>
    </div>`;
  document.getElementById("btnRestart").addEventListener("click", () => {
    localStorage.removeItem("chronicles_save");
    root.innerHTML = "";
    showClassSelectModal();
  });
}

/* ============================================================
   SAVE / LOAD
   ============================================================ */
function saveGame() {
  try {
    const serial = {
      ...state,
      itensObtidos: [...state.itensObtidos],
      derrotados: [...state.derrotados],
      descobertos: [...state.descobertos],
      regioesVisitadas: [...state.regioesVisitadas],
      availableCardIds: [...state.availableCardIds],
      rng: null,
    };
    localStorage.setItem("chronicles_save", JSON.stringify(serial));
  } catch (e) { /* ignora erros de storage */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem("chronicles_save");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    state = parsed;
    state.itensObtidos = new Set(parsed.itensObtidos);
    state.derrotados = new Set(parsed.derrotados);
    state.descobertos = new Set(parsed.descobertos);
    state.regioesVisitadas = new Set(parsed.regioesVisitadas || [parsed.regiao || "aldeia"]);
    state.availableCardIds = new Set(parsed.availableCardIds);
    state.rng = mulberry32(parsed.seed + parsed.turno); // continuidade aproximada
    if (!state.seenLines) state.seenLines = {};
    if (!state.faseAnunciada) state.faseAnunciada = currentFase().numero;
    if (!state.lastDrawnTurno) state.lastDrawnTurno = {};
    if (!state.vezesVista) {
      // saves antigos não tinham esse contador — inicializa a partir do que
      // já foi descoberto, para não perder o bônus de novidade de tudo.
      state.vezesVista = {};
      state.descobertos.forEach((id) => { state.vezesVista[id] = 3; });
    }
    if (!state.hero.escolas) state.hero.escolas = [];
    return true;
  } catch (e) {
    return false;
  }
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
function startGame(classeId, seed) {
  state = novoEstado(classeId, seed);
  addStory(`🟢 Sua jornada como ${state.hero.nome} começa em uma pequena aldeia.`, "verde");
  state.tree.push({ emoji: state.hero.emoji, nome: state.hero.nome, tipo: "heroi" });
  drawThreeCards();
  renderAll();
}

document.getElementById("btnNewGame").addEventListener("click", () => {
  localStorage.removeItem("chronicles_save");
  document.getElementById("modalRoot").innerHTML = "";
  showClassSelectModal();
});

document.getElementById("btnCodex").addEventListener("click", () => {
  if (!state) return;
  showCodexModal();
});

(async function init() {
  const ok = await loadData();
  if (!ok) return;

  if (loadGame() && !state.gameOver) {
    renderAll();
  } else {
    showClassSelectModal();
  }
})();