
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const EMOTION_GIFS = {
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

const EMOTIONS = {
  cry: { action: 'está llorando', emoji: '😢', color: 0x4169E1 },
  laugh: { action: 'se ríe', emoji: '😂', color: 0xFFD700 },
  blush: { action: 'se sonroja', emoji: '😊', color: 0xFFB6C1 },
  facepalm: { action: 'hace facepalm', emoji: '🤦', color: 0x808080 },
  pout: { action: 'hace puchero', emoji: '😤', color: 0xFFA07A },
  bored: { action: 'está aburrido/a', emoji: '😑', color: 0xA9A9A9 },
  happy: { action: 'está muy feliz', emoji: '😄', color: 0xFFD700 },
  dance: { action: 'baila', emoji: '💃', color: 0xFF69B4 },
  sing: { action: 'canta', emoji: '🎤', color: 0x9370DB },
  sleep: { action: 'se va a dormir (mimir time)', emoji: '😴', color: 0x191970 },
  drunk: { action: 'está ebrio/a', emoji: '🍺', color: 0xDAA520 },
  scared: { action: 'tiene miedo', emoji: '😨', color: 0x4B0082 },
  smug: { action: 'pone cara de engreído/a', emoji: '😏', color: 0x9370DB }
};

function getRandomGif(emotion) {
  const gifs = EMOTION_GIFS[emotion];
  if (!gifs || gifs.length === 0) return null;
  return gifs[Math.floor(Math.random() * gifs.length)];
}

export default {
  data: new SlashCommandBuilder()
    .setName('emociones')
    .setDescription('Expresa emociones y acciones')
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
    const emotionData = EMOTIONS[subcommand];
    
    if (!emotionData) {
      return interaction.reply({ content: '❌ Emoción no reconocida', flags: 64 });
    }

    const gif = getRandomGif(subcommand);
    const description = `${emotionData.emoji} **${interaction.user.username}** ${emotionData.action}`;

    const embed = new EmbedBuilder()
      .setColor(emotionData.color)
      .setDescription(description);

    if (gif) {
      embed.setImage(gif);
    }

    return interaction.reply({ embeds: [embed] });
  }
};
