import fs from 'fs';
import path from 'path';

const DATA_DIR = './data';
const FILE_PATH = path.join(DATA_DIR, 'deltarune_event.json');

const DEFAULT_STATE = {
  active: false,
  channelId: '1441276918916710501',
  configuredBy: null,
  configuredAt: null,
  shopUnlocked: false,
  questions: [
    {
      question: '¿Cómo se llama el protagonista humano de Deltarune?',
      options: ['Kris', 'Frisk', 'Ralsei', 'Noelle'],
      correctIndex: 0
    },
    {
      question: '¿Qué objeto representa el alma del jugador?',
      options: ['Un círculo azul', 'Un corazón rojo', 'Una espada', 'Una estrella'],
      correctIndex: 1
    },
    {
      question: '¿Quién es el príncipe oscuro del Castillo?',
      options: ['Lancer', 'Susie', 'Ralsei', 'King'],
      correctIndex: 2
    },
    {
      question: '¿Qué color predomina en la chaqueta de Susie?',
      options: ['Rojo', 'Azul', 'Verde', 'Morado'],
      correctIndex: 3
    },
    {
      question: '¿Cuántas preguntas se deben acertar para ganar la rankcard del evento?',
      options: ['3', '4', '5', '2'],
      correctIndex: 2
    }
  ],
  winners: {},
  lastQuizAt: null
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function normalizeState(raw = {}) {
  const state = {
    ...DEFAULT_STATE,
    ...raw
  };

  if (!Array.isArray(state.questions) || state.questions.length !== 5) {
    state.questions = DEFAULT_STATE.questions;
  }

  state.questions = state.questions.slice(0, 5).map((q, idx) => {
    const fallback = DEFAULT_STATE.questions[idx];
    const options = Array.isArray(q?.options) ? q.options.slice(0, 4) : fallback.options;
    while (options.length < 4) options.push(`Opción ${options.length + 1}`);
    const correctIndex = Number.isInteger(q?.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3
      ? q.correctIndex
      : fallback.correctIndex;
    return {
      question: (q?.question || fallback.question || `Pregunta ${idx + 1}`).toString().slice(0, 200),
      options: options.map(o => (o || '').toString().slice(0, 80)),
      correctIndex
    };
  });

  if (!state.winners || typeof state.winners !== 'object') {
    state.winners = {};
  }

  return state;
}

export function loadDeltaruneState() {
  ensureDataDir();
  try {
    if (!fs.existsSync(FILE_PATH)) {
      const initial = normalizeState(DEFAULT_STATE);
      fs.writeFileSync(FILE_PATH, JSON.stringify(initial, null, 2));
      return initial;
    }
    const parsed = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    return normalizeState(parsed);
  } catch (error) {
    console.error('Error cargando deltarune_event.json:', error);
    return normalizeState(DEFAULT_STATE);
  }
}

export function saveDeltaruneState(partialOrState) {
  const current = loadDeltaruneState();
  const next = normalizeState({
    ...current,
    ...partialOrState
  });

  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(next, null, 2));
  } catch (error) {
    console.error('Error guardando deltarune_event.json:', error);
  }

  return next;
}

export function isDeltaruneShopUnlocked() {
  const state = loadDeltaruneState();
  return !!state.shopUnlocked;
}

export function markDeltaruneWinner(userId) {
  const state = loadDeltaruneState();
  state.winners[userId] = Date.now();
  return saveDeltaruneState(state);
}

