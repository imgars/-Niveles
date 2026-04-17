import mongoose from 'mongoose';

const mongoURI = process.env.MONGODB_URI;

// Esquema de Usuario (strict: false permite rankcard_custom y otros campos dinámicos)
const userSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  totalXp: { type: Number, default: 0 },
  selectedCardTheme: { type: String, default: null },
  purchasedCards: { type: [String], default: [] },
  rankcard_custom: {
    backgroundColor: String,
    accentColor: String,
    textColor: String,
    barColor: String,
    useNeonPalette: Boolean,
    fontId: String,
    baseImages: [mongoose.Schema.Types.Mixed],
    logos: [mongoose.Schema.Types.Mixed],
    drawLayer: String
  },
  afk: {
    status: { type: Boolean, default: false },
    reason: { type: String, default: null },
    timestamp: { type: Number, default: null }
  }
}, { timestamps: true, strict: false });

const User = mongoose.model('User', userSchema);

// Esquema de Boost
const boostSchema = new mongoose.Schema({
  type: String,
  target: String,
  multiplier: Number,
  expiresAt: Date,
  description: String
}, { timestamps: true });

const Boost = mongoose.model('Boost', boostSchema);

// Esquema de Preguntas
const questionSchema = new mongoose.Schema({
  question: String,
  askerName: String,
  answer: String,
  answered: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  answeredAt: Date
});

const Question = mongoose.model('Question', questionSchema);

// Esquema de Rachas
const streakSchema = new mongoose.Schema({
  guildId: String,
  user1Id: String,
  user2Id: String,
  streakCount: { type: Number, default: 1 },
  lastMessageDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: 'active' } // active, broken
});

const Streak = mongoose.model('Streak', streakSchema);

// Esquema de Misiones Semanales
const missionSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  year: { type: Number, required: true },
  missions: [{
    id: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true },
    target: { type: Number, required: true },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    difficulty: { type: Number, default: 1 },
    reward: {
      xp: { type: Number, default: 0 },
      multiplier: { type: Number, default: 0 },
      levels: { type: Number, default: 0 }
    },
    _id: false
  }],
  completedCount: { type: Number, default: 0 },
  completedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const Mission = mongoose.model('Mission', missionSchema);

// Esquema de Economía - Lagcoins
const economySchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  lagcoins: { type: Number, default: 100 },
  bankBalance: { type: Number, default: 0 },
  lastWorkTime: Date,
  lastRobTime: Date,
  lastDailyReward: String,
  lastRobAttempt: Date,
  lastBankRob: Date,
  dailyStreak: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  casinoStats: {
    plays: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    totalWon: { type: Number, default: 0 },
    totalLost: { type: Number, default: 0 }
  },
  items: [{ type: String }],
  inventory: [{
    itemId: String,
    quantity: { type: Number, default: 1 },
    acquiredAt: { type: Date, default: Date.now }
  }],
  jobStats: {
    totalJobs: { type: Number, default: 0 },
    favoriteJob: String
  },
  marriedTo: { type: String, default: null },
  transactions: [mongoose.Schema.Types.Mixed],
  createdAt: { type: Date, default: Date.now }
});

const Economy = mongoose.model('Economy', economySchema);

const nationalitySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  country: { type: String, required: true },
  currentCountry: String,
  assignedAt: { type: Date, default: Date.now },
  travelHistory: [{
    country: String,
    date: { type: Date, default: Date.now },
    _id: false
  }]
}, { timestamps: true });

nationalitySchema.index({ guildId: 1, userId: 1 }, { unique: true });

const Nationality = mongoose.model('Nationality', nationalitySchema);

const marketplaceListingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  authorId: String,
  authorName: String,
  guildId: String,
  title: String,
  description: String,
  price: Number,
  config: mongoose.Schema.Types.Mixed,
  previewBase64: String,
  sales: { type: Number, default: 0 },
  buyers: [mongoose.Schema.Types.Mixed],
  rating: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  createdAt: { type: Number, default: () => Date.now() }
}, { timestamps: true });

const MarketplaceListing = mongoose.model('MarketplaceListing', marketplaceListingSchema);

const designHistorySchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  historyId: { type: String, required: true },
  config: mongoose.Schema.Types.Mixed,
  savedAt: { type: Number, default: () => Date.now() }
}, { timestamps: true });

designHistorySchema.index({ guildId: 1, userId: 1 });

const DesignHistory = mongoose.model('DesignHistory', designHistorySchema);

const guildSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  systems: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

const GuildSettings = mongoose.model('GuildSettings', guildSettingsSchema);

let isConnected = false;

export async function connectMongoDB() {
  if (!mongoURI) {
    console.warn('⚠️ MONGODB_URI no configurada. Usando JSON local.');
    return false;
  }

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    isConnected = true;
    console.log('✅ MongoDB conectado');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    return false;
  }
}

// Función auxiliar para eliminar campos inmutables recursivamente
function cleanDataForMongo(data) {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => cleanDataForMongo(item));
  }
  
  const clean = { ...data };
  delete clean._id;
  delete clean.__v;
  delete clean.$setOnInsert;
  
  for (const key in clean) {
    if (clean[key] && typeof clean[key] === 'object') {
      // Si es un objeto vacío {}, convertirlo a null para evitar errores de cast en Date
      if (Object.keys(clean[key]).length === 0) {
        clean[key] = null;
      } else {
        clean[key] = cleanDataForMongo(clean[key]);
      }
    }
  }
  
  return clean;
}

export async function saveUserToMongo(guildId, userId, userData) {
  if (!isConnected) return;
  try {
    const updateData = cleanDataForMongo(userData);
    
    await User.updateOne(
      { userId, guildId },
      { $set: updateData },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error guardando usuario en MongoDB:', error.message);
  }
}

export async function getAllUsersFromMongo(guildId = null) {
  if (!isConnected) return [];
  try {
    const query = guildId ? { guildId } : {};
    const users = await User.find(query).lean();
    return users;
  } catch (error) {
    console.error('Error obteniendo usuarios de MongoDB:', error.message);
    return [];
  }
}

export async function saveBoostsToMongo(boosts) {
  if (!isConnected) return;
  try {
    await Boost.deleteMany({});
    if (boosts.global && boosts.global.length > 0) {
      await Boost.insertMany(boosts.global);
    }
  } catch (error) {
    console.error('Error guardando boosts en MongoDB:', error.message);
  }
}

export async function getAllBoostsFromMongo() {
  if (!isConnected) return { global: [], users: {}, channels: {} };
  try {
    const boosts = await Boost.find({}).lean();
    return { global: boosts || [], users: {}, channels: {} };
  } catch (error) {
    console.error('Error obteniendo boosts de MongoDB:', error.message);
    return { global: [], users: {}, channels: {} };
  }
}

export async function saveQuestionToMongo(questionData) {
  if (!isConnected) return null;
  try {
    const newQuestion = new Question(questionData);
    const saved = await newQuestion.save();
    return saved;
  } catch (error) {
    console.error('Error guardando pregunta en MongoDB:', error.message);
    return null;
  }
}

export async function getQuestionsFromMongo() {
  if (!isConnected) return [];
  try {
    const questions = await Question.find({}).sort({ createdAt: -1 }).lean();
    return questions;
  } catch (error) {
    console.error('Error obteniendo preguntas de MongoDB:', error.message);
    return [];
  }
}

export async function answerQuestionInMongo(questionId, answer) {
  if (!isConnected) return null;
  try {
    const updated = await Question.findByIdAndUpdate(
      questionId,
      { answer, answered: true, answeredAt: new Date() },
      { new: true }
    );
    return updated;
  } catch (error) {
    console.error('Error respondiendo pregunta en MongoDB:', error.message);
    return null;
  }
}

export async function saveStreakToMongo(streakData) {
  if (!isConnected) return null;
  try {
    const query = { guildId: streakData.guildId };
    const users = [streakData.user1Id, streakData.user2Id].sort();
    query.user1Id = users[0];
    query.user2Id = users[1];

    const updated = await Streak.findOneAndUpdate(
      query,
      streakData,
      { upsert: true, new: true }
    );
    return updated;
  } catch (error) {
    console.error('Error guardando racha:', error.message);
    return null;
  }
}

export async function getStreakBetween(guildId, user1Id, user2Id) {
  if (!isConnected) return null;
  try {
    const users = [user1Id, user2Id].sort();
    const streak = await Streak.findOne({
      guildId,
      user1Id: users[0],
      user2Id: users[1]
    });
    return streak;
  } catch (error) {
    console.error('Error obteniendo racha:', error.message);
    return null;
  }
}

export async function updateStreakDate(guildId, user1Id, user2Id) {
  if (!isConnected) return null;
  try {
    const users = [user1Id, user2Id].sort();
    const streak = await Streak.findOne({
      guildId,
      user1Id: users[0],
      user2Id: users[1],
      status: 'active'
    });

    if (!streak) return null;

    const lastDate = new Date(streak.lastMessageDate);
    const today = new Date();
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (lastDate.getTime() === today.getTime()) {
      return streak;
    }

    const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      streak.streakCount += 1;
      streak.lastMessageDate = new Date();
      await streak.save();
      return { streak, updated: true, message: `¡Racha extendida! 🔥 Ahora van ${streak.streakCount} días` };
    } else if (daysDiff > 1) {
      streak.status = 'broken';
      await streak.save();
      return { streak, broken: true, message: `¡Se perdió la racha! 😢 Llevaban ${streak.streakCount} días` };
    }

    return streak;
  } catch (error) {
    console.error('Error actualizando fecha de racha:', error.message);
    return null;
  }
}

export async function getUserStreaks(guildId, userId) {
  if (!isConnected) return [];
  try {
    const streaks = await Streak.find({
      guildId,
      $or: [{ user1Id: userId }, { user2Id: userId }],
      status: 'active'
    }).lean();
    return streaks || [];
  } catch (error) {
    console.error('Error obteniendo rachas del usuario:', error.message);
    return [];
  }
}

export async function getAllStreaksFromMongo(guildId = null) {
  if (!isConnected) return [];
  try {
    const query = guildId ? { guildId } : {};
    const streaks = await Streak.find(query).lean();
    return streaks || [];
  } catch (error) {
    console.error('Error obteniendo todas las rachas de MongoDB:', error.message);
    return [];
  }
}

export async function getUserMissions(guildId, userId, weekNumber, year) {
  if (!isConnected) return null;
  try {
    const missions = await Mission.findOne({
      guildId,
      userId,
      weekNumber,
      year
    });
    return missions;
  } catch (error) {
    console.error('Error obteniendo misiones:', error.message);
    return null;
  }
}

export async function createUserMissions(guildId, userId) {
  if (!isConnected) return null;
  try {
    const weekNumber = Math.ceil((new Date().getDate()) / 7);
    const year = new Date().getFullYear();

    const missionTemplates = [
      { id: 1, title: 'Saludador', description: 'Di hola a 5 personas', type: 'greeting', target: 5, difficulty: 1, reward: { xp: 100, multiplier: 0.1, levels: 0 } },
      { id: 2, title: 'Preguntón', description: 'Pregunta cómo están a 3 personas', type: 'question', target: 3, difficulty: 1, reward: { xp: 150, multiplier: 0.15, levels: 0 } },
      { id: 3, title: 'Socializador', description: 'Participa en 10 conversaciones', type: 'participate', target: 10, difficulty: 2, reward: { xp: 250, multiplier: 0.25, levels: 1 } },
      { id: 4, title: 'Ayudante', description: 'Ofrece ayuda a 4 personas', type: 'help', target: 4, difficulty: 2, reward: { xp: 200, multiplier: 0.2, levels: 0 } },
      { id: 5, title: 'Visitante', description: 'Envía mensajes en 6 canales diferentes', type: 'channels', target: 6, difficulty: 1, reward: { xp: 120, multiplier: 0.12, levels: 0 } },
      { id: 6, title: 'Amigable', description: 'Interactúa con 8 usuarios nuevos', type: 'newusers', target: 8, difficulty: 2, reward: { xp: 280, multiplier: 0.28, levels: 1 } },
      { id: 7, title: 'Comunicador', description: 'Envía 50 mensajes en el chat', type: 'messages', target: 50, difficulty: 2, reward: { xp: 200, multiplier: 0.22, levels: 0 } },
      { id: 8, title: 'Entusiasta', description: 'Reacciona a 20 mensajes', type: 'reactions', target: 20, difficulty: 1, reward: { xp: 150, multiplier: 0.15, levels: 0 } },
      { id: 9, title: 'Comentarista', description: 'Responde a 7 preguntas en el chat', type: 'answers', target: 7, difficulty: 3, reward: { xp: 350, multiplier: 0.35, levels: 2 } },
      { id: 10, title: 'Leyenda', description: 'Completa 9 misiones en la semana', type: 'meta', target: 9, difficulty: 3, reward: { xp: 500, multiplier: 0.5, levels: 3 } }
    ];

    const newMissions = new Mission({
      guildId,
      userId,
      weekNumber,
      year,
      missions: missionTemplates
    });

    await newMissions.save();
    return newMissions;
  } catch (error) {
    console.error('Error creando misiones:', error.message);
    return null;
  }
}

export async function updateMissionProgress(guildId, userId, weekNumber, year, missionId, increment = 1) {
  if (!isConnected) return null;
  try {
    const missions = await Mission.findOne({
      guildId,
      userId,
      weekNumber,
      year
    });

    if (!missions) return null;

    const mission = missions.missions.find(m => m.id === missionId);
    if (!mission || mission.completed) return null;

    mission.progress = Math.min(mission.progress + increment, mission.target);
    if (mission.progress >= mission.target) {
      mission.completed = true;
      missions.completedCount += 1;
    }

    await missions.save();
    return { mission, completed: mission.completed, reward: mission.reward, title: mission.title };
  } catch (error) {
    console.error('Error actualizando progreso de misión:', error.message);
    return null;
  }
}

export async function getMissionsStats(guildId, userId, weekNumber, year) {
  if (!isConnected) return null;
  try {
    const missions = await Mission.findOne({
      guildId,
      userId,
      weekNumber,
      year
    }).lean();
    return missions;
  } catch (error) {
    console.error('Error obteniendo estadísticas de misiones:', error.message);
    return null;
  }
}

export async function getEconomy(guildId, userId) {
  if (!isConnected) return null;
  try {
    let economy = await Economy.findOne({ guildId, userId });
    if (!economy) {
      economy = new Economy({ guildId, userId, lagcoins: 100, bankBalance: 0 });
      await economy.save();
    }
    return economy;
  } catch (error) {
    console.error('Error obteniendo economía:', error.message);
    return null;
  }
}

export async function addLagcoins(guildId, userId, amount, reason = 'work') {
  if (!isConnected) return null;
  try {
    const normalizedAmount = Math.floor(Number(amount));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) return null;
    const economy = await Economy.findOneAndUpdate(
      { guildId, userId },
      { 
        $inc: { lagcoins: normalizedAmount, totalEarned: normalizedAmount },
        $push: { 
          transactions: { 
            type: String(reason), 
            amount: Number(normalizedAmount), 
            date: new Date() 
          } 
        }
      },
      { upsert: true, new: true }
    );
    return economy;
  } catch (error) {
    console.error('Error añadiendo lagcoins:', error.message);
    return null;
  }
}

export async function removeLagcoins(guildId, userId, amount, reason = 'spend') {
  if (!isConnected) return null;
  try {
    const normalizedAmount = Math.floor(Number(amount));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return null;
    const economy = await Economy.findOneAndUpdate(
      { guildId, userId, lagcoins: { $gte: normalizedAmount } },
      { 
        $inc: { lagcoins: -normalizedAmount, totalSpent: normalizedAmount },
        $push: { 
          transactions: { 
            type: String(reason), 
            amount: -normalizedAmount, 
            date: new Date() 
          } 
        }
      },
      { new: true }
    );
    return economy;
  } catch (error) {
    console.error('Error removiendo lagcoins:', error.message);
    return null;
  }
}

export async function transferLagcoins(guildId, fromUserId, toUserId, amount) {
  if (!isConnected) return null;
  const normalizedAmount = Math.floor(Number(amount));
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return null;
  if (!guildId || !fromUserId || !toUserId || fromUserId === toUserId) return null;

  const session = await mongoose.startSession();
  try {
    let from;
    let to;

    await session.withTransaction(async () => {
      from = await Economy.findOneAndUpdate(
        { guildId, userId: fromUserId, lagcoins: { $gte: normalizedAmount } },
        {
          $inc: { lagcoins: -normalizedAmount },
          $push: {
            transactions: {
              type: 'transfer',
              amount: -normalizedAmount,
              to: toUserId,
              date: new Date()
            }
          }
        },
        { new: true, session }
      );

      if (!from) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      to = await Economy.findOneAndUpdate(
        { guildId, userId: toUserId },
        {
          $inc: { lagcoins: normalizedAmount },
          $push: {
            transactions: {
              type: 'transfer',
              amount: normalizedAmount,
              from: fromUserId,
              date: new Date()
            }
          }
        },
        { upsert: true, new: true, session }
      );
    });

    if (!from || !to) return null;
    return { from, to };
  } catch (error) {
    if (error?.message === 'INSUFFICIENT_FUNDS') return null;
    if (String(error?.message || '').includes('Transaction numbers are only allowed')) {
      try {
        const from = await Economy.findOneAndUpdate(
          { guildId, userId: fromUserId, lagcoins: { $gte: normalizedAmount } },
          {
            $inc: { lagcoins: -normalizedAmount },
            $push: { transactions: { type: 'transfer', amount: -normalizedAmount, to: toUserId, date: new Date() } }
          },
          { new: true }
        );
        if (!from) return null;

        const to = await Economy.findOneAndUpdate(
          { guildId, userId: toUserId },
          {
            $inc: { lagcoins: normalizedAmount },
            $push: { transactions: { type: 'transfer', amount: normalizedAmount, from: fromUserId, date: new Date() } }
          },
          { upsert: true, new: true }
        );
        return { from, to };
      } catch (fallbackError) {
        console.error('Error transferindo lagcoins (fallback):', fallbackError.message);
        return null;
      }
    }
    console.error('Error transferindo lagcoins:', error.message);
    return null;
  } finally {
    await session.endSession();
  }
}

export function isMongoConnected() {
  return isConnected;
}

// Función para guardar completamente la economía de un usuario
export async function saveEconomyToMongo(guildId, userId, economyData) {
  if (!isConnected) return null;
  try {
    const cleanEconomyData = cleanDataForMongo(economyData);
    
    const updateData = {
      guildId,
      userId,
      lagcoins: cleanEconomyData.lagcoins || 100,
      bankBalance: cleanEconomyData.bankBalance || 0,
      lastWorkTime: cleanEconomyData.lastWorkTime,
      lastRobTime: cleanEconomyData.lastRobTime,
      lastDailyReward: cleanEconomyData.lastDailyReward,
      lastRobAttempt: cleanEconomyData.lastRobAttempt,
      lastBankRob: cleanEconomyData.lastBankRob,
      dailyStreak: cleanEconomyData.dailyStreak || 0,
      totalEarned: cleanEconomyData.totalEarned || 0,
      totalSpent: cleanEconomyData.totalSpent || 0,
      items: cleanEconomyData.items || [],
      inventory: cleanEconomyData.inventory || [],
      marriedTo: cleanEconomyData.marriedTo || null
    };

    if (economyData.casinoStats) {
      updateData.casinoStats = economyData.casinoStats;
    }

    if (economyData.jobStats) {
      updateData.jobStats = economyData.jobStats;
    }
    
    // Si lastWorkTime es un objeto vacío {}, forzar null
    if (updateData.lastWorkTime && typeof updateData.lastWorkTime === 'object' && Object.keys(updateData.lastWorkTime).length === 0) {
      updateData.lastWorkTime = null;
    }

    const economy = await Economy.findOneAndUpdate(
      { guildId, userId },
      { $set: updateData },
      { upsert: true, new: true }
    );
    return economy;
  } catch (error) {
    console.error('Error guardando economía completa:', error.message);
    return null;
  }
}

// Función para añadir un item al inventario
export async function addItemToInventory(guildId, userId, itemId) {
  if (!isConnected) return null;
  try {
    const economy = await Economy.findOneAndUpdate(
      { guildId, userId },
      { 
        $addToSet: { items: itemId },
        $push: { 
          inventory: { itemId, quantity: 1, acquiredAt: new Date() },
          transactions: { type: 'item_purchase', amount: 0, description: `Compró ${itemId}`, date: new Date() }
        }
      },
      { upsert: true, new: true }
    );
    return economy;
  } catch (error) {
    console.error('Error añadiendo item:', error.message);
    return null;
  }
}

// Función para dar item a un usuario (staff)
export async function giveItemToUser(guildId, userId, itemId, quantity = 1) {
  if (!isConnected) return null;
  try {
    const economy = await Economy.findOne({ guildId, userId });
    if (!economy) {
      const newEconomy = new Economy({ guildId, userId, items: [itemId] });
      await newEconomy.save();
      return newEconomy;
    }

    if (!economy.items.includes(itemId)) {
      economy.items.push(itemId);
    }
    economy.inventory.push({ itemId, quantity, acquiredAt: new Date() });
    economy.transactions.push({ type: 'gift', amount: 0, description: `Recibió ${itemId} x${quantity}`, date: new Date() });
    await economy.save();
    return economy;
  } catch (error) {
    console.error('Error dando item:', error.message);
    return null;
  }
}

// Función para actualizar estadísticas del casino
export async function updateCasinoStats(guildId, userId, won, amount) {
  if (!isConnected) return null;
  try {
    const updateData = {
      $inc: {
        'casinoStats.plays': 1
      }
    };

    if (won) {
      updateData.$inc['casinoStats.wins'] = 1;
      updateData.$inc['casinoStats.totalWon'] = amount;
    } else {
      updateData.$inc['casinoStats.totalLost'] = Math.abs(amount);
    }

    const economy = await Economy.findOneAndUpdate(
      { guildId, userId },
      updateData,
      { upsert: true, new: true }
    );
    return economy;
  } catch (error) {
    console.error('Error actualizando stats casino:', error.message);
    return null;
  }
}

// Función para depositar en el banco
export async function depositToBank(guildId, userId, amount) {
  if (!isConnected) return null;
  try {
    const normalizedAmount = Math.floor(Number(amount));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return null;
    const economy = await Economy.findOne({ guildId, userId });
    if (!economy || economy.lagcoins < normalizedAmount) return null;

    economy.lagcoins -= normalizedAmount;
    economy.bankBalance = (economy.bankBalance || 0) + normalizedAmount;
    economy.transactions.push({ type: 'deposit', amount: Number(-normalizedAmount), description: 'Depósito al banco', date: new Date() });
    await economy.save();
    return economy;
  } catch (error) {
    console.error('Error depositando:', error.message);
    return null;
  }
}

// Función para retirar del banco
export async function withdrawFromBank(guildId, userId, amount) {
  if (!isConnected) return null;
  try {
    const normalizedAmount = Math.floor(Number(amount));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return null;
    const economy = await Economy.findOne({ guildId, userId });
    if (!economy || (economy.bankBalance || 0) < normalizedAmount) return null;

    economy.bankBalance -= normalizedAmount;
    economy.lagcoins = (economy.lagcoins || 0) + normalizedAmount;
    economy.transactions.push({ type: 'withdraw', amount: Number(normalizedAmount), description: 'Retiro del banco', date: new Date() });
    await economy.save();
    return economy;
  } catch (error) {
    console.error('Error retirando:', error.message);
    return null;
  }
}

// Función para actualizar estadísticas de trabajo
export async function updateJobStats(guildId, userId, jobName) {
  if (!isConnected) return null;
  try {
    const economy = await Economy.findOneAndUpdate(
      { guildId, userId },
      {
        $inc: { 'jobStats.totalJobs': 1 },
        $set: { 'jobStats.favoriteJob': jobName, lastWorkTime: new Date() }
      },
      { upsert: true, new: true }
    );
    return economy;
  } catch (error) {
    console.error('Error actualizando stats trabajo:', error.message);
    return null;
  }
}

// Nacionalidad functions
export async function getNationalityFromMongo(guildId, userId) {
  if (!isConnected) return null;
  try {
    const nationality = await Nationality.findOne({ guildId, userId }).lean();
    return nationality;
  } catch (error) {
    console.error('Error obteniendo nacionalidad:', error.message);
    return null;
  }
}

export async function saveNationalityToMongo(guildId, userId, nationalityData) {
  if (!isConnected) return null;
  try {
    const nationality = await Nationality.findOneAndUpdate(
      { guildId, userId },
      {
        guildId,
        userId,
        country: nationalityData.country,
        currentCountry: nationalityData.currentCountry || nationalityData.country,
        assignedAt: nationalityData.assignedAt || new Date(),
        travelHistory: nationalityData.travelHistory || []
      },
      { upsert: true, new: true }
    );
    return nationality;
  } catch (error) {
    console.error('Error guardando nacionalidad:', error.message);
    return null;
  }
}

export async function updateNationalityTravelHistory(guildId, userId, newCountry) {
  if (!isConnected) return null;
  try {
    const nationality = await Nationality.findOneAndUpdate(
      { guildId, userId },
      {
        $set: { currentCountry: newCountry },
        $push: { travelHistory: { country: newCountry, date: new Date() } }
      },
      { new: true }
    );
    return nationality;
  } catch (error) {
    console.error('Error actualizando historial de viaje:', error.message);
    return null;
  }
}

export async function getAllNationalitiesFromMongo(guildId = null) {
  if (!isConnected) return [];
  try {
    const query = guildId ? { guildId } : {};
    const nationalities = await Nationality.find(query).lean();
    return nationalities || [];
  } catch (error) {
    console.error('Error obteniendo nacionalidades:', error.message);
    return [];
  }
}

export async function getMarketplaceListingsFromMongo({ page = 1, limit = 20, sortBy = 'newest', guildId = null } = {}) {
  if (!isConnected) return null;
  try {
    const query = { active: true };
    if (guildId) query.guildId = guildId;
    let listings = await MarketplaceListing.find(query).lean();
    if (sortBy === 'newest') listings.sort((a, b) => b.createdAt - a.createdAt);
    else if (sortBy === 'popular') listings.sort((a, b) => b.sales - a.sales);
    else if (sortBy === 'cheapest') listings.sort((a, b) => a.price - b.price);
    else if (sortBy === 'expensive') listings.sort((a, b) => b.price - a.price);
    const total = listings.length;
    const start = (page - 1) * limit;
    return { listings: listings.slice(start, start + limit), total, page, totalPages: Math.ceil(total / limit) };
  } catch (error) {
    console.error('Error obteniendo marketplace de MongoDB:', error.message);
    return null;
  }
}

export async function getMarketplaceListingByIdFromMongo(listingId) {
  if (!isConnected) return null;
  try {
    return await MarketplaceListing.findOne({ id: listingId, active: true }).lean();
  } catch (error) {
    console.error('Error obteniendo listing de MongoDB:', error.message);
    return null;
  }
}

export async function getUserMarketplaceListingsFromMongo(userId, guildId = null) {
  if (!isConnected) return null;
  try {
    const query = { authorId: userId, active: true };
    if (guildId) query.guildId = guildId;
    return await MarketplaceListing.find(query).lean();
  } catch (error) {
    console.error('Error obteniendo listings del usuario de MongoDB:', error.message);
    return null;
  }
}

export async function addMarketplaceListingToMongo(listing) {
  if (!isConnected) return null;
  try {
    const doc = await MarketplaceListing.create(listing);
    return doc.toObject();
  } catch (error) {
    console.error('Error agregando listing a MongoDB:', error.message);
    return null;
  }
}

export async function buyMarketplaceListingOnMongo(listingId) {
  if (!isConnected) return null;
  try {
    const listing = await MarketplaceListing.findOneAndUpdate(
      { id: listingId, active: true },
      { $inc: { sales: 1 } },
      { new: true }
    ).lean();
    return listing;
  } catch (error) {
    console.error('Error comprando listing en MongoDB:', error.message);
    return null;
  }
}

export async function removeMarketplaceListingOnMongo(listingId, userId) {
  if (!isConnected) return false;
  try {
    const result = await MarketplaceListing.updateOne(
      { id: listingId, authorId: userId },
      { $set: { active: false } }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error removiendo listing de MongoDB:', error.message);
    return false;
  }
}

export async function saveDesignHistoryToMongo(guildId, userId, config) {
  if (!isConnected) return;
  try {
    const historyId = `hist_${Date.now()}`;
    await DesignHistory.create({ guildId, userId, historyId, config, savedAt: Date.now() });
    const userHistory = await DesignHistory.find({ guildId, userId }).sort({ savedAt: -1 }).limit(6).lean();
    if (userHistory.length > 5) {
      const toDelete = userHistory.slice(5).map(h => h._id);
      await DesignHistory.deleteMany({ _id: { $in: toDelete } });
    }
  } catch (error) {
    console.error('Error guardando design history en MongoDB:', error.message);
  }
}

export async function getDesignHistoryFromMongo(guildId, userId) {
  if (!isConnected) return null;
  try {
    const history = await DesignHistory.find({ guildId, userId }).sort({ savedAt: -1 }).limit(5).lean();
    return history.map(h => ({ id: h.historyId, config: h.config, savedAt: h.savedAt }));
  } catch (error) {
    console.error('Error obteniendo design history de MongoDB:', error.message);
    return null;
  }
}

export async function restoreDesignFromMongo(guildId, userId, historyId) {
  if (!isConnected) return null;
  try {
    const entry = await DesignHistory.findOne({ guildId, userId, historyId }).lean();
    return entry ? entry.config : null;
  } catch (error) {
    console.error('Error restaurando design de MongoDB:', error.message);
    return null;
  }
}

export async function saveGuildSettings(guildId, systems) {
  if (!isConnected) return;
  try {
    await GuildSettings.findOneAndUpdate(
      { guildId },
      { $set: { systems } },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error guardando configuración del servidor en MongoDB:', error.message);
  }
}

export async function loadAllGuildSettings() {
  if (!isConnected) return {};
  try {
    const all = await GuildSettings.find({}).lean();
    const result = {};
    for (const entry of all) {
      result[entry.guildId] = entry.systems;
    }
    return result;
  } catch (error) {
    console.error('Error cargando configuración de servidores de MongoDB:', error.message);
    return {};
  }
}