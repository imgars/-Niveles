import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { robUser } from '../utils/economyDB.js';

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

      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🦹 ¡Robo Exitoso!')
          .setDescription(`¡Lograste robar a ${victim}!`)
          .addFields(
            { name: '💰 Robaste', value: `${result.stolen} Lagcoins`, inline: true },
            { name: '🏦 Tu Nuevo Saldo', value: `${result.newBalance} Lagcoins`, inline: true }
          )
          .setFooter({ text: '¡Pero ten cuidado, el karma existe!' });

        return interaction.reply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('🚔 ¡Te Atraparon!')
          .setDescription(`¡Fallaste intentando robar a ${victim}!`)
          .addFields(
            { name: '💸 Multa', value: `-${result.fine} Lagcoins`, inline: true }
          )
          .setFooter({ text: 'La policía te multó por intento de robo' });

        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error en robar:', error);
      return interaction.reply({ content: '❌ Error al intentar robar', flags: 64 });
    }
  }
};
