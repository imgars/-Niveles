// ============================================================================
//  🔫 BUCKSHOT ROULETTE — Minijuego para Discord (reemplaza a la Ruleta Rusa)
//  - Embed principal fijo (comando !Roulette, solo staff)
//  - Mesas de 2 a 4 jugadores con apuesta en Lagcoins (mínimo 500)
//  - Canal privado por partida (en la misma categoría del embed principal)
//  - Escopeta con cartuchos reales/fogueo + 6 ítems consumibles
//  - Embeds con efecto arcoíris animado
// ============================================================================
import fs from 'fs';
import path from 'path';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';
import { CONFIG } from '../config.js';
import { isStaff } from './helpers.js';
import db from './database.js';

// ----------------------------------------------------------------------------
//  Configuración
// ----------------------------------------------------------------------------
const MIN_BET = 500;
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const MAX_ITEMS = 8;
const TURN_MS = 60 * 1000;
const LOBBY_MS = 5 * 60 * 1000;
const CLOSE_DELAY_MS = 30 * 1000;
const SOLO_COOLDOWN_MS = 30 * 60 * 1000; // cooldown del modo contra el bot
const EVENT_TTL = 8 * 1000; // los mensajes de acciones se borran solos
const ROUND_TTL = 14 * 1000; // carga de escopeta / reparto de ítems
const AUDIT_CHANNEL_ID = CONFIG.ACTIVITY_LOG_CHANNEL_ID; // canal de logs/auditoría
const ANIM_MS = 1000;
const RESULTS_CHANNEL_ID = CONFIG.MISSION_COMPLETE_CHANNEL_ID; // 1441276918916710501

const STATE_FILE = path.join('./data', 'buckshot_state.json');
const STATS_FILE = path.join('./data', 'buckshot_stats.json');

export const ITEMS = {
  lupa: { emoji: '🔍', name: 'Lupa', desc: 'Revela en secreto el cartucho actual.' },
  cigarro: { emoji: '🚬', name: 'Cigarro', desc: 'Recuperas 1 punto de vida.' },
  sierra: { emoji: '🪚', name: 'Sierra', desc: 'El próximo disparo real hace el doble de daño.' },
  esposas: { emoji: '⛓️', name: 'Esposas', desc: 'El rival elegido pierde su próximo turno.' },
  cerveza: { emoji: '🍺', name: 'Cerveza', desc: 'Expulsa el cartucho actual sin disparar.' },
  inversor: { emoji: '🔄', name: 'Inversor', desc: 'Cambia el cartucho actual (real ⇄ fogueo).' }
};
const ITEM_IDS = Object.keys(ITEMS);

// ----------------------------------------------------------------------------
//  Utilidades
// ----------------------------------------------------------------------------
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = n => Number(n || 0).toLocaleString('es-ES');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hslToInt(h, s = 1, l = 0.55) {
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}

const RAINBOW = ['🟥', '🟧', '🟨', '🟩', '🟦', '🟪'];
function marquee(tick, len = 12) {
  let s = '';
  for (let i = 0; i < len; i++) s += RAINBOW[(i + tick) % RAINBOW.length];
  return s;
}

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`[Buckshot] Error leyendo ${file}:`, e.message);
  }
  return fallback;
}
function writeJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`[Buckshot] Error guardando ${file}:`, e.message);
  }
}

// ----------------------------------------------------------------------------
//  Estado persistente (embeds principales + apuestas retenidas) y estadísticas
// ----------------------------------------------------------------------------
const state = readJson(STATE_FILE, { mains: [], escrows: {} });
if (!Array.isArray(state.mains)) state.mains = [];
if (!state.escrows || typeof state.escrows !== 'object') state.escrows = {};
if (!state.soloCooldowns || typeof state.soloCooldowns !== 'object') state.soloCooldowns = {};
const saveState = () => writeJson(STATE_FILE, state);

const stats = readJson(STATS_FILE, {});
const saveStats = () => writeJson(STATS_FILE, stats);
function getStats(guildId, userId) {
  const key = `${guildId}-${userId}`;
  if (!stats[key]) {
    stats[key] = { wins: 0, losses: 0, streak: 0, bestStreak: 0, totalWon: 0, totalLost: 0 };
  }
  return stats[key];
}

// ----------------------------------------------------------------------------
//  Economía (se importa de forma perezosa para no acoplar la carga del módulo)
// ----------------------------------------------------------------------------
async function eco() {
  return import('./economyDB.js');
}
async function getBalance(guildId, userId) {
  const { getUserEconomy } = await eco();
  const e = await getUserEconomy(guildId, userId);
  return Number(e?.lagcoins || 0);
}
async function takeBet(guildId, userId, amount) {
  const { removeUserLagcoins } = await eco();
  const r = await removeUserLagcoins(guildId, userId, amount, 'buckshot_bet');
  return !!r;
}
// Las razones incluyen "transfer" para que NO se aplique el doble de fin de semana
async function payOut(guildId, userId, amount, reason) {
  const { addUserLagcoins } = await eco();
  return addUserLagcoins(guildId, userId, amount, reason);
}
async function isJailed(guildId, userId) {
  try {
    const { getUserJailStatus } = await eco();
    const j = await getUserJailStatus(guildId, userId);
    return !!j?.jailed;
  } catch {
    return false;
  }
}
async function logBuckshot(data) {
  try {
    const { logActivity, LOG_TYPES } = await import('./activityLogger.js');
    logActivity({ command: 'buckshot', ...data, type: data.win ? LOG_TYPES.MINIGAME_WIN : LOG_TYPES.MINIGAME_LOSS });
  } catch (e) {
    console.error('[Buckshot] Error registrando actividad:', e.message);
  }
}

// ----------------------------------------------------------------------------
//  MOTOR DEL JUEGO (lógica pura, sin Discord) — exportado para pruebas
// ----------------------------------------------------------------------------
// Registro que solo va al archivo de auditoría (secretos, orden real, etc.)
function note(g, text) {
  if (g.transcript.length < 5000) g.transcript.push({ t: Date.now(), text });
}
// Registro público: se envía como mensaje normal al canal (y queda en la auditoría)
function addLog(g, text, ttl = EVENT_TTL) {
  g.pending.push({ text, ttl });
  note(g, text);
}
const heartsBar = (hp, max) => '❤️'.repeat(Math.max(0, hp)) + '🖤'.repeat(Math.max(0, max - Math.max(0, hp)));
const alivePlayers = g => g.players.filter(p => p.hp > 0);

export function newGameState(players, bet) {
  const maxHp = rand(3, 5);
  return {
    players: shuffle(players).map(p => ({
      id: p.id,
      name: p.name,
      hp: maxHp,
      items: [],
      cuffed: false,
      timeouts: 0,
      isBot: !!p.isBot
    })),
    maxHp,
    bet,
    pot: bet * players.length,
    shells: [],
    used: [],
    loadLive: 0,
    loadBlank: 0,
    round: 0,
    turnIdx: 0,
    sawed: false,
    inverted: false,
    pending: [],
    transcript: [],
    ended: false,
    winnerId: null
  };
}

export function reloadShotgun(g) {
  g.round++;
  const total = rand(3, 8);
  let live = Math.round(total * (0.3 + Math.random() * 0.4));
  live = Math.min(total - 1, Math.max(1, live));
  g.loadLive = live;
  g.loadBlank = total - live;
  g.shells = shuffle([...Array(live).fill('live'), ...Array(total - live).fill('blank')]);
  g.used = [];
  g.sawed = false;
  g.inverted = false;

  addLog(g, `🔁 **Ronda ${g.round}** — la escopeta se carga con **${live} 🔴 reales** y **${total - live} ⚪ de fogueo** (mezclados).`, ROUND_TTL);
  note(g, `[SECRETO] Orden real de los cartuchos: ${g.shells.map(x => (x === 'live' ? 'REAL' : 'FOGUEO')).join(' > ')}`);
  const dealt = [];
  for (const p of alivePlayers(g)) {
    const n = rand(2, 3);
    const got = [];
    for (let i = 0; i < n && p.items.length < MAX_ITEMS; i++) {
      const it = ITEM_IDS[rand(0, ITEM_IDS.length - 1)];
      p.items.push(it);
      got.push(ITEMS[it].emoji);
    }
    dealt.push(`${p.name} ${got.length ? got.join('') : '—'}`);
  }
  addLog(g, `🎁 Ítems repartidos: ${dealt.join(' · ')}`, ROUND_TTL);
}

export function shoot(g, shooterIdx, targetIdx) {
  const s = g.players[shooterIdx];
  const t = g.players[targetIdx];
  const self = shooterIdx === targetIdx;
  const shell = g.shells.shift();
  g.used.push(shell);
  const wasSawed = g.sawed;
  g.sawed = false;
  let keep = false;

  if (shell === 'live') {
    const dmg = wasSawed ? 2 : 1;
    t.hp = Math.max(0, t.hp - dmg);
    addLog(g, `💥 **${s.name}** ${self ? 'se disparó a sí mismo' : `le disparó a **${t.name}**`}: ¡**REAL** 🔴! −${dmg} ❤️${wasSawed ? ' (🪚 daño doble)' : ''}`);
    addLog(g, `💔 **${t.name}**: ${heartsBar(t.hp, g.maxHp)} (${t.hp}/${g.maxHp})`);
    if (t.hp <= 0) addLog(g, `💀 **${t.name}** ha sido eliminado de la mesa.`);
  } else {
    addLog(g, `💨 **${s.name}** ${self ? 'se disparó a sí mismo' : `le disparó a **${t.name}**`}: era de **FOGUEO** ⚪.${self ? ' ¡Juega otra vez!' : ''}`);
    if (self) keep = true;
  }
  return { shell, keep };
}

export function advanceTurn(g, keep) {
  const al = alivePlayers(g);
  if (al.length <= 1) {
    g.ended = true;
    g.winnerId = al[0]?.id || null;
    return;
  }
  if (g.shells.length === 0) reloadShotgun(g);
  if (keep && g.players[g.turnIdx].hp > 0) return;

  let idx = g.turnIdx;
  for (let i = 0; i < g.players.length * 2; i++) {
    idx = (idx + 1) % g.players.length;
    const p = g.players[idx];
    if (p.hp <= 0) continue;
    if (p.cuffed) {
      p.cuffed = false;
      addLog(g, `⛓️ **${p.name}** sigue esposado y pierde su turno.`);
      continue;
    }
    g.turnIdx = idx;
    note(g, `▶️ Turno de ${p.name}`);
    return;
  }
}

export function useItemEngine(g, idx, itemId, targetIdx) {
  const p = g.players[idx];
  const pos = p.items.indexOf(itemId);
  if (pos < 0) return { ok: false, msg: 'No tienes ese ítem.' };
  let secret = null;
  let msg = '';

  switch (itemId) {
    case 'lupa': {
      const cur = g.shells[0];
      secret = `🔍 El cartucho actual es **${cur === 'live' ? 'REAL 🔴' : 'FOGUEO ⚪'}**. Guarda el secreto.`;
      addLog(g, `🔍 **${p.name}** usó la **Lupa** y miró la recámara en secreto.`);
      note(g, `[SECRETO] ${p.name} vio con la Lupa: cartucho actual = ${cur === 'live' ? 'REAL' : 'FOGUEO'}`);
      msg = 'Usaste la Lupa.';
      break;
    }
    case 'cigarro': {
      if (p.hp >= g.maxHp) return { ok: false, msg: 'Ya tienes la vida completa.' };
      p.hp++;
      addLog(g, `🚬 **${p.name}** fumó un **Cigarro** y recuperó 1 ❤️ → ${heartsBar(p.hp, g.maxHp)} (${p.hp}/${g.maxHp})`);
      msg = 'Recuperaste 1 ❤️.';
      break;
    }
    case 'sierra': {
      if (g.sawed) return { ok: false, msg: 'La escopeta ya está recortada.' };
      g.sawed = true;
      addLog(g, `🪚 **${p.name}** recortó la escopeta: el próximo disparo **real** hará **doble daño**.`);
      msg = 'Escopeta recortada.';
      break;
    }
    case 'esposas': {
      const t = g.players[targetIdx];
      if (!t || t.hp <= 0 || targetIdx === idx) return { ok: false, msg: 'Objetivo inválido.' };
      if (t.cuffed) return { ok: false, msg: `${t.name} ya está esposado.` };
      t.cuffed = true;
      addLog(g, `⛓️ **${p.name}** esposó a **${t.name}**: perderá su próximo turno.`);
      msg = `Esposaste a ${t.name}.`;
      break;
    }
    case 'cerveza': {
      const sh = g.shells.shift();
      g.used.push(sh);
      addLog(g, `🍺 **${p.name}** bebió una **Cerveza** y expulsó un cartucho ${sh === 'live' ? '**REAL** 🔴' : '**de fogueo** ⚪'}.`);
      msg = `Expulsaste un cartucho ${sh === 'live' ? 'real 🔴' : 'de fogueo ⚪'}.`;
      break;
    }
    case 'inversor': {
      g.shells[0] = g.shells[0] === 'live' ? 'blank' : 'live';
      g.inverted = true; // los conteos públicos de la ronda ya no son del todo fiables
      addLog(g, `🔄 **${p.name}** usó el **Inversor**: el cartucho actual cambió de polaridad.`);
      note(g, `[SECRETO] Tras el Inversor, el cartucho actual ahora es ${g.shells[0] === 'live' ? 'REAL' : 'FOGUEO'}`);
      msg = 'Invertiste el cartucho actual (no sabes en qué quedó… a menos que tengas Lupa).';
      break;
    }
    default:
      return { ok: false, msg: 'Ítem desconocido.' };
  }

  p.items.splice(pos, 1);
  if (g.shells.length === 0) reloadShotgun(g); // la cerveza pudo vaciar la escopeta
  return { ok: true, msg, secret };
}

export function forceTimeout(g) {
  const p = g.players[g.turnIdx];
  p.timeouts++;
  if (p.timeouts >= 2) {
    p.hp = 0;
    addLog(g, `⏱️ **${p.name}** no jugó dos veces seguidas y **abandona** la mesa.`);
    advanceTurn(g, false);
    return;
  }
  addLog(g, `⏱️ **${p.name}** tardó demasiado: ¡el gatillo se apretó solo!`);
  const { keep } = shoot(g, g.turnIdx, g.turnIdx);
  advanceTurn(g, keep);
}

export function computePayouts(g, winnerStreakBefore) {
  const participants = g.players.length;
  const pot = g.bet * participants;
  const playerBonuses = Array.from({ length: participants }, () => rand(0, 1000));
  const playerBonusTotal = playerBonuses.reduce((a, b) => a + b, 0);
  const streakBonus = winnerStreakBefore > 0 ? rand(0, 500 * winnerStreakBefore) : 0;
  return {
    pot,
    playerBonuses,
    playerBonusTotal,
    streakBonus,
    total: pot + playerBonusTotal + streakBonus
  };
}

// ----------------------------------------------------------------------------
//  Estado en memoria de Discord
// ----------------------------------------------------------------------------
let client = null;
let hue = 0;
let tick = 0;
const lobbies = new Map(); // lobbyId -> lobby
const games = new Map(); // channelId -> game
const busyUsers = new Map(); // userId -> lobbyId
const animated = new Set(); // objetos { busy, render(color, tick) }
const mainTargets = new Map(); // messageId -> objeto animado del panel principal

function startTicker() {
  setInterval(() => {
    hue = (hue + 45) % 360;
    tick = (tick + 1) % 1000;
    const color = hslToInt(hue);
    for (const target of animated) {
      if (target.busy) continue;
      target.busy = true;
      Promise.resolve(target.render(color, tick))
        .catch(() => {})
        .finally(() => { target.busy = false; });
    }
  }, ANIM_MS);
}

const currentColor = () => hslToInt(hue);

// ----------------------------------------------------------------------------
//  Embed principal
// ----------------------------------------------------------------------------
function mainEmbed(color, t = 0) {
  return {
    color,
    title: '🔫 BUCKSHOT ROULETTE 🔫',
    description:
      `${marquee(t)}\n\n` +
      '**La ruleta rusa definitiva.** Una escopeta, cartuchos **reales** 🔴 y de **fogueo** ⚪ mezclados al azar… y 6 ítems para sobrevivir.\n\n' +
      '🎲 Abre el menú y elige **Crear sala** para apostar y retar a hasta **3 jugadores** más.\n' +
      '🤖 ¿Sin rivales? Elige **Jugar contra el bot** (cooldown de 30 min, sin bonos).\n' +
      `💰 Apuesta mínima: **${fmt(MIN_BET)} Lagcoins**\n` +
      '🔒 Cada partida se juega en un **canal privado** que se cierra al terminar.\n\n' +
      `${marquee(t + 3)}`,
    footer: { text: 'Gana el último en pie · Abre el menú EMPEZAR PARTIDA para jugar o ver las reglas' }
  };
}
function mainRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('br_menu')
      .setPlaceholder('🔫 EMPEZAR PARTIDA')
      .addOptions([
        { label: 'Crear sala', value: 'create', emoji: '🎲', description: `Abre una mesa y apuesta (mínimo ${MIN_BET} Lagcoins)` },
        { label: 'Jugar contra el bot', value: 'bot', emoji: '🤖', description: 'Sin esperar jugadores · cooldown 30 min · sin bonos' },
        { label: 'Información', value: 'info', emoji: 'ℹ️', description: 'Reglas, probabilidades y recompensas' },
        { label: 'Mi racha', value: 'stats', emoji: '🔥', description: 'Tus victorias y tu bono de racha' }
      ])
  );
}

function infoEmbed() {
  return {
    color: currentColor(),
    title: 'ℹ️ Buckshot Roulette — Cómo se juega',
    description:
      '**Objetivo:** ser el último jugador con vida. Juegan de **2 a 4** personas.',
    fields: [
      {
        name: '🔫 La escopeta',
        value:
          'Cada ronda se carga con **3 a 8 cartuchos**: 🔴 reales y ⚪ de fogueo, **mezclados**. Se anuncia cuántos hay de cada uno, pero **no el orden**.\n' +
          '• **Dispararte a ti mismo:** si es fogueo, **juegas otra vez**. Si es real, pierdes vida y pasa el turno.\n' +
          '• **Disparar a un rival:** sea real o fogueo, **pasa el turno**.\n' +
          'Cuando la escopeta se vacía, se **recarga** y todos reciben **2 o 3 ítems** nuevos.'
      },
      {
        name: '🎒 Ítems (máx. 8 por jugador, no gastan turno)',
        value: ITEM_IDS.map(id => `${ITEMS[id].emoji} **${ITEMS[id].name}** — ${ITEMS[id].desc}`).join('\n')
      },
      {
        name: '📊 Probabilidades',
        value:
          'Probabilidad de que el cartucho actual sea **real** según la carga:\n' +
          '`1🔴/4⚪` → 20% · `2🔴/3⚪` → 40% · `3🔴/2⚪` → 60% · `4🔴/1⚪` → 80%\n' +
          '• Vida inicial: **3 a 5 ❤️** (igual para todos)\n' +
          '• Cada ítem tiene la misma probabilidad de salir (**≈16,7%**)\n' +
          '• Con la 🔍 Lupa la certeza pasa a **100%**'
      },
      {
        name: '💰 Apuestas y recompensas',
        value:
          `• Apuesta mínima: **${fmt(MIN_BET)} Lagcoins** (todos apuestan lo mismo)\n` +
          '• **Ganador:** recibe **todo el pozo** + un **bono aleatorio de 0 a 1.000 por cada jugador** de la mesa (ej. 621)\n' +
          '• 🔥 **Racha:** cada victoria seguida sube el tope del bono extra: 1ª racha **0–500**, luego **0–1.000**, **0–1.500**, **0–2.000**…\n' +
          '• **Perdedores:** pierden lo apostado + un **impuesto aleatorio de 50 a 1.000** Lagcoins (y su racha vuelve a 0)'
      },
      {
        name: '🤖 Modo contra el bot',
        value:
          '• No necesitas más jugadores: eliges tu apuesta (mín. 500) y juegas 1 contra 1 en un canal privado.\n' +
          '• El bot usa **todos los ítems** y reglas, pero solo con información legítima (no ve la recámara).\n' +
          '• Si ganas recibes **el doble de tu apuesta**; si pierdes, pierdes lo apostado.\n' +
          '• **Sin bonos aleatorios, sin racha y sin impuesto.**\n' +
          '• **Cooldown de 30 minutos** entre partidas contra el bot.'
      },
      {
        name: '⏱️ Reglas extra',
        value:
          '• Tienes **60 segundos** por turno; si te pasas, el gatillo se aprieta solo contra ti.\n' +
          '• Si te pasas **2 veces seguidas**, abandonas la partida.\n' +
          '• Si el bot se reinicia o falla, **se devuelven las apuestas**.'
      }
    ],
    footer: { text: 'Buena suerte… la vas a necesitar.' }
  };
}

// ----------------------------------------------------------------------------
//  Lobby (mesa de espera)
// ----------------------------------------------------------------------------
function lobbyEmbed(lobby, color, t = 0) {
  const slots = [];
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const id = lobby.players[i];
    if (id) slots.push(`**${i + 1}.** <@${id}>${id === lobby.hostId ? ' 👑' : ''}`);
    else slots.push(`**${i + 1}.** ▫️ *Asiento libre*`);
  }
  const fields = [
    { name: '🎰 Apuesta por jugador', value: `**${fmt(lobby.bet)}** Lagcoins`, inline: true },
    { name: '💰 Pozo actual', value: `**${fmt(lobby.bet * lobby.players.length)}** Lagcoins`, inline: true },
    { name: `👥 Mesa (${lobby.players.length}/${MAX_PLAYERS})`, value: slots.join('\n') }
  ];
  if (lobby.invited.size) {
    fields.push({ name: '📨 Invitados', value: [...lobby.invited].map(id => `<@${id}>`).join(' ') });
  }
  let description;
  if (lobby.closed) description = lobby.closedText || 'Mesa cerrada.';
  else if (lobby.started) description = `🔫 **¡Partida en curso!** ${lobby.gameChannelId ? `<#${lobby.gameChannelId}>` : ''}`;
  else {
    description =
      `${marquee(t, 10)}\n` +
      `<@${lobby.hostId}> abrió una mesa. Pulsa **Unirse a la mesa** para apostar y sentarte.\n` +
      `⏳ La mesa expira <t:${Math.floor(lobby.expiresAt / 1000)}:R>.`;
  }
  return {
    color,
    title: lobby.closed ? '🏁 Mesa finalizada' : '🎲 Buckshot Roulette — Mesa abierta',
    description,
    fields,
    footer: { text: `Mesa #${lobby.id} · mínimo ${MIN_PLAYERS} jugadores para empezar` }
  };
}
function lobbyComponents(lobby) {
  const off = lobby.started || lobby.closed;
  const full = lobby.players.length >= MAX_PLAYERS;
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`br_join_${lobby.id}`).setLabel('Unirse a la mesa').setEmoji('🪑').setStyle(ButtonStyle.Success).setDisabled(off || full),
      new ButtonBuilder().setCustomId(`br_leave_${lobby.id}`).setLabel('Salir').setStyle(ButtonStyle.Secondary).setDisabled(off),
      new ButtonBuilder().setCustomId(`br_start_${lobby.id}`).setLabel('Iniciar partida').setEmoji('🔫').setStyle(ButtonStyle.Primary).setDisabled(off || lobby.players.length < MIN_PLAYERS),
      new ButtonBuilder().setCustomId(`br_cancel_${lobby.id}`).setLabel('Cancelar mesa').setStyle(ButtonStyle.Danger).setDisabled(off)
    )
  ];
}
function lobbyNote(lobby, text) {
  if (!lobby.events) lobby.events = [];
  lobby.events.push({ t: Date.now(), text });
}
async function refreshLobby(lobby) {
  if (!lobby.message) return;
  try {
    await lobby.message.edit({
      embeds: [lobbyEmbed(lobby, currentColor(), tick)],
      components: lobbyComponents(lobby)
    });
  } catch {}
}

function saveEscrow(lobby) {
  const players = {};
  for (const id of lobby.players) players[id] = lobby.bet;
  state.escrows[lobby.id] = { guildId: lobby.guildId, channelId: lobby.gameChannelId || null, players };
  saveState();
}
function clearEscrow(lobbyId) {
  delete state.escrows[lobbyId];
  saveState();
}

async function refundAll(lobby, reasonText) {
  for (const id of lobby.players) {
    try { await payOut(lobby.guildId, id, lobby.bet, 'buckshot_transfer_refund'); } catch (e) { console.error('[Buckshot] refund:', e.message); }
    busyUsers.delete(id);
  }
  lobby.closed = true;
  lobby.closedText = reasonText;
  clearEscrow(lobby.id);
}

// Borra los mensajes temporales de la mesa (invitaciones, "mesa llena") y opcionalmente el de la mesa
async function deleteLobbyMessages(lobby, includeMain = true) {
  const msgs = [...(lobby.temp || [])];
  lobby.temp = [];
  if (includeMain && lobby.message) msgs.push(lobby.message);
  for (const m of msgs) await m.delete().catch(() => {});
}

// Cambia el panel principal viejo por uno nuevo al final de la partida
async function replaceMainPanel(lobby) {
  if (!lobby.mainMessageId) return;
  const idx = state.mains.findIndex(m => m.messageId === lobby.mainMessageId);
  if (idx < 0) return; // ya fue reemplazado por otra partida o lo borraron
  const [old] = state.mains.splice(idx, 1);
  saveState();
  const target = mainTargets.get(old.messageId);
  if (target) {
    animated.delete(target);
    mainTargets.delete(old.messageId);
  }
  const channel = lobby.channel;
  try {
    const oldMsg = await channel.messages.fetch(old.messageId);
    try {
      await oldMsg.delete();
    } catch {
      // Sin permiso para borrar: lo dejamos inutilizable
      await oldMsg.edit({
        embeds: [{ color: 0x2F3136, title: '🔫 Panel anterior', description: 'Este panel ya no está activo. Usa el panel más reciente de este canal.' }],
        components: []
      }).catch(() => {});
    }
  } catch {}
  try {
    const sent = await channel.send({ embeds: [mainEmbed(currentColor(), tick)], components: [mainRow()] });
    state.mains.push({ guildId: lobby.guildId, channelId: channel.id, messageId: sent.id });
    saveState();
    attachMainAnimation(sent);
  } catch (e) {
    console.error('[Buckshot] No pude enviar el panel nuevo:', e.message);
  }
}

async function cancelLobby(lobby, reasonText) {
  if (lobby.closed || lobby.started) return;
  clearTimeout(lobby.timer);
  animated.delete(lobby.anim);
  await refundAll(lobby, `${reasonText}\n💸 Las apuestas fueron **devueltas**.`);
  lobbies.delete(lobby.id);
  await refreshLobby(lobby);
  setTimeout(() => deleteLobbyMessages(lobby, true), 10000);
}

// ----------------------------------------------------------------------------
//  Partida: render
// ----------------------------------------------------------------------------
const heartsOf = (p, max) => (p.hp > 0 ? '❤️'.repeat(p.hp) + '🖤'.repeat(Math.max(0, max - p.hp)) : '💀 Eliminado');
const itemsOf = p => (p.items.length ? p.items.map(i => ITEMS[i].emoji).join(' ') : '*sin ítems*');

function gameEmbed(game, color, t = 0) {
  const g = game.s;
  const cur = g.players[g.turnIdx];
  const usedStrip = g.used.length ? g.used.map(x => (x === 'live' ? '🔴' : '⚪')).join('') : '—';
  let desc =
    `${marquee(t)}\n` +
    `**Carga actual:** ${g.loadLive} Reales 🔴 / ${g.loadBlank} Fogueo ⚪\n` +
    `**Recámara:** ${g.shells.length ? '🟫'.repeat(g.shells.length) : '—'} *(${g.shells.length} restantes)*\n` +
    `**Ya disparados:** ${usedStrip}`;
  if (g.sawed) desc += '\n🪚 **¡Escopeta recortada!** El próximo disparo real hace **doble daño**.';
  if (!g.ended) {
    desc += cur.isBot
      ? '\n\n🤖 **Turno del bot** — está pensando…'
      : `\n\n▶️ Turno de <@${cur.id}> — se agota <t:${Math.floor(game.deadline / 1000)}:R>`;
  }

  const fields = g.players.map((p, i) => ({
    name: `${i === g.turnIdx && !g.ended && p.hp > 0 ? '▶️ ' : ''}${p.name}`.slice(0, 256),
    value: `${heartsOf(p, g.maxHp)}${p.cuffed ? ' ⛓️' : ''}\n🎒 ${itemsOf(p)}`.slice(0, 1024),
    inline: true
  }));

  return {
    color,
    title: `🔫 BUCKSHOT ROULETTE — Ronda ${g.round}`,
    description: desc,
    fields,
    footer: {
      text: game.lobby?.solo
        ? `🤖 Modo contra el bot · Apuesta: ${fmt(g.bet)} · Premio si ganas: ${fmt(g.pot)} (sin bonos ni racha)`
        : `Apuesta: ${fmt(g.bet)} c/u · Pozo: ${fmt(g.pot)} Lagcoins`
    }
  };
}
function gameComponents(game) {
  const g = game.s;
  if (g.ended) return [];
  const cur = g.players[g.turnIdx];
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('br_self').setLabel('Dispararme').setEmoji('🎯').setStyle(ButtonStyle.Danger).setDisabled(!!cur.isBot),
      new ButtonBuilder().setCustomId('br_opp').setLabel('Disparar a un rival').setEmoji('🔫').setStyle(ButtonStyle.Primary).setDisabled(!!cur.isBot),
      new ButtonBuilder().setCustomId('br_items').setLabel('Usar ítem').setEmoji('🎒').setStyle(ButtonStyle.Secondary).setDisabled(cur.items.length === 0 || !!cur.isBot)
    )
  ];
}

// Render con coalescencia: nunca hay dos ediciones simultáneas del mismo mensaje
function pushGame(game) {
  if (!game.statusMsg) return Promise.resolve();
  if (game.renderPromise) {
    game.dirty = true;
    return game.renderPromise;
  }
  game.renderPromise = (async () => {
    try {
      do {
        game.dirty = false;
        await game.statusMsg.edit({
          embeds: [gameEmbed(game, currentColor(), tick)],
          components: gameComponents(game)
        });
        game.editFails = 0;
      } while (game.dirty);
    } catch (e) {
      game.editFails = (game.editFails || 0) + 1;
      if (game.editFails >= 5 && !game.s.ended && !game.aborting) {
        abortGame(game, 'El canal de la partida dejó de estar accesible.').catch(() => {});
      }
    } finally {
      game.renderPromise = null;
    }
  })();
  return game.renderPromise;
}

// ----------------------------------------------------------------------------
//  Partida: flujo
// ----------------------------------------------------------------------------
function armTimer(game) {
  clearTimeout(game.timer);
  if (game.s.players[game.s.turnIdx]?.isBot) {
    game.token++; // el bot juega solo, sin cuenta atrás
    return;
  }
  game.deadline = Date.now() + TURN_MS;
  const token = ++game.token;
  game.timer = setTimeout(() => onTurnTimeout(game, token), TURN_MS);
}

async function onTurnTimeout(game, token) {
  if (game.s.ended || game.token !== token) return;
  if (game.processing) return;
  game.processing = true;
  try {
    forceTimeout(game.s);
    await afterAction(game);
  } finally {
    game.processing = false;
  }
}

// Mensaje normal (sin embed) que se borra solo pasados unos segundos
async function say(game, text, ttl = EVENT_TTL) {
  try {
    const m = await game.channel.send({ content: text, allowedMentions: { parse: [] } });
    setTimeout(() => m.delete().catch(() => {}), ttl);
    return m;
  } catch {
    return null;
  }
}
// Envía, en orden, todo lo que el motor dejó pendiente (disparos, ítems, vidas, rondas…)
async function flushPending(game) {
  const items = game.s.pending.splice(0);
  for (const it of items) await say(game, it.text, it.ttl);
}

async function afterAction(game) {
  await flushPending(game);
  if (game.s.ended) {
    clearTimeout(game.timer);
    await pushGame(game);
    await finishGame(game);
    return;
  }
  armTimer(game);
  await pushGame(game);
  scheduleBot(game);
}

// ----------------------------------------------------------------------------
//  🤖 Rival bot (IA). Solo usa información legítima: los conteos públicos de la
//  carga, lo que ya se disparó y lo que le revele su propia Lupa.
// ----------------------------------------------------------------------------
function botKnowledge(game) {
  const g = game.s;
  const k = game.botKnow;
  if (k && k.round === g.round && k.len === g.shells.length) return k.val;
  return null;
}

function liveChance(game) {
  const g = game.s;
  const known = botKnowledge(game);
  if (known) return known === 'live' ? 1 : 0;
  const total = g.shells.length;
  if (!total) return 0;
  const usedLive = g.used.filter(x => x === 'live').length;
  let p = Math.min(1, Math.max(0, (g.loadLive - usedLive) / total));
  if (g.inverted) p = Math.min(0.9, Math.max(0.1, p));
  return p;
}

function botDecide(game, idx, skip) {
  const g = game.s;
  const me = g.players[idx];
  const has = id => me.items.includes(id) && !skip.has(id);
  const known = botKnowledge(game);
  const p = liveChance(game);

  // Rivales ordenados: primero los de menos vida; a igualdad, el que juega antes
  const opps = [];
  for (let k = 1; k < g.players.length; k++) {
    const j = (idx + k) % g.players.length;
    if (g.players[j].hp > 0) opps.push({ i: j, hp: g.players[j].hp, order: k });
  }
  if (!opps.length) return { type: 'shoot', target: idx };
  opps.sort((a, b) => a.hp - b.hp || a.order - b.order);
  const target = opps[0].i;

  if (has('cigarro') && me.hp < g.maxHp) return { type: 'item', item: 'cigarro' };
  if (known === null && p > 0 && p < 1 && has('lupa')) return { type: 'item', item: 'lupa' };
  if (has('esposas')) {
    for (let k = 1; k < g.players.length; k++) {
      const j = (idx + k) % g.players.length;
      if (g.players[j].hp > 0 && !g.players[j].cuffed) return { type: 'item', item: 'esposas', target: j };
    }
  }
  // Cartucho de fogueo conocido + Inversor = disparo real garantizado
  if (known === 'blank' && has('inversor')) return { type: 'item', item: 'inversor' };
  // Con el inventario lleno, suelta una cerveza (si el cartucho no es el real conocido)
  if (has('cerveza') && me.items.length >= 6 && known !== 'live' && p < 0.7) return { type: 'item', item: 'cerveza' };

  // ¿Apostar por el fogueo (turno extra) o ir contra un rival?
  const selfSafe = p === 0 || (!g.sawed && p < 0.5 && me.hp - 1 > 0);
  if (selfSafe) return { type: 'shoot', target: idx };

  if (p >= 0.5 && has('sierra') && !g.sawed && g.players[target].hp >= 2) return { type: 'item', item: 'sierra' };
  return { type: 'shoot', target };
}

function scheduleBot(game, delay = 2200) {
  const g = game.s;
  if (g.ended || game.finished || game.botPending) return;
  if (!g.players[g.turnIdx]?.isBot) return;
  game.botPending = true;
  setTimeout(() => {
    runBot(game).catch(e => console.error('[Buckshot] Error del bot:', e));
  }, delay);
}

async function runBot(game) {
  const g = game.s;
  game.botPending = false;
  if (g.ended || game.finished) return;
  const idx = g.turnIdx;
  if (!g.players[idx]?.isBot) return;
  if (game.processing) return scheduleBot(game, 700);

  game.processing = true;
  clearTimeout(game.timer);
  const skip = new Set();
  let shot = false;
  try {
    for (let n = 0; n < 25 && !g.ended && !game.finished; n++) {
      const act = botDecide(game, idx, skip);
      if (act.type === 'shoot') {
        shot = true;
        await runShot(game, idx, act.target); // apunta, dispara, avanza el turno y despierta al siguiente
        break;
      }
      const before = botKnowledge(game);
      const res = useItemEngine(g, idx, act.item, act.target ?? -1);
      if (!res.ok) {
        skip.add(act.item);
        continue;
      }
      if (act.item === 'lupa') game.botKnow = { round: g.round, len: g.shells.length, val: g.shells[0] };
      if (act.item === 'inversor' && before) {
        game.botKnow = { round: g.round, len: g.shells.length, val: before === 'live' ? 'blank' : 'live' };
      }
      await flushPending(game);
      await pushGame(game);
      await sleep(1600);
    }
    if (!shot && !g.ended && !game.finished && g.turnIdx === idx) {
      const opp = g.players.findIndex((pl, i) => i !== idx && pl.hp > 0);
      await runShot(game, idx, opp >= 0 ? opp : idx);
    }
  } catch (e) {
    console.error('[Buckshot] Fallo en el turno del bot:', e);
    if (!g.ended && !game.finished && g.turnIdx === idx) {
      try {
        const opp = g.players.findIndex((pl, i) => i !== idx && pl.hp > 0);
        await runShot(game, idx, opp >= 0 ? opp : idx);
      } catch (e2) {
        await abortGame(game, 'Error interno del bot.').catch(() => {});
      }
    }
  } finally {
    game.processing = false;
  }
}

async function runShot(game, shooterIdx, targetIdx) {
  const g = game.s;
  game.processing = true;
  clearTimeout(game.timer);
  try {
    const s = g.players[shooterIdx];
    const t = g.players[targetIdx];
    s.timeouts = 0;
    const aimText = shooterIdx === targetIdx
      ? `🎯 **${s.name}** se apunta la escopeta a la cabeza…`
      : `🔫 **${s.name}** apunta la escopeta hacia **${t.name}**…`;
    note(g, aimText);
    await say(game, aimText, 5000);
    await sleep(1500);
    const { keep } = shoot(g, shooterIdx, targetIdx);
    advanceTurn(g, keep);
    await afterAction(game);
  } finally {
    game.processing = false;
  }
}

function opponentsOf(game, userId) {
  return game.s.players
    .map((p, i) => ({ p, i }))
    .filter(x => x.p.hp > 0 && x.p.id !== userId);
}

async function guardTurn(interaction) {
  const game = games.get(interaction.channelId);
  if (!game || game.s.ended) {
    await interaction.reply({ content: '❌ Esta partida ya terminó.', flags: 64 }).catch(() => {});
    return null;
  }
  const cur = game.s.players[game.s.turnIdx];
  if (!game.s.players.some(p => p.id === interaction.user.id)) {
    await interaction.reply({ content: '❌ No estás sentado en esta mesa.', flags: 64 }).catch(() => {});
    return null;
  }
  if (cur.id !== interaction.user.id) {
    await interaction.reply({ content: `❌ No es tu turno, es el de **${cur.name}**.`, flags: 64 }).catch(() => {});
    return null;
  }
  if (game.processing) {
    await interaction.reply({ content: '⏳ Espera un momento…', flags: 64 }).catch(() => {});
    return null;
  }
  return game;
}

// ----------------------------------------------------------------------------
//  Fin de la partida
// ----------------------------------------------------------------------------
async function sendResultsChannel(guild, embed) {
  try {
    const ch = guild.channels.cache.get(RESULTS_CHANNEL_ID) || (await client.channels.fetch(RESULTS_CHANNEL_ID).catch(() => null));
    if (ch?.isTextBased()) await ch.send({ embeds: [embed] });
  } catch (e) {
    console.error('[Buckshot] No pude enviar resultados:', e.message);
  }
}

async function sendAuditLog(game, status, resultLines = []) {
  try {
    const ch = await client.channels.fetch(AUDIT_CHANNEL_ID).catch(() => null);
    if (!ch?.isTextBased()) {
      console.warn('[Buckshot] Canal de auditoría no disponible');
      return;
    }
    const g = game.s;
    const lobby = game.lobby;
    const clean = t => String(t).replace(/\*\*/g, '').replace(/<@!?(\d+)>/g, '@$1');
    const rel = ms => {
      const sec = Math.max(0, Math.round((ms - game.startedAt) / 1000));
      return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    };
    const L = [];
    L.push('==================================================');
    L.push(' BUCKSHOT ROULETTE — REGISTRO DE PARTIDA');
    L.push('==================================================');
    L.push(`Estado: ${status}`);
    L.push(`Modo: ${lobby.solo ? 'contra el bot (sin bonos, sin racha)' : 'multijugador'}`);
    L.push(`Mesa: #${lobby.id}`);
    L.push(`Servidor: ${game.channel.guild?.name || game.guildId} (${game.guildId})`);
    L.push(`Canal de la partida: #${game.channel.name || game.channel.id} (${game.channel.id})`);
    L.push(`Inicio: ${new Date(game.startedAt).toISOString()}`);
    L.push(`Fin: ${new Date().toISOString()}`);
    L.push(`Apuesta por jugador: ${g.bet} Lagcoins · Pozo: ${g.pot} Lagcoins`);
    L.push(`Vida inicial: ${g.maxHp} · Rondas jugadas: ${g.round}`);
    L.push('');
    L.push('JUGADORES (orden de turnos)');
    g.players.forEach((p, i) => L.push(`  ${i + 1}. ${p.name} (${p.id})${p.id === lobby.hostId ? ' [anfitrión]' : ''}${p.isBot ? ' [BOT]' : ''}`));
    L.push('');
    L.push('SALA (antes de empezar)');
    (lobby.events || []).forEach(e => L.push(`  [${new Date(e.t).toISOString()}] ${clean(e.text)}`));
    L.push('');
    L.push('CRONOLOGÍA DE LA PARTIDA [mm:ss desde el inicio]');
    g.transcript.forEach(e => L.push(`  [${rel(e.t)}] ${clean(e.text)}`));
    L.push('');
    L.push('ESTADO FINAL');
    g.players.forEach(p => L.push(`  ${p.name}: ${p.hp} vida(s) · ítems sin usar: ${p.items.length ? p.items.map(i => ITEMS[i].name).join(', ') : 'ninguno'}`));
    if (resultLines.length) {
      L.push('');
      L.push('RESULTADO ECONÓMICO');
      resultLines.forEach(r => L.push(`  ${clean(r)}`));
    }
    const buf = Buffer.from(L.join('\n'), 'utf8');
    const winner = g.players.find(p => p.id === g.winnerId);
    await ch.send({
      content: `📄 **Buckshot Roulette** · Mesa #${lobby.id} · ${status}${winner ? ` · Ganador: **${winner.name}** (<@${winner.id}>)` : ''}\n👥 ${g.players.map(p => p.name).join(', ')}`,
      files: [new AttachmentBuilder(buf, { name: `buckshot-mesa-${lobby.id}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt` })],
      allowedMentions: { parse: [] }
    });
  } catch (e) {
    console.error('[Buckshot] No pude enviar el registro de auditoría:', e.message);
  }
}

async function finishGame(game) {
  if (game.finished) return;
  game.finished = true;
  const g = game.s;
  clearTimeout(game.timer);
  animated.delete(game.anim);

  if (game.lobby.solo) return finishSoloGame(game);

  const winner = g.players.find(p => p.id === g.winnerId);
  const losers = g.players.filter(p => p.id !== g.winnerId);
  const guildId = game.guildId;

  const winStats = winner ? getStats(guildId, winner.id) : null;
  const streakBefore = winStats ? winStats.streak : 0;
  const pay = computePayouts(g, streakBefore);
  const auditResult = [];
  if (winner) {
    auditResult.push(`Ganador: ${winner.name} (${winner.id}) — racha previa: ${streakBefore}`);
    auditResult.push(`Pozo apostado: ${pay.pot}`);
    auditResult.push(`Bonos por jugador (${g.players.length}): ${pay.playerBonuses.join(' + ')} = ${pay.playerBonusTotal}`);
    auditResult.push(`Bono de racha: ${pay.streakBonus}${streakBefore > 0 ? ` (rango 0–${500 * streakBefore})` : ' (sin racha previa)'}`);
    auditResult.push(`Premio total pagado: ${pay.total}`);
  }

  if (winner) await payOut(guildId, winner.id, pay.total, 'buckshot_transfer_win').catch(e => console.error('[Buckshot] pago:', e.message));

  const loserLines = [];
  for (const l of losers) {
    let tax = rand(50, 1000);
    try {
      const bal = await getBalance(guildId, l.id);
      tax = Math.min(tax, bal);
      if (tax > 0) {
        const { removeUserLagcoins } = await eco();
        await removeUserLagcoins(guildId, l.id, tax, 'buckshot_tax');
      }
    } catch (e) {
      tax = 0;
      console.error('[Buckshot] impuesto:', e.message);
    }
    const st = getStats(guildId, l.id);
    st.losses++;
    st.streak = 0;
    st.totalLost += g.bet + tax;
    loserLines.push(`💔 <@${l.id}> — perdió **${fmt(g.bet)}** apostados + **${fmt(tax)}** de impuesto`);
    auditResult.push(`Perdedor: ${l.name} (${l.id}) — apuesta ${g.bet} + impuesto ${tax} = -${g.bet + tax}`);
    logBuckshot({
      win: false,
      userId: l.id,
      guildId,
      amount: -(g.bet + tax),
      importance: 'medium',
      reason: 'Derrota en Buckshot Roulette',
      details: { minigame: 'buckshot', winnerId: g.winnerId, bet: g.bet, tax }
    });
  }

  let newStreak = 0;
  if (winner) {
    winStats.wins++;
    winStats.streak++;
    newStreak = winStats.streak;
    winStats.bestStreak = Math.max(winStats.bestStreak, winStats.streak);
    winStats.totalWon += pay.total - g.bet;
    logBuckshot({
      win: true,
      userId: winner.id,
      guildId,
      amount: pay.total - g.bet,
      importance: 'high',
      reason: 'Victoria en Buckshot Roulette',
      details: { minigame: 'buckshot', bet: g.bet, pot: pay.pot, playerBonus: pay.playerBonusTotal, streakBonus: pay.streakBonus, players: g.players.length }
    });
  }
  saveStats();

  const duration = Math.max(1, Math.round((Date.now() - game.startedAt) / 1000));
  const resultEmbed = {
    color: 0xFFD700,
    title: '🏆 Buckshot Roulette — Resultados',
    description: winner
      ? `👑 **Ganador:** <@${winner.id}> *(${winner.name})*\n🔥 Racha actual: **${newStreak}** victoria${newStreak === 1 ? '' : 's'}`
      : 'La partida terminó sin ganador.',
    fields: [
      {
        name: '💰 Premio del ganador',
        value:
          `• Pozo apostado: **${fmt(pay.pot)}**\n` +
          `• Bonos por jugador (${g.players.length}): **+${fmt(pay.playerBonusTotal)}** *(${pay.playerBonuses.map(fmt).join(' + ')})*\n` +
          `• Bono de racha: **+${fmt(pay.streakBonus)}**${streakBefore > 0 ? ` *(0–${fmt(500 * streakBefore)})*` : ' *(sin racha previa)*'}\n` +
          `**Total: ${fmt(pay.total)} Lagcoins**`
      },
      { name: '💀 Perdedores', value: loserLines.join('\n') || '—' },
      { name: '📈 Datos de la partida', value: `Mesa de **${g.players.length}** jugadores · **${g.round}** ronda${g.round === 1 ? '' : 's'} · **${duration}s**` }
    ],
    timestamp: new Date().toISOString()
  };

  // Resultados en el canal de la partida y en el canal de resultados
  try {
    await game.channel.send({
      embeds: [resultEmbed],
      content: `🔒 Este canal se cerrará <t:${Math.floor((Date.now() + CLOSE_DELAY_MS) / 1000)}:R>.`
    });
  } catch {}
  await sendResultsChannel(game.channel.guild, resultEmbed);
  await sendAuditLog(game, 'FINALIZADA', auditResult);

  await closeGameChannel(game, winner
    ? `🏆 Ganó <@${winner.id}> y se llevó **${fmt(pay.total)}** Lagcoins.`
    : 'La partida finalizó.');
}

// Limpieza común: libera jugadores, borra mesa/invitaciones, renueva el panel y cierra el canal
async function closeGameChannel(game, closedText) {
  const g = game.s;
  for (const p of g.players) busyUsers.delete(p.id);
  games.delete(game.channel.id);
  clearEscrow(game.lobby.id);

  game.lobby.closed = true;
  game.lobby.closedText = closedText;
  lobbies.delete(game.lobby.id);

  // Fuera del historial del canal principal: mesa + invitaciones, y panel nuevo
  await deleteLobbyMessages(game.lobby, true);
  await replaceMainPanel(game.lobby);

  try {
    for (const p of g.players.filter(x => !x.isBot)) {
      await game.channel.permissionOverwrites.edit(p.id, { SendMessages: false }).catch(() => {});
    }
  } catch {}
  setTimeout(() => game.channel.delete('Buckshot Roulette: partida terminada').catch(() => {}), CLOSE_DELAY_MS);
}

// Fin de una partida contra el bot: premio = pozo (sin bonos, sin racha, sin impuesto) + cooldown
async function finishSoloGame(game) {
  const g = game.s;
  const guildId = game.guildId;
  const human = g.players.find(p => !p.isBot);
  const botP = g.players.find(p => p.isBot);
  const humanWon = g.winnerId === human.id;
  const prize = g.bet * 2;
  const auditResult = [];

  if (humanWon) {
    await payOut(guildId, human.id, prize, 'buckshot_transfer_win').catch(e => console.error('[Buckshot] pago solo:', e.message));
    auditResult.push(`Ganador: ${human.name} (${human.id}) venció al bot`);
    auditResult.push(`Apuesta: ${g.bet} → premio pagado: ${prize} (ganancia neta ${g.bet}; sin bonos ni racha)`);
  } else {
    auditResult.push(`Ganador: ${botP.name} (bot)`);
    auditResult.push(`${human.name} (${human.id}) perdió su apuesta de ${g.bet} (sin impuesto ni racha)`);
  }

  // Cooldown de 30 min (se cuenta desde que termina la partida)
  state.soloCooldowns[`${guildId}-${human.id}`] = Date.now() + SOLO_COOLDOWN_MS;
  saveState();

  logBuckshot({
    win: humanWon,
    userId: human.id,
    guildId,
    amount: humanWon ? g.bet : -g.bet,
    importance: humanWon ? 'medium' : 'low',
    reason: humanWon ? 'Victoria contra el bot en Buckshot Roulette' : 'Derrota contra el bot en Buckshot Roulette',
    details: { minigame: 'buckshot', mode: 'bot', bet: g.bet, prize: humanWon ? prize : 0 }
  });

  const duration = Math.max(1, Math.round((Date.now() - game.startedAt) / 1000));
  const resultEmbed = {
    color: humanWon ? 0x2ECC71 : 0xE74C3C,
    title: '🤖 Buckshot Roulette vs Bot — Resultados',
    description: humanWon
      ? `🏆 <@${human.id}> *(${human.name})* venció al bot.`
      : `**${botP.name}** ganó la partida contra <@${human.id}> *(${human.name})*.`,
    fields: [
      {
        name: '💰 Economía',
        value: humanWon
          ? `Apostó **${fmt(g.bet)}** → recibe **${fmt(prize)}** Lagcoins (**+${fmt(g.bet)}** netos).`
          : `Pierde su apuesta de **${fmt(g.bet)}** Lagcoins.`
      },
      { name: 'ℹ️ Modo bot', value: 'Sin bonos por jugador, sin bono ni cambios de racha y sin impuesto.' },
      { name: '📈 Datos de la partida', value: `**${g.round}** ronda${g.round === 1 ? '' : 's'} · **${duration}s**` },
      { name: '⏳ Próxima partida contra el bot', value: `<t:${Math.floor((Date.now() + SOLO_COOLDOWN_MS) / 1000)}:R>` }
    ],
    timestamp: new Date().toISOString()
  };

  try {
    await game.channel.send({
      embeds: [resultEmbed],
      content: `🔒 Este canal se cerrará <t:${Math.floor((Date.now() + CLOSE_DELAY_MS) / 1000)}:R>.`
    });
  } catch {}
  await sendResultsChannel(game.channel.guild, resultEmbed);
  await sendAuditLog(game, 'FINALIZADA (vs bot)', auditResult);

  await closeGameChannel(game, humanWon ? `🏆 <@${human.id}> venció al bot.` : '🤖 Ganó el bot.');
}

async function abortGame(game, reason) {
  if (game.finished || game.aborting) return;
  game.aborting = true;
  game.finished = true;
  game.s.ended = true;
  clearTimeout(game.timer);
  animated.delete(game.anim);
  await refundAll(game.lobby, `⚠️ Partida cancelada: ${reason}\n💸 Las apuestas fueron **devueltas**.`);
  games.delete(game.channel.id);
  lobbies.delete(game.lobby.id);
  try {
    await game.channel.send(`⚠️ **Partida cancelada:** ${reason}\n💸 Las apuestas fueron devueltas. El canal se cerrará pronto.`);
  } catch {}
  note(game.s, `⚠️ PARTIDA CANCELADA: ${reason} (apuestas devueltas)`);
  await sendAuditLog(game, `CANCELADA (${reason})`, ['Todas las apuestas fueron devueltas.']);
  await refreshLobby(game.lobby);
  setTimeout(() => deleteLobbyMessages(game.lobby, true), 10000);
  setTimeout(() => game.channel.delete('Buckshot Roulette: partida cancelada').catch(() => {}), 10000);
}

// ----------------------------------------------------------------------------
//  Inicio de la partida (crea el canal privado)
// ----------------------------------------------------------------------------
async function launchGame(lobby) {
  if (lobby.started || lobby.closed) return;
  lobby.started = true;
  clearTimeout(lobby.timer);
  animated.delete(lobby.anim);

  const guild = lobby.channel.guild;
  let gch;
  try {
    const overwrites = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels
        ]
      },
      ...lobby.players.map(id => ({
        id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      }))
    ];
    const slug = (lobby.names[lobby.hostId] || 'mesa').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'mesa';
    gch = await guild.channels.create({
      name: `ruleta-${slug}-${lobby.id}`,
      type: ChannelType.GuildText,
      parent: lobby.channel.parentId || undefined,
      topic: `Buckshot Roulette${lobby.solo ? ' (vs bot)' : ''} · Apuesta ${fmt(lobby.bet)} Lagcoins · Mesa #${lobby.id}`,
      permissionOverwrites: overwrites
    });
  } catch (e) {
    console.error('[Buckshot] No pude crear el canal:', e.message);
    lobby.started = false;
    await cancelLobby(lobby, '❌ No pude crear el canal privado (revisa que el bot tenga el permiso **Gestionar canales**).');
    return;
  }

  lobby.gameChannelId = gch.id;
  saveEscrow(lobby);

  const roster = lobby.players.map(id => ({ id, name: lobby.names[id] || `Jugador` }));
  if (lobby.solo) roster.push({ id: client.user.id, name: `🤖 ${client.user.username}`, isBot: true });
  const s = newGameState(roster, lobby.bet);
  reloadShotgun(s);
  note(s, `🎬 Comienza la partida: ${s.players.map(x => `${x.name} (${s.maxHp} vidas)`).join(', ')} · apuesta ${lobby.bet} c/u`);
  note(s, `▶️ Turno de ${s.players[s.turnIdx].name}`);
  lobbyNote(lobby, `Partida iniciada con ${lobby.players.length} jugadores`);
  const game = {
    s,
    lobby,
    guildId: lobby.guildId,
    channel: gch,
    statusMsg: null,
    processing: false,
    deadline: Date.now() + TURN_MS,
    token: 0,
    timer: null,
    startedAt: Date.now(),
    renderPromise: null,
    dirty: false,
    editFails: 0,
    finished: false,
    aborting: false,
    anim: null
  };
  games.set(gch.id, game);

  try {
    game.statusMsg = await gch.send({
      content: `🔫 ${lobby.players.map(id => `<@${id}>`).join(' ')}${lobby.solo ? ' vs 🤖 **el bot**' : ''} — **¡La partida comienza!**`,
      embeds: [gameEmbed(game, currentColor(), tick)],
      components: gameComponents(game)
    });
  } catch (e) {
    console.error('[Buckshot] No pude enviar el estado:', e.message);
    await abortGame(game, 'No pude enviar mensajes en el canal de la partida.');
    return;
  }

  game.anim = {
    busy: false,
    render: async () => {
      if (game.s.ended || game.finished) return;
      await pushGame(game);
    }
  };
  animated.add(game.anim);
  armTimer(game);
  await flushPending(game); // carga de la escopeta y reparto de ítems de la ronda 1
  await pushGame(game);
  await refreshLobby(lobby);
  scheduleBot(game, 3000); // por si el bot empieza
  setTimeout(() => deleteLobbyMessages(lobby, false), 5000); // invitaciones ya no hacen falta
}

// ----------------------------------------------------------------------------
//  Handlers: botones del embed principal y lobby
// ----------------------------------------------------------------------------
async function precheckPlayer(interaction, { silent = false } = {}) {
  const reply = async content => {
    if (silent) return;
    if (interaction.deferred || interaction.replied) await interaction.followUp({ content, flags: 64 }).catch(() => {});
    else await interaction.reply({ content, flags: 64 }).catch(() => {});
  };
  const userData = db.getUser(interaction.guild.id, interaction.user.id);
  if (userData.isInactive) {
    await reply('❌ No puedes participar en minijuegos mientras tengas el rol de inactividad.');
    return false;
  }
  if (busyUsers.has(interaction.user.id)) {
    await reply('❌ Ya estás sentado en una mesa o partida de Buckshot Roulette.');
    return false;
  }
  if (await isJailed(interaction.guild.id, interaction.user.id)) {
    await reply('🚔 Estás en la cárcel, no puedes jugar ahora.');
    return false;
  }
  return true;
}

async function showInfo(interaction) {
  return interaction.reply({ embeds: [infoEmbed()], flags: 64 });
}

async function showStats(interaction) {
  const st = getStats(interaction.guild.id, interaction.user.id);
  const next = 500 * (st.streak + 1);
  return interaction.reply({
    flags: 64,
    embeds: [{
      color: currentColor(),
      title: '🔥 Tu racha en Buckshot Roulette',
      description:
        `🏆 Victorias: **${st.wins}** · 💀 Derrotas: **${st.losses}**\n` +
        `🔥 Racha actual: **${st.streak}** (mejor: **${st.bestStreak}**)\n` +
        `🎁 Bono de racha si ganas ahora: **0–${fmt(500 * st.streak)}** Lagcoins` +
        `${st.streak === 0 ? ' *(gana una partida para activarlo)*' : ''}\n` +
        `💰 Ganado en total: **${fmt(st.totalWon)}** · Perdido: **${fmt(st.totalLost)}**\n` +
        `➡️ Con una victoria más tu tope subirá a **${fmt(next)}**.`
    }]
  });
}

async function handleCreateButton(interaction) {
  if (!(await precheckPlayer(interaction))) return;
  const bal = await getBalance(interaction.guild.id, interaction.user.id);
  if (bal < MIN_BET) {
    return interaction.reply({ content: `❌ Necesitas al menos **${fmt(MIN_BET)} Lagcoins** en tu cartera para sentarte (tienes ${fmt(bal)}).`, flags: 64 });
  }
  const modal = new ModalBuilder()
    .setCustomId(`br_modal_create_${interaction.message?.id || ''}`)
    .setTitle('🎲 Crear mesa de Buckshot Roulette')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('bet')
          .setLabel(`Apuesta en Lagcoins (mínimo ${MIN_BET})`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(String(MIN_BET))
          .setRequired(true)
          .setMaxLength(10)
      )
    );
  await interaction.showModal(modal);
}

// ---------- Modo contra el bot ----------
function soloCooldownLeft(guildId, userId) {
  const key = `${guildId}-${userId}`;
  const until = state.soloCooldowns[key] || 0;
  if (until <= Date.now()) {
    if (state.soloCooldowns[key]) {
      delete state.soloCooldowns[key];
      saveState();
    }
    return 0;
  }
  return until;
}

async function handleSoloButton(interaction) {
  if (!(await precheckPlayer(interaction))) return;
  const until = soloCooldownLeft(interaction.guild.id, interaction.user.id);
  if (until) {
    return interaction.reply({
      content: `⏳ Ya jugaste contra el bot hace poco. Podrás volver a retarlo <t:${Math.floor(until / 1000)}:R>.`,
      flags: 64
    });
  }
  const bal = await getBalance(interaction.guild.id, interaction.user.id);
  if (bal < MIN_BET) {
    return interaction.reply({ content: `❌ Necesitas al menos **${fmt(MIN_BET)} Lagcoins** para apostar (tienes ${fmt(bal)}).`, flags: 64 });
  }
  const modal = new ModalBuilder()
    .setCustomId(`br_modal_solo_${interaction.message?.id || ''}`)
    .setTitle('🤖 Buckshot Roulette vs Bot')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('bet')
          .setLabel(`Tu apuesta (mínimo ${MIN_BET}) — ganas el doble`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(String(MIN_BET))
          .setRequired(true)
          .setMaxLength(10)
      )
    );
  await interaction.showModal(modal);
}

async function handleSoloModal(interaction) {
  if (!(await precheckPlayer(interaction))) return;
  const guildId = interaction.guild.id;
  const uid = interaction.user.id;
  const until = soloCooldownLeft(guildId, uid);
  if (until) {
    return interaction.reply({ content: `⏳ Podrás retar al bot <t:${Math.floor(until / 1000)}:R>.`, flags: 64 });
  }
  const raw = interaction.fields.getTextInputValue('bet');
  const bet = parseInt(String(raw).replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(bet) || bet < MIN_BET) {
    return interaction.reply({ content: `❌ La apuesta mínima es de **${fmt(MIN_BET)} Lagcoins**.`, flags: 64 });
  }
  const bal = await getBalance(guildId, uid);
  if (bal < bet) {
    return interaction.reply({ content: `❌ No tienes suficientes Lagcoins (tienes ${fmt(bal)}).`, flags: 64 });
  }
  if (busyUsers.has(uid)) {
    return interaction.reply({ content: '❌ Ya estás en una mesa o partida de Buckshot Roulette.', flags: 64 });
  }
  if (!(await takeBet(guildId, uid, bet))) {
    return interaction.reply({ content: '❌ No se pudo retener tu apuesta. Inténtalo de nuevo.', flags: 64 });
  }

  const name = interaction.member?.displayName || interaction.user.username;
  const lobby = {
    id: Math.random().toString(36).slice(2, 7),
    guildId,
    channel: interaction.channel,
    hostId: uid,
    bet,
    solo: true,
    players: [uid],
    names: { [uid]: name },
    invited: new Set(),
    temp: [],
    events: [],
    mainMessageId: interaction.customId.split('_')[3] || null,
    message: null,
    started: false,
    closed: false,
    expiresAt: Date.now() + LOBBY_MS,
    timer: null,
    anim: null
  };
  busyUsers.set(uid, lobby.id);
  lobbies.set(lobby.id, lobby);
  lobbyNote(lobby, `${name} (${uid}) creó una partida contra el bot con apuesta de ${bet}`);

  await interaction.deferReply({ flags: 64 });
  await launchGame(lobby);
  if (lobby.gameChannelId) {
    await interaction.editReply({
      content: `🤖 ¡Partida contra el bot creada! Apostaste **${fmt(bet)}** Lagcoins → <#${lobby.gameChannelId}>`
    }).catch(() => {});
  } else {
    await interaction.editReply({
      content: '❌ No pude crear el canal de la partida. Tu apuesta fue devuelta y no se aplicó cooldown.'
    }).catch(() => {});
  }
}

async function handleCreateModal(interaction) {
  if (!(await precheckPlayer(interaction))) return;
  const raw = interaction.fields.getTextInputValue('bet');
  const bet = parseInt(String(raw).replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(bet) || bet < MIN_BET) {
    return interaction.reply({ content: `❌ La apuesta mínima es de **${fmt(MIN_BET)} Lagcoins**.`, flags: 64 });
  }
  const bal = await getBalance(interaction.guild.id, interaction.user.id);
  if (bal < bet) {
    return interaction.reply({ content: `❌ No tienes suficientes Lagcoins (tienes ${fmt(bal)}).`, flags: 64 });
  }
  if (!(await takeBet(interaction.guild.id, interaction.user.id, bet))) {
    return interaction.reply({ content: '❌ No se pudo retener tu apuesta. Inténtalo de nuevo.', flags: 64 });
  }

  const lobby = {
    id: Math.random().toString(36).slice(2, 7),
    guildId: interaction.guild.id,
    channel: interaction.channel,
    hostId: interaction.user.id,
    bet,
    players: [interaction.user.id],
    names: { [interaction.user.id]: interaction.member?.displayName || interaction.user.username },
    invited: new Set(),
    temp: [],
    events: [],
    mainMessageId: interaction.customId.split('_')[3] || null,
    message: null,
    started: false,
    closed: false,
    expiresAt: Date.now() + LOBBY_MS,
    timer: null,
    anim: null
  };
  busyUsers.set(interaction.user.id, lobby.id);
  lobbyNote(lobby, `${lobby.names[interaction.user.id]} (${interaction.user.id}) creó la mesa con apuesta de ${bet}`);

  try {
    lobby.message = await interaction.channel.send({
      embeds: [lobbyEmbed(lobby, currentColor(), tick)],
      components: lobbyComponents(lobby)
    });
  } catch (e) {
    busyUsers.delete(interaction.user.id);
    await payOut(lobby.guildId, interaction.user.id, bet, 'buckshot_transfer_refund');
    return interaction.reply({ content: '❌ No pude publicar la mesa en este canal. Tu apuesta fue devuelta.', flags: 64 });
  }

  lobbies.set(lobby.id, lobby);
  saveEscrow(lobby);
  lobby.timer = setTimeout(() => cancelLobby(lobby, '⌛ La mesa expiró por falta de jugadores.'), LOBBY_MS);
  lobby.anim = {
    busy: false,
    render: async (color, t) => {
      if (lobby.started || lobby.closed) return;
      await lobby.message.edit({ embeds: [lobbyEmbed(lobby, color, t)] });
    }
  };
  animated.add(lobby.anim);

  const invite = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(`br_invite_${lobby.id}`)
      .setPlaceholder('📨 Invita a hasta 3 jugadores (opcional)')
      .setMinValues(1)
      .setMaxValues(3)
  );
  await interaction.reply({
    content: `✅ Mesa creada con una apuesta de **${fmt(bet)} Lagcoins** (ya fue retenida de tu cartera).\nPuedes invitar jugadores aquí abajo, o esperar a que se unan solos.`,
    components: [invite],
    flags: 64
  });
}

async function handleInvite(interaction) {
  const lobbyId = interaction.customId.replace('br_invite_', '');
  const lobby = lobbies.get(lobbyId);
  if (!lobby || lobby.closed || lobby.started) {
    return interaction.update({ content: '❌ Esa mesa ya no está disponible.', components: [] });
  }
  if (interaction.user.id !== lobby.hostId) {
    return interaction.reply({ content: '❌ Solo el creador de la mesa puede invitar.', flags: 64 });
  }
  if (await isJailed(interaction.guild.id, interaction.user.id)) {
    return interaction.reply({ content: '🚔 Estás en la cárcel.', flags: 64 });
  }
  const users = [...interaction.users.values()].filter(u => !u.bot && u.id !== lobby.hostId && !lobby.players.includes(u.id));
  if (!users.length) {
    return interaction.reply({ content: '❌ Elige usuarios válidos (no bots, ni tú, ni jugadores que ya estén sentados).', flags: 64 });
  }
  users.forEach(u => lobby.invited.add(u.id));
  lobbyNote(lobby, `Invitados por el anfitrión: ${users.map(u => `${u.username} (${u.id})`).join(', ')}`);
  const link = lobby.message?.url;
  const row = link
    ? [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Ir a la mesa').setStyle(ButtonStyle.Link).setURL(link))]
    : [];
  const inviteMsg = await lobby.channel.send({
    content: users.map(u => `<@${u.id}>`).join(' '),
    embeds: [{
      color: currentColor(),
      title: '📨 ¡Te invitaron a Buckshot Roulette!',
      description: `<@${lobby.hostId}> te invitó a su mesa.\n💰 Apuesta: **${fmt(lobby.bet)} Lagcoins** · Pulsa **Unirse a la mesa** antes de que expire.`
    }],
    components: row
  }).catch(() => null);
  if (inviteMsg) lobby.temp.push(inviteMsg);

  // Aviso por MD (si el usuario los tiene abiertos)
  for (const u of users) {
    u.send({
      embeds: [{
        color: currentColor(),
        title: '🔫 Invitación a Buckshot Roulette',
        description: `**${lobby.names[lobby.hostId]}** te invitó a una mesa con apuesta de **${fmt(lobby.bet)} Lagcoins**.\n${link ? `[Ir a la mesa](${link})` : ''}`
      }]
    }).catch(() => {});
  }
  await interaction.update({ content: `✅ Invitaste a ${users.map(u => `<@${u.id}>`).join(', ')}.`, components: [] });
  await refreshLobby(lobby);
}

async function handleLobbyButton(interaction) {
  const [, action, lobbyId] = interaction.customId.split('_');
  const lobby = lobbies.get(lobbyId);
  if (!lobby || lobby.closed) {
    return interaction.reply({ content: '❌ Esta mesa ya no está disponible.', flags: 64 });
  }
  if (lobby.started) {
    return interaction.reply({ content: '🔫 La partida de esta mesa ya comenzó.', flags: 64 });
  }
  const uid = interaction.user.id;

  if (action === 'join') {
    if (lobby.players.includes(uid)) return interaction.reply({ content: '✅ Ya estás en esta mesa.', flags: 64 });
    if (lobby.players.length >= MAX_PLAYERS) return interaction.reply({ content: '❌ La mesa está llena.', flags: 64 });
    if (!(await precheckPlayer(interaction))) return;
    const bal = await getBalance(interaction.guild.id, uid);
    if (bal < lobby.bet) {
      return interaction.reply({ content: `❌ Necesitas **${fmt(lobby.bet)} Lagcoins** para unirte (tienes ${fmt(bal)}).`, flags: 64 });
    }
    // Revalidar tras los awaits (otro jugador pudo ocupar el último asiento)
    if (lobby.players.length >= MAX_PLAYERS || lobby.started || lobby.closed) {
      return interaction.reply({ content: '❌ La mesa ya no tiene asientos.', flags: 64 });
    }
    if (!(await takeBet(interaction.guild.id, uid, lobby.bet))) {
      return interaction.reply({ content: '❌ No se pudo retener tu apuesta.', flags: 64 });
    }
    lobby.players.push(uid);
    lobbyNote(lobby, `${interaction.member?.displayName || interaction.user.username} (${uid}) se unió y apostó ${lobby.bet}`);
    lobby.names[uid] = interaction.member?.displayName || interaction.user.username;
    lobby.invited.delete(uid);
    busyUsers.set(uid, lobby.id);
    saveEscrow(lobby);

    await interaction.update({ embeds: [lobbyEmbed(lobby, currentColor(), tick)], components: lobbyComponents(lobby) });
    if (lobby.players.length >= MAX_PLAYERS) {
      const fullMsg = await lobby.channel.send(`🪑 **¡Mesa llena!** Empezando la partida de <@${lobby.hostId}>…`).catch(() => null);
      if (fullMsg) lobby.temp.push(fullMsg);
      await launchGame(lobby);
    }
    return;
  }

  if (action === 'leave') {
    if (!lobby.players.includes(uid)) return interaction.reply({ content: '❌ No estás en esta mesa.', flags: 64 });
    if (uid === lobby.hostId) {
      return interaction.reply({ content: '❌ Eres el anfitrión: usa **Cancelar mesa** para cerrarla.', flags: 64 });
    }
    lobby.players = lobby.players.filter(id => id !== uid);
    lobbyNote(lobby, `${lobby.names[uid] || uid} (${uid}) salió de la mesa y recuperó su apuesta`);
    busyUsers.delete(uid);
    await payOut(lobby.guildId, uid, lobby.bet, 'buckshot_transfer_refund');
    saveEscrow(lobby);
    await interaction.update({ embeds: [lobbyEmbed(lobby, currentColor(), tick)], components: lobbyComponents(lobby) });
    return;
  }

  if (action === 'start') {
    if (uid !== lobby.hostId) return interaction.reply({ content: '❌ Solo el anfitrión puede iniciar la partida.', flags: 64 });
    if (lobby.players.length < MIN_PLAYERS) {
      return interaction.reply({ content: `❌ Se necesitan al menos ${MIN_PLAYERS} jugadores.`, flags: 64 });
    }
    await interaction.deferUpdate();
    await launchGame(lobby);
    return;
  }

  if (action === 'cancel') {
    if (uid !== lobby.hostId && !isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Solo el anfitrión (o el staff) puede cancelar la mesa.', flags: 64 });
    }
    await interaction.deferUpdate();
    await cancelLobby(lobby, '🛑 La mesa fue cancelada por el anfitrión.');
    return;
  }
}

// ----------------------------------------------------------------------------
//  Handlers: acciones durante la partida
// ----------------------------------------------------------------------------
async function handleSelfShot(interaction) {
  const game = await guardTurn(interaction);
  if (!game) return;
  await interaction.deferUpdate();
  await runShot(game, game.s.turnIdx, game.s.turnIdx);
}

async function handleOpponentShot(interaction) {
  const game = await guardTurn(interaction);
  if (!game) return;
  const opps = opponentsOf(game, interaction.user.id);
  if (opps.length === 1) {
    await interaction.deferUpdate();
    return runShot(game, game.s.turnIdx, opps[0].i);
  }
  const menu = new StringSelectMenuBuilder()
    .setCustomId('br_target_shoot')
    .setPlaceholder('🎯 ¿A quién le disparas?')
    .addOptions(opps.map(o => ({ label: o.p.name.slice(0, 100), value: o.p.id, description: `${o.p.hp} ❤️` })));
  await interaction.reply({ content: '🎯 Elige tu objetivo:', components: [new ActionRowBuilder().addComponents(menu)], flags: 64 });
}

async function handleTargetShot(interaction) {
  const game = games.get(interaction.channelId);
  if (!game || game.s.ended) return interaction.update({ content: '❌ La partida ya terminó.', components: [] });
  const cur = game.s.players[game.s.turnIdx];
  if (cur.id !== interaction.user.id || game.processing) {
    return interaction.update({ content: '❌ Ya no es tu turno.', components: [] });
  }
  const targetIdx = game.s.players.findIndex(p => p.id === interaction.values[0] && p.hp > 0);
  if (targetIdx < 0 || game.s.players[targetIdx].id === cur.id) {
    return interaction.update({ content: '❌ Objetivo inválido.', components: [] });
  }
  await interaction.update({ content: `🎯 Disparaste a **${game.s.players[targetIdx].name}**.`, components: [] });
  await runShot(game, game.s.turnIdx, targetIdx);
}

async function handleItemsButton(interaction) {
  const game = await guardTurn(interaction);
  if (!game) return;
  const me = game.s.players[game.s.turnIdx];
  if (!me.items.length) return interaction.reply({ content: '🎒 No tienes ítems.', flags: 64 });
  const counts = {};
  me.items.forEach(i => { counts[i] = (counts[i] || 0) + 1; });
  const menu = new StringSelectMenuBuilder()
    .setCustomId('br_item')
    .setPlaceholder('🎒 Elige un ítem para usar')
    .addOptions(Object.entries(counts).map(([id, n]) => ({
      label: `${ITEMS[id].name} (x${n})`,
      value: id,
      emoji: ITEMS[id].emoji,
      description: ITEMS[id].desc.slice(0, 100)
    })));
  await interaction.reply({ content: '🎒 **Tu inventario** — usar un ítem **no gasta tu turno**:', components: [new ActionRowBuilder().addComponents(menu)], flags: 64 });
}

async function applyItem(interaction, game, itemId, targetId) {
  const g = game.s;
  const idx = g.turnIdx;
  if (g.players[idx].id !== interaction.user.id || game.processing || g.ended) {
    return interaction.update({ content: '❌ Ya no es tu turno.', components: [] });
  }
  let targetIdx = -1;
  if (targetId) targetIdx = g.players.findIndex(p => p.id === targetId);
  game.processing = true;
  try {
    const res = useItemEngine(g, idx, itemId, targetIdx);
    if (!res.ok) {
      return await interaction.update({ content: `❌ ${res.msg}`, components: [] });
    }
    await interaction.update({ content: res.secret || `✅ ${res.msg}`, components: [] });
    await flushPending(game);
    await pushGame(game);
  } finally {
    game.processing = false;
  }
}

async function handleItemSelect(interaction) {
  const game = games.get(interaction.channelId);
  if (!game || game.s.ended) return interaction.update({ content: '❌ La partida ya terminó.', components: [] });
  const g = game.s;
  const me = g.players[g.turnIdx];
  if (me.id !== interaction.user.id) return interaction.update({ content: '❌ Ya no es tu turno.', components: [] });
  const itemId = interaction.values[0];
  if (!me.items.includes(itemId)) return interaction.update({ content: '❌ Ya no tienes ese ítem.', components: [] });

  if (itemId === 'esposas') {
    const targets = opponentsOf(game, me.id).filter(o => !o.p.cuffed);
    if (!targets.length) return interaction.update({ content: '❌ Todos los rivales ya están esposados.', components: [] });
    if (targets.length === 1) return applyItem(interaction, game, itemId, targets[0].p.id);
    const menu = new StringSelectMenuBuilder()
      .setCustomId('br_itemtarget_esposas')
      .setPlaceholder('⛓️ ¿A quién esposas?')
      .addOptions(targets.map(o => ({ label: o.p.name.slice(0, 100), value: o.p.id, description: `${o.p.hp} ❤️` })));
    return interaction.update({ content: '⛓️ Elige a quién esposar:', components: [new ActionRowBuilder().addComponents(menu)] });
  }
  return applyItem(interaction, game, itemId, null);
}

async function handleItemTarget(interaction) {
  const game = games.get(interaction.channelId);
  if (!game || game.s.ended) return interaction.update({ content: '❌ La partida ya terminó.', components: [] });
  const itemId = interaction.customId.replace('br_itemtarget_', '');
  return applyItem(interaction, game, itemId, interaction.values[0]);
}

// ----------------------------------------------------------------------------
//  Router de interacciones
// ----------------------------------------------------------------------------
async function onInteraction(interaction) {
  const id = interaction.customId || '';
  if (!id.startsWith('br_')) return;
  if (!interaction.guild) return;

  if (interaction.isButton()) {
    // El manejador global de index.js ya responde a usuarios encarcelados en botones/selects
    if (await isJailed(interaction.guild.id, interaction.user.id)) return;
    if (id === 'br_create') return handleCreateButton(interaction);
    if (id === 'br_info') return showInfo(interaction); // compatibilidad con paneles viejos
    if (id === 'br_stats') return showStats(interaction);
    if (id === 'br_self') return handleSelfShot(interaction);
    if (id === 'br_opp') return handleOpponentShot(interaction);
    if (id === 'br_items') return handleItemsButton(interaction);
    if (/^br_(join|leave|start|cancel)_/.test(id)) return handleLobbyButton(interaction);
    return;
  }

  if (interaction.isModalSubmit() && id.startsWith('br_modal_create')) {
    return handleCreateModal(interaction);
  }
  if (interaction.isModalSubmit() && id.startsWith('br_modal_solo')) {
    return handleSoloModal(interaction);
  }

  if (interaction.isStringSelectMenu()) {
    if (await isJailed(interaction.guild.id, interaction.user.id)) return;
    if (id === 'br_menu') {
      const choice = interaction.values[0];
      if (choice === 'create') return handleCreateButton(interaction);
      if (choice === 'bot') return handleSoloButton(interaction);
      if (choice === 'info') return showInfo(interaction);
      if (choice === 'stats') return showStats(interaction);
      return;
    }
    if (id === 'br_target_shoot') return handleTargetShot(interaction);
    if (id === 'br_item') return handleItemSelect(interaction);
    if (id.startsWith('br_itemtarget_')) return handleItemTarget(interaction);
    return;
  }

  if (interaction.isUserSelectMenu() && id.startsWith('br_invite_')) {
    return handleInvite(interaction);
  }
}

// ----------------------------------------------------------------------------
//  Recuperación tras reinicios: devolver apuestas huérfanas y reanimar embeds
// ----------------------------------------------------------------------------
async function recoverOnStart() {
  // 1) Apuestas retenidas de partidas/mesas que se cortaron por un reinicio
  const orphanIds = Object.keys(state.escrows);
  for (const lobbyId of orphanIds) {
    const e = state.escrows[lobbyId];
    for (const [uid, amount] of Object.entries(e.players || {})) {
      try {
        await payOut(e.guildId, uid, amount, 'buckshot_transfer_refund');
        console.log(`[Buckshot] Apuesta huérfana devuelta: ${amount} a ${uid}`);
      } catch (err) {
        console.error('[Buckshot] No pude devolver apuesta huérfana:', err.message);
      }
    }
    if (e.channelId) {
      const ch = await client.channels.fetch(e.channelId).catch(() => null);
      if (ch) {
        await ch.send('⚠️ El bot se reinició durante la partida. Las apuestas fueron **devueltas**. Este canal se cerrará.').catch(() => {});
        setTimeout(() => ch.delete('Buckshot Roulette: reinicio del bot').catch(() => {}), 10000);
      }
    }
    delete state.escrows[lobbyId];
  }
  saveState();

  // 2) Reanimar los embeds principales
  const valid = [];
  for (const m of state.mains) {
    const ch = await client.channels.fetch(m.channelId).catch(() => null);
    const msg = ch ? await ch.messages.fetch(m.messageId).catch(() => null) : null;
    if (!msg) continue;
    valid.push(m);
    attachMainAnimation(msg);
    // Actualiza paneles viejos (con botones) al nuevo menú desplegable
    msg.edit({ embeds: [mainEmbed(currentColor(), tick)], components: [mainRow()] }).catch(() => {});
  }
  state.mains = valid;
  saveState();
  console.log(`🔫 Buckshot Roulette: ${valid.length} embed(s) principal(es) activos`);
}

function attachMainAnimation(message) {
  const target = {
    busy: false,
    render: async (color, t) => {
      try {
        await message.edit({ embeds: [mainEmbed(color, t)] });
      } catch (e) {
        if (e?.code === 10008 || e?.code === 10003) {
          animated.delete(target);
          mainTargets.delete(message.id);
          state.mains = state.mains.filter(m => m.messageId !== message.id);
          saveState();
        }
      }
    }
  };
  animated.add(target);
  mainTargets.set(message.id, target);
}

// ----------------------------------------------------------------------------
//  Registro en el cliente
// ----------------------------------------------------------------------------
export function registerBuckshot(discordClient) {
  client = discordClient;

  client.on('messageCreate', async message => {
    try {
      if (message.author.bot || !message.guild) return;
      if (!/^!roulette(\s|$)/i.test(message.content.trim())) return;

      if (!message.member || !isStaff(message.member)) {
        const warn = await message.reply('❌ Solo el **staff** puede enviar el panel de Buckshot Roulette.').catch(() => null);
        setTimeout(() => warn?.delete().catch(() => {}), 5000);
        return;
      }

      const sent = await message.channel.send({
        embeds: [mainEmbed(currentColor(), tick)],
        components: [mainRow()]
      });
      state.mains.push({ guildId: message.guild.id, channelId: message.channel.id, messageId: sent.id });
      saveState();
      attachMainAnimation(sent);
      await message.delete().catch(() => {});
    } catch (e) {
      console.error('[Buckshot] Error en !Roulette:', e);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      await onInteraction(interaction);
    } catch (e) {
      console.error('[Buckshot] Error en interacción:', e);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Ocurrió un error en Buckshot Roulette.', flags: 64 });
        }
      } catch {}
    }
  });

  startTicker();
  if (client.isReady()) recoverOnStart().catch(e => console.error('[Buckshot] recover:', e));
  else client.once('ready', () => recoverOnStart().catch(e => console.error('[Buckshot] recover:', e)));
}

export const __internals = { games };

export const __engine = {
  newGameState, reloadShotgun, shoot, advanceTurn, useItemEngine, forceTimeout, computePayouts,
  botDecide, botKnowledge, liveChance
};
