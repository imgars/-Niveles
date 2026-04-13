import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserJailStatus, payUserJailBail } from '../utils/economyDB.js';

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('carcel')
    .setDescription('Consulta tu condena o paga fianza')
    .addSubcommand(sub =>
      sub.setName('estado').setDescription('Ver cuánto tiempo te queda en la cárcel')
    )
    .addSubcommand(sub =>
      sub
        .setName('fianza')
        .setDescription('Pagar parte de la fianza')
        .addIntegerOption(opt =>
          opt.setName('cantidad').setDescription('Cantidad de Lagcoins a pagar').setRequired(true).setMinValue(1)
        )
    )
    .addSubcommand(sub =>
      sub.setName('salir').setDescription('Pagar toda la fianza restante y salir al instante')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const jail = await getUserJailStatus(interaction.guildId, interaction.user.id);

    if (sub === 'estado') {
      if (!jail.jailed) {
        return interaction.reply('✅ No estás en la cárcel.');
      }
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('🚔 Estado de Cárcel')
        .setDescription(`Motivo: **${jail.reason || 'Sin motivo'}**`)
        .addFields(
          { name: 'Tiempo restante', value: formatRemaining(jail.remainingMs), inline: true },
          { name: 'Fianza restante', value: `${jail.bailRemaining || 0} Lagcoins`, inline: true }
        );
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (!jail.jailed) {
      return interaction.reply({ content: '✅ No estás en la cárcel.', flags: 64 });
    }

    if (sub === 'fianza') {
      const amount = interaction.options.getInteger('cantidad');
      const result = await payUserJailBail(interaction.guildId, interaction.user.id, amount, false);
      if (result.error === 'insufficient_funds') {
        return interaction.reply({ content: `❌ No tienes fondos suficientes. Necesitas ${result.needed} Lagcoins.`, flags: 64 });
      }
      if (result.error) {
        return interaction.reply({ content: '❌ No se pudo procesar el pago de fianza.', flags: 64 });
      }
      return interaction.reply({
        content: result.released
          ? `✅ Pagaste ${result.paid} Lagcoins y saliste de la cárcel.`
          : `✅ Pagaste ${result.paid} Lagcoins. Fianza restante: ${result.remainingBail} Lagcoins.`,
        flags: 64
      });
    }

    const instant = await payUserJailBail(interaction.guildId, interaction.user.id, jail.bailRemaining || 0, true);
    if (instant.error === 'insufficient_funds') {
      return interaction.reply({
        content: `❌ No tienes suficiente para salir al instante. Te faltan ${instant.needed} Lagcoins.`,
        flags: 64
      });
    }
    if (instant.error) {
      return interaction.reply({ content: '❌ No se pudo procesar la salida instantánea.', flags: 64 });
    }
    return interaction.reply({ content: `✅ Pagaste ${instant.paid} Lagcoins y quedaste libre.`, flags: 64 });
  }
};
