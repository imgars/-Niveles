// ============================================================================
//  🕵️ EL IMPOSTOR — Minijuego social para Discord
//  - Panel/lobby fijo con el comando !impostor (solo staff)
//  - De 3 a 10 jugadores, canal privado por partida (en la misma categoría)
//  - Roles secretos (mensajes efímeros), una palabra por turno, debate y
//    votación secreta con expulsiones hasta descubrir al impostor
//  - Premio: 3.000 Lagcoins por jugador (inocentes se reparten / impostor todo)
// ============================================================================
import fs from 'fs';
import path from 'path';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';
import { CONFIG } from '../config.js';
import { isStaff } from './helpers.js';
import db from './database.js';
import { THEMES, THEME_NAMES } from './impostorWords.js';

// ----------------------------------------------------------------------------
//  Configuración
// ----------------------------------------------------------------------------
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;
const PRIZE_PER_PLAYER = 3000;
const MAX_TIES = 2; // empates seguidos antes de que gane el impostor
const AUDIT_CHANNEL_ID = CONFIG.ACTIVITY_LOG_CHANNEL_ID;
const STATE_FILE = path.join('./data', 'impostor_state.json');

// Tiempos (ms). Se exportan mutables solo para poder probar el juego rápido.
export const __timing = {
  reveal: 60 * 1000, // máximo para que todos vean su rol
  turn: 45 * 1000, // tiempo por turno para decir la palabra
  debate: 2 * 60 * 1000, // debate
  vote: 60 * 1000, // votación
  nextRound: 7 * 1000, // pausa entre rondas
  close: 60 * 1000 // el canal se cierra tras la partida
};
const T = __timing;

// ----------------------------------------------------------------------------
//  Utilidades
// ----------------------------------------------------------------------------
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const fmt = n => Number(n || 0).toLocaleString('es-ES');
const clip = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));
function fmtDuration(ms) {
  if (ms >= 60000) {
    const m = Math.round((ms / 60000) * 10) / 10;
    return `${m} ${m === 1 ? 'minuto' : 'minutos'}`;
  }
  return `${Math.max(1, Math.round(ms / 1000))} segundos`;
}
const newId = () => Math.random().toString(36).slice(2, 7);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function normalizeWord(w) {
  return String(w).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Valida que el mensaje sea UNA sola palabra
export function parseClue(content) {
  let t = String(content || '').trim();
  t = t.replace(/^[\s"'“”«»¡¿.,;:!?()]+|[\s"'“”«»¡¿.,;:!?()]+$/g, '');
  if (!t) return { err: 'vacio' };
  if (/\s/.test(t)) return { err: 'multi' };
  if (t.length > 25) return { err: 'largo' };
  if (!/^[\p{L}\p{N}'-]+$/u.test(t)) return { err: 'invalido' };
  return { word: t };
}

// Reparto del premio: 3.000 por jugador; inocentes se reparten / el impostor se lleva todo
export function computePayouts(playerIds, impostorId, winnerSide) {
  const n = playerIds.length;
  const pool = n * PRIZE_PER_PLAYER;
  const payouts = {};
  if (winnerSide === 'impostor') {
    payouts[impostorId] = pool;
  } else {
    const innocents = playerIds.filter(id => id !== impostorId);
    const base = Math.floor(pool / innocents.length);
    const rem = pool - base * innocents.length;
    innocents.forEach(id => { payouts[id] = base; });
    shuffle(innocents).slice(0, rem).forEach(id => { payouts[id] += 1; }); // reparte los sobrantes
  }
  return { pool, payouts };
}

const recentWords = [];
export function pickWord() {
  for (let tries = 0; tries < 20; tries++) {
    const theme = THEME_NAMES[rand(0, THEME_NAMES.length - 1)];
    const words = THEMES[theme];
    const word = words[rand(0, words.length - 1)];
    if (!recentWords.includes(`${theme}:${word}`) || tries === 19) {
      recentWords.push(`${theme}:${word}`);
      if (recentWords.length > 25) recentWords.shift();
      return { theme, word };
    }
  }
  return { theme: THEME_NAMES[0], word: THEMES[THEME_NAMES[0]][0] };
}

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`[Impostor] Error leyendo ${file}:`, e.message);
  }
  return fallback;
}
function writeJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`[Impostor] Error guardando ${file}:`, e.message);
  }
}

// ----------------------------------------------------------------------------
//  Estado persistente (paneles activos y canales de partida abiertos)
// ----------------------------------------------------------------------------
const state = readJson(STATE_FILE, { mains: [], games: {} });
if (!Array.isArray(state.mains)) state.mains = [];
if (!state.games || typeof state.games !== 'object') state.games = {};
const saveState = () => writeJson(STATE_FILE, state);

// ----------------------------------------------------------------------------
//  Economía / logs (importación perezosa para no acoplar la carga del módulo)
// ----------------------------------------------------------------------------
async function payOut(guildId, userId, amount, reason) {
  const { addUserLagcoins } = await import('./economyDB.js');
  return addUserLagcoins(guildId, userId, amount, reason);
}
async function isJailed(guildId, userId) {
  try {
    const { getUserJailStatus } = await import('./economyDB.js');
    const j = await getUserJailStatus(guildId, userId);
    return !!j?.jailed;
  } catch {
    return false;
  }
}
async function logImpostor(data) {
  try {
    const { logActivity, LOG_TYPES } = await import('./activityLogger.js');
    logActivity({ command: 'impostor', ...data, type: data.win ? LOG_TYPES.MINIGAME_WIN : LOG_TYPES.MINIGAME_LOSS });
  } catch (e) {
    console.error('[Impostor] Error registrando actividad:', e.message);
  }
}

// ----------------------------------------------------------------------------
//  Estado en memoria
// ----------------------------------------------------------------------------
let client = null;
const lobbies = new Map(); // messageId -> lobby
const games = new Map(); // gameId -> game
const gameByChannel = new Map(); // channelId -> game
const busy = new Map(); // userId -> 'lobby:<key>' | 'game:<id>'

// ----------------------------------------------------------------------------
//  Lobby (embed principal)
// ----------------------------------------------------------------------------
function lobbyEmbed(lobby) {
  const n = lobby.players.length;
  const playing = lobby.status !== 'waiting';
  const list = n
    ? lobby.players.map((id, i) => `**${i + 1}.** <@${id}>${id === lobby.hostId ? ' 👑' : ''}`).join('\n')
    : '*Nadie se ha unido todavía…*';

  const description = playing
    ? `🎮 **¡Partida en curso!** ${lobby.gameChannelId ? `<#${lobby.gameChannelId}>` : ''}\nCuando termine, este panel volverá a abrirse para una nueva partida.`
    : '🕵️ Entre ustedes se esconde un **Impostor** que no conoce la palabra secreta.\n\n' +
      '1️⃣ Todos reciben su rol **en secreto** (el impostor solo sabe el **tema**).\n' +
      '2️⃣ Cada jugador dice **UNA sola palabra** relacionada con la palabra secreta.\n' +
      '3️⃣ Se **debate** y se **vota en secreto** para expulsar al impostor.\n' +
      '4️⃣ Si lo descubren, ganan los **inocentes**; si no, gana el **impostor**.';

  return {
    color: playing ? 0xE67E22 : 0x8E44AD,
    title: '🕵️ EL IMPOSTOR',
    description,
    fields: [
      { name: `👥 Jugadores (${n}/${MAX_PLAYERS})`, value: list },
      {
        name: '💰 Premio',
        value: `**${fmt(PRIZE_PER_PLAYER * n)}** Lagcoins *(${fmt(PRIZE_PER_PLAYER)} por jugador)*\n🏆 Inocentes: se reparten el premio · 🔪 Impostor: se lo lleva todo`,
        inline: true
      },
      {
        name: '📋 Requisitos',
        value: `De **${MIN_PLAYERS}** a **${MAX_PLAYERS}** jugadores\nInicia el anfitrión 👑 o un administrador`,
        inline: true
      }
    ],
    footer: { text: playing ? 'Sala ocupada' : 'Pulsa 🟩 Unirse / Salir para entrar o salir de la lista' }
  };
}

function lobbyComponents(lobby) {
  const playing = lobby.status !== 'waiting';
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('imp_join').setLabel('Unirse / Salir').setEmoji('🟩').setStyle(ButtonStyle.Success).setDisabled(playing),
      new ButtonBuilder().setCustomId('imp_start').setLabel('Iniciar Partida').setEmoji('▶️').setStyle(ButtonStyle.Primary).setDisabled(playing || lobby.players.length < MIN_PLAYERS)
    )
  ];
}

function makeLobby(channel, message) {
  return {
    key: message?.id || null,
    guildId: channel.guild.id,
    channel,
    message,
    hostId: null,
    players: [],
    names: {},
    status: 'waiting', // waiting | starting | playing
    gameId: null,
    gameChannelId: null
  };
}

async function refreshLobby(lobby) {
  if (!lobby.message) return;
  try {
    await lobby.message.edit({ embeds: [lobbyEmbed(lobby)], components: lobbyComponents(lobby) });
  } catch {}
}

function registerLobby(lobby) {
  lobbies.set(lobby.key, lobby);
  if (!state.mains.some(m => m.messageId === lobby.key)) {
    state.mains.push({ guildId: lobby.guildId, channelId: lobby.channel.id, messageId: lobby.key });
    saveState();
  }
}

// ----------------------------------------------------------------------------
//  Handlers del lobby
// ----------------------------------------------------------------------------
async function handleJoin(interaction) {
  const lobby = lobbies.get(interaction.message?.id);
  if (!lobby) {
    return interaction.reply({ content: '❌ Este panel ya no está activo. Pide al staff que use `!impostor` otra vez.', flags: 64 });
  }
  if (lobby.status !== 'waiting') {
    return interaction.reply({ content: '🎮 Ya hay una partida en curso en esta sala. Espera a que termine.', flags: 64 });
  }
  const uid = interaction.user.id;

  if (lobby.players.includes(uid)) {
    // Salir
    lobby.players = lobby.players.filter(id => id !== uid);
    busy.delete(uid);
    if (lobby.hostId === uid) lobby.hostId = lobby.players[0] || null;
  } else {
    // Unirse
    if (lobby.players.length >= MAX_PLAYERS) {
      return interaction.reply({ content: `❌ La sala está llena (${MAX_PLAYERS}/${MAX_PLAYERS}).`, flags: 64 });
    }
    const userData = db.getUser(interaction.guild.id, uid);
    if (userData.isInactive) {
      return interaction.reply({ content: '❌ No puedes participar en minijuegos mientras tengas el rol de inactividad.', flags: 64 });
    }
    if (await isJailed(interaction.guild.id, uid)) {
      return interaction.reply({ content: '🚔 Estás en la cárcel, no puedes jugar ahora.', flags: 64 });
    }
    if (busy.has(uid)) {
      return interaction.reply({ content: '❌ Ya estás en otra sala o partida de El Impostor.', flags: 64 });
    }
    // Revalidar tras los awaits
    if (lobby.status !== 'waiting' || lobby.players.length >= MAX_PLAYERS || lobby.players.includes(uid)) {
      return interaction.reply({ content: '❌ La sala cambió, inténtalo de nuevo.', flags: 64 });
    }
    lobby.players.push(uid);
    lobby.names[uid] = interaction.member?.displayName || interaction.user.username;
    busy.set(uid, `lobby:${lobby.key}`);
    if (!lobby.hostId) lobby.hostId = uid;
  }
  await interaction.update({ embeds: [lobbyEmbed(lobby)], components: lobbyComponents(lobby) });
}

async function handleStart(interaction) {
  const lobby = lobbies.get(interaction.message?.id);
  if (!lobby) {
    return interaction.reply({ content: '❌ Este panel ya no está activo.', flags: 64 });
  }
  if (lobby.status !== 'waiting') {
    return interaction.reply({ content: '🎮 La partida ya comenzó.', flags: 64 });
  }
  const isAdmin = isStaff(interaction.member) || interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator);
  if (interaction.user.id !== lobby.hostId && !isAdmin) {
    return interaction.reply({
      content: `❌ Solo el anfitrión${lobby.hostId ? ` (<@${lobby.hostId}>)` : ''} o un administrador puede iniciar la partida.`,
      flags: 64
    });
  }
  if (lobby.players.length < MIN_PLAYERS) {
    return interaction.reply({ content: `❌ Se necesitan al menos **${MIN_PLAYERS}** jugadores (hay ${lobby.players.length}).`, flags: 64 });
  }
  lobby.status = 'starting';
  await interaction.deferUpdate();
  try {
    await launchGame(lobby);
  } catch (e) {
    console.error('[Impostor] Error al iniciar:', e);
    lobby.status = 'waiting';
    await refreshLobby(lobby);
    await interaction.followUp({ content: '❌ No pude iniciar la partida. Revisa que el bot tenga el permiso **Gestionar canales**.', flags: 64 }).catch(() => {});
  }
}

// ----------------------------------------------------------------------------
//  Inicio de la partida
// ----------------------------------------------------------------------------
function ev(game, text) {
  if (game.events.length < 3000) game.events.push({ t: Date.now(), text });
}

async function sendTemp(channel, payload, ms) {
  try {
    const m = await channel.send(payload);
    setTimeout(() => m.delete().catch(() => {}), ms);
    return m;
  } catch {
    return null;
  }
}

function rolesText(game, player) {
  if (player.role === 'impostor') {
    return `🔪 ¡Eres el **Impostor**! El tema es **${game.theme}**, pero no sabes la palabra secreta. Presta atención a lo que dicen los demás y trata de pasar desapercibido.`;
  }
  return `🤫 Eres un **Inocente**. El tema es **${game.theme}** y la palabra secreta es **${game.word}**. No dejes que el impostor la descubra.`;
}

function introEmbed(game) {
  return {
    color: 0x8E44AD,
    title: '🕵️ ¡Comienza El Impostor!',
    description:
      'Pulsa **🔍 Ver mi rol** para descubrir tu rol. **Solo tú** verás la respuesta.\n' +
      `Cuando todos lo hayan visto (o pasen **${Math.round(T.reveal / 1000)} s**) empieza la ronda de pistas.`,
    fields: [
      { name: '🎯 Tema', value: `**${game.theme}**`, inline: true },
      { name: '💰 Premio', value: `**${fmt(game.pool)}** Lagcoins`, inline: true },
      { name: '👥 Jugadores', value: game.players.map(p => `<@${p.id}>`).join(' ') }
    ],
    footer: { text: `👀 Han visto su rol: ${game.viewed.size}/${game.players.length}` }
  };
}

function introComponents(game, disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`imp_role_${game.id}`).setLabel('Ver mi rol').setEmoji('🔍').setStyle(ButtonStyle.Primary).setDisabled(disabled)
    )
  ];
}

async function launchGame(lobby) {
  const guild = lobby.channel.guild;
  const gid = newId();
  const players = [...lobby.players];

  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory]
    },
    ...players.map(id => ({
      id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    }))
  ];
  const gch = await guild.channels.create({
    name: `impostor-${gid}`,
    type: ChannelType.GuildText,
    parent: lobby.channel.parentId || undefined,
    topic: `🕵️ El Impostor · Partida #${gid}`,
    permissionOverwrites: overwrites
  });

  const { theme, word } = pickWord();
  const impostorId = players[rand(0, players.length - 1)];
  const game = {
    id: gid,
    guildId: lobby.guildId,
    lobby,
    channel: gch,
    mainChannel: lobby.channel,
    players: players.map(id => ({ id, name: lobby.names[id] || 'Jugador', alive: true, role: id === impostorId ? 'impostor' : 'innocent' })),
    impostorId,
    theme,
    word,
    pool: players.length * PRIZE_PER_PLAYER,
    phase: 'reveal', // reveal | clues | debate | vote | tally | ended
    ended: false,
    round: 0,
    ties: 0,
    clues: [], // { round, userId, word|null }
    rounds: [], // resultados de cada votación
    usedWords: new Set(),
    viewed: new Set(),
    turn: null,
    ready: new Set(),
    vote: null,
    introMsg: null,
    debateMsg: null,
    voteMsg: null,
    revealTimer: null,
    debateTimer: null,
    startedAt: Date.now(),
    chat: [],
    events: [],
    warnAt: new Map()
  };
  games.set(gid, game);
  gameByChannel.set(gch.id, game);
  for (const id of players) busy.set(id, `game:${gid}`);
  state.games[gch.id] = { gameId: gid, mainChannelId: lobby.channel.id };
  saveState();

  lobby.status = 'playing';
  lobby.gameId = gid;
  lobby.gameChannelId = gch.id;
  await refreshLobby(lobby);

  ev(game, `Partida creada por el anfitrión ${lobby.names[lobby.hostId] || lobby.hostId}`);
  ev(game, `Jugadores: ${game.players.map(p => `${p.name} (${p.id})`).join(', ')}`);
  ev(game, `[SECRETO] Tema: ${theme} · Palabra: ${word} · Impostor: ${game.players.find(p => p.id === impostorId).name} (${impostorId})`);

  try {
    game.introMsg = await gch.send({
      content: `🕵️ ${players.map(id => `<@${id}>`).join(' ')} — ¡su partida está lista!`,
      embeds: [introEmbed(game)],
      components: introComponents(game)
    });
  } catch (e) {
    await abortGame(game, 'No pude enviar mensajes en el canal de la partida.');
    return;
  }
  game.revealTimer = setTimeout(() => beginClues(game), T.reveal);
}

// ----------------------------------------------------------------------------
//  Revelación de roles (mensajes efímeros)
// ----------------------------------------------------------------------------
function getActiveGame(id) {
  const g = games.get(id);
  return g && !g.ended ? g : null;
}

async function handleRole(interaction) {
  const game = getActiveGame(interaction.customId.replace('imp_role_', ''));
  if (!game) return interaction.reply({ content: '❌ Esta partida ya terminó.', flags: 64 });
  const player = game.players.find(p => p.id === interaction.user.id);
  if (!player) return interaction.reply({ content: '❌ No participas en esta partida.', flags: 64 });

  await interaction.reply({ content: rolesText(game, player), flags: 64 });

  if (!game.viewed.has(player.id)) {
    game.viewed.add(player.id);
    ev(game, `${player.name} vio su rol`);
    game.introMsg?.edit({ embeds: [introEmbed(game)] }).catch(() => {});
    if (game.phase === 'reveal' && game.viewed.size >= game.players.length) {
      clearTimeout(game.revealTimer);
      game.revealTimer = setTimeout(() => beginClues(game), 2000);
    }
  }
}

// ----------------------------------------------------------------------------
//  Fase de pistas
// ----------------------------------------------------------------------------
async function beginClues(game) {
  if (game.ended || game.phase !== 'reveal') return;
  clearTimeout(game.revealTimer);
  try {
    await runClues(game);
  } catch (e) {
    console.error('[Impostor] Error en la fase de pistas:', e);
    await abortGame(game, 'Error interno durante la partida.');
  }
}

function orderEmbed(game, order) {
  const alive = order.length;
  const first = game.round === 1;
  return {
    color: 0x3498DB,
    title: first ? '🎬 ¡Comienza el juego!' : `🔁 Ronda ${game.round}`,
    description: first
      ? `El tema de esta ronda es **${game.theme}**.\nCada jugador debe decir **UNA sola palabra** que esté relacionada con la palabra secreta.`
      : `Quedan **${alive}** jugadores. El tema sigue siendo **${game.theme}**.\nCada jugador dice **UNA** palabra nueva (no se pueden repetir las ya dichas).`,
    fields: [
      { name: '🔢 Orden de turnos', value: order.map((p, i) => `**${i + 1}.** <@${p.id}>`).join('\n') }
    ],
    footer: { text: `Tienes ${Math.round(T.turn / 1000)} s para responder en tu turno · Un mensaje fuera de turno se borra` }
  };
}

async function waitForClue(game, player) {
  let done;
  const result = new Promise(res => { done = res; });
  const turn = {
    userId: player.id,
    timer: null,
    done: word => {
      clearTimeout(turn.timer);
      if (game.turn === turn) game.turn = null;
      done(word);
    }
  };
  turn.timer = setTimeout(() => turn.done(null), T.turn);
  game.turn = turn;
  await game.channel.send({
    content: `<@${player.id}>, es tu turno de decir una palabra. ⏳ <t:${Math.floor((Date.now() + T.turn) / 1000)}:R>`,
    allowedMentions: { users: [player.id] }
  }).catch(() => {});
  return result;
}

async function runClues(game) {
  game.phase = 'clues';
  game.round++;
  game.ready = new Set();
  const order = shuffle(game.players.filter(p => p.alive));
  ev(game, `── Ronda ${game.round} de pistas · orden: ${order.map(p => p.name).join(' > ')}`);
  await game.channel.send({ embeds: [orderEmbed(game, order)] });

  for (const p of order) {
    if (game.ended) return;
    const word = await waitForClue(game, p);
    if (game.ended) return;
    game.clues.push({ round: game.round, userId: p.id, word });
    if (word) {
      ev(game, `Pista de ${p.name}: ${word}`);
    } else {
      ev(game, `${p.name} no dijo ninguna palabra (tiempo agotado)`);
      await game.channel.send({ content: `⏱️ **${p.name}** no dijo nada a tiempo.`, allowedMentions: { parse: [] } }).catch(() => {});
    }
  }
  if (game.ended) return;
  await startDebate(game);
}

async function onClueMessage(message, game, player) {
  const warn = text => {
    const last = game.warnAt.get(player.id) || 0;
    if (Date.now() - last < 4000) return;
    game.warnAt.set(player.id, Date.now());
    sendTemp(message.channel, { content: `<@${player.id}> ${text}`, allowedMentions: { users: [player.id] } }, 6000);
  };
  const turn = game.turn;
  if (!turn || turn.userId !== player.id) {
    message.delete().catch(() => {});
    warn('⛔ Espera tu turno: ahora no te toca hablar.');
    return;
  }
  const parsed = parseClue(message.content);
  if (parsed.err) {
    message.delete().catch(() => {});
    warn(parsed.err === 'multi'
      ? '⛔ Debes decir **UNA sola palabra**. Vuelve a intentarlo.'
      : '⛔ Eso no es una palabra válida. Escribe **UNA sola palabra**.');
    return;
  }
  const norm = normalizeWord(parsed.word);
  if (game.usedWords.has(norm)) {
    message.delete().catch(() => {});
    warn('⛔ Esa palabra ya fue dicha. Elige otra.');
    return;
  }
  game.usedWords.add(norm);
  turn.done(parsed.word);
}

// ----------------------------------------------------------------------------
//  Debate
// ----------------------------------------------------------------------------
function cluesField(game) {
  const lines = [];
  for (let r = 1; r <= game.round; r++) {
    const cl = game.clues.filter(c => c.round === r);
    if (!cl.length) continue;
    const text = cl.map(c => `<@${c.userId}>: **${c.word || '—'}**`).join('\n');
    lines.push(game.round > 1 ? `**Ronda ${r}**\n${text}` : text);
  }
  return clip(lines.join('\n\n') || '—', 1024);
}

function debateEmbed(game) {
  const alive = game.players.filter(p => p.alive).length;
  return {
    color: 0xF1C40F,
    title: '💬 Fase de debate',
    description:
      `Tienen **${fmtDuration(T.debate)}** para debatir.\n` +
      `¿Quién creen que es el impostor? La votación empieza <t:${Math.floor((Date.now() + T.debate) / 1000)}:R>.`,
    fields: [{ name: '📋 Pistas', value: cluesField(game) }],
    footer: { text: `⏭️ Listos para votar: ${game.ready.size}/${alive} · Si todos pulsan el botón, se vota ya` }
  };
}

async function startDebate(game) {
  game.phase = 'debate';
  game.ready = new Set();
  ev(game, 'Comienza el debate');
  game.debateMsg = await game.channel.send({
    embeds: [debateEmbed(game)],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`imp_skip_${game.id}`).setLabel('Estoy listo para votar').setEmoji('⏭️').setStyle(ButtonStyle.Secondary)
      )
    ]
  });
  game.debateTimer = setTimeout(() => startVote(game).catch(e => onFlowError(game, e)), T.debate);
}

async function handleSkip(interaction) {
  const game = getActiveGame(interaction.customId.replace('imp_skip_', ''));
  if (!game) return interaction.reply({ content: '❌ Esta partida ya terminó.', flags: 64 });
  const player = game.players.find(p => p.id === interaction.user.id && p.alive);
  if (!player) return interaction.reply({ content: '❌ Solo los jugadores que siguen en la partida pueden pulsar esto.', flags: 64 });
  if (game.phase !== 'debate') return interaction.reply({ content: '⏳ El debate ya terminó.', flags: 64 });
  game.ready.add(player.id);
  const alive = game.players.filter(p => p.alive).length;
  await interaction.reply({ content: `✅ Marcaste que estás listo para votar (${game.ready.size}/${alive}).`, flags: 64 });
  game.debateMsg?.edit({ embeds: [debateEmbed(game)] }).catch(() => {});
  if (game.ready.size >= alive) {
    clearTimeout(game.debateTimer);
    startVote(game).catch(e => onFlowError(game, e));
  }
}

// ----------------------------------------------------------------------------
//  Votación
// ----------------------------------------------------------------------------
function voteEmbed(game) {
  const alive = game.players.filter(p => p.alive);
  const voted = alive.filter(p => game.vote.votes.has(p.id));
  const missing = alive.filter(p => !game.vote.votes.has(p.id));
  return {
    color: 0xE74C3C,
    title: `🗳️ ¡Hora de votar! — Ronda ${game.round}`,
    description:
      'Elige en el menú a quién quieres **expulsar**. Tu voto es **secreto** y **definitivo** (nadie verá tu elección hasta el final).\n' +
      `⏳ La votación termina <t:${Math.floor(game.vote.deadline / 1000)}:R>.`,
    fields: [
      { name: `✅ Ya votaron (${voted.length}/${alive.length})`, value: voted.length ? voted.map(p => `<@${p.id}>`).join(' ') : '—' },
      { name: '⌛ Faltan', value: missing.length ? missing.map(p => `<@${p.id}>`).join(' ') : '—' }
    ]
  };
}

async function startVote(game) {
  if (game.ended || game.phase !== 'debate') return;
  clearTimeout(game.debateTimer);
  game.phase = 'vote';
  game.debateMsg?.edit({ components: [] }).catch(() => {});
  const alive = game.players.filter(p => p.alive);
  game.vote = { round: game.round, votes: new Map(), deadline: Date.now() + T.vote, timer: null };
  ev(game, `Comienza la votación de la ronda ${game.round}`);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`imp_vote_${game.id}_${game.round}`)
    .setPlaceholder('🗳️ ¿A quién expulsas?')
    .addOptions(alive.map(p => ({ label: clip(p.name, 100), value: p.id, description: 'Votar para expulsarlo' })));

  game.voteMsg = await game.channel.send({
    content: `🗳️ ${alive.map(p => `<@${p.id}>`).join(' ')} — ¡a votar!`,
    allowedMentions: { users: alive.map(p => p.id) },
    embeds: [voteEmbed(game)],
    components: [new ActionRowBuilder().addComponents(menu)]
  });
  game.vote.timer = setTimeout(() => endVote(game).catch(e => onFlowError(game, e)), T.vote);
}

async function handleVote(interaction) {
  const [, , gid, roundStr] = interaction.customId.split('_');
  const game = getActiveGame(gid);
  if (!game) return interaction.reply({ content: '❌ Esta partida ya terminó.', flags: 64 });
  if (game.phase !== 'vote' || !game.vote || game.vote.round !== Number(roundStr)) {
    return interaction.reply({ content: '⏳ Esta votación ya terminó.', flags: 64 });
  }
  const voter = game.players.find(p => p.id === interaction.user.id);
  if (!voter) return interaction.reply({ content: '❌ No participas en esta partida.', flags: 64 });
  if (!voter.alive) return interaction.reply({ content: '❌ Fuiste expulsado: ya no puedes votar.', flags: 64 });
  if (game.vote.votes.has(voter.id)) {
    return interaction.reply({ content: '🔒 Ya votaste en esta ronda. Tu voto es definitivo.', flags: 64 });
  }
  const targetId = interaction.values[0];
  const target = game.players.find(p => p.id === targetId && p.alive);
  if (!target) return interaction.reply({ content: '❌ Ese jugador ya no está en la partida.', flags: 64 });
  if (target.id === voter.id) return interaction.reply({ content: '❌ No puedes votar por ti mismo.', flags: 64 });

  game.vote.votes.set(voter.id, target.id);
  ev(game, `[VOTO SECRETO] ${voter.name} votó por ${target.name}`);
  await interaction.reply({ content: `🗳️ Votaste por **${target.name}**. Tu voto es secreto y definitivo.`, flags: 64 });

  game.voteMsg?.edit({ embeds: [voteEmbed(game)] }).catch(() => {});
  const alive = game.players.filter(p => p.alive).length;
  if (game.vote.votes.size >= alive) {
    clearTimeout(game.vote.timer);
    endVote(game).catch(e => onFlowError(game, e));
  }
}

function roundEmbed(game, rec) {
  const lines = rec.voters.map(v => {
    const t = rec.votes[v.id];
    return `<@${v.id}> → ${t ? `<@${t}>` : '*no votó*'}`;
  });
  const counts = Object.entries(rec.counts).sort((a, b) => b[1] - a[1]).map(([id, c]) => `<@${id}>: **${c}**`);
  let verdict;
  if (rec.outcome === 'caught') verdict = `🎯 ¡Han descubierto al impostor! Era <@${rec.expelledId}>.`;
  else if (rec.outcome === 'innocent') verdict = `❌ <@${rec.expelledId}> fue expulsado… ¡**era inocente**! El impostor sigue entre ustedes.`;
  else verdict = '🤝 **Empate**: nadie fue expulsado.';
  return {
    color: rec.outcome === 'caught' ? 0x2ECC71 : 0xE67E22,
    title: `📊 Resultado de la votación — Ronda ${rec.round}`,
    description: verdict,
    fields: [
      { name: '🗳️ Quién votó a quién', value: clip(lines.join('\n') || '—', 1024) },
      { name: '📈 Conteo', value: clip(counts.join(' · ') || 'Sin votos', 1024) }
    ]
  };
}

async function endVote(game) {
  if (game.ended || game.phase !== 'vote') return;
  game.phase = 'tally';
  clearTimeout(game.vote.timer);
  game.voteMsg?.edit({ components: [], embeds: [voteEmbed(game)] }).catch(() => {});

  const voters = game.players.filter(p => p.alive);
  const votes = {};
  voters.forEach(v => { votes[v.id] = game.vote.votes.get(v.id) || null; });
  const counts = {};
  Object.values(votes).forEach(t => { if (t) counts[t] = (counts[t] || 0) + 1; });
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.entries(counts).filter(([, c]) => c === max && max > 0).map(([id]) => id);

  const rec = { round: game.round, voters: voters.map(v => ({ id: v.id, name: v.name })), votes, counts, outcome: 'tie', expelledId: null };
  if (top.length === 1) {
    rec.expelledId = top[0];
    rec.outcome = top[0] === game.impostorId ? 'caught' : 'innocent';
  }
  game.rounds.push(rec);
  const nameOf = id => game.players.find(p => p.id === id)?.name || id;
  ev(game, `── Resultado ronda ${rec.round}: ` + voters.map(v => `${v.name} → ${votes[v.id] ? nameOf(votes[v.id]) : '(no votó)'}`).join(' | '));

  await game.channel.send({ embeds: [roundEmbed(game, rec)] });
  if (game.ended) return;

  if (rec.outcome === 'caught') {
    ev(game, `Los inocentes descubrieron al impostor (${nameOf(rec.expelledId)})`);
    return finishGame(game, 'innocents', 'Descubrieron al impostor');
  }

  if (rec.outcome === 'innocent') {
    game.ties = 0;
    const expelled = game.players.find(p => p.id === rec.expelledId);
    expelled.alive = false;
    ev(game, `${expelled.name} (inocente) fue expulsado`);
    game.channel.permissionOverwrites.edit(expelled.id, { SendMessages: false }).catch(() => {});
    const left = game.players.filter(p => p.alive).length;
    if (left <= 2) {
      return finishGame(game, 'impostor', `Solo quedaron ${left} jugadores sin descubrir al impostor`);
    }
  } else {
    game.ties++;
    ev(game, `Empate en la votación (${game.ties}/${MAX_TIES})`);
    if (game.ties >= MAX_TIES) {
      return finishGame(game, 'impostor', 'No lograron ponerse de acuerdo (dos empates seguidos)');
    }
  }

  await game.channel.send({
    content: `⏭️ La partida continúa… la siguiente ronda empieza <t:${Math.floor((Date.now() + T.nextRound) / 1000)}:R>.`,
    allowedMentions: { parse: [] }
  }).catch(() => {});
  setTimeout(() => {
    if (game.ended) return;
    game.phase = 'clues';
    runClues(game).catch(e => onFlowError(game, e));
  }, T.nextRound);
}

async function onFlowError(game, e) {
  console.error('[Impostor] Error en el flujo de la partida:', e);
  await abortGame(game, 'Error interno durante la partida.');
}

// ----------------------------------------------------------------------------
//  Fin de la partida
// ----------------------------------------------------------------------------
function clearTimers(game) {
  clearTimeout(game.revealTimer);
  clearTimeout(game.debateTimer);
  if (game.vote) clearTimeout(game.vote.timer);
  if (game.turn) game.turn.done(null);
}

function finalEmbed(game, winnerSide, reason, payouts) {
  const imp = game.players.find(p => p.id === game.impostorId);
  const innocentsWin = winnerSide === 'innocents';
  const last = game.rounds[game.rounds.length - 1];

  const summary = game.rounds.map(r => {
    const who = r.outcome === 'tie' ? 'empate, nadie expulsado' : `expulsado <@${r.expelledId}> (${r.outcome === 'caught' ? '🔪 impostor' : 'inocente'})`;
    return `**Ronda ${r.round}:** ${who}`;
  });
  const payLines = Object.entries(payouts).map(([id, amt]) => `<@${id}> **+${fmt(amt)}**`);

  const fields = [
    { name: '🔪 El impostor era', value: `<@${imp.id}> *(${imp.name})*`, inline: true },
    { name: '🎯 Tema y palabra', value: `**${game.theme}** — **${game.word}**`, inline: true },
    { name: '📜 Rondas', value: clip(summary.join('\n') || '—', 1024) }
  ];
  if (last) {
    const lines = last.voters.map(v => `<@${v.id}> → ${last.votes[v.id] ? `<@${last.votes[v.id]}>` : '*no votó*'}`);
    fields.push({ name: `🗳️ Quién votó a quién (ronda ${last.round})`, value: clip(lines.join('\n'), 1024) });
  }
  fields.push({
    name: `💰 Premio: ${fmt(game.pool)} Lagcoins`,
    value: clip(`${innocentsWin ? `Los inocentes se reparten el premio (${Object.keys(payouts).length} jugadores)` : 'El impostor se lleva todo'}\n${payLines.join('\n')}`, 1024)
  });
  return {
    color: innocentsWin ? 0x2ECC71 : 0xE74C3C,
    title: innocentsWin ? '🏆 ¡Ganan los INOCENTES!' : '🔪 ¡Gana el IMPOSTOR!',
    description: `${reason}.`,
    fields,
    timestamp: new Date().toISOString()
  };
}

async function sendAuditLog(game, status, extraLines = []) {
  try {
    const ch = await client.channels.fetch(AUDIT_CHANNEL_ID).catch(() => null);
    if (!ch?.isTextBased()) {
      console.warn('[Impostor] Canal de auditoría no disponible');
      return;
    }
    const clean = t => String(t).replace(/\*\*/g, '').replace(/<@!?(\d+)>/g, '@$1');
    const rel = ms => {
      const sec = Math.max(0, Math.round((ms - game.startedAt) / 1000));
      return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    };
    const imp = game.players.find(p => p.id === game.impostorId);
    const nameOf = id => game.players.find(p => p.id === id)?.name || id;
    const L = [];
    L.push('==================================================');
    L.push(' EL IMPOSTOR — REGISTRO DE PARTIDA');
    L.push('==================================================');
    L.push(`Estado: ${status}`);
    L.push(`Partida: #${game.id}`);
    L.push(`Servidor: ${game.channel.guild?.name || game.guildId} (${game.guildId})`);
    L.push(`Canal de la partida: #${game.channel.name || game.channel.id} (${game.channel.id})`);
    L.push(`Inicio: ${new Date(game.startedAt).toISOString()}`);
    L.push(`Fin: ${new Date().toISOString()}`);
    L.push(`Tema: ${game.theme} · Palabra secreta: ${game.word}`);
    L.push(`Impostor: ${imp.name} (${imp.id})`);
    L.push(`Premio total: ${game.pool} Lagcoins (${PRIZE_PER_PLAYER} × ${game.players.length} jugadores)`);
    L.push(`Rondas jugadas: ${game.round}`);
    L.push('');
    L.push('JUGADORES');
    game.players.forEach((p, i) => L.push(`  ${i + 1}. ${p.name} (${p.id}) — ${p.role === 'impostor' ? 'IMPOSTOR' : 'inocente'}${p.alive ? '' : ' [expulsado]'}`));
    L.push('');
    L.push('PISTAS POR RONDA');
    for (let r = 1; r <= game.round; r++) {
      const cl = game.clues.filter(c => c.round === r);
      if (!cl.length) continue;
      L.push(`  Ronda ${r}: ${cl.map(c => `${nameOf(c.userId)}=${c.word || '(sin palabra)'}`).join(', ')}`);
    }
    L.push('');
    L.push('VOTACIONES (quién votó a quién)');
    game.rounds.forEach(r => {
      L.push(`  Ronda ${r.round}:`);
      r.voters.forEach(v => L.push(`    ${v.name} → ${r.votes[v.id] ? nameOf(r.votes[v.id]) : '(no votó)'}`));
      L.push(`    Resultado: ${r.outcome === 'tie' ? 'empate' : `${nameOf(r.expelledId)} expulsado (${r.outcome === 'caught' ? 'era el IMPOSTOR' : 'inocente'})`}`);
    });
    L.push('');
    L.push('CRONOLOGÍA [mm:ss desde el inicio]');
    game.events.forEach(e => L.push(`  [${rel(e.t)}] ${clean(e.text)}`));
    L.push('');
    L.push('CHAT DEL CANAL DURANTE LA PARTIDA');
    if (!game.chat.length) L.push('  (sin mensajes)');
    game.chat.forEach(c => L.push(`  [${rel(c.t)}] ${c.name}: ${c.content}`));
    if (extraLines.length) {
      L.push('');
      L.push('RESULTADO ECONÓMICO');
      extraLines.forEach(x => L.push(`  ${clean(x)}`));
    }
    const buf = Buffer.from(L.join('\n'), 'utf8');
    await ch.send({
      content: `📄 **El Impostor** · Partida #${game.id} · ${status}\n🔪 Impostor: **${imp.name}** · 👥 ${game.players.map(p => p.name).join(', ')}`,
      files: [new AttachmentBuilder(buf, { name: `impostor-${game.id}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt` })],
      allowedMentions: { parse: [] }
    });
  } catch (e) {
    console.error('[Impostor] No pude enviar el registro de auditoría:', e.message);
  }
}

// Libera jugadores y vuelve a publicar el embed principal (borra el viejo)
async function restoreLobby(game) {
  const old = game.lobby;
  for (const p of game.players) busy.delete(p.id);
  lobbies.delete(old.key);
  delete state.games[game.channel.id];
  state.mains = state.mains.filter(m => m.messageId !== old.key);
  saveState();
  await old.message?.delete().catch(() => {});
  try {
    const fresh = makeLobby(old.channel, null);
    const sent = await old.channel.send({ embeds: [lobbyEmbed(fresh)], components: lobbyComponents(fresh) });
    fresh.message = sent;
    fresh.key = sent.id;
    registerLobby(fresh);
  } catch (e) {
    console.error('[Impostor] No pude volver a publicar el embed principal:', e.message);
  }
}

async function closeChannelLater(game, ms) {
  try {
    for (const p of game.players) {
      await game.channel.permissionOverwrites.edit(p.id, { SendMessages: false }).catch(() => {});
    }
  } catch {}
  setTimeout(() => game.channel.delete('El Impostor: partida terminada').catch(() => {}), ms);
}

async function finishGame(game, winnerSide, reason) {
  if (game.ended) return;
  game.ended = true;
  game.phase = 'ended';
  clearTimers(game);
  game.introMsg?.edit({ components: introComponents(game, true) }).catch(() => {});

  const ids = game.players.map(p => p.id);
  const { payouts } = computePayouts(ids, game.impostorId, winnerSide);
  const payResult = [];
  for (const [id, amount] of Object.entries(payouts)) {
    try {
      await payOut(game.guildId, id, amount, 'impostor_transfer_win');
      payResult.push(`${game.players.find(p => p.id === id).name} (${id}) recibió ${amount} Lagcoins`);
    } catch (e) {
      console.error('[Impostor] Error pagando premio:', e.message);
      payResult.push(`ERROR pagando ${amount} a ${id}: ${e.message}`);
    }
  }
  ev(game, `FIN: ganan ${winnerSide === 'innocents' ? 'los INOCENTES' : 'el IMPOSTOR'} — ${reason}`);

  // Registro de actividad
  for (const p of game.players) {
    const won = payouts[p.id] !== undefined;
    logImpostor({
      win: won,
      userId: p.id,
      guildId: game.guildId,
      amount: payouts[p.id] || 0,
      importance: won ? 'medium' : 'low',
      reason: won ? 'Victoria en El Impostor' : 'Derrota en El Impostor',
      details: { minigame: 'impostor', role: p.role, winnerSide, pool: game.pool, players: game.players.length }
    });
  }

  const embed = finalEmbed(game, winnerSide, reason, payouts);
  await game.channel.send({
    embeds: [embed],
    content: `🔒 Este canal se cerrará <t:${Math.floor((Date.now() + T.close) / 1000)}:R>.`
  }).catch(() => {});

  // Constancia en el canal del embed principal + archivo en el canal de logs
  await game.mainChannel.send({ embeds: [embed] }).catch(e => console.error('[Impostor] constancia:', e.message));
  await sendAuditLog(game, 'FINALIZADA', payResult);

  gameByChannel.delete(game.channel.id);
  games.delete(game.id);
  await restoreLobby(game); // borra el panel viejo y publica uno nuevo debajo de la constancia
  closeChannelLater(game, T.close);
}

async function abortGame(game, reason) {
  if (game.ended) return;
  game.ended = true;
  game.phase = 'ended';
  clearTimers(game);
  ev(game, `PARTIDA CANCELADA: ${reason}`);
  await game.channel.send(`⚠️ **Partida cancelada:** ${reason} No se entregaron premios. El canal se cerrará pronto.`).catch(() => {});
  await sendAuditLog(game, `CANCELADA (${reason})`, ['No se entregaron premios.']);
  gameByChannel.delete(game.channel.id);
  games.delete(game.id);
  await restoreLobby(game);
  setTimeout(() => game.channel.delete('El Impostor: partida cancelada').catch(() => {}), 10000);
}

// ----------------------------------------------------------------------------
//  Router de interacciones y mensajes
// ----------------------------------------------------------------------------
async function onInteraction(interaction) {
  const id = interaction.customId || '';
  if (!id.startsWith('imp_') || !interaction.guild) return;

  if (interaction.isButton()) {
    if (id === 'imp_join') return handleJoin(interaction);
    if (id === 'imp_start') return handleStart(interaction);
    if (id.startsWith('imp_role_')) return handleRole(interaction);
    if (id.startsWith('imp_skip_')) return handleSkip(interaction);
    return;
  }
  if (interaction.isStringSelectMenu() && id.startsWith('imp_vote_')) {
    return handleVote(interaction);
  }
}

async function onMessage(message) {
  if (message.author.bot || !message.guild) return;

  if (/^!impostor(\s|$)/i.test(message.content.trim())) {
    if (!message.member || !isStaff(message.member)) {
      const warn = await message.reply('❌ Solo el **staff** puede enviar el panel de El Impostor.').catch(() => null);
      setTimeout(() => warn?.delete().catch(() => {}), 5000);
      return;
    }
    const lobby = makeLobby(message.channel, null);
    const sent = await message.channel.send({ embeds: [lobbyEmbed(lobby)], components: lobbyComponents(lobby) });
    lobby.message = sent;
    lobby.key = sent.id;
    registerLobby(lobby);
    await message.delete().catch(() => {});
    return;
  }

  const game = gameByChannel.get(message.channelId);
  if (!game || game.ended) return;
  const player = game.players.find(p => p.id === message.author.id);
  if (game.chat.length < 3000) {
    game.chat.push({ t: Date.now(), name: player?.name || message.author.username, content: clip(message.content, 300) });
  }
  if (!player || game.phase !== 'clues') return;
  return onClueMessage(message, game, player);
}

async function recoverOnStart() {
  // Partidas que estaban en curso al reiniciar: se cierran (no había dinero apostado)
  for (const channelId of Object.keys(state.games)) {
    const ch = await client.channels.fetch(channelId).catch(() => null);
    if (ch) {
      await ch.send('⚠️ El bot se reinició durante la partida. Fue cancelada y este canal se cerrará.').catch(() => {});
      setTimeout(() => ch.delete('El Impostor: reinicio del bot').catch(() => {}), 10000);
    }
  }
  state.games = {};
  saveState();

  // Paneles: se restablecen como salas vacías
  const valid = [];
  for (const m of state.mains) {
    const ch = await client.channels.fetch(m.channelId).catch(() => null);
    const msg = ch ? await ch.messages.fetch(m.messageId).catch(() => null) : null;
    if (!msg) continue;
    const lobby = makeLobby(ch, msg);
    lobbies.set(lobby.key, lobby);
    valid.push(m);
    await msg.edit({ embeds: [lobbyEmbed(lobby)], components: lobbyComponents(lobby) }).catch(() => {});
  }
  state.mains = valid;
  saveState();
  console.log(`🕵️ El Impostor: ${valid.length} panel(es) activos`);
}

// ----------------------------------------------------------------------------
//  Registro en el cliente
// ----------------------------------------------------------------------------
export function registerImpostor(discordClient) {
  client = discordClient;

  client.on('messageCreate', async message => {
    try {
      await onMessage(message);
    } catch (e) {
      console.error('[Impostor] Error en mensaje:', e);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      await onInteraction(interaction);
    } catch (e) {
      console.error('[Impostor] Error en interacción:', e);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Ocurrió un error en El Impostor.', flags: 64 });
        }
      } catch {}
    }
  });

  client.on('channelDelete', channel => {
    const game = gameByChannel.get(channel.id);
    if (game && !game.ended) abortGame(game, 'El canal de la partida fue eliminado.').catch(() => {});
  });

  if (client.isReady()) recoverOnStart().catch(e => console.error('[Impostor] recover:', e));
  else client.once('ready', () => recoverOnStart().catch(e => console.error('[Impostor] recover:', e)));
}

export const __internals = { games, lobbies, gameByChannel };
