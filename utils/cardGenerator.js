import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { CONFIG } from '../config.js';

function createSeededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

function userSeedFromId(userId) {
  if (!userId) return 12345;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}


let _rankcardServiceCache = null;
async function getRankcardServiceData() {
  if (!_rankcardServiceCache) {
    const mod = await import('./rankcardService.js');
    _rankcardServiceCache = {
      RESOLUTION_OPTIONS: mod.RESOLUTION_OPTIONS,
      STANDARD_STICKERS: mod.STANDARD_STICKERS,
      VIP_STICKERS: mod.VIP_STICKERS
    };
  }
  return _rankcardServiceCache;
}

const CARD_WIDTH = 800;
const CARD_HEIGHT = 250;

export async function getAvailableThemes(member, level, purchasedCards = []) {
  const userId = member.user.id;
  let roles;
  const themes = ['discord', 'pixel'];
  
  try {
    const freshMember = await member.guild.members.fetch(userId);
    roles = freshMember.roles.cache;
  } catch (error) {
    console.error('Error fetching fresh member for card theme:', error);
    roles = member.roles.cache;
  }
  
  if (userId === CONFIG.SPECIAL_USER_ID) {
    return ['discord', 'roblox', 'minecraft', 'zelda', 'fnaf', 'geometrydash', 'pixel', 'cuphead', 'undertale', 'fortnite'];
  }
  
  if (roles && roles.has(CONFIG.VIP_ROLE_ID)) {
    themes.push('night');
  }
  
  if (roles && roles.has(CONFIG.BOOSTER_ROLE_ID)) {
    themes.push('geometrydash');
  }
  
  if (level >= 100) {
    themes.push('pokemon');
  }
  
  if (roles && roles.has(CONFIG.LEVEL_ROLES[35])) {
    themes.push('zelda');
  }
  
  if (roles && roles.has(CONFIG.LEVEL_ROLES[25])) {
    themes.push('ocean');
  }
  
  if (purchasedCards && purchasedCards.length > 0) {
    for (const card of purchasedCards) {
      if (!themes.includes(card)) {
        themes.push(card);
      }
    }
  }
  
  return [...new Set(themes)];
}

export async function getCardTheme(member, level, selectedTheme = null, purchasedCards = [], rand = null) {
  const userId = member.user.id;
  let roles;
  
  try {
    const freshMember = await member.guild.members.fetch(userId);
    roles = freshMember.roles.cache;
  } catch (error) {
    console.error('Error fetching fresh member for card theme:', error);
    roles = member.roles.cache;
  }
  
  if (selectedTheme) {
    const available = await getAvailableThemes(member, level, purchasedCards);
    if (available.includes(selectedTheme)) {
      return selectedTheme;
    }
  }
  
  if (userId === CONFIG.SPECIAL_USER_ID) {
    const themes = ['roblox', 'minecraft', 'zelda', 'fnaf', 'geometrydash', 'cuphead', 'undertale', 'fortnite'];
    return themes[Math.floor((rand || Math.random)() * themes.length)];
  }
  
  if (roles && roles.has(CONFIG.VIP_ROLE_ID)) {
    return 'night';
  }
  
  if (roles && roles.has(CONFIG.BOOSTER_ROLE_ID)) {
    return 'geometrydash';
  }
  
  if (level >= 100) {
    return 'pokemon';
  }
  
  if (roles && roles.has(CONFIG.LEVEL_ROLES[35])) {
    return 'zelda';
  }
  
  if (roles && roles.has(CONFIG.LEVEL_ROLES[25])) {
    return 'ocean';
  }
  
  return 'discord';
}

export function getThemeButtonColor(theme) {
  const colors = getPixelArtThemeColors(theme);
  return colors.buttonColor || 'Primary';
}

export function getThemeButtonStyle(theme) {
  const themeStyles = {
    pixel: 1,
    ocean: 1,
    zelda: 2,
    pokemon: 4,
    geometrydash: 3,
    night: 2,
    roblox: 4,
    minecraft: 3,
    fnaf: 4,
    cuphead: 4,
    undertale: 4,
    fortnite: 1,
  };
  return themeStyles[theme] || 1;
}

function drawPixelatedRect(ctx, x, y, width, height, pixelSize = 4) {
  const cols = Math.ceil(width / pixelSize);
  const rows = Math.ceil(height / pixelSize);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = x + col * pixelSize;
      const py = y + row * pixelSize;
      ctx.fillRect(px, py, pixelSize - 0.5, pixelSize - 0.5);
    }
  }
}

function getPixelArtThemeColors(theme) {
  const themes = {
    discord: {
      gradient: [
        { pos: 0, color: '#36393F' },
        { pos: 0.5, color: '#2F3136' },
        { pos: 1, color: '#202225' }
      ],
      border: '#5865F2',
      accent: '#5865F2',
      text: '#FFFFFF',
      textShadow: '#000000',
      barBg: '#202225',
      barFill: ['#5865F2', '#7289DA'],
      buttonColor: 'Primary'
    },
    pixel: {
      gradient: [
        { pos: 0, color: '#00CED1' },
        { pos: 0.5, color: '#20B2AA' },
        { pos: 1, color: '#008B8B' }
      ],
      border: '#00FFFF',
      accent: '#40E0D0',
      text: '#FFFFFF',
      textShadow: '#004444',
      barBg: '#1a3a3a',
      barFill: ['#00CED1', '#40E0D0'],
      buttonColor: 'Primary'
    },
    ocean: {
      gradient: [
        { pos: 0, color: '#0077BE' },
        { pos: 0.5, color: '#00A3E0' },
        { pos: 1, color: '#005F8A' }
      ],
      border: '#00BFFF',
      accent: '#00CED1',
      text: '#FFFFFF',
      textShadow: '#003366',
      barBg: '#002244',
      barFill: ['#00BFFF', '#87CEEB'],
      buttonColor: 'Primary'
    },
    zelda: {
      gradient: [
        { pos: 0, color: '#90EE90' },
        { pos: 0.5, color: '#FFD700' },
        { pos: 1, color: '#228B22' }
      ],
      border: '#FFD700',
      accent: '#98FB98',
      text: '#FFFFFF',
      textShadow: '#2F4F2F',
      barBg: '#2F4F2F',
      barFill: ['#FFD700', '#90EE90'],
      buttonColor: 'Success'
    },
    pokemon: {
      gradient: [
        { pos: 0, color: '#FF6B35' },
        { pos: 0.5, color: '#FF4500' },
        { pos: 1, color: '#FFD700' }
      ],
      border: '#FF0000',
      accent: '#FFD700',
      text: '#FFFFFF',
      textShadow: '#8B0000',
      barBg: '#4A0000',
      barFill: ['#FF4500', '#FFD700'],
      buttonColor: 'Danger'
    },
    geometrydash: {
      gradient: [
        { pos: 0, color: '#FF00FF' },
        { pos: 0.25, color: '#00FFFF' },
        { pos: 0.5, color: '#00FF00' },
        { pos: 0.75, color: '#FFFF00' },
        { pos: 1, color: '#FF00FF' }
      ],
      border: '#00FF00',
      accent: '#FF00FF',
      text: '#FFFFFF',
      textShadow: '#330033',
      barBg: '#1a0033',
      barFill: ['#00FF00', '#FF00FF', '#00FFFF'],
      buttonColor: 'Success'
    },
    night: {
      gradient: [
        { pos: 0, color: '#191970' },
        { pos: 0.5, color: '#0F0F3F' },
        { pos: 1, color: '#000033' }
      ],
      border: '#4169E1',
      accent: '#FFD700',
      text: '#FFFFFF',
      textShadow: '#000022',
      barBg: '#0a0a1a',
      barFill: ['#9370DB', '#4169E1'],
      stars: true,
      buttonColor: 'Secondary'
    },
    roblox: {
      gradient: [
        { pos: 0, color: '#00A2FF' }, // Azul Roblox
        { pos: 0.5, color: '#FFFFFF' }, // Blanco
        { pos: 1, color: '#00A2FF' }  // Azul Roblox
      ],
      border: '#FFFFFF',
      accent: '#00A2FF',
      text: '#00A2FF',
      textShadow: '#FFFFFF',
      barBg: '#005A8C',
      barFill: ['#FFFFFF', '#00A2FF'],
      buttonColor: 'Primary'
    },
    minecraft: {
      gradient: [
        { pos: 0, color: '#4A7C59' },
        { pos: 0.5, color: '#5D8A5C' },
        { pos: 1, color: '#3B5323' }
      ],
      border: '#8B4513',
      accent: '#55FF55',
      text: '#FFFFFF',
      textShadow: '#1A2F1A',
      barBg: '#2F4F2F',
      barFill: ['#55FF55', '#00FF00'],
      buttonColor: 'Success'
    },
    fnaf: {
      gradient: [
        { pos: 0, color: '#1C0A00' },
        { pos: 0.5, color: '#2D1810' },
        { pos: 1, color: '#000000' }
      ],
      border: '#8B0000',
      accent: '#FFD700',
      text: '#FFFFFF',
      textShadow: '#000000',
      barBg: '#1a0a0a',
      barFill: ['#FFD700', '#FF6347'],
      buttonColor: 'Danger'
    },
    cuphead: {
      gradient: [
        { pos: 0, color: '#F5E6C8' },
        { pos: 0.3, color: '#E8D4A0' },
        { pos: 0.7, color: '#D4B87A' },
        { pos: 1, color: '#C4A265' }
      ],
      border: '#8B0000',
      accent: '#CC0000',
      text: '#1A0A00',
      textShadow: '#F5E6C8',
      barBg: '#5C3A1E',
      barFill: ['#CC0000', '#FF4444'],
      filmGrain: true,
      buttonColor: 'Danger'
    },
    undertale: {
      gradient: [
        { pos: 0, color: '#000000' },
        { pos: 0.4, color: '#0A0020' },
        { pos: 0.8, color: '#050010' },
        { pos: 1, color: '#000000' }
      ],
      border: '#FFFF00',
      accent: '#FFFF00',
      text: '#FFFFFF',
      textShadow: '#440044',
      barBg: '#1A0030',
      barFill: ['#FFFF00', '#FF6600'],
      determination: true,
      buttonColor: 'Danger'
    },
    fortnite: {
      gradient: [
        { pos: 0, color: '#1B0A3C' },
        { pos: 0.3, color: '#2D1B69' },
        { pos: 0.6, color: '#0066FF' },
        { pos: 1, color: '#00CCFF' }
      ],
      border: '#00CCFF',
      accent: '#FFD700',
      text: '#FFFFFF',
      textShadow: '#0A0025',
      barBg: '#0A0A2E',
      barFill: ['#0066FF', '#00CCFF', '#FFD700'],
      storm: true,
      buttonColor: 'Primary'
    }
  };
  
  return themes[theme] || themes.discord;
}

function drawPixelBorder(ctx, x, y, width, height, color, thickness = 4) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, thickness);
  ctx.fillRect(x, y + height - thickness, width, thickness);
  ctx.fillRect(x, y, thickness, height);
  ctx.fillRect(x + width - thickness, y, thickness, height);
  
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + thickness, y + thickness, width - thickness * 2, thickness / 2);
  ctx.fillRect(x + thickness, y + thickness, thickness / 2, height - thickness * 2);
}

function drawPixelatedGradientBackground(ctx, width, height, colors, rand) {
  const pixelSize = 8;
  const rows = Math.ceil(height / pixelSize);
  const cols = Math.ceil(width / pixelSize);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const t = row / rows;
      
      let color;
      for (let i = 0; i < colors.length - 1; i++) {
        if (t >= colors[i].pos && t <= colors[i + 1].pos) {
          const localT = (t - colors[i].pos) / (colors[i + 1].pos - colors[i].pos);
          color = interpolateColor(colors[i].color, colors[i + 1].color, localT);
          break;
        }
      }
      if (!color) color = colors[colors.length - 1].color;
      
      const noise = (rand() - 0.5) * 15;
      const rgb = hexToRgb(color);
      const adjustedColor = `rgb(${Math.max(0, Math.min(255, rgb.r + noise))}, ${Math.max(0, Math.min(255, rgb.g + noise))}, ${Math.max(0, Math.min(255, rgb.b + noise))})`;
      
      ctx.fillStyle = adjustedColor;
      ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
    }
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function interpolateColor(color1, color2, t) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function drawStars(ctx, width, height, rand, count = 30) {
  for (let i = 0; i < count; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const size = rand() * 3 + 1;
    const brightness = rand() * 0.5 + 0.5;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.fillRect(Math.floor(x / 2) * 2, Math.floor(y / 2) * 2, size, size);
  }
}

function drawCupheadEffects(ctx, width, height, rand) {
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < height; i += 3) {
    ctx.fillStyle = i % 6 === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, i, width, 1);
  }
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 200; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const size = rand() * 2 + 1;
    ctx.fillStyle = rand() > 0.5 ? '#000000' : '#FFFFFF';
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(0, 0, width, 8);
  ctx.fillRect(0, height - 8, width, 8);
  ctx.fillRect(0, 0, 8, height);
  ctx.fillRect(width - 8, 0, 8, height);
  const cornerSize = 20;
  ctx.fillStyle = '#5C3A1E';
  ctx.globalAlpha = 0.3;
  ctx.fillRect(10, 10, cornerSize, 4);
  ctx.fillRect(10, 10, 4, cornerSize);
  ctx.fillRect(width - 10 - cornerSize, 10, cornerSize, 4);
  ctx.fillRect(width - 14, 10, 4, cornerSize);
  ctx.fillRect(10, height - 14, cornerSize, 4);
  ctx.fillRect(10, height - 10 - cornerSize, 4, cornerSize);
  ctx.fillRect(width - 10 - cornerSize, height - 14, cornerSize, 4);
  ctx.fillRect(width - 14, height - 10 - cornerSize, 4, cornerSize);
  ctx.globalAlpha = 1;
}

function drawUndertaleEffects(ctx, width, height, rand) {
  ctx.globalAlpha = 0.4;
  const heartX = width - 60;
  const heartY = 30;
  const hs = 12;
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(heartX - hs, heartY, hs, hs);
  ctx.fillRect(heartX, heartY, hs, hs);
  ctx.fillRect(heartX - hs * 2, heartY + hs, hs * 4, hs);
  ctx.fillRect(heartX - hs * 2, heartY + hs * 2, hs * 4, hs);
  ctx.fillRect(heartX - hs, heartY + hs * 3, hs * 2, hs);
  ctx.fillRect(heartX - hs / 2, heartY + hs * 4, hs, hs);

  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 60; i++) {
    const x = rand() * width;
    const y = rand() * height;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(Math.floor(x / 4) * 4, Math.floor(y / 4) * 4, 4, 4);
  }

  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, width - 24, height - 24);
  ctx.globalAlpha = 1;
}

function drawFortniteEffects(ctx, width, height, rand) {
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 15; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const radius = rand() * 40 + 10;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(128, 0, 255, 0.3)');
    gradient.addColorStop(0.5, 'rgba(0, 102, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 204, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 8; i++) {
    const x1 = rand() * width;
    const y1 = rand() * height;
    ctx.strokeStyle = '#00CCFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    let cx = x1;
    let cy = y1;
    for (let j = 0; j < 4; j++) {
      cx += (rand() - 0.5) * 30;
      cy += rand() * 20 + 5;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 30; i++) {
    const x = rand() * width;
    const y = rand() * (height / 3);
    const size = rand() * 3 + 1;
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

function drawPixelText(ctx, text, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px "Press Start 2P", monospace, Arial`;
  ctx.fillText(text, x, y);
}

const FONT_MAP = {
  arial: { family: 'Arial, sans-serif', size: 28 },
  'sans-serif': { family: '"Segoe UI", sans-serif', size: 28 },
  georgia: { family: 'Georgia, serif', size: 26 },
  times: { family: '"Times New Roman", serif', size: 26 },
  verdana: { family: 'Verdana, sans-serif', size: 26 },
  'press-start': { family: '"Press Start 2P", monospace', size: 24 },
  monospace: { family: '"Courier New", monospace', size: 24 },
  impact: { family: 'Impact, sans-serif', size: 26 },
  comic: { family: '"Comic Sans MS", cursive', size: 24 },
  fantasy: { family: 'fantasy, cursive', size: 24 },
  bebas: { family: '"Bebas Neue", Arial Black, sans-serif', size: 26 }
};

function getFontString(fontId, sizeOverride = null) {
  const f = FONT_MAP[fontId] || FONT_MAP.arial;
  const size = sizeOverride || f.size;
  return `bold ${size}px ${f.family}`;
}

function drawPresetBackground(ctx, w, h, bgId, rand) {
  switch (bgId) {
    case 'stars': {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0B0D21');
      grad.addColorStop(0.5, '#1A1A3E');
      grad.addColorStop(1, '#0B0D21');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < 80; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const s = rand() * 3 + 1;
        ctx.fillStyle = ['#FFFFFF', '#FFD700', '#ADD8E6', '#FFC0CB'][Math.floor(rand() * 4)];
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'waves': {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#006994');
      grad.addColorStop(0.5, '#003B5C');
      grad.addColorStop(1, '#001F3F');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      for (let row = 0; row < 6; row++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 5) {
          const y = (h / 6) * row + Math.sin((x + row * 40) / 30) * 15 + 30;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'geometric': {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);
      const geoColors = ['#16213e', '#0f3460', '#e94560', '#533483'];
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = geoColors[Math.floor(rand() * geoColors.length)];
        const cx = rand() * w;
        const cy = rand() * h;
        const size = rand() * 60 + 20;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rand() * Math.PI);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      }
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < 15; i++) {
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, rand() * 40 + 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'cyberpunk': {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0a0a23');
      grad.addColorStop(0.5, '#1a0a2e');
      grad.addColorStop(1, '#0a0a23');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#FF00FF';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      }
      for (let i = 0; i < h; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      const neonGrad = ctx.createLinearGradient(0, h - 60, 0, h);
      neonGrad.addColorStop(0, 'transparent');
      neonGrad.addColorStop(1, 'rgba(255,0,255,0.3)');
      ctx.fillStyle = neonGrad;
      ctx.fillRect(0, h - 60, w, 60);
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = ['#FF00FF', '#00FFFF'][i % 2];
        const bw = rand() * 30 + 10;
        const bh = rand() * 40 + 20;
        const bx = rand() * w;
        const by = h - bh - rand() * 40;
        ctx.fillRect(bx, by, bw, bh);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'galaxy': {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 1.5);
      grad.addColorStop(0, '#1a0533');
      grad.addColorStop(0.3, '#0d0221');
      grad.addColorStop(0.6, '#150734');
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 120; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const s = rand() * 2 + 0.5;
        ctx.fillStyle = ['#FFFFFF', '#E0B0FF', '#ADD8E6', '#FFD700', '#FF69B4'][Math.floor(rand() * 5)];
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.08;
      const nebulaGrad = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, 150);
      nebulaGrad.addColorStop(0, '#FF00FF');
      nebulaGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, w, h);
      const nebulaGrad2 = ctx.createRadialGradient(w * 0.7, h * 0.6, 0, w * 0.7, h * 0.6, 120);
      nebulaGrad2.addColorStop(0, '#00FFFF');
      nebulaGrad2.addColorStop(1, 'transparent');
      ctx.fillStyle = nebulaGrad2;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      break;
    }
  }
}

function drawStickerOnCanvas(ctx, sticker, allStickers) {
  const stickerDef = allStickers.find(s => s.id === sticker.id);
  if (!stickerDef) return;
  const size = Math.round(28 * (sticker.scale || 1));
  const x = sticker.x;
  const y = sticker.y;
  const r = size / 2;

  ctx.save();
  const drawFns = {
    'heart': () => { ctx.fillStyle = '#FF0000'; ctx.beginPath(); const topY = y - r * 0.4; ctx.moveTo(x, y + r * 0.8); ctx.bezierCurveTo(x - r * 1.2, y - r * 0.2, x - r * 0.8, topY - r * 0.6, x, topY + r * 0.2); ctx.bezierCurveTo(x + r * 0.8, topY - r * 0.6, x + r * 1.2, y - r * 0.2, x, y + r * 0.8); ctx.fill(); },
    'star': () => { ctx.fillStyle = '#FFD700'; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = (i * 72 - 90) * Math.PI / 180; const a2 = ((i * 72) + 36 - 90) * Math.PI / 180; ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); ctx.lineTo(x + r * 0.4 * Math.cos(a2), y + r * 0.4 * Math.sin(a2)); } ctx.closePath(); ctx.fill(); },
    'flower': () => { ctx.fillStyle = '#FF69B4'; for (let i = 0; i < 5; i++) { const a = (i * 72) * Math.PI / 180; ctx.beginPath(); ctx.arc(x + r * 0.5 * Math.cos(a), y + r * 0.5 * Math.sin(a), r * 0.4, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#FFFF00'; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, Math.PI * 2); ctx.fill(); },
    'bone': () => { ctx.fillStyle = '#F5F5DC'; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); const bw = r * 0.3, bl = r * 1.2; ctx.fillRect(-bl, -bw / 2, bl * 2, bw); for (const [ex, ey] of [[-bl, -bw], [-bl, bw], [bl, -bw], [bl, bw]]) { ctx.beginPath(); ctx.arc(ex, ey, bw * 0.7, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); },
    'fire': () => { ctx.fillStyle = '#FF4500'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r, y - r * 0.3, x + r * 0.5, y + r); ctx.quadraticCurveTo(x, y + r * 0.5, x - r * 0.5, y + r); ctx.quadraticCurveTo(x - r, y - r * 0.3, x, y - r); ctx.fill(); ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.moveTo(x, y - r * 0.4); ctx.quadraticCurveTo(x + r * 0.5, y, x + r * 0.2, y + r * 0.6); ctx.quadraticCurveTo(x, y + r * 0.3, x - r * 0.2, y + r * 0.6); ctx.quadraticCurveTo(x - r * 0.5, y, x, y - r * 0.4); ctx.fill(); },
    'lightning': () => { ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.moveTo(x + r * 0.2, y - r); ctx.lineTo(x - r * 0.4, y + r * 0.1); ctx.lineTo(x + r * 0.1, y + r * 0.1); ctx.lineTo(x - r * 0.2, y + r); ctx.lineTo(x + r * 0.5, y - r * 0.1); ctx.lineTo(x, y - r * 0.1); ctx.closePath(); ctx.fill(); },
    'music': () => { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x - r * 0.3, y + r * 0.4, r * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - r * 0.3 + r * 0.25, y - r * 0.6, r * 0.1, r); ctx.beginPath(); ctx.arc(x + r * 0.4, y + r * 0.2, r * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x + r * 0.4 + r * 0.25, y - r * 0.8, r * 0.1, r); ctx.fillRect(x - r * 0.05, y - r * 0.8, r * 0.8, r * 0.12); },
    'moon': () => { ctx.fillStyle = '#FFFACD'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = ctx.canvas ? '#36393F' : '#000'; ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.15, r * 0.75, 0, Math.PI * 2); ctx.fill(); },
    'sun': () => { ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill(); for (let i = 0; i < 8; i++) { const a = (i * 45) * Math.PI / 180; ctx.beginPath(); ctx.moveTo(x + r * 0.55 * Math.cos(a), y + r * 0.55 * Math.sin(a)); ctx.lineTo(x + r * Math.cos(a - 0.15), y + r * Math.sin(a - 0.15)); ctx.lineTo(x + r * Math.cos(a + 0.15), y + r * Math.sin(a + 0.15)); ctx.closePath(); ctx.fill(); } },
    'sparkle': () => { ctx.fillStyle = '#FFFFFF'; const drawSpark = (sx, sy, sr) => { ctx.beginPath(); ctx.moveTo(sx, sy - sr); ctx.lineTo(sx + sr * 0.2, sy - sr * 0.2); ctx.lineTo(sx + sr, sy); ctx.lineTo(sx + sr * 0.2, sy + sr * 0.2); ctx.lineTo(sx, sy + sr); ctx.lineTo(sx - sr * 0.2, sy + sr * 0.2); ctx.lineTo(sx - sr, sy); ctx.lineTo(sx - sr * 0.2, sy - sr * 0.2); ctx.closePath(); ctx.fill(); }; drawSpark(x, y, r); drawSpark(x + r * 0.7, y - r * 0.5, r * 0.4); },
    'mc-pickaxe': () => { ctx.strokeStyle = '#8B4513'; ctx.lineWidth = Math.max(2, r * 0.15); ctx.beginPath(); ctx.moveTo(x - r * 0.7, y + r * 0.7); ctx.lineTo(x + r * 0.3, y - r * 0.3); ctx.stroke(); ctx.fillStyle = '#00CED1'; ctx.beginPath(); ctx.moveTo(x + r * 0.3, y - r * 0.3); ctx.lineTo(x + r * 0.8, y - r * 0.8); ctx.lineTo(x + r * 0.9, y - r * 0.3); ctx.lineTo(x + r * 0.5, y - r * 0.1); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + r * 0.3, y - r * 0.3); ctx.lineTo(x - r * 0.1, y - r * 0.5); ctx.lineTo(x + r * 0.3, y - r * 0.9); ctx.lineTo(x + r * 0.8, y - r * 0.8); ctx.fill(); },
    'mc-block': () => { ctx.fillStyle = '#8B4513'; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = '#654321'; ctx.fillRect(x - r, y - r, r * 2, r * 0.15); ctx.fillRect(x - r, y + r * 0.85, r * 2, r * 0.15); ctx.strokeStyle = '#5C3317'; ctx.lineWidth = 1; ctx.strokeRect(x - r, y - r, r * 2, r * 2); },
    'ut-heart': () => { ctx.fillStyle = '#FF0000'; ctx.beginPath(); const topY = y - r * 0.4; ctx.moveTo(x, y + r * 0.8); ctx.bezierCurveTo(x - r * 1.2, y - r * 0.2, x - r * 0.8, topY - r * 0.6, x, topY + r * 0.2); ctx.bezierCurveTo(x + r * 0.8, topY - r * 0.6, x + r * 1.2, y - r * 0.2, x, y + r * 0.8); ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, r * 0.1); ctx.stroke(); },
    'skull': () => { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y - r * 0.15, r * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - r * 0.5, y + r * 0.3, r, r * 0.4); ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.arc(x + r * 0.3, y - r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - r * 0.15, y + r * 0.25); ctx.lineTo(x, y + r * 0.4); ctx.lineTo(x + r * 0.15, y + r * 0.25); ctx.closePath(); ctx.fill(); },
    'crown-small': () => { ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.moveTo(x - r, y + r * 0.5); ctx.lineTo(x - r, y - r * 0.3); ctx.lineTo(x - r * 0.5, y + r * 0.1); ctx.lineTo(x, y - r * 0.6); ctx.lineTo(x + r * 0.5, y + r * 0.1); ctx.lineTo(x + r, y - r * 0.3); ctx.lineTo(x + r, y + r * 0.5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#FF0000'; ctx.beginPath(); ctx.arc(x, y - r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill(); },
    'sword': () => { ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 4); ctx.fillStyle = '#C0C0C0'; ctx.fillRect(-r * 0.1, -r, r * 0.2, r * 1.4); ctx.beginPath(); ctx.moveTo(-r * 0.1, -r); ctx.lineTo(0, -r * 1.3); ctx.lineTo(r * 0.1, -r); ctx.fill(); ctx.fillStyle = '#8B4513'; ctx.fillRect(-r * 0.35, r * 0.4, r * 0.7, r * 0.15); ctx.fillRect(-r * 0.1, r * 0.4, r * 0.2, r * 0.5); ctx.restore(); },
    'shield-small': () => { ctx.fillStyle = '#4169E1'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r, y - r, x + r, y); ctx.quadraticCurveTo(x + r, y + r * 0.8, x, y + r); ctx.quadraticCurveTo(x - r, y + r * 0.8, x - r, y); ctx.quadraticCurveTo(x - r, y - r, x, y - r); ctx.fill(); ctx.strokeStyle = '#FFD700'; ctx.lineWidth = Math.max(1, r * 0.1); ctx.stroke(); ctx.fillStyle = '#FFD700'; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = (i * 72 - 90) * Math.PI / 180; const a2 = ((i * 72) + 36 - 90) * Math.PI / 180; ctx.lineTo(x + r * 0.35 * Math.cos(a), y + r * 0.35 * Math.sin(a)); ctx.lineTo(x + r * 0.15 * Math.cos(a2), y + r * 0.15 * Math.sin(a2)); } ctx.closePath(); ctx.fill(); },
    'gem-small': () => { ctx.fillStyle = '#00BFFF'; ctx.beginPath(); ctx.moveTo(x, y - r * 0.8); ctx.lineTo(x + r * 0.8, y - r * 0.1); ctx.lineTo(x + r * 0.5, y + r * 0.8); ctx.lineTo(x - r * 0.5, y + r * 0.8); ctx.lineTo(x - r * 0.8, y - r * 0.1); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#87CEEB'; ctx.beginPath(); ctx.moveTo(x, y - r * 0.8); ctx.lineTo(x + r * 0.3, y - r * 0.1); ctx.lineTo(x, y + r * 0.8); ctx.lineTo(x - r * 0.3, y - r * 0.1); ctx.closePath(); ctx.fill(); },
    'ghost': () => { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 0.7, Math.PI, 0); ctx.lineTo(x + r * 0.7, y + r * 0.6); for (let i = 0; i < 3; i++) { const bx = x + r * 0.7 - (i * r * 0.47); ctx.quadraticCurveTo(bx - r * 0.12, y + r * (i % 2 === 0 ? 0.9 : 0.4), bx - r * 0.47, y + r * 0.6); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.25, r * 0.12, 0, Math.PI * 2); ctx.arc(x + r * 0.2, y - r * 0.25, r * 0.12, 0, Math.PI * 2); ctx.fill(); },
    'rocket': () => { ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#E0E0E0'; ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.5, -r * 0.5, r * 0.4, r * 0.4); ctx.lineTo(-r * 0.4, r * 0.4); ctx.quadraticCurveTo(-r * 0.5, -r * 0.5, 0, -r); ctx.fill(); ctx.fillStyle = '#FF4500'; ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.2); ctx.lineTo(-r * 0.7, r * 0.6); ctx.lineTo(-r * 0.3, r * 0.4); ctx.fill(); ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.2); ctx.lineTo(r * 0.7, r * 0.6); ctx.lineTo(r * 0.3, r * 0.4); ctx.fill(); ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.4); ctx.lineTo(0, r * 0.9); ctx.lineTo(r * 0.15, r * 0.4); ctx.fill(); ctx.fillStyle = '#00BFFF'; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.restore(); },
    'vip-diamond-sword': () => { ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 4); ctx.fillStyle = '#00CED1'; ctx.fillRect(-r * 0.12, -r * 1.1, r * 0.24, r * 1.5); ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 1.1); ctx.lineTo(0, -r * 1.4); ctx.lineTo(r * 0.12, -r * 1.1); ctx.fill(); ctx.fillStyle = '#FFD700'; ctx.fillRect(-r * 0.4, r * 0.4, r * 0.8, r * 0.12); ctx.fillStyle = '#8B4513'; ctx.fillRect(-r * 0.1, r * 0.4, r * 0.2, r * 0.5); ctx.restore(); },
    'vip-crown-gold': () => { ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.moveTo(x - r, y + r * 0.5); ctx.lineTo(x - r, y - r * 0.3); ctx.lineTo(x - r * 0.5, y + r * 0.1); ctx.lineTo(x, y - r * 0.6); ctx.lineTo(x + r * 0.5, y + r * 0.1); ctx.lineTo(x + r, y - r * 0.3); ctx.lineTo(x + r, y + r * 0.5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#DAA520'; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke(); for (const [px, py] of [[x - r * 0.65, y - r * 0.15], [x, y - r * 0.45], [x + r * 0.65, y - r * 0.15]]) { ctx.fillStyle = '#FF0000'; ctx.beginPath(); ctx.arc(px, py, r * 0.12, 0, Math.PI * 2); ctx.fill(); } },
    'vip-neon-star': () => { ctx.shadowColor = '#00FF00'; ctx.shadowBlur = r * 0.8; ctx.fillStyle = '#00FF00'; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = (i * 72 - 90) * Math.PI / 180; const a2 = ((i * 72) + 36 - 90) * Math.PI / 180; ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); ctx.lineTo(x + r * 0.4 * Math.cos(a2), y + r * 0.4 * Math.sin(a2)); } ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; },
    'vip-dragon': () => { ctx.fillStyle = '#228B22'; ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - r * 0.3, y - r * 0.6); ctx.lineTo(x - r * 0.7, y - r); ctx.lineTo(x - r * 0.1, y - r * 0.5); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + r * 0.3, y - r * 0.6); ctx.lineTo(x + r * 0.7, y - r); ctx.lineTo(x + r * 0.1, y - r * 0.5); ctx.fill(); ctx.fillStyle = '#FF4500'; ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.arc(x + r * 0.2, y - r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FF6347'; ctx.beginPath(); ctx.moveTo(x - r * 0.1, y + r * 0.3); ctx.lineTo(x, y + r * 0.8); ctx.lineTo(x + r * 0.1, y + r * 0.3); ctx.fill(); },
    'vip-phoenix': () => { ctx.fillStyle = '#FF4500'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r, y - r * 0.3, x + r * 0.6, y + r * 0.3); ctx.quadraticCurveTo(x + r * 1.2, y + r, x + r * 0.4, y + r); ctx.lineTo(x, y + r * 0.5); ctx.lineTo(x - r * 0.4, y + r); ctx.quadraticCurveTo(x - r * 1.2, y + r, x - r * 0.6, y + r * 0.3); ctx.quadraticCurveTo(x - r, y - r * 0.3, x, y - r); ctx.fill(); ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.moveTo(x, y - r * 0.5); ctx.quadraticCurveTo(x + r * 0.5, y, x + r * 0.3, y + r * 0.5); ctx.lineTo(x, y + r * 0.2); ctx.lineTo(x - r * 0.3, y + r * 0.5); ctx.quadraticCurveTo(x - r * 0.5, y, x, y - r * 0.5); ctx.fill(); },
    'vip-magic': () => { ctx.fillStyle = '#FFD700'; ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 6); const w = r * 0.12; ctx.fillRect(-w, -r * 1.2, w * 2, r * 2.4); ctx.restore(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); const sr = r * 0.5; for (let i = 0; i < 5; i++) { const a = (i * 72 - 90) * Math.PI / 180; const a2 = ((i * 72) + 36 - 90) * Math.PI / 180; ctx.lineTo(x - r * 0.4 + sr * Math.cos(a), y - r * 0.8 + sr * Math.sin(a)); ctx.lineTo(x - r * 0.4 + sr * 0.4 * Math.cos(a2), y - r * 0.8 + sr * 0.4 * Math.sin(a2)); } ctx.closePath(); ctx.fill(); },
    'vip-crystal': () => { ctx.fillStyle = '#9932CC'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.6, y); ctx.lineTo(x + r * 0.4, y + r); ctx.lineTo(x - r * 0.4, y + r); ctx.lineTo(x - r * 0.6, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#BA55D3'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.15, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.15, y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#DDA0DD'; ctx.lineWidth = Math.max(1, r * 0.05); ctx.stroke(); },
    'vip-thunder': () => { ctx.fillStyle = '#1C1C3A'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.moveTo(x + r * 0.15, y - r * 0.7); ctx.lineTo(x - r * 0.35, y + r * 0.05); ctx.lineTo(x + r * 0.05, y + r * 0.05); ctx.lineTo(x - r * 0.15, y + r * 0.7); ctx.lineTo(x + r * 0.4, y - r * 0.05); ctx.lineTo(x, y - r * 0.05); ctx.closePath(); ctx.fill(); },
    'vip-galaxy': () => { ctx.fillStyle = '#0D0D2B'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); const colors = ['#FFFFFF', '#FFD700', '#87CEEB', '#FF69B4']; for (let i = 0; i < 12; i++) { ctx.fillStyle = colors[i % colors.length]; const sx = x + (Math.sin(i * 2.3) * r * 0.7); const sy = y + (Math.cos(i * 3.1) * r * 0.7); ctx.beginPath(); ctx.arc(sx, sy, Math.max(1, r * 0.06), 0, Math.PI * 2); ctx.fill(); } ctx.strokeStyle = '#8A2BE2'; ctx.lineWidth = Math.max(1, r * 0.06); ctx.beginPath(); ctx.ellipse(x, y, r * 0.7, r * 0.3, Math.PI / 6, 0, Math.PI * 2); ctx.stroke(); },
    'vip-rainbow': () => { const rColors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF']; for (let i = 0; i < 7; i++) { ctx.strokeStyle = rColors[i]; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.arc(x, y + r * 0.3, r * (1 - i * 0.1), Math.PI, 0); ctx.stroke(); } }
  };

  const fn = drawFns[stickerDef.id];
  if (fn) {
    fn();
  } else {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 - 90) * Math.PI / 180;
      const a2 = ((i * 72) + 36 - 90) * Math.PI / 180;
      ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
      ctx.lineTo(x + r * 0.4 * Math.cos(a2), y + r * 0.4 * Math.sin(a2));
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export async function generateCustomRankCard(member, userData, progress, boostsText = '') {
  const rand = createSeededRandom(userSeedFromId(member?.id || member?.user?.id || '0'));
  const custom = userData?.rankcard_custom || {};
  const svcData = await getRankcardServiceData();
  const resOption = svcData.RESOLUTION_OPTIONS.find(r => r.id === (custom.resolution || 'standard')) || svcData.RESOLUTION_OPTIONS[0];
  const cardW = resOption.width;
  const cardH = resOption.height;
  const scale = cardW / 800;

  const canvas = createCanvas(cardW, cardH);
  const ctx = canvas.getContext('2d');

  const bgColor = custom.backgroundColor || '#36393F';
  const accentColor = custom.accentColor || '#5865F2';
  const textColor = custom.textColor || '#FFFFFF';
  const barColor = custom.barColor || accentColor;

  if (custom.backgroundId) {
    drawPresetBackground(ctx, cardW, cardH, custom.backgroundId, rand);
  } else {
    const colors = {
      gradient: [
        { pos: 0, color: bgColor },
        { pos: 0.5, color: shadeColor(bgColor, 0.9) },
        { pos: 1, color: shadeColor(bgColor, 0.7) }
      ]
    };
    drawPixelatedGradientBackground(ctx, cardW, cardH, colors.gradient, rand);
  }

  if (custom.useNeonPalette) {
    drawNeonGlow(ctx, cardW, cardH, rand);
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  for (let i = 0; i < cardH; i += 4) {
    if (i % 8 === 0) ctx.fillRect(0, i, cardW, 2);
  }

  drawPixelBorder(ctx, 0, 0, cardW, cardH, accentColor, Math.round(6 * scale));
  drawPixelBorder(ctx, Math.round(8 * scale), Math.round(8 * scale), cardW - Math.round(16 * scale), cardH - Math.round(16 * scale), 'rgba(0,0,0,0.3)', 2);

  if (custom.drawLayer && typeof custom.drawLayer === 'string' && custom.drawLayer.startsWith('data:image/png;base64,')) {
    try {
      const drawImg = await loadImage(custom.drawLayer);
      ctx.drawImage(drawImg, 0, 0, cardW, cardH);
    } catch (e) {
      console.error('Error loading drawLayer:', e);
    }
  }

  const baseImages = custom.baseImages || [];
  const logos = custom.logos || [];

  for (const img of baseImages) {
    try {
      let imgSource = img.url;
      if (typeof imgSource === 'string' && imgSource.startsWith('data:image/')) {
        const b64Data = imgSource.split(',')[1];
        if (b64Data) imgSource = Buffer.from(b64Data, 'base64');
      }
      const image = await loadImage(imgSource);
      ctx.drawImage(image, (img.x || 0) * scale, (img.y || 0) * scale, (img.width || 100) * scale, (img.height || 100) * scale);
    } catch (e) {
      console.error('Error loading base image:', e);
    }
  }

  try {
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);
    const avatarSize = Math.round(140 * scale);
    const avatarX = Math.round(35 * scale);
    const avatarY = Math.round((cardH - avatarSize) / 2);

    ctx.fillStyle = accentColor;
    ctx.fillRect(avatarX - 6, avatarY - 6, avatarSize + 12, avatarSize + 12);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(avatarX - 4, avatarY - 4, avatarSize + 8, avatarSize + 8);
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } catch (e) {
    console.error('Error loading avatar:', e);
  }

  for (const logo of logos) {
    try {
      let imgSource = logo.url;
      if (typeof imgSource === 'string' && imgSource.startsWith('data:image/')) {
        const b64Data = imgSource.split(',')[1];
        if (b64Data) imgSource = Buffer.from(b64Data, 'base64');
      }
      const image = await loadImage(imgSource);
      ctx.drawImage(image, (logo.x || 0) * scale, (logo.y || 0) * scale, (logo.width || 50) * scale, (logo.height || 50) * scale);
    } catch (e) {
      console.error('Error loading logo:', e);
    }
  }

  const allStickers = [...svcData.STANDARD_STICKERS, ...svcData.VIP_STICKERS];
  if (custom.stickers && custom.stickers.length > 0) {
    for (const sticker of custom.stickers) {
      drawStickerOnCanvas(ctx, { ...sticker, x: sticker.x * scale, y: sticker.y * scale, scale: (sticker.scale || 1) * scale }, allStickers);
    }
  }

  const textX = Math.round(210 * scale);
  const shadowOffset = 2;
  const fontStyle = getFontString(custom.fontId, Math.round((FONT_MAP[custom.fontId]?.size || 28) * scale));

  ctx.font = fontStyle;
  ctx.fillStyle = '#000000';
  ctx.fillText(member.user.username, textX + shadowOffset, Math.round(60 * scale) + shadowOffset);
  ctx.fillStyle = textColor;
  ctx.fillText(member.user.username, textX, Math.round(60 * scale));

  ctx.font = `bold ${Math.round(22 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = '#000000';
  ctx.fillText(`NIVEL ${userData.level}`, textX + shadowOffset, Math.round(100 * scale) + shadowOffset);
  ctx.fillStyle = accentColor;
  ctx.fillText(`NIVEL ${userData.level}`, textX, Math.round(100 * scale));

  const xpText = `XP: ${Math.floor(progress.current)} / ${Math.floor(progress.needed)}`;
  ctx.font = `${Math.round(18 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = '#000000';
  ctx.fillText(xpText, textX + 1, Math.round(130 * scale) + 1);
  ctx.fillStyle = textColor;
  ctx.fillText(xpText, textX, Math.round(130 * scale));

  const barX = textX;
  const barY = Math.round(150 * scale);
  const barWidth = Math.round(540 * scale);
  const barHeight = Math.round(28 * scale);

  ctx.fillStyle = shadeColor(bgColor, 0.5);
  ctx.fillRect(barX, barY, barWidth, barHeight);
  const progressWidth = Math.max(8, (progress.percentage / 100) * barWidth);
  const gradient = ctx.createLinearGradient(barX, 0, barX + progressWidth, 0);
  gradient.addColorStop(0, barColor);
  gradient.addColorStop(1, shadeColor(barColor, 1.2));
  ctx.fillStyle = gradient;
  ctx.fillRect(barX + 2, barY + 2, progressWidth - 4, barHeight - 4);

  ctx.fillStyle = accentColor;
  ctx.fillRect(barX, barY, barWidth, 3);
  ctx.fillRect(barX, barY + barHeight - 3, barWidth, 3);
  ctx.fillRect(barX, barY, 3, barHeight);
  ctx.fillRect(barX + barWidth - 3, barY, 3, barHeight);

  ctx.fillStyle = textColor;
  ctx.font = `bold ${Math.round(14 * scale)}px Arial, sans-serif`;
  const percentText = `${Math.floor(progress.percentage)}%`;
  ctx.fillText(percentText, barX + (barWidth - ctx.measureText(percentText).width) / 2, barY + Math.round(19 * scale));

  if (boostsText && boostsText.trim() !== '') {
    ctx.fillStyle = '#00FF00';
    ctx.fillText(`🚀 ${boostsText}`, textX, barY + barHeight + Math.round(25 * scale));
  }

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(cardW - Math.round(130 * scale), cardH - Math.round(35 * scale), Math.round(120 * scale), Math.round(25 * scale));
  ctx.fillStyle = accentColor;
  ctx.font = `bold ${Math.round(12 * scale)}px Arial, sans-serif`;
  ctx.fillText('CUSTOM', cardW - Math.round(125 * scale), cardH - Math.round(17 * scale));

  return canvas.toBuffer('image/png');
}

function shadeColor(color, factor) {
  let hex = color.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = Math.min(255, Math.floor(parseInt(hex.slice(0, 2), 16) * factor));
  const g = Math.min(255, Math.floor(parseInt(hex.slice(2, 4), 16) * factor));
  const b = Math.min(255, Math.floor(parseInt(hex.slice(4, 6), 16) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function drawNeonGlow(ctx, width, height, rand) {
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 20; i++) {
    const x = rand() * width;
    const y = rand() * height;
    ctx.fillStyle = ['#FF00FF', '#00FFFF', '#00FF00'][Math.floor(rand() * 3)];
    ctx.fillRect(x, y, 4, 4);
  }
  ctx.globalAlpha = 1;
}

export async function generateRankCard(member, userData, progress, boostsText = '') {
  if (userData?.rankcard_custom && typeof userData.rankcard_custom === 'object') {
    return generateCustomRankCard(member, userData, progress, boostsText);
  }

  const rand = createSeededRandom(userSeedFromId(member?.id || member?.user?.id || '0'));
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');
  
  const theme = await getCardTheme(member, userData.level, userData.selectedCardTheme, userData.purchasedCards || [], rand);
  const colors = getPixelArtThemeColors(theme);
  
  drawPixelatedGradientBackground(ctx, CARD_WIDTH, CARD_HEIGHT, colors.gradient, rand);
  
  if (colors.stars) {
    drawStars(ctx, CARD_WIDTH, CARD_HEIGHT, rand);
  }

  if (colors.filmGrain) {
    drawCupheadEffects(ctx, CARD_WIDTH, CARD_HEIGHT, rand);
  }

  if (colors.determination) {
    drawUndertaleEffects(ctx, CARD_WIDTH, CARD_HEIGHT, rand);
  }

  if (colors.storm) {
    drawFortniteEffects(ctx, CARD_WIDTH, CARD_HEIGHT, rand);
  }
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  for (let i = 0; i < CARD_HEIGHT; i += 4) {
    if (i % 8 === 0) {
      ctx.fillRect(0, i, CARD_WIDTH, 2);
    }
  }
  
  drawPixelBorder(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, colors.border, 6);
  drawPixelBorder(ctx, 8, 8, CARD_WIDTH - 16, CARD_HEIGHT - 16, 'rgba(0,0,0,0.3)', 2);
  
  try {
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);
    
    const avatarSize = 140;
    const avatarX = 35;
    const avatarY = (CARD_HEIGHT - avatarSize) / 2;
    
    ctx.fillStyle = colors.border;
    ctx.fillRect(avatarX - 6, avatarY - 6, avatarSize + 12, avatarSize + 12);
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(avatarX - 4, avatarY - 4, avatarSize + 8, avatarSize + 8);
    
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    
    ctx.fillStyle = colors.border;
    ctx.fillRect(avatarX, avatarY, avatarSize, 3);
    ctx.fillRect(avatarX, avatarY + avatarSize - 3, avatarSize, 3);
    ctx.fillRect(avatarX, avatarY, 3, avatarSize);
    ctx.fillRect(avatarX + avatarSize - 3, avatarY, 3, avatarSize);
  } catch (error) {
    console.error('Error loading avatar:', error);
  }
  
  const textX = 210;
  const shadowOffset = 2;
  const shadowColor = colors.textShadow || '#000000';
  
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(textX - 5, 35, 560, 35);
  
  // Username with shadow
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillStyle = shadowColor;
  ctx.fillText(member.user.username, textX + shadowOffset, 60 + shadowOffset);
  ctx.fillStyle = colors.text;
  ctx.fillText(member.user.username, textX, 60);
  
  // Level with shadow
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillStyle = shadowColor;
  ctx.fillText(`NIVEL ${userData.level}`, textX + shadowOffset, 100 + shadowOffset);
  ctx.fillStyle = colors.accent;
  ctx.fillText(`NIVEL ${userData.level}`, textX, 100);
  
  // XP text with shadow
  const xpText = `XP: ${Math.floor(progress.current)} / ${Math.floor(progress.needed)}`;
  ctx.font = '18px Arial, sans-serif';
  ctx.fillStyle = shadowColor;
  ctx.fillText(xpText, textX + 1, 130 + 1);
  ctx.fillStyle = colors.text;
  ctx.fillText(xpText, textX, 130);
  
  const barX = textX;
  const barY = 150;
  const barWidth = 540;
  const barHeight = 28;
  
  ctx.fillStyle = colors.barBg;
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX + 2, barY + 2, barWidth - 4, 4);
  
  const progressWidth = Math.max(8, (progress.percentage / 100) * barWidth);
  
  if (colors.barFill.length > 2) {
    const gradient = ctx.createLinearGradient(barX, 0, barX + progressWidth, 0);
    colors.barFill.forEach((color, i) => {
      gradient.addColorStop(i / (colors.barFill.length - 1), color);
    });
    ctx.fillStyle = gradient;
  } else {
    const gradient = ctx.createLinearGradient(barX, 0, barX + progressWidth, 0);
    gradient.addColorStop(0, colors.barFill[0]);
    gradient.addColorStop(1, colors.barFill[1] || colors.barFill[0]);
    ctx.fillStyle = gradient;
  }
  ctx.fillRect(barX + 2, barY + 2, progressWidth - 4, barHeight - 4);
  
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(barX + 2, barY + 2, progressWidth - 4, (barHeight - 4) / 2);
  
  ctx.fillStyle = colors.border;
  ctx.fillRect(barX, barY, barWidth, 3);
  ctx.fillRect(barX, barY + barHeight - 3, barWidth, 3);
  ctx.fillRect(barX, barY, 3, barHeight);
  ctx.fillRect(barX + barWidth - 3, barY, 3, barHeight);
  
  ctx.fillStyle = colors.text;
  ctx.font = 'bold 14px Arial, sans-serif';
  const percentText = `${Math.floor(progress.percentage)}%`;
  const textWidth = ctx.measureText(percentText).width;
  ctx.fillText(percentText, barX + (barWidth - textWidth) / 2, barY + 19);
  
  if (boostsText && boostsText.trim() !== '') {
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText(`🚀 ${boostsText}`, textX, barY + barHeight + 25);
  }
  
  const themeLabel = getThemeLabel(theme);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(CARD_WIDTH - 130, CARD_HEIGHT - 35, 120, 25);
  ctx.fillStyle = colors.accent;
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText(themeLabel, CARD_WIDTH - 125, CARD_HEIGHT - 17);
  
  return canvas.toBuffer('image/png');
}

function getThemeLabel(theme) {
  const labels = {
    discord: '💬 DISCORD',
    pixel: '🎮 PIXEL',
    ocean: '🌊 OCEAN',
    zelda: '⚔️ ZELDA',
    pokemon: '🔥 POKEMON',
    geometrydash: '🎵 GD NEON',
    night: '🌙 NIGHT',
    roblox: '🎲 ROBLOX',
    minecraft: '⛏️ MINECRAFT',
    fnaf: '🐻 FNAF',
    cuphead: '🎪 CUPHEAD',
    undertale: '❤️ UNDERTALE',
    fortnite: '🔫 FORTNITE'
  };
  return labels[theme] || theme.toUpperCase();
}

export async function generateLeaderboardImage(topUsers, guild, theme = 'discord') {
  const canvas = createCanvas(700, 50 + (topUsers.length * 65));
  const ctx = canvas.getContext('2d');
  
  const darkBg = '#2B2D31';
  const lightBg = '#313338';
  const accent = '#FFD700';
  const accentAlt = '#90EE90';
  const textColor = '#FFFFFF';
  const gold = '#FFD700';
  const silver = '#C0C0C0';
  const bronze = '#CD7F32';
  
  ctx.fillStyle = darkBg;
  ctx.fillRect(0, 0, 700, canvas.height);
  
  // Yellow border around entire leaderboard
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 700, 4);
  ctx.fillRect(0, canvas.height - 4, 700, 4);
  ctx.fillRect(0, 0, 4, canvas.height);
  ctx.fillRect(696, 0, 4, canvas.height);
  
  ctx.fillStyle = '#1E1F22';
  ctx.fillRect(0, 0, 700, 50);
  ctx.fillStyle = accent;
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏆 LEADERBOARD 🏆', 350, 35);
  ctx.textAlign = 'left';
  
  const userDataArray = [];
  const usersToFetch = Math.min(10, topUsers.length);
  
  // Fetch all members in parallel
  const memberPromises = topUsers.slice(0, usersToFetch).map(user =>
    guild.members.fetch(user.userId).catch(() => null)
  );
  
  const members = await Promise.all(memberPromises);
  
  // Load all avatars in parallel with timeout
  const loadImageWithTimeout = async (url, timeoutMs = 5000) => {
    return Promise.race([
      loadImage(url).catch(() => null),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)).catch(() => null)
    ]).catch(() => null);
  };
  
  const avatarPromises = members.map((member, i) => {
    if (!member) return Promise.resolve(null);
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 64 });
    return loadImageWithTimeout(avatarURL, 5000);
  });
  
  const avatars = await Promise.all(avatarPromises);
  
  // Build user data array
  for (let i = 0; i < usersToFetch; i++) {
    const user = topUsers[i];
    const member = members[i];
    const username = member ? member.user.username : 'Usuario';
    const avatar = avatars[i];
    userDataArray.push({ user, username, avatar });
  }
  
  // Draw everything
  for (let i = 0; i < userDataArray.length; i++) {
    const { user, username, avatar } = userDataArray[i];
    const y = 50 + (i * 65);
    const isTop3 = i < 3;
    
    // Define ranking colors
    let rankColor, rankBgColor;
    if (i === 0) {
      rankColor = gold;
      rankBgColor = 'rgba(255, 215, 0, 0.2)';
    } else if (i === 1) {
      rankColor = silver;
      rankBgColor = 'rgba(192, 192, 192, 0.15)';
    } else if (i === 2) {
      rankColor = bronze;
      rankBgColor = 'rgba(205, 127, 50, 0.15)';
    } else {
      rankColor = accent;
      rankBgColor = lightBg;
    }
    
    // Draw background - special for top 3
    if (isTop3) {
      ctx.fillStyle = rankBgColor;
      ctx.fillRect(0, y, 700, 62);
      // Border on left with ranking color
      ctx.fillStyle = rankColor;
      ctx.fillRect(0, y, 5, 62);
    } else {
      ctx.fillStyle = rankBgColor;
      ctx.fillRect(0, y, 700, 62);
    }
    
    ctx.fillStyle = accent;
    ctx.fillRect(0, y + 62, 700, 2);
    
    // Draw avatar if loaded
    if (avatar) {
      try {
        ctx.drawImage(avatar, 12, y + 7, 48, 48);
      } catch (error) {
        console.error('Error drawing avatar:', error);
      }
    }
    
    // Medal for top 3
    const medals = ['👑', '🥈', '🥉'];
    ctx.fillStyle = rankColor;
    ctx.font = 'bold 20px Arial, sans-serif';
    if (isTop3) {
      ctx.fillText(medals[i], 68, y + 25);
    } else {
      ctx.fillStyle = textColor;
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText(`#${i + 1}`, 68, y + 20);
    }
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText(`@${username.substring(0, 20)}`, 108, y + 20);
    
    // Level - make it prominent
    const levelSize = isTop3 ? '22px' : '18px';
    ctx.textAlign = 'right';
    
    // Draw level with background box for top 3
    if (isTop3) {
      const levelText = `LVL: ${user.level}`;
      const levelMetrics = ctx.measureText(levelText);
      const boxWidth = levelMetrics.width + 12;
      const boxHeight = 28;
      const boxX = 700 - boxWidth - 8;
      const boxY = y + 5;
      
      // Box background with ranking color
      ctx.fillStyle = rankColor.replace(')', ', 0.3)').replace('#', 'rgba(');
      if (rankColor.startsWith('#')) {
        const rgb = hexToRgb(rankColor);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
      }
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.fillStyle = rankColor;
      ctx.fillRect(boxX, boxY, boxWidth, 3);
      
      // Level text
      ctx.fillStyle = rankColor;
      ctx.font = `bold ${levelSize} Arial, sans-serif`;
      ctx.fillText(levelText, 680, y + 23);
    } else {
      ctx.fillStyle = accent;
      ctx.font = `bold 16px Arial, sans-serif`;
      ctx.fillText(`LVL: ${user.level}`, 680, y + 20);
    }
    
    ctx.textAlign = 'left';
  }
  
  return canvas.toBuffer('image/png');
}

export async function generateMinecraftLeaderboard(topUsers, guild) {
  const rand = createSeededRandom(42);
  const canvas = createCanvas(700, 760);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#8B8B8B';
  ctx.fillRect(0, 0, 700, 760);
  
  const dirtColors = ['#8B5A2B', '#6B4226', '#5D3A1A', '#7A4A23'];
  const pixelSize = 16;
  
  for (let y = 0; y < 760; y += pixelSize) {
    for (let x = 0; x < 700; x += pixelSize) {
      ctx.fillStyle = dirtColors[Math.floor(rand() * dirtColors.length)];
      ctx.fillRect(x, y, pixelSize, pixelSize);
    }
  }
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(20, 20, 660, 720);
  
  ctx.fillStyle = '#555555';
  ctx.fillRect(18, 18, 664, 724);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(20, 20, 660, 720);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚔️ TOP 100+ LEGENDS ⚔️', 350, 55);
  ctx.textAlign = 'left';
  
  ctx.fillStyle = '#AAAAAA';
  ctx.fillRect(40, 70, 620, 2);
  
  const usersToFetch = Math.min(10, topUsers.length);
  const memberPromises = topUsers.slice(0, usersToFetch).map(user =>
    guild.members.fetch(user.userId).catch(() => null)
  );
  const members = await Promise.all(memberPromises);
  
  const loadImageWithTimeout = async (url, timeoutMs = 5000) => {
    return Promise.race([
      loadImage(url).catch(() => null),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)).catch(() => null)
    ]).catch(() => null);
  };
  
  const avatarPromises = members.map((member, i) => {
    if (!member) return Promise.resolve(null);
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 64 });
    return loadImageWithTimeout(avatarURL, 5000);
  });
  
  const avatars = await Promise.all(avatarPromises);
  
  for (let i = 0; i < usersToFetch; i++) {
    const user = topUsers[i];
    const member = members[i];
    const avatar = avatars[i];
    const y = 90 + (i * 62);
    
    ctx.fillStyle = i % 2 === 0 ? 'rgba(100, 100, 100, 0.3)' : 'rgba(60, 60, 60, 0.3)';
    ctx.fillRect(30, y, 640, 56);
    
    let rankColor;
    if (i === 0) rankColor = '#FFD700';
    else if (i === 1) rankColor = '#C0C0C0';
    else if (i === 2) rankColor = '#CD7F32';
    else rankColor = '#55FF55';
    
    ctx.fillStyle = rankColor;
    ctx.fillRect(30, y, 4, 56);
    
    if (avatar) {
      try {
        ctx.fillStyle = '#333333';
        ctx.fillRect(42, y + 6, 46, 46);
        ctx.drawImage(avatar, 44, y + 8, 42, 42);
      } catch (error) {
        console.error('Error drawing avatar:', error);
      }
    }
    
    const medals = ['👑', '⚔️', '🛡️'];
    ctx.fillStyle = rankColor;
    ctx.font = 'bold 20px Arial, sans-serif';
    if (i < 3) {
      ctx.fillText(medals[i], 100, y + 36);
    } else {
      ctx.fillText(`#${i + 1}`, 100, y + 36);
    }
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial, sans-serif';
    const username = member ? member.user.username : 'Steve';
    ctx.fillText(username.substring(0, 18), 150, y + 36);
    
    ctx.fillStyle = '#55FF55';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText(`LVL ${user.level}`, 530, y + 28);
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText(`${(user.totalXp || 0).toLocaleString()} XP`, 530, y + 46);
  }
  
  ctx.fillStyle = '#555555';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Minecraft 1.12 Style - Elite Players', 350, 740);
  ctx.textAlign = 'left';
  
  return canvas.toBuffer('image/png');
}

export async function generatePokemonLeaderboard(topUsers, guild) {
  const rand = createSeededRandom(43);
  const canvas = createCanvas(700, 760);
  const ctx = canvas.getContext('2d');
  
  const pokemonColors = ['#FF6B35', '#FF4500', '#FFD700', '#FF8C00'];
  const pixelSize = 16;
  
  for (let y = 0; y < 760; y += pixelSize) {
    for (let x = 0; x < 700; x += pixelSize) {
      ctx.fillStyle = pokemonColors[Math.floor(rand() * pokemonColors.length)];
      ctx.fillRect(x, y, pixelSize, pixelSize);
    }
  }
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(20, 20, 660, 720);
  
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(18, 18, 664, 724);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(20, 20, 660, 720);
  
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔥 POKEMON MASTERS 🔥', 350, 55);
  ctx.textAlign = 'left';
  
  ctx.fillStyle = '#FF4500';
  ctx.fillRect(40, 70, 620, 2);
  
  const usersToFetch = Math.min(10, topUsers.length);
  const memberPromises = topUsers.slice(0, usersToFetch).map(user =>
    guild.members.fetch(user.userId).catch(() => null)
  );
  const members = await Promise.all(memberPromises);
  
  const loadImageWithTimeout = async (url, timeoutMs = 5000) => {
    return Promise.race([
      loadImage(url).catch(() => null),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)).catch(() => null)
    ]).catch(() => null);
  };
  
  const avatarPromises = members.map((member, i) => {
    if (!member) return Promise.resolve(null);
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 64 });
    return loadImageWithTimeout(avatarURL, 5000);
  });
  
  const avatars = await Promise.all(avatarPromises);
  
  for (let i = 0; i < usersToFetch; i++) {
    const user = topUsers[i];
    const member = members[i];
    const avatar = avatars[i];
    const y = 90 + (i * 62);
    
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 100, 50, 0.15)' : 'rgba(255, 215, 0, 0.1)';
    ctx.fillRect(30, y, 640, 56);
    
    let rankColor;
    if (i === 0) rankColor = '#FFD700';
    else if (i === 1) rankColor = '#C0C0C0';
    else if (i === 2) rankColor = '#CD7F32';
    else rankColor = '#FF4500';
    
    ctx.fillStyle = rankColor;
    ctx.fillRect(30, y, 4, 56);
    
    if (avatar) {
      try {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(42, y + 6, 46, 46);
        ctx.drawImage(avatar, 44, y + 8, 42, 42);
      } catch (error) {
        console.error('Error drawing avatar:', error);
      }
    }
    
    const medals = ['🏆', '⚡', '🌟'];
    ctx.fillStyle = rankColor;
    ctx.font = 'bold 20px Arial, sans-serif';
    if (i < 3) {
      ctx.fillText(medals[i], 100, y + 36);
    } else {
      ctx.fillText(`#${i + 1}`, 100, y + 36);
    }
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial, sans-serif';
    const username = member ? member.user.username : 'Trainer';
    ctx.fillText(username.substring(0, 18), 150, y + 36);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText(`LVL ${user.level}`, 530, y + 28);
    ctx.fillStyle = '#FF8C00';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText(`${(user.totalXp || 0).toLocaleString()} XP`, 530, y + 46);
  }
  
  ctx.fillStyle = '#FF4500';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Pokemon Style - Elite Trainers 100+', 350, 740);
  ctx.textAlign = 'left';
  
  return canvas.toBuffer('image/png');
}

export async function generateZeldaLeaderboard(topUsers, guild) {
  const rand = createSeededRandom(44);
  const canvas = createCanvas(700, 760);
  const ctx = canvas.getContext('2d');
  
  const zeldaColors = ['#90EE90', '#228B22', '#FFD700', '#2F4F2F'];
  const pixelSize = 16;
  
  for (let y = 0; y < 760; y += pixelSize) {
    for (let x = 0; x < 700; x += pixelSize) {
      ctx.fillStyle = zeldaColors[Math.floor(rand() * zeldaColors.length)];
      ctx.fillRect(x, y, pixelSize, pixelSize);
    }
  }
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(20, 20, 660, 720);
  
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(18, 18, 664, 724);
  ctx.fillStyle = '#1a2f1a';
  ctx.fillRect(20, 20, 660, 720);
  
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚔️ HEROES OF HYRULE ⚔️', 350, 55);
  ctx.textAlign = 'left';
  
  ctx.fillStyle = '#98FB98';
  ctx.fillRect(40, 70, 620, 2);
  
  for (let i = 0; i < Math.min(10, topUsers.length); i++) {
    const user = topUsers[i];
    const y = 90 + (i * 62);
    
    ctx.fillStyle = i % 2 === 0 ? 'rgba(144, 238, 144, 0.15)' : 'rgba(255, 215, 0, 0.1)';
    ctx.fillRect(30, y, 640, 56);
    
    let rankColor;
    if (i === 0) rankColor = '#FFD700';
    else if (i === 1) rankColor = '#C0C0C0';
    else if (i === 2) rankColor = '#CD7F32';
    else rankColor = '#98FB98';
    
    ctx.fillStyle = rankColor;
    ctx.fillRect(30, y, 4, 56);
    
    try {
      const member = await guild.members.fetch(user.userId).catch(() => null);
      if (member) {
        const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 64 });
        const avatar = await loadImage(avatarURL);
        
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(42, y + 6, 46, 46);
        ctx.drawImage(avatar, 44, y + 8, 42, 42);
      }
    } catch (error) {
      console.error('Error loading avatar:', error);
    }
    
    const medals = ['🏆', '🗡️', '🛡️'];
    ctx.fillStyle = rankColor;
    ctx.font = 'bold 20px Arial, sans-serif';
    if (i < 3) {
      ctx.fillText(medals[i], 100, y + 36);
    } else {
      ctx.fillText(`#${i + 1}`, 100, y + 36);
    }
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial, sans-serif';
    let username = 'Hero';
    try {
      const member = await guild.members.fetch(user.userId).catch(() => null);
      if (member) {
        username = member.user.username;
      }
    } catch (e) {}
    ctx.fillText(username.substring(0, 18), 150, y + 36);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText(`LVL ${user.level}`, 530, y + 28);
    ctx.fillStyle = '#98FB98';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText(`${(user.totalXp || 0).toLocaleString()} XP`, 530, y + 46);
  }
  
  ctx.fillStyle = '#98FB98';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Zelda Style - Super Activos', 350, 740);
  ctx.textAlign = 'left';
  
  return canvas.toBuffer('image/png');
}

export async function generateEconomyLeaderboardImage(leaderboard, client, type, guildName) {
  const width = 800;
  const height = 620;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const typeColors = {
    'lagcoins': {
      gradient: [
        { pos: 0, color: '#FFD700' },
        { pos: 0.5, color: '#DAA520' },
        { pos: 1, color: '#B8860B' }
      ],
      border: '#FFD700',
      accent: '#FFF8DC'
    },
    'casino': {
      gradient: [
        { pos: 0, color: '#8B0000' },
        { pos: 0.5, color: '#DC143C' },
        { pos: 1, color: '#4B0000' }
      ],
      border: '#FF0000',
      accent: '#FF6B6B'
    },
    'minigames': {
      gradient: [
        { pos: 0, color: '#2E8B57' },
        { pos: 0.5, color: '#3CB371' },
        { pos: 1, color: '#1E5631' }
      ],
      border: '#00FF00',
      accent: '#98FB98'
    },
    'trades': {
      gradient: [
        { pos: 0, color: '#4169E1' },
        { pos: 0.5, color: '#1E90FF' },
        { pos: 1, color: '#00008B' }
      ],
      border: '#00BFFF',
      accent: '#87CEEB'
    }
  };
  
  const colors = typeColors[type] || typeColors['lagcoins'];
  
  const rand = createSeededRandom(45);
  drawPixelatedGradientBackground(ctx, width, height, colors.gradient, rand);
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for (let i = 0; i < height; i += 4) {
    if (i % 8 === 0) {
      ctx.fillRect(0, i, width, 2);
    }
  }
  
  drawPixelBorder(ctx, 0, 0, width, height, colors.border, 6);
  
  const titles = {
    'lagcoins': { title: '💰 TOP RICOS 💰', emoji: '💰' },
    'casino': { title: '🎰 CASINO MASTERS 🎰', emoji: '🎰' },
    'minigames': { title: '🎮 GAME CHAMPIONS 🎮', emoji: '🏆' },
    'trades': { title: '🤝 TOP TRADERS 🤝', emoji: '🤝' }
  };
  
  const config = titles[type] || titles['lagcoins'];
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(config.title, width / 2, 45);
  
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText(guildName, width / 2, 70);
  ctx.textAlign = 'left';
  
  ctx.fillStyle = colors.border;
  ctx.fillRect(40, 80, width - 80, 4);
  
  const startY = 100;
  const rowHeight = 50;
  
  for (let i = 0; i < Math.min(leaderboard.length, 10); i++) {
    const user = leaderboard[i];
    const y = startY + (i * rowHeight);
    
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(25, y, width - 50, 45);
    
    let rankColor;
    if (i === 0) rankColor = '#FFD700';
    else if (i === 1) rankColor = '#C0C0C0';
    else if (i === 2) rankColor = '#CD7F32';
    else rankColor = colors.accent;
    
    ctx.fillStyle = rankColor;
    ctx.fillRect(25, y, 4, 45);
    
    const medals = ['👑', '🥈', '🥉'];
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = rankColor;
    if (i < 3) {
      ctx.fillText(medals[i], 45, y + 30);
    } else {
      ctx.fillText(`#${i + 1}`, 45, y + 30);
    }
    
    try {
      const discordUser = await client.users.fetch(user.userId);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText(discordUser.username.substring(0, 20), 100, y + 30);
    } catch {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText(`User ${user.userId.substring(0, 8)}...`, 100, y + 30);
    }
    
    ctx.textAlign = 'right';
    ctx.fillStyle = colors.accent;
    ctx.font = 'bold 16px Arial, sans-serif';
    
    let valueText = '';
    switch (type) {
      case 'lagcoins':
        valueText = `${user.totalWealth.toLocaleString()} ${config.emoji}`;
        break;
      case 'casino':
        const sign = user.casinoProfit >= 0 ? '+' : '';
        valueText = `${sign}${user.casinoProfit.toLocaleString()} ${config.emoji}`;
        break;
      case 'minigames':
        valueText = `${user.minigamesWon} wins ${config.emoji}`;
        break;
      case 'trades':
        valueText = `${user.tradesCompleted + user.auctionsWon} trades ${config.emoji}`;
        break;
    }
    
    ctx.fillText(valueText, width - 45, y + 30);
    ctx.textAlign = 'left';
  }
  
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Pixel Art Style • ${new Date().toLocaleDateString('es-ES')}`, width / 2, height - 15);
  ctx.textAlign = 'left';
  
  return canvas.toBuffer('image/png');
}

export async function generateProfileImage(member, profile, userData) {
  const width = 800;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const colors = getPixelArtThemeColors('pixel');
  const rand = createSeededRandom(userSeedFromId(member?.id || member?.user?.id || '0'));
  
  drawPixelatedGradientBackground(ctx, width, height, colors.gradient, rand);
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for (let i = 0; i < height; i += 4) {
    if (i % 8 === 0) {
      ctx.fillRect(0, i, width, 2);
    }
  }
  
  drawPixelBorder(ctx, 0, 0, width, height, colors.border, 6);
  
  try {
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);
    
    const avatarSize = 120;
    const avatarX = 40;
    const avatarY = 40;
    
    ctx.fillStyle = colors.border;
    ctx.fillRect(avatarX - 4, avatarY - 4, avatarSize + 8, avatarSize + 8);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(avatarX - 2, avatarY - 2, avatarSize + 4, avatarSize + 4);
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } catch (error) {
    console.error('Error loading avatar:', error);
  }
  
  ctx.fillStyle = colors.text;
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText(member.user.username, 180, 80);
  
  ctx.fillStyle = colors.accent;
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText(`Nivel ${userData?.level || 0} • ${(userData?.totalXp || 0).toLocaleString()} XP`, 180, 110);
  
  const sections = [
    { title: '💰 ECONOMIA', items: [
      { label: 'Cartera', value: `${(profile.lagcoins || 0).toLocaleString()} LC` },
      { label: 'Banco', value: `${(profile.bankBalance || 0).toLocaleString()} LC` },
      { label: 'Total', value: `${((profile.lagcoins || 0) + (profile.bankBalance || 0)).toLocaleString()} LC` }
    ]},
    { title: '🎰 CASINO', items: [
      { label: 'Partidas', value: `${profile.casinoStats?.plays || 0}` },
      { label: 'Victorias', value: `${profile.casinoStats?.wins || 0}` },
      { label: 'Beneficio', value: `${((profile.casinoStats?.totalWon || 0) - (profile.casinoStats?.totalLost || 0)).toLocaleString()}` }
    ]},
    { title: '📊 STATS', items: [
      { label: 'Trabajos', value: `${profile.jobStats?.totalJobs || 0}` },
      { label: 'Minijuegos', value: `${profile.minigamesWon || 0}` },
      { label: 'Trades', value: `${profile.tradesCompleted || 0}` }
    ]}
  ];
  
  let sectionX = 40;
  const sectionY = 180;
  const sectionWidth = 230;
  
  for (const section of sections) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(sectionX, sectionY, sectionWidth, 140);
    
    ctx.fillStyle = colors.border;
    ctx.fillRect(sectionX, sectionY, sectionWidth, 3);
    ctx.fillRect(sectionX, sectionY + 137, sectionWidth, 3);
    ctx.fillRect(sectionX, sectionY, 3, 140);
    ctx.fillRect(sectionX + sectionWidth - 3, sectionY, 3, 140);
    
    ctx.fillStyle = colors.accent;
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText(section.title, sectionX + 10, sectionY + 25);
    
    let itemY = sectionY + 50;
    for (const item of section.items) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText(item.label, sectionX + 15, itemY);
      
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillText(item.value, sectionX + 120, itemY);
      
      itemY += 28;
    }
    
    sectionX += sectionWidth + 20;
  }
  
  if (profile.nationality) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(40, 340, 720, 50);
    
    ctx.fillStyle = colors.border;
    ctx.fillRect(40, 340, 720, 3);
    ctx.fillRect(40, 387, 720, 3);
    
    ctx.fillStyle = colors.accent;
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('🌎 NACIONALIDAD', 55, 372);
    
    ctx.fillStyle = colors.text;
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText(`País: ${profile.nationality.country || 'N/A'} • Actual: ${profile.nationality.currentCountry || 'N/A'}`, 200, 372);
  }
  
  if (profile.items && profile.items.length > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(40, 400, 720, 50);
    
    ctx.fillStyle = colors.accent;
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText(`🎒 ITEMS (${profile.items.length})`, 55, 432);
  }
  
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Perfil generado • ${new Date().toLocaleDateString('es-ES')}`, width / 2, height - 15);
  
  return canvas.toBuffer('image/png');
}
