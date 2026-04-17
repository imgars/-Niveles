export const SHOP_ITEMS = {
  xp: [
    { id: 'xp100', name: '100 XP', emoji: '✨', price: 50, xp: 100, description: 'Pequeño impulso de experiencia' },
    { id: 'xp500', name: '500 XP', emoji: '⭐', price: 200, xp: 500, description: 'Buen impulso de experiencia' },
    { id: 'xp1000', name: '1000 XP', emoji: '🌟', price: 350, xp: 1000, description: 'Gran impulso de experiencia' },
    { id: 'xp2500', name: '2500 XP', emoji: '💫', price: 800, xp: 2500, description: 'Mega impulso de experiencia' }
  ],
  niveles: [
    { id: 'level1', name: '1 Nivel', emoji: '📈', price: 450, levels: 1, description: 'Sube un nivel instantaneamente' },
    { id: 'level3', name: '3 Niveles', emoji: '📊', price: 1200, levels: 3, description: 'Sube 3 niveles instantaneamente' },
    { id: 'level5', name: '5 Niveles', emoji: '🚀', price: 1800, levels: 5, description: 'Sube 5 niveles instantaneamente' },
    { id: 'level10', name: '10 Niveles', emoji: '🏆', price: 3300, levels: 10, description: 'Sube 10 niveles instantaneamente' }
  ],
  boosts: [
    { id: 'boost25_12h', name: 'Boost 25% 12h', emoji: '🔥', price: 250, boost: 0.25, hours: 12, description: '+25% XP durante 12 horas' },
    { id: 'boost50_24h', name: 'Boost 50% 24h', emoji: '🔥🔥', price: 400, boost: 0.5, hours: 24, description: '+50% XP durante 24 horas' },
    { id: 'boost75_24h', name: 'Boost 75% 24h', emoji: '🔥🔥🔥', price: 600, boost: 0.75, hours: 24, description: '+75% XP durante 24 horas' },
    { id: 'boost100_48h', name: 'Boost 100% 48h', emoji: '💥', price: 800, boost: 1.0, hours: 48, description: '+100% XP durante 48 horas' },
    { id: 'boost150_24h', name: 'Boost 150% 24h', emoji: '⚡', price: 1000, boost: 1.5, hours: 24, description: '+150% XP durante 24 horas' },
    { id: 'boost200_12h', name: 'Boost 200% 12h', emoji: '⚡⚡', price: 1200, boost: 2.0, hours: 12, description: '+200% XP durante 12 horas' }
  ],
  cajas: [
    { id: 'caja_basica', name: 'Caja Basica', emoji: '📦', price: 100, type: 'lootbox', tier: 'basic', description: 'Contiene entre 50-200 Lagcoins o XP' },
    { id: 'caja_rara', name: 'Caja Rara', emoji: '🎁', price: 300, type: 'lootbox', tier: 'rare', description: 'Contiene entre 150-500 Lagcoins, XP o items' },
    { id: 'caja_epica', name: 'Caja Epica', emoji: '💎', price: 750, type: 'lootbox', tier: 'epic', description: 'Contiene entre 400-1500 Lagcoins, XP, items o boosts' },
    { id: 'caja_legendaria', name: 'Caja Legendaria', emoji: '👑', price: 2000, type: 'lootbox', tier: 'legendary', description: 'Contiene recompensas legendarias!' }
  ],
  cosmeticos: [
    { id: 'titulo_pro', name: 'Titulo PRO', emoji: '🏅', price: 500, type: 'cosmetic', description: 'Muestra [PRO] junto a tu nombre' },
    { id: 'titulo_vip', name: 'Titulo VIP', emoji: '💠', price: 1000, type: 'cosmetic', description: 'Muestra [VIP] junto a tu nombre' },
    { id: 'titulo_elite', name: 'Titulo ELITE', emoji: '👑', price: 2500, type: 'cosmetic', description: 'Muestra [ELITE] junto a tu nombre' },
    { id: 'titulo_legend', name: 'Titulo LEGEND', emoji: '🌟', price: 5000, type: 'cosmetic', description: 'Muestra [LEGEND] junto a tu nombre' },
    { id: 'marco_dorado', name: 'Marco Dorado', emoji: '🖼️', price: 800, type: 'frame', description: 'Marco dorado para tu tarjeta de nivel' },
    { id: 'marco_diamante', name: 'Marco Diamante', emoji: '💎', price: 2000, type: 'frame', description: 'Marco de diamante para tu tarjeta' },
    { id: 'marco_fuego', name: 'Marco de Fuego', emoji: '🔥', price: 1500, type: 'frame', description: 'Marco con efecto de fuego' },
    { id: 'marco_arcoiris', name: 'Marco Arcoiris', emoji: '🌈', price: 3000, type: 'frame', description: 'Marco con colores arcoiris' }
  ],
  proteccion: [
    { id: 'escudo_1h', name: 'Escudo 1h', emoji: '🛡️', price: 100, type: 'shield', hours: 1, description: 'Proteccion contra robos por 1 hora' },
    { id: 'escudo_6h', name: 'Escudo 6h', emoji: '🛡️🛡️', price: 400, type: 'shield', hours: 6, description: 'Proteccion contra robos por 6 horas' },
    { id: 'escudo_24h', name: 'Escudo 24h', emoji: '🔒', price: 1000, type: 'shield', hours: 24, description: 'Proteccion contra robos por 24 horas' },
    { id: 'seguro_robo', name: 'Seguro Anti-Robo', emoji: '📋', price: 2000, type: 'insurance', description: 'Recupera 50% de lo robado automaticamente' }
  ],
  especiales: [
    { id: 'ticket_loteria', name: 'Ticket Loteria', emoji: '🎟️', price: 50, type: 'lottery', description: 'Participa en el sorteo semanal' },
    { id: 'ficha_casino', name: 'Ficha VIP Casino', emoji: '🎰', price: 200, type: 'casino_bonus', description: '+10% ganancias en el casino por 1h' },
    { id: 'pocion_suerte', name: 'Pocion de Suerte', emoji: '🧪', price: 500, type: 'luck', hours: 2, description: '+20% probabilidad en juegos por 2h' },
    { id: 'pergamino_xp', name: 'Pergamino de XP', emoji: '📜', price: 150, type: 'scroll', description: 'Duplica la XP del proximo mensaje' },
    { id: 'amuleto', name: 'Amuleto de Fortuna', emoji: '🔮', price: 1500, type: 'amulet', description: '+15% ganancias en todo por 4h' },
    { id: 'mascota_dragon', name: 'Mascota Dragon', emoji: '🐉', price: 10000, type: 'pet', description: 'Un dragon te acompañara. +5% XP permanente' },
    { id: 'mascota_fenix', name: 'Mascota Fenix', emoji: '🐦‍🔥', price: 15000, type: 'pet', description: 'Un fenix te protegera. Revives con 50% HP en casino' },
    { id: 'reset_cooldowns', name: 'Reset Cooldowns', emoji: '⏰', price: 300, type: 'utility', description: 'Reinicia todos los cooldowns de trabajo' }
  ],
  raros: [
    { id: 'lingote_oro', name: 'Lingote de Oro', emoji: '🪙', price: 5000, type: 'collectible', description: 'Coleccionable raro. Puede aumentar de valor.' },
    { id: 'gema_antigua', name: 'Gema Antigua', emoji: '💠', price: 7500, type: 'collectible', description: 'Gema mistica con poderes ocultos' },
    { id: 'corona_rey', name: 'Corona del Rey', emoji: '👑', price: 25000, type: 'collectible', description: 'Solo los mas ricos pueden tenerla' },
    { id: 'cetro_poder', name: 'Cetro del Poder', emoji: '🔱', price: 50000, type: 'collectible', description: 'Simbolo de maximo poder y riqueza' }
  ]
};

export function getShopItemById(id) {
  for (const category of Object.values(SHOP_ITEMS)) {
    const item = category.find(i => i.id === id);
    if (item) return item;
  }
  return null;
}

export function getShopCategories() {
  return Object.keys(SHOP_ITEMS);
}

export function getItemsByCategory(category) {
  return SHOP_ITEMS[category] || [];
}

export function getAllShopItems() {
  return Object.values(SHOP_ITEMS).flat();
}

export function formatItemPrice(price) {
  if (price >= 1000) {
    return `${(price / 1000).toFixed(1)}k`;
  }
  return price.toString();
}
