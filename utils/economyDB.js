import fs from 'fs';
import path from 'path';
import { getEconomy, addLagcoins, removeLagcoins, transferLagcoins, isMongoConnected, saveEconomyToMongo, addItemToInventory, updateCasinoStats, updateJobStats, depositToBank, withdrawFromBank, giveItemToUser } from './mongoSync.js';

const DATA_DIR = './data';
const ECONOMY_FILE = path.join(DATA_DIR, 'economy.json');

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

export async function getUserEconomy(guildId, userId) {
  try {
    const mongoConnected = isMongoConnected();
    
    if (mongoConnected) {
      const result = await getEconomy(guildId, userId);
      return result || createNewEconomy(guildId, userId);
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
    return createNewEconomy(guildId, userId);
  }
}

function createNewEconomy(guildId, userId) {
  return {
    guildId,
    userId,
    lagcoins: 100,
    bankBalance: 0,
    lastWorkTime: null,
    lastRobTime: null,
    transactions: [],
    items: [],
    createdAt: new Date().toISOString()
  };
}

export async function addUserLagcoins(guildId, userId, amount, reason = 'work') {
  try {
    const mongoConnected = isMongoConnected();
    
    if (mongoConnected) {
      const result = await addLagcoins(guildId, userId, amount, reason);
      return result || await getUserEconomy(guildId, userId);
    }
    
    const economyData = loadEconomyFile();
    const key = `${guildId}-${userId}`;
    
    if (!economyData[key]) {
      economyData[key] = createNewEconomy(guildId, userId);
    }
    
    economyData[key].lagcoins = Math.max(0, (economyData[key].lagcoins || 0) + amount);
    if (!economyData[key].transactions) economyData[key].transactions = [];
    economyData[key].transactions.push({
      type: reason,
      amount,
      date: new Date().toISOString()
    });
    
    saveEconomyFile(economyData);
    return economyData[key];
  } catch (error) {
    console.error('Error in addUserLagcoins:', error);
    return await getUserEconomy(guildId, userId);
  }
}

export async function removeUserLagcoins(guildId, userId, amount, reason = 'spend') {
  const mongoConnected = isMongoConnected();
  
  if (mongoConnected) {
    return await removeLagcoins(guildId, userId, amount, reason);
  }
  
  const economyData = loadEconomyFile();
  const key = `${guildId}-${userId}`;
  
  if (!economyData[key]) return null;
  if (economyData[key].lagcoins < amount) return null;
  
  economyData[key].lagcoins -= amount;
  economyData[key].transactions.push({
    type: reason,
    amount: -amount,
    date: new Date().toISOString()
  });
  
  saveEconomyFile(economyData);
  return economyData[key];
}

export async function transferUserLagcoins(guildId, fromUserId, toUserId, amount) {
  const mongoConnected = isMongoConnected();
  
  if (mongoConnected) {
    return await transferLagcoins(guildId, fromUserId, toUserId, amount);
  }
  
  const economyData = loadEconomyFile();
  const fromKey = `${guildId}-${fromUserId}`;
  const toKey = `${guildId}-${toUserId}`;
  
  if (!economyData[fromKey]) return null;
  if (economyData[fromKey].lagcoins < amount) return null;
  
  if (!economyData[toKey]) {
    economyData[toKey] = {
      guildId,
      userId: toUserId,
      lagcoins: 100,
      bankBalance: 0,
      lastWorkTime: null,
      lastRobTime: null,
      transactions: []
    };
  }
  
  economyData[fromKey].lagcoins -= amount;
  economyData[fromKey].transactions.push({
    type: 'transfer',
    amount: -amount,
    to: toUserId,
    date: new Date().toISOString()
  });
  
  economyData[toKey].lagcoins += amount;
  economyData[toKey].transactions.push({
    type: 'transfer',
    amount,
    from: fromUserId,
    date: new Date().toISOString()
  });
  
  saveEconomyFile(economyData);
  return { from: economyData[fromKey], to: economyData[toKey] };
}

export async function saveUserEconomy(guildId, userId, data) {
  const mongoConnected = isMongoConnected();
  
  // Primero guardar en JSON local
  const economyData = loadEconomyFile();
  const key = `${guildId}-${userId}`;
  economyData[key] = { ...economyData[key], ...data, guildId, userId };
  saveEconomyFile(economyData);
  
  // Luego sincronizar completamente con MongoDB
  if (mongoConnected) {
    try {
      await saveEconomyToMongo(guildId, userId, economyData[key]);
    } catch (e) {
      console.error('Error sincronizando economía con MongoDB:', e.message);
    }
  }
  
  return economyData[key];
}

// Sistema de trabajos mejorado
export const JOBS = {
  basico: { name: 'Trabajo Básico', emoji: '💼', minEarnings: 50, maxEarnings: 120, itemsNeeded: [], cooldown: 60000 },
  pescar: { name: 'Pescador', emoji: '🎣', minEarnings: 100, maxEarnings: 250, itemsNeeded: ['cana_pesca'], cooldown: 45000 },
  talar: { name: 'Leñador', emoji: '🪓', minEarnings: 120, maxEarnings: 300, itemsNeeded: ['hacha'], cooldown: 45000 },
  minar: { name: 'Minero', emoji: '⛏️', minEarnings: 150, maxEarnings: 400, itemsNeeded: ['pico'], cooldown: 45000 },
  construir: { name: 'Albañil', emoji: '🏗️', minEarnings: 180, maxEarnings: 450, itemsNeeded: ['pala'], cooldown: 45000 },
  programar: { name: 'Programador', emoji: '💻', minEarnings: 200, maxEarnings: 500, itemsNeeded: ['laptop'], cooldown: 40000 },
  cocinar: { name: 'Chef', emoji: '👨‍🍳', minEarnings: 150, maxEarnings: 350, itemsNeeded: ['utensilios'], cooldown: 50000 },
  entregar: { name: 'Repartidor', emoji: '🛵', minEarnings: 80, maxEarnings: 200, itemsNeeded: ['moto'], cooldown: 30000 },
  streaming: { name: 'Streamer', emoji: '🎥', minEarnings: 100, maxEarnings: 600, itemsNeeded: ['camara', 'laptop'], cooldown: 120000 },
  musica: { name: 'Músico', emoji: '🎸', minEarnings: 120, maxEarnings: 400, itemsNeeded: ['guitarra'], cooldown: 60000 },
  arte: { name: 'Artista', emoji: '🎨', minEarnings: 100, maxEarnings: 450, itemsNeeded: ['lienzo'], cooldown: 90000 },
  cazar: { name: 'Cazador', emoji: '🏹', minEarnings: 180, maxEarnings: 500, itemsNeeded: ['arco'], cooldown: 60000 },
  granja: { name: 'Granjero', emoji: '🌾', minEarnings: 130, maxEarnings: 350, itemsNeeded: ['semillas'], cooldown: 45000 }
};

// Sistema de items extendido
export const ITEMS = {
  // Herramientas básicas
  cana_pesca: { name: 'Caña de Pesca', emoji: '🎣', price: 500, unlocks: 'pescar', description: 'Para pescar y ganar más', category: 'herramienta' },
  hacha: { name: 'Hacha', emoji: '🪓', price: 600, unlocks: 'talar', description: 'Para talar árboles', category: 'herramienta' },
  pico: { name: 'Pico', emoji: '⛏️', price: 800, unlocks: 'minar', description: 'Para minar minerales', category: 'herramienta' },
  pala: { name: 'Pala', emoji: '🏗️', price: 700, unlocks: 'construir', description: 'Para construcción', category: 'herramienta' },
  
  // Tecnología
  laptop: { name: 'Laptop Gaming', emoji: '💻', price: 2000, unlocks: 'programar', description: 'Para programar y streamear', category: 'tecnologia' },
  camara: { name: 'Cámara HD', emoji: '📹', price: 1500, unlocks: 'streaming', description: 'Para hacer streams', category: 'tecnologia' },
  
  // Vehículos
  moto: { name: 'Moto de Reparto', emoji: '🛵', price: 1200, unlocks: 'entregar', description: 'Para hacer entregas rápidas', category: 'vehiculo' },
  bicicleta: { name: 'Bicicleta', emoji: '🚲', price: 300, unlocks: null, description: 'Transporte básico', category: 'vehiculo' },
  
  // Instrumentos y arte
  guitarra: { name: 'Guitarra Eléctrica', emoji: '🎸', price: 1800, unlocks: 'musica', description: 'Para tocar música', category: 'instrumento' },
  lienzo: { name: 'Kit de Arte', emoji: '🎨', price: 1000, unlocks: 'arte', description: 'Para crear obras de arte', category: 'arte' },
  
  // Cocina
  utensilios: { name: 'Utensilios de Chef', emoji: '🍳', price: 900, unlocks: 'cocinar', description: 'Para cocinar platillos', category: 'cocina' },
  
  // Caza y naturaleza
  arco: { name: 'Arco de Caza', emoji: '🏹', price: 1400, unlocks: 'cazar', description: 'Para cazar animales', category: 'arma' },
  semillas: { name: 'Pack de Semillas', emoji: '🌱', price: 400, unlocks: 'granja', description: 'Para cultivar', category: 'granja' },
  
  // Mejoras y buffs
  energia: { name: 'Bebida Energética', emoji: '⚡', price: 150, unlocks: null, description: 'Reduce cooldown de trabajo 50% por 1h', category: 'consumible', effect: { type: 'cooldown_reduction', value: 0.5, duration: 3600000 } },
  suerte: { name: 'Trébol de la Suerte', emoji: '🍀', price: 500, unlocks: null, description: '+20% probabilidad en casino por 30min', category: 'consumible', effect: { type: 'luck_boost', value: 0.2, duration: 1800000 } },
  escudo: { name: 'Escudo Anti-Robo', emoji: '🛡️', price: 800, unlocks: null, description: 'Protege tus Lagcoins de robos por 2h', category: 'consumible', effect: { type: 'rob_protection', duration: 7200000 } },
  
  // Coleccionables
  corona: { name: 'Corona Dorada', emoji: '👑', price: 10000, unlocks: null, description: 'Símbolo de riqueza', category: 'coleccionable' },
  diamante: { name: 'Diamante Brillante', emoji: '💎', price: 5000, unlocks: null, description: 'Joya preciosa', category: 'coleccionable' },
  trofeo: { name: 'Trofeo de Oro', emoji: '🏆', price: 3000, unlocks: null, description: 'Premio al mejor', category: 'coleccionable' }
};

// Categorías de items
export const ITEM_CATEGORIES = {
  herramienta: { name: 'Herramientas', emoji: '🔧' },
  tecnologia: { name: 'Tecnología', emoji: '💻' },
  vehiculo: { name: 'Vehículos', emoji: '🚗' },
  instrumento: { name: 'Instrumentos', emoji: '🎵' },
  arte: { name: 'Arte', emoji: '🎨' },
  cocina: { name: 'Cocina', emoji: '🍳' },
  arma: { name: 'Armas', emoji: '⚔️' },
  granja: { name: 'Granja', emoji: '🌾' },
  consumible: { name: 'Consumibles', emoji: '🧪' },
  coleccionable: { name: 'Coleccionables', emoji: '✨' }
};

export async function getUserProfile(guildId, userId) {
  const economy = await getUserEconomy(guildId, userId);
  return {
    userId,
    lagcoins: economy.lagcoins || 0,
    bankBalance: economy.bankBalance || 0,
    items: economy.items || [],
    inventory: economy.inventory || [],
    totalEarned: economy.totalEarned || (economy.transactions || []).reduce((a, t) => a + (t.amount > 0 ? t.amount : 0), 0),
    totalSpent: economy.totalSpent || 0,
    casinoStats: economy.casinoStats || { plays: 0, wins: 0, totalWon: 0, totalLost: 0 },
    jobStats: economy.jobStats || { totalJobs: 0, favoriteJob: null },
    createdAt: economy.createdAt
  };
}

export async function buyItem(guildId, userId, itemId) {
  const economy = await getUserEconomy(guildId, userId);
  const item = ITEMS[itemId];
  
  if (!item || economy.lagcoins < item.price) return null;
  
  economy.lagcoins -= item.price;
  economy.totalSpent = (economy.totalSpent || 0) + item.price;
  if (!economy.items) economy.items = [];
  if (!economy.inventory) economy.inventory = [];
  
  economy.items.push(itemId);
  economy.inventory.push({ itemId, quantity: 1, acquiredAt: new Date().toISOString() });
  
  if (!economy.transactions) economy.transactions = [];
  economy.transactions.push({ type: 'purchase', amount: -item.price, description: `Compró ${item.name}`, date: new Date().toISOString() });
  
  await saveUserEconomy(guildId, userId, economy);
  return economy;
}

export async function getDailyReward(guildId, userId) {
  const economy = await getUserEconomy(guildId, userId);
  const today = new Date().toDateString();
  
  if (economy.lastDailyReward === today) {
    return null;
  }
  
  const baseReward = 150;
  const bonusReward = Math.floor(Math.random() * 200);
  const streak = economy.dailyStreak || 0;
  const streakBonus = Math.min(streak * 25, 250);
  const reward = baseReward + bonusReward + streakBonus;
  
  economy.lastDailyReward = today;
  economy.dailyStreak = (economy.dailyStreak || 0) + 1;
  economy.lagcoins = (economy.lagcoins || 0) + reward;
  economy.totalEarned = (economy.totalEarned || 0) + reward;
  
  if (!economy.transactions) economy.transactions = [];
  economy.transactions.push({ type: 'daily', amount: reward, description: `Recompensa diaria (racha: ${economy.dailyStreak})`, date: new Date().toISOString() });
  
  await saveUserEconomy(guildId, userId, economy);
  return { reward, streak: economy.dailyStreak, streakBonus };
}

// Casino - Ruleta básica
export async function playCasino(guildId, userId, bet) {
  const economy = await getUserEconomy(guildId, userId);
  if (economy.lagcoins < bet) return null;
  
  const roll = Math.floor(Math.random() * 100);
  const won = roll > 45;
  const multiplier = won ? (roll > 90 ? 3 : roll > 75 ? 2 : 1.5) : 0;
  const winnings = won ? Math.floor(bet * multiplier) - bet : -bet;
  
  economy.lagcoins += winnings;
  if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0 };
  economy.casinoStats.plays++;
  if (won) {
    economy.casinoStats.wins++;
    economy.casinoStats.totalWon = (economy.casinoStats.totalWon || 0) + winnings;
    economy.totalEarned = (economy.totalEarned || 0) + winnings;
  } else {
    economy.casinoStats.totalLost = (economy.casinoStats.totalLost || 0) + bet;
  }
  
  await saveUserEconomy(guildId, userId, economy);
  return { won, winnings, newBalance: economy.lagcoins, multiplier, roll };
}

// Casino - Tragamonedas
export async function playSlots(guildId, userId, bet) {
  const economy = await getUserEconomy(guildId, userId);
  if (economy.lagcoins < bet) return null;
  
  const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣', '🍀'];
  const reels = [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];
  
  let multiplier = 0;
  let jackpot = false;
  
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    if (reels[0] === '7️⃣') {
      multiplier = 10;
      jackpot = true;
    } else if (reels[0] === '💎') {
      multiplier = 7;
    } else if (reels[0] === '🍀') {
      multiplier = 5;
    } else {
      multiplier = 3;
    }
  } else if (reels[0] === reels[1] || reels[1] === reels[2]) {
    multiplier = 1.5;
  }
  
  const won = multiplier > 0;
  const winnings = won ? Math.floor(bet * multiplier) - bet : -bet;
  
  economy.lagcoins += winnings;
  if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0 };
  economy.casinoStats.plays++;
  if (won) {
    economy.casinoStats.wins++;
    economy.casinoStats.totalWon = (economy.casinoStats.totalWon || 0) + winnings;
    economy.totalEarned = (economy.totalEarned || 0) + winnings;
  } else {
    economy.casinoStats.totalLost = (economy.casinoStats.totalLost || 0) + bet;
  }
  
  await saveUserEconomy(guildId, userId, economy);
  return { won, winnings, newBalance: economy.lagcoins, reels, multiplier, jackpot };
}

// Casino - Coinflip
export async function playCoinflip(guildId, userId, bet, choice) {
  const economy = await getUserEconomy(guildId, userId);
  if (economy.lagcoins < bet) return null;
  
  const result = Math.random() > 0.5 ? 'cara' : 'cruz';
  const won = choice.toLowerCase() === result;
  const winnings = won ? bet : -bet;
  
  economy.lagcoins += winnings;
  if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0 };
  economy.casinoStats.plays++;
  if (won) {
    economy.casinoStats.wins++;
    economy.casinoStats.totalWon = (economy.casinoStats.totalWon || 0) + winnings;
    economy.totalEarned = (economy.totalEarned || 0) + winnings;
  } else {
    economy.casinoStats.totalLost = (economy.casinoStats.totalLost || 0) + bet;
  }
  
  await saveUserEconomy(guildId, userId, economy);
  return { won, result, choice, winnings, newBalance: economy.lagcoins };
}

// Casino - Dados
export async function playDice(guildId, userId, bet, guess) {
  const economy = await getUserEconomy(guildId, userId);
  if (economy.lagcoins < bet) return null;
  
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  const total = dice1 + dice2;
  
  let won = false;
  let multiplier = 0;
  
  if (guess === 'exacto' && total === 7) {
    won = true;
    multiplier = 4;
  } else if (guess === 'alto' && total > 7) {
    won = true;
    multiplier = 2;
  } else if (guess === 'bajo' && total < 7) {
    won = true;
    multiplier = 2;
  } else if (guess === 'dobles' && dice1 === dice2) {
    won = true;
    multiplier = 5;
  }
  
  const winnings = won ? Math.floor(bet * multiplier) - bet : -bet;
  
  economy.lagcoins += winnings;
  if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0 };
  economy.casinoStats.plays++;
  if (won) {
    economy.casinoStats.wins++;
    economy.casinoStats.totalWon = (economy.casinoStats.totalWon || 0) + winnings;
    economy.totalEarned = (economy.totalEarned || 0) + winnings;
  } else {
    economy.casinoStats.totalLost = (economy.casinoStats.totalLost || 0) + bet;
  }
  
  await saveUserEconomy(guildId, userId, economy);
  return { won, dice1, dice2, total, guess, winnings, newBalance: economy.lagcoins, multiplier };
}

// Casino - Blackjack simplificado
export async function playBlackjack(guildId, userId, bet) {
  const economy = await getUserEconomy(guildId, userId);
  if (economy.lagcoins < bet) return null;
  
  const getCard = () => Math.min(Math.floor(Math.random() * 13) + 1, 10);
  const playerCards = [getCard(), getCard()];
  const dealerCards = [getCard(), getCard()];
  
  const playerTotal = playerCards.reduce((a, b) => a + b, 0);
  const dealerTotal = dealerCards.reduce((a, b) => a + b, 0);
  
  let result = 'lose';
  let multiplier = 0;
  
  if (playerTotal === 21) {
    result = 'blackjack';
    multiplier = 2.5;
  } else if (dealerTotal > 21 || (playerTotal <= 21 && playerTotal > dealerTotal)) {
    result = 'win';
    multiplier = 2;
  } else if (playerTotal === dealerTotal) {
    result = 'tie';
    multiplier = 1;
  }
  
  const won = result === 'win' || result === 'blackjack';
  const winnings = multiplier > 0 ? Math.floor(bet * multiplier) - bet : -bet;
  
  economy.lagcoins += winnings;
  if (!economy.casinoStats) economy.casinoStats = { plays: 0, wins: 0, totalWon: 0, totalLost: 0 };
  economy.casinoStats.plays++;
  if (won) {
    economy.casinoStats.wins++;
    economy.casinoStats.totalWon = (economy.casinoStats.totalWon || 0) + winnings;
    economy.totalEarned = (economy.totalEarned || 0) + winnings;
  } else if (result !== 'tie') {
    economy.casinoStats.totalLost = (economy.casinoStats.totalLost || 0) + bet;
  }
  
  await saveUserEconomy(guildId, userId, economy);
  return { result, playerCards, dealerCards, playerTotal, dealerTotal, winnings, newBalance: economy.lagcoins };
}

// Robar a usuario
export async function robUser(guildId, robberUserId, victimUserId) {
  const robber = await getUserEconomy(guildId, robberUserId);
  const victim = await getUserEconomy(guildId, victimUserId);
  
  if (!victim || victim.lagcoins < 100) return { error: 'victim_poor' };
  
  const now = Date.now();
  const lastRob = robber.lastRobAttempt ? new Date(robber.lastRobAttempt).getTime() : 0;
  const cooldown = 300000;
  
  if (now - lastRob < cooldown) {
    const remaining = Math.ceil((cooldown - (now - lastRob)) / 1000);
    return { error: 'cooldown', remaining };
  }
  
  const success = Math.random() > 0.6;
  robber.lastRobAttempt = new Date().toISOString();
  
  if (!success) {
    const fine = Math.floor(Math.random() * 150) + 50;
    robber.lagcoins = Math.max(0, (robber.lagcoins || 0) - fine);
    await saveUserEconomy(guildId, robberUserId, robber);
    return { success: false, fine };
  }
  
  const maxSteal = Math.floor(victim.lagcoins * 0.3);
  const stolen = Math.floor(Math.random() * maxSteal) + 50;
  
  robber.lagcoins = (robber.lagcoins || 0) + stolen;
  robber.totalEarned = (robber.totalEarned || 0) + stolen;
  victim.lagcoins = Math.max(0, victim.lagcoins - stolen);
  
  await saveUserEconomy(guildId, robberUserId, robber);
  await saveUserEconomy(guildId, victimUserId, victim);
  
  return { success: true, stolen, newBalance: robber.lagcoins };
}

// Funciones de staff para manejar economía
export async function staffAddCoins(guildId, userId, amount, reason = 'staff_add') {
  const economy = await getUserEconomy(guildId, userId);
  economy.lagcoins = (economy.lagcoins || 0) + amount;
  economy.totalEarned = (economy.totalEarned || 0) + amount;
  
  if (!economy.transactions) economy.transactions = [];
  economy.transactions.push({ type: reason, amount, description: `Staff añadió ${amount} Lagcoins`, date: new Date().toISOString() });
  
  await saveUserEconomy(guildId, userId, economy);
  return economy;
}

export async function staffRemoveCoins(guildId, userId, amount, reason = 'staff_remove') {
  const economy = await getUserEconomy(guildId, userId);
  economy.lagcoins = Math.max(0, (economy.lagcoins || 0) - amount);
  
  if (!economy.transactions) economy.transactions = [];
  economy.transactions.push({ type: reason, amount: -amount, description: `Staff removió ${amount} Lagcoins`, date: new Date().toISOString() });
  
  await saveUserEconomy(guildId, userId, economy);
  return economy;
}

export async function staffSetCoins(guildId, userId, amount) {
  const economy = await getUserEconomy(guildId, userId);
  const oldAmount = economy.lagcoins || 0;
  economy.lagcoins = amount;
  
  if (!economy.transactions) economy.transactions = [];
  economy.transactions.push({ type: 'staff_set', amount: amount - oldAmount, description: `Staff estableció balance a ${amount} Lagcoins`, date: new Date().toISOString() });
  
  await saveUserEconomy(guildId, userId, economy);
  return economy;
}

export async function staffGiveItem(guildId, userId, itemId) {
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
}

export async function staffRemoveItem(guildId, userId, itemId) {
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
}

// Banco - Depositar
export async function bankDeposit(guildId, userId, amount) {
  const economy = await getUserEconomy(guildId, userId);
  if (economy.lagcoins < amount) return null;
  
  economy.lagcoins -= amount;
  economy.bankBalance = (economy.bankBalance || 0) + amount;
  
  if (!economy.transactions) economy.transactions = [];
  economy.transactions.push({ type: 'deposit', amount: -amount, description: `Depósito al banco`, date: new Date().toISOString() });
  
  await saveUserEconomy(guildId, userId, economy);
  return economy;
}

// Banco - Retirar
export async function bankWithdraw(guildId, userId, amount) {
  const economy = await getUserEconomy(guildId, userId);
  if ((economy.bankBalance || 0) < amount) return null;
  
  economy.bankBalance -= amount;
  economy.lagcoins = (economy.lagcoins || 0) + amount;
  
  if (!economy.transactions) economy.transactions = [];
  economy.transactions.push({ type: 'withdraw', amount: amount, description: `Retiro del banco`, date: new Date().toISOString() });
  
  await saveUserEconomy(guildId, userId, economy);
  return economy;
}

// Trabajo mejorado
export async function doWork(guildId, userId, jobId = 'basico') {
  const economy = await getUserEconomy(guildId, userId);
  const job = JOBS[jobId];
  
  if (!job) return { error: 'invalid_job' };
  
  if (job.itemsNeeded.length > 0) {
    const hasItems = job.itemsNeeded.every(item => economy.items && economy.items.includes(item));
    if (!hasItems) return { error: 'missing_items', needed: job.itemsNeeded };
  }
  
  const now = Date.now();
  const lastWork = economy.lastWorkTime ? new Date(economy.lastWorkTime).getTime() : 0;
  const cooldown = job.cooldown || 60000;
  
  if (now - lastWork < cooldown) {
    const remaining = Math.ceil((cooldown - (now - lastWork)) / 1000);
    return { error: 'cooldown', remaining };
  }
  
  const earnings = Math.floor(Math.random() * (job.maxEarnings - job.minEarnings + 1)) + job.minEarnings;
  const bonus = Math.random() > 0.9 ? Math.floor(earnings * 0.5) : 0;
  const total = earnings + bonus;
  
  economy.lagcoins = (economy.lagcoins || 0) + total;
  economy.totalEarned = (economy.totalEarned || 0) + total;
  economy.lastWorkTime = new Date().toISOString();
  
  if (!economy.jobStats) economy.jobStats = { totalJobs: 0, favoriteJob: jobId };
  economy.jobStats.totalJobs++;
  economy.jobStats.favoriteJob = jobId;
  
  if (!economy.transactions) economy.transactions = [];
  economy.transactions.push({ type: 'work', amount: total, description: `Trabajo: ${job.name}`, date: new Date().toISOString() });
  
  await saveUserEconomy(guildId, userId, economy);
  return { job, earnings, bonus, total, newBalance: economy.lagcoins };
}

// Robar el banco (muy arriesgado)
export async function robBank(guildId, userId) {
  const economy = await getUserEconomy(guildId, userId);
  
  const now = Date.now();
  const lastRob = economy.lastBankRob ? new Date(economy.lastBankRob).getTime() : 0;
  const cooldown = 3600000; // 1 hora
  
  if (now - lastRob < cooldown) {
    const remaining = Math.ceil((cooldown - (now - lastRob)) / 1000);
    return { error: 'cooldown', remaining };
  }
  
  economy.lastBankRob = new Date().toISOString();
  
  // 15% de éxito
  const success = Math.random() < 0.15;
  
  if (success) {
    const stolen = Math.floor(Math.random() * 2000) + 500;
    economy.lagcoins = (economy.lagcoins || 0) + stolen;
    economy.totalEarned = (economy.totalEarned || 0) + stolen;
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ type: 'bank_heist', amount: stolen, description: 'Robo de banco exitoso', date: new Date().toISOString() });
    
    await saveUserEconomy(guildId, userId, economy);
    return { success: true, stolen, newBalance: economy.lagcoins };
  } else {
    const penalty = Math.floor(Math.random() * 500) + 200;
    economy.lagcoins = Math.max(0, (economy.lagcoins || 0) - penalty);
    
    if (!economy.transactions) economy.transactions = [];
    economy.transactions.push({ type: 'bank_heist_failed', amount: -penalty, description: 'Robo de banco fallido', date: new Date().toISOString() });
    
    await saveUserEconomy(guildId, userId, economy);
    return { success: false, penalty, newBalance: economy.lagcoins };
  }
}
