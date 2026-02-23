import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { buildReactionEmbed, calculateShipPercentage } from '../utils/reactionHandler.js';

export default {
  data: new SlashCommandBuilder()
    .setName('react')
    .setDescription('Comandos de reacción y emociones')
    .addSubcommand(sub =>
      sub.setName('hug')
        .setDescription('Dale un abrazo a alguien')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Usuario al que quieres abrazar')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('kiss')
        .setDescription('Dale un beso a alguien')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Usuario al que quieres besar')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('pat')
        .setDescription('Dale una caricia en la cabeza a alguien')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Usuario al que quieres acariciar')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('ship')
        .setDescription('Calcula la compatibilidad amorosa entre dos usuarios')
        .addUserOption(opt =>
          opt.setName('usuario1')
            .setDescription('Primer usuario')
            .setRequired(true)
        )
        .addUserOption(opt =>
          opt.setName('usuario2')
            .setDescription('Segundo usuario')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('kill')
        .setDescription('Elimina a alguien (en broma)')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Usuario al que quieres eliminar')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'ship') {
      const user1 = interaction.options.getUser('usuario1');
      const user2 = interaction.options.getUser('usuario2') || interaction.user;

      if (user1.id === user2.id) {
        return interaction.reply({ content: '❌ ¡No puedes hacer ship contigo mismo!', flags: 64 });
      }

      const percentage = calculateShipPercentage(user1.id, user2.id);
      const embed = await buildReactionEmbed('ship', user1, user2, { percentage });
      return interaction.reply({ embeds: [embed] });
    }

    const target = interaction.options.getUser('usuario');

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ ¡No puedes hacer eso contigo mismo!', flags: 64 });
    }

    if (target.bot) {
      return interaction.reply({ content: '❌ ¡No puedes hacer eso con un bot!', flags: 64 });
    }

    const embed = await buildReactionEmbed(subcommand, interaction.user, target);
    return interaction.reply({ embeds: [embed] });
  }
};
