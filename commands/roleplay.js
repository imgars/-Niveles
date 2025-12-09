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
  kisscheeks: { action: 'le da un beso en la mejilla a', emoji: '😘', color: 0xFF69B4, solo: false }
};

function getRandomGif(action) {
  const gifs = ROLEPLAY_GIFS[action];
  if (!gifs || gifs.length === 0) return null;
  return gifs[Math.floor(Math.random() * gifs.length)];
}

export default {
  data: new SlashCommandBuilder()
    .setName('roleplay')
    .setDescription('Comandos de interacción con otros usuarios')
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
      .addUserOption(opt => opt.setName('usuario').setDescription('Usuario para besar en la mejilla').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const actionData = ACTIONS[subcommand];

    if (!actionData) {
      return interaction.reply({ content: '❌ Acción no reconocida', flags: 64 });
    }

    const gif = getRandomGif(subcommand);
    const target = interaction.options.getUser('usuario');

    let description;
    if (target.id === interaction.user.id) {
      description = `${actionData.emoji} **${interaction.user.username}** se ${actionData.action} a sí mismo/a... ¿estás bien?`;
    } else {
      description = `${actionData.emoji} **${interaction.user.username}** ${actionData.action} **${target.username}**`;
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