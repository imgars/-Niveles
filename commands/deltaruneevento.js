import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { isStaff } from '../utils/helpers.js';
import { loadDeltaruneState, saveDeltaruneState } from '../utils/deltaruneEventService.js';
import { deltaruneConfigSessions } from '../utils/deltaruneEventMemory.js';
import { startDeltaruneEvent, stopDeltaruneEvent } from '../utils/deltaruneEventRuntime.js';

const MZINGERKAI_ID = '926219678798454875';
const DELTARUNE_EVENT_CHANNEL_ID = '1441276918916710501';

export default {
  data: new SlashCommandBuilder()
    .setName('deltaruneevento')
    .setDescription('Gestiona el evento especial de Deltarune (Solo Staff)')
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('Configura las 5 preguntas del evento con modales')
    )
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Inicia el evento y activa publicaciones cada 1 hora')
    )
    .addSubcommand(sub =>
      sub.setName('stop')
        .setDescription('Finaliza el evento y desbloquea la rankcard en la tienda')
    ),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Solo el staff puede usar este comando.', flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'config') {
      deltaruneConfigSessions.set(interaction.user.id, { questions: Array(5).fill(null) });
      saveDeltaruneState({ configuredBy: interaction.user.id, configuredAt: Date.now() });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`deltarune_open_q_1_${interaction.user.id}`)
          .setLabel('Configurar pregunta 1')
          .setStyle(ButtonStyle.Primary)
      );

      const embed = new EmbedBuilder()
        .setColor(0x8A2BE2)
        .setTitle('🛠️ Configuración del Evento Deltarune')
        .setDescription(
          'Vas a configurar **5 preguntas** mediante modales.\n' +
          'Cada pregunta debe incluir 4 opciones (A/B/C/D) y una respuesta correcta.\n\n' +
          `🎂 Tema del evento: cumpleaños de <@${MZINGERKAI_ID}> (¡felicítale!).`
        )
        .setFooter({ text: 'Pulsa el botón para abrir el primer modal' });

      return interaction.reply({ embeds: [embed], components: [row], flags: 64 });
    }

    if (sub === 'start') {
      const state = loadDeltaruneState();
      if (!state.questions || state.questions.length !== 5) {
        return interaction.reply({ content: '❌ Primero configura las 5 preguntas con `/deltaruneevento config`.', flags: 64 });
      }

      await startDeltaruneEvent(interaction.client, interaction.guild);
      return interaction.reply({
        content:
          `✅ Evento Deltarune iniciado.\n` +
          `Se enviará un quiz cada 1 hora en <#${DELTARUNE_EVENT_CHANNEL_ID}>.\n` +
          `🎉 ¡Feliz cumpleaños, <@${MZINGERKAI_ID}>!`,
        flags: 64
      });
    }

    if (sub === 'stop') {
      stopDeltaruneEvent();
      return interaction.reply({
        content:
          '🛑 Evento Deltarune finalizado.\n' +
          '✅ La rankcard **Deltarune** ahora está disponible en `/shop` por **15000 Lagcoins**.\n' +
          `🎂 Gracias por celebrar y felicitar a <@${MZINGERKAI_ID}>.`,
        flags: 64
      });
    }
  }
};

