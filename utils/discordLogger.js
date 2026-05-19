import { EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config.js';
import { LOG_TYPES } from './activityLogger.js';

let discordClient = null;

const SKIP_TYPES = new Set([LOG_TYPES.COMMAND_USE]);

const TYPE_META = {
  [LOG_TYPES.XP_GAIN]: { emoji: '✨', color: 0x9B59B6, label: 'Ganancia de XP' },
  [LOG_TYPES.XP_LOSS]: { emoji: '💫', color: 0x8E44AD, label: 'Pérdida de XP' },
  [LOG_TYPES.LEVEL_UP]: { emoji: '⬆️', color: 0xFFD700, label: 'Subida de Nivel' },
  [LOG_TYPES.LEVEL_DOWN]: { emoji: '⬇️', color: 0xE67E22, label: 'Bajada de Nivel' },
  [LOG_TYPES.ROLE_GAIN]: { emoji: '🎖️', color: 0xF1C40F, label: 'Rol Otorgado' },
  [LOG_TYPES.ROLE_LOSS]: { emoji: '🚫', color: 0x95A5A6, label: 'Rol Removido' },
  [LOG_TYPES.COINS_GAIN]: { emoji: '💰', color: 0x2ECC71, label: 'Lagcoins Ganados' },
  [LOG_TYPES.COINS_LOSS]: { emoji: '💸', color: 0xE74C3C, label: 'Lagcoins Gastados' },
  [LOG_TYPES.WORK]: { emoji: '💼', color: 0x3498DB, label: 'Trabajo' },
  [LOG_TYPES.CASINO_WIN]: { emoji: '🎰', color: 0x00FF88, label: 'Casino — Victoria' },
  [LOG_TYPES.CASINO_LOSS]: { emoji: '🎲', color: 0xFF4444, label: 'Casino — Derrota' },
  [LOG_TYPES.THEFT_SUCCESS]: { emoji: '🦹', color: 0xE74C3C, label: 'Robo Exitoso' },
  [LOG_TYPES.THEFT_FAIL]: { emoji: '🚔', color: 0xC0392B, label: 'Robo Fallido' },
  [LOG_TYPES.THEFT_VICTIM]: { emoji: '😱', color: 0xFF6B6B, label: 'Víctima de Robo' },
  [LOG_TYPES.MISSION_COMPLETE]: { emoji: '🏆', color: 0xF39C12, label: 'Misión Completada' },
  [LOG_TYPES.ITEM_GAIN]: { emoji: '📦', color: 0x1ABC9C, label: 'Item Obtenido' },
  [LOG_TYPES.ITEM_USE]: { emoji: '🔧', color: 0x16A085, label: 'Item Usado' },
  [LOG_TYPES.MINIGAME_WIN]: { emoji: '🎮', color: 0x00CED1, label: 'Minijuego — Victoria' },
  [LOG_TYPES.MINIGAME_LOSS]: { emoji: '🕹️', color: 0x708090, label: 'Minijuego — Derrota' },
  [LOG_TYPES.DAILY_REWARD]: { emoji: '🎁', color: 0xFF69B4, label: 'Recompensa Diaria' },
  [LOG_TYPES.BANK_DEPOSIT]: { emoji: '🏦', color: 0x27AE60, label: 'Depósito Bancario' },
  [LOG_TYPES.BANK_WITHDRAW]: { emoji: '🏧', color: 0x2980B9, label: 'Retiro Bancario' },
  [LOG_TYPES.SHOP_PURCHASE]: { emoji: '🛒', color: 0x9B59B6, label: 'Compra en Tienda' },
  [LOG_TYPES.POWERUP_ACTIVATE]: { emoji: '⚡', color: 0xF1C40F, label: 'Power-up Activado' },
  [LOG_TYPES.STREAK_GAIN]: { emoji: '🔥', color: 0xFF4500, label: 'Racha' },
  [LOG_TYPES.STREAK_LOSS]: { emoji: '💔', color: 0x696969, label: 'Racha Perdida' },
  [LOG_TYPES.ADMIN_ACTION]: { emoji: '👑', color: 0x9B59B6, label: 'Acción de Staff' },
  [LOG_TYPES.RANKCARD_UNLOCK]: { emoji: '🎨', color: 0xFF1493, label: 'Rankcard' },
  [LOG_TYPES.GIFT_SENT]: { emoji: '🎀', color: 0xFF69B4, label: 'Regalo Enviado' },
  [LOG_TYPES.GIFT_RECEIVED]: { emoji: '🎁', color: 0xFF69B4, label: 'Regalo Recibido' },
  [LOG_TYPES.MARRIAGE]: { emoji: '💍', color: 0xFF69B4, label: 'Matrimonio' },
  [LOG_TYPES.DIVORCE]: { emoji: '💔', color: 0x808080, label: 'Divorcio' },
  [LOG_TYPES.NATIONALITY_CHANGE]: { emoji: '🌍', color: 0x3498DB, label: 'Cambio de Nacionalidad' },
  [LOG_TYPES.TRAVEL]: { emoji: '✈️', color: 0x1ABC9C, label: 'Viaje' },
  [LOG_TYPES.AUCTION_CREATE]: { emoji: '📢', color: 0xE67E22, label: 'Subasta Creada' },
  [LOG_TYPES.AUCTION_BID]: { emoji: '🔨', color: 0xD35400, label: 'Puja en Subasta' },
  [LOG_TYPES.TRADE]: { emoji: '🤝', color: 0x2ECC71, label: 'Intercambio' },
  [LOG_TYPES.INSURANCE_BUY]: { emoji: '🛡️', color: 0x3498DB, label: 'Seguro Comprado' },
  [LOG_TYPES.BANK_HEIST]: { emoji: '🏦', color: 0xC0392B, label: 'Atraco al Banco' },
  [LOG_TYPES.CONFIG_CHANGE]: { emoji: '⚙️', color: 0x7F8C8D, label: 'Cambio de Config' },
  [LOG_TYPES.GAMECARD_GENERATE]: { emoji: '🃏', color: 0x9B59B6, label: 'Gamecard' },
  [LOG_TYPES.AFK_SET]: { emoji: '💤', color: 0xFFFF00, label: 'AFK Activado' },
  [LOG_TYPES.AFK_REMOVE]: { emoji: '👋', color: 0xFFFF00, label: 'AFK Desactivado' },
  [LOG_TYPES.INACTIVITY]: { emoji: '⚠️', color: 0xFF0000, label: 'Inactividad' },
  [LOG_TYPES.INACTIVITY_RECOVERY]: { emoji: '🎉', color: 0x00FF00, label: 'Recuperación de Actividad' },
  [LOG_TYPES.JAIL]: { emoji: '🚔', color: 0x34495E, label: 'Cárcel' },
  [LOG_TYPES.BOOST_GAIN]: { emoji: '🚀', color: 0x9B59B6, label: 'Boost Obtenido' },
  [LOG_TYPES.THEME_CHANGE]: { emoji: '🎴', color: 0xE91E63, label: 'Tema de Tarjeta' },
  [LOG_TYPES.BUTTON_CLICK]: { emoji: '🖱️', color: 0x95A5A6, label: 'Interacción' }
};

const SYSTEM_EMOJI = {
  economia: '💰',
  niveles: '📊',
  casino: '🎰',
  minijuegos: '🎮',
  misiones: '🏆',
  nacionalidades: '🌍',
  social: '👥',
  admin: '👑',
  tienda: '🛒',
  powerups: '⚡',
  robos: '🦹',
  seguridad: '🛡️',
  general: '📋'
};

const IMPORTANCE_COLORS = {
  low: null,
  medium: 0x3498DB,
  high: 0xE67E22,
  critical: 0xE74C3C
};

function formatDetails(details) {
  if (!details || typeof details !== 'object') return null;
  const lines = [];
  for (const [key, value] of Object.entries(details)) {
    if (value === null || value === undefined || value === '') continue;
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    let formatted = value;
    if (typeof value === 'object') {
      formatted = '```json\n' + JSON.stringify(value, null, 2).slice(0, 400) + '\n```';
    } else if (String(value).length > 200) {
      formatted = String(value).slice(0, 197) + '...';
    }
    lines.push(`**${label}:** ${formatted}`);
  }
  return lines.length ? lines.join('\n').slice(0, 1024) : null;
}

function formatCommandOptions(opts) {
  if (!opts || typeof opts !== 'object') return null;
  const entries = Object.entries(opts).filter(([, v]) => v !== undefined && v !== null);
  if (!entries.length) return null;
  return entries.map(([k, v]) => `• **${k}:** ${v}`).join('\n').slice(0, 512);
}

export function initDiscordLogger(client) {
  discordClient = client;
}

async function resolveLogChannel(log) {
  const channelId = CONFIG.ACTIVITY_LOG_CHANNEL_ID;
  if (!channelId || !discordClient) return null;

  if (log.guildId) {
    const guild = discordClient.guilds.cache.get(log.guildId)
      || await discordClient.guilds.fetch(log.guildId).catch(() => null);
    const fromGuild = guild?.channels?.cache?.get(channelId);
    if (fromGuild?.isTextBased()) return fromGuild;
  }

  for (const guild of discordClient.guilds.cache.values()) {
    const ch = guild.channels.cache.get(channelId);
    if (ch?.isTextBased()) return ch;
  }

  const fetched = await discordClient.channels.fetch(channelId).catch(() => null);
  return fetched?.isTextBased() ? fetched : null;
}

export async function sendActivityToDiscord(log) {
  if (!discordClient || SKIP_TYPES.has(log.type)) return;

  try {
    const channel = await resolveLogChannel(log);
    if (!channel) {
      console.warn(`Canal de auditoría ${CONFIG.ACTIVITY_LOG_CHANNEL_ID} no encontrado o sin permisos`);
      return;
    }

    const meta = TYPE_META[log.type] || { emoji: '📋', color: 0x5865F2, label: log.type };
    const sysEmoji = SYSTEM_EMOJI[log.system] || '📋';
    const importanceColor = IMPORTANCE_COLORS[log.importance];
    const color = importanceColor || meta.color;

    const resultEmoji = {
      success: '✅',
      failure: '❌',
      error: '⚠️',
      cooldown: '⏳'
    }[log.result] || '✅';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${meta.emoji} ${meta.label}`)
      .setTimestamp(new Date(log.timestamp));

    if (log.userId) {
      embed.setAuthor({
        name: log.username || log.userId,
        iconURL: `https://cdn.discordapp.com/avatars/${log.userId}/default.png`
      });
    }

    const mainFields = [];

    if (log.userId) {
      mainFields.push({ name: '👤 Usuario', value: `<@${log.userId}>\n\`${log.userId}\``, inline: true });
    }

    mainFields.push({
      name: '📁 Sistema',
      value: `${sysEmoji} **${(log.system || 'general').toUpperCase()}**`,
      inline: true
    });

    mainFields.push({
      name: '📌 Resultado',
      value: `${resultEmoji} ${log.result || 'success'}`,
      inline: true
    });

    if (log.command) {
      mainFields.push({ name: '⌨️ Comando', value: `\`/${log.command}\``, inline: true });
    }

    if (log.amount) {
      const sign = log.amount >= 0 ? '+' : '';
      mainFields.push({
        name: '💵 Cantidad',
        value: `**${sign}${Number(log.amount).toLocaleString('es-ES')}**`,
        inline: true
      });
    }

    if (log.levelBefore != null && log.levelAfter != null) {
      mainFields.push({
        name: '📊 Nivel',
        value: `**${log.levelBefore}** → **${log.levelAfter}**`,
        inline: true
      });
    } else if (log.levelAfter != null) {
      mainFields.push({ name: '📊 Nivel', value: `**${log.levelAfter}**`, inline: true });
    }

    if (log.xpBefore != null && log.xpAfter != null) {
      mainFields.push({
        name: '✨ XP Total',
        value: `**${log.xpBefore.toLocaleString('es-ES')}** → **${log.xpAfter.toLocaleString('es-ES')}**`,
        inline: true
      });
    } else if (log.xpAfter != null) {
      mainFields.push({ name: '✨ XP Total', value: `**${log.xpAfter.toLocaleString('es-ES')}**`, inline: true });
    }

    if (log.balanceBefore != null && log.balanceAfter != null) {
      mainFields.push({
        name: '🏦 Saldo Lagcoins',
        value: `**${log.balanceBefore.toLocaleString('es-ES')}** → **${log.balanceAfter.toLocaleString('es-ES')}**`,
        inline: true
      });
    } else if (log.balanceAfter != null) {
      mainFields.push({ name: '🏦 Saldo', value: `**${log.balanceAfter.toLocaleString('es-ES')}** LC`, inline: true });
    }

    embed.addFields(mainFields);

    if (log.reason) {
      embed.addFields({ name: '📝 Motivo', value: log.reason.slice(0, 1024), inline: false });
    }

    const cmdOpts = formatCommandOptions(log.commandOptions);
    if (cmdOpts) {
      embed.addFields({ name: '⚙️ Opciones', value: cmdOpts, inline: false });
    }

    const detailsText = formatDetails(log.details);
    if (detailsText) {
      embed.addFields({ name: '🔍 Detalles', value: detailsText, inline: false });
    }

    const footerParts = [];
    if (log.guildName) footerParts.push(log.guildName);
    if (log.importance && log.importance !== 'low') {
      footerParts.push(`Importancia: ${log.importance.toUpperCase()}`);
    }
    footerParts.push(`ID: ${log.logId}`);
    embed.setFooter({ text: footerParts.join(' • ') });

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error enviando log a Discord:', error.message);
  }
}
