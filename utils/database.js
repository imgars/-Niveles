import fs from 'fs';
import path from 'path';

const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BOOSTS_FILE = path.join(DATA_DIR, 'boosts.json');
const COOLDOWNS_FILE = path.join(DATA_DIR, 'cooldowns.json');
const BANS_FILE = path.join(DATA_DIR, 'bans.json');
const SYSTEMS_FILE = path.join(DATA_DIR, 'systems.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');
const SYSTEMS_ADVANCED_FILE = path.join(DATA_DIR, 'systems_advanced.json');
const STAFF_COMMANDS_FILE = path.join(DATA_DIR, 'staff_commands.json');
const LOGIN_HISTORY_FILE = path.join(DATA_DIR, 'login_history.json');
const MARKETPLACE_FILE = path.join(DATA_DIR, 'rankcard_marketplace.json');
const DESIGN_HISTORY_FILE = path.join(DATA_DIR, 'design_history.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class Database {
  constructor() {
    this.users = this.loadFile(USERS_FILE, {});
    this.boosts = this.loadFile(BOOSTS_FILE, { global: [], users: {}, channels: {} });
    this.cooldowns = this.loadFile(COOLDOWNS_FILE, { xp: {}, minigames: {} });
    this.bans = this.loadFile(BANS_FILE, { users: {}, channels: [] });
    this.systems = this.loadFile(SYSTEMS_FILE, {});
    this.audit = this.loadFile(AUDIT_FILE, []);
    this.alerts = this.loadFile(ALERTS_FILE, []);
    this.systemsAdvanced = this.loadFile(SYSTEMS_ADVANCED_FILE, {});
    this.staffCommands = this.loadFile(STAFF_COMMANDS_FILE, {});
    this.loginHistory = this.loadFile(LOGIN_HISTORY_FILE, []);
    this.marketplace = this.loadFile(MARKETPLACE_FILE, []);
    this.designHistory = this.loadFile(DESIGN_HISTORY_FILE, {});
    this.settings = { maintenanceMode: false };
    this.mongoSync = null;
    this._commandStats = {};
  }

  saveSettings() {
    this.saveFile(path.join(DATA_DIR, 'settings.json'), this.settings);
  }

  setMongoSync(mongoSync) {
    this.mongoSync = mongoSync;
  }

  setGuildSettingsSync(saveGuildSettings) {
    this._saveGuildSettings = saveGuildSettings;
  }

  loadFile(filePath, defaultData) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        let parsed = JSON.parse(data);
        
        if (filePath === USERS_FILE) {
          Object.keys(parsed).forEach(key => {
            const user = parsed[key];
            delete user.$setOnInsert;
            delete user.__v;
            if (user.totalXp === null || user.totalXp === undefined) user.totalXp = 0;
            if (user.level === null || user.level === undefined || user.level < 0) user.level = 0;
            if (user.xp === null || user.xp === undefined) user.xp = 0;
          });
        }
        
        return parsed;
      }
    } catch (error) {
      console.error(`Error loading ${filePath}:`, error);
    }
    return defaultData;
  }

  saveFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving ${filePath}:`, error);
    }
  }

  getUser(guildId, userId, memberInfo = null) {
    const key = `${guildId}-${userId}`;
    if (!this.users[key]) {
      this.users[key] = {
        userId,
        guildId,
        xp: 0,
        level: 0,
        totalXp: 0,
        selectedCardTheme: null,
        purchasedCards: [],
        rankcard_custom: null,
        afk: { status: false, reason: null, timestamp: null },
        lastActivity: Date.now(),
        inactivityMessages: 0,
        isInactive: false,
        username: null,
        displayName: null,
        avatar: null
      };
    }
    
    if (memberInfo) {
      const user = this.users[key];
      user.username = memberInfo.username || user.username;
      user.displayName = memberInfo.displayName || user.displayName;
      user.avatar = memberInfo.avatar || user.avatar;
    }
    
    const user = this.users[key];
    let needsPersist = false;

    if (user.lastActivity === undefined) {
      user.lastActivity = Date.now();
      needsPersist = true;
    }
    if (user.inactivityMessages === undefined) {
      user.inactivityMessages = 0;
      needsPersist = true;
    }
    if (user.isInactive === undefined) {
      user.isInactive = false;
      needsPersist = true;
    }
    
    if (user.totalXp === null || user.totalXp === undefined || isNaN(user.totalXp)) {
      user.totalXp = 0;
      needsPersist = true;
    }
    if (user.level === null || user.level === undefined || isNaN(user.level) || user.level < 0) {
      user.level = 0;
      needsPersist = true;
    }
    if (user.xp === null || user.xp === undefined || isNaN(user.xp)) {
      user.xp = 0;
      needsPersist = true;
    }
    
    if (needsPersist) {
      this.saveFile(USERS_FILE, this.users);
      if (this.mongoSync) {
        setImmediate(() => {
          this.mongoSync.saveUserToMongo(guildId, userId, user).catch(err => 
            console.error('Error persisting corrected user to MongoDB:', err.message)
          );
        });
      }
    }
    
    return user;
  }

  saveUser(guildId, userId, data) {
    const key = `${guildId}-${userId}`;
    this.users[key] = { ...this.users[key], ...data };
    this.saveFile(USERS_FILE, this.users);
    
    if (this.mongoSync) {
      setImmediate(() => {
        this.mongoSync.saveUserToMongo(guildId, userId, this.users[key]).catch(err => 
          console.error('Error guardando a MongoDB:', err.message)
        );
      });
    }
  }

  getAllUsers(guildId) {
    return Object.values(this.users).filter(u => u.guildId === guildId);
  }

  addBoost(type, target, multiplier, duration, description) {
    const boost = {
      id: `boost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      target,
      multiplier,
      expiresAt: duration ? Date.now() + duration : null,
      description,
      createdAt: Date.now()
    };

    if (type === 'global') {
      this.boosts.global.push(boost);
    } else if (type === 'user') {
      if (!this.boosts.users[target]) this.boosts.users[target] = [];
      this.boosts.users[target].push(boost);
    } else if (type === 'channel') {
      if (!this.boosts.channels[target]) this.boosts.channels[target] = [];
      this.boosts.channels[target].push(boost);
    }

    this.saveFile(BOOSTS_FILE, this.boosts);
    
    if (this.mongoSync) {
      setImmediate(() => {
        this.mongoSync.saveBoostsToMongo(this.boosts).catch(err => 
          console.error('Error guardando boosts en MongoDB:', err.message)
        );
      });
    }

    return boost;
  }

  removeBoostById(boostId) {
    let removed = false;

    const globalIdx = this.boosts.global.findIndex(b => b.id === boostId);
    if (globalIdx > -1) {
      this.boosts.global.splice(globalIdx, 1);
      removed = true;
    }

    if (!removed) {
      for (const userId of Object.keys(this.boosts.users)) {
        const idx = this.boosts.users[userId].findIndex(b => b.id === boostId);
        if (idx > -1) {
          this.boosts.users[userId].splice(idx, 1);
          removed = true;
          break;
        }
      }
    }

    if (!removed) {
      for (const channelId of Object.keys(this.boosts.channels)) {
        const idx = this.boosts.channels[channelId].findIndex(b => b.id === boostId);
        if (idx > -1) {
          this.boosts.channels[channelId].splice(idx, 1);
          removed = true;
          break;
        }
      }
    }

    if (removed) {
      this.saveFile(BOOSTS_FILE, this.boosts);
      if (this.mongoSync) {
        setImmediate(() => {
          this.mongoSync.saveBoostsToMongo(this.boosts).catch(err => 
            console.error('Error guardando boosts en MongoDB:', err.message)
          );
        });
      }
    }

    return removed;
  }

  getActiveBoosts(userId = null, channelId = null) {
    const now = Date.now();
    const active = [];
    let boostsChanged = false;

    const oldGlobalLength = this.boosts.global.length;
    this.boosts.global = this.boosts.global.filter(b => !b.expiresAt || b.expiresAt > now);
    if (this.boosts.global.length !== oldGlobalLength) boostsChanged = true;
    active.push(...this.boosts.global);

    if (userId && this.boosts.users[userId]) {
      const oldUserLength = this.boosts.users[userId].length;
      this.boosts.users[userId] = this.boosts.users[userId].filter(b => !b.expiresAt || b.expiresAt > now);
      if (this.boosts.users[userId].length !== oldUserLength) boostsChanged = true;
      active.push(...this.boosts.users[userId]);
    }

    if (channelId && this.boosts.channels[channelId]) {
      const oldChannelLength = this.boosts.channels[channelId].length;
      this.boosts.channels[channelId] = this.boosts.channels[channelId].filter(b => !b.expiresAt || b.expiresAt > now);
      if (this.boosts.channels[channelId].length !== oldChannelLength) boostsChanged = true;
      active.push(...this.boosts.channels[channelId]);
    }

    if (boostsChanged) {
      this.saveFile(BOOSTS_FILE, this.boosts);
      if (this.mongoSync) {
        setImmediate(() => {
          this.mongoSync.saveBoostsToMongo(this.boosts).catch(err => 
            console.error('Error guardando boosts en MongoDB:', err.message)
          );
        });
      }
    }

    return active;
  }

  getAllBoostsRaw() {
    const now = Date.now();
    const all = [];

    for (const b of this.boosts.global) {
      if (!b.expiresAt || b.expiresAt > now) {
        all.push({ ...b, category: 'global' });
      }
    }

    for (const [userId, boosts] of Object.entries(this.boosts.users || {})) {
      for (const b of boosts) {
        if (!b.expiresAt || b.expiresAt > now) {
          all.push({ ...b, category: 'user', target: userId });
        }
      }
    }

    for (const [channelId, boosts] of Object.entries(this.boosts.channels || {})) {
      for (const b of boosts) {
        if (!b.expiresAt || b.expiresAt > now) {
          all.push({ ...b, category: 'channel', target: channelId });
        }
      }
    }

    return all;
  }

  removeGlobalBoost() {
    this.boosts.global = [];
    this.saveFile(BOOSTS_FILE, this.boosts);
    
    if (this.mongoSync) {
      setImmediate(() => {
        this.mongoSync.saveBoostsToMongo(this.boosts).catch(err => 
          console.error('Error guardando boosts en MongoDB:', err.message)
        );
      });
    }
  }

  setCooldown(type, userId, duration) {
    if (!this.cooldowns[type]) this.cooldowns[type] = {};
    this.cooldowns[type][userId] = Date.now() + duration;
    this.saveFile(COOLDOWNS_FILE, this.cooldowns);
  }

  checkCooldown(type, userId) {
    if (!this.cooldowns[type] || !this.cooldowns[type][userId]) return false;
    const remaining = this.cooldowns[type][userId] - Date.now();
    return remaining > 0 ? remaining : false;
  }

  resetUserCooldowns(userId) {
    let changed = false;
    for (const type of Object.keys(this.cooldowns)) {
      if (this.cooldowns[type][userId]) {
        delete this.cooldowns[type][userId];
        changed = true;
      }
    }
    if (changed) this.saveFile(COOLDOWNS_FILE, this.cooldowns);
    return changed;
  }

  getUserCooldowns(userId) {
    const result = {};
    const now = Date.now();
    for (const type of Object.keys(this.cooldowns)) {
      if (this.cooldowns[type][userId]) {
        const remaining = this.cooldowns[type][userId] - now;
        if (remaining > 0) {
          result[type] = { expiresAt: this.cooldowns[type][userId], remaining };
        }
      }
    }
    return result;
  }

  banUser(userId, duration) {
    this.bans.users[userId] = duration ? Date.now() + duration : null;
    this.saveFile(BANS_FILE, this.bans);
  }

  unbanUser(userId) {
    delete this.bans.users[userId];
    this.saveFile(BANS_FILE, this.bans);
  }

  isUserBanned(userId) {
    if (!this.bans.users.hasOwnProperty(userId)) return false;
    if (this.bans.users[userId] === null) return true;
    if (this.bans.users[userId] > Date.now()) return true;
    delete this.bans.users[userId];
    this.saveFile(BANS_FILE, this.bans);
    return false;
  }

  getUserBanInfo(userId) {
    if (!this.bans.users.hasOwnProperty(userId)) return null;
    return {
      banned: this.isUserBanned(userId),
      expiresAt: this.bans.users[userId] || null,
      permanent: this.bans.users[userId] === null
    };
  }

  banChannel(channelId) {
    if (!this.bans.channels.includes(channelId)) {
      this.bans.channels.push(channelId);
      this.saveFile(BANS_FILE, this.bans);
    }
  }

  unbanChannel(channelId) {
    this.bans.channels = this.bans.channels.filter(c => c !== channelId);
    this.saveFile(BANS_FILE, this.bans);
  }

  isChannelBanned(channelId) {
    return this.bans.channels.includes(channelId);
  }

  resetAllUsers(guildId) {
    Object.keys(this.users).forEach(key => {
      if (this.users[key].guildId === guildId) {
        this.users[key].xp = 0;
        this.users[key].level = 0;
        this.users[key].totalXp = 0;
      }
    });
    this.saveFile(USERS_FILE, this.users);
  }

  getSystemStatus(guildId) {
    if (!this.systems[guildId]) {
      this.systems[guildId] = {
        economy: true,
        casino: true,
        jobs: true,
        minigames: true,
        insurance: true,
        robbery: true,
        missions: true,
        powerups: true,
        niveles: true,
        rankcard: true,
        rankcard_minecraft: true,
        rankcard_roblox: true,
        rankcard_brawlstars: true
      };
    }
    return this.systems[guildId];
  }

  setSystemStatus(guildId, system, enabled) {
    if (!this.systems[guildId]) {
      this.systems[guildId] = {
        economy: true,
        casino: true,
        jobs: true,
        minigames: true,
        insurance: true,
        robbery: true,
        missions: true,
        powerups: true,
        niveles: true,
        rankcard: true,
        rankcard_minecraft: true,
        rankcard_roblox: true,
        rankcard_brawlstars: true
      };
    }
    this.systems[guildId][system] = enabled;
    this.saveFile(SYSTEMS_FILE, this.systems);
    if (this._saveGuildSettings) {
      setImmediate(() => {
        this._saveGuildSettings(guildId, this.systems[guildId]).catch(err =>
          console.error('Error guardando sistemas en MongoDB:', err.message)
        );
      });
    }
  }

  isSystemEnabled(guildId, system) {
    const status = this.getSystemStatus(guildId);
    return status[system] !== false;
  }

  getSystemsAdvanced(guildId) {
    const SYSTEM_META = {
      economy: {
        name: 'Economía',
        icon: '💰',
        description: 'Coins, banco, trabajo diario y recompensas',
        commands: ['balance', 'bank', 'daily', 'depositar', 'retirar', 'gift', 'trade', 'tax', 'economy', 'staffeconomy']
      },
      casino: {
        name: 'Casino',
        icon: '🎰',
        description: 'Juegos de azar: blackjack, slots, ruleta, dados',
        commands: ['blackjack', 'slots', 'coinflip', 'dice', 'bankheist', 'casinoextendido', 'casinomulti']
      },
      jobs: {
        name: 'Trabajos',
        icon: '💼',
        description: 'Sistema de trabajo y generación de ingresos',
        commands: ['trabajar', 'work', 'bored']
      },
      minigames: {
        name: 'Minijuegos',
        icon: '🎮',
        description: 'Juegos interactivos y de habilidad',
        commands: ['minigame', 'gamecard', 'tradecard', '8ball']
      },
      insurance: {
        name: 'Seguros',
        icon: '🛡️',
        description: 'Sistema de seguros para proteger monedas',
        commands: ['seguro']
      },
      robbery: {
        name: 'Robos',
        icon: '🔫',
        description: 'Sistema de robo entre usuarios',
        commands: ['robar', 'rob']
      },
      missions: {
        name: 'Misiones',
        icon: '🎯',
        description: 'Misiones semanales con recompensas',
        commands: ['mision']
      },
      powerups: {
        name: 'Power-ups',
        icon: '⚡',
        description: 'Multiplicadores de XP y boosts',
        commands: ['powerups', 'boost', 'globalboost', 'removeglobalboost']
      },
      niveles: {
        name: 'Niveles (XP)',
        icon: '⭐',
        description: 'Sistema de XP, niveles y tarjetas de rango',
        commands: ['level', 'rank', 'nivel', 'lb', 'leaderboard']
      },
      rankcard: {
        name: 'Rankcards (todas)',
        icon: '🃏',
        description: 'Generación de tarjetas de nivel personalizadas',
        commands: ['rankcard']
      },
      rankcard_minecraft: {
        name: 'Rankcard Minecraft',
        icon: '⛏️',
        description: 'Tema Minecraft para tarjetas de nivel',
        commands: []
      },
      rankcard_roblox: {
        name: 'Rankcard Roblox',
        icon: '🎲',
        description: 'Tema Roblox para tarjetas de nivel',
        commands: []
      },
      rankcard_brawlstars: {
        name: 'Rankcard Brawl Stars',
        icon: '🥊',
        description: 'Tema Brawl Stars para tarjetas de nivel',
        commands: []
      }
    };

    const basicStatus = this.getSystemStatus(guildId);
    if (!this.systemsAdvanced[guildId]) this.systemsAdvanced[guildId] = {};

    const result = {};
    for (const [key, meta] of Object.entries(SYSTEM_META)) {
      const advanced = this.systemsAdvanced[guildId][key] || {};
      result[key] = {
        ...meta,
        enabled: basicStatus[key] !== false,
        reason: advanced.reason || null,
        disabledAt: advanced.disabledAt || null,
        disabledBy: advanced.disabledBy || null,
        scheduledReactivation: advanced.scheduledReactivation || null,
        channelOverrides: advanced.channelOverrides || {}
      };
    }

    return result;
  }

  setSystemAdvanced(guildId, system, options) {
    if (!this.systemsAdvanced[guildId]) this.systemsAdvanced[guildId] = {};
    if (!this.systemsAdvanced[guildId][system]) this.systemsAdvanced[guildId][system] = {};

    const adv = this.systemsAdvanced[guildId][system];

    if (options.enabled !== undefined) {
      this.setSystemStatus(guildId, system, options.enabled);
      if (!options.enabled) {
        adv.disabledAt = Date.now();
        adv.disabledBy = options.adminName || 'Admin';
      } else {
        adv.disabledAt = null;
        adv.disabledBy = null;
        adv.reason = null;
        adv.scheduledReactivation = null;
      }
    }

    if (options.reason !== undefined) adv.reason = options.reason;
    if (options.scheduledReactivation !== undefined) adv.scheduledReactivation = options.scheduledReactivation;

    if (options.channelOverride) {
      if (!adv.channelOverrides) adv.channelOverrides = {};
      adv.channelOverrides[options.channelOverride.channelId] = options.channelOverride.enabled;
    }

    if (options.removeChannelOverride) {
      if (adv.channelOverrides) {
        delete adv.channelOverrides[options.removeChannelOverride];
      }
    }

    this.saveFile(SYSTEMS_ADVANCED_FILE, this.systemsAdvanced);
  }

  checkScheduledReactivations(guildId) {
    if (!this.systemsAdvanced[guildId]) return;
    const now = Date.now();
    let changed = false;

    for (const [system, adv] of Object.entries(this.systemsAdvanced[guildId])) {
      if (adv.scheduledReactivation && adv.scheduledReactivation <= now) {
        this.setSystemStatus(guildId, system, true);
        adv.scheduledReactivation = null;
        adv.disabledAt = null;
        adv.disabledBy = null;
        adv.reason = null;
        changed = true;
      }
    }

    if (changed) this.saveFile(SYSTEMS_ADVANCED_FILE, this.systemsAdvanced);
  }

  getStaffCommands() {
    const STAFF_COMMANDS_META = {
      level: { name: '/level', category: 'niveles', description: 'Ver tarjeta de nivel', usage: '/level [usuario]' },
      rank: { name: '/rank', category: 'niveles', description: 'Ver tarjeta de rango', usage: '/rank [usuario]' },
      nivel: { name: '/nivel', category: 'niveles', description: 'Ver nivel de un usuario', usage: '/nivel [usuario]' },
      lb: { name: '/lb', category: 'niveles', description: 'Leaderboard de XP', usage: '/lb' },
      leaderboard: { name: '/leaderboard', category: 'niveles', description: 'Leaderboard completo', usage: '/leaderboard' },
      addlevel: { name: '/addlevel', category: 'staff-niveles', description: 'Anadir niveles a un usuario', usage: '/addlevel <usuario> <cantidad>' },
      removelevel: { name: '/removelevel', category: 'staff-niveles', description: 'Quitar niveles a un usuario', usage: '/removelevel <usuario> <cantidad>' },
      setlevel: { name: '/setlevel', category: 'staff-niveles', description: 'Establecer nivel exacto', usage: '/setlevel <usuario> <nivel>' },
      xp: { name: '/xp', category: 'staff-niveles', description: 'Gestionar XP de usuarios', usage: '/xp add/remove/reset' },
      boost: { name: '/boost', category: 'staff-niveles', description: 'Anadir boost a usuario/canal', usage: '/boost add/list/status' },
      globalboost: { name: '/globalboost', category: 'staff-niveles', description: 'Activar boost global', usage: '/globalboost' },
      removeglobalboost: { name: '/removeglobalboost', category: 'staff-niveles', description: 'Quitar boost global', usage: '/removeglobalboost' },
      banxp: { name: '/banxp', category: 'staff-niveles', description: 'Banear de ganar XP', usage: '/banxp user/channel' },
      unbanxp: { name: '/unbanxp', category: 'staff-niveles', description: 'Desbanear de XP', usage: '/unbanxp user/channel' },
      resettemporada: { name: '/resettemporada', category: 'staff-niveles', description: 'Resetear toda la XP del servidor', usage: '/resettemporada' },
      clearlevelroles: { name: '/clearlevelroles', category: 'staff-niveles', description: 'Quitar todos los roles de nivel', usage: '/clearlevelroles' },
      powerups: { name: '/powerups', category: 'niveles', description: 'Ver y comprar power-ups', usage: '/powerups activos/tienda/comprar' },
      rankcard: { name: '/rankcard', category: 'niveles', description: 'Gestionar tarjeta de rango', usage: '/rankcard select/link' },
      rewards: { name: '/rewards', category: 'niveles', description: 'Ver recompensas por nivel', usage: '/rewards' },
      estadisticas: { name: '/estadisticas', category: 'niveles', description: 'Ver estadisticas del servidor', usage: '/estadisticas' },
      cooldowns: { name: '/cooldowns', category: 'niveles', description: 'Ver tiempos de espera', usage: '/cooldowns' },
      racha: { name: '/racha', category: 'niveles', description: 'Ver racha de actividad', usage: '/racha' },
      balance: { name: '/balance', category: 'economia', description: 'Ver saldo de Lagcoins', usage: '/balance [usuario]' },
      bank: { name: '/bank', category: 'economia', description: 'Operaciones bancarias', usage: '/bank depositar/retirar/ver/expandir' },
      daily: { name: '/daily', category: 'economia', description: 'Recompensa diaria', usage: '/daily' },
      depositar: { name: '/depositar', category: 'economia', description: 'Depositar Lagcoins al banco', usage: '/depositar <cantidad>' },
      retirar: { name: '/retirar', category: 'economia', description: 'Retirar Lagcoins del banco', usage: '/retirar <cantidad>' },
      work: { name: '/work', category: 'economia', description: 'Trabajar para ganar Lagcoins', usage: '/work' },
      trabajar: { name: '/trabajar', category: 'economia', description: 'Trabajar (alias)', usage: '/trabajar' },
      bored: { name: '/bored', category: 'economia', description: 'Actividad cuando estas aburrido', usage: '/bored' },
      shop: { name: '/shop', category: 'economia', description: 'Ver y comprar en la tienda', usage: '/shop [item]' },
      tienda: { name: '/tienda', category: 'economia', description: 'Ver tienda (alias)', usage: '/tienda' },
      inventario: { name: '/inventario', category: 'economia', description: 'Ver inventario', usage: '/inventario [usuario]' },
      gift: { name: '/gift', category: 'economia', description: 'Regalar items, coins o XP', usage: '/gift item/lagcoins/xp' },
      trade: { name: '/trade', category: 'economia', description: 'Intercambiar con otro usuario', usage: '/trade' },
      economy: { name: '/economy', category: 'economia', description: 'Ver resumen economico', usage: '/economy' },
      lbeconomia: { name: '/lbeconomia', category: 'economia', description: 'Leaderboard de economia', usage: '/lbeconomia' },
      impuestos: { name: '/impuestos', category: 'economia', description: 'Ver impuestos', usage: '/impuestos' },
      seguro: { name: '/seguro', category: 'economia', description: 'Gestionar seguros', usage: '/seguro activar/desactivar/estado' },
      rob: { name: '/rob', category: 'economia', description: 'Robar a otro usuario', usage: '/rob <usuario>' },
      robar: { name: '/robar', category: 'economia', description: 'Robar a otro usuario (alias)', usage: '/robar <victima>' },
      robar_banco: { name: '/robar_banco', category: 'economia', description: 'Asaltar el banco', usage: '/robar_banco' },
      subasta: { name: '/subasta', category: 'economia', description: 'Sistema de subastas', usage: '/subasta' },
      nacionalidad: { name: '/nacionalidad', category: 'economia', description: 'Gestionar nacionalidad', usage: '/nacionalidad obtener/ver/viajar/paises' },
      addcoins: { name: '/addcoins', category: 'staff-economia', description: 'Anadir Lagcoins a un usuario', usage: '/addcoins <usuario> <cantidad>' },
      removecoins: { name: '/removecoins', category: 'staff-economia', description: 'Quitar Lagcoins a un usuario', usage: '/removecoins <usuario> <cantidad>' },
      setcoins: { name: '/setcoins', category: 'staff-economia', description: 'Establecer Lagcoins exactos', usage: '/setcoins <usuario> <cantidad>' },
      addbankcoins: { name: '/addbankcoins', category: 'staff-economia', description: 'Anadir coins al banco', usage: '/addbankcoins <usuario> <cantidad>' },
      removebankcoins: { name: '/removebankcoins', category: 'staff-economia', description: 'Quitar coins del banco', usage: '/removebankcoins <usuario> <cantidad>' },
      giveitem: { name: '/giveitem', category: 'staff-economia', description: 'Dar un item a un usuario', usage: '/giveitem <usuario> <item>' },
      removeitem: { name: '/removeitem', category: 'staff-economia', description: 'Quitar un item a un usuario', usage: '/removeitem <usuario> <item>' },
      staffeconomy: { name: '/staffeconomy', category: 'staff-economia', description: 'Herramientas de staff para economia', usage: '/staffeconomy daritem/quitaritem/darpowerup/...' },
      resettempeconomy: { name: '/resettempeconomy', category: 'staff-economia', description: 'Resetear economia temporal', usage: '/resettempeconomy' },
      blackjack: { name: '/blackjack', category: 'casino', description: 'Jugar blackjack', usage: '/blackjack <apuesta>' },
      slots: { name: '/slots', category: 'casino', description: 'Jugar tragamonedas', usage: '/slots <apuesta>' },
      coinflip: { name: '/coinflip', category: 'casino', description: 'Lanzar moneda', usage: '/coinflip' },
      dice: { name: '/dice', category: 'casino', description: 'Lanzar dados', usage: '/dice' },
      casino_juegos: { name: '/casino_juegos', category: 'casino', description: 'Juegos de casino extendidos', usage: '/casino_juegos' },
      casinomulti: { name: '/casinomulti', category: 'casino', description: 'Casino multijugador', usage: '/casinomulti carreras/duelo/poker/ruleta' },
      minigame: { name: '/minigame', category: 'minijuegos', description: 'Minijuegos interactivos', usage: '/minigame trivia/rps/roulette' },
      '8ball': { name: '/8ball', category: 'minijuegos', description: 'Bola magica 8', usage: '/8ball <pregunta>' },
      gamecard: { name: '/gamecard', category: 'minijuegos', description: 'Game cards coleccionables', usage: '/gamecard profile/generate' },
      tradecard: { name: '/tradecard', category: 'minijuegos', description: 'Intercambiar game cards', usage: '/tradecard' },
      giftcard: { name: '/giftcard', category: 'minijuegos', description: 'Regalar game cards', usage: '/giftcard <usuario> <tarjeta>' },
      mision: { name: '/mision', category: 'minijuegos', description: 'Ver y completar misiones', usage: '/mision' },
      help: { name: '/help', category: 'utilidad', description: 'Ver todos los comandos', usage: '/help [categoria]' },
      info: { name: '/info', category: 'utilidad', description: 'Informacion del bot', usage: '/info' },
      perfil: { name: '/perfil', category: 'utilidad', description: 'Ver perfil de usuario', usage: '/perfil [usuario]' },
      afk: { name: '/afk', category: 'utilidad', description: 'Establecer estado AFK', usage: '/afk' },
      jumbo: { name: '/jumbo', category: 'utilidad', description: 'Ampliar un emoji', usage: '/jumbo' },
      marry: { name: '/marry', category: 'social', description: 'Casarse con alguien', usage: '/marry' },
      divorce: { name: '/divorce', category: 'social', description: 'Divorciarse', usage: '/divorce' },
      react: { name: '/react', category: 'social', description: 'Reacciones anime', usage: '/react hug/kiss/pat/ship/kill' },
      pingrole: { name: '/pingrole', category: 'social', description: 'Mencionar un rol', usage: '/pingrole <rol> <mensaje>' },
      embed: { name: '/embed', category: 'staff-sistemas', description: 'Crear embed personalizado', usage: '/embed' },
      mensaje: { name: '/mensaje', category: 'staff-sistemas', description: 'Enviar mensaje plano', usage: '/mensaje <texto>' },
      sistema: { name: '/sistema', category: 'staff-sistemas', description: 'Activar/desactivar sistemas', usage: '/sistema toggle|status' },
      admin: { name: '/admin', category: 'staff-sistemas', description: 'Panel de abuso administrativo', usage: '/admin' },
      inactividad: { name: '/inactividad', category: 'staff-sistemas', description: 'Gestionar inactividad', usage: '/inactividad set/remove' },
      mantenimientopagina: { name: '/mantenimientopagina', category: 'staff-sistemas', description: 'Modo mantenimiento web', usage: '/mantenimientopagina' },
      eliminarrankcards: { name: '/eliminarrankcards', category: 'staff-sistemas', description: 'Eliminar rankcards de usuario', usage: '/eliminarrankcards' }
    };

    const result = {};
    for (const [key, meta] of Object.entries(STAFF_COMMANDS_META)) {
      const saved = this.staffCommands[key] || {};
      result[key] = {
        ...meta,
        enabled: saved.enabled !== false,
        description: saved.description || meta.description,
        modifiedAt: saved.modifiedAt || null,
        modifiedBy: saved.modifiedBy || null
      };
    }
    return result;
  }

  setStaffCommand(commandKey, options) {
    if (!this.staffCommands[commandKey]) this.staffCommands[commandKey] = {};
    const cmd = this.staffCommands[commandKey];

    if (options.enabled !== undefined) cmd.enabled = options.enabled;
    if (options.description !== undefined) cmd.description = options.description;
    cmd.modifiedAt = Date.now();
    cmd.modifiedBy = options.adminName || 'Admin';

    this.saveFile(STAFF_COMMANDS_FILE, this.staffCommands);
  }

  isStaffCommandEnabled(commandKey) {
    const saved = this.staffCommands[commandKey];
    return saved ? saved.enabled !== false : true;
  }

  addLoginRecord(username, role, ip) {
    this.loginHistory.unshift({
      username,
      role: role || 'Admin',
      ip: ip || 'unknown',
      timestamp: Date.now()
    });
    if (this.loginHistory.length > 100) {
      this.loginHistory = this.loginHistory.slice(0, 100);
    }
    this.saveFile(LOGIN_HISTORY_FILE, this.loginHistory);
  }

  getLoginHistory(limit = 20) {
    return this.loginHistory.slice(0, limit);
  }

  logAdminAction(adminName, action, details = {}) {
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      adminName,
      action,
      details
    };

    this.audit.unshift(entry);
    if (this.audit.length > 2000) this.audit = this.audit.slice(0, 2000);
    this.saveFile(AUDIT_FILE, this.audit);
    return entry;
  }

  getAuditLog({ page = 1, limit = 50, action = null, adminName = null, since = null } = {}) {
    let logs = [...this.audit];

    if (action) logs = logs.filter(l => l.action === action || l.action.includes(action));
    if (adminName) logs = logs.filter(l => l.adminName?.toLowerCase().includes(adminName.toLowerCase()));
    if (since) logs = logs.filter(l => l.timestamp >= since);

    const total = logs.length;
    const start = (page - 1) * limit;
    return {
      logs: logs.slice(start, start + limit),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  generateAlert(type, message, severity = 'info', details = {}) {
    const existing = this.alerts.find(a => !a.dismissed && a.type === type && a.message === message);
    if (existing) return existing;

    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      message,
      severity,
      details,
      dismissed: false
    };

    this.alerts.unshift(alert);
    if (this.alerts.length > 500) this.alerts = this.alerts.slice(0, 500);
    this.saveFile(ALERTS_FILE, this.alerts);
    return alert;
  }

  getAlertsList({ includeDismissed = false } = {}) {
    if (includeDismissed) return this.alerts;
    return this.alerts.filter(a => !a.dismissed);
  }

  dismissAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
      this.saveFile(ALERTS_FILE, this.alerts);
      return true;
    }
    return false;
  }

  trackCommand(commandName) {
    if (!this._commandStats[commandName]) this._commandStats[commandName] = 0;
    this._commandStats[commandName]++;
  }

  getCommandStats() {
    return Object.entries(this._commandStats)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }

  getMarketplaceListings({ page = 1, limit = 20, sortBy = 'newest', guildId = null } = {}) {
    let listings = this.marketplace.filter(l => l.active && (!guildId || l.guildId === guildId));
    if (sortBy === 'newest') listings.sort((a, b) => b.createdAt - a.createdAt);
    else if (sortBy === 'popular') listings.sort((a, b) => b.sales - a.sales);
    else if (sortBy === 'cheapest') listings.sort((a, b) => a.price - b.price);
    else if (sortBy === 'expensive') listings.sort((a, b) => b.price - a.price);
    const total = listings.length;
    const start = (page - 1) * limit;
    return { listings: listings.slice(start, start + limit), total, page, totalPages: Math.ceil(total / limit) };
  }

  getMarketplaceListingById(listingId) {
    return this.marketplace.find(l => l.id === listingId && l.active);
  }

  getUserMarketplaceListings(userId, guildId = null) {
    return this.marketplace.filter(l => l.authorId === userId && l.active && (!guildId || l.guildId === guildId));
  }

  addMarketplaceListing({ authorId, authorName, guildId, title, description, price, config, previewBase64 }) {
    const listing = {
      id: `mkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorId,
      authorName,
      guildId: guildId || null,
      title: (title || 'Sin título').substring(0, 50),
      description: (description || '').substring(0, 200),
      price: Math.max(500, Math.min(500000, Math.floor(price))),
      config,
      previewBase64: previewBase64 || null,
      sales: 0,
      buyers: [],
      rating: 0,
      active: true,
      createdAt: Date.now()
    };
    this.marketplace.push(listing);
    this.saveFile(MARKETPLACE_FILE, this.marketplace);
    return listing;
  }

  buyMarketplaceListing(listingId, buyerId) {
    const listing = this.marketplace.find(l => l.id === listingId && l.active);
    if (!listing) return null;
    listing.sales++;
    if (!listing.buyers) listing.buyers = [];
    listing.buyers.push({ userId: buyerId, boughtAt: Date.now() });
    this.saveFile(MARKETPLACE_FILE, this.marketplace);
    return listing;
  }

  removeMarketplaceListing(listingId, userId) {
    const idx = this.marketplace.findIndex(l => l.id === listingId && l.authorId === userId);
    if (idx === -1) return false;
    this.marketplace[idx].active = false;
    this.saveFile(MARKETPLACE_FILE, this.marketplace);
    return true;
  }

  getDesignHistory(guildId, userId) {
    const key = `${guildId}-${userId}`;
    return this.designHistory[key] || [];
  }

  saveDesignToHistory(guildId, userId, config) {
    const key = `${guildId}-${userId}`;
    if (!this.designHistory[key]) this.designHistory[key] = [];
    this.designHistory[key].unshift({
      id: `hist_${Date.now()}`,
      config: JSON.parse(JSON.stringify(config)),
      savedAt: Date.now()
    });
    if (this.designHistory[key].length > 5) {
      this.designHistory[key] = this.designHistory[key].slice(0, 5);
    }
    this.saveFile(DESIGN_HISTORY_FILE, this.designHistory);
  }

  restoreDesignFromHistory(guildId, userId, historyId) {
    const key = `${guildId}-${userId}`;
    const history = this.designHistory[key] || [];
    const entry = history.find(h => h.id === historyId);
    return entry ? entry.config : null;
  }

  getTimeSeriesData(days = 7) {
    const now = Date.now();
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * 86400000;
      const dayEnd = now - i * 86400000;
      const label = new Date(dayEnd).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });

      let xpGained = 0;
      let levelsUp = 0;

      for (const user of Object.values(this.users)) {
        if (user.lastUpdate && user.lastUpdate >= dayStart && user.lastUpdate < dayEnd) {
          xpGained += user.lastDayXp || 0;
          if (user.lastLevelUp && user.lastLevelUp >= dayStart && user.lastLevelUp < dayEnd) {
            levelsUp++;
          }
        }
      }

      result.push({ label, xp: xpGained, levels: levelsUp, missions: 0 });
    }

    return result;
  }
}

export default new Database();
