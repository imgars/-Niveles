import { EmbedBuilder } from 'discord.js';
import { getRandomGif, REACTION_MESSAGES } from '../data/reactionGifs.js';

export function buildReactionEmbed(reactionType, user, target = null, extras = {}) {
  const config = REACTION_MESSAGES[reactionType];
  if (!config) return null;

  const gif = getRandomGif(reactionType);
  let description;

  if (config.solo) {
    description = config.text(user.username || user.displayName);
  } else if (reactionType === 'ship' && target) {
    const percentage = extras.percentage ?? Math.floor(Math.random() * 101);
    description = config.text(
      user.username || user.displayName,
      target.username || target.displayName,
      percentage
    );
  } else if (target) {
    description = config.text(
      user.username || user.displayName,
      target.username || target.displayName
    );
  } else {
    description = config.text(user.username || user.displayName);
  }

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setDescription(description);

  if (gif) {
    embed.setImage(gif);
  }

  if (!config.solo && target) {
    embed.setAuthor({
      name: user.username || user.displayName,
      iconURL: user.displayAvatarURL({ dynamic: true, size: 128 })
    });
    embed.setThumbnail(target.displayAvatarURL({ dynamic: true, size: 128 }));
  }

  if (reactionType === 'ship' && target) {
    const percentage = extras.percentage ?? 0;
    let shipBar = '';
    const filled = Math.round(percentage / 10);
    for (let i = 0; i < 10; i++) {
      shipBar += i < filled ? '💗' : '🖤';
    }
    embed.addFields({ name: 'Medidor de amor', value: shipBar, inline: false });
    embed.setFooter({ text: getShipComment(percentage) });
  }

  return embed;
}

function getShipComment(percentage) {
  if (percentage >= 90) return '¡Son el uno para el otro! 💕';
  if (percentage >= 75) return '¡Hay mucha química entre ustedes! 💖';
  if (percentage >= 60) return 'Se ven bien juntos~ 💓';
  if (percentage >= 45) return 'Podría funcionar... 💗';
  if (percentage >= 30) return 'Hmm, necesitan trabajar en eso 💔';
  if (percentage >= 15) return 'No se ven muchas señales... 😅';
  return 'Mejor como amigos... 💀';
}

export function calculateShipPercentage(userId1, userId2) {
  const combined = [userId1, userId2].sort().join('');
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 101;
}
