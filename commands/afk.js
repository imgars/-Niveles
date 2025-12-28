import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../utils/database.js';
import { isMongoConnected, saveUserToMongo } from '../utils/mongoSync.js';

export default {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Establece tu estado como AFK')
    .addStringOption(option => 
      option.setName('motivo')
        .setDescription('El motivo de tu AFK')
        .setRequired(false)
    ),
  
  async execute(interaction) {
    const reason = interaction.options.getString('motivo') || 'No especificado';
    const userData = db.getUser(interaction.guild.id, interaction.user.id);
    
    userData.afk = {
      status: true,
      reason: reason,
      timestamp: Date.now()
    };
    
    db.saveUser(interaction.guild.id, interaction.user.id, userData);
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setDescription(`✅ <@${interaction.user.id}>, ahora estás AFK: **${reason}**`)
      .setFooter({ text: 'Se te quitará el AFK cuando envíes un mensaje.' });
      
    return interaction.reply({ embeds: [embed] });
  }
};
