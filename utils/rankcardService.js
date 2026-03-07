import crypto from 'crypto';
import { CONFIG } from '../config.js';

export const RANKCARD_BASE_COST = 7500;
export const RANKCARD_IMAGE_EXTRA_COST = 500;
export const RANKCARD_PREMIUM_FONT_COST = 1000;
export const RANKCARD_BACKGROUND_COST = 1500;
export const RANKCARD_VIP_BACKGROUND_COST = 2500;
export const RANKCARD_STICKER_COST = 300;
export const RANKCARD_RESOLUTION_COST = 2000;

export const NEON_COLORS = [
  '#FF00FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF6600',
  '#FF1493', '#00CED1', '#7FFF00', '#FFD700', '#FF4500'
];

export const STANDARD_DRAW_COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#808080', '#C0C0C0'
];

export const VIP_DRAW_COLORS = [
  ...STANDARD_DRAW_COLORS,
  ...NEON_COLORS
];

export const STANDARD_BRUSHES = [
  { id: 'round', name: 'Redondo', premium: false },
  { id: 'square', name: 'Cuadrado', premium: false },
  { id: 'thin', name: 'Fino', premium: false },
  { id: 'medium', name: 'Medio', premium: false },
  { id: 'eraser', name: 'Borrador', premium: false },
  { id: 'fill', name: 'Cubo Relleno', premium: false },
  { id: 'dotted', name: 'Punteado', premium: false },
  { id: 'calligraphy', name: 'Caligrafía', premium: false }
];

export const VIP_BRUSHES = [
  { id: 'spray', name: 'Spray', premium: true },
  { id: 'neon', name: 'Neón', premium: true },
  { id: 'marker', name: 'Marcador', premium: true },
  { id: 'glitter', name: 'Brillos', premium: true },
  { id: 'rainbow', name: 'Arcoíris', premium: true },
  { id: 'pixel', name: 'Pixel Art', premium: true },
  { id: 'star', name: 'Estrellas', premium: true }
];

export const STANDARD_FONTS = [
  { id: 'arial', name: 'Arial', premium: false },
  { id: 'sans-serif', name: 'Sans Serif', premium: false },
  { id: 'georgia', name: 'Georgia', premium: false },
  { id: 'times', name: 'Times New Roman', premium: false },
  { id: 'verdana', name: 'Verdana', premium: false }
];

export const PREMIUM_FONTS = [
  { id: 'press-start', name: 'Press Start 2P', premium: true },
  { id: 'monospace', name: 'Monospace Pixel', premium: true },
  { id: 'impact', name: 'Impact', premium: true },
  { id: 'comic', name: 'Comic Sans', premium: true },
  { id: 'fantasy', name: 'Fantasy', premium: true },
  { id: 'bebas', name: 'Bebas (bold)', premium: true }
];

export const STANDARD_BACKGROUNDS = [
  { id: 'stars', name: 'Cielo Estrellado', premium: false, cost: RANKCARD_BACKGROUND_COST },
  { id: 'waves', name: 'Olas del Mar', premium: false, cost: RANKCARD_BACKGROUND_COST },
  { id: 'geometric', name: 'Geométrico', premium: false, cost: RANKCARD_BACKGROUND_COST }
];

export const VIP_BACKGROUNDS = [
  { id: 'cyberpunk', name: 'Cyberpunk', premium: true, cost: RANKCARD_VIP_BACKGROUND_COST },
  { id: 'galaxy', name: 'Galaxia', premium: true, cost: RANKCARD_VIP_BACKGROUND_COST }
];

export const STANDARD_STICKERS = [
  { id: 'heart', name: 'Corazón', emoji: '❤️', premium: false },
  { id: 'star', name: 'Estrella', emoji: '⭐', premium: false },
  { id: 'flower', name: 'Flor', emoji: '🌸', premium: false },
  { id: 'bone', name: 'Hueso', emoji: '🦴', premium: false },
  { id: 'fire', name: 'Fuego', emoji: '🔥', premium: false },
  { id: 'lightning', name: 'Rayo', emoji: '⚡', premium: false },
  { id: 'music', name: 'Nota Musical', emoji: '🎵', premium: false },
  { id: 'moon', name: 'Luna', emoji: '🌙', premium: false },
  { id: 'sun', name: 'Sol', emoji: '☀️', premium: false },
  { id: 'sparkle', name: 'Brillo', emoji: '✨', premium: false },
  { id: 'mc-pickaxe', name: 'Pico Minecraft', emoji: '⛏️', premium: false },
  { id: 'mc-block', name: 'Cubo Minecraft', emoji: '🟫', premium: false },
  { id: 'ut-heart', name: 'Corazón Undertale', emoji: '💖', premium: false },
  { id: 'skull', name: 'Calavera', emoji: '💀', premium: false },
  { id: 'crown-small', name: 'Corona', emoji: '👑', premium: false },
  { id: 'sword', name: 'Espada', emoji: '⚔️', premium: false },
  { id: 'shield-small', name: 'Escudo', emoji: '🛡️', premium: false },
  { id: 'gem-small', name: 'Gema', emoji: '💎', premium: false },
  { id: 'ghost', name: 'Fantasma', emoji: '👻', premium: false },
  { id: 'rocket', name: 'Cohete', emoji: '🚀', premium: false }
];

export const VIP_STICKERS = [
  { id: 'vip-diamond-sword', name: 'Espada Diamante', emoji: '🗡️', premium: true },
  { id: 'vip-crown-gold', name: 'Corona Dorada', emoji: '👑', premium: true },
  { id: 'vip-neon-star', name: 'Estrella Neón', emoji: '🌟', premium: true },
  { id: 'vip-dragon', name: 'Dragón', emoji: '🐉', premium: true },
  { id: 'vip-phoenix', name: 'Fénix', emoji: '🔥', premium: true },
  { id: 'vip-magic', name: 'Magia', emoji: '🪄', premium: true },
  { id: 'vip-crystal', name: 'Cristal', emoji: '🔮', premium: true },
  { id: 'vip-thunder', name: 'Trueno', emoji: '⛈️', premium: true },
  { id: 'vip-galaxy', name: 'Galaxia', emoji: '🌌', premium: true },
  { id: 'vip-rainbow', name: 'Arcoíris', emoji: '🌈', premium: true }
];

export const RESOLUTION_OPTIONS = [
  { id: 'standard', width: 800, height: 250, name: 'Estándar (800x250)', premium: false },
  { id: 'hd', width: 1000, height: 312, name: 'HD (1000x312)', premium: true },
  { id: 'fullhd', width: 1200, height: 375, name: 'Full HD (1200x375)', premium: true }
];

const STANDARD_MAX_IMAGES = 3;
const VIP_MAX_IMAGES = 3;
const MAX_STICKERS = 10;
const VIP_MAX_STICKERS = 20;

const TOKEN_SECRET = process.env.RANKCARD_TOKEN_SECRET || process.env.MONGODB_URI || 'rankcard-secret-key';
const TOKEN_EXPIRY_MS = 15 * 60 * 1000;

export function checkVIPBoosterRoles(member) {
  if (!member || !member.roles) {
    return { isVIP: false, isBooster: false };
  }
  const roles = member.roles.cache;
  return {
    isVIP: roles.has(CONFIG.VIP_ROLE_ID),
    isBooster: roles.has(CONFIG.BOOSTER_ROLE_ID)
  };
}

export function hasVIPBenefits(isVIP, isBooster) {
  return isVIP || isBooster;
}

export function validateRankcardConfig(config, { isVIP, isBooster }) {
  const hasVIP = hasVIPBenefits(isVIP, isBooster);
  const sanitized = {
    backgroundColor: '#36393F',
    accentColor: '#5865F2',
    textColor: '#FFFFFF',
    barColor: '#5865F2',
    useNeonPalette: false,
    fontId: 'arial',
    backgroundId: null,
    resolution: 'standard',
    baseImages: [],
    logos: [],
    stickers: [],
    drawLayer: null
  };

  const MAX_DRAW_LAYER_BASE64 = 800000;
  if (config.drawLayer && typeof config.drawLayer === 'string' && config.drawLayer.startsWith('data:image/png;base64,')) {
    const b64 = config.drawLayer.slice(22);
    if (b64.length <= MAX_DRAW_LAYER_BASE64) {
      sanitized.drawLayer = config.drawLayer;
    }
  }

  if (config.useNeonPalette && !hasVIP) {
    return { valid: false, error: 'La paleta Neón requiere rol VIP o Booster' };
  }
  sanitized.useNeonPalette = hasVIP && !!config.useNeonPalette;

  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (config.backgroundColor && hexRegex.test(config.backgroundColor)) {
    sanitized.backgroundColor = config.backgroundColor;
  }
  if (config.accentColor && hexRegex.test(config.accentColor)) {
    sanitized.accentColor = config.accentColor;
  }
  if (config.textColor && hexRegex.test(config.textColor)) {
    sanitized.textColor = config.textColor;
  }
  if (config.barColor && hexRegex.test(config.barColor)) {
    sanitized.barColor = config.barColor;
  }

  if (sanitized.useNeonPalette && config.accentColor) {
    if (!NEON_COLORS.includes(config.accentColor.toUpperCase())) {
      sanitized.accentColor = NEON_COLORS[0];
    }
  }

  const allFonts = [...STANDARD_FONTS, ...PREMIUM_FONTS];
  const selectedFont = allFonts.find(f => f.id === config.fontId);
  if (selectedFont) {
    if (selectedFont.premium && !hasVIP) {
      return { valid: false, error: 'Tipografía premium requiere rol VIP o Booster' };
    }
    sanitized.fontId = config.fontId;
  }

  if (config.backgroundId) {
    const allBgs = [...STANDARD_BACKGROUNDS, ...VIP_BACKGROUNDS];
    const selectedBg = allBgs.find(b => b.id === config.backgroundId);
    if (selectedBg) {
      if (selectedBg.premium && !hasVIP) {
        return { valid: false, error: 'Este fondo requiere rol VIP o Booster' };
      }
      sanitized.backgroundId = config.backgroundId;
    }
  }

  if (config.resolution && config.resolution !== 'standard') {
    const resOption = RESOLUTION_OPTIONS.find(r => r.id === config.resolution);
    if (resOption) {
      if (resOption.premium && !hasVIP) {
        return { valid: false, error: 'Resolución HD requiere rol VIP o Booster' };
      }
      sanitized.resolution = config.resolution;
    }
  }

  if (Array.isArray(config.stickers) && config.stickers.length > 0) {
    const maxStickers = hasVIP ? VIP_MAX_STICKERS : MAX_STICKERS;
    const allStickers = [...STANDARD_STICKERS, ...(hasVIP ? VIP_STICKERS : [])];
    const stickerIds = allStickers.map(s => s.id);

    sanitized.stickers = config.stickers
      .filter(s => s && stickerIds.includes(s.id))
      .slice(0, maxStickers)
      .map(s => ({
        id: s.id,
        x: Math.max(0, Math.min(1200, Number(s.x) || 0)),
        y: Math.max(0, Math.min(375, Number(s.y) || 0)),
        scale: Math.max(0.5, Math.min(3, Number(s.scale) || 1))
      }));
  }

  const maxImages = hasVIP ? VIP_MAX_IMAGES : STANDARD_MAX_IMAGES;
  const baseImages = Array.isArray(config.baseImages) ? config.baseImages : [];
  const logos = Array.isArray(config.logos) ? config.logos : [];

  if (baseImages.length + logos.length > maxImages) {
    return {
      valid: false,
      error: `Máximo ${maxImages} imagen(es) para tu plan. VIP/Booster: ${VIP_MAX_IMAGES}`
    };
  }

  const MAX_IMAGE_BASE64 = 3000000;
  const validImageData = (url) => {
    if (typeof url !== 'string') return false;
    if (url.startsWith('data:image/')) {
      const validTypes = ['data:image/png;base64,', 'data:image/jpeg;base64,', 'data:image/gif;base64,', 'data:image/webp;base64,'];
      const hasValidType = validTypes.some(t => url.startsWith(t));
      if (!hasValidType) return false;
      const b64Part = url.split(',')[1] || '';
      return b64Part.length <= MAX_IMAGE_BASE64;
    }
    try {
      const u = new URL(url);
      return ['https:', 'http:'].includes(u.protocol) && u.hostname.endsWith('cdn.discordapp.com');
    } catch {
      return false;
    }
  };

  const maxDim = 1200;
  const maxDimH = 375;

  sanitized.baseImages = baseImages
    .filter(img => img && img.url && validImageData(img.url))
    .slice(0, maxImages)
    .map(img => ({
      url: img.url,
      x: Math.max(0, Math.min(maxDim, Number(img.x) || 0)),
      y: Math.max(0, Math.min(maxDimH, Number(img.y) || 0)),
      width: Math.max(20, Math.min(300, Number(img.width) || 100)),
      height: Math.max(20, Math.min(300, Number(img.height) || 100))
    }));

  sanitized.logos = logos
    .filter(img => img && img.url && validImageData(img.url))
    .slice(0, maxImages - sanitized.baseImages.length)
    .map(img => ({
      url: img.url,
      x: Math.max(0, Math.min(maxDim, Number(img.x) || 0)),
      y: Math.max(0, Math.min(maxDimH, Number(img.y) || 0)),
      width: Math.max(20, Math.min(200, Number(img.width) || 50)),
      height: Math.max(20, Math.min(200, Number(img.height) || 50))
    }));

  return { valid: true, sanitized };
}

export function getDrawColorsForRole(hasVIP) {
  return hasVIP ? VIP_DRAW_COLORS : STANDARD_DRAW_COLORS;
}

export function getBrushesForRole(hasVIP) {
  const list = [...STANDARD_BRUSHES];
  if (hasVIP) list.push(...VIP_BRUSHES);
  return list;
}

export function getBackgroundsForRole(hasVIP) {
  const list = [...STANDARD_BACKGROUNDS];
  if (hasVIP) list.push(...VIP_BACKGROUNDS);
  return list;
}

export function getStickersForRole(hasVIP) {
  const list = [...STANDARD_STICKERS];
  if (hasVIP) list.push(...VIP_STICKERS);
  return list;
}

export function getResolutionsForRole(hasVIP) {
  if (hasVIP) return [...RESOLUTION_OPTIONS];
  return RESOLUTION_OPTIONS.filter(r => !r.premium);
}

export function calculateRankcardCost(config, { isVIP, isBooster }) {
  let total = RANKCARD_BASE_COST;
  const hasVIP = hasVIPBenefits(isVIP, isBooster);

  const totalImages = (config.baseImages?.length || 0) + (config.logos?.length || 0);
  const extraImages = Math.max(0, totalImages - 1);
  total += extraImages * RANKCARD_IMAGE_EXTRA_COST;

  const font = PREMIUM_FONTS.find(f => f.id === config.fontId);
  if (font && font.premium && hasVIP) {
    total += RANKCARD_PREMIUM_FONT_COST;
  }

  if (config.backgroundId) {
    const allBgs = [...STANDARD_BACKGROUNDS, ...VIP_BACKGROUNDS];
    const bg = allBgs.find(b => b.id === config.backgroundId);
    if (bg) {
      total += bg.cost;
    }
  }

  if (config.stickers && config.stickers.length > 0) {
    total += config.stickers.length * RANKCARD_STICKER_COST;
  }

  if (config.resolution && config.resolution !== 'standard') {
    total += RANKCARD_RESOLUTION_COST;
  }

  return total;
}

export function createVerificationToken(userId, guildId) {
  const payload = JSON.stringify({
    userId,
    guildId,
    exp: Date.now() + TOKEN_EXPIRY_MS
  });
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
}

export function verifyToken(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    const { payload, signature } = decoded;
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(payload)
      .digest('hex');
    if (signature !== expectedSig) return null;

    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;
    return { userId: data.userId, guildId: data.guildId };
  } catch {
    return null;
  }
}
