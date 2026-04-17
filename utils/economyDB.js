import fs from 'fs';
import path from 'path';
import { getEconomy, addLagcoins, removeLagcoins, transferLagcoins, isMongoConnected, saveEconomyToMongo, addItemToInventory, updateCasinoStats, updateJobStats, depositToBank, withdrawFromBank, giveItemToUser, getNationalityFromMongo, saveNationalityToMongo, updateNationalityTravelHistory } from './mongoSync.js';

const DATA_DIR = './data';
const ECONOMY_FILE = path.join(DATA_DIR, 'economy.json');
const POWERUPS_FILE = path.join(DATA_DIR, 'powerups.json');
const AUCTIONS_FILE = path.join(DATA_DIR, 'auctions.json');
const INSURANCE_FILE = path.join(DATA_DIR, 'insurance.json');
const NATIONALITIES_FILE = path.join(DATA_DIR, 'nationalities.json');
const ADMIN_BOOST_FILE = path.join(DATA_DIR, 'adminboost.json');

function normalizeLagcoinsAmount(amount) {
  const normalized = Math.floor(Number(amount));
  return Number.isFinite(normalized) ? normalized : 0;
}

function isWeekendDoubleLagcoinsActive(date = new Date()) {
  const day = date.getDay();
  return day === 5 || day === 6 || day === 0; // Viernes, sábado, domingo
}

function shouldApplyWeekendDouble(reason = '') {
  const normalized = String(reason || '').toLowerCase();
  const excludedTokens = [
    'transfer',
    'trade',
    'gift',
    'staff',
    'shop',
    'purchase',
    'buy',
    'travel',
    'deposit',
    'withdraw',
    'remove',
    'set',
    'penalty',
    'fine',
    'loss'
  ];
  return !excludedTokens.some(token => normalized.includes(token));
}

function applyWeekendDouble(amount, reason = '') {
  const normalizedAmount = normalizeLagcoinsAmount(amount);
  if (normalizedAmount <= 0) {
    return { amount: normalizedAmount, multiplier: 1, active: false };
  }
  if (!isWeekendDoubleLagcoinsActive() || !shouldApplyWeekendDouble(reason)) {
    return { amount: normalizedAmount, multiplier: 1, active: false };
  }
  return { amount: normalizedAmount * 2, multiplier: 2, active: true };
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadEconomyFile() {
  try {
    if (fs.existsSync(ECONOMY_FILE)) {
      const data = fs.readFileSync(ECONOMY_FILE, 'utf8');
      const parsed = JSON.parse(data);
      
      // Limpiar datos corruptos
      Object.keys(parsed).forEach(key => {
        const user = parsed[key];
        delete user.$setOnInsert;
        delete user.__v;
        if (user.lagcoins === null || user.lagcoins === undefined) user.lagcoins = 100;
        if (user.bankBalance === null || user.bankBalance === undefined) user.bankBalance = 0;
        if (!Array.isArray(user.transactions)) user.transactions = [];
      });
      
      return parsed;
    }
  } catch (error) {
    console.error('Error loading economy file:', error);
  }
  return {};
}

function saveEconomyFile(data) {
  try {
    fs.writeFileSync(ECONOMY_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving economy file:', error);
    return false;
  }
}

// Power-ups storage
function loadPowerupsFile() {
  try {
    if (fs.existsSync(POWERUPS_FILE)) {
      return JSON.parse(fs.readFileSync(POWERUPS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading powerups file:', error);
  }
  return {};
}

function savePowerupsFile(data) {
  try {
    fs.writeFileSync(POWERUPS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving powerups file:', error);
    return false;
  }
}

// Admin boost storage
function loadAdminBoostFile() {
  try {
    if (fs.existsSync(ADMIN_BOOST_FILE)) {
      return JSON.parse(fs.readFileSync(ADMIN_BOOST_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading admin boost file:', error);
  }
  return { active: false, percentage: 0, expiresAt: null, systems: {} };
}

function saveAdminBoostFile(data) {
  try {
    fs.writeFileSync(ADMIN_BOOST_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving admin boost file:', error);
    return false;
  }
}

// Insurance storage
function loadInsuranceFile() {
  try {
    if (fs.existsSync(INSURANCE_FILE)) {
      return JSON.parse(fs.readFileSync(INSURANCE_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading insurance file:', error);
  }
  return {};
}

function saveInsuranceFile(data) {
  try {
    fs.writeFileSync(INSURANCE_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving insurance file:', error);
    return false;
  }
}

// Auctions storage
function loadAuctionsFile() {
  try {
    if (fs.existsSync(AUCTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(AUCTIONS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading auctions file:', error);
  }
  return { auctions: [], history: [] };
}

function saveAuctionsFile(data) {
  try {
    fs.writeFileSync(AUCTIONS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving auctions file:', error);
    return false;
  }
}

// Nationalities storage
function loadNationalitiesFile() {
  try {
    if (fs.existsSync(NATIONALITIES_FILE)) {
      return JSON.parse(fs.readFileSync(NATIONALITIES_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading nationalities file:', error);
  }
  return {};
}

function saveNationalitiesFile(data) {
  try {
    fs.writeFileSync(NATIONALITIES_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving nationalities file:', error);
    return false;
  }
}

export async function getUserEconomy(guildId, userId) {
  try {
    const mongoConnected = isMongoConnected();
    
    if (mongoConnected) {
      const result = await getEconomy(guildId, userId);
      if (result) {
        const plainResult = result.toObject ? result.toObject() : result;
        // Sincronizar JSON local con datos de MongoDB para consistencia
        const economyData = loadEconomyFile();
        const key = `${guildId}-${userId}`;
        economyData[key] = plainResult;
        saveEconomyFile(economyData);
        return plainResult;
      }
      return createNewEconomy(guildId, userId);
    }
    
    // Fallback a JSON local
    const economyData = loadEconomyFile();
    const key = `${guildId}-${userId}`;
    
    if (!economyData[key]) {
      economyData[key] = createNewEconomy(guildId, userId);
      saveEconomyFile(economyData);
    }
    
    return economyData[key];
  } catch (error) {
    console.error('Error in getUserEconomy:', error);
    // Fallback a JSON local en caso de error
    const economyData = loadEconomyFile();
    const key = `${guildId}-${userId}`;
    
    if (!economyData[key]) {
      economyData[key] = createNewEconomy(guildId, userId);
      saveEconomyFile(economyData);
    }
    
    return economyData[key];
  }
}

function createNewEconomy(guildId, userId) {
  return {
    guildId,
    userId,
    lagcoins: 0,
    bankBalance: 0,
    lastWorkTime: null,
    lastRobTime: null,
    lastDailyReward: null,
    dailyStreak: 0,
    transactions: [],
    items: [],
    inventory: [],
    casinoStats: { plays: 0, wins: 0, totalWon: 0, totalLost: 0 },
    jobStats: { totalJobs: 0, favoriteJob: null },
    totalEarned: 0,
    totalSpent: 0,
    minigamesWon: 0,
    tradesCompleted: 0,
    auctionsWon: 0,
    marriedTo: null,
    jail: null,
    createdAt: new Date().toISOString()
  };
}

function getActiveJailData(economy) {
  if (!economy?.jail?.until) return null;
  const untilMs = new Date(economy.jail.until).getTime();
  if (!Number.isFinite(untilMs)) return null;
  const remainingMs = untilMs - Date.now();
  if (remainingMs <= 0) return null;

  const bailTotal = Math.max(0, Number(economy.jail.bailTotal) || 0);
  const bailPaid = Math.max(0, Number(economy.jail.bailPaid) || 0);
  return {
    ...economy.jail,
    bailTotal,
    bailPaid,
    bailRemaining: Math.max(0, bailTotal - bailPaid),
    remainingMs
  };
}

export async function getUserJailStatus(guildId, userId) {
  const economy = await getUserEconomy(guildId, userId);
  const jailData = getActiveJailData(economy);
  if (!jailData) {
    if (economy?.jail) {
      economy.jail = null;
      await saveUserEconomy(guildId, userId, economy);
    }
    return { jailed: false, remainingMs: 0 };
  }

  return { jailed: true, ...jailData };
}

export async function sendUserToJail(guildId, userId, options = {}) {
  const economy = await getUserEconomy(guildId, userId);
  const durationMs = Math.max(30000, Number(options.durationMs) || 120000);
  const bailTotal = Math.max(0, Number(options.bailTotal) || 0);
  const reason = options.reason || 'Robo';
  const severity = options.severity || 'leve';
  const now = Date.now();
  const existing = getActiveJailData(economy);

  let until = now + durationMs;
  let bailPaid = 0;
  if (existing) {
    const existingUntil = new Date(existing.until).getTime();
    until = Math.max(existingUntil, until);
    bailPaid = Math.max(0, existing.bailPaid || 0);
  }

  economy.jail = {
    since: existing?.since || new Date(now).toISOString(),
    until: new Date(until).toISOString(),
    reason,
    severity,
    bailTotal: Math.max(existing?.bailTotal || 0, bailTotal),
    bailPaid,
    updatedAt: new Date().toISOString()
  };

  await saveUserEconomy(guildId, userId, economy);
  return getUserJailStatus(guildId, userId);
}

export async function payUserJailBail(guildId, userId, amount, instant = false) {
  const economy = await getUserEconomy(guildId, userId);
  const jailData = getActiveJailData(economy);
  if (!jailData) return { error: 'not_jailed' };

  const bailRemaining = jailData.bailRemaining;
  const desired = instant ? bailRemaining : Math.max(1, Number(amount) || 0);
  const toPay = Math.min(desired, bailRemaining);
  if ((economy.lagcoins || 0) < toPay) {
    return { error: 'insufficient_funds', needed: toPay, have: economy.lagcoins || 0, bailRemaining };
  }

  economy.lagcoins = Math.max(0, (economy.lagcoins || 0) - toPay);
  economy.totalSpent = (economy.totalSpent || 0) + toPay;

  const currentPaid = Math.max(0, Number(economy.jail?.bailPaid) || 0);
  const totalBail = Math.max(0, Number(economy.jail?.bailTotal) || 0);
  const newPaid = Math.min(totalBail, currentPaid + toPay);
  const remainingAfter = Math.max(0, totalBail - newPaid);

  economy.jail.bailPaid = newPaid;
  economy.jail.updatedAt = new Date().toISOString();
  if (remainingAfter <= 0) economy.jail = null;

  if (!economy.transactions) economy.transactions = [];
  economy.transactions.push({
    type: 'jail_bail',
    amount: -toPay,
    description: 'Pago de fianza',
    date: new Date().toISOString()
  });

  await saveUserEconomy(guildId, userId, economy);
  return {
    success: true,
    released: remainingAfter <= 0,
    paid: toPay,
    remainingBail: remainingAfter,
    newBalance: economy.lagcoins || 0
  };
}

export async function addUserLagcoins(guildId, userId, amount, reason = 'work') {
  const normalizedAmount = normalizeLagcoinsAmount(amount);
  if (normalizedAmount === 0) return await getUserEconomy(guildId, userId);
  const weekendResult = applyWeekendDouble(normalizedAmount, reason);
  const finalAmount = weekendResult.amount;
  try {
    const mongoConnected = isMongoConnected();
    
    if (mongoConnected) {
      const result = await addLagcoins(guildId, userId, finalAmount, reason);
      if (result) {
        const plainResult = result.toObject ? result.toObject() : result;
        const economyData = loadEconomyFile();
        const key = `${guildId}-${userId}`;
        economyData[key] = plainResult;
        saveEconomyFile(economyData);
        return plainResult;
      }
    }
    
    const economyData = loadEconomyFile();
    const key = `${guildId}-${userId}`;
    
    if (!economyData[key]) {
      economyData[key] = createNewEconomy(guildId, userId);
    }
    
    economyData[key].lagcoins = Math.max(0, (economyData[key].lagcoins || 0) + finalAmount);
    if (!economyData[key].transactions) economyData[key].transactions = [];
    economyData[key].transactions.push({
      type: reason,
      amount: finalAmount,
      date: new Date().toISOString()
    });
    
    saveEconomyFile(economyData);
    return economyData[key];
  } catch (error) {
    console.error('Error in addUserLagcoins:', error);
    // Fallback
    const economyData = loadEconomyFile();
    const key = `${guildId}-${userId}`;
    if (!economyData[key]) {
      economyData[key] = createNewEconomy(guildId, userId);
    }
    economyData[key].lagcoins = Math.max(0, (economyData[key].lagcoins || 0) + finalAmount);
    saveEconomyFile(economyData);
    return economyData[key];
  }
}

export async function removeUserLagcoins(guildId, userId, amount, reason = 'spend') {
  try {
    const normalizedAmount = normalizeLagcoinsAmount(amount);
    if (normalizedAmount <= 0) return null;
    const mongoConnected = isMongoConnected();
    
    if (mongoConnected) {
      const result = await removeLagcoins(guildId, userId, normalizedAmount, reason);
      if (result) {
        const plainResult = result.toObject ? result.toObject() : result;
        const economyData = loadEconomyFile();
        const key = `${guildId}-${userId}`;
        economyData[key] = plainResult;
        saveEconomyFile(economyData);
        return plainResult;
      }
    }
    
    const economyData = loadEconomyFile();
    const key = `${guildId}-${userId}`;
    
    if (!economyData[key]) return null;
    if (economyData[key].lagcoins < normalizedAmount) return null;
    
    economyData[key].lagcoins -= normalizedAmount;
    if (!economyData[key].transactions) economyData[key].transactions = [];
    economyData[key].transactions.push({
      type: reason,
      amount: -normalizedAmount,
      date: new Date().toISOString()
    });
    
    saveEconomyFile(economyData);
    return economyData[key];
  } catch (error) {
    console.error('Error in removeUserLagcoins:', error);
    return null;
  }
}

export async function transferUserLagcoins(guildId, fromUserId, toUserId, amount) {
  try {
    const normalizedAmount = normalizeLagcoinsAmount(amount);
    if (normalizedAmount <= 0) return null;
    const mongoConnected = isMongoConnected();
    
    if (mongoConnected) {
      const result = await transferLagcoins(guildId, fromUserId, toUserId, normalizedAmount);
      if (result) {
        const economyData = loadEconomyFile();
        const fromKey = `${guildId}-${fromUserId}`;
        const toKey = `${guildId}-${toUserId}`;
        economyData[fromKey] = result.from?.toObject ? result.from.toObject() : result.from;
        economyData[toKey] = result.to?.toObject ? result.to.toObject() : result.to;
        saveEconomyFile(economyData);
        return result;
      }
    }
    
    const economyData = loadEconomyFile();
    const fromKey = `${guildId}-${fromUserId}`;
    const toKey = `${guildId}-${toUserId}`;
    
    if (!economyData[fromKey]) return null;
    if (economyData[fromKey].lagcoins < normalizedAmount) return null;
    
    if (!economyData[toKey]) {
      economyData[toKey] = createNewEconomy(guildId, toUserId);
    }
    
    economyData[fromKey].lagcoins -= normalizedAmount;
    economyData[fromKey].transactions = economyData[fromKey].transactions || [];
    economyData[fromKey].transactions.push({
      type: 'transfer',
      amount: -normalizedAmount,
      to: toUserId,
      date: new Date().toISOString()
    });
    
    economyData[toKey].lagcoins += normalizedAmount;
    economyData[toKey].transactions = economyData[toKey].transactions || [];
    economyData[toKey].transactions.push({
      type: 'transfer',
      amount: normalizedAmount,
      from: fromUserId,
      date: new Date().toISOString()
    });
    
    saveEconomyFile(economyData);
    return { from: economyData[fromKey], to: economyData[toKey] };
  } catch (error) {
    console.error('Error in transferUserLagcoins:', error);
    return null;
  }
}

export async function saveUserEconomy(guildId, userId, data) {
  try {
    // Siempre guardar en JSON local
    const economyData = loadEconomyFile();
    const key = `${guildId}-${userId}`;
    
    const existingData = economyData[key] || {};
    economyData[key] = {
      ...existingData,
      ...data,
      guildId,
      userId,
      lagcoins: data.lagcoins !== undefined ? data.lagcoins : (existingData.lagcoins || 100),
      bankBalance: data.bankBalance !== undefined ? data.bankBalance : (existingData.bankBalance || 0),
      bankUpgrades: data.bankUpgrades || existingData.bankUpgrades || [],
      marriedTo: data.marriedTo !== undefined ? data.marriedTo : (existingData.marriedTo || null),
      items: data.items || existingData.items || [],
      inventory: data.inventory || existingData.inventory || [],
      transactions: data.transactions || existingData.transactions || [],
      casinoStats: data.casinoStats || existingData.casinoStats || { plays: 0, wins: 0, totalWon: 0, totalLost: 0 },
      jobStats: data.jobStats || existingData.jobStats || { totalJobs: 0, favoriteJob: null },
      totalEarned: data.totalEarned !== undefined ? data.totalEarned : (existingData.totalEarned || 0),
      totalSpent: data.totalSpent !== undefined ? data.totalSpent : (existingData.totalSpent || 0),
      minigamesWon: data.minigamesWon !== undefined ? data.minigamesWon : (existingData.minigamesWon || 0),
      tradesCompleted: data.tradesCompleted !== undefined ? data.tradesCompleted : (existingData.tradesCompleted || 0),
      auctionsWon: data.auctionsWon !== undefined ? data.auctionsWon : (existingData.auctionsWon || 0),
      jail: data.jail !== undefined ? data.jail : (existingData.jail || null)
    };
    
    saveEconomyFile(economyData);
    
    // Sincronizar con MongoDB si está conectado
    const mongoConnected = isMongoConnected();
    if (mongoConnected) {
      try {
        await saveEconomyToMongo(guildId, userId, economyData[key]);
      } catch (e) {
        console.error('Error sincronizando economía con MongoDB:', e.message);
      }
    }
    
    return economyData[key];
  } catch (error) {
    console.error('Error in saveUserEconomy:', error);
    return data;
  }
}

// Sistema de trabajos mejorado con más trabajos
export const JOBS = {
  basico: { name: 'Trabajo Básico', emoji: '💼', minEarnings: 30, maxEarnings: 80, itemsNeeded: [], cooldown: 60000, countryMultiplier: 1.0 },
  // NOTA: Los cooldowns de trabajos se aplican consistentemente en doWork()
  pescar: { name: 'Pescador', emoji: '🎣', minEarnings: 70, maxEarnings: 180, itemsNeeded: ['cana_pesca'], cooldown: 45000, countryMultiplier: 1.0 },
  talar: { name: 'Leñador', emoji: '🪓', minEarnings: 80, maxEarnings: 220, itemsNeeded: ['hacha'], cooldown: 45000, countryMultiplier: 1.0 },
  minar: { name: 'Minero', emoji: '⛏️', minEarnings: 100, maxEarnings: 300, itemsNeeded: ['pico'], cooldown: 45000, countryMultiplier: 1.2 },
  construir: { name: 'Albañil', emoji: '🏗️', minEarnings: 120, maxEarnings: 350, itemsNeeded: ['pala'], cooldown: 45000, countryMultiplier: 1.0 },
  programar: { name: 'Programador', emoji: '💻', minEarnings: 150, maxEarnings: 400, itemsNeeded: ['laptop'], cooldown: 40000, countryMultiplier: 1.5 },
  cocinar: { name: 'Chef', emoji: '👨‍🍳', minEarnings: 100, maxEarnings: 280, itemsNeeded: ['utensilios'], cooldown: 50000, countryMultiplier: 1.0 },
  entregar: { name: 'Repartidor', emoji: '🛵', minEarnings: 50, maxEarnings: 140, itemsNeeded: ['moto'], cooldown: 30000, countryMultiplier: 0.8 },
  streaming: { name: 'Streamer', emoji: '🎥', minEarnings: 70, maxEarnings: 450, itemsNeeded: ['camara', 'laptop'], cooldown: 120000, countryMultiplier: 1.3 },
  musica: { name: 'Músico', emoji: '🎸', minEarnings: 80, maxEarnings: 300, itemsNeeded: ['guitarra'], cooldown: 60000, countryMultiplier: 1.0 },
  arte: { name: 'Artista', emoji: '🎨', minEarnings: 70, maxEarnings: 350, itemsNeeded: ['lienzo'], cooldown: 90000, countryMultiplier: 1.1 },
  cazar: { name: 'Cazador', emoji: '🏹', minEarnings: 120, maxEarnings: 400, itemsNeeded: ['arco'], cooldown: 60000, countryMultiplier: 1.0 },
  granja: { name: 'Granjero', emoji: '🌾', minEarnings: 90, maxEarnings: 280, itemsNeeded: ['semillas'], cooldown: 45000, countryMultiplier: 1.0 },
  // Nuevos trabajos
  medico: { name: 'Médico', emoji: '👨‍⚕️', minEarnings: 200, maxEarnings: 550, itemsNeeded: ['estetoscopio', 'laptop'], cooldown: 90000, countryMultiplier: 1.8 },
  abogado: { name: 'Abogado', emoji: '⚖️', minEarnings: 180, maxEarnings: 480, itemsNeeded: ['maletin', 'laptop'], cooldown: 80000, countryMultiplier: 1.6 },
  piloto: { name: 'Piloto', emoji: '✈️', minEarnings: 280, maxEarnings: 700, itemsNeeded: ['licencia_piloto'], cooldown: 180000, countryMultiplier: 2.0 },
  taxista: { name: 'Taxista', emoji: '🚕', minEarnings: 50, maxEarnings: 130, itemsNeeded: ['taxi'], cooldown: 30000, countryMultiplier: 0.7 },
  mecanico: { name: 'Mecánico', emoji: '🔧', minEarnings: 100, maxEarnings: 280, itemsNeeded: ['herramientas'], cooldown: 50000, countryMultiplier: 1.0 },
  barista: { name: 'Barista', emoji: '☕', minEarnings: 40, maxEarnings: 100, itemsNeeded: [], cooldown: 25000, countryMultiplier: 0.9 },
  dj: { name: 'DJ', emoji: '🎧', minEarnings: 150, maxEarnings: 400, itemsNeeded: ['tornamesa', 'laptop'], cooldown: 100000, countryMultiplier: 1.2 },
  futbolista: { name: 'Futbolista', emoji: '⚽', minEarnings: 350, maxEarnings: 1000, itemsNeeded: ['contrato_deportivo'], cooldown: 300000, countryMultiplier: 2.5 },
  youtuber: { name: 'YouTuber', emoji: '📺', minEarnings: 100, maxEarnings: 600, itemsNeeded: ['camara', 'laptop', 'microfono'], cooldown: 150000, countryMultiplier: 1.4 },
  influencer: { name: 'Influencer', emoji: '📱', minEarnings: 70, maxEarnings: 450, itemsNeeded: ['smartphone_pro'], cooldown: 120000, countryMultiplier: 1.3 }
};

// Sistema de items extendido con power-ups
export const ITEMS = {
  // Herramientas básicas
  cana_pesca: { name: 'Caña de Pesca', emoji: '🎣', price: 500, unlocks: 'pescar', description: 'Para pescar y ganar más', category: 'herramienta' },
  hacha: { name: 'Hacha', emoji: '🪓', price: 600, unlocks: 'talar', description: 'Para talar árboles', category: 'herramienta' },
  pico: { name: 'Pico', emoji: '⛏️', price: 800, unlocks: 'minar', description: 'Para minar minerales', category: 'herramienta' },
  pala: { name: 'Pala', emoji: '🏗️', price: 700, unlocks: 'construir', description: 'Para construcción', category: 'herramienta' },
  herramientas: { name: 'Kit de Herramientas', emoji: '🔧', price: 900, unlocks: 'mecanico', description: 'Para reparar vehículos', category: 'herramienta' },
  
  // Tecnología
  laptop: { name: 'Laptop Gaming', emoji: '💻', price: 2000, unlocks: 'programar', description: 'Para programar y streamear', category: 'tecnologia' },
  camara: { name: 'Cámara HD', emoji: '📹', price: 1500, unlocks: 'streaming', description: 'Para hacer streams', category: 'tecnologia' },
  smartphone_pro: { name: 'Smartphone Pro', emoji: '📱', price: 1800, unlocks: 'influencer', description: 'Para ser influencer', category: 'tecnologia' },
  microfono: { name: 'Micrófono Pro', emoji: '🎤', price: 1200, unlocks: null, description: 'Calidad de audio profesional', category: 'tecnologia' },
  tornamesa: { name: 'Tornamesa DJ', emoji: '🎧', price: 2500, unlocks: 'dj', description: 'Para ser DJ profesional', category: 'tecnologia' },
  
  // Vehículos
  moto: { name: 'Moto de Reparto', emoji: '🛵', price: 1200, unlocks: 'entregar', description: 'Para hacer entregas rápidas', category: 'vehiculo' },
  bicicleta: { name: 'Bicicleta', emoji: '🚲', price: 300, unlocks: null, description: 'Transporte básico', category: 'vehiculo' },
  taxi: { name: 'Taxi', emoji: '🚕', price: 5000, unlocks: 'taxista', description: 'Tu propio taxi', category: 'vehiculo' },
  
  // Profesionales
  estetoscopio: { name: 'Estetoscopio', emoji: '🩺', price: 3000, unlocks: null, description: 'Equipo médico', category: 'profesional' },
  maletin: { name: 'Maletín Ejecutivo', emoji: '💼', price: 2000, unlocks: null, description: 'Para lucir profesional', category: 'profesional' },
  licencia_piloto: { name: 'Licencia de Piloto', emoji: '🪪', price: 15000, unlocks: 'piloto', description: 'Licencia para volar', category: 'profesional' },
  contrato_deportivo: { name: 'Contrato Deportivo', emoji: '📋', price: 25000, unlocks: 'futbolista', description: 'Contrato de futbolista', category: 'profesional' },
  
  // Instrumentos y arte
  guitarra: { name: 'Guitarra Eléctrica', emoji: '🎸', price: 1800, unlocks: 'musica', description: 'Para tocar música', category: 'instrumento' },
  lienzo: { name: 'Kit de Arte', emoji: '🎨', price: 1000, unlocks: 'arte', description: 'Para crear obras de arte', category: 'arte' },
  
  // Cocina
  utensilios: { name: 'Utensilios de Chef', emoji: '🍳', price: 900, unlocks: 'cocinar', description: 'Para cocinar platillos', category: 'cocina' },
  
  // Caza y naturaleza
  arco: { name: 'Arco de Caza', emoji: '🏹', price: 1400, unlocks: 'cazar', description: 'Para cazar animales', category: 'arma' },
  semillas: { name: 'Pack de Semillas', emoji: '🌱', price: 400, unlocks: 'granja', description: 'Para cultivar', category: 'granja' },
  
  // Consumibles y buffs básicos
  energia: { name: 'Bebida Energética', emoji: '⚡', price: 3000, unlocks: null, description: 'Reduce cooldown de trabajo 50% por 1h', category: 'consumible', effect: { type: 'cooldown_reduction', value: 0.5, duration: 3600000 } },
  suerte: { name: 'Trébol de la Suerte', emoji: '🍀', price: 6000, unlocks: null, description: '+20% probabilidad en casino por 30min', category: 'consumible', effect: { type: 'luck_boost', value: 0.2, duration: 1800000 } },
  escudo: { name: 'Escudo Anti-Robo', emoji: '🛡️', price: 15000, unlocks: null, description: 'Protege tus Lagcoins de robos por 2h', category: 'consumible', effect: { type: 'rob_protection', value: 1.0, duration: 7200000 } },
  
  // Coleccionables
  corona: { name: 'Corona Dorada', emoji: '👑', price: 10000, unlocks: null, description: 'Símbolo de riqueza', category: 'coleccionable' },
  diamante: { name: 'Diamante Brillante', emoji: '💎', price: 5000, unlocks: null, description: 'Joya preciosa', category: 'coleccionable' },
  trofeo: { name: 'Trofeo de Oro', emoji: '🏆', price: 3000, unlocks: null, description: 'Premio al mejor', category: 'coleccionable' },
  
  // Viajes - Pasaporte (requerido para viajar)
  pasaporte: { name: 'Pasaporte', emoji: '🛂', price: 2000, unlocks: null, description: 'Necesario para viajar a otros países', category: 'viaje' },
  visa_trabajo: { name: 'Visa de Trabajo', emoji: '📝', price: 5000, unlocks: null, description: 'Permite trabajar en el extranjero', category: 'viaje' },
  
  // POWER-UPS (Nuevos)
  powerup_trabajo_1: { name: 'Boost Trabajo Básico', emoji: '💪', price: 10000, unlocks: null, description: '+25% ganancias en trabajos por 1h', category: 'powerup', effect: { type: 'work_boost', value: 0.25, duration: 3600000 } },
  powerup_trabajo_2: { name: 'Boost Trabajo Pro', emoji: '💪💪', price: 25000, unlocks: null, description: '+50% ganancias en trabajos por 1h', category: 'powerup', effect: { type: 'work_boost', value: 0.5, duration: 3600000 } },
  powerup_trabajo_3: { name: 'Boost Trabajo Ultra', emoji: '🔥', price: 56000, unlocks: null, description: '+100% ganancias en trabajos por 30min', category: 'powerup', effect: { type: 'work_boost', value: 1.0, duration: 1800000 } },
  
  powerup_casino_1: { name: 'Suerte Básica', emoji: '🎰', price: 15000, unlocks: null, description: '+15% suerte en casino por 1h', category: 'powerup', effect: { type: 'casino_luck', value: 0.15, duration: 3600000 } },
  powerup_casino_2: { name: 'Suerte Avanzada', emoji: '🎰🎰', price: 35000, unlocks: null, description: '+30% suerte en casino por 1h', category: 'powerup', effect: { type: 'casino_luck', value: 0.3, duration: 3600000 } },
  powerup_casino_3: { name: 'Suerte Máxima', emoji: '🎰🔥', price: 75000, unlocks: null, description: '+50% suerte en casino por 30min', category: 'powerup', effect: { type: 'casino_luck', value: 0.5, duration: 1800000 } },
  
  powerup_robo_1: { name: 'Sigilo Básico', emoji: '🥷', price: 20000, unlocks: null, description: '+20% éxito en robos por 1h', category: 'powerup', effect: { type: 'rob_success', value: 0.2, duration: 3600000 } },
  powerup_robo_2: { name: 'Sigilo Avanzado', emoji: '🥷🥷', price: 60000, unlocks: null, description: '+40% éxito en robos por 1h', category: 'powerup', effect: { type: 'rob_success', value: 0.4, duration: 3600000 } },
  powerup_robo_3: { name: 'Maestro del Robo', emoji: '🥷🔥', price: 100000, unlocks: null, description: '+60% éxito en robos por 30min', category: 'powerup', effect: { type: 'rob_success', value: 0.6, duration: 1800000 } },
  
  powerup_xp_1: { name: 'Boost XP Básico', emoji: '⭐', price: 30000, unlocks: null, description: '+25% XP de niveles por 2h', category: 'powerup', effect: { type: 'xp_boost', value: 0.25, duration: 7200000 } },
  powerup_xp_2: { name: 'Boost XP Pro', emoji: '⭐⭐', price: 100000, unlocks: null, description: '+50% XP de niveles por 2h', category: 'powerup', effect: { type: 'xp_boost', value: 0.5, duration: 7200000 } },
  powerup_xp_3: { name: 'Boost XP Ultra', emoji: '🌟', price: 65000, unlocks: null, description: '+100% XP de niveles por 1h', category: 'powerup', effect: { type: 'xp_boost', value: 1.0, duration: 3600000 } },
  
  // Seguros Anti-Robo (Nuevos)
  seguro_basico: { name: 'Seguro Anti-Robo Básico', emoji: '🔒', price: 800, unlocks: null, description: '50% protección por 2h', category: 'seguro', effect: { type: 'anti_rob', value: 0.5, duration: 7200000 } },
  seguro_avanzado: { name: 'Seguro Anti-Robo Avanzado', emoji: '🔒🔒', price: 2000, unlocks: null, description: '75% protección por 2h', category: 'seguro', effect: { type: 'anti_rob', value: 0.75, duration: 7200000 } },
  seguro_premium: { name: 'Seguro Anti-Robo Premium', emoji: '🔐', price: 5000, unlocks: null, description: '90% protección por 1h', category: 'seguro', effect: { type: 'anti_rob', value: 0.9, duration: 3600000 } },
  seguro_total: { name: 'Seguro Total', emoji: '🛡️✨', price: 15000, unlocks: null, description: '100% protección por 15min', category: 'seguro', effect: { type: 'anti_rob', value: 1.0, duration: 900000 } }
};

// Categorías de items
export const ITEM_CATEGORIES = {
  herramienta: { name: 'Herramientas', emoji: '🔧' },
  tecnologia: { name: 'Tecnología', emoji: '💻' },
  vehiculo: { name: 'Vehículos', emoji: '🚗' },
  profesional: { name: 'Profesional', emoji: '👔' },
  instrumento: { name: 'Instrumentos', emoji: '🎵' },
  arte: { name: 'Arte', emoji: '🎨' },
  cocina: { name: 'Cocina', emoji: '🍳' },
  arma: { name: 'Armas', emoji: '⚔️' },
  granja: { name: 'Granja', emoji: '🌾' },
  consumible: { name: 'Consumibles', emoji: '🧪' },
  coleccionable: { name: 'Coleccionables', emoji: '✨' },
  viaje: { name: 'Viajes', emoji: '✈️' },
  powerup: { name: 'Power-Ups', emoji: '⚡' },
  seguro: { name: 'Seguros', emoji: '🔒' }
};

// Sistema de Nacionalidades
export const COUNTRIES = {
  venezuela: { name: 'Venezuela', emoji: '🇻🇪', probability: 0.65, jobMultiplier: 0.6, minWage: 30, maxWageBonus: 80 },
  mexico: { name: 'México', emoji: '🇲🇽', probability: 0.40, jobMultiplier: 0.8, minWage: 50, maxWageBonus: 120 },
  argentina: { name: 'Argentina', emoji: '🇦🇷', probability: 0.40, jobMultiplier: 0.7, minWage: 45, maxWageBonus: 100 },
  colombia: { name: 'Colombia', emoji: '🇨🇴', probability: 0.43, jobMultiplier: 0.75, minWage: 40, maxWageBonus: 95 },
  brasil: { name: 'Brasil', emoji: '🇧🇷', probability: 0.24, jobMultiplier: 0.9, minWage: 60, maxWageBonus: 150 },
  ecuador: { name: 'Ecuador', emoji: '🇪🇨', probability: 0.30, jobMultiplier: 0.7, minWage: 40, maxWageBonus: 90 },
  peru: { name: 'Perú', emoji: '🇵🇪', probability: 0.32, jobMultiplier: 0.72, minWage: 42, maxWageBonus: 95 },
  chile: { name: 'Chile', emoji: '🇨🇱', probability: 0.28, jobMultiplier: 0.95, minWage: 70, maxWageBonus: 180 },
  uruguay: { name: 'Uruguay', emoji: '🇺🇾', probability: 0.31, jobMultiplier: 0.85, minWage: 55, maxWageBonus: 130 },
  el_salvador: { name: 'El Salvador', emoji: '🇸🇻', probability: 0.30, jobMultiplier: 0.65, minWage: 35, maxWageBonus: 85 },
  panama: { name: 'Panamá', emoji: '🇵🇦', probability: 0.25, jobMultiplier: 0.9, minWage: 60, maxWageBonus: 140 },
  costa_rica: { name: 'Costa Rica', emoji: '🇨🇷', probability: 0.27, jobMultiplier: 0.82, minWage: 52, maxWageBonus: 125 },
  republica_dominicana: { name: 'República Dominicana', emoji: '🇩🇴', probability: 0.28, jobMultiplier: 0.7, minWage: 40, maxWageBonus: 95 },
  guatemala: { name: 'Guatemala', emoji: '🇬🇹', probability: 0.29, jobMultiplier: 0.65, minWage: 35, maxWageBonus: 80 },
  honduras: { name: 'Honduras', emoji: '🇭🇳', probability: 0.26, jobMultiplier: 0.6, minWage: 30, maxWageBonus: 70 },
  bolivia: { name: 'Bolivia', emoji: '🇧🇴', probability: 0.27, jobMultiplier: 0.62, minWage: 32, maxWageBonus: 75 },
  paraguay: { name: 'Paraguay', emoji: '🇵🇾', probability: 0.26, jobMultiplier: 0.68, minWage: 38, maxWageBonus: 88 },
  nicaragua: { name: 'Nicaragua', emoji: '🇳🇮', probability: 0.24, jobMultiplier: 0.58, minWage: 28, maxWageBonus: 65 },
  cuba: { name: 'Cuba', emoji: '🇨🇺', probability: 0.20, jobMultiplier: 0.5, minWage: 25, maxWageBonus: 55 },
  espana: { name: 'España', emoji: '🇪🇸', probability: 0.14, jobMultiplier: 1.3, minWage: 100, maxWageBonus: 300 },
  estados_unidos: { name: 'Estados Unidos', emoji: '🇺🇸', probability: 0.05, jobMultiplier: 2.0, minWage: 150, maxWageBonus: 500 },
  canada: { name: 'Canadá', emoji: '🇨🇦', probability: 0.07, jobMultiplier: 1.8, minWage: 130, maxWageBonus: 400 },
  reino_unido: { name: 'Reino Unido', emoji: '🇬🇧', probability: 0.06, jobMultiplier: 1.7, minWage: 120, maxWageBonus: 380 },
  japon: { name: 'Japón', emoji: '🇯🇵', probability: 0.09, jobMultiplier: 1.6, minWage: 110, maxWageBonus: 350 },
  alemania: { name: 'Alemania', emoji: '🇩🇪', probability: 0.08, jobMultiplier: 1.7, minWage: 125, maxWageBonus: 370 },
  francia: { name: 'Francia', emoji: '🇫🇷', probability: 0.10, jobMultiplier: 1.5, minWage: 105, maxWageBonus: 320 },
  italia: { name: 'Italia', emoji: '🇮🇹', probability: 0.11, jobMultiplier: 1.4, minWage: 95, maxWageBonus: 280 },
  portugal: { name: 'Portugal', emoji: '🇵🇹', probability: 0.12, jobMultiplier: 1.2, minWage: 85, maxWageBonus: 220 },
  australia: { name: 'Australia', emoji: '🇦🇺', probability: 0.06, jobMultiplier: 1.9, minWage: 140, maxWageBonus: 450 }
};

// Obtener power-ups activos del usuario
export function getUserActivePowerups(guildId, userId) {
  const powerups = loadPowerupsFile();
  const key = `${guildId}-${userId}`;
  const userPowerups = powerups[key] || [];
  const now = Date.now();
  
  // Filtrar y devolver solo los power-ups activos
  return userPowerups.filter(p => p.expiresAt > now);
}

// Activar un power-up para un usuario
export function activatePowerup(guildId, userId, powerupType, value, duration) {
  const powerups = loadPowerupsFile();
  const key = `${guildId}-${userId}`;
  
  if (!powerups[key]) powerups[key] = [];
  
  const now = Date.now();
  powerups[key].push({
    type: powerupType,
    value,
    activatedAt: now,
    expiresAt: now + duration
  });
  
  savePowerupsFile(powerups);
  return true;
}

// Obtener boost de admin activo
export function getAdminBoost() {
  const boost = loadAdminBoostFile();
  if (!boost.active || Date.now() > boost.expiresAt) {
    return null;
  }
  return boost;
}

// Activar boost de admin
export function activateAdminBoost(percentage, durationMinutes, systems = {}) {
  const now = Date.now();
  const boost = {
    active: true,
    percentage: percentage / 100,
    expiresAt: now + (durationMinutes * 60 * 1000),
    activatedAt: now,
    systems: {
      economy: systems.economy !== false,
      casino: systems.casino !== false,
      levels: systems.levels !== false,
      work: systems.work !== false,
      rob: systems.rob !== false
    }
  };
  saveAdminBoostFile(boost);
  return boost;
}

// Desactivar boost de admin
export function deactivateAdminBoost() {
  saveAdminBoostFile({ active: false, percentage: 0, expiresAt: null, systems: {} });
  return true;
}

// Obtener seguro anti-robo activo
export function getUserInsurance(guildId, userId) {
  const insurance = loadInsuranceFile();
  const key = `${guildId}-${userId}`;
  const userInsurance = insurance[key];
  
  if (!userInsurance || Date.now() > userInsurance.expiresAt) {
    return null;
  }
  
  return userInsurance;
}

// Activar seguro anti-robo
export function activateInsurance(guildId, userId, protection, duration) {
  const insurance = loadInsuranceFile();
  const key = `${guildId}-${userId}`;
  const now = Date.now();
  
  insurance[key] = {
    protection,
    activatedAt: now,
    expiresAt: now + duration,
    lastActivation: now
  };
  
  saveInsuranceFile(insurance);
  return insurance[key];
}

// Desactivar seguro anti-robo
export function deactivateInsurance(guildId, userId) {
  const insurance = loadInsuranceFile();
  const key = `${guildId}-${userId}`;
  
  if (insurance[key]) {
    insurance[key].expiresAt = Date.now();
    saveInsuranceFile(insurance);
  }
  
  return true;
}

// Obtener nacionalidad del usuario
export async function getUserNationality(guildId, userId) {
  try {
    const mongoConnected = isMongoConnected();
    
    if (mongoConnected) {
      const result = await getNationalityFromMongo(guildId, userId);
      if (result) {
        // Sincronizar con JSON local
        const nationalities = loadNationalitiesFile();
        const key = `${guildId}-${userId}`;
        nationalities[key] = {
          country: result.country,
          currentCountry: result.currentCountry,
          assignedAt: result.assignedAt,
          travelHistory: result.travelHistory || []
        };
        saveNationalitiesFile(nationalities);
        return nationalities[key];
      }
    }
    
    // Fallback a JSON local
    const nationalities = loadNationalitiesFile();
    const key = `${guildId}-${userId}`;
    return nationalities[key] || null;
  } catch (error) {
    console.error('Error in getUserNationality:', error);
    const nationalities = loadNationalitiesFile();
    const key = `${guildId}-${userId}`;
    return nationalities[key] || null;
  }
}

// Asignar nacionalidad aleatoria
export async function assignRandomNationality(guildId, userId) {
  try {
    const nationalities = loadNationalitiesFile();
    const key = `${guildId}-${userId}`;
    
    // Calcular probabilidades acumuladas
    const countries = Object.entries(COUNTRIES);
    let totalProb = countries.reduce((sum, [_, c]) => sum + c.probability, 0);
    
    // Normalizar probabilidades
    let random = Math.random() * totalProb;
    let selectedCountry = 'venezuela';
    
    for (const [countryId, country] of countries) {
      random -= country.probability;
      if (random <= 0) {
        selectedCountry = countryId;
        break;
      }
    }
    
    const nationalityData = {
      country: selectedCountry,
      currentCountry: selectedCountry,
      assignedAt: new Date().toISOString(),
      travelHistory: []
    };
    
    nationalities[key] = nationalityData;
    saveNationalitiesFile(nationalities);
    
    // Guardar en MongoDB si está conectado
    const mongoConnected = isMongoConnected();
    if (mongoConnected) {
      await saveNationalityToMongo(guildId, userId, nationalityData);
    }
    
    return nationalities[key];
  } catch (error) {
    console.error('Error in assignRandomNationality:', error);
    // Fallback a JSON local
    const nationalities = loadNationalitiesFile();
    const key = `${guildId}-${userId}`;
    
    const countries = Object.entries(COUNTRIES);
    let totalProb = countries.reduce((sum, [_, c]) => sum + c.probability, 0);
    let random = Math.random() * totalProb;
    let selectedCountry = 'venezuela';
    
    for (const [countryId, country] of countries) {
      random -= country.probability;
      if (random <= 0) {
        selectedCountry = countryId;
        break;
      }
    }
    
    nationalities[key] = {
      country: selectedCountry,
      currentCountry: selectedCountry,
      assignedAt: new Date().toISOString(),
      travelHistory: []
    };
    
    saveNationalitiesFile(nationalities);
    return nationalities[key];
  }
}

// Viajar a otro país
export async function travelToCountry(guildId, userId, destinationCountry) {
  try {
    const nationalities = loadNationalitiesFile();
    const key = `${guildId}-${userId}`;
    
    // Primero verificar en MongoDB si está conectado
    const mongoConnected = isMongoConnected();
    let userNationality = nationalities[key];
    
    if (mongoConnected && !userNationality) {
      const mongoNationality = await getNationalityFromMongo(guildId, userId);
      if (mongoNationality) {
        userNationality = {
          country: mongoNationality.country,
          currentCountry: mongoNationality.currentCountry,
          assignedAt: mongoNationality.assignedAt,
          travelHistory: mongoNationality.travelHistory || []
        };
        nationalities[key] = userNationality;
      }
    }
    
    if (!userNationality) return { error: 'no_nationality' };
    
    const country = COUNTRIES[destinationCountry];
    if (!country) return { error: 'invalid_country' };
    
    nationalities[key].currentCountry = destinationCountry;
    nationalities[key].travelHistory.push({
      country: destinationCountry,
      date: new Date().toISOString()
    });
    
    saveNationalitiesFile(nationalities);
    
    // Actualizar en MongoDB si está conectado
    if (mongoConnected) {
      await updateNationalityTravelHistory(guildId, userId, destinationCountry);
    }
    
    return nationalities[key];
  } catch (error) {
    console.error('Error in travelToCountry:', error);
    // Fallback a JSON local
    const nationalities = loadNationalitiesFile();
    const key = `${guildId}-${userId}`;
    
    if (!nationalities[key]) return { error: 'no_nationality' };
    
    const country = COUNTRIES[destinationCountry];
    if (!country) return { error: 'invalid_country' };
    
    nationalities[key].currentCountry = destinationCountry;
    nationalities[key].travelHistory.push({
      country: destinationCountry,
      date: new Date().toISOString()
    });
    
    saveNationalitiesFile(nationalities);
    return nationalities[key];
  }
}

export async function getUserProfile(guildId, userId) {
  const economy = await getUserEconomy(guildId, userId);
  const nationality = await getUserNationality(guildId, userId);
  const activePowerups = getUserActivePowerups(guildId, userId);
  const insurance = getUserInsurance(guildId, userId);
  
  return {
    userId,
    lagcoins: economy.lagcoins || 0,
    bankBalance: economy.bankBalance || 0,
    items: economy.items || [],
    inventory: economy.inventory || [],
    totalEarned: economy.totalEarned || 0,
    totalSpent: economy.totalSpent || 0,
    casinoStats: economy.casinoStats || { plays: 0, wins: 0, totalWon: 0, totalLost: 0 },
    jobStats: economy.jobStats || { totalJobs: 0, favoriteJob: null },
    minigamesWon: economy.minigamesWon || 0,
    tradesCompleted: economy.tradesCompleted || 0,
    auctionsWon: economy.auctionsWon || 0,
    nationality,
    activePowerups,
    insurance,
    createdAt: economy.createdAt
  };
}

export async function buyItem(guildId, userId, itemId) {
  try {
    const economy = await getUserEconomy(guildId, userId);
    const item = ITEMS[itemId];
    
    if (!item) return { error: 'item_not_found' };
    if ((economy.lagcoins || 0) < item.price) return { error: 'insufficient_funds', needed: item.price, have: economy.lagcoins };
    
    // Para items no consumibles/powerups/seguros, verificar si ya lo tiene
    if (!['consumible', 'powerup', 'seguro'].includes(item.category)) {
      if (economy.items && economy.items.includes(itemId)) {
        return { error: 'already_owned' };
      }
    }
    
    economy.lagcoins -= item.price;
    economy.totalSpent = (economy.totalSpent || 0) + item.price;
    if (!economy.items) economy.items = [];
    if (!economy.inventory) economy.inventory = [];
    
    // Para consumibles/powerups/seguros, activar el efecto
    if (item.effect) {
      if (item.category === 'seguro' || item.effect.type === 'rob_protection' || item.effect.type === 'anti_rob') {
        activateInsurance(guildId, userId, item.effect.value || 1.0, item.effect.duration);
      } else {
        activatePowerup(guildId, userId, item.effect.type, item.effect.value, item.effect.duration);
      }
    } else {
      economy.items.push(itemId);
    }
    
    economy.inventory.push({ itemId, quantity: 1, acquiredAt: new Date().toISOString() });
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ 
      type: 'purchase', 
      amount: -item.price, 
      description: `Compró ${item.name}`, 
      date: new Date().toISOString() 
    });
    
    await saveUserEconomy(guildId, userId, economy);
    return { success: true, economy, item };
  } catch (error) {
    console.error('Error in buyItem:', error);
    return { error: 'system_error' };
  }
}

export async function getDailyReward(guildId, userId) {
  try {
    const economy = await getUserEconomy(guildId, userId);
    const today = new Date().toDateString();
    
    if (economy.lastDailyReward === today) {
      return null;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = economy.lastDailyReward === yesterday.toDateString();
    
    const baseReward = 150;
    const bonusReward = Math.floor(Math.random() * 100);
    
    // Mantener racha si reclamó ayer
    let streak = wasYesterday ? (economy.dailyStreak || 0) + 1 : 1;
    const streakBonus = Math.min(streak * 15, 200);
    
    // Aplicar boost de admin si está activo
    const adminBoost = getAdminBoost();
    let multiplier = 1;
    if (adminBoost && adminBoost.systems.economy) {
      multiplier += adminBoost.percentage;
    }
    
    const baseTotal = Math.floor((baseReward + bonusReward + streakBonus) * multiplier);
    const weekendResult = applyWeekendDouble(baseTotal, 'daily');
    const reward = weekendResult.amount;
    
    economy.lastDailyReward = today;
    economy.dailyStreak = streak;
    economy.lagcoins = (economy.lagcoins || 0) + reward;
    economy.totalEarned = (economy.totalEarned || 0) + reward;
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ 
      type: 'daily', 
      amount: reward, 
      description: `Recompensa diaria (racha: ${streak})`, 
      date: new Date().toISOString() 
    });
    
    await saveUserEconomy(guildId, userId, economy);
    return { reward, streak, streakBonus, multiplier: weekendResult.multiplier * multiplier, weekendDouble: weekendResult.active };
  } catch (error) {
    console.error('Error in getDailyReward:', error);
    throw error;
  }
}

// Casino - Ruleta básica
export async function playCasino(guildId, userId, bet) {
  try {
    const economy = await getUserEconomy(guildId, userId);
    if (!economy || (economy.lagcoins || 0) < bet) return null;
    
    // Calcular suerte base + power-ups + admin boost
    let luckBonus = 0;
    const activePowerups = getUserActivePowerups(guildId, userId);
    for (const powerup of activePowerups) {
      if (powerup.type === 'casino_luck' || powerup.type === 'luck_boost') {
        luckBonus += powerup.value;
      }
    }
    
    const adminBoost = getAdminBoost();
    if (adminBoost && adminBoost.systems.casino) {
      luckBonus += adminBoost.percentage;
    }
    
    const roll = Math.floor(Math.random() * 100);
    const multiplier = 1.1; // Nerf: x1.4 -> x1.1
    const finalThreshold = (won && Math.random() < 0.7) ? 101 : threshold;
    const finalWon = roll > finalThreshold;
    let winnings = finalWon ? Math.floor(bet * multiplier) - bet : -bet;
    if (winnings > 0) {
      winnings = applyWeekendDouble(winnings, 'casino').amount;
    }
    
    economy.lagcoins = Math.max(0, (economy.lagcoins || 0) + winnings);
    if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0 };
    economy.casinoStats.plays++;
    if (finalWon) {
      economy.casinoStats.wins++;
      economy.casinoStats.totalWon = (economy.casinoStats.totalWon || 0) + winnings;
      economy.totalEarned = (economy.totalEarned || 0) + winnings;
    } else {
      economy.casinoStats.totalLost = (economy.casinoStats.totalLost || 0) + bet;
    }
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ 
      type: finalWon ? 'casino_win' : 'casino_loss', 
      amount: winnings, 
      description: `Casino: ${finalWon ? 'Ganaste' : 'Perdiste'} ${Math.abs(winnings)} Lagcoins`,
      date: new Date().toISOString() 
    });
    
    await saveUserEconomy(guildId, userId, economy);
    return { won: finalWon, winnings, newBalance: economy.lagcoins, multiplier, roll, luckBonus };
  } catch (error) {
    console.error('Error in playCasino:', error);
    throw error;
  }
}

// Casino - Tragamonedas
export async function playSlots(guildId, userId, bet) {
  try {
    const economy = await getUserEconomy(guildId, userId);
    if (!economy || (economy.lagcoins || 0) < bet) return null;
    
    // Calcular suerte
    let luckBonus = 0;
    const activePowerups = getUserActivePowerups(guildId, userId);
    for (const powerup of activePowerups) {
      if (powerup.type === 'casino_luck' || powerup.type === 'luck_boost') {
        luckBonus += powerup.value;
      }
    }
    
    const adminBoost = getAdminBoost();
    if (adminBoost && adminBoost.systems.casino) {
      luckBonus += adminBoost.percentage;
    }
    
    const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣', '🍀'];
    
    // Con más suerte, hay mayor probabilidad de obtener símbolos iguales
    const getSymbol = () => {
      if (luckBonus > 0 && Math.random() < luckBonus * 0.4) { // Buff: Suerte influye más
        // Mayor probabilidad de símbolos de alto valor
        return symbols[Math.floor(Math.random() * 3) + 5];
      }
      return symbols[Math.floor(Math.random() * symbols.length)];
    };
    
    const reels = [getSymbol(), getSymbol(), getSymbol()];
    
    // Bonus de suerte para emparejar
    if (luckBonus > 0.2 && Math.random() < luckBonus * 0.5) { // Buff: Requisito de suerte menor y probabilidad mayor
      reels[1] = reels[0];
      if (Math.random() < luckBonus * 0.4) {
        reels[2] = reels[0];
      }
    }
    
    let multiplier = 0;
    let jackpot = false;
    
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      if (reels[0] === '7️⃣') {
        multiplier = 2.5; // Buff: x1.5 -> x2.5
        jackpot = true;
      } else if (reels[0] === '💎') {
        multiplier = 2.0; // Buff: x1.4 -> x2.0
      } else if (reels[0] === '🍀') {
        multiplier = 1.8; // Buff: x1.3 -> x1.8
      } else {
        multiplier = 1.5; // Buff: x1.2 -> x1.5
      }
    } else if (reels[0] === reels[1] || reels[1] === reels[2]) {
      // Buff: 40% de ganar con dos símbolos
      if (Math.random() < 0.40) {
        multiplier = 1.2; // Buff: x1.1 -> x1.2
      }
    }
    
    const won = multiplier > 0;
    
    // Sistema anti-rachas: Si gana más de 3 seguidas, pierde obligatoriamente
    if (won) {
      if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0, winStreak: 0 };
      if ((economy.casinoStats.winStreak || 0) >= 3) {
        multiplier = 0;
        economy.casinoStats.winStreak = 0;
        return { won: false, reels, winnings: -bet, newBalance: economy.lagcoins, multiplier: 0, luckBonus, antiStreak: true };
      }
      economy.casinoStats.winStreak = (economy.casinoStats.winStreak || 0) + 1;
    } else {
      if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0, winStreak: 0 };
      economy.casinoStats.winStreak = 0;
    }
    
    // Nueva lógica de ganancias: Más ganancia por defecto, pero cap al 25% si apuesta >= 5000
    let winnings;
    if (won) {
      let effectiveMultiplier = jackpot ? multiplier : multiplier;
      // Aumentamos un poco la ganancia base (ej: +10%)
      effectiveMultiplier *= 1.1;
      
      if (bet >= 5000) {
        // A partir de 5000, la ganancia es solo del 25% (multiplicador 1.25 total)
        winnings = Math.floor(bet * 1.25) - bet;
      } else {
        winnings = Math.floor(bet * effectiveMultiplier) - bet;
      }
    } else {
      winnings = -bet;
    }
    
    if (winnings > 0) {
      winnings = applyWeekendDouble(winnings, 'slots').amount;
    }
    economy.lagcoins = Math.max(0, (economy.lagcoins || 0) + winnings);
    if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0 };
    economy.casinoStats.plays++;
    if (won) {
      economy.casinoStats.wins++;
      economy.casinoStats.totalWon = (economy.casinoStats.totalWon || 0) + winnings;
      economy.totalEarned = (economy.totalEarned || 0) + winnings;
    } else {
      economy.casinoStats.totalLost = (economy.casinoStats.totalLost || 0) + bet;
    }
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ 
      type: won ? 'slots_win' : 'slots_loss', 
      amount: winnings, 
      description: `Slots: ${won ? 'Ganaste' : 'Perdiste'} ${Math.abs(winnings)} Lagcoins`,
      date: new Date().toISOString() 
    });
    
    await saveUserEconomy(guildId, userId, economy);
    return { won, winnings, newBalance: economy.lagcoins, reels, multiplier, jackpot, luckBonus };
  } catch (error) {
    console.error('Error in playSlots:', error);
    throw error;
  }
}

// Casino - Coinflip
export async function playCoinflip(guildId, userId, bet, choice) {
  try {
    const economy = await getUserEconomy(guildId, userId);
    if (!economy || (economy.lagcoins || 0) < bet) return null;
    
    // Calcular suerte
    let luckBonus = 0;
    const activePowerups = getUserActivePowerups(guildId, userId);
    for (const powerup of activePowerups) {
      if (powerup.type === 'casino_luck' || powerup.type === 'luck_boost') {
        luckBonus += powerup.value;
      }
    }
    
    const adminBoost = getAdminBoost();
    if (adminBoost && adminBoost.systems.casino) {
      luckBonus += adminBoost.percentage;
    }
    
    // Con suerte, más probabilidad de ganar
    const winChance = 0.45 + (luckBonus * 0.15); // Buff: 0.25 -> 0.45 base
    const result = Math.random() > winChance ? (choice.toLowerCase() === 'cara' ? 'cruz' : 'cara') : choice.toLowerCase();
    let won = choice.toLowerCase() === result;
    
    // Sistema anti-rachas: Si gana más de 3 seguidas, pierde obligatoriamente
    if (won) {
      if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0, winStreak: 0 };
      if ((economy.casinoStats.winStreak || 0) >= 3) {
        won = false;
        economy.casinoStats.winStreak = 0;
        const fakeResult = choice.toLowerCase() === 'cara' ? 'cruz' : 'cara';
        return { won: false, result: fakeResult, choice, winnings: -bet, newBalance: economy.lagcoins, luckBonus, antiStreak: true };
      }
      economy.casinoStats.winStreak = (economy.casinoStats.winStreak || 0) + 1;
    } else {
      if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0, winStreak: 0 };
      economy.casinoStats.winStreak = 0;
    }
    
    // Nueva lógica de ganancias: Más ganancia por defecto, pero cap al 25% si apuesta >= 5000
    let winnings;
    if (won) {
      if (bet >= 5000) {
        winnings = Math.floor(bet * 1.25) - bet;
      } else {
        // Aumentamos ganancia base de x1.2 a x1.5
        winnings = Math.floor(bet * 1.5) - bet;
      }
    } else {
      winnings = -bet;
    }
    
    if (winnings > 0) {
      winnings = applyWeekendDouble(winnings, 'coinflip').amount;
    }
    economy.lagcoins = Math.max(0, (economy.lagcoins || 0) + winnings);
    if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0 };
    economy.casinoStats.plays++;
    if (won) {
      economy.casinoStats.wins++;
      economy.casinoStats.totalWon = (economy.casinoStats.totalWon || 0) + winnings;
      economy.totalEarned = (economy.totalEarned || 0) + winnings;
    } else {
      economy.casinoStats.totalLost = (economy.casinoStats.totalLost || 0) + bet;
    }
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ 
      type: won ? 'coinflip_win' : 'coinflip_loss', 
      amount: winnings, 
      description: `Coinflip: ${won ? 'Ganaste' : 'Perdiste'} ${Math.abs(winnings)} Lagcoins`,
      date: new Date().toISOString() 
    });
    
    await saveUserEconomy(guildId, userId, economy);
    return { won, result, choice, winnings, newBalance: economy.lagcoins, luckBonus };
  } catch (error) {
    console.error('Error in playCoinflip:', error);
    throw error;
  }
}

// Casino - Dados
export async function playDice(guildId, userId, bet, guess) {
  try {
    const economy = await getUserEconomy(guildId, userId);
    if (!economy || (economy.lagcoins || 0) < bet) return null;
    
    // Calcular suerte
    let luckBonus = 0;
    const activePowerups = getUserActivePowerups(guildId, userId);
    for (const powerup of activePowerups) {
      if (powerup.type === 'casino_luck' || powerup.type === 'luck_boost') {
        luckBonus += powerup.value;
      }
    }
    
    const adminBoost = getAdminBoost();
    if (adminBoost && adminBoost.systems.casino) {
      luckBonus += adminBoost.percentage;
    }
    
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    
    // Buff: Suerte influye más en dados
    if (luckBonus > 0.2 && Math.random() < luckBonus * 0.3) {
      // Empuje según predicción
      if (guess === 'alto' && dice1 + dice2 < 8) dice1 = 5;
      if (guess === 'bajo' && dice1 + dice2 > 6) dice1 = 1;
    }
    
    const total = dice1 + dice2;
    let multiplier = 0;
    
    switch (guess) {
      case 'alto':
        if (total >= 8) multiplier = 1.8; // Buff: x1.15 -> x1.8
        break;
      case 'bajo':
        if (total <= 6) multiplier = 1.8; // Buff: x1.15 -> x1.8
        break;
      case 'exacto':
        if (total === 7) multiplier = 3.0; // Buff: x1.3 -> x3.0
        break;
      case 'dobles':
        if (dice1 === dice2) multiplier = 4.0; // Buff: x1.5 -> x4.0
        break;
    }
    
    // Buff: Probabilidad de perder eliminada (era 75% antes)
    let won = multiplier > 0;

    // Sistema anti-rachas: Si gana más de 3 seguidas, pierde obligatoriamente
    if (won) {
      if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0, winStreak: 0 };
      if ((economy.casinoStats.winStreak || 0) >= 3) {
        won = false;
        multiplier = 0;
        economy.casinoStats.winStreak = 0;
        return { won: false, dice1, dice2, total, guess, winnings: -bet, newBalance: economy.lagcoins, multiplier: 0, luckBonus, antiStreak: true };
      }
      economy.casinoStats.winStreak = (economy.casinoStats.winStreak || 0) + 1;
    } else {
      if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0, winStreak: 0 };
      economy.casinoStats.winStreak = 0;
    }
    
    // Nueva lógica de ganancias: Más ganancia por defecto, pero cap al 25% si apuesta >= 5000
    let winnings;
    if (won) {
      if (bet >= 5000) {
        winnings = Math.floor(bet * 1.25) - bet;
      } else {
        // Aumentamos un poco la ganancia base (+20%)
        winnings = Math.floor(bet * (multiplier * 1.2)) - bet;
      }
    } else {
      winnings = -bet;
    }
    
    if (winnings > 0) {
      winnings = applyWeekendDouble(winnings, 'dice').amount;
    }
    economy.lagcoins = Math.max(0, (economy.lagcoins || 0) + winnings);
    if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0 };
    economy.casinoStats.plays++;
    if (won) {
      economy.casinoStats.wins++;
      economy.casinoStats.totalWon = (economy.casinoStats.totalWon || 0) + winnings;
      economy.totalEarned = (economy.totalEarned || 0) + winnings;
    } else {
      economy.casinoStats.totalLost = (economy.casinoStats.totalLost || 0) + bet;
    }
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ 
      type: won ? 'dice_win' : 'dice_loss', 
      amount: winnings, 
      description: `Dados: ${won ? 'Ganaste' : 'Perdiste'} ${Math.abs(winnings)} Lagcoins`,
      date: new Date().toISOString() 
    });
    
    await saveUserEconomy(guildId, userId, economy);
    return { won, dice1, dice2, total, guess, winnings, newBalance: economy.lagcoins, multiplier, luckBonus };
  } catch (error) {
    console.error('Error in playDice:', error);
    throw error;
  }
}

// Casino - Blackjack simplificado
export async function playBlackjack(guildId, userId, bet) {
  try {
    const economy = await getUserEconomy(guildId, userId);
    if (!economy || (economy.lagcoins || 0) < bet) return null;
    
    // Calcular suerte
    let luckBonus = 0;
    const activePowerups = getUserActivePowerups(guildId, userId);
    for (const powerup of activePowerups) {
      if (powerup.type === 'casino_luck' || powerup.type === 'luck_boost') {
        luckBonus += powerup.value;
      }
    }
    
    const adminBoost = getAdminBoost();
    if (adminBoost && adminBoost.systems.casino) {
      luckBonus += adminBoost.percentage;
    }
    
    const getCard = () => Math.min(Math.floor(Math.random() * 13) + 1, 10);
    const playerCards = [getCard(), getCard()];
    let dealerCards = [getCard(), getCard()];
    
    // Buff: El dealer tiene peores cartas con menos suerte requerida
    if (luckBonus > 0.1 && Math.random() < luckBonus * 0.6) {
      while (dealerCards[0] + dealerCards[1] > 14 && dealerCards[0] + dealerCards[1] < 21) {
        dealerCards = [getCard(), getCard()];
      }
    }
    
    const playerTotal = playerCards.reduce((a, b) => a + b, 0);
    const dealerTotal = dealerCards.reduce((a, b) => a + b, 0);
    
    let result = 'lose';
    let multiplier = 0;
    
    if (playerTotal === 21) {
      result = 'blackjack';
      multiplier = 1.25; // Nerf: x1.3 -> x1.25
    } else if (dealerTotal > 21 || (playerTotal <= 21 && playerTotal > dealerTotal)) {
      result = 'win';
      multiplier = 1.1; // Nerf: x1.15 -> x1.1
    } else if (playerTotal === dealerTotal) {
      result = 'tie';
      multiplier = 1;
    }

    // Sistema anti-rachas para Blackjack
    if (result === 'win' || result === 'blackjack') {
      if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0, winStreak: 0 };
      if ((economy.casinoStats.winStreak || 0) >= 3) {
        result = 'lose';
        multiplier = 0;
        economy.casinoStats.winStreak = 0;
      } else {
        economy.casinoStats.winStreak = (economy.casinoStats.winStreak || 0) + 1;
      }
    } else if (result === 'lose') {
      if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0, winStreak: 0 };
      economy.casinoStats.winStreak = 0;
    }
    
    const won = result === 'win' || result === 'blackjack';
    
    // Nueva lógica de ganancias: Más ganancia por defecto, pero cap al 25% si apuesta >= 5000
    let winnings;
    if (won) {
      if (bet >= 5000) {
        winnings = Math.floor(bet * 1.25) - bet;
      } else {
        // Aumentamos un poco la ganancia base (+15%)
        winnings = Math.floor(bet * (multiplier * 1.15)) - bet;
      }
    } else if (result === 'tie') {
      winnings = 0;
    } else {
      winnings = -bet;
    }
    
    if (winnings > 0) {
      winnings = applyWeekendDouble(winnings, 'blackjack').amount;
    }
    economy.lagcoins = Math.max(0, (economy.lagcoins || 0) + winnings);
    if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0 };
    economy.casinoStats.plays++;
    if (won) {
      economy.casinoStats.wins++;
      economy.casinoStats.totalWon = (economy.casinoStats.totalWon || 0) + winnings;
      economy.totalEarned = (economy.totalEarned || 0) + winnings;
    } else if (result !== 'tie') {
      economy.casinoStats.totalLost = (economy.casinoStats.totalLost || 0) + bet;
    }
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ 
      type: won ? 'blackjack_win' : (result === 'tie' ? 'blackjack_tie' : 'blackjack_loss'), 
      amount: winnings, 
      description: `Blackjack: ${result === 'win' || result === 'blackjack' ? 'Ganaste' : result === 'tie' ? 'Empate' : 'Perdiste'} ${Math.abs(winnings)} Lagcoins`,
      date: new Date().toISOString() 
    });
    
    await saveUserEconomy(guildId, userId, economy);
    return { result, playerCards, dealerCards, playerTotal, dealerTotal, winnings, newBalance: economy.lagcoins, luckBonus };
  } catch (error) {
    console.error('Error in playBlackjack:', error);
    throw error;
  }
}

// Robar a usuario con sistema de seguros
export async function robUser(guildId, robberUserId, victimUserId) {
  try {
    const robber = await getUserEconomy(guildId, robberUserId);
    const victim = await getUserEconomy(guildId, victimUserId);
    const jailData = getActiveJailData(robber);
    if (jailData) {
      return { error: 'jailed', remaining: Math.ceil(jailData.remainingMs / 1000) };
    }
    
    if (!victim || (victim.lagcoins || 0) < 100) return { error: 'victim_poor' };
    
    const now = Date.now();
    const lastRob = robber.lastRobAttempt ? new Date(robber.lastRobAttempt).getTime() : 0;
    const cooldown = 30000; // 30 segundos de cooldown
    
    if (now - lastRob < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastRob)) / 1000);
      return { error: 'cooldown', remaining };
    }
    
    // Verificar seguro de la víctima
    const victimInsurance = getUserInsurance(guildId, victimUserId);
    if (victimInsurance && Math.random() < victimInsurance.protection) {
      robber.lastRobAttempt = new Date().toISOString();
      await saveUserEconomy(guildId, robberUserId, robber);
      return { success: false, blocked: true, message: 'La víctima tenía seguro anti-robo activo' };
    }
    
    // Calcular probabilidad de éxito con power-ups
    let robBonus = 0;
    const activePowerups = getUserActivePowerups(guildId, robberUserId);
    for (const powerup of activePowerups) {
      if (powerup.type === 'rob_success') {
        robBonus += powerup.value;
      }
    }
    
    const adminBoost = getAdminBoost();
    if (adminBoost && adminBoost.systems.rob) {
      robBonus += adminBoost.percentage;
    }
    
    const baseSuccess = 0.15; // Reducido 10% de 0.25 a 0.15
    let finalSuccessProb = baseSuccess + robBonus;

    // Nerf para víctimas ricas (>= 5000 Lagcoins)
    if ((victim.lagcoins || 0) >= 5000) {
      finalSuccessProb *= 0.6; // Reduce la probabilidad de éxito en un 40%
    }

    const success = Math.random() < finalSuccessProb;
    robber.lastRobAttempt = new Date().toISOString();
    
    if (!success) {
      const fine = Math.floor(Math.random() * 300) + 200;
      robber.lagcoins = Math.max(0, (robber.lagcoins || 0) - fine);
      await saveUserEconomy(guildId, robberUserId, robber);
      if (Math.random() < 0.35) {
        const jailStatus = await sendUserToJail(guildId, robberUserId, {
          durationMs: (Math.floor(Math.random() * 6) + 3) * 60 * 1000,
          bailTotal: Math.floor(fine * 2.2),
          reason: 'Intento de robo a usuario',
          severity: 'media'
        });
        return { success: false, fine, jailed: true, jailStatus };
      }
      return { success: false, fine };
    }
    
    // Si la víctima tiene >= 5000, roba un porcentaje menor
    const stealPercentage = (victim.lagcoins || 0) >= 5000 ? 0.05 : 0.10;
    const maxSteal = Math.floor(victim.lagcoins * stealPercentage);
    let stolen = Math.floor(Math.random() * maxSteal) + 15;
    
    // Bonus de robo con power-ups
    if (robBonus > 0) {
      stolen = Math.floor(stolen * (1 + robBonus * 0.5));
    }
    
    const weekendStolen = applyWeekendDouble(stolen, 'rob_user');
    stolen = weekendStolen.amount;
    robber.lagcoins = (robber.lagcoins || 0) + stolen;
    robber.totalEarned = (robber.totalEarned || 0) + stolen;
    victim.lagcoins = Math.max(0, victim.lagcoins - stolen);
    
    await saveUserEconomy(guildId, robberUserId, robber);
    await saveUserEconomy(guildId, victimUserId, victim);
    if (Math.random() < 0.12) {
      const jailStatus = await sendUserToJail(guildId, robberUserId, {
        durationMs: (Math.floor(Math.random() * 4) + 2) * 60 * 1000,
        bailTotal: Math.floor(stolen * 0.8),
        reason: 'Robo a usuario detectado',
        severity: 'leve'
      });
      return { success: true, stolen, newBalance: robber.lagcoins, robBonus, jailed: true, jailStatus };
    }
    return { success: true, stolen, newBalance: robber.lagcoins, robBonus };
  } catch (error) {
    console.error('Error in robUser:', error);
    throw error;
  }
}

// Funciones de staff para manejar economía
export async function staffAddCoins(guildId, userId, amount, reason = 'staff_add') {
  try {
    const economy = await getUserEconomy(guildId, userId);
    economy.lagcoins = (economy.lagcoins || 0) + amount;
    economy.totalEarned = (economy.totalEarned || 0) + amount;
    
    if (!Array.isArray(economy.transactions)) economy.transactions = [];
    economy.transactions.push({ 
      type: reason, 
      amount, 
      description: `Staff añadió ${amount} Lagcoins`, 
      date: new Date().toISOString()
    });
    
    await saveUserEconomy(guildId, userId, economy);
    return economy;
  } catch (error) {
    console.error('Error en staffAddCoins:', error);
    throw error;
  }
}

export async function staffRemoveCoins(guildId, userId, amount, reason = 'staff_remove') {
  try {
    const economy = await getUserEconomy(guildId, userId);
    economy.lagcoins = Math.max(0, (economy.lagcoins || 0) - amount);
    
    if (!Array.isArray(economy.transactions)) economy.transactions = [];
    economy.transactions.push({ 
      type: reason, 
      amount: -amount, 
      description: `Staff removió ${amount} Lagcoins`, 
      date: new Date().toISOString()
    });
    
    await saveUserEconomy(guildId, userId, economy);
    return economy;
  } catch (error) {
    console.error('Error en staffRemoveCoins:', error);
    throw error;
  }
}

export async function staffSetCoins(guildId, userId, amount) {
  try {
    const economy = await getUserEconomy(guildId, userId);
    const oldAmount = economy.lagcoins || 0;
    economy.lagcoins = amount;
    
    if (!Array.isArray(economy.transactions)) economy.transactions = [];
    economy.transactions.push({ 
      type: 'staff_set', 
      amount: amount - oldAmount, 
      description: `Staff estableció balance a ${amount} Lagcoins`, 
      date: new Date().toISOString()
    });
    
    await saveUserEconomy(guildId, userId, economy);
    return economy;
  } catch (error) {
    console.error('Error en staffSetCoins:', error);
    throw error;
  }
}

export async function staffGiveItem(guildId, userId, itemId) {
  try {
    const economy = await getUserEconomy(guildId, userId);
    const item = ITEMS[itemId];
    
    if (!item) return null;
    
    if (!economy.items) economy.items = [];
    if (!economy.inventory) economy.inventory = [];
    
    if (!economy.items.includes(itemId)) {
      economy.items.push(itemId);
    }
    economy.inventory.push({ itemId, quantity: 1, acquiredAt: new Date().toISOString(), giftedBy: 'staff' });
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ type: 'staff_gift', amount: 0, description: `Staff dio item: ${item.name}`, date: new Date().toISOString() });
    
    await saveUserEconomy(guildId, userId, economy);
    return { economy, item };
  } catch (error) {
    console.error('Error en staffGiveItem:', error);
    throw error;
  }
}

export async function staffRemoveItem(guildId, userId, itemId) {
  try {
    const economy = await getUserEconomy(guildId, userId);
    
    if (!economy.items || !economy.items.includes(itemId)) return null;
    
    economy.items = economy.items.filter(i => i !== itemId);
    if (economy.inventory) {
      economy.inventory = economy.inventory.filter(i => i.itemId !== itemId);
    }
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ type: 'staff_remove_item', amount: 0, description: `Staff removió item: ${itemId}`, date: new Date().toISOString() });
    
    await saveUserEconomy(guildId, userId, economy);
    return economy;
  } catch (error) {
    console.error('Error en staffRemoveItem:', error);
    throw error;
  }
}

// Banco - Depositar
export async function bankDeposit(guildId, userId, amount) {
  try {
    if (amount <= 0) return null;
    
    // Sincronizar con MongoDB si está conectado
    const mongoConnected = isMongoConnected();
    if (mongoConnected) {
      const result = await depositToBank(guildId, userId, amount);
      if (result) return result.toObject ? result.toObject() : result;
      return null; // Probablemente no tiene dinero suficiente
    }

    const economyData = loadEconomyFile();
    const key = `${guildId}-${userId}`;
    const economy = economyData[key];

    if (!economy || (economy.lagcoins || 0) < amount) return null;
    
    economy.lagcoins -= amount;
    economy.bankBalance = (economy.bankBalance || 0) + amount;
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ type: 'deposit', amount: -amount, description: `Depósito al banco`, date: new Date().toISOString() });
    
    saveEconomyFile(economyData);
    return economy;
  } catch (error) {
    console.error('Error en bankDeposit:', error);
    throw error;
  }
}

// Banco - Retirar
export async function bankWithdraw(guildId, userId, amount) {
  try {
    if (amount <= 0) return null;

    // Sincronizar con MongoDB si está conectado
    const mongoConnected = isMongoConnected();
    if (mongoConnected) {
      const result = await withdrawFromBank(guildId, userId, amount);
      if (result) return result.toObject ? result.toObject() : result;
      return null; // Probablemente no tiene dinero en el banco
    }

    const economyData = loadEconomyFile();
    const key = `${guildId}-${userId}`;
    const economy = economyData[key];

    if (!economy || (economy.bankBalance || 0) < amount) return null;
    
    economy.bankBalance -= amount;
    economy.lagcoins = (economy.lagcoins || 0) + amount;
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ type: 'withdraw', amount: amount, description: `Retiro del banco`, date: new Date().toISOString() });
    
    saveEconomyFile(economyData);
    return economy;
  } catch (error) {
    console.error('Error en bankWithdraw:', error);
    throw error;
  }
}

// Trabajo mejorado con nacionalidad y power-ups
export async function doWork(guildId, userId, jobId = 'basico') {
  try {
    const economy = await getUserEconomy(guildId, userId);
    const jailData = getActiveJailData(economy);
    if (jailData) {
      return { error: 'jailed', remaining: Math.ceil(jailData.remainingMs / 1000) };
    }
    const job = JOBS[jobId];
    
    if (!job) return { error: 'invalid_job' };
    
    if (job.itemsNeeded && job.itemsNeeded.length > 0) {
      const hasItems = job.itemsNeeded.every(item => economy.items && economy.items.includes(item));
      if (!hasItems) return { error: 'missing_items', needed: job.itemsNeeded };
    }
    
    const now = Date.now();
    const lastWork = economy.lastWorkTime ? new Date(economy.lastWorkTime).getTime() : 0;
    let cooldown = job.cooldown || 60000;
    
    // Reducir cooldown con power-ups
    const activePowerups = getUserActivePowerups(guildId, userId);
    for (const powerup of activePowerups) {
      if (powerup.type === 'cooldown_reduction') {
        cooldown *= (1 - powerup.value);
      }
    }
    
    if (now - lastWork < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastWork)) / 1000);
      return { error: 'cooldown', remaining };
    }
    
    // Calcular ganancias base
    let earnings = Math.floor(Math.random() * (job.maxEarnings - job.minEarnings + 1)) + job.minEarnings;
    let bonus = Math.random() > 0.9 ? Math.floor(earnings * 0.5) : 0;
    
    // Aplicar multiplicador de nacionalidad
    const nationality = await getUserNationality(guildId, userId);
    if (nationality && nationality.currentCountry) {
      const country = COUNTRIES[nationality.currentCountry];
      if (country) {
        earnings = Math.floor(earnings * country.jobMultiplier);
        bonus = Math.floor(bonus * country.jobMultiplier);
      }
    }
    
    // Aplicar power-ups de trabajo
    let workBonus = 0;
    for (const powerup of activePowerups) {
      if (powerup.type === 'work_boost') {
        workBonus += powerup.value;
      }
    }
    
    // Aplicar boost de admin
    const adminBoost = getAdminBoost();
    if (adminBoost && adminBoost.systems.work) {
      workBonus += adminBoost.percentage;
    }
    
    if (workBonus > 0) {
      earnings = Math.floor(earnings * (1 + workBonus));
      bonus = Math.floor(bonus * (1 + workBonus));
    }
    
    const baseTotal = earnings + bonus;
    const weekendResult = applyWeekendDouble(baseTotal, 'work');
    const total = weekendResult.amount;
    
    economy.lagcoins = (economy.lagcoins || 0) + total;
    economy.totalEarned = (economy.totalEarned || 0) + total;
    economy.lastWorkTime = new Date().toISOString();
    
    if (!economy.jobStats) economy.jobStats = { totalJobs: 0, favoriteJob: jobId };
    economy.jobStats.totalJobs++;
    economy.jobStats.favoriteJob = jobId;
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({
      type: 'work',
      amount: total,
      description: `Trabajo: ${job.name}`,
      date: new Date().toISOString()
    });
    
    await saveUserEconomy(guildId, userId, economy);
    return { job, earnings, bonus, total, newBalance: economy.lagcoins, workBonus, nationality, weekendDouble: weekendResult.active };
  } catch (error) {
    console.error('Error in doWork:', error);
    throw error;
  }
}

// Robar el banco (muy arriesgado)
export async function robBank(guildId, userId) {
  try {
    const economy = await getUserEconomy(guildId, userId);
    const jailData = getActiveJailData(economy);
    if (jailData) {
      return { error: 'jailed', remaining: Math.ceil(jailData.remainingMs / 1000) };
    }
    
    const now = Date.now();
    const lastRob = economy.lastBankRob ? new Date(economy.lastBankRob).getTime() : 0;
    const cooldown = 120000; // 2 minutos de cooldown
    
    if (now - lastRob < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastRob)) / 1000);
      return { error: 'cooldown', remaining };
    }
    
    economy.lastBankRob = new Date().toISOString();
    
    // Calcular probabilidad con power-ups
    let robBonus = 0;
    const activePowerups = getUserActivePowerups(guildId, userId);
    for (const powerup of activePowerups) {
      if (powerup.type === 'rob_success') {
        robBonus += powerup.value;
      }
    }
    
    const adminBoost = getAdminBoost();
    if (adminBoost && adminBoost.systems.rob) {
      robBonus += adminBoost.percentage;
    }
    
    // 5% base + bonus de éxito (reducido 10%)
    const success = Math.random() < (0.05 + robBonus * 0.3);
    
    if (success) {
      let stolen = Math.floor(Math.random() * 2000) + 500;
      if (robBonus > 0) {
        stolen = Math.floor(stolen * (1 + robBonus));
      }
      stolen = applyWeekendDouble(stolen, 'bank_heist').amount;
      
      economy.lagcoins = (economy.lagcoins || 0) + stolen;
      economy.totalEarned = (economy.totalEarned || 0) + stolen;
      
      if (!economy.transactions) economy.transactions = [];
      economy.transactions.push({ type: 'bank_heist', amount: stolen, description: 'Robo de banco exitoso', date: new Date().toISOString() });
      
      await saveUserEconomy(guildId, userId, economy);
      if (Math.random() < 0.35) {
        const jailStatus = await sendUserToJail(guildId, userId, {
          durationMs: (Math.floor(Math.random() * 12) + 8) * 60 * 1000,
          bailTotal: Math.floor(stolen * 1.5),
          reason: 'Robo al banco',
          severity: 'alta'
        });
        return { success: true, stolen, newBalance: economy.lagcoins, robBonus, jailed: true, jailStatus };
      }
      return { success: true, stolen, newBalance: economy.lagcoins, robBonus };
    } else {
      const penalty = Math.floor(Math.random() * 500) + 200;
      economy.lagcoins = Math.max(0, (economy.lagcoins || 0) - penalty);
      
      if (!economy.transactions) economy.transactions = [];
      economy.transactions.push({ type: 'bank_heist_failed', amount: -penalty, description: 'Robo de banco fallido', date: new Date().toISOString() });
      
      await saveUserEconomy(guildId, userId, economy);
      if (Math.random() < 0.8) {
        const jailStatus = await sendUserToJail(guildId, userId, {
          durationMs: (Math.floor(Math.random() * 18) + 12) * 60 * 1000,
          bailTotal: Math.floor(penalty * 3.5),
          reason: 'Intento de robo al banco',
          severity: 'grave'
        });
        return { success: false, penalty, newBalance: economy.lagcoins, jailed: true, jailStatus };
      }
      return { success: false, penalty, newBalance: economy.lagcoins };
    }
  } catch (error) {
    console.error('Error in robBank:', error);
    throw error;
  }
}

// Sistema de Subastas
export function getActiveAuctions() {
  const data = loadAuctionsFile();
  const now = Date.now();
  return data.auctions.filter(a => a.endTime > now && !a.ended);
}

export function getAuction(auctionId) {
  const data = loadAuctionsFile();
  return data.auctions.find(a => a.id === auctionId);
}

export async function createAuction(guildId, userId, itemId, startingBid, durationMinutes) {
  const economy = await getUserEconomy(guildId, userId);
  const item = ITEMS[itemId];
  
  if (!item) return { error: 'item_not_found' };
  if (!economy.items || !economy.items.includes(itemId)) return { error: 'item_not_owned' };
  
  const data = loadAuctionsFile();
  const auctionId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  
  const auction = {
    id: auctionId,
    guildId,
    sellerId: userId,
    itemId,
    itemName: item.name,
    itemEmoji: item.emoji,
    startingBid,
    currentBid: startingBid,
    highestBidderId: null,
    bids: [],
    startTime: Date.now(),
    endTime: Date.now() + (durationMinutes * 60 * 1000),
    ended: false
  };
  
  // Remover item del inventario del vendedor
  economy.items = economy.items.filter(i => i !== itemId);
  economy.inventory = (economy.inventory || []).filter(i => i.itemId !== itemId);
  await saveUserEconomy(guildId, userId, economy);
  
  data.auctions.push(auction);
  saveAuctionsFile(data);
  
  return { success: true, auction };
}

export async function placeBid(guildId, auctionId, userId, bidAmount) {
  const data = loadAuctionsFile();
  const auction = data.auctions.find(a => a.id === auctionId);
  
  if (!auction) return { error: 'auction_not_found' };
  if (auction.ended || Date.now() > auction.endTime) return { error: 'auction_ended' };
  if (auction.sellerId === userId) return { error: 'cannot_bid_own' };
  if (bidAmount <= auction.currentBid) return { error: 'bid_too_low', currentBid: auction.currentBid };
  
  const economy = await getUserEconomy(guildId, userId);
  if ((economy.lagcoins || 0) < bidAmount) return { error: 'insufficient_funds' };
  
  // Devolver el bid anterior si existe
  if (auction.highestBidderId && auction.highestBidderId !== userId) {
    const previousBidder = await getUserEconomy(guildId, auction.highestBidderId);
    previousBidder.lagcoins = (previousBidder.lagcoins || 0) + auction.currentBid;
    await saveUserEconomy(guildId, auction.highestBidderId, previousBidder);
  }
  
  // Descontar del nuevo ofertante
  economy.lagcoins -= bidAmount;
  await saveUserEconomy(guildId, userId, economy);
  
  auction.currentBid = bidAmount;
  auction.highestBidderId = userId;
  auction.bids.push({
    userId,
    amount: bidAmount,
    time: Date.now()
  });
  
  saveAuctionsFile(data);
  return { success: true, auction };
}

export async function endAuction(auctionId) {
  const data = loadAuctionsFile();
  const auction = data.auctions.find(a => a.id === auctionId);
  
  if (!auction || auction.ended) return null;
  
  auction.ended = true;
  
  if (auction.highestBidderId) {
    // Dar item al ganador
    const winner = await getUserEconomy(auction.guildId, auction.highestBidderId);
    if (!winner.items) winner.items = [];
    if (!winner.inventory) winner.inventory = [];
    winner.items.push(auction.itemId);
    winner.inventory.push({ itemId: auction.itemId, quantity: 1, acquiredAt: new Date().toISOString(), source: 'auction' });
    winner.auctionsWon = (winner.auctionsWon || 0) + 1;
    await saveUserEconomy(auction.guildId, auction.highestBidderId, winner);
    
    // Pagar al vendedor
    const seller = await getUserEconomy(auction.guildId, auction.sellerId);
    seller.lagcoins = (seller.lagcoins || 0) + auction.currentBid;
    seller.totalEarned = (seller.totalEarned || 0) + auction.currentBid;
    await saveUserEconomy(auction.guildId, auction.sellerId, seller);
  } else {
    // Devolver item al vendedor
    const seller = await getUserEconomy(auction.guildId, auction.sellerId);
    if (!seller.items) seller.items = [];
    seller.items.push(auction.itemId);
    await saveUserEconomy(auction.guildId, auction.sellerId, seller);
  }
  
  data.history.push(auction);
  saveAuctionsFile(data);
  
  return auction;
}

// Obtener todos los usuarios ordenados por Lagcoins
export async function getLeaderboard(guildId, type = 'lagcoins', limit = 10) {
  const economyData = loadEconomyFile();
  
  const users = Object.values(economyData)
    .filter(u => u.guildId === guildId)
    .map(u => ({
      userId: u.userId,
      lagcoins: u.lagcoins || 0,
      bankBalance: u.bankBalance || 0,
      totalWealth: (u.lagcoins || 0) + (u.bankBalance || 0),
      casinoWins: u.casinoStats?.wins || 0,
      casinoPlays: u.casinoStats?.plays || 0,
      casinoProfit: (u.casinoStats?.totalWon || 0) - (u.casinoStats?.totalLost || 0),
      minigamesWon: u.minigamesWon || 0,
      tradesCompleted: u.tradesCompleted || 0,
      auctionsWon: u.auctionsWon || 0,
      totalJobs: u.jobStats?.totalJobs || 0
    }));
  
  // Ordenar según el tipo
  switch (type) {
    case 'lagcoins':
      users.sort((a, b) => b.totalWealth - a.totalWealth);
      break;
    case 'casino':
      users.sort((a, b) => b.casinoProfit - a.casinoProfit);
      break;
    case 'minigames':
      users.sort((a, b) => b.minigamesWon - a.minigamesWon);
      break;
    case 'trades':
      users.sort((a, b) => (b.tradesCompleted + b.auctionsWon) - (a.tradesCompleted + a.auctionsWon));
      break;
    default:
      users.sort((a, b) => b.totalWealth - a.totalWealth);
  }
  
  return users.slice(0, limit);
}
