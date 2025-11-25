import { SlashCommandBuilder } from 'discord.js';
import db from '../utils/database.js';
import { isStaff } from '../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('globalboost')
    .setDescription('[Staff] Añade un boost global al servidor')
    .addNumberOption(option =>
      option.setName('multiplicador')
        .setDescription('Multiplicador (0.5 = 50%)')
        .setRequired(true)
        .setMinValue(0.01)
    )
    .addIntegerOption(option =>
      option.setName('duracion')
        .setDescription('Duración en minutos (0 = permanente)')
        .setRequired(true)
        .setMinValue(0)
    ),
  
  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    }
    
    const multiplier = interaction.options.getNumber('multiplicador');
    const duration = interaction.options.getInteger('duracion');
    const durationMs = duration > 0 ? duration * 60 * 1000 : null;
    const description = `Boost global de ${Math.floor(multiplier * 100)}%`;
    
    db.addBoost('global', null, multiplier, durationMs, description);
    
    await interaction.reply({
      embeds: [{
        color: 0xFFD700,
        title: '🌍 Boost Global Activado',
        description: `Boost de **${Math.floor(multiplier * 100)}%** para todo el servidor`,
        fields: [{ name: 'Duración', value: duration > 0 ? `${duration} minutos` : 'Permanente' }]
      }]
    });
  }
};
