import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { getUserProfile, ITEMS, COUNTRIES, getUserActivePowerups, getUserInsurance } from '../utils/economyDB.js';
import { generateProfileImage } from '../utils/cardGenerator.js';
import db from '../utils/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Ver tu perfil o el de otro usuario como imagen')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario del que ver perfil')
    ),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    
    try {
      const profile = await getUserProfile(interaction.guildId, targetUser.id);
      const userData = db.getUser(interaction.guildId, targetUser.id);
      
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!member) {
        return interaction.editReply('❌ No se pudo encontrar al usuario.');
      }
      
      const imageBuffer = await generateProfileImage(member, profile, userData);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'perfil.png' });
      
      return interaction.editReply({ 
        files: [attachment],
        embeds: [{
          color: 0x00CED1,
          title: `📊 Perfil de ${targetUser.username}`,
          image: { url: 'attachment://perfil.png' }
        }]
      });
    } catch (error) {
      console.error('Error en perfil:', error);
      return interaction.editReply({ content: '❌ Error al cargar el perfil' });
    }
  }
};
