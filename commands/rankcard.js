import { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../utils/database.js';
import { getAvailableThemes, getCardTheme, getThemeButtonStyle } from '../utils/cardGenerator.js';
import { createVerificationToken, MARKETPLACE_COMMISSION } from '../utils/rankcardService.js';
import { isStaff } from '../utils/helpers.js';

const THEME_NAMES = {
  pixel: '🎮 Pixel Art',
  ocean: '🌊 Océano',
  zelda: '⚔️ Zelda',
  pokemon: '🔴 Pokémon',
  geometrydash: '⚡ Geometry Dash',
  night: '🌙 Noche Estrellada',
  roblox: '🟦 Roblox',
  minecraft: '⛏️ Minecraft',
  fnaf: '🐻 FNAF',
  cuphead: '🎪 Cuphead',
  undertale: '❤️ Undertale',
  fortnite: '🔫 Fortnite',
  valentine: '💘 San Valentín',
  deltarune: '🟣 Deltarune'
};

export default {
  data: new SlashCommandBuilder()
    .setName('rankcard')
    .setDescription('Gestiona tu tarjeta de rango')
    .addSubcommand(subcommand =>
      subcommand
        .setName('select')
        .setDescription('Selecciona el tema de tu tarjeta')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('link')
        .setDescription('Solo staff: genera enlace para el editor web de rankcards (7500 Lagcoins base)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('preview')
        .setDescription('Genera una vista previa rápida de tu rankcard personalizada')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('marketplace')
        .setDescription('Explora la tienda de rankcards de la comunidad')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('publish')
        .setDescription('Publica tu rankcard en la tienda de la comunidad')
        .addStringOption(opt => opt.setName('titulo').setDescription('Título de tu publicación').setRequired(true).setMaxLength(50))
        .addIntegerOption(opt => opt.setName('precio').setDescription('Precio en Lagcoins (500-500000)').setRequired(true).setMinValue(500).setMaxValue(500000))
        .addStringOption(opt => opt.setName('descripcion').setDescription('Descripción de tu diseño').setRequired(false).setMaxLength(200))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('history')
        .setDescription('Ver historial de tus diseños anteriores')
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'link') {
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member || !isStaff(member)) {
          return interaction.reply({
            content: '❌ Solo el **staff** puede usar este comando. Pide un enlace a un administrador.',
            flags: 64
          });
        }
        const token = createVerificationToken(interaction.user.id, interaction.guild.id);
        const baseUrl = process.env.WEB_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`;
        const editorUrl = `${baseUrl}/rankcard-editor.html?token=${token}`;

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('🎨 Editor de Rankcard Personalizada v3')
          .setDescription('Usa el enlace abajo para diseñar tu rankcard en la web. **Válido por 15 minutos.**')
          .addFields(
            { name: '💰 Precio Base', value: '7,500 Lagcoins', inline: true },
            { name: '🆕 Nuevas funciones', value: 'Gradientes, marcos, animaciones GIF, tienda de la comunidad, capas, historial', inline: false },
            { name: '🔗 Enlace', value: `[Abrir Editor](${editorUrl})`, inline: false },
            { name: '⚠️ Importante', value: 'Este enlace es privado. Solo tú debes usarlo.', inline: false }
          )
          .setFooter({ text: 'Usa /level para ver tu tarjeta actual' });

        await interaction.reply({ embeds: [embed], flags: 64 });

        try {
          const dmEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎨 Tu enlace de editor de Rankcard')
            .setDescription(`[Haz clic aquí para abrir el editor](${editorUrl})`)
            .setFooter({ text: 'Expira en 15 minutos' });
          await interaction.user.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          await interaction.followUp({ content: '❌ No pude enviarte el DM. Abre el enlace del mensaje anterior.', flags: 64 });
        }
        return;
      }

      if (subcommand === 'preview') {
        await interaction.deferReply({ flags: 64 });

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const userData = db.getUser(interaction.guild.id, interaction.user.id);

        if (!userData.rankcard_custom || typeof userData.rankcard_custom !== 'object') {
          return interaction.editReply({
            content: '❌ No tienes una rankcard personalizada. Usa `/rankcard link` para crear una.'
          });
        }

        try {
          const { generateCustomRankCard } = await import('../utils/cardGenerator.js');
          const { getXPProgress } = await import('../utils/xpSystem.js');
          const progress = getXPProgress(userData.totalXp || 0, userData.level || 0);
          const cardBuffer = await generateCustomRankCard(member, userData, progress);

          const isAnimated = userData.rankcard_custom.animated && userData.rankcard_custom.animations?.length > 0;
          const { AttachmentBuilder } = await import('discord.js');
          const attachment = new AttachmentBuilder(cardBuffer, { name: isAnimated ? 'rankcard.gif' : 'rankcard.png' });

          const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('👁️ Vista Previa de tu Rankcard')
            .setImage(isAnimated ? 'attachment://rankcard.gif' : 'attachment://rankcard.png')
            .setFooter({ text: isAnimated ? '✨ Animada con ' + userData.rankcard_custom.animations.length + ' efecto(s)' : 'Vista previa estática' });

          return interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch (e) {
          console.error('Error generating preview:', e);
          return interaction.editReply({ content: '❌ Error al generar la vista previa: ' + e.message });
        }
      }

      if (subcommand === 'marketplace') {
        const listings = db.getMarketplaceListings({ limit: 10, sortBy: 'newest', guildId: interaction.guild.id });

        if (listings.total === 0) {
          return interaction.reply({
            content: '🛒 **Tienda de Rankcards** — No hay publicaciones aún. ¡Sé el primero en publicar con `/rankcard publish`!',
            flags: 64
          });
        }

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🛒 Tienda de Rankcards de la Comunidad')
          .setDescription(`${listings.total} diseño(s) disponibles. Usa el editor web para comprar.`)
          .setFooter({ text: 'Usa /rankcard link para abrir el editor y comprar diseños' });

        const fields = listings.listings.slice(0, 10).map((l, i) => ({
          name: `${i + 1}. ${l.title}`,
          value: `por **${l.authorName}** — 💰 ${l.price.toLocaleString()} LC — ${l.sales} ventas`,
          inline: false
        }));

        embed.addFields(fields);

        return interaction.reply({ embeds: [embed], flags: 64 });
      }

      if (subcommand === 'publish') {
        const userData = db.getUser(interaction.guild.id, interaction.user.id);

        if (!userData.rankcard_custom || typeof userData.rankcard_custom !== 'object') {
          return interaction.reply({
            content: '❌ No tienes una rankcard personalizada para publicar. Crea una con `/rankcard link`.',
            flags: 64
          });
        }

        const existingListings = db.getUserMarketplaceListings(interaction.user.id, interaction.guild.id);
        if (existingListings.length >= 5) {
          return interaction.reply({
            content: '❌ Ya tienes 5 publicaciones activas. Elimina alguna desde el editor web.',
            flags: 64
          });
        }

        const title = interaction.options.getString('titulo');
        const price = interaction.options.getInteger('precio');
        const description = interaction.options.getString('descripcion') || '';

        const configCopy = JSON.parse(JSON.stringify(userData.rankcard_custom));
        delete configCopy.drawLayer;

        const listing = db.addMarketplaceListing({
          authorId: interaction.user.id,
          authorName: interaction.user.username,
          guildId: interaction.guild.id,
          title,
          description,
          price,
          config: configCopy,
          previewBase64: null
        });

        const commission = Math.floor(price * MARKETPLACE_COMMISSION);
        const earnings = price - commission;

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('📤 Diseño publicado en la Tienda')
          .addFields(
            { name: 'Título', value: listing.title, inline: true },
            { name: 'Precio', value: `${listing.price.toLocaleString()} LC`, inline: true },
            { name: 'Ganancias por venta', value: `${earnings.toLocaleString()} LC (85%)`, inline: true },
            { name: 'Comisión', value: `${commission.toLocaleString()} LC (15%)`, inline: true }
          )
          .setFooter({ text: 'Los usuarios pueden comprar tu diseño desde el editor web' });

        return interaction.reply({ embeds: [embed], flags: 64 });
      }

      if (subcommand === 'history') {
        const history = db.getDesignHistory(interaction.guild.id, interaction.user.id);

        if (history.length === 0) {
          return interaction.reply({
            content: '📜 **Historial de Diseños** — No tienes diseños anteriores guardados. Se guardan automáticamente al comprar o cambiar tu rankcard.',
            flags: 64
          });
        }

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('📜 Historial de Diseños')
          .setDescription('Últimos diseños guardados. Usa el editor web para restaurar uno.')
          .setFooter({ text: 'Abre el editor web con /rankcard link para restaurar' });

        const fields = history.map((h, i) => {
          const date = new Date(h.savedAt).toLocaleString('es-ES');
          const features = [];
          if (h.config?.gradient) features.push('Gradiente');
          if (h.config?.frameId) features.push('Marco');
          if (h.config?.animated) features.push('Animado');
          if (h.config?.textEffect && h.config.textEffect !== 'none') features.push('Efecto texto');
          return {
            name: `#${i + 1} — ${date}`,
            value: features.length > 0 ? features.join(', ') : 'Diseño básico',
            inline: false
          };
        });

        embed.addFields(fields);
        return interaction.reply({ embeds: [embed], flags: 64 });
      }
      
      if (subcommand === 'select') {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const userData = db.getUser(interaction.guild.id, interaction.user.id);
        const purchasedCards = userData.purchasedCards || [];
        const available = await getAvailableThemes(member, userData.level, purchasedCards);

        const hasCustomCard = userData.rankcard_custom && typeof userData.rankcard_custom === 'object';

        if (available.length === 1 && !hasCustomCard) {
          return interaction.reply({
            content: `❌ Solo tienes 1 tema disponible: ${THEME_NAMES[available[0]]}`,
            flags: 64
          });
        }

        const options = available.map(theme =>
          new StringSelectMenuOptionBuilder()
            .setLabel(THEME_NAMES[theme] || theme)
            .setValue(theme)
            .setDescription(`Cambia a tema ${THEME_NAMES[theme] || theme}`)
            .setDefault(userData.selectedCardTheme === theme && userData.selectedCardTheme !== 'custom')
        );

        if (hasCustomCard) {
          options.unshift(
            new StringSelectMenuOptionBuilder()
              .setLabel('🎨 Personalizada')
              .setValue('custom')
              .setDescription('Usa tu tarjeta personalizada')
              .setDefault(!userData.selectedCardTheme || userData.selectedCardTheme === 'custom')
          );
        }

        const select = new StringSelectMenuBuilder()
          .setCustomId('rankcard_theme_select')
          .setPlaceholder('Elige tu tema de tarjeta')
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(select);

        const embed = new EmbedBuilder()
          .setColor('#FF10F0')
          .setTitle('🎨 Selecciona tu Tarjeta de Rango')
          .setDescription(`Tienes ${available.length} temas disponibles`)
          .addFields(
            { name: 'Seleccionado', value: `${userData.selectedCardTheme === 'custom' ? '🎨 Personalizada' : (THEME_NAMES[userData.selectedCardTheme] || 'automático')}` }
          );

        return interaction.reply({ embeds: [embed], components: [row], flags: 64 });
      }
    } catch (error) {
      console.error('Error in rankcard command:', error);
      return interaction.reply({ content: `❌ Error: ${error.message}`, flags: 64 });
    }
  }
};
