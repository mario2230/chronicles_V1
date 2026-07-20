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
  planicie: { emoji: "🌾", nome: "Planícies Douradas" },
  costa: { emoji: "🌊", nome: "Costa Esquecida" },
  cripta: { emoji: "🪦", nome: "Cripta Sombria" }
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
      buffsAtivos: [], // buffs temporários de combate (ataque/defesa/velocidade), vindos de poções
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
    battle: null,
    minigame: null,
  };
}

function heroStat(base) {
  const h = state.hero;
  let bonus = 0;
  Object.values(h.equipamentos).forEach((it) => {
    if (it && it.bonus && it.bonus[base] != null) bonus += it.bonus[base];
  });
  (h.buffsAtivos || []).forEach((b) => { if (b.stat === base) bonus += b.valor; });
  return bonus;
}

// remove buffs expirados; chamada a cada turno do mundo E a cada rodada de
// batalha, então "dura 3 turnos" significa a mesma coisa nos dois casos.
function tickBuffs() {
  const buffs = state.hero.buffsAtivos;
  if (!buffs || !buffs.length) return;
  buffs.forEach((b) => (b.turnosRestantes -= 1));
  const expirados = buffs.filter((b) => b.turnosRestantes <= 0);
  expirados.forEach((b) => addStory(`O efeito de ${b.nome} termina.`, "cinza"));
  state.hero.buffsAtivos = buffs.filter((b) => b.turnosRestantes > 0);
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

// slotOverride existe porque resultados de "misterio" guardam o slot dentro
// do próprio resultado sorteado, não em card.efeito.slot — sem isso, um
// item de equipamento ganho por mistério não sabia seu slot e se perdia
// silenciosamente (escrito em equipamentos[undefined]).
function obterItem(card, bonusOverride, nomeOverride, slotOverride) {
  const nome = nomeOverride || card.efeito.nomeItem || card.nome;
  const bonus = bonusOverride || card.efeito.bonus || {};
  const slot = slotOverride || card.efeito.slot;

  state.itensObtidos.add(card.id);

  if (slot === "consumivel") {
    const existente = state.hero.inventario.find((it) => it.tipo === "consumivel" && it.itemId === card.id);
    if (existente) existente.quantidade++;
    else {
      state.hero.inventario.push({
        tipo: "consumivel",
        itemId: card.id,
        nome,
        emoji: card.emoji,
        cor: card.cor,
        cura: card.efeito.cura || 0,
        mana: card.efeito.mana || 0,
        buffCombate: card.efeito.buffCombate || null,
        quantidade: 1,
      });
    }
    addStory(`🎒 Você guardou ${nome} na mochila.`, "amarelo");
    return;
  }

  // trocar de equipamento não descarta o antigo — ele vira reserva na mochila
  const slotFinal = ["arma", "armadura", "acessorio"].includes(slot) ? slot : "acessorio";
  const anterior = state.hero.equipamentos[slotFinal];
  if (anterior) {
    state.hero.inventario.push({
      tipo: "equipamento",
      itemId: anterior.id,
      nome: anterior.nome,
      emoji: anterior.emoji || "🎒",
      slot: slotFinal,
      bonus: anterior.bonus,
    });
  }
  const item = { id: card.id, nome, emoji: card.emoji, bonus, slot: slotFinal };
  state.hero.equipamentos[slotFinal] = item;
  addStory(anterior ? `Você trocou de equipamento por ${nome}. O antigo foi para a mochila.` : `Você equipou ${nome}.`, "amarelo");
}

// consome uma unidade de um item da mochila e aplica seu efeito. Funciona
// tanto durante uma batalha em turnos quanto na exploração normal.
function usarConsumivel(itemId) {
  const entry = state.hero.inventario.find((it) => it.tipo === "consumivel" && it.itemId === itemId);
  if (!entry || entry.quantidade <= 0) return false;
  entry.quantidade--;
  if (entry.quantidade <= 0) state.hero.inventario = state.hero.inventario.filter((it) => it !== entry);

  const partes = [];
  if (entry.cura) { curar(entry.cura); partes.push(`+${entry.cura} vida`); }
  if (entry.mana) {
    const antes = state.hero.mana;
    state.hero.mana = Math.min(getManaMax(), state.hero.mana + entry.mana);
    const ganho = state.hero.mana - antes;
    if (ganho > 0) partes.push(`+${ganho} mana`);
  }
  if (entry.buffCombate) {
    if (!state.hero.buffsAtivos) state.hero.buffsAtivos = [];
    const b = entry.buffCombate;
    const stat = b.ataque ? "ataque" : b.defesa ? "defesa" : "velocidade";
    const valor = b.ataque || b.defesa || b.velocidade || 0;
    const turnos = b.turnos || 3;
    state.hero.buffsAtivos.push({ stat, valor, turnosRestantes: turnos, nome: entry.nome });
    partes.push(`${valor >= 0 ? "+" : ""}${valor} ${stat} por ${turnos} turnos`);
  }

  addStory(`Você usou ${entry.nome}.${partes.length ? ` (${partes.join(", ")})` : ""}`, "amarelo");
  return true;
}

// troca um equipamento da reserva (mochila) pelo que está em uso no slot
function equiparDaMochila(itemId) {
  const idx = state.hero.inventario.findIndex((it) => it.tipo === "equipamento" && it.itemId === itemId);
  if (idx === -1) return;
  const entry = state.hero.inventario[idx];
  const atual = state.hero.equipamentos[entry.slot];
  state.hero.equipamentos[entry.slot] = { id: entry.itemId, nome: entry.nome, emoji: entry.emoji, bonus: entry.bonus, slot: entry.slot };
  state.hero.inventario.splice(idx, 1);
  if (atual) {
    state.hero.inventario.push({ tipo: "equipamento", itemId: atual.id, nome: atual.nome, emoji: atual.emoji || "🎒", slot: entry.slot, bonus: atual.bonus });
  }
  addStory(`Você trocou de equipamento: agora usa ${entry.nome}.`, "amarelo");
  renderHero();
  const wrap = document.getElementById("inventoryModalRoot");
  if (wrap) { wrap.innerHTML = inventoryModalContent(); bindInventoryModalEvents(); }
}

function resolverCombate(card) {
  const ef = card.efeito;
  const dificuldade = currentFase().dificuldade;
  const eliteMult = card.elite ? 1.35 : 1;
  let vidaInimigo = Math.round(ef.vidaInimigo * dificuldade * eliteMult);
  let ataqueInimigo = Math.round(ef.ataqueInimigo * (1 + (dificuldade - 1) * 0.6) * (card.elite ? 1.15 : 1));
  const defesaInimigo = ef.defesaInimigo + (card.elite ? 1 : 0);
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
  if (maiorGolpeSofrido >= Math.max(6, vidaMaxHero * 0.16) || card.tipo === "chefe" || card.elite) {
    shakeScreen(card.tipo === "chefe" ? "strong" : "normal");
  }

  if (state.hero.vida <= 0) {
    state.hero.vida = 0;
    addStory(`💀 Você foi derrotado por ${card.nome}.`, "vermelho");
    spawnFloatingText("💀 DERROTA", "dmg-fatal");
    return;
  }

  const ouroBase = rndInt(ef.ouroDrop[0], ef.ouroDrop[1]);
  const ouro = card.elite ? Math.round(ouroBase * 1.4) : ouroBase;
  state.hero.ouro += ouro;
  const expGanho = card.elite ? Math.round(ef.expDrop * 1.4) : ef.expDrop;
  ganharExp(expGanho);

  // mostra ao jogador o quanto seu equipamento e build pesaram na vitória —
  // decisões de build precisam ser sentidas, não só numéricas nos bastidores.
  const bonusEquip = heroStat("ataque");
  let sufixoBuild = "";
  if (bonusEquip >= 3) sufixoBuild = ` Seu equipamento sozinho contribuiu com +${bonusEquip} de ataque no combate.`;
  else if (criticos >= 2) sufixoBuild = ` Sua velocidade garantiu ${criticos} acertos críticos.`;

  const prefixoElite = card.elite ? "⚔ Inimigo Especial derrotado! " : "";
  addStory(`${prefixoElite}${pickStoryLine(card)} (+${ouro} ouro, +${expGanho} exp)${sufixoBuild}`, card.cor);
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

// Resolve o resultado sorteado de uma carta de mistério. É deliberadamente
// tolerante ao formato do resultado: em vez de exigir um "sub" fixo
// (recompensa_leve/item/dano), ele apenas aplica os campos presentes
// (ouro, exp, cura, vida, nomeItem...). Isso evita que a adição de novos
// mistérios quebre o jogo por causa de uma combinação de campos que o
// código não previa explicitamente — o bug que travava o jogo era
// exatamente esse tipo de suposição rígida demais.
function resolverMisterio(card) {
  const total = card.efeito.resultados.reduce((s, r) => s + r.chance, 0);
  let r = rnd() * total;
  let escolhido = card.efeito.resultados[0];
  for (const res of card.efeito.resultados) {
    r -= res.chance;
    if (r <= 0) { escolhido = res; break; }
  }

  const partes = [];

  if (Array.isArray(escolhido.ouro)) {
    const ouro = rndInt(escolhido.ouro[0], escolhido.ouro[1]);
    if (ouro) { state.hero.ouro += ouro; partes.push(`${ouro >= 0 ? "+" : ""}${ouro} ouro`); }
  } else if (typeof escolhido.ouro === "number" && escolhido.ouro) {
    state.hero.ouro += escolhido.ouro;
    partes.push(`${escolhido.ouro >= 0 ? "+" : ""}${escolhido.ouro} ouro`);
  }

  if (escolhido.exp) { ganharExp(escolhido.exp); partes.push(`+${escolhido.exp} exp`); }
  if (escolhido.cura) { curar(escolhido.cura); partes.push(`+${escolhido.cura} vida`); }
  if (escolhido.mana) {
    const antes = state.hero.mana;
    state.hero.mana = Math.min(getManaMax(), state.hero.mana + escolhido.mana);
    const ganho = state.hero.mana - antes;
    if (ganho > 0) partes.push(`+${ganho} mana`);
  }

  if (escolhido.vida) {
    state.hero.vida = Math.max(0, state.hero.vida - escolhido.vida);
    partes.push(`-${escolhido.vida} vida`);
    spawnFloatingText(`-${escolhido.vida} vida`, "dmg-neg");
    flashHeroPanel("hit");
  }

  if (escolhido.nomeItem) {
    obterItem(card, escolhido.bonus, escolhido.nomeItem, escolhido.slot);
  }

  const cor = escolhido.vida ? "vermelho" : (card.cor || "cinza");
  const sufixo = partes.length ? ` (${partes.join(", ")})` : "";
  addStory(`${pickStoryLine(card)}${sufixo}`, cor);

  if (state.hero.vida <= 0) {
    state.hero.vida = 0;
    addStory(`💀 O mistério cobrou um preço fatal.`, "vermelho");
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
   COMBATE EM TURNOS — exclusivo para chefes e subchefes.
   Inimigos comuns e elites continuam resolvendo instantaneamente
   via resolverCombate(), sem passar por aqui.
   ============================================================ */
// Depois de vencer um chefe que carrega um final da história, o jogador
// decide, ali mesmo, se aceita esse final agora ou guarda a conquista e
// continua a aventura. Substitui o antigo comportamento de encerrar a run
// automaticamente assim que a flagFinal era setada.
function showFinalChoiceModal(card) {
  const ending = DATA.endings.find(
    (e) => e.condicao === "flag" && e.flag === card.efeito.flagFinal
  );
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-box boss-warning-box">
        <div class="ending-emoji">${ending ? ending.emoji : "👑"}</div>
        <h2 style="text-align:center;">${card.nome} foi derrotado!</h2>
        <p class="sub" style="text-align:center; margin-bottom:22px;">
          Essa vitória poderia encerrar sua jornada agora, com o final
          <b>"${ending ? ending.titulo : "?"}"</b>. Você pode aceitar esse
          final neste momento, ou guardar essa conquista e continuar
          explorando o mundo.
        </p>
        <div class="boss-warning-actions">
          <button class="btn-primary" id="btnAceitarFinal">${ending ? ending.emoji : "👑"} Aceitar o Final</button>
          <button class="btn-secondary" id="btnContinuarRun">🗺 Continuar a Jornada</button>
        </div>
      </div>
    </div>`;

  document.getElementById("btnAceitarFinal").addEventListener("click", () => {
    state.tags["flag_" + card.efeito.flagFinal] = true;
    root.innerHTML = "";
    const finalEscolhido = checkEndings();
    if (finalEscolhido) {
      state.gameOver = true;
      renderAll();
      showEndingModal(finalEscolhido);
    }
  });

  document.getElementById("btnContinuarRun").addEventListener("click", () => {
    root.innerHTML = "";
    drawThreeCards();
    renderAll();
  });
}

function iniciarBatalha(card, alternativas) {
  document.querySelectorAll(".game-card").forEach((el) => (el.style.pointerEvents = "none"));
  const clickedEl = document.querySelector(`.game-card[data-id="${card.id}"]`);
  if (clickedEl) clickedEl.classList.add("leaving");

  state.turno++;
  checkFaseTransition();

  const ef = card.efeito;
  const dificuldade = currentFase().dificuldade;
  const vidaMax = Math.round(ef.vidaInimigo * dificuldade);

  state.battle = {
    card,
    alternativas,
    inimigo: {
      nome: card.nome,
      emoji: card.emoji,
      vidaMax,
      vida: vidaMax,
      ataque: Math.round(ef.ataqueInimigo * (1 + (dificuldade - 1) * 0.6)),
      defesa: ef.defesaInimigo,
    },
    rodada: 1,
    defendendo: false,
    showItemMenu: false,
    fasesAvisadas: new Set(),
    fim: null,
    log: [`${card.emoji} ${card.nome} bloqueia seu caminho!`],
  };
  document.body.classList.add("in-battle");
  renderBattleModal();
}

// fases genéricas por % de vida restante — dá tensão crescente a qualquer
// chefe sem precisar de IA específica escrita por carta.
function battleFaseInfo(pct) {
  if (pct <= 0.10) return { chave: "10", mult: 1.5, aviso: "☠ Modo desesperado! O golpe final se aproxima." };
  if (pct <= 0.25) return { chave: "25", mult: 1.35, aviso: "🔥 A fúria toma conta do inimigo." };
  if (pct <= 0.50) return { chave: "50", mult: 1.2, aviso: "⚡ Uma nova fase da batalha começa." };
  if (pct <= 0.75) return { chave: "75", mult: 1.1, aviso: "👁 O inimigo revela mais força." };
  return { chave: "100", mult: 1, aviso: null };
}

function pushBattleLog(linhas) {
  state.battle.log.push(...linhas);
  state.battle.log = state.battle.log.slice(-6);
}

// resolve o turno do inimigo (usado tanto depois de atacar/defender/fugir
// quanto depois de usar um item) e decide se a batalha terminou.
function battleTurnoInimigo() {
  const b = state.battle;
  const fase = battleFaseInfo(b.inimigo.vida / b.inimigo.vidaMax);
  const linhas = [];
  if (fase.aviso && !b.fasesAvisadas.has(fase.chave)) {
    b.fasesAvisadas.add(fase.chave);
    linhas.push(fase.aviso);
  }
  let dmg = Math.max(1, Math.round(b.inimigo.ataque * fase.mult) - getDefesa() + rndInt(-2, 2));
  if (b.defendendo) dmg = Math.max(1, Math.round(dmg * 0.4));
  state.hero.vida = Math.max(0, state.hero.vida - dmg);
  linhas.push(`${b.inimigo.emoji} ${b.inimigo.nome} causa ${dmg} de dano${b.defendendo ? " (reduzido pela defesa)" : ""}.`);
  spawnFloatingText(`-${dmg}`, "dmg-neg");
  flashHeroPanel("hit");
  if (dmg >= Math.max(6, getVidaMax() * 0.16)) shakeScreen("normal");
  b.defendendo = false;
  b.rodada++;
  tickBuffs();
  pushBattleLog(linhas);

  if (state.hero.vida <= 0) b.fim = "derrota";
  renderBattleModal();
  if (b.fim) setTimeout(finalizarBatalha, 1100);
}

// custo de mana da magia de combate: fixo e baixo o bastante pra qualquer
// classe conseguir usar algumas vezes, mesmo as com pouca mana máxima.
const CUSTO_MAGIA_BATALHA = 12;

function battleAction(tipo) {
  const b = state.battle;
  if (!b || b.fim) return;

  if (tipo === "item") { b.showItemMenu = true; renderBattleModal(); return; }
  if (tipo === "voltar") { b.showItemMenu = false; renderBattleModal(); return; }

  if (tipo === "atacar") {
    const critChance = Math.min(0.45, 0.08 + getVelocidade() * 0.012);
    const isCrit = rnd() < critChance;
    let dmg = Math.max(1, getAtaque() - b.inimigo.defesa + rndInt(-2, 3));
    if (isCrit) dmg = Math.round(dmg * 1.7);
    b.inimigo.vida = Math.max(0, b.inimigo.vida - dmg);
    pushBattleLog([isCrit ? `💥 Crítico! Você causa ${dmg} de dano.` : `⚔ Você causa ${dmg} de dano.`]);
    spawnFloatingText(isCrit ? `💥 -${dmg}` : `-${dmg}`, isCrit ? "dmg-crit" : "dmg-pos");
  } else if (tipo === "defender") {
    b.defendendo = true;
    pushBattleLog(["🛡 Você se prepara para o próximo golpe."]);
  } else if (tipo === "magia") {
    if (state.hero.mana < CUSTO_MAGIA_BATALHA) {
      pushBattleLog([`✨ Mana insuficiente (precisa de ${CUSTO_MAGIA_BATALHA}).`]);
      renderBattleModal();
      return;
    }
    state.hero.mana -= CUSTO_MAGIA_BATALHA;
    // a magia ignora boa parte da defesa do inimigo — é o motivo de gastar
    // mana em vez de simplesmente atacar de novo.
    const dmg = Math.max(3, Math.round(getAtaque() * 1.5 + 5 - b.inimigo.defesa * 0.4) + rndInt(-1, 4));
    b.inimigo.vida = Math.max(0, b.inimigo.vida - dmg);
    pushBattleLog([`✨ Você conjura um feitiço e causa ${dmg} de dano (-${CUSTO_MAGIA_BATALHA} mana).`]);
    spawnFloatingText(`✨ -${dmg}`, "dmg-crit");
  } else if (tipo === "subornar") {
    const custo = custoSuborno(b.inimigo);
    if (state.hero.ouro < custo) {
      pushBattleLog([`💰 Você precisaria de ${custo} de ouro para subornar — não é o suficiente.`]);
      renderBattleModal();
      return;
    }
    state.hero.ouro -= custo;
    b.fim = "fuga";
    pushBattleLog([`💰 Você suborna seu oponente e escapa em segurança (-${custo} ouro).`]);
    renderBattleModal();
    setTimeout(finalizarBatalha, 900);
    return;
  } else if (tipo === "fugir") {
    const chance = 0.3 + Math.max(0, getVelocidade() - 5) * 0.02;
    if (rnd() < chance) {
      b.fim = "fuga";
      pushBattleLog(["🏃 Você foge da batalha!"]);
      renderBattleModal();
      setTimeout(finalizarBatalha, 900);
      return;
    }
    pushBattleLog(["🏃 Você tenta fugir, mas não consegue escapar!"]);
  }

  if (b.inimigo.vida <= 0) {
    b.fim = "vitoria";
    pushBattleLog([`${b.inimigo.emoji} ${b.inimigo.nome} foi derrotado!`]);
    renderBattleModal();
    setTimeout(finalizarBatalha, 1100);
    return;
  }

  battleTurnoInimigo();
}

// suborno fica mais caro contra inimigos mais fortes — senão viraria um
// jeito "de graça" de pular qualquer chefe difícil.
function custoSuborno(inimigo) {
  return Math.round(15 + state.hero.nivel * 3 + inimigo.vidaMax * 0.3);
}

function battleUsarItem(itemId) {
  const b = state.battle;
  if (!b || b.fim) return;
  b.showItemMenu = false;
  const ok = usarConsumivel(itemId);
  if (!ok) { renderBattleModal(); return; }
  pushBattleLog([`🧪 Você usa um item durante a batalha.`]);
  battleTurnoInimigo();
}

function battleEndText(fim) {
  if (fim === "vitoria") return "👑 Vitória!";
  if (fim === "derrota") return "💀 Você foi derrotado...";
  if (fim === "fuga") return "🏃 Você escapou.";
  return "";
}

function renderBattleModal() {
  const root = document.getElementById("modalRoot");
  const b = state.battle;
  if (!b) return;
  const h = state.hero;
  const vidaHeroPct = Math.max(0, Math.round((h.vida / getVidaMax()) * 100));
  const vidaInimigoPct = Math.max(0, Math.round((b.inimigo.vida / b.inimigo.vidaMax) * 100));
  const consumiveis = state.hero.inventario.filter((it) => it.tipo === "consumivel");

  root.innerHTML = `
    <div class="modal-overlay battle-overlay">
      <div class="modal-box battle-box">
        <div class="battle-enemy">
          <div class="battle-emoji">${b.inimigo.emoji}</div>
          <div class="battle-name">${b.inimigo.nome}</div>
          <div class="stat-bar-track battle-bar"><div class="stat-bar-fill fill-vida" style="width:${vidaInimigoPct}%"></div></div>
          <div class="battle-hp-num">${Math.max(0, Math.round(b.inimigo.vida))} / ${b.inimigo.vidaMax}</div>
        </div>

        <div class="battle-log">${b.log.map((l) => `<div class="battle-log-line">${l}</div>`).join("")}</div>

        <div class="battle-hero">
          <div class="battle-hero-top"><span>${h.emoji} ${h.nome}</span><span>${Math.round(h.vida)} / ${getVidaMax()} ❤️</span></div>
          <div class="stat-bar-track battle-bar"><div class="stat-bar-fill fill-vida" style="width:${vidaHeroPct}%"></div></div>
        </div>

        ${
          b.fim
            ? `<div class="battle-end-note">${battleEndText(b.fim)}</div>`
            : b.showItemMenu
            ? `<div class="battle-actions battle-item-menu">
                ${
                  consumiveis.length
                    ? consumiveis.map((it) => `<button class="battle-btn item-btn" onclick="battleUsarItem('${it.itemId}')">${it.emoji} ${it.nome} <span class="item-qty">x${it.quantidade}</span></button>`).join("")
                    : '<div class="empty-note">Mochila sem consumíveis.</div>'
                }
                <button class="battle-btn voltar-btn" onclick="battleAction('voltar')">‹ Voltar</button>
              </div>`
            : `<div class="battle-actions">
                <button class="battle-btn atacar" onclick="battleAction('atacar')">⚔ Atacar</button>
                <button class="battle-btn defender" onclick="battleAction('defender')">🛡 Defender</button>
                <button class="battle-btn magia ${h.mana < CUSTO_MAGIA_BATALHA ? "battle-btn-fraco" : ""}" onclick="battleAction('magia')">✨ Magia <small>(${CUSTO_MAGIA_BATALHA} mana)</small></button>
                <button class="battle-btn item" onclick="battleAction('item')">🧪 Usar Item</button>
                <button class="battle-btn fugir" onclick="battleAction('fugir')">🏃 Fugir</button>
                <button class="battle-btn subornar ${h.ouro < custoSuborno(b.inimigo) ? "battle-btn-fraco" : ""}" onclick="battleAction('subornar')">💰 Subornar <small>(${custoSuborno(b.inimigo)})</small></button>
              </div>`
        }
      </div>
    </div>`;
}

function finalizarBatalha() {
  const b = state.battle;
  if (!b) return;
  const { card, alternativas, fim } = b;

  addTreeNode(card, alternativas);

  let venceuChefeFinal = false;

  if (fim === "vitoria") {
    const ouro = rndInt(card.efeito.ouroDrop[0], card.efeito.ouroDrop[1]);
    state.hero.ouro += ouro;
    ganharExp(card.efeito.expDrop);
    addStory(`👑 ${pickStoryLine(card)} (+${ouro} ouro, +${card.efeito.expDrop} exp)`, card.cor);
    if (card.efeito.contadorTag) state.tags[card.efeito.contadorTag] = (state.tags[card.efeito.contadorTag] || 0) + 1;
    state.derrotados.add(card.id);
    if (card.efeito.itemGarantido) {
      const it = DATA.cards.find((c) => c.id === card.efeito.itemGarantido);
      if (it) obterItem(it);
    }
    // chefes com flagFinal não encerram mais a run sozinhos — o jogador
    // decide depois da vitória, em showFinalChoiceModal().
    if (card.efeito.flagFinal) venceuChefeFinal = true;
    if (card.desbloqueia) card.desbloqueia.forEach((id) => state.availableCardIds.add(id));
  } else if (fim === "fuga") {
    addStory(`🏃 Você recua da batalha contra ${card.nome}. Ele ainda ronda por aí — talvez seja melhor voltar mais preparado.`, "cinza");
  } else if (fim === "derrota") {
    state.hero.vida = 0;
    addStory(`💀 Você caiu diante de ${card.nome}.`, "vermelho");
  }

  document.body.classList.remove("in-battle");
  document.getElementById("modalRoot").innerHTML = "";
  state.battle = null;

  tickGlobalEvent();

  if (venceuChefeFinal) {
    renderAll();
    showFinalChoiceModal(card);
    return;
  }

  const ending = checkEndings();
  if (ending) {
    state.gameOver = true;
    renderAll();
    showEndingModal(ending);
    return;
  }

  drawThreeCards();
  renderAll();
}

/* ============================================================
   AÇÕES DO JOGADOR
   ============================================================ */
/* ============================================================
   MINI GAMES — desafios curtos (10–20s) que quebram o ritmo da
   gameplay sem substituir a narrativa. Ao terminar, o turno continua
   exatamente como qualquer outra carta (mesmo fluxo de tickGlobalEvent
   → checkEndings → drawThreeCards). Recompensas escalam por "tier"
   (excelente/bom/regular/fracasso), nunca travam a história — mesmo um
   fracasso apenas segue para o próximo evento, às vezes com um pequeno custo.
   ============================================================ */
const MINIGAME_MULT = { excelente: 1.6, bom: 1.15, regular: 0.7, fracasso: 0.25 };
const MINIGAME_ROTULO = {
  excelente: "🌟 Excelente!",
  bom: "✔ Bom resultado.",
  regular: "➖ Resultado regular.",
  fracasso: "✖ Não saiu como planejado.",
};

function iniciarMinigame(card, alternativas) {
  document.querySelectorAll(".game-card").forEach((el) => (el.style.pointerEvents = "none"));
  const clickedEl = document.querySelector(`.game-card[data-id="${card.id}"]`);
  if (clickedEl) clickedEl.classList.add("leaving");

  state.turno++;
  checkFaseTransition();

  state.minigame = { card, alternativas, jogo: card.efeito.jogo, timers: [] };
  document.body.classList.add("in-minigame");
  renderMinigameModal();
}

function mgTimer(fn, ms) {
  const id = setTimeout(fn, ms);
  if (state.minigame) state.minigame.timers.push(id);
  return id;
}
function mgInterval(fn, ms) {
  const id = setInterval(fn, ms);
  if (state.minigame) state.minigame.timers.push(id);
  return id;
}

function renderMinigameModal() {
  const jogo = state.minigame.jogo;
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-overlay"><div class="modal-box minigame-box" id="minigameBox"></div></div>`;
  const box = document.getElementById("minigameBox");
  const setups = {
    arquearia: setupArquearia,
    arrombamento: setupArrombamento,
    forja: setupForja,
    persuasao: setupPersuasao,
  };
  (setups[jogo] || (() => finalizarMinigame("regular")))(box);
}

function finalizarMinigame(tier) {
  const mg = state.minigame;
  if (!mg) return;
  mg.timers.forEach((id) => { clearTimeout(id); clearInterval(id); });

  const { card, alternativas } = mg;
  const ef = card.efeito;
  const mult = MINIGAME_MULT[tier] || 0.5;

  addTreeNode(card, alternativas);

  const ouroBase = ef.ouroBase ? rndInt(ef.ouroBase[0], ef.ouroBase[1]) : 0;
  const ouro = Math.round(ouroBase * mult);
  const exp = Math.round((ef.expBase || 0) * mult);
  if (ouro > 0) state.hero.ouro += ouro;
  if (exp > 0) ganharExp(exp);

  let sufixo = ` (${MINIGAME_ROTULO[tier]}`;
  sufixo += ouro ? ` +${ouro} ouro` : "";
  sufixo += exp ? ` +${exp} exp` : "";
  sufixo += ")";

  if ((tier === "excelente" || tier === "bom") && ef.itemPossivel) {
    const chance = tier === "excelente" ? 0.85 : 0.4;
    if (rnd() < chance) {
      const itemCard = DATA.cards.find((c) => c.id === ef.itemPossivel);
      if (itemCard) {
        obterItem(itemCard);
        sufixo += ` Você também ganhou ${itemCard.efeito.nomeItem || itemCard.nome}.`;
      }
    }
  }
  if (tier === "fracasso" && ef.custoFalha) {
    const perda = Math.max(0, Math.min(state.hero.vida - 1, ef.custoFalha));
    if (perda > 0) {
      state.hero.vida -= perda;
      sufixo += ` (-${perda} vida)`;
    }
  }

  addStory(`${pickStoryLine(card)}${sufixo}`, card.cor);
  if (ef.contadorTag) state.tags[ef.contadorTag] = (state.tags[ef.contadorTag] || 0) + 1;

  document.body.classList.remove("in-minigame");
  document.getElementById("modalRoot").innerHTML = "";
  state.minigame = null;

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
}

// ---------- 🎯 Arquearia: acertar alvos em movimento ----------
function setupArquearia(box) {
  const DURACAO = 9000;
  let hits = 0;
  let misses = 0;
  const inicio = Date.now();

  box.innerHTML = `
    <h2>🎯 Arquearia</h2>
    <p class="sub">Clique nos alvos assim que surgirem. Você tem 9 segundos.</p>
    <div class="mg-hud"><span id="mgScore">Acertos: 0</span><span id="mgTime">9.0s</span></div>
    <div class="mg-field" id="mgField"></div>`;

  const field = document.getElementById("mgField");
  const scoreEl = document.getElementById("mgScore");
  const timeEl = document.getElementById("mgTime");

  function spawnAlvo() {
    if (!state.minigame) return;
    field.innerHTML = "";
    const alvo = document.createElement("div");
    alvo.className = "mg-target";
    alvo.textContent = "🎯";
    alvo.style.left = `${rndInt(4, 88)}%`;
    alvo.style.top = `${rndInt(8, 72)}%`;
    alvo.addEventListener("click", () => {
      hits++;
      scoreEl.textContent = `Acertos: ${hits}`;
      alvo.remove();
      spawnAlvo();
    });
    field.appendChild(alvo);
    mgTimer(() => {
      if (alvo.parentNode) { misses++; alvo.remove(); spawnAlvo(); }
    }, 900);
  }
  spawnAlvo();

  mgInterval(() => {
    const restante = Math.max(0, DURACAO - (Date.now() - inicio));
    timeEl.textContent = `${(restante / 1000).toFixed(1)}s`;
    if (restante <= 0) {
      let tier = "fracasso";
      if (hits >= 7) tier = "excelente";
      else if (hits >= 5) tier = "bom";
      else if (hits >= 2) tier = "regular";
      finalizarMinigame(tier);
    }
  }, 100);
}

// ---------- 🔐 Arrombamento: memorizar e repetir a sequência ----------
function setupArrombamento(box) {
  const SIMBOLOS = ["🔺", "🔷", "⭐", "🔶", "⬛"];
  let estagio = 0; // estágios completos
  const MAX_ESTAGIOS = 3;

  box.innerHTML = `
    <h2>🔐 Arrombamento</h2>
    <p class="sub">Observe a sequência, depois repita clicando na mesma ordem.</p>
    <div class="mg-hud"><span id="mgScore">Etapa: 1 / ${MAX_ESTAGIOS}</span></div>
    <div class="mg-locksymbols" id="mgSymbols"></div>
    <div class="mg-status" id="mgStatus">Memorize...</div>`;

  const symHost = document.getElementById("mgSymbols");
  const statusEl = document.getElementById("mgStatus");
  const scoreEl = document.getElementById("mgScore");

  symHost.innerHTML = SIMBOLOS.map((s, i) => `<div class="mg-symbol" data-i="${i}">${s}</div>`).join("");
  const symEls = [...symHost.querySelectorAll(".mg-symbol")];

  function rodada() {
    const tamanho = 2 + estagio; // cresce a cada etapa
    const seq = Array.from({ length: tamanho }, () => rndInt(0, SIMBOLOS.length - 1));
    let i = 0;
    statusEl.textContent = "Memorize...";
    symEls.forEach((el) => (el.style.pointerEvents = "none"));

    function mostrarProximo() {
      if (i >= seq.length) {
        mgTimer(() => {
          statusEl.textContent = "Sua vez! Repita a sequência.";
          symEls.forEach((el) => (el.style.pointerEvents = "auto"));
          aguardarInput(seq);
        }, 400);
        return;
      }
      const el = symEls[seq[i]];
      el.classList.add("lit");
      mgTimer(() => {
        el.classList.remove("lit");
        i++;
        mgTimer(mostrarProximo, 220);
      }, 480);
    }
    mgTimer(mostrarProximo, 500);
  }

  function aguardarInput(seq) {
    let progresso = 0;
    symEls.forEach((el) => {
      const handler = () => {
        if (parseInt(el.dataset.i) === seq[progresso]) {
          el.classList.add("correct");
          mgTimer(() => el.classList.remove("correct"), 250);
          progresso++;
          if (progresso === seq.length) {
            symEls.forEach((e) => (e.onclick = null, e.style.pointerEvents = "none"));
            estagio++;
            scoreEl.textContent = `Etapa: ${Math.min(estagio + 1, MAX_ESTAGIOS)} / ${MAX_ESTAGIOS}`;
            if (estagio >= MAX_ESTAGIOS) {
              statusEl.textContent = "Fechadura aberta!";
              mgTimer(() => finalizarMinigame("excelente"), 500);
            } else {
              mgTimer(rodada, 700);
            }
          }
        } else {
          el.classList.add("wrong");
          symEls.forEach((e) => (e.onclick = null, e.style.pointerEvents = "none"));
          statusEl.textContent = "Ordem errada...";
          const tier = estagio >= 2 ? "bom" : estagio >= 1 ? "regular" : "fracasso";
          mgTimer(() => finalizarMinigame(tier), 600);
        }
      };
      el.onclick = handler;
    });
  }

  rodada();
}

// ---------- ⚒ Forja: acertar o momento certo do golpe ----------
function setupForja(box) {
  const TOTAL_GOLPES = 3;
  let golpe = 0;
  let somaPrecisao = 0;
  let pos = 0;
  let dir = 1;

  box.innerHTML = `
    <h2>⚒ Forja</h2>
    <p class="sub">Clique em "Bater!" quando o marcador estiver na zona quente.</p>
    <div class="mg-hud"><span id="mgScore">Golpe: 1 / ${TOTAL_GOLPES}</span></div>
    <div class="mg-forgebar"><div class="mg-forgezone"></div><div class="mg-forgemarker" id="mgMarker"></div></div>
    <button class="btn-primary" id="mgHitBtn">🔨 Bater!</button>`;

  const marker = document.getElementById("mgMarker");
  const scoreEl = document.getElementById("mgScore");
  const btn = document.getElementById("mgHitBtn");

  mgInterval(() => {
    pos += dir * 3.2;
    if (pos >= 100) { pos = 100; dir = -1; }
    if (pos <= 0) { pos = 0; dir = 1; }
    marker.style.left = `${pos}%`;
  }, 16);

  btn.addEventListener("click", () => {
    // zona quente fica entre 42% e 58% — precisão = distância até o centro (50%)
    const dist = Math.abs(pos - 50);
    const precisao = Math.max(0, 1 - dist / 50);
    somaPrecisao += precisao;
    golpe++;
    scoreEl.textContent = `Golpe: ${Math.min(golpe + 1, TOTAL_GOLPES)} / ${TOTAL_GOLPES}`;
    marker.classList.add(precisao > 0.75 ? "mg-hit-great" : precisao > 0.4 ? "mg-hit-ok" : "mg-hit-bad");
    mgTimer(() => marker.classList.remove("mg-hit-great", "mg-hit-ok", "mg-hit-bad"), 300);

    if (golpe >= TOTAL_GOLPES) {
      btn.disabled = true;
      const media = somaPrecisao / TOTAL_GOLPES;
      let tier = "fracasso";
      if (media > 0.8) tier = "excelente";
      else if (media > 0.55) tier = "bom";
      else if (media > 0.3) tier = "regular";
      mgTimer(() => finalizarMinigame(tier), 400);
    }
  });
}

// ---------- 🎭 Persuasão: escolher a melhor resposta sob pressão ----------
function setupPersuasao(box) {
  const OPCOES = [
    { texto: "Apelar à razão e aos fatos.", qualidade: "excelente" },
    { texto: "Oferecer algo em troca.", qualidade: "bom" },
    { texto: "Insistir e elevar a voz.", qualidade: "regular" },
  ].sort(() => rnd() - 0.5);

  let resolvido = false;
  const DURACAO = 6000;
  const inicio = Date.now();

  box.innerHTML = `
    <h2>🎭 Persuasão</h2>
    <p class="sub">Escolha sua abordagem antes que o tempo acabe.</p>
    <div class="mg-timerbar"><div class="mg-timerfill" id="mgTimerFill"></div></div>
    <div class="mg-choices" id="mgChoices">
      ${OPCOES.map((o, i) => `<button class="mg-choice-btn" data-i="${i}">${o.texto}</button>`).join("")}
    </div>`;

  const fill = document.getElementById("mgTimerFill");
  document.getElementById("mgChoices").querySelectorAll(".mg-choice-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (resolvido) return;
      resolvido = true;
      finalizarMinigame(OPCOES[parseInt(btn.dataset.i)].qualidade);
    });
  });

  mgInterval(() => {
    const restante = Math.max(0, DURACAO - (Date.now() - inicio));
    fill.style.width = `${(restante / DURACAO) * 100}%`;
    if (restante <= 0 && !resolvido) {
      resolvido = true;
      finalizarMinigame("fracasso");
    }
  }, 50);
}

function onCardClick(cardId) {
  if (state.gameOver || state.battle || state.minigame) return;
  const card = state.currentCards.find((c) => c.id === cardId);
  if (!card) return;
  const alternativas = state.currentCards.filter((c) => c.id !== cardId);

  // chefes e subchefes viram combate em turnos; inimigos comuns e elites
  // continuam resolvendo instantaneamente, como sempre. Chefes que carregam
  // um final da história não recebem mais um aviso especial de "sem volta"
  // — a decisão de aceitar aquele final ou continuar a run acontece depois
  // da vitória, em showFinalChoiceModal().
  if (card.tipo === "chefe") {
    iniciarBatalha(card, alternativas);
    return;
  }

  if (card.efeito.tipo === "escolha") {
    showChoiceModal(card, alternativas);
    return;
  }

  if (card.efeito.tipo === "minigame") {
    iniciarMinigame(card, alternativas);
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
    tickBuffs();

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

    ${(h.buffsAtivos && h.buffsAtivos.length) ? `
    <div class="buff-row">
      ${h.buffsAtivos.map((b) => `<span class="buff-chip">${b.stat} ${b.valor >= 0 ? "+" : ""}${b.valor} · ${b.turnosRestantes}t</span>`).join("")}
    </div>` : ""}

    <div class="hero-section-title">Equipamentos</div>
    <div class="equip-list">${equipHtml}</div>

    <div class="hero-section-title">Mochila</div>
    <div class="empty-note codex-link" onclick="showInventoryModal()">${h.inventario.filter((i) => i.tipo === "consumivel").reduce((s, i) => s + i.quantidade, 0)} consumíveis, ${h.inventario.filter((i) => i.tipo === "equipamento").length} em reserva — abrir Mochila ›</div>

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

/* ============================================================
   PRÉVIA DE CUSTO/GANHO NAS CARTAS
   Antes de clicar, o jogador precisa ter uma ideia razoável do que está
   em jogo: quanto ouro/exp pode ganhar, quanto pode perder de vida, que
   status um item concede. Isso não substitui a surpresa da narrativa —
   os números continuam sendo faixas/estimativas, não garantias exatas
   (sorte, fase da campanha e crítico ainda alteram o resultado final).
   ============================================================ */
function formatStatDelta(delta) {
  const labels = { ataque: "⚔ atq", defesa: "🛡 def", velocidade: "🏃 vel", vidaMax: "❤️ vida máx.", manaMax: "✨ mana máx." };
  return Object.entries(delta || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${v > 0 ? "+" : ""}${v} ${labels[k] || k}`);
}

function buildCardPreview(card) {
  const ef = card.efeito;
  const chips = [];
  const push = (text, cls) => chips.push({ text, cls: cls || "chip-neutral" });
  if (!ef) return chips;

  switch (ef.tipo) {
    case "combate": {
      const eliteMult = card.elite ? 1.4 : 1;
      if (ef.ouroDrop) {
        const gMin = Math.round(ef.ouroDrop[0] * eliteMult);
        const gMax = Math.round(ef.ouroDrop[1] * eliteMult);
        push(`💰 +${gMin}~${gMax} ouro`, "chip-pos");
      }
      if (ef.expDrop) push(`✨ +${Math.round(ef.expDrop * eliteMult)} exp`, "chip-pos");

      // estimativa de risco com os status atuais do herói — não é uma
      // promessa exata (sorte e crítico existem), mas dá uma noção real
      // do custo em vida antes de clicar.
      const dificuldade = typeof currentFase === "function" ? currentFase().dificuldade : 1;
      const vidaInimigo = Math.round((ef.vidaInimigo || 1) * dificuldade * eliteMult);
      const ataqueInimigo = Math.round((ef.ataqueInimigo || 0) * (1 + (dificuldade - 1) * 0.6) * (card.elite ? 1.15 : 1));
      const dmgHeroi = Math.max(1, getAtaque() - (ef.defesaInimigo || 0));
      const dmgInimigo = Math.max(1, ataqueInimigo - getDefesa());
      const rounds = Math.max(1, Math.ceil(vidaInimigo / dmgHeroi));
      const riscoVida = dmgInimigo * rounds;
      const riscoPct = riscoVida / Math.max(1, getVidaMax());
      const riscoCls = riscoPct > 0.55 ? "chip-risk-alto" : riscoPct > 0.22 ? "chip-risk" : "chip-neutral";
      push(`❤️ risco ~${riscoVida} vida`, riscoCls);
      break;
    }
    case "item": {
      if (ef.custoOuro) push(`💰 -${ef.custoOuro} ouro`, "chip-neg");
      if (ef.cura) push(`❤️ +${ef.cura} vida`, "chip-pos");
      formatStatDelta(ef.bonus).forEach((t) => push(t, "chip-pos"));
      if (!ef.custoOuro && !ef.cura && !ef.bonus) push("🎁 item gratuito", "chip-pos");
      break;
    }
    case "npc": {
      if (ef.ouro) push(`💰 +${ef.ouro[0]}~${ef.ouro[1]} ouro`, "chip-pos");
      if (ef.expChance) push(`✨ até +${ef.expChance} exp (50%)`, "chip-neutral");
      break;
    }
    case "recompensa_leve": {
      if (ef.ouro && (ef.ouro[0] || ef.ouro[1])) push(`💰 +${ef.ouro[0]}~${ef.ouro[1]} ouro`, "chip-pos");
      if (ef.exp) push(`✨ +${ef.exp} exp`, "chip-pos");
      if (ef.cura) push(`❤️ +${ef.cura} vida`, "chip-pos");
      break;
    }
    case "personagem": {
      if (ef.relacao) push(`💜 ${ef.relacao > 0 ? "+" : ""}${ef.relacao} relação`, ef.relacao > 0 ? "chip-pos" : "chip-neg");
      if (ef.exp) push(`✨ +${ef.exp} exp`, "chip-pos");
      if (ef.cura) push(`❤️ +${ef.cura} vida`, "chip-pos");
      break;
    }
    case "misterio": {
      // agrega os possíveis resultados para dar uma pista do leque de
      // ganho/perda sem entregar qual vai acontecer.
      const resultados = ef.resultados || [];
      const temRisco = resultados.some((r) => r.vida || r.sub === "dano");
      const temGanho = resultados.some((r) => (r.ouro && r.ouro[1] > 0) || r.exp || r.sub === "item");
      push("🎲 resultado incerto", "chip-neutral");
      if (temGanho) push("↑ chance de bônus", "chip-pos");
      if (temRisco) push("↓ chance de perda", "chip-neg");
      break;
    }
    case "escolha": {
      const opcoes = ef.opcoes || [];
      push(`💬 ${opcoes.length} caminhos possíveis`, "chip-neutral");
      const temRisco = opcoes.some((o) => o.dano);
      const temBuild = opcoes.some((o) => o.statDelta);
      if (temRisco) push("⚠ alguma opção arrisca vida", "chip-risk");
      if (temBuild) push("📈 pode moldar seu build", "chip-pos");
      break;
    }
    case "mudar_regiao":
      push("🧭 viagem", "chip-neutral");
      break;
    case "escola":
      push("📚 ensinamento", "chip-neutral");
      break;
    default:
      break;
  }
  return chips;
}

function renderCards() {
  const el = document.getElementById("cardsFooter");
  el.innerHTML = state.currentCards
    .map((c) => {
      const isNew = !state.tree.some((n) => n.nome === c.nome);
      const isEscolha = c.efeito && c.efeito.tipo === "escolha";
      const isMinigame = c.efeito && c.efeito.tipo === "minigame";
      const isFinal = !!(c.efeito && c.efeito.flagFinal);
      const desc = isEscolha ? (c.efeito.intro || c.historia[0]) : c.historia[0];
      const preview = buildCardPreview(c);
      const classes = [
        "game-card", "entering", `card-rarity-${c.raridade}`,
        isEscolha ? "card-escolha" : "",
        isMinigame ? "card-minigame" : "",
        c.elite ? "card-elite" : "",
        isFinal ? "card-final" : "",
      ].filter(Boolean).join(" ");
      return `
      <div class="${classes}" data-id="${c.id}" onclick="onCardClick('${c.id}')">
        <div class="card-top">
          <span class="card-emoji">${c.emoji}</span>
          <span class="card-rarity rarity-${c.raridade}">${RARITY_LABEL[c.raridade]}</span>
        </div>
        ${isNew ? '<span class="card-new">NOVO</span>' : ""}
        ${isEscolha ? '<span class="card-choice-tag">💬 Decisão</span>' : ""}
        ${isMinigame ? '<span class="card-minigame-tag">⚡ Desafio</span>' : ""}
        ${c.elite ? '<span class="card-elite-tag">⚔ Especial</span>' : ""}
        ${isFinal ? '<span class="card-final-tag">👑 Chefe Final</span>' : ""}
        <div class="card-name">${c.nome}</div>
        <div class="card-type">${c.tipo}</div>
        <div class="card-desc">${desc}</div>
        ${preview.length ? `<div class="card-cost">${preview.map((p) => `<span class="cost-chip ${p.cls}">${p.text}</span>`).join("")}</div>` : ""}
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
  if (!state.battle && !state.minigame) saveGame();
}

/* ============================================================
   MODAIS
   ============================================================ */
/* ============================================================
   TELA INICIAL
   Primeira coisa que o jogador vê ao abrir o jogo (ou ao voltar pelo botão
   de menu). Mostra se há uma aventura em andamento para continuar, um
   atalho para começar uma nova, e as últimas conquistas registradas.
   ============================================================ */
function peekSave() {
  try {
    const raw = localStorage.getItem("chronicles_save");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.gameOver) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function showTitleScreen() {
  const root = document.getElementById("modalRoot");
  const save = peekSave();
  const historico = getRunHistory().slice(0, 6);

  root.innerHTML = `
    <div class="modal-overlay title-overlay">
      <div class="modal-box title-box">
        <div class="title-logo">⚜</div>
        <h1 class="title-heading">CHRONICLES</h1>
        <p class="sub title-tagline">Uma aventura procedural onde cada escolha reescreve a história.</p>

        <div class="title-actions">
          ${save ? `<button class="btn-primary" id="btnContinueTitle">▶ Continuar — ${save.hero.nome} (Nv. ${save.hero.nivel})</button>` : ""}
          <button class="${save ? "btn-secondary" : "btn-primary"}" id="btnNewTitle">✨ Nova Aventura</button>
        </div>

        <div class="title-history">
          <div class="hero-section-title" style="text-align:center;">🏆 Últimas Conquistas</div>
          ${
            historico.length
              ? `<div class="history-list">
                  ${historico
                    .map(
                      (h) => `
                    <div class="history-item">
                      <span class="history-emoji">${h.endingEmoji}</span>
                      <div class="history-info">
                        <div class="history-title">${h.endingTitulo}</div>
                        <div class="history-meta">${h.classeEmoji} ${h.heroNome} · Nv.${h.nivel} · ${h.turno} turnos · ${h.ouro} ouro</div>
                      </div>
                      <span class="history-date">${new Date(h.data).toLocaleDateString("pt-BR")}</span>
                    </div>`
                    )
                    .join("")}
                </div>`
              : `<p class="empty-note" style="text-align:center;">Nenhuma aventura concluída ainda — suas conquistas vão aparecer aqui.</p>`
          }
        </div>
      </div>
    </div>`;

  const contBtn = document.getElementById("btnContinueTitle");
  if (contBtn) {
    contBtn.addEventListener("click", () => {
      root.innerHTML = "";
      if (loadGame() && !state.gameOver) renderAll();
      else showClassSelectModal();
    });
  }
  document.getElementById("btnNewTitle").addEventListener("click", () => {
    localStorage.removeItem("chronicles_save");
    root.innerHTML = "";
    showClassSelectModal();
  });
}

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

function showInventoryModal() {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-overlay" id="invOverlay">
      <div class="modal-box codex-box" id="inventoryModalRoot">
        ${inventoryModalContent()}
      </div>
    </div>`;
  bindInventoryModalEvents();
  document.getElementById("invOverlay").addEventListener("click", (e) => {
    if (e.target.id === "invOverlay") root.innerHTML = "";
  });
}

function inventoryModalContent() {
  const h = state.hero;
  const equipHtml = ["arma", "armadura", "acessorio"]
    .map((slot) => {
      const it = h.equipamentos[slot];
      if (!it) return `<div class="inv-item"><span class="slot">${slot}</span><span class="empty-note">vazio</span></div>`;
      const bonusTxt = Object.entries(it.bonus || {}).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(", ");
      return `<div class="inv-item"><span class="slot">${slot}</span><span>${it.emoji || "🎒"} ${it.nome}<br><small style="color:#00E5FF">${bonusTxt}</small></span></div>`;
    })
    .join("");

  const reserva = state.hero.inventario.filter((it) => it.tipo === "equipamento");
  const reservaHtml = reserva.length
    ? reserva
        .map((it) => {
          const bonusTxt = Object.entries(it.bonus || {}).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(", ");
          return `<div class="inv-item inv-item-actionable" onclick="equiparDaMochila('${it.itemId}')">
            <span class="slot">${it.slot}</span>
            <span>${it.emoji} ${it.nome}<br><small style="color:#00E5FF">${bonusTxt}</small></span>
            <span class="inv-swap-hint">trocar ›</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-note">Nenhum equipamento de reserva.</div>`;

  const consumiveis = state.hero.inventario.filter((it) => it.tipo === "consumivel");
  const consumHtml = consumiveis.length
    ? consumiveis
        .map(
          (it) => `<div class="inv-item inv-item-actionable" onclick="usarItemDaMochila('${it.itemId}')">
            <span>${it.emoji} ${it.nome}</span>
            <span class="item-qty">x${it.quantidade}</span>
            <span class="inv-swap-hint">usar ›</span>
          </div>`
        )
        .join("")
    : `<div class="empty-note">Mochila sem consumíveis.</div>`;

  return `
    <h2>🎒 Mochila</h2>
    <p class="sub">Tudo que ${h.nome} carrega nesta jornada.</p>

    <div class="codex-section-title">Equipados</div>
    <div class="equip-list">${equipHtml}</div>

    <div class="codex-section-title">Reserva de Equipamentos</div>
    <div class="equip-list">${reservaHtml}</div>

    <div class="codex-section-title">Consumíveis</div>
    <div class="equip-list">${consumHtml}</div>

    <button class="btn-primary" id="btnCloseInventory" style="margin-top:18px;">Fechar</button>
  `;
}

function bindInventoryModalEvents() {
  const btn = document.getElementById("btnCloseInventory");
  if (btn) btn.addEventListener("click", () => (document.getElementById("modalRoot").innerHTML = ""));
}

// usar um consumível a partir da mochila, fora de batalha — cura na hora
function usarItemDaMochila(itemId) {
  const ok = usarConsumivel(itemId);
  if (!ok) return;
  renderHero();
  const wrap = document.getElementById("inventoryModalRoot");
  if (wrap) { wrap.innerHTML = inventoryModalContent(); bindInventoryModalEvents(); }
}

/* ============================================================
   HISTÓRICO DE CONQUISTAS
   Cada vez que uma run termina (morte ou final aceito), guarda um resumo
   permanente em localStorage — separado do autosave, que é sobrescrito a
   cada partida. É o que alimenta a tela inicial.
   ============================================================ */
const HISTORY_KEY = "chronicles_history";
const HISTORY_MAX = 30;

function getRunHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function recordRunHistory(ending) {
  try {
    const historico = getRunHistory();
    const classeInfo = DATA.classes.find((c) => c.id === state.hero.classeId);
    historico.unshift({
      data: Date.now(),
      heroNome: state.hero.nome,
      classeNome: classeInfo ? classeInfo.nome : state.hero.classeId,
      classeEmoji: state.hero.emoji,
      nivel: state.hero.nivel,
      ouro: state.hero.ouro,
      turno: state.turno,
      descobertas: state.descobertos.size,
      endingId: ending.id,
      endingTitulo: ending.titulo,
      endingEmoji: ending.emoji,
      seed: state.seed,
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historico.slice(0, HISTORY_MAX)));
  } catch (e) { /* ignora erros de storage */ }
}

function showEndingModal(ending) {
  recordRunHistory(ending);
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
        <button class="btn-secondary" id="btnBackTitle" style="margin-top:10px;">🏠 Voltar ao Menu</button>
      </div>
    </div>`;
  document.getElementById("btnRestart").addEventListener("click", () => {
    localStorage.removeItem("chronicles_save");
    root.innerHTML = "";
    showClassSelectModal();
  });
  document.getElementById("btnBackTitle").addEventListener("click", () => {
    localStorage.removeItem("chronicles_save");
    root.innerHTML = "";
    showTitleScreen();
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
    if (!state.hero.inventario) state.hero.inventario = [];
    if (!state.hero.buffsAtivos) state.hero.buffsAtivos = [];
    state.battle = null; // nunca retoma no meio de uma batalha após recarregar a página
    state.minigame = null; // idem para mini-games
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
  if (state && (state.battle || state.minigame)) return; // trava de segurança: nunca durante uma batalha ou mini-game
  localStorage.removeItem("chronicles_save");
  document.getElementById("modalRoot").innerHTML = "";
  showClassSelectModal();
});

document.getElementById("btnCodex").addEventListener("click", () => {
  if (!state || state.battle || state.minigame) return;
  showCodexModal();
});

document.getElementById("btnInventory").addEventListener("click", () => {
  if (!state || state.battle || state.minigame) return;
  showInventoryModal();
});

document.getElementById("btnMenu").addEventListener("click", () => {
  if (state && (state.battle || state.minigame)) return; // trava de segurança: nunca durante batalha ou mini-game
  showTitleScreen();
});

// Interface Viva: partículas ambiente que rodam o tempo todo, com ou sem
// clima ativo — a tela nunca deve parecer parada (GDD "Melhoria Geral da
// Interface"). Baixa frequência de propósito, pra não competir visualmente
// com o clima de verdade quando ele estiver ativo.
function spawnFirefly() {
  const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const el = document.createElement("div");
  el.className = "firefly";
  el.style.left = `${ri(2, 96)}vw`;
  el.style.top = `${ri(30, 92)}vh`;
  el.style.setProperty("--dx", `${ri(-40, 40)}px`);
  el.style.setProperty("--dy", `${ri(-60, -10)}px`);
  el.style.setProperty("--dx2", `${ri(-60, 60)}px`);
  el.style.setProperty("--dy2", `${ri(-140, -60)}px`);
  el.style.animationDuration = `${ri(7, 12)}s`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 12000);
}
function spawnDustMote() {
  const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const el = document.createElement("div");
  el.className = "dust-mote";
  el.style.left = `${ri(0, 100)}vw`;
  el.style.top = "100vh";
  el.style.animationDuration = `${ri(14, 24)}s`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 24000);
}
function startAmbientParticles() {
  setInterval(spawnFirefly, 2600);
  setInterval(spawnDustMote, 1800);
}

(async function init() {
  const ok = await loadData();
  if (!ok) return;

  startAmbientParticles();
  showTitleScreen();
})();