import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { ITEMS, ITEM_CATEGORIES, buyItem, getUserEconomy } from '../utils/economyDB.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tienda')
    .setDescription('Compra items para mejorar tus trabajos')
    .addStringOption(option =>
      option.setName('categoria')
        .setDescription('Categoría de items')
        .addChoices(
          { name: 'Ver todo el catálogo', value: 'catalogo' },
          { name: 'Herramientas', value: 'herramienta' },
          { name: 'Tecnología', value: 'tecnologia' },
          { name: 'Vehículos', value: 'vehiculo' },
          { name: 'Instrumentos', value: 'instrumento' },
          { name: 'Consumibles', value: 'consumible' },
          { name: 'Coleccionables', value: 'coleccionable' }
        )
    )
    .addStringOption(option =>
      option.setName('comprar')
        .setDescription('Item a comprar')
        .addChoices(
          { name: 'Caña de Pesca - 500', value: 'cana_pesca' },
          { name: 'Hacha - 600', value: 'hacha' },
          { name: 'Pico - 800', value: 'pico' },
          { name: 'Pala - 700', value: 'pala' },
          { name: 'Laptop Gaming - 2000', value: 'laptop' },
          { name: 'Cámara HD - 1500', value: 'camara' },
          { name: 'Moto de Reparto - 1200', value: 'moto' },
          { name: 'Guitarra Eléctrica - 1800', value: 'guitarra' },
          { name: 'Kit de Arte - 1000', value: 'lienzo' },
          { name: 'Utensilios de Chef - 900', value: 'utensilios' },
          { name: 'Arco de Caza - 1400', value: 'arco' },
          { name: 'Pack de Semillas - 400', value: 'semillas' },
          { name: 'Bebida Energética - 150', value: 'energia' },
          { name: 'Trébol de la Suerte - 500', value: 'suerte' },
          { name: 'Escudo Anti-Robo - 800', value: 'escudo' },
          { name: 'Corona Dorada - 10000', value: 'corona' },
          { name: 'Diamante Brillante - 5000', value: 'diamante' },
          { name: 'Trofeo de Oro - 3000', value: 'trofeo' },
          { name: 'Bicicleta - 300', value: 'bicicleta' }
        )
    ),
  
  async execute(interaction) {
    const category = interaction.options.getString('categoria');
    const itemId = interaction.options.getString('comprar');
    const economy = await getUserEconomy(interaction.guildId, interaction.user.id);

    if (itemId) {
      const item = ITEMS[itemId];
      
      if (!item) {
        return interaction.reply({ content: '❌ Item no encontrado', flags: 64 });
      }

      if (economy.lagcoins < item.price) {
        return interaction.reply({ content: `❌ No tienes suficientes Lagcoins. Necesitas **${item.price}** pero tienes **${economy.lagcoins}**`, flags: 64 });
      }

      if (economy.items && economy.items.includes(itemId) && item.category !== 'consumible') {
        return interaction.reply({ content: '❌ Ya tienes este item', flags: 64 });
      }

      const result = await buyItem(interaction.guildId, interaction.user.id, itemId);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ ¡Compra Realizada!')
        .setDescription(`Compraste: **${item.emoji} ${item.name}**`)
        .addFields(
          { name: 'Descripción', value: item.description },
          { name: 'Precio', value: `${item.price} Lagcoins`, inline: true },
          { name: 'Nuevo Saldo', value: `${result.lagcoins} Lagcoins`, inline: true }
        );

      if (item.unlocks) {
        embed.addFields({ name: '🔓 Desbloquea', value: `Trabajo: ${item.unlocks}` });
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (category === 'catalogo' || !category) {
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🛒 Tienda de Items')
        .setDescription(`Tu saldo: **${economy.lagcoins} Lagcoins**\n\nUsa \`/tienda comprar:<item>\` para comprar`)
        .setFooter({ text: 'Los items desbloquean trabajos mejor pagados' });

      for (const [catId, catInfo] of Object.entries(ITEM_CATEGORIES)) {
        const categoryItems = Object.entries(ITEMS)
          .filter(([_, item]) => item.category === catId)
          .map(([id, item]) => {
            const owned = economy.items?.includes(id) ? '✓' : '';
            return `${item.emoji} **${item.name}** - ${item.price} ${owned}`;
          })
          .join('\n');
        
        if (categoryItems) {
          embed.addFields({ 
            name: `${catInfo.emoji} ${catInfo.name}`, 
            value: categoryItems,
            inline: true 
          });
        }
      }

      return interaction.reply({ embeds: [embed] });
    }

    const categoryInfo = ITEM_CATEGORIES[category];
    const categoryItems = Object.entries(ITEMS)
      .filter(([_, item]) => item.category === category);

    if (categoryItems.length === 0) {
      return interaction.reply({ content: '❌ No hay items en esta categoría', flags: 64 });
    }

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`${categoryInfo.emoji} ${categoryInfo.name}`)
      .setDescription(`Tu saldo: **${economy.lagcoins} Lagcoins**`);

    categoryItems.forEach(([id, item]) => {
      const owned = economy.items?.includes(id) ? ' ✅ (Ya tienes)' : '';
      const canAfford = economy.lagcoins >= item.price ? '💰' : '❌';
      let value = `${item.description}\n${canAfford} Precio: **${item.price}** Lagcoins${owned}`;
      
      if (item.unlocks) {
        value += `\n🔓 Desbloquea: ${item.unlocks}`;
      }
      if (item.effect) {
        value += `\n✨ Efecto: ${item.effect.type}`;
      }
      
      embed.addFields({ 
        name: `${item.emoji} ${item.name}`, 
        value,
        inline: true 
      });
    });

    embed.setFooter({ text: 'Usa /tienda comprar:<nombre> para comprar' });

    return interaction.reply({ embeds: [embed] });
  }
};
