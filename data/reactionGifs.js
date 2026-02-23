export const API_ENDPOINT_MAP = {
  hug: 'hug',
  kiss: 'kiss',
  cuddle: 'cuddle',
  pat: 'pat',
  handholding: 'handhold',
  feed: 'feed',
  angry: 'angry',
  baka: 'baka',
  slap: 'slap',
  punch: 'punch',
  bite: 'bite',
  kickbutt: 'kick',
  happy: 'happy',
  laugh: 'laugh',
  smile: 'smile',
  dance: 'dance',
  highfive: 'highfive',
  smug: 'smug',
  cry: 'cry',
  pout: 'pout',
  blush: 'blush',
  facepalm: 'facepalm',
  shrug: 'shrug',
  poke: 'poke',
  tickle: 'tickle',
  stare: 'stare',
  sleep: 'sleep',
  bored: 'bored',
  kill: 'shoot'
};

export const FALLBACK_GIFS = {
  kisscheeks: [
    'https://media1.tenor.com/m/BZyWzw2d5tAAAAAC/hyakkano-100-girlfriends.gif',
    'https://media1.tenor.com/m/YcmB58RVNO4AAAAC/kiss-anime.gif'
  ],
  love: [
    'https://media1.tenor.com/m/UEFGoNHQg2wAAAAC/fullmetal-alchemist-roy-mustang.gif',
    'https://media1.tenor.com/m/sXeE98Z2pYgAAAAC/anime-love.gif'
  ],
  cheeks: [
    'https://media1.tenor.com/m/ubZ4Jwga8YYAAAAC/animes.gif',
    'https://media1.tenor.com/m/nXLOSFW2z2EAAAAC/anime.gif'
  ],
  glare: [
    'https://media1.tenor.com/m/bR7hPXCRs7oAAAAC/anime-angry-stare.gif',
    'https://media1.tenor.com/m/DPrdtMc-FTIAAAAC/annoyed-anime.gif'
  ],
  spank: [
    'https://media1.tenor.com/m/rWBYWqjlE88AAAAC/anime-spank.gif',
    'https://media1.tenor.com/m/o1t4lc2oMnYAAAAC/spank.gif'
  ],
  claps: [
    'https://media1.tenor.com/m/ZMXz63fmavwAAAAC/anime-clap.gif',
    'https://media1.tenor.com/m/nbIDJQBKqVIAAAAC/clap-anime.gif'
  ],
  teehee: [
    'https://media1.tenor.com/m/hFcFKJWLhkEAAAAC/anime-giggle.gif',
    'https://media1.tenor.com/m/dnjnS2mZ36UAAAAC/laughing-anime-girl-anime.gif'
  ],
  sad: [
    'https://media1.tenor.com/m/CJEm2aPh9ckAAAAC/kh%C3%B3c.gif',
    'https://media1.tenor.com/m/qA7EIp-3mK4AAAAC/anime-sad.gif'
  ],
  scared: [
    'https://media1.tenor.com/m/gVoIPMJ9AIoAAAAC/anime-scared.gif',
    'https://media1.tenor.com/m/y-AZGXMP2BgAAAAC/scared-anime.gif'
  ],
  confused: [
    'https://media1.tenor.com/m/OHFV7RJDANAAAAAC/confused-anime.gif',
    'https://media1.tenor.com/m/sHI4LJOUcnwAAAAC/confused-anime.gif'
  ],
  sip: [
    'https://media1.tenor.com/m/7oCaSR-q1kkAAAAC/alice-vt.gif',
    'https://media1.tenor.com/m/GM8-x-rZYSQAAAAC/sipping-tea-sip.gif'
  ],
  lick: [
    'https://media1.tenor.com/m/3XVvFFLiMagAAAAC/anime-lick.gif',
    'https://media1.tenor.com/m/rZYSYUGHQCUAAAAC/anime-lick.gif'
  ],
  gaming: [
    'https://media1.tenor.com/m/jlnb6prcCnMAAAAC/anime-gaming.gif',
    'https://media1.tenor.com/m/IpECLEd9ExMAAAAC/gamer-anime.gif'
  ],
  nani: [
    'https://media1.tenor.com/m/C3Sn7cXy-LUAAAAC/nani-anime.gif',
    'https://media1.tenor.com/m/0oP3k4b5ARUAAAAC/nani-huh.gif'
  ],
  ship: [
    'https://media1.tenor.com/m/_8oadF3hZwIAAAAC/kiss.gif',
    'https://media1.tenor.com/m/sXeE98Z2pYgAAAAC/anime-love.gif'
  ]
};

export async function getGifUrl(reaction) {
  const apiEndpoint = API_ENDPOINT_MAP[reaction];
  if (apiEndpoint) {
    try {
      const response = await fetch(`https://nekos.best/api/v2/${apiEndpoint}`);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results[0]) {
          return data.results[0].url;
        }
      }
    } catch (e) {}
  }

  const fallback = FALLBACK_GIFS[reaction];
  if (fallback && fallback.length > 0) {
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  return null;
}

export const REACTION_MESSAGES = {
  hug: { text: (u, t) => `🤗 **${u}** le da un abrazo a **${t}**`, color: 0xFF69B4, solo: false },
  kiss: { text: (u, t) => `💋 **${u}** le da un beso a **${t}**`, color: 0xFF1493, solo: false },
  kisscheeks: { text: (u, t) => `😚 **${u}** le da un beso en la mejilla a **${t}**`, color: 0xFFB6C1, solo: false },
  cuddle: { text: (u, t) => `🥰 **${u}** se acurruca con **${t}**`, color: 0xFF69B4, solo: false },
  pat: { text: (u, t) => `🤗 **${u}** le da una caricia en la cabeza a **${t}**`, color: 0xFFD700, solo: false },
  handholding: { text: (u, t) => `🤝 **${u}** toma de la mano a **${t}**`, color: 0xFFB6C1, solo: false },
  love: { text: (u, t) => `💖 **${u}** le declara su amor a **${t}**`, color: 0xFF0000, solo: false },
  cheeks: { text: (u, t) => `😊 **${u}** le pellizca los cachetes a **${t}**`, color: 0xFFA07A, solo: false },
  feed: { text: (u, t) => `🍕 **${u}** le da de comer a **${t}**`, color: 0xFF8C00, solo: false },
  angry: { text: (u) => `😤 **${u}** está muy enojado/a`, color: 0xFF0000, solo: true },
  baka: { text: (u, t) => `😡 **${u}** le dice ¡BAKA! a **${t}**`, color: 0xFF4500, solo: false },
  slap: { text: (u, t) => `👋 **${u}** le da una bofetada a **${t}**`, color: 0xFF6347, solo: false },
  punch: { text: (u, t) => `👊 **${u}** le suelta un puñetazo a **${t}**`, color: 0xFF4500, solo: false },
  bite: { text: (u, t) => `😈 **${u}** muerde a **${t}**`, color: 0x8B0000, solo: false },
  kickbutt: { text: (u, t) => `🦶 **${u}** le da una patada en el trasero a **${t}**`, color: 0xFF4500, solo: false },
  glare: { text: (u, t) => `😠 **${u}** mira fijamente con desprecio a **${t}**`, color: 0x8B0000, solo: false },
  kill: { text: (u, t) => `💀 **${u}** elimina a **${t}**`, color: 0x000000, solo: false },
  spank: { text: (u, t) => `🫣 **${u}** le da una nalgada a **${t}**`, color: 0xFF69B4, solo: false },
  happy: { text: (u) => `😄 **${u}** está muy feliz`, color: 0xFFD700, solo: true },
  laugh: { text: (u) => `😂 **${u}** se ríe a carcajadas`, color: 0xFFD700, solo: true },
  smile: { text: (u) => `😊 **${u}** sonríe tiernamente`, color: 0xFFB6C1, solo: true },
  dance: { text: (u) => `💃 **${u}** se pone a bailar`, color: 0xFF69B4, solo: true },
  claps: { text: (u) => `👏 **${u}** aplaude`, color: 0xFFD700, solo: true },
  highfive: { text: (u, t) => `🖐️ **${u}** choca esos cinco con **${t}**`, color: 0x00FF00, solo: false },
  smug: { text: (u) => `😏 **${u}** pone cara de presumido/a`, color: 0x9932CC, solo: true },
  teehee: { text: (u) => `🤭 **${u}** suelta una risita traviesa`, color: 0xFFB6C1, solo: true },
  cry: { text: (u) => `😢 **${u}** está llorando`, color: 0x4169E1, solo: true },
  sad: { text: (u) => `😞 **${u}** se siente triste`, color: 0x4682B4, solo: true },
  pout: { text: (u) => `😤 **${u}** hace un puchero`, color: 0xFFA07A, solo: true },
  blush: { text: (u) => `😳 **${u}** se sonroja`, color: 0xFF69B4, solo: true },
  scared: { text: (u) => `😱 **${u}** tiene miedo`, color: 0x800080, solo: true },
  confused: { text: (u) => `😕 **${u}** está confundido/a`, color: 0xFFD700, solo: true },
  bored: { text: (u) => `😑 **${u}** está aburrido/a`, color: 0xA9A9A9, solo: true },
  facepalm: { text: (u) => `🤦 **${u}** se da un facepalm`, color: 0x808080, solo: true },
  shrug: { text: (u) => `🤷 **${u}** se encoge de hombros`, color: 0xA9A9A9, solo: true },
  poke: { text: (u, t) => `👉 **${u}** le pica con el dedo a **${t}**`, color: 0x87CEEB, solo: false },
  tickle: { text: (u, t) => `🤣 **${u}** le hace cosquillas a **${t}**`, color: 0xFFD700, solo: false },
  lick: { text: (u, t) => `👅 **${u}** lame a **${t}**`, color: 0xFF69B4, solo: false },
  stare: { text: (u, t) => `👀 **${u}** se queda mirando fijamente a **${t}**`, color: 0x4B0082, solo: false },
  sleep: { text: (u) => `😴 **${u}** se va a dormir`, color: 0x191970, solo: true },
  sip: { text: (u) => `☕ **${u}** bebe algo tranquilamente`, color: 0x8B4513, solo: true },
  gaming: { text: (u, t) => `🎮 **${u}** juega con **${t}**`, color: 0x7B68EE, solo: false },
  nani: { text: (u) => `❗ **${u}** dice... ¡¿NANI?!`, color: 0xFF0000, solo: true },
  ship: { text: (u, t, p) => `💘 **${u}** x **${t}** — Compatibilidad: **${p}%**`, color: 0xFF1493, solo: false }
};
