import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Definir esquemas
const UserSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  totalXp: { type: Number, default: 0 }
}, { timestamps: true });

const BoostSchema = new mongoose.Schema({
  type: String, // 'global', 'user', 'channel'
  target: String,
  multiplier: Number,
  expiresAt: Date,
  description: String
}, { timestamps: true });

const CooldownSchema = new mongoose.Schema({
  type: String, // 'xp', 'minigames'
  userId: String,
  expiresAt: Date
}, { timestamps: true });

const BanSchema = new mongoose.Schema({
  userId: String,
  channelId: String,
  expiresAt: Date
}, { timestamps: true });

// Crear modelos
const User = mongoose.model('User', UserSchema);
const Boost = mongoose.model('Boost', BoostSchema);
const Cooldown = mongoose.model('Cooldown', CooldownSchema);
const Ban = mongoose.model('Ban', BanSchema);

// Conectar a MongoDB
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not set');
    }
    
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

class Database {
  constructor() {
    // Inicializamos sin datos cargados, se cargan de MongoDB
    this.users = {};
    this.boosts = { global: [], users: {}, channels: {} };
    this.cooldowns = { xp: {}, minigames: {} };
    this.bans = { users: {}, channels: [] };
    
    connectDB();
  }

  async getUser(guildId, userId) {
    const key = `${guildId}-${userId}`;
    
    // Intentar buscar en MongoDB
    let user = await User.findOne({ userId, guildId });
    
    if (!user) {
      // Crear nuevo usuario si no existe
      user = new User({
        userId,
        guildId,
        xp: 0,
        level: 0,
        totalXp: 0
      });
      await user.save();
    }
    
    return {
      userId: user.userId,
      guildId: user.guildId,
      xp: user.xp,
      level: user.level,
      totalXp: user.totalXp
    };
  }

  async saveUser(guildId, userId, data) {
    try {
      await User.findOneAndUpdate(
        { userId, guildId },
        data,
        { upsert: true, new: true }
      );
      
      // Actualizar caché local
      const key = `${guildId}-${userId}`;
      this.users[key] = { ...this.users[key], ...data, userId, guildId };
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  async getAllUsers(guildId) {
    try {
      return await User.find({ guildId });
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async addBoost(type, target, multiplier, duration, description) {
    try {
      const boost = new Boost({
        type,
        target,
        multiplier,
        expiresAt: duration ? new Date(Date.now() + duration) : null,
        description
      });
      await boost.save();
    } catch (error) {
      console.error('Error adding boost:', error);
    }
  }

  async getActiveBoosts(userId = null, channelId = null) {
    try {
      const now = new Date();
      const active = [];
      
      // Boosts globales
      const globalBoosts = await Boost.find({
        type: 'global',
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: now } }
        ]
      });
      active.push(...globalBoosts);
      
      // Boosts por usuario
      if (userId) {
        const userBoosts = await Boost.find({
          type: 'user',
          target: userId,
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: now } }
          ]
        });
        active.push(...userBoosts);
      }
      
      // Boosts por canal
      if (channelId) {
        const channelBoosts = await Boost.find({
          type: 'channel',
          target: channelId,
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: now } }
          ]
        });
        active.push(...channelBoosts);
      }
      
      // Limpiar boosts expirados
      await Boost.deleteMany({ expiresAt: { $lt: now } });
      
      return active;
    } catch (error) {
      console.error('Error getting active boosts:', error);
      return [];
    }
  }

  async removeGlobalBoost() {
    try {
      await Boost.deleteMany({ type: 'global' });
    } catch (error) {
      console.error('Error removing global boost:', error);
    }
  }

  async setCooldown(type, userId, duration) {
    try {
      await Cooldown.findOneAndUpdate(
        { type, userId },
        { expiresAt: new Date(Date.now() + duration) },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error setting cooldown:', error);
    }
  }

  async checkCooldown(type, userId) {
    try {
      const cooldown = await Cooldown.findOne({ type, userId });
      
      if (!cooldown) return false;
      
      const remaining = cooldown.expiresAt - Date.now();
      
      if (remaining > 0) {
        return remaining;
      } else {
        await Cooldown.deleteOne({ _id: cooldown._id });
        return false;
      }
    } catch (error) {
      console.error('Error checking cooldown:', error);
      return false;
    }
  }

  async banUser(userId, duration) {
    try {
      await Ban.findOneAndUpdate(
        { userId },
        { expiresAt: duration ? new Date(Date.now() + duration) : null },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error banning user:', error);
    }
  }

  async unbanUser(userId) {
    try {
      await Ban.deleteOne({ userId });
    } catch (error) {
      console.error('Error unbanning user:', error);
    }
  }

  async isUserBanned(userId) {
    try {
      const ban = await Ban.findOne({ userId });
      
      if (!ban) return false;
      if (!ban.expiresAt) return true;
      
      if (ban.expiresAt > new Date()) {
        return true;
      } else {
        await Ban.deleteOne({ _id: ban._id });
        return false;
      }
    } catch (error) {
      console.error('Error checking user ban:', error);
      return false;
    }
  }

  async banChannel(channelId) {
    try {
      const exists = await Ban.findOne({ channelId });
      if (!exists) {
        const ban = new Ban({ channelId });
        await ban.save();
      }
    } catch (error) {
      console.error('Error banning channel:', error);
    }
  }

  async unbanChannel(channelId) {
    try {
      await Ban.deleteOne({ channelId });
    } catch (error) {
      console.error('Error unbanning channel:', error);
    }
  }

  async isChannelBanned(channelId) {
    try {
      const ban = await Ban.findOne({ channelId });
      return !!ban;
    } catch (error) {
      console.error('Error checking channel ban:', error);
      return false;
    }
  }

  async resetAllUsers(guildId) {
    try {
      await User.updateMany(
        { guildId },
        { xp: 0, level: 0, totalXp: 0 }
      );
    } catch (error) {
      console.error('Error resetting users:', error);
    }
  }
}

export default new Database();
