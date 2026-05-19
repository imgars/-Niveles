import { SlashCommandBuilder } from 'discord.js';
import { sendConfessionDm } from '../utils/confessionService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('confesar')
    .setDescription('Envía una confesión anónima al canal de confesiones'),

  async execute(interaction) {
    const dmResult = await sendConfessionDm(interaction.client, interaction.user);

    if (!dmResult.ok) {
      return interaction.reply({
        content: '❌ No pude enviarte un mensaje privado. Activa los MD del servidor en **Configuración → Privacidad** y vuelve a intentar.',
        flags: 64
      });
    }

    return interaction.reply({
      content: '💌 Te envié un mensaje privado. Ábrelo y pulsa **Escribir confesión** para publicarla de forma anónima.',
      flags: 64
    });
  }
};
