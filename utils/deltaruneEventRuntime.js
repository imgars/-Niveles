import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { loadDeltaruneState, saveDeltaruneState } from './deltaruneEventService.js';

const MZINGERKAI_ID = '926219678798454875';
const DELTARUNE_EVENT_CHANNEL_ID = '1441276918916710501';

let runtimeClient = null;
let deltaruneInterval = null;

export async function postDeltaruneQuizEmbed(guild, reason = 'hourly') {
  const state = loadDeltaruneState();
  if (!state.active) return;
  const channel = guild.channels.cache.get(state.channelId || DELTARUNE_EVENT_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('deltarune_quiz_join')
      .setLabel('🧠 Iniciar Quiz Deltarune')
      .setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setColor(0x8A2BE2)
    .setTitle('🟣 Evento Deltarune: Quiz Especial')
    .setDescription(
      `¡Comienza un nuevo quiz de 5 preguntas!\n` +
      `Si aciertas las **5/5**, ganas la rankcard **Deltarune** totalmente gratis.\n\n` +
      `🎂 Este evento celebra el cumpleaños de <@${MZINGERKAI_ID}>. ¡Pásate a felicitarle!`
    )
    .addFields(
      { name: '🎯 Objetivo', value: 'Responde correctamente las 5 preguntas', inline: true },
      { name: '💎 Premio', value: 'Rankcard exclusiva Deltarune (gratis)', inline: true },
      { name: '⏰ Frecuencia', value: 'Se publica cada 1 hora', inline: true }
    )
    .setFooter({ text: reason === 'start' ? 'Primera ronda del evento' : 'Nueva ronda automática' })
    .setTimestamp();

  await channel.send({
    content: `🎉 ¡Feliz cumpleaños <@${MZINGERKAI_ID}>!`,
    embeds: [embed],
    components: [row]
  });

  saveDeltaruneState({ lastQuizAt: Date.now() });
}

function startDeltaruneInterval() {
  if (deltaruneInterval) clearInterval(deltaruneInterval);
  deltaruneInterval = setInterval(async () => {
    const state = loadDeltaruneState();
    if (!state.active || !runtimeClient) return;
    for (const guild of runtimeClient.guilds.cache.values()) {
      await postDeltaruneQuizEmbed(guild).catch(err => console.error('Error enviando quiz Deltarune:', err));
    }
  }, 60 * 60 * 1000);
}

export function initializeDeltaruneRuntime(client) {
  runtimeClient = client;
  const state = loadDeltaruneState();
  if (state.active) startDeltaruneInterval();
}

export async function startDeltaruneEvent(client, guild) {
  runtimeClient = client || runtimeClient;
  saveDeltaruneState({ active: true, channelId: DELTARUNE_EVENT_CHANNEL_ID });
  startDeltaruneInterval();
  if (guild) {
    await postDeltaruneQuizEmbed(guild, 'start');
  }
}

export function stopDeltaruneEvent() {
  if (deltaruneInterval) {
    clearInterval(deltaruneInterval);
    deltaruneInterval = null;
  }
  saveDeltaruneState({ active: false, shopUnlocked: true });
}

