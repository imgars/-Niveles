import { SlashCommandBuilder } from 'discord.js';
import db from '../utils/database.js';
import { isStaff, formatDuration } from '../utils/helpers.js';
import { getNightBoostStatus } from '../utils/timeBoost.js';

export default {
  data: new SlashCommandBuilder()
    .setName('boost')
    .setDescription('Gestiona los boosts de XP')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('[Staff] Añade un boost')
        .addNumberOption(option =>
          option.setName('multiplicador')
            .setDescription('Multiplicador (0.25 = 25%)')
            .setRequired(true)
            .setMinValue(0.01)
        )
        .addIntegerOption(option =>
          option.setName('duracion')
            .setDescription('Duración en minutos (0 = permanente)')
            .setRequired(true)
            .setMinValue(0)
        )
        .addUserOption(option =>
          option.setName('usuario')
            .setDescription('Usuario a boostear')
            .setRequired(false)
        )
        .addChannelOption(option =>
          option.setName('canal')
            .setDescription('Canal a boostear')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Ver lista de boosts activos')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Ver el estado de todos los boosts')
    ),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'add') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
      }
      
      const user = interaction.options.getUser('usuario');
      const channel = interaction.options.getChannel('canal');
      const multiplier = interaction.options.getNumber('multiplicador');
      const duration = interaction.options.getInteger('duracion');
      
      if (!user && !channel) {
        return interaction.reply({ content: '❌ Debes especificar un usuario o un canal.', ephemeral: true });
      }
      
      const durationMs = duration > 0 ? duration * 60 * 1000 : null;
      const description = `Boost de ${Math.floor(multiplier * 100)}%${duration > 0 ? ` por ${duration} minutos` : ' permanente'}`;
      
      if (user) {
        db.addBoost('user', user.id, multiplier, durationMs, description);
        return interaction.reply({
          embeds: [{
            color: 0xFFD700,
            title: '✅ Boost Añadido',
            description: `Boost de **${Math.floor(multiplier * 100)}%** añadido a <@${user.id}>`,
            fields: [{ name: 'Duración', value: duration > 0 ? `${duration} minutos` : 'Permanente' }]
          }]
        });
      }
      
      if (channel) {
        db.addBoost('channel', channel.id, multiplier, durationMs, description);
        return interaction.reply({
          embeds: [{
            color: 0xFFD700,
            title: '✅ Boost Añadido',
            description: `Boost de **${Math.floor(multiplier * 100)}%** añadido a <#${channel.id}>`,
            fields: [{ name: 'Duración', value: duration > 0 ? `${duration} minutos` : 'Permanente' }]
          }]
        });
      }
    }
    
    if (subcommand === 'list') {
      const allBoosts = {
        global: db.boosts.global,
        users: db.boosts.users,
        channels: db.boosts.channels
      };
      
      const fields = [];
      
      if (allBoosts.global.length > 0) {
        const globalList = allBoosts.global.map(b => `• ${b.description}`).join('\n');
        fields.push({ name: '🌍 Boosts Globales', value: globalList });
      }
      
      const userBoosts = [];
      for (const [userId, boosts] of Object.entries(allBoosts.users)) {
        if (boosts.length > 0) {
          userBoosts.push(`<@${userId}>: ${boosts[0].description}`);
        }
      }
      if (userBoosts.length > 0) {
        fields.push({ name: '👤 Boosts de Usuarios', value: userBoosts.join('\n') });
      }
      
      const channelBoosts = [];
      for (const [channelId, boosts] of Object.entries(allBoosts.channels)) {
        if (boosts.length > 0) {
          channelBoosts.push(`<#${channelId}>: ${boosts[0].description}`);
        }
      }
      if (channelBoosts.length > 0) {
        fields.push({ name: '📺 Boosts de Canales', value: channelBoosts.join('\n') });
      }
      
      if (fields.length === 0) {
        return interaction.reply('📊 No hay boosts activos actualmente.');
      }
      
      return interaction.reply({
        embeds: [{
          color: 0xFFD700,
          title: '📊 Lista de Boosts Activos',
          fields: fields
        }]
      });
    }
    
    if (subcommand === 'status') {
      const nightStatus = getNightBoostStatus();
      const fields = [];
      
      if (nightStatus.active) {
        fields.push({
          name: '🌙 Boost Nocturno',
          value: `Activo (+${Math.floor(nightStatus.multiplier * 100)}%)\nHorario: Venezuela (18:00 - 06:00)`,
          inline: false
        });
      } else {
        fields.push({
          name: '☀️ Boost Nocturno',
          value: 'Inactivo\nSe activará a las 18:00 (Venezuela)',
          inline: false
        });
      }
      
      if (db.boosts.global.length > 0) {
        const globalBoost = db.boosts.global[0];
        const remaining = globalBoost.expiresAt ? formatDuration(globalBoost.expiresAt - Date.now()) : 'Permanente';
        fields.push({
          name: '🌍 Boost Global',
          value: `${globalBoost.description}\nDuración restante: ${remaining}`,
          inline: false
        });
      }
      
      return interaction.reply({
        embeds: [{
          color: 0x7289DA,
          title: '📊 Estado de Boosts',
          description: '**Nota:** Los boosts son acumulativos',
          fields: fields,
          footer: { text: 'Usa /boost list para ver todos los boosts activos' }
        }]
      });
    }
  }
};
