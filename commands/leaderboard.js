import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import db from '../utils/database.js';
import { generateLeaderboardImage } from '../utils/cardGenerator.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Muestra la tabla de clasificación del servidor'),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const allUsers = db.getAllUsers(interaction.guild.id);
      const sortedUsers = allUsers
        .filter(u => u.level > 0 || u.totalXp > 0)
        .sort((a, b) => b.totalXp - a.totalXp)
        .slice(0, 10);
      
      if (sortedUsers.length === 0) {
        return interaction.editReply('📊 No hay usuarios en la tabla de clasificación todavía.');
      }
      
      const imageBuffer = await generateLeaderboardImage(sortedUsers, interaction.guild);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'leaderboard.png' });
      
      await interaction.editReply({
        embeds: [{
          color: 0xFFD700,
          title: '🏆 Tabla de Clasificación',
          description: `Top ${sortedUsers.length} usuarios por experiencia`,
          image: { url: 'attachment://leaderboard.png' },
          footer: { text: '⭐ ¡Sigue chateando para subir en el ranking!' }
        }],
        files: [attachment]
      });
    } catch (error) {
      console.error('Error generating leaderboard:', error);
      await interaction.editReply('❌ Error al generar la tabla de clasificación.');
    }
  }
};
