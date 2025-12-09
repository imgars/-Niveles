import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const ROLEPLAY_GIFS = {
  hug: [
    'https://media.tenor.com/9e1aE_xBLCsAAAAC/anime-hug.gif',
    'https://media.tenor.com/7J-9cP-44CYAAAAC/anime-hug-cute.gif',
    'https://media.tenor.com/FRWm_qjPNUkAAAAC/anime-hug.gif'
  ],
  greet: [
    'https://media.tenor.com/uMlplWH1CZEAAAAC/anime-wave.gif',
    'https://media.tenor.com/HZ0zc-9iNEgAAAAC/cute-hello.gif',
    'https://media.tenor.com/1T8WqeHMNZ0AAAAC/anime-hi.gif'
  ],
  goodbye: [
    'https://media.tenor.com/6M7WN3LPXqAAAAAC/anime-bye.gif',
    'https://media.tenor.com/H-lZHLZnjJYAAAAC/goodbye-wave.gif',
    'https://media.tenor.com/3gAZAWqMJasAAAAC/wave-bye.gif'
  ],
  pat: [
    'https://media.tenor.com/UN3uJYYrpJEAAAAC/pat-anime.gif',
    'https://media.tenor.com/VzHcRl5IqPkAAAAC/head-pat.gif',
    'https://media.tenor.com/3rY3I5t0XmkAAAAC/anime-head-pat.gif'
  ],
  slap: [
    'https://media.tenor.com/Ws6Dm1ZW_vMAAAAC/anime-slap.gif',
    'https://media.tenor.com/kxJFQU46MmMAAAAC/slap-anime.gif',
    'https://media.tenor.com/Mfvp8LyA_dEAAAAC/anime-slap-mad.gif'
  ],
  bite: [
    'https://media.tenor.com/9iUd1mR_9CYAAAAC/anime-bite.gif',
    'https://media.tenor.com/xboPZgzD3V4AAAAC/bite-anime.gif',
    'https://media.tenor.com/7bFN5bN3JWEAAAAC/bite-anime-bite.gif'
  ],
  feed: [
    'https://media.tenor.com/8ck7evCWGj8AAAAC/anime-food.gif',
    'https://media.tenor.com/XNMF52PhmWAAAAAC/anime-eat.gif',
    'https://media.tenor.com/QnlVtT1yAKEAAAAC/anime-feeding.gif'
  ],
  cuddle: [
    'https://media.tenor.com/zlJwg8F5DwQAAAAC/anime-cuddle.gif',
    'https://media.tenor.com/UxRwJTPdNEUAAAAC/cuddle-anime.gif',
    'https://media.tenor.com/DVPdZ_EGFrQAAAAC/anime-couple-anime-cuddle.gif'
  ],
  lick: [
    'https://media.tenor.com/8SWNP6KDqHcAAAAC/anime-lick.gif',
    'https://media.tenor.com/IH-vUFGxGEAAAAAC/lick-anime.gif',
    'https://media.tenor.com/3q6U_Y6r9QcAAAAC/anime-licking.gif'
  ],
  punch: [
    'https://media.tenor.com/HKm9c5_v8EkAAAAC/anime-punch.gif',
    'https://media.tenor.com/1vj-_jq6aTQAAAAC/one-punch.gif',
    'https://media.tenor.com/gUqMkNKb3S0AAAAC/anime-fight.gif'
  ],
  kill: [
    'https://media.tenor.com/6t_xY6ACwPUAAAAC/anime-death.gif',
    'https://media.tenor.com/g3fY7TGdmycAAAAC/attack-anime.gif',
    'https://media.tenor.com/ZpPV1VNV3jMAAAAC/anime-killed.gif'
  ],
  poke: [
    'https://media.tenor.com/85-5xEPbIh8AAAAC/anime-poke.gif',
    'https://media.tenor.com/0lzL_WFQC4cAAAAC/poke-anime.gif',
    'https://media.tenor.com/X_7PaKF7sQQAAAAC/anime-boop.gif'
  ],
  highfive: [
    'https://media.tenor.com/JBBZ1BTUcQQAAAAC/anime-high-five.gif',
    'https://media.tenor.com/aN5WqB1MtakAAAAC/high-five.gif',
    'https://media.tenor.com/SfGJR1TIxgMAAAAC/highfive-anime.gif'
  ],
  handholding: [
    'https://media.tenor.com/K88K3RHx44MAAAAC/hand-holding.gif',
    'https://media.tenor.com/EBGFWZ4GNfgAAAAC/anime-hold-hands.gif',
    'https://media.tenor.com/FyxP18KWJ0kAAAAC/holding-hands-anime.gif'
  ],
  kisscheeks: [
    'https://media.tenor.com/D4Dqy7XlLrEAAAAC/anime-kiss-cheek.gif',
    'https://media.tenor.com/8G-3eQRNPREAAAAC/kiss-cheek.gif',
    'https://media.tenor.com/Rr2AfQrFxDMAAAAC/cheek-kiss-anime.gif'
  ],
  cry: [
    'https://media.tenor.com/NVSYbkr66yMAAAAC/anime-cry.gif',
    'https://media.tenor.com/zYbFIJg7QlcAAAAC/crying-sad.gif',
    'https://media.tenor.com/C_ASGbDN_RgAAAAC/anime-tears.gif'
  ],
  laugh: [
    'https://media.tenor.com/kONDHbZb6HkAAAAC/anime-laugh.gif',
    'https://media.tenor.com/D1M7dKoRKZMAAAAC/lol-anime.gif',
    'https://media.tenor.com/hL7QlEZoJTEAAAAC/laugh-funny.gif'
  ],
  blush: [
    'https://media.tenor.com/VU8_e9EIvwYAAAAC/anime-blush.gif',
    'https://media.tenor.com/E9XSe0VFzccAAAAC/blush-shy.gif',
    'https://media.tenor.com/HLBR0IV8oHEAAAAC/anime-blushing.gif'
  ],
  facepalm: [
    'https://media.tenor.com/JZbGJLv6_TIAAAAC/anime-facepalm.gif',
    'https://media.tenor.com/gkHH5-xQNfkAAAAC/facepalm.gif',
    'https://media.tenor.com/14l5LLmLYU8AAAAC/face-palm-anime.gif'
  ],
  pout: [
    'https://media.tenor.com/tRJN3qYnMBQAAAAC/anime-pout.gif',
    'https://media.tenor.com/eIjQ9mxlDRkAAAAC/pout-angry.gif',
    'https://media.tenor.com/85Ah1j5R0CoAAAAC/anime-mad.gif'
  ],
  bored: [
    'https://media.tenor.com/E7dK_UjMeowAAAAC/anime-bored.gif',
    'https://media.tenor.com/7BH8vjNs9u0AAAAC/bored-anime.gif',
    'https://media.tenor.com/0FfLqvZTWQAAAAAC/sleepy-bored.gif'
  ],
  happy: [
    'https://media.tenor.com/mPB5xYb-L9MAAAAC/anime-happy.gif',
    'https://media.tenor.com/FgM_LCJPBhAAAAAC/happy-excited.gif',
    'https://media.tenor.com/77zEZf-AhToAAAAC/yay-anime.gif'
  ],
  dance: [
    'https://media.tenor.com/rGN6mUBkxEQAAAAC/anime-dance.gif',
    'https://media.tenor.com/1FotajLkHQUAAAAC/dancing-anime.gif',
    'https://media.tenor.com/TJvl9sSaKrcAAAAC/anime-dance-cute.gif'
  ],
  sing: [
    'https://media.tenor.com/9ym7_CVKgXoAAAAC/anime-singing.gif',
    'https://media.tenor.com/wBGZBkNpvmwAAAAC/sing-anime.gif',
    'https://media.tenor.com/4E8kbSdNiG8AAAAC/karaoke-anime.gif'
  ],
  sleep: [
    'https://media.tenor.com/A1XFkH6WbhMAAAAC/anime-sleep.gif',
    'https://media.tenor.com/u9FUwBUEP1cAAAAC/sleepy-anime.gif',
    'https://media.tenor.com/kLEQC0FxwgQAAAAC/sleeping-cute.gif'
  ],
  drunk: [
    'https://media.tenor.com/FH9aBB1e5goAAAAC/anime-drunk.gif',
    'https://media.tenor.com/cP0gCKnLWooAAAAC/drunk-anime.gif',
    'https://media.tenor.com/0pXpxWR1QMsAAAAC/drinking-anime.gif'
  ],
  scared: [
    'https://media.tenor.com/6pzBRvxNQ1QAAAAC/anime-scared.gif',
    'https://media.tenor.com/mFbO_6Ow9D0AAAAC/scared-hiding.gif',
    'https://media.tenor.com/RuBIlk6m8YEAAAAC/fear-anime.gif'
  ],
  smug: [
    'https://media.tenor.com/yXB2qXbQX4UAAAAC/anime-smug.gif',
    'https://media.tenor.com/GryShyQOvxUAAAAC/smug-face.gif',
    'https://media.tenor.com/a1TKBoCRfQYAAAAC/smug-anime-smug.gif'
  ]
};

const ACTIONS = {
  hug: { action: 'abraza', emoji: '🤗', color: 0xFF69B4, solo: false },
  greet: { action: 'saluda', emoji: '👋', color: 0x00FF00, solo: false },
  goodbye: { action: 'se despide de', emoji: '👋', color: 0x87CEEB, solo: false },
  pat: { action: 'acaricia la cabeza de', emoji: '🥰', color: 0xFFD700, solo: false },
  slap: { action: 'abofetea', emoji: '👋💥', color: 0xFF0000, solo: false },
  bite: { action: 'muerde', emoji: '😈', color: 0x8B0000, solo: false },
  feed: { action: 'le da de comer a', emoji: '🍕', color: 0xFFA500, solo: false },
  cuddle: { action: 'se acurruca con', emoji: '💕', color: 0xFF1493, solo: false },
  lick: { action: 'lame', emoji: '👅', color: 0xFF69B4, solo: false },
  punch: { action: 'golpea', emoji: '👊', color: 0xFF4500, solo: false },
  kill: { action: 'mata (de broma)', emoji: '💀', color: 0x000000, solo: false },
  poke: { action: 'pincha', emoji: '👆', color: 0x9370DB, solo: false },
  highfive: { action: 'choca los cinco con', emoji: '✋', color: 0x32CD32, solo: false },
  handholding: { action: 'toma la mano de', emoji: '🤝', color: 0xFFB6C1, solo: false },
  kisscheeks: { action: 'le da un beso en la mejilla a', emoji: '😘', color: 0xFF69B4, solo: false },
  cry: { action: 'está llorando', emoji: '😢', color: 0x4169E1, solo: true },
  laugh: { action: 'se ríe', emoji: '😂', color: 0xFFD700, solo: true },
  blush: { action: 'se sonroja', emoji: '😊', color: 0xFFB6C1, solo: true },
  facepalm: { action: 'hace facepalm', emoji: '🤦', color: 0x808080, solo: true },
  pout: { action: 'hace puchero', emoji: '😤', color: 0xFFA07A, solo: true },
  bored: { action: 'está aburrido/a', emoji: '😑', color: 0xA9A9A9, solo: true },
  happy: { action: 'está muy feliz', emoji: '😄', color: 0xFFD700, solo: true },
  dance: { action: 'baila', emoji: '💃', color: 0xFF69B4, solo: true },
  sing: { action: 'canta', emoji: '🎤', color: 0x9370DB, solo: true },
  sleep: { action: 'se va a dormir (mimir time)', emoji: '😴', color: 0x191970, solo: true },
  drunk: { action: 'está ebrio/a', emoji: '🍺', color: 0xDAA520, solo: true },
  scared: { action: 'tiene miedo', emoji: '😨', color: 0x4B0082, solo: true },
  smug: { action: 'pone cara de engreído/a', emoji: '😏', color: 0x9370DB, solo: true }
};

const MAGIC_8BALL_RESPONSES = [
  { response: 'Sí, definitivamente', type: 'positive' },
  { response: 'Sin duda alguna', type: 'positive' },
  { response: 'Puedes contar con ello', type: 'positive' },
  { response: 'Sí, absolutamente', type: 'positive' },
  { response: 'Las señales apuntan a que sí', type: 'positive' },
  { response: 'Probablemente sí', type: 'positive' },
  { response: 'El panorama es bueno', type: 'positive' },
  { response: '¡Por supuesto!', type: 'positive' },
  { response: 'Pregunta de nuevo más tarde', type: 'neutral' },
  { response: 'Mejor no te lo digo ahora', type: 'neutral' },
  { response: 'No puedo predecirlo ahora', type: 'neutral' },
  { response: 'Concéntrate y pregunta otra vez', type: 'neutral' },
  { response: 'Es difícil de ver', type: 'neutral' },
  { response: 'No cuentes con ello', type: 'negative' },
  { response: 'Mi respuesta es no', type: 'negative' },
  { response: 'Mis fuentes dicen que no', type: 'negative' },
  { response: 'No es probable', type: 'negative' },
  { response: 'Muy dudoso', type: 'negative' },
  { response: 'Las perspectivas no son buenas', type: 'negative' },
  { response: 'Definitivamente no', type: 'negative' }
];

function getRandomGif(action) {
  const gifs = ROLEPLAY_GIFS[action];
  if (!gifs || gifs.length === 0) return null;
  return gifs[Math.floor(Math.random() * gifs.length)];
}

function get8BallResponse() {
  return MAGIC_8BALL_RESPONSES[Math.floor(Math.random() * MAGIC_8BALL_RESPONSES.length)];
}

export default {
  data: new SlashCommandBuilder()
    .setName('roleplay')
    .setDescription('Comandos de interacción estilo anime')
    .addSubcommand(sub => sub.setName('hug').setDescription('Abraza a alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a abrazar').setRequired(true)))
    .addSubcommand(sub => sub.setName('greet').setDescription('Saluda a alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a saludar').setRequired(true)))
    .addSubcommand(sub => sub.setName('goodbye').setDescription('Despídete de alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a despedirte').setRequired(true)))
    .addSubcommand(sub => sub.setName('pat').setDescription('Acaricia la cabeza de alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a acariciar').setRequired(true)))
    .addSubcommand(sub => sub.setName('slap').setDescription('Abofetea a alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a abofetear').setRequired(true)))
    .addSubcommand(sub => sub.setName('bite').setDescription('Muerde a alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a morder').setRequired(true)))
    .addSubcommand(sub => sub.setName('feed').setDescription('Dale de comer a alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a alimentar').setRequired(true)))
    .addSubcommand(sub => sub.setName('cuddle').setDescription('Acurrúcate con alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario para acurrucarse').setRequired(true)))
    .addSubcommand(sub => sub.setName('lick').setDescription('Lame a alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a lamer').setRequired(true)))
    .addSubcommand(sub => sub.setName('punch').setDescription('Golpea a alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a golpear').setRequired(true)))
    .addSubcommand(sub => sub.setName('kill').setDescription('Mata a alguien (de broma)')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a matar (de broma)').setRequired(true)))
    .addSubcommand(sub => sub.setName('poke').setDescription('Pincha a alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a pinchar').setRequired(true)))
    .addSubcommand(sub => sub.setName('highfive').setDescription('Choca los cinco con alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario para chocar los cinco').setRequired(true)))
    .addSubcommand(sub => sub.setName('handholding').setDescription('Toma la mano de alguien')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario para tomar la mano').setRequired(true)))
    .addSubcommand(sub => sub.setName('kisscheeks').setDescription('Beso en la mejilla')
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario para besar en la mejilla').setRequired(true)))
    .addSubcommand(sub => sub.setName('cry').setDescription('Llora o expresa tristeza'))
    .addSubcommand(sub => sub.setName('laugh').setDescription('Ríete'))
    .addSubcommand(sub => sub.setName('blush').setDescription('Sonrójate'))
    .addSubcommand(sub => sub.setName('facepalm').setDescription('Facepalm'))
    .addSubcommand(sub => sub.setName('pout').setDescription('Haz puchero'))
    .addSubcommand(sub => sub.setName('bored').setDescription('Expresa aburrimiento'))
    .addSubcommand(sub => sub.setName('happy').setDescription('Expresa felicidad'))
    .addSubcommand(sub => sub.setName('dance').setDescription('Baila'))
    .addSubcommand(sub => sub.setName('sing').setDescription('Canta'))
    .addSubcommand(sub => sub.setName('sleep').setDescription('Mimir time'))
    .addSubcommand(sub => sub.setName('drunk').setDescription('Actúa ebrio/a'))
    .addSubcommand(sub => sub.setName('scared').setDescription('Expresa miedo'))
    .addSubcommand(sub => sub.setName('smug').setDescription('Cara de engreído/a')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const actionData = ACTIONS[subcommand];
    
    if (!actionData) {
      return interaction.reply({ content: '❌ Acción no reconocida', flags: 64 });
    }

    const gif = getRandomGif(subcommand);
    
    let description;
    if (actionData.solo) {
      description = `${actionData.emoji} **${interaction.user.username}** ${actionData.action}`;
    } else {
      const target = interaction.options.getUser('usuario');
      if (target.id === interaction.user.id) {
        description = `${actionData.emoji} **${interaction.user.username}** se ${actionData.action} a sí mismo/a... ¿estás bien?`;
      } else {
        description = `${actionData.emoji} **${interaction.user.username}** ${actionData.action} **${target.username}**`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(actionData.color)
      .setDescription(description);

    if (gif) {
      embed.setImage(gif);
    }

    return interaction.reply({ embeds: [embed] });
  }
};
