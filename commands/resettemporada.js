import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../utils/database.js';
import { isStaff } from '../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('resettemporada')
    .setDescription('[Staff] Resetea todos los niveles y XP del servidor'),
  
  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    }
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_reset')
          .setLabel('Confirmar Reset')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_reset')
          .setLabel('Cancelar')
          .setStyle(ButtonStyle.Secondary)
      );
    
    const response = await interaction.reply({
      embeds: [{
        color: 0xFF0000,
        title: '⚠️ Advertencia',
        description: '**¿Estás seguro de que quieres resetear TODA la XP y niveles del servidor?**\n\nEsta acción es irreversible y afectará a todos los usuarios.'
      }],
      components: [row],
      ephemeral: true
    });
    
    const collector = response.createMessageComponentCollector({ time: 30000 });
    
    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: '❌ Solo quien ejecutó el comando puede confirmar.', ephemeral: true });
      }
      
      if (i.customId === 'confirm_reset') {
        db.resetAllUsers(interaction.guild.id);
        
        await i.update({
          embeds: [{
            color: 0x43B581,
            title: '✅ Temporada Reseteada',
            description: 'Todos los niveles y XP han sido reseteados.'
          }],
          components: []
        });
        
        collector.stop();
      }
      
      if (i.customId === 'cancel_reset') {
        await i.update({
          embeds: [{
            color: 0x7289DA,
            title: 'Cancelado',
            description: 'El reset ha sido cancelado.'
          }],
          components: []
        });
        
        collector.stop();
      }
    });
  }
};
