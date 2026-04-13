import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { robBank } from '../utils/economyDB.js';
import { logActivity, LOG_TYPES } from '../utils/activityLogger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('robar_banco')
    .setDescription('¡Intenta robar el banco! (¡Muy riesgoso!)'),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    let result;
    try {
      result = await robBank(interaction.guildId, interaction.user.id);
    } catch (error) {
      console.error('Error en robBank:', error);
      return interaction.editReply('❌ Error en la operación');
    }

    if (result && result.error === 'cooldown') {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⏳ COOLDOWN')
        .setDescription(`Debes esperar **${result.remaining}** segundos antes de intentar otro robo al banco.`);
      return interaction.editReply({ embeds: [embed] });
    }
    if (result && result.error === 'jailed') {
      return interaction.editReply(`🚔 Estás en la cárcel. Te quedan **${result.remaining} segundos**. Usa \`/carcel\` para revisar/pagar fianza.`);
    }

    if (result && result.success) {
      logActivity({
        type: LOG_TYPES.BANK_HEIST,
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId,
        guildName: interaction.guild?.name,
        command: 'robar_banco',
        amount: result.stolen,
        importance: 'high',
        result: 'success',
        details: { robado: result.stolen }
      });

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🏦 ¡ROBO EXITOSO!')
        .setDescription('¡Lo lograste! ¡Escapaste con el dinero!')
        .addFields(
          { name: 'Dinero Robado', value: `${result.stolen} Lagcoins` },
          { name: '🚨', value: 'La policía está en camino...' }
        );
      if (result.jailed) {
        embed.addFields({ name: '🚔 Arresto', value: `Condena: ${Math.ceil((result.jailStatus?.remainingMs || 0) / 1000)}s\nFianza: ${result.jailStatus?.bailRemaining || 0} Lagcoins` });
      }
      return interaction.editReply({ embeds: [embed] });
    } else {
      logActivity({
        type: LOG_TYPES.BANK_HEIST,
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId,
        guildName: interaction.guild?.name,
        command: 'robar_banco',
        amount: -(result.penalty || 0),
        importance: 'medium',
        result: 'failure',
        details: { multa: result.penalty }
      });

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚓 ¡TE ATRAPARON!')
        .setDescription('¡La policía te capturó! Tuviste que pagar una multa')
        .addFields({ name: 'Multa', value: `-${result.penalty} Lagcoins` });
      if (result.jailed) {
        embed.addFields({ name: '⛓️ Cárcel', value: `Condena: ${Math.ceil((result.jailStatus?.remainingMs || 0) / 1000)}s\nFianza: ${result.jailStatus?.bailRemaining || 0} Lagcoins` });
      }
      return interaction.editReply({ embeds: [embed] });
    }
  }
};
