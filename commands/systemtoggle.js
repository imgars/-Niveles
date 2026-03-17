import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { isStaff } from '../utils/helpers.js';
import db from '../utils/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sistema')
    .setDescription('Activa o desactiva sistemas del bot (Solo Staff)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Activa o desactiva un sistema')
        .addStringOption(option =>
          option.setName('sistema')
            .setDescription('Sistema a modificar')
            .setRequired(true)
            .addChoices(
              { name: '💰 Economía', value: 'economy' },
              { name: '🎰 Casino', value: 'casino' },
              { name: '💼 Trabajos', value: 'jobs' },
              { name: '🎮 Minijuegos', value: 'minigames' },
              { name: '🛡️ Seguros', value: 'insurance' },
              { name: '🔫 Robos', value: 'robbery' },
              { name: '🎯 Misiones', value: 'missions' },
              { name: '⚡ Power-ups', value: 'powerups' },
              { name: '⭐ Niveles (XP)', value: 'niveles' },
              { name: '🃏 Rankcards (todas)', value: 'rankcard' },
              { name: '⛏️ Rankcard Minecraft', value: 'rankcard_minecraft' },
              { name: '🎲 Rankcard Roblox', value: 'rankcard_roblox' },
              { name: '🥊 Rankcard Brawl Stars', value: 'rankcard_brawlstars' }
            )
        )
        .addStringOption(option =>
          option.setName('estado')
            .setDescription('Nuevo estado del sistema')
            .setRequired(true)
            .addChoices(
              { name: '✅ Activar', value: 'on' },
              { name: '❌ Desactivar', value: 'off' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Ver el estado de todos los sistemas')
    ),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Solo el staff puede usar este comando.', ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'status') {
      const systems = db.getSystemStatus(interaction.guild.id);
      
      const SYSTEM_NAMES = {
        economy: '💰 Economía',
        casino: '🎰 Casino',
        jobs: '💼 Trabajos',
        minigames: '🎮 Minijuegos',
        insurance: '🛡️ Seguros',
        robbery: '🔫 Robos',
        missions: '🎯 Misiones',
        powerups: '⚡ Power-ups',
        niveles: '⭐ Niveles (XP)',
        rankcard: '🃏 Rankcards (todas)',
        rankcard_minecraft: '⛏️ Rankcard Minecraft',
        rankcard_roblox: '🎲 Rankcard Roblox',
        rankcard_brawlstars: '🥊 Rankcard Brawl Stars'
      };

      const statusLines = Object.entries(SYSTEM_NAMES).map(([key, name]) => {
        const isEnabled = systems[key] !== false;
        return `${isEnabled ? '✅' : '❌'} ${name}: ${isEnabled ? 'Activado' : 'Desactivado'}`;
      });

      return interaction.reply({
        embeds: [{
          color: 0x7289DA,
          title: '⚙️ Estado de los Sistemas',
          description: statusLines.join('\n'),
          footer: { text: 'Usa /sistema toggle para cambiar el estado' }
        }]
      });
    }

    if (subcommand === 'toggle') {
      const system = interaction.options.getString('sistema');
      const state = interaction.options.getString('estado');
      const isEnabled = state === 'on';

      db.setSystemStatus(interaction.guild.id, system, isEnabled);

      const SYSTEM_NAMES = {
        economy: '💰 Economía',
        casino: '🎰 Casino',
        jobs: '💼 Trabajos',
        minigames: '🎮 Minijuegos',
        insurance: '🛡️ Seguros',
        robbery: '🔫 Robos',
        missions: '🎯 Misiones',
        powerups: '⚡ Power-ups',
        niveles: '⭐ Niveles (XP)',
        rankcard: '🃏 Rankcards (todas)',
        rankcard_minecraft: '⛏️ Rankcard Minecraft',
        rankcard_roblox: '🎲 Rankcard Roblox',
        rankcard_brawlstars: '🥊 Rankcard Brawl Stars'
      };

      return interaction.reply({
        embeds: [{
          color: isEnabled ? 0x43B581 : 0xF04747,
          title: `${isEnabled ? '✅' : '❌'} Sistema ${isEnabled ? 'Activado' : 'Desactivado'}`,
          description: `El sistema de **${SYSTEM_NAMES[system]}** ha sido ${isEnabled ? 'activado' : 'desactivado'}.`,
          footer: { text: `Por: ${interaction.user.tag}` },
          timestamp: new Date().toISOString()
        }]
      });
    }
  }
};
