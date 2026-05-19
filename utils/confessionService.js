import fs from 'fs';
import path from 'path';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { CONFIG } from '../config.js';

const DATA_FILE = path.join('./data', 'confessions.json');
export const CONFESSION_REACTIONS = ['❤️', '💔', '🙈'];
const CONFESSION_COLOR = 0xFF69B4;
const COOLDOWN_MS = 5 * 60 * 1000;

const pendingCooldowns = new Map();

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error cargando confesiones:', error.message);
  }
  return { counter: 0, promptMessageId: null };
}

function saveData(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error guardando confesiones:', error.message);
  }
}

function getNextConfessionNumber() {
  const data = loadData();
  data.counter = (data.counter || 0) + 1;
  saveData(data);
  return data.counter;
}

function formatConfessionDate(date = new Date()) {
  return date.toLocaleString('es-VE', {
    timeZone: CONFIG.VENEZUELA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function parseTargetUser(raw, guild) {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const mentionMatch = trimmed.match(/^<@!?(\d+)>$/);
  const id = mentionMatch ? mentionMatch[1] : (/^\d{17,20}$/.test(trimmed) ? trimmed : null);
  if (!id || !guild) return id ? { id, tag: null } : null;
  const member = guild.members.cache.get(id);
  return { id, tag: member?.user?.username || null };
}

export function buildConfessionEmbed(number, text, botName, targetUser = null) {
  const embed = new EmbedBuilder()
    .setColor(CONFESSION_COLOR)
    .setTitle(`💕 Confesión #${number}`)
    .setDescription(text.trim());

  if (targetUser?.id) {
    embed.addFields({
      name: '💘 Para:',
      value: `<@${targetUser.id}>`,
      inline: false
    });
  }

  embed.setFooter({
    text: `Confesión anónima vía ${botName} 💌 | ${formatConfessionDate()}`
  });

  return embed;
}

export function buildPromptEmbed(botName) {
  return new EmbedBuilder()
    .setColor(CONFESSION_COLOR)
    .setTitle('💕 Confesiones Anónimas')
    .setDescription(
      '¿Tienes algo que decir sin revelar tu identidad?\n\n' +
      '• Usa el comando `/confesar`\n' +
      '• O reacciona con ❤️ 💔 🙈 a este mensaje\n\n' +
      'Te enviaremos un mensaje privado para escribir tu confesión de forma anónima.'
    )
    .setFooter({ text: `${botName} 💌` });
}

export function buildDmPromptEmbed() {
  return new EmbedBuilder()
    .setColor(CONFESSION_COLOR)
    .setTitle('💌 Confesión anónima')
    .setDescription(
      'Tu identidad **no se mostrará** en el canal de confesiones.\n\n' +
      'Pulsa el botón de abajo para escribir tu confesión.'
    );
}

export function buildConfessionStartButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confession_start')
      .setLabel('Escribir confesión')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('💌')
  );
}

export function buildConfessionModal() {
  const modal = new ModalBuilder()
    .setCustomId('confession_modal')
    .setTitle('Confesión anónima');

  const textInput = new TextInputBuilder()
    .setCustomId('confession_text')
    .setLabel('Tu confesión')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Escribe aquí lo que quieras confesar...')
    .setRequired(true)
    .setMaxLength(2000);

  const targetInput = new TextInputBuilder()
    .setCustomId('confession_target')
    .setLabel('Para (opcional: @usuario o ID)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Deja vacío si no va dirigida a nadie')
    .setRequired(false)
    .setMaxLength(100);

  modal.addComponents(
    new ActionRowBuilder().addComponents(textInput),
    new ActionRowBuilder().addComponents(targetInput)
  );

  return modal;
}

export async function sendConfessionDm(client, user) {
  const dmChannel = await user.createDM().catch(() => null);
  if (!dmChannel) {
    return { ok: false, error: 'dm_closed' };
  }

  await dmChannel.send({
    embeds: [buildDmPromptEmbed()],
    components: [buildConfessionStartButton()]
  });

  return { ok: true };
}

export async function postConfession(client, text, targetRaw = null, guild = null) {
  const channelId = CONFIG.CONFESSION_CHANNEL_ID;
  let channel = null;

  for (const g of client.guilds.cache.values()) {
    const ch = g.channels.cache.get(channelId);
    if (ch?.isTextBased()) {
      channel = ch;
      if (!guild) guild = g;
      break;
    }
  }

  if (!channel) {
    channel = await client.channels.fetch(channelId).catch(() => null);
    if (channel?.guild) guild = channel.guild;
  }

  if (!channel?.isTextBased()) {
    return { ok: false, error: 'channel_not_found' };
  }

  const targetUser = parseTargetUser(targetRaw, guild);
  const number = getNextConfessionNumber();
  const embed = buildConfessionEmbed(number, text, client.user.username, targetUser);

  const message = await channel.send({ embeds: [embed] });
  for (const emoji of CONFESSION_REACTIONS) {
    await message.react(emoji).catch(() => {});
  }

  return { ok: true, number, messageId: message.id };
}

function isOnCooldown(userId) {
  const until = pendingCooldowns.get(userId);
  if (!until) return false;
  if (Date.now() >= until) {
    pendingCooldowns.delete(userId);
    return false;
  }
  return true;
}

function setCooldown(userId) {
  pendingCooldowns.set(userId, Date.now() + COOLDOWN_MS);
}

export async function handleConfessionModalSubmit(interaction, client) {
  if (interaction.customId !== 'confession_modal') return false;

  const text = interaction.fields.getTextInputValue('confession_text')?.trim();
  const targetRaw = interaction.fields.getTextInputValue('confession_target')?.trim() || '';

  if (!text || text.length < 3) {
    await interaction.reply({
      content: '❌ La confesión debe tener al menos 3 caracteres.',
      flags: 64
    });
    return true;
  }

  if (isOnCooldown(interaction.user.id)) {
    await interaction.reply({
      content: '⏳ Debes esperar unos minutos antes de enviar otra confesión.',
      flags: 64
    });
    return true;
  }

  await interaction.deferReply({ flags: 64 });

  const guild = client.guilds.cache.find(g => g.channels.cache.has(CONFIG.CONFESSION_CHANNEL_ID))
    || client.guilds.cache.first();

  const result = await postConfession(client, text, targetRaw, guild);

  if (!result.ok) {
    await interaction.editReply({
      content: '❌ No se pudo publicar la confesión. Avisa a un administrador.'
    });
    return true;
  }

  setCooldown(interaction.user.id);
  await interaction.editReply({
    content: `✅ Tu confesión **#${result.number}** fue publicada de forma anónima en <#${CONFIG.CONFESSION_CHANNEL_ID}> 💕`
  });
  return true;
}

export async function handleConfessionButton(interaction) {
  if (interaction.customId !== 'confession_start') return false;
  await interaction.showModal(buildConfessionModal());
  return true;
}

export async function handleConfessionReaction(reaction, user, client) {
  if (user.bot) return false;
  if (reaction.message.channelId !== CONFIG.CONFESSION_CHANNEL_ID) return false;

  const emoji = reaction.emoji.name;
  if (!CONFESSION_REACTIONS.includes(emoji)) return false;

  const data = loadData();
  const isPromptMessage = reaction.message.author.id === client.user.id
    && (reaction.message.id === data.promptMessageId
      || reaction.message.embeds[0]?.title?.includes('Confesiones Anónimas'));

  if (!isPromptMessage) return false;

  await reaction.users.remove(user.id).catch(() => {});

  const dmResult = await sendConfessionDm(client, user);
  if (!dmResult.ok) {
    const replyChannel = reaction.message.channel;
    await replyChannel.send({
      content: `<@${user.id}> no pude enviarte un MD. Activa los mensajes privados del servidor o usa \`/confesar\`.`
    }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 8000));
    return true;
  }

  return true;
}

export async function setupConfessionChannel(client) {
  const channelId = CONFIG.CONFESSION_CHANNEL_ID;
  let channel = null;

  for (const guild of client.guilds.cache.values()) {
    const ch = guild.channels.cache.get(channelId);
    if (ch?.isTextBased()) {
      channel = ch;
      break;
    }
  }

  if (!channel) {
    channel = await client.channels.fetch(channelId).catch(() => null);
  }

  if (!channel?.isTextBased()) {
    console.warn(`⚠️ Canal de confesiones ${channelId} no encontrado`);
    return;
  }

  const data = loadData();

  if (data.promptMessageId) {
    try {
      const existing = await channel.messages.fetch(data.promptMessageId);
      if (existing?.author?.id === client.user.id) {
        for (const emoji of CONFESSION_REACTIONS) {
          if (!existing.reactions.cache.has(emoji)) {
            await existing.react(emoji).catch(() => {});
          }
        }
        console.log(`💕 Mensaje de confesiones listo en #${channel.name}`);
        return;
      }
    } catch {
      data.promptMessageId = null;
    }
  }

  const promptMessage = await channel.send({
    embeds: [buildPromptEmbed(client.user.username)]
  });

  for (const emoji of CONFESSION_REACTIONS) {
    await promptMessage.react(emoji).catch(() => {});
  }

  data.promptMessageId = promptMessage.id;
  saveData(data);
  console.log(`💕 Sistema de confesiones activo en #${channel.name}`);
}
