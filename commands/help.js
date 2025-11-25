import { SlashCommandBuilder } from 'discord.js';
import { isStaff } from '../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra los comandos disponibles')
    .addStringOption(option =>
      option.setName('tipo')
        .setDescription('Tipo de ayuda')
        .setRequired(false)
        .addChoices(
          { name: 'Usuarios', value: 'users' },
          { name: 'Staff', value: 'staff' }
        )
    ),
  
  async execute(interaction) {
    const type = interaction.options.getString('tipo');
    const showStaff = type === 'staff' || (isStaff(interaction.member) && !type);
    
    if (showStaff && !isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ No tienes permisos para ver los comandos de staff.', ephemeral: true });
    }
    
    if (showStaff) {
      return interaction.reply({
        embeds: [{
          color: 0xFFD700,
          title: '📋 Comandos de Staff',
          description: 'Lista de comandos disponibles para el staff',
          fields: [
            { name: '/addlevel <usuario> <cantidad>', value: 'Añadir niveles a un usuario', inline: false },
            { name: '/removelevel <usuario> <cantidad>', value: 'Quitar niveles a un usuario', inline: false },
            { name: '/setlevel <usuario> <nivel>', value: 'Establecer nivel exacto', inline: false },
            { name: '/xp add/remove/reset', value: 'Gestionar XP de usuarios', inline: false },
            { name: '/boost add <usuario/canal>', value: 'Añadir boost a usuario/canal', inline: false },
            { name: '/globalboost', value: 'Añadir boost global al servidor', inline: false },
            { name: '/removeglobalboost', value: 'Quitar boost global', inline: false },
            { name: '/banxp user/channel', value: 'Banear de ganar XP', inline: false },
            { name: '/unbanxp user/channel', value: 'Desbanear', inline: false },
            { name: '/resettemporada', value: 'Resetear todos los niveles', inline: false },
            { name: '/clearlevelroles', value: 'Quitar todos los roles de nivel', inline: false },
            { name: '/embed', value: 'Crear embed personalizado', inline: false },
            { name: '/mensaje <texto>', value: 'Enviar mensaje de texto', inline: false }
          ]
        }]
      });
    }
    
    return interaction.reply({
      embeds: [{
        color: 0x43B581,
        title: '📋 Comandos de Usuarios',
        description: 'Lista de comandos disponibles',
        fields: [
          { name: '/level [usuario]', value: 'Ver nivel y XP', inline: false },
          { name: '/rank [usuario]', value: 'Ver nivel y XP (alternativa)', inline: false },
          { name: '/nivel [usuario]', value: 'Ver nivel y XP (alternativa)', inline: false },
          { name: '/leaderboard', value: 'Ver tabla de clasificación', inline: false },
          { name: '/lb', value: 'Ver tabla de clasificación (alternativa)', inline: false },
          { name: '/rewards list', value: 'Ver recompensas por nivel', inline: false },
          { name: '/boost list', value: 'Ver boosts activos', inline: false },
          { name: '/boost status', value: 'Ver estado de boosts', inline: false },
          { name: '/minigame', value: 'Jugar minijuegos para ganar recompensas', inline: false }
        ],
        footer: { text: '🎮 ¡Gana XP chateando y sube de nivel!' }
      }]
    });
  }
};
