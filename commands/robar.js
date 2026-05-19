import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { robUser } from '../utils/economyDB.js';
import { logActivity, LOG_TYPES } from '../utils/activityLogger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('robar')
    .setDescription('Intenta robar Lagcoins a otro usuario')
    .addUserOption(option =>
      option.setName('victima')
        .setDescription('Usuario a robar')
        .setRequired(true)
    ),
  
  async execute(interaction) {
    const victim = interaction.options.getUser('victima');

    if (victim.id === interaction.user.id) {
      return interaction.reply({ content: '❌ No puedes robarte a ti mismo', flags: 64 });
    }

    if (victim.bot) {
      return interaction.reply({ content: '❌ No puedes robar a un bot', flags: 64 });
    }

    try {
      const result = await robUser(interaction.guildId, interaction.user.id, victim.id);

      if (result.error === 'victim_poor') {
        return interaction.reply({ content: '❌ Esa persona no tiene suficientes Lagcoins para robar (mínimo 100)', flags: 64 });
      }

      if (result.error === 'cooldown') {
        return interaction.reply({ content: `⏳ Debes esperar **${result.remaining} segundos** para intentar robar de nuevo`, flags: 64 });
      }
      if (result.error === 'jailed') {
        return interaction.reply({ content: `🚔 Estás en la cárcel. Te quedan **${result.remaining} segundos**. Usa \`/carcel estado\` o \`/carcel salir\`.`, flags: 64 });
      }

      if (result.success) {
        logActivity({
          type: LOG_TYPES.THEFT_SUCCESS,
          userId: interaction.user.id,
          username: interaction.user.username,
          guildId: interaction.guildId,
          guildName: interaction.guild?.name,
          command: 'robar',
          commandOptions: { victima: victim.id },
          amount: result.stolen,
          balanceAfter: result.newBalance,
          importance: result.stolen > 5000 ? 'high' : 'medium',
          result: 'success',
          details: { victima: victim.username, victimaId: victim.id, robado: result.stolen, channelId: interaction.channelId }
        });

        logActivity({
          type: LOG_TYPES.THEFT_VICTIM,
          userId: victim.id,
          username: victim.username,
          guildId: interaction.guildId,
          guildName: interaction.guild?.name,
          command: 'robar',
          amount: -result.stolen,
          importance: 'medium',
          result: 'failure',
          details: { ladron: interaction.user.username, ladronId: interaction.user.id, robado: result.stolen }
        });

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🦹 ¡Robo Exitoso!')
          .setDescription(`¡Lograste robar a ${victim}!`)
          .addFields(
            { name: '💰 Robaste', value: `${result.stolen} Lagcoins`, inline: true },
            { name: '🏦 Tu Nuevo Saldo', value: `${result.newBalance} Lagcoins`, inline: true }
          )
          .setFooter({ text: '¡Pero ten cuidado, el karma existe!' });
        if (result.jailed) {
          embed.addFields({
            name: '🚔 Te arrestaron después',
            value: `Tiempo: ${Math.ceil((result.jailStatus?.remainingMs || 0) / 1000)}s\nFianza: ${result.jailStatus?.bailRemaining || 0} Lagcoins`
          });
        }

        return interaction.reply({ embeds: [embed] });
      } else {
        logActivity({
          type: LOG_TYPES.THEFT_FAIL,
          userId: interaction.user.id,
          username: interaction.user.username,
          guildId: interaction.guildId,
          guildName: interaction.guild?.name,
          command: 'robar',
          commandOptions: { victima: victim.id },
          amount: -result.fine,
          importance: 'medium',
          result: 'failure',
          details: { victima: victim.username, multa: result.fine }
        });

        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('🚔 ¡Te Atraparon!')
          .setDescription(`¡Fallaste intentando robar a ${victim}!`)
          .addFields(
            { name: '💸 Multa', value: `-${result.fine} Lagcoins`, inline: true }
          )
          .setFooter({ text: 'La policía te multó por intento de robo' });
        if (result.jailed) {
          embed.addFields({
            name: '⛓️ Además quedaste en la cárcel',
            value: `Tiempo: ${Math.ceil((result.jailStatus?.remainingMs || 0) / 1000)}s\nFianza: ${result.jailStatus?.bailRemaining || 0} Lagcoins`
          });
        }

        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error en robar:', error);
      return interaction.reply({ content: '❌ Error al intentar robar', flags: 64 });
    }
  }
};
