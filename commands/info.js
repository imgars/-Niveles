import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../utils/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Muestra información general del bot'),

  async execute(interaction) {
    const allUsers = db.getAllUsers(interaction.guild.id);
    const totalXP = allUsers.reduce((sum, user) => sum + (user.totalXp || 0), 0);
    const maxLevel = allUsers.length > 0 ? Math.max(...allUsers.map(u => u.level || 0)) : 0;
    const activeBoosts = db.boosts.global.length;

    const embed = new EmbedBuilder()
      .setColor(0x7289DA)
      .setTitle('📊 Información del Bot - Niveles')
      .setDescription('Bot completo de niveles, economía y minijuegos para Discord')
      .addFields(
        { name: '👥 Usuarios Registrados', value: `${allUsers.length}`, inline: true },
        { name: '⭐ Nivel Más Alto', value: `${maxLevel}`, inline: true },
        { name: '✨ XP Total del Servidor', value: `${totalXP.toLocaleString()}`, inline: true },
        { name: '🚀 Boosts Globales Activos', value: `${activeBoosts}`, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { 
          name: '🎮 Características', 
          value: '• Sistema de Niveles y XP\n• Economía con Lagcoins\n• 5 Juegos de Casino\n• Minijuegos para ganar XP\n• Misiones Semanales\n• Sistema de Rachas\n• 9 Temas de Tarjetas\n• 13 Trabajos Diferentes',
          inline: false 
        },
        { 
          name: '📋 Comandos Principales', 
          value: '`/level` - Ver tu nivel\n`/balance` - Ver tus Lagcoins\n`/trabajar` - Ganar dinero\n`/minigame` - Jugar minijuegos\n`/mision` - Ver misiones\n`/help` - Ver todos los comandos',
          inline: false 
        },
        {
          name: '🔗 Enlaces',
          value: '[Dashboard Web](https://niveles.onrender.com)',
          inline: false
        }
      )
      .setFooter({ text: 'Bot desarrollado para la comunidad' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
