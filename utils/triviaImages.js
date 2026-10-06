import { createCanvas } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';

// Imágenes de las preguntas de trivia, generadas localmente con canvas.
// Antes se usaban enlaces de Tenor que dejaban de cargar y, además,
// el comando /minigame trivia nunca los enviaba en el embed.

const WIDTH = 640;
const HEIGHT = 220;

const CATEGORY_STYLES = {
  geografia:   { label: 'GEOGRAFÍA',   from: '#1e88e5', to: '#43a047' },
  historia:    { label: 'HISTORIA',    from: '#8d6e63', to: '#4e342e' },
  ciencia:     { label: 'CIENCIA',     from: '#00acc1', to: '#3949ab' },
  arte:        { label: 'ARTE',        from: '#ec407a', to: '#ab47bc' },
  literatura:  { label: 'LITERATURA',  from: '#795548', to: '#ff8f00' },
  cultura:     { label: 'CULTURA',     from: '#f4511e', to: '#fdd835' },
  musica:      { label: 'MÚSICA',      from: '#8e24aa', to: '#3949ab' },
  tecnologia:  { label: 'TECNOLOGÍA',  from: '#37474f', to: '#00bcd4' },
  deportes:    { label: 'DEPORTES',    from: '#2e7d32', to: '#c0ca33' },
  animales:    { label: 'ANIMALES',    from: '#558b2f', to: '#ef6c00' },
  videojuegos: { label: 'VIDEOJUEGOS', from: '#5e35b1', to: '#d81b60' },
  cine:        { label: 'CINE',        from: '#b71c1c', to: '#212121' },
  matematicas: { label: 'MATEMÁTICAS', from: '#3949ab', to: '#26c6da' },
  lenguaje:    { label: 'LENGUAJE',    from: '#00897b', to: '#5c6bc0' },
  default:     { label: 'TRIVIA',      from: '#5865f2', to: '#7289da' }
};

const bufferCache = new Map();

function renderBanner(category) {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.default;
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, style.from);
  gradient.addColorStop(1, style.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Círculos decorativos
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.beginPath();
  ctx.arc(80, 40, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(WIDTH - 60, HEIGHT - 20, 150, 0, Math.PI * 2);
  ctx.fill();

  // Signo de interrogación grande de fondo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.font = 'bold 200px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', WIDTH - 30, HEIGHT / 2 + 10);

  // Nombre de la categoría
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 8;
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText('CATEGORÍA', 40, HEIGHT / 2 - 36);
  ctx.font = 'bold 54px Arial, sans-serif';
  ctx.fillText(style.label, 40, HEIGHT / 2 + 14);
  ctx.shadowBlur = 0;

  return canvas.toBuffer('image/png');
}

function getBuffer(category) {
  const key = CATEGORY_STYLES[category] ? category : 'default';
  if (!bufferCache.has(key)) bufferCache.set(key, renderBanner(key));
  return { key, buffer: bufferCache.get(key) };
}

/**
 * Devuelve { file, url } listos para usar en un mensaje:
 *   files: [file]  y  embed.image = { url }
 */
export function getTriviaImage(category) {
  const { key, buffer } = getBuffer(category);
  const name = `trivia_${key}.png`;
  return {
    file: new AttachmentBuilder(buffer, { name }),
    url: `attachment://${name}`
  };
}
