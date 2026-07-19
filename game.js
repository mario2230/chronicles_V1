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
    },
    tags: {},
    itensObtidos: new Set(),
    derrotados: new Set(),
    descobertos: new Set(),
    regioesVisitadas: new Set(["aldeia"]),
    recentDrawn: [],
    availableCardIds: new Set(DATA.cards.filter((c) => c.inicial).map((c) => c.id)),
    tree: [],
    story: [],
    capituloAtual: 0,
    personagens: {}, // charId -> { relacao: number, memorias: string[] }
    activeEvent: null,
    activeEventTurnsLeft: 0,
    currentCards: [],
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

function cardIsValid(card) {
  if (card.oculta) return false;
  if (!state.availableCardIds.has(card.id)) return false;
  if (card.minNivel && state.hero.nivel < card.minNivel) return false;
  if (card.regiaoOrigem && !card.regiaoOrigem.includes(state.regiao)) return false;
  if (card.tipo === "chefe" && state.derrotados.has(card.id)) return false;
  if (card.tipo === "artefato" && state.itensObtidos.has(card.id)) return false;
  if (card.condicao) {
    if (card.condicao.tag && (state.tags[card.condicao.tag] || 0) < card.condicao.minimo) return false;
    if (card.condicao.itemRequerido && !state.itensObtidos.has(card.condicao.itemRequerido)) return false;
  }
  return true;
}

function computeWeight(card) {
  let w = card.weight || 1;
  w *= rarityMultiplier(state.hero.nivel, card.raridade);

  // anti-repetição: penaliza cartas vistas recentemente
  const recentIdx = state.recentDrawn.indexOf(card.id);
  if (recentIdx !== -1) {
    w *= 0.08 + recentIdx * 0.03;
  }

  // incentivo à descoberta
  if (!state.descobertos.has(card.id)) w *= 1.6;

  // evento global ativo
  if (state.activeEvent) {
    const mod = state.activeEvent.modificadores;
    if (mod.tipo && mod.tipo === card.tipo) w *= mod.multiplicador;
    if (mod.regiao && card.regiaoOrigem && card.regiaoOrigem.includes(mod.regiao)) w *= mod.multiplicador;
    if (mod.raridade && mod.raridade.includes(card.raridade)) w *= mod.multiplicador;
  }

  return Math.max(0.001, w);
}

function drawThreeCards() {
  const pool = DATA.cards.filter(cardIsValid);
  const chosen = [];
  const workingPool = pool.map((c) => ({ card: c, w: computeWeight(c) }));

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

  // fallback: se não houver cartas suficientes no contexto atual, permite cartas de local de qualquer região
  while (chosen.length < 3) {
    const fallback = DATA.cards.find(
      (c) => c.tipo === "local" && state.availableCardIds.has(c.id) && !chosen.includes(c)
    );
    if (!fallback) break;
    chosen.push(fallback);
  }

  state.currentCards = chosen;
  state.recentDrawn = [...chosen.map((c) => c.id), ...state.recentDrawn].slice(0, 8);
  chosen.forEach((c) => state.descobertos.add(c.id));
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
    .replace(/(\+\d+\s?(ouro|exp|vida))/gi, '<b class="story-pos">$1</b>')
    .replace(/(-\d+\s?(ouro|exp|vida))/gi, '<b class="story-neg">$1</b>');
}

/* ============================================================
   PERSONAGENS — relacionamento e memória
   ============================================================ */
function getRelacao(charId) {
  if (!state.personagens[charId]) {
    state.personagens[charId] = { relacao: 0, memorias: [] };
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
  }
}

function resolverPersonagem(card) {
  const ef = card.efeito;
  const personagem = DATA.characters && DATA.characters.find((p) => p.id === ef.personagemId);
  const nomeExibicao = personagem ? `${personagem.emoji} ${personagem.nome}` : card.nome;

  addStory(`${nomeExibicao} — ${pickRandom(card.historia)}`, card.cor);

  if (ef.relacao) ajustarRelacao(ef.personagemId, ef.relacao, pickRandom(card.historia));
  else getRelacao(ef.personagemId); // garante que o personagem passe a ser "conhecido"

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
  state.hero.vida = Math.min(getVidaMax(), state.hero.vida + qtd);
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
  let vidaInimigo = ef.vidaInimigo;
  let ataqueInimigo = ef.ataqueInimigo;
  const defesaInimigo = ef.defesaInimigo;

  if (state.activeEvent && state.activeEvent.modificadores.buffInimigoAtaque) {
    const mod = state.activeEvent.modificadores;
    if ((mod.regiao && card.regiaoOrigem.includes(mod.regiao)) || (mod.tipo && mod.tipo === card.tipo)) {
      ataqueInimigo += mod.buffInimigoAtaque;
    }
  }

  let rounds = 0;
  while (vidaInimigo > 0 && state.hero.vida > 0 && rounds < 60) {
    rounds++;
    const sorteHeroi = rndInt(-2, 3);
    const dmgHeroi = Math.max(1, getAtaque() - defesaInimigo + sorteHeroi);
    vidaInimigo -= dmgHeroi;
    if (vidaInimigo <= 0) break;

    const sorteInimigo = rndInt(-2, 2);
    const dmgInimigo = Math.max(1, ataqueInimigo - getDefesa() + sorteInimigo);
    state.hero.vida -= dmgInimigo;
  }

  if (state.hero.vida <= 0) {
    state.hero.vida = 0;
    addStory(`💀 Você foi derrotado por ${card.nome}.`, "vermelho");
    return;
  }

  const ouro = rndInt(ef.ouroDrop[0], ef.ouroDrop[1]);
  state.hero.ouro += ouro;
  ganharExp(ef.expDrop);
  addStory(`${pickRandom(card.historia)} (+${ouro} ouro, +${ef.expDrop} exp)`, card.cor);

  if (ef.contadorTag) state.tags[ef.contadorTag] = (state.tags[ef.contadorTag] || 0) + 1;
  if (card.tipo === "chefe") state.derrotados.add(card.id);

  if (ef.itemGarantido) {
    const itemCard = DATA.cards.find((c) => c.id === ef.itemGarantido);
    if (itemCard) obterItem(itemCard);
  }
  if (ef.flagFinal) state.tags["flag_" + ef.flagFinal] = true;
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
    addStory(`${pickRandom(card.historia)} (+${ouro} ouro)`, card.cor);
  } else if (escolhido.sub === "item") {
    obterItem(card, escolhido.bonus, escolhido.nomeItem);
    addStory(pickRandom(card.historia), card.cor);
  } else if (escolhido.sub === "dano") {
    state.hero.vida = Math.max(0, state.hero.vida - escolhido.vida);
    addStory(`${pickRandom(card.historia)} (-${escolhido.vida} vida)`, "vermelho");
  }
}

function resolveCard(card, alternativas) {
  addTreeNode(card, alternativas);
  const ef = card.efeito;

  switch (ef.tipo) {
    case "mudar_regiao":
      state.regiao = ef.regiao;
      state.regioesVisitadas.add(ef.regiao);
      addChapter(ef.regiao);
      addStory(pickRandom(card.historia), card.cor);
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
      addStory(pickRandom(card.historia), card.cor);
      break;
    case "npc":
      if (ef.ouro) {
        const g = rndInt(ef.ouro[0], ef.ouro[1]);
        state.hero.ouro += g;
        addStory(`${pickRandom(card.historia)} (+${g} ouro)`, card.cor);
      } else {
        addStory(pickRandom(card.historia), card.cor);
      }
      if (ef.expChance && rndInt(1, 100) <= 50) ganharExp(ef.expChance);
      break;
    case "recompensa_leve":
      if (ef.ouro) state.hero.ouro += rndInt(ef.ouro[0], ef.ouro[1]);
      if (ef.exp) ganharExp(ef.exp);
      if (ef.cura) curar(ef.cura);
      addStory(pickRandom(card.historia), card.cor);
      break;
    case "misterio":
      resolverMisterio(card);
      break;
    default:
      addStory(pickRandom(card.historia), card.cor);
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

  document.querySelectorAll(".game-card").forEach((el) => {
    if (el.dataset.id !== cardId) el.style.pointerEvents = "none";
  });
  const clickedEl = document.querySelector(`.game-card[data-id="${cardId}"]`);
  if (clickedEl) {
    clickedEl.classList.add("leaving");
    spawnCardBurst(clickedEl, card.cor);
  }

  setTimeout(() => {
    state.turno++;
    resolveCard(card, alternativas);
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
      const novaClasse = i === last ? "story-entry-new" : "";
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
      return `
      <div class="game-card entering card-rarity-${c.raridade}" data-id="${c.id}" onclick="onCardClick('${c.id}')">
        <div class="card-top">
          <span class="card-emoji">${c.emoji}</span>
          <span class="card-rarity rarity-${c.raridade}">${RARITY_LABEL[c.raridade]}</span>
        </div>
        ${isNew ? '<span class="card-new">NOVO</span>' : ""}
        <div class="card-name">${c.nome}</div>
        <div class="card-type">${c.tipo}</div>
        <div class="card-desc">${c.historia[0]}</div>
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
