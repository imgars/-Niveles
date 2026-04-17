import fs from 'fs';
import path from 'path';

const DATA_DIR = './data';
const SEASON_STATE_FILE = path.join(DATA_DIR, 'season_state.json');

const COLOR_PALETTE = [
  0xFFD700, // dorado
  0xFF5E5E, // coral rojo
  0x00D1FF, // cyan
  0xA855F7, // violeta
  0x22C55E, // verde neon
  0xF97316, // naranja
  0xEC4899, // fucsia
  0x14B8A6, // turquesa
  0x3B82F6, // azul vivo
  0xEAB308  // amarillo intenso
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSeasonState() {
  ensureDataDir();
  if (!fs.existsSync(SEASON_STATE_FILE)) {
    return { levelsSeason: 7, economySeason: 0, lastColors: { levels: null, economy: null } };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(SEASON_STATE_FILE, 'utf8'));
    return {
      levelsSeason: Number.isInteger(parsed.levelsSeason) ? parsed.levelsSeason : 7,
      economySeason: Number.isInteger(parsed.economySeason) ? parsed.economySeason : 0,
      lastColors: {
        levels: Number.isInteger(parsed?.lastColors?.levels) ? parsed.lastColors.levels : null,
        economy: Number.isInteger(parsed?.lastColors?.economy) ? parsed.lastColors.economy : null
      }
    };
  } catch (error) {
    console.error('Error cargando season_state.json:', error);
    return { levelsSeason: 7, economySeason: 0, lastColors: { levels: null, economy: null } };
  }
}

function saveSeasonState(state) {
  ensureDataDir();
  fs.writeFileSync(SEASON_STATE_FILE, JSON.stringify(state, null, 2));
}

function pickNextColor(lastColor) {
  const options = COLOR_PALETTE.filter(color => color !== lastColor);
  return options[Math.floor(Math.random() * options.length)];
}

export function getNextLevelsSeason() {
  const state = loadSeasonState();
  state.levelsSeason += 1;
  saveSeasonState(state);
  return state.levelsSeason;
}

export function getNextEconomySeason() {
  const state = loadSeasonState();
  state.economySeason += 1;
  saveSeasonState(state);
  return state.economySeason;
}

export function getSeasonRoleColor(systemType) {
  const state = loadSeasonState();
  const lastColor = state.lastColors?.[systemType] ?? null;
  const nextColor = pickNextColor(lastColor);
  state.lastColors[systemType] = nextColor;
  saveSeasonState(state);
  return nextColor;
}

export async function createAndAssignTopSeasonRole({
  guild,
  seasonNumber,
  systemType,
  topUserIds
}) {
  const color = getSeasonRoleColor(systemType);
  const roleName = `Top Globales Temp ${seasonNumber} [👑]`;

  const role = await guild.roles.create({
    name: roleName,
    color,
    reason: `Premio a top globales - ${systemType} temporada ${seasonNumber}`,
    mentionable: false,
    hoist: true
  });

  const assigned = [];
  for (const userId of topUserIds.slice(0, 10)) {
    try {
      const member = await guild.members.fetch(userId);
      await member.roles.add(role, `Top global temporada ${seasonNumber}`);
      assigned.push(userId);
    } catch (error) {
      console.error(`No se pudo asignar rol estacional a ${userId}:`, error?.message || error);
    }
  }

  return { role, assigned, color };
}

