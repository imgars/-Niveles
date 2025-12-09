import { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { CONFIG } from '../config.js';
import db from '../utils/database.js';
import { generateLeaderboardImage, generateMinecraftLeaderboard, generatePokemonLeaderboard, generateZeldaLeaderboard } from '../utils/cardGenerator.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Muestra la tabla de clasificación del servidor')
    .addSubcommand(sub =>
      sub.setName('ver')
        .setDescription('Ver el leaderboard con tu tema seleccionado'))
    .addSubcommand(sub =>
      sub.setName('select')
        .setDescription('Selecciona el tipo de leaderboard')
        .addStringOption(option =>
          option.setName('tipo')
            .setDescription('Tipo de leaderboard')
            .setRequired(true)
            .addChoices(
              { name: '🏆 General (Pixel)', value: 'pixel' },
              { name: '⛏️ Minecraft', value: 'minecraft' },
              { name: '🔥 Pokemon (Nivel 100+)', value: 'pokemon' },
              { name: '⚔️ Zelda (Super Activos)', value: 'zelda' }
            )
        )),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const subcommand = interaction.options.getSubcommand();
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const allUsers = db.getAllUsers(interaction.guild.id);
      const userData = db.getUser(interaction.guild.id, interaction.user.id);
      
      let tipo;
      
      if (subcommand === 'select') {
        tipo = interaction.options.getString('tipo');
        userData.selectedLeaderboardTheme = tipo;
        db.saveUser(interaction.guild.id, interaction.user.id, userData);
      } else {
        tipo = userData.selectedLeaderboardTheme || 'pixel';
      }
      
      const sortedUsers = allUsers
        .filter(u => {
          const totalXp = Number(u.totalXp) || 0;
          const level = Number(u.level) || 0;
          return totalXp > 0 && level >= 0 && !isNaN(totalXp) && !isNaN(level);
        })
        .sort((a, b) => {
          const xpA = Number(a.totalXp) || 0;
          const xpB = Number(b.totalXp) || 0;
          return xpB - xpA;
        })
        .slice(0, 10);
      
      if (sortedUsers.length === 0) {
        return interaction.editReply('📊 No hay usuarios en la tabla de clasificación todavía.');
      }
      
      let imageBuffer;
      let title;
      const isSuperActive = member.roles.cache.has(CONFIG.LEVEL_ROLES[35]);
      const userLevel = userData.level || 0;
      
      if (tipo === 'pokemon') {
        if (userLevel < 100) {
          return interaction.editReply('❌ Necesitas nivel 100+ para ver el leaderboard Pokemon.');
        }
        imageBuffer = await generatePokemonLeaderboard(sortedUsers, interaction.guild);
        title = '🔥 Pokemon Masters';
      } else if (tipo === 'zelda') {
        if (!isSuperActive) {
          return interaction.editReply('❌ Necesitas el rol Super Activo (nivel 35+) para ver el leaderboard Zelda.');
        }
        imageBuffer = await generateZeldaLeaderboard(sortedUsers, interaction.guild);
        title = '⚔️ Heroes of Hyrule';
      } else if (tipo === 'minecraft') {
        imageBuffer = await generateMinecraftLeaderboard(sortedUsers, interaction.guild);
        title = '⛏️ Minecraft Legends';
      } else {
        imageBuffer = await generateLeaderboardImage(sortedUsers, interaction.guild, 'pixel');
        title = '🏆 Tabla de Clasificación';
      }
      
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'leaderboard.png' });
      
      const viewFullButton = new ButtonBuilder()
        .setLabel('Ver leaderboard completo')
        .setStyle(ButtonStyle.Link)
        .setURL('https://niveles-wul5.onrender.com/#leaderboard');
      
      const row = new ActionRowBuilder().addComponents(viewFullButton);
      
      const themeNames = {
        pixel: '🏆 General',
        minecraft: '⛏️ Minecraft',
        pokemon: '🔥 Pokemon',
        zelda: '⚔️ Zelda'
      };
      
      await interaction.editReply({
        embeds: [{
          color: tipo === 'pokemon' ? 0xFF4500 : (tipo === 'zelda' ? 0x90EE90 : (tipo === 'minecraft' ? 0x7CFC00 : 0xFFD700)),
          title: title,
          description: subcommand === 'select' ? `✅ Tema guardado: **${themeNames[tipo]}**` : null,
          image: { url: 'attachment://leaderboard.png' },
          footer: { text: `Total de usuarios activos: ${allUsers.length} | Tema: ${themeNames[tipo]}` }
        }],
        files: [attachment],
        components: [row]
      });
    } catch (error) {
      console.error('Error generating leaderboard:', error);
      await interaction.editReply('❌ Error al generar la tabla de clasificación.');
    }
  }
};
