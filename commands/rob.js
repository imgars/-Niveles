import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserEconomy, robUser, saveUserEconomy } from '../utils/economyDB.js';
import { logActivity, LOG_TYPES } from '../utils/activityLogger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Intenta robar Lagcoins a otro usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a robar')
        .setRequired(true)
    ),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    const targetUser = interaction.options.getUser('usuario');

    if (targetUser.bot) {
      return interaction.editReply('❌ No puedes robar a bots');
    }

    if (targetUser.id === interaction.user.id) {
      return interaction.editReply('❌ No puedes robarte a ti mismo');
    }

    const result = await robUser(interaction.guildId, interaction.user.id, targetUser.id);

    if (result.error === 'cooldown') {
      return interaction.editReply(`⏳ Debes esperar **${result.remaining} segundos** para volver a robar`);
    }
    if (result.error === 'jailed') {
      return interaction.editReply(`🚔 Estás en la cárcel. Te quedan **${result.remaining} segundos**. Usa \`/carcel estado\` o \`/carcel salir\`.`);
    }

    if (result.error === 'victim_poor') {
      return interaction.editReply('❌ Este usuario no tiene suficientes Lagcoins para robar');
    }

    if (result.blocked) {
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🛡️ ¡Robo Bloqueado!')
        .setDescription(`${targetUser.username} tiene un **Escudo Anti-Robo** activo.\n¡Tu intento de robo falló!`);
      return interaction.editReply({ embeds: [embed] });
    }

    if (result.success) {
      logActivity({
        type: LOG_TYPES.THEFT_SUCCESS,
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId,
        guildName: interaction.guild?.name,
        command: 'rob',
        commandOptions: { victima: targetUser.id },
        amount: result.stolen,
        balanceAfter: result.newBalance,
        importance: result.stolen > 5000 ? 'high' : 'medium',
        result: 'success',
        details: { victima: targetUser.username, robado: result.stolen }
      });

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💰 ¡Robo Exitoso!')
        .setDescription(`${interaction.user.username} robó **${result.stolen} Lagcoins** a ${targetUser.username}`)
        .addFields({ name: 'Tu nuevo saldo', value: `💰 ${result.newBalance} Lagcoins` })
        .setFooter({ text: 'Cooldown: 30 segundos' });
      if (result.jailed) {
        embed.addFields({
          name: '🚔 Terminaste en la cárcel',
          value: `Tiempo: ${Math.ceil((result.jailStatus?.remainingMs || 0) / 1000)}s\nFianza: ${result.jailStatus?.bailRemaining || 0} Lagcoins`
        });
      }

      return interaction.editReply({ embeds: [embed] });
    } else {
      logActivity({
        type: LOG_TYPES.THEFT_FAIL,
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId,
        guildName: interaction.guild?.name,
        command: 'rob',
        commandOptions: { victima: targetUser.id },
        amount: -result.fine,
        importance: 'medium',
        result: 'failure',
        details: { victima: targetUser.username, multa: result.fine }
      });

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('❌ ¡Robo Fallido!')
        .setDescription(`${targetUser.username} te atrapó intentando robar y te multaron **${result.fine} Lagcoins**`)
        .addFields({ name: 'Tus Lagcoins confiscados', value: `💰 -${result.fine}` })
        .setFooter({ text: 'Cooldown: 30 segundos' });
      if (result.jailed) {
        embed.addFields({
          name: '🚔 Cárcel',
          value: `Condena: ${Math.ceil((result.jailStatus?.remainingMs || 0) / 1000)}s\nFianza: ${result.jailStatus?.bailRemaining || 0} Lagcoins`
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
