import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import db from '../utils/database.js';
import { addLevels, removeLevels, calculateLevel } from '../utils/xpSystem.js';
import { formatDuration } from '../utils/helpers.js';
import { addUserLagcoins } from '../utils/economyDB.js';
import { logFromInteraction, LOG_TYPES } from '../utils/activityLogger.js';

const triviaQuestions = [
  { question: '¿Cuál es la capital de Venezuela?', options: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto'], correct: 0 },
  { question: '¿En qué año se independizó Venezuela?', options: ['1810', '1811', '1812', '1813'], correct: 1 },
  { question: '¿Cuál es el río más largo del mundo?', options: ['Nilo', 'Amazonas', 'Yangtsé', 'Misisipi'], correct: 1 },
  { question: '¿Quién pintó la Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Miguel Ángel'], correct: 2 },
  { question: '¿Cuántos continentes hay en la Tierra?', options: ['5', '6', '7', '8'], correct: 2 },
  { question: '¿Cuál es el planeta más grande del sistema solar?', options: ['Saturno', 'Júpiter', 'Neptuno', 'Urano'], correct: 1 },
  { question: '¿En qué país está la Estatua de la Libertad?', options: ['Francia', 'Canadá', 'Estados Unidos', 'México'], correct: 2 },
  { question: '¿Cuál es el elemento químico más abundante en la Tierra?', options: ['Oxígeno', 'Silicio', 'Hierro', 'Nitrógeno'], correct: 0 },
  { question: '¿Cuántos lados tiene un hexágono?', options: ['5', '6', '7', '8'], correct: 1 },
  { question: '¿Quién escribió Don Quijote?', options: ['Lope de Vega', 'Cervantes', 'Calderón', 'Góngora'], correct: 1 },
  { question: '¿En qué año se inventó la bombilla?', options: ['1879', '1889', '1869', '1859'], correct: 0 },
  { question: '¿Cuál es la moneda de Japón?', options: ['Yuan', 'Won', 'Yen', 'Baht'], correct: 2 },
  { question: '¿Quién fue el primer presidente de Estados Unidos?', options: ['Thomas Jefferson', 'George Washington', 'Benjamin Franklin', 'Abraham Lincoln'], correct: 1 },
  { question: '¿Cuál es el océano más grande del mundo?', options: ['Atlántico', 'Índico', 'Pacífico', 'Ártico'], correct: 2 },
  { question: '¿Cuántas provincias tiene España?', options: ['15', '17', '19', '21'], correct: 1 },
  { question: '¿Qué velocidad alcanza la luz?', options: ['300.000 km/s', '150.000 km/s', '450.000 km/s', '100.000 km/s'], correct: 0 },
  { question: '¿Cuál es el animal más rápido del mundo?', options: ['Halcón peregrino', 'Guepardo', 'Águila real', 'Gacela'], correct: 0 },
  { question: '¿En qué año cayó el Muro de Berlín?', options: ['1989', '1988', '1990', '1991'], correct: 0 },
  { question: '¿Cuál es el idioma más hablado del mundo?', options: ['Español', 'Inglés', 'Chino Mandarín', 'Hindi'], correct: 2 },
  { question: '¿Cuántas cuerdas tiene una guitarra estándar?', options: ['5', '6', '7', '8'], correct: 1 },
  { question: '¿Quién pintó la Noche Estrellada?', options: ['Picasso', 'Monet', 'Van Gogh', 'Dalí'], correct: 2 },
  { question: '¿Cuál es el desierto más grande del mundo?', options: ['Sahara', 'Gobi', 'Antártida', 'Arabia'], correct: 0 },
  { question: '¿En qué año terminó la Segunda Guerra Mundial?', options: ['1943', '1944', '1945', '1946'], correct: 2 },
  { question: '¿Cuál es la capital de Francia?', options: ['Marsella', 'París', 'Lyon', 'Toulouse'], correct: 1 },
  { question: '¿Cuántos huesos tiene el cuerpo humano adulto?', options: ['186', '206', '226', '246'], correct: 1 },
  { question: '¿Cuál es el metal más precioso?', options: ['Platino', 'Oro', 'Plata', 'Paladio'], correct: 1 },
  { question: '¿En qué país está la Torre de Pisa?', options: ['Francia', 'Alemania', 'Italia', 'España'], correct: 2 },
  { question: '¿Cuántas letras tiene el alfabeto español?', options: ['26', '27', '28', '29'], correct: 1 },
  { question: '¿Quién fue Napoleón Bonaparte?', options: ['Pintor', 'Militar francés', 'Filósofo', 'Científico'], correct: 1 },
  { question: '¿Cuál es el deporte más popular en el mundo?', options: ['Baloncesto', 'Fútbol', 'Tenis', 'Cricket'], correct: 1 },
  { question: '¿Cuál es la capital de Argentina?', options: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza'], correct: 0 },
  { question: '¿Quién descubrió América?', options: ['Américo Vespucio', 'Cristóbal Colón', 'Fernando de Magallanes', 'Hernán Cortés'], correct: 1 },
  { question: '¿Cuál es el país más grande del mundo?', options: ['Estados Unidos', 'China', 'Rusia', 'Canadá'], correct: 2 },
  { question: '¿En qué año llegó el hombre a la Luna?', options: ['1965', '1967', '1969', '1971'], correct: 2 },
  { question: '¿Cuál es el símbolo químico del agua?', options: ['O2', 'H2O', 'CO2', 'NaCl'], correct: 1 },
  { question: '¿Quién escribió Romeo y Julieta?', options: ['Dante', 'Shakespeare', 'Molière', 'Goethe'], correct: 1 },
  { question: '¿Cuál es la montaña más alta del mundo?', options: ['K2', 'Everest', 'Aconcagua', 'Monte Blanco'], correct: 1 },
  { question: '¿En qué continente está Egipto?', options: ['Asia', 'Europa', 'África', 'Oceanía'], correct: 2 },
  { question: '¿Cuántos planetas tiene el sistema solar?', options: ['7', '8', '9', '10'], correct: 1 },
  { question: '¿Cuál es la capital de Colombia?', options: ['Medellín', 'Cali', 'Bogotá', 'Cartagena'], correct: 2 },
  { question: '¿Quién inventó el teléfono?', options: ['Thomas Edison', 'Alexander Graham Bell', 'Nikola Tesla', 'Samuel Morse'], correct: 1 },
  { question: '¿Cuál es el animal terrestre más grande?', options: ['Rinoceronte', 'Elefante', 'Hipopótamo', 'Jirafa'], correct: 1 },
  { question: '¿En qué año comenzó la Primera Guerra Mundial?', options: ['1912', '1914', '1916', '1918'], correct: 1 },
  { question: '¿Cuál es la capital de México?', options: ['Guadalajara', 'Monterrey', 'Ciudad de México', 'Cancún'], correct: 2 },
  { question: '¿Quién desarrolló la teoría de la relatividad?', options: ['Newton', 'Einstein', 'Hawking', 'Galileo'], correct: 1 },
  { question: '¿Cuál es el país más poblado del mundo?', options: ['Estados Unidos', 'India', 'China', 'Indonesia'], correct: 1 },
  { question: '¿En qué país está el Machu Picchu?', options: ['Bolivia', 'Ecuador', 'Perú', 'Chile'], correct: 2 },
  { question: '¿Cuál es la capital de Brasil?', options: ['São Paulo', 'Río de Janeiro', 'Brasilia', 'Salvador'], correct: 2 },
  { question: '¿Quién compuso la Quinta Sinfonía?', options: ['Mozart', 'Beethoven', 'Bach', 'Chopin'], correct: 1 },
  { question: '¿Cuántos días tiene un año bisiesto?', options: ['364', '365', '366', '367'], correct: 2 },
  { question: '¿Cuál es el órgano más grande del cuerpo humano?', options: ['Hígado', 'Cerebro', 'Piel', 'Corazón'], correct: 2 },
  { question: '¿En qué país está la Gran Muralla?', options: ['Japón', 'Corea', 'China', 'Mongolia'], correct: 2 },
  { question: '¿Cuál es el gas más abundante en la atmósfera?', options: ['Oxígeno', 'Nitrógeno', 'CO2', 'Argón'], correct: 1 },
  { question: '¿Quién fue el libertador de Venezuela?', options: ['San Martín', 'Bolívar', 'Sucre', 'Miranda'], correct: 1 },
  { question: '¿Cuál es la capital de Chile?', options: ['Valparaíso', 'Concepción', 'Santiago', 'Viña del Mar'], correct: 2 },
  { question: '¿En qué año se fundó Google?', options: ['1996', '1998', '2000', '2002'], correct: 1 },
  { question: '¿Cuál es el planeta más cercano al Sol?', options: ['Venus', 'Mercurio', 'Marte', 'Tierra'], correct: 1 },
  { question: '¿Quién pintó El Grito?', options: ['Munch', 'Picasso', 'Dalí', 'Van Gogh'], correct: 0 },
  { question: '¿Cuál es la capital de España?', options: ['Barcelona', 'Sevilla', 'Madrid', 'Valencia'], correct: 2 },
  { question: '¿Cuántos jugadores hay en un equipo de fútbol?', options: ['9', '10', '11', '12'], correct: 2 },
  { question: '¿Cuál es la capital de Italia?', options: ['Milán', 'Venecia', 'Roma', 'Florencia'], correct: 2 },
  { question: '¿Quién creó Facebook?', options: ['Steve Jobs', 'Bill Gates', 'Mark Zuckerberg', 'Elon Musk'], correct: 2 },
  { question: '¿Cuál es el animal más grande del mundo?', options: ['Elefante', 'Ballena Azul', 'Tiburón Ballena', 'Jirafa'], correct: 1 },
  { question: '¿En qué país está el Taj Mahal?', options: ['Pakistán', 'India', 'Bangladesh', 'Nepal'], correct: 1 },
  { question: '¿Cuál es la capital de Alemania?', options: ['Múnich', 'Hamburgo', 'Berlín', 'Frankfurt'], correct: 2 },
  { question: '¿Cuántas notas musicales hay?', options: ['5', '6', '7', '8'], correct: 2 },
  { question: '¿Quién escribió Cien años de soledad?', options: ['Borges', 'García Márquez', 'Cortázar', 'Vargas Llosa'], correct: 1 },
  { question: '¿Cuál es la moneda de Reino Unido?', options: ['Euro', 'Dólar', 'Libra', 'Franco'], correct: 2 },
  { question: '¿En qué continente está Australia?', options: ['Asia', 'Oceanía', 'América', 'Europa'], correct: 1 }
];

export default {
  data: new SlashCommandBuilder()
    .setName('minigame')
    .setDescription('Juega minijuegos para ganar recompensas')
    .addSubcommand(subcommand =>
      subcommand
        .setName('trivia')
        .setDescription('Responde 5 preguntas de trivia')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rps')
        .setDescription('Piedra, Papel o Tijeras contra otro usuario')
        .addUserOption(option =>
          option.setName('oponente')
            .setDescription('Usuario contra el que jugar')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('roulette')
        .setDescription('Ruleta Rusa contra otro usuario')
        .addUserOption(option =>
          option.setName('oponente')
            .setDescription('Usuario contra el que jugar')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('hangman')
        .setDescription('Juega al ahorcado en modo solitario (3 rondas)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ahorcados')
        .setDescription('Juega ahorcado 3 rondas con intercambio de roles')
        .addUserOption(option =>
          option.setName('oponente')
            .setDescription('Usuario contra el que jugar')
            .setRequired(true)
        )
    ),
  
  async execute(interaction) {
    const userData = db.getUser(interaction.guild.id, interaction.user.id);
    if (userData.isInactive) {
      return interaction.reply({ content: '❌ No puedes participar en minijuegos ni reclamar recompensas mientras tengas el rol de inactividad.', ephemeral: true });
    }
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'trivia') {
      const cooldown = db.checkCooldown('minigame_trivia', interaction.user.id);
      if (cooldown) {
        return interaction.reply({
          content: `⏱️ Debes esperar ${formatDuration(cooldown)} antes de jugar trivia de nuevo.`,
          ephemeral: true
        });
      }
      
      await playTrivia(interaction);
    }
    
    if (subcommand === 'rps') {
      const cooldown = db.checkCooldown('minigame_rps', interaction.user.id);
      const opponent = interaction.options.getUser('oponente');
      
      if (opponent.bot) {
        return interaction.reply({ content: '❌ No puedes jugar contra un bot.', ephemeral: true });
      }
      
      if (opponent.id === interaction.user.id) {
        return interaction.reply({ content: '❌ No puedes jugar contra ti mismo.', ephemeral: true });
      }
      
      if (cooldown) {
        return interaction.reply({
          content: `⏱️ Debes esperar ${formatDuration(cooldown)} antes de jugar RPS de nuevo para ganar recompensas, pero puedes seguir jugando sin recompensas.`,
          ephemeral: true
        });
      }
      
      await playRPS(interaction, opponent, !cooldown);
    }
    
    if (subcommand === 'roulette') {
      const cooldown = db.checkCooldown('minigame_roulette', interaction.user.id);
      const opponent = interaction.options.getUser('oponente');
      
      if (opponent.bot) {
        return interaction.reply({ content: '❌ No puedes jugar contra un bot.', ephemeral: true });
      }
      
      if (opponent.id === interaction.user.id) {
        return interaction.reply({ content: '❌ No puedes jugar contra ti mismo.', ephemeral: true });
      }
      
      if (cooldown) {
        return interaction.reply({
          content: `⏱️ Debes esperar ${formatDuration(cooldown)} antes de jugar Ruleta Rusa de nuevo para ganar recompensas, pero puedes seguir jugando sin recompensas.`,
          ephemeral: true
        });
      }
      
      await playRoulette(interaction, opponent, !cooldown);
    }
    
    if (subcommand === 'hangman') {
      const cooldown = db.checkCooldown('minigame_hangman', interaction.user.id);
      if (cooldown) {
        return interaction.reply({
          content: `⏱️ Debes esperar ${formatDuration(cooldown)} antes de jugar ahorcado de nuevo.`,
          ephemeral: true
        });
      }
      
      await playSoloHangman(interaction);
    }
    
    if (subcommand === 'ahorcados') {
      const opponent = interaction.options.getUser('oponente');
      
      if (opponent.bot) {
        return interaction.reply({ content: '❌ No puedes jugar contra un bot.', ephemeral: true });
      }
      
      if (opponent.id === interaction.user.id) {
        return interaction.reply({ content: '❌ No puedes jugar contra ti mismo.', ephemeral: true });
      }
      
      await playAhorcadosRoles(interaction, opponent);
    }
  }
};

async function playTrivia(interaction) {
  const selectedQuestions = [];
  while (selectedQuestions.length < 5) {
    const q = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    if (!selectedQuestions.includes(q)) selectedQuestions.push(q);
  }
  
  let currentQuestion = 0;
  let correctAnswers = 0;
  let firstTryCorrect = true;
  let triviaMessage = null;
  
  await askQuestion(interaction);
  
  async function askQuestion(inter) {
    if (currentQuestion >= selectedQuestions.length) {
      return showResults(inter);
    }
    
    const q = selectedQuestions[currentQuestion];
    const row = new ActionRowBuilder();
    
    for (let i = 0; i < q.options.length; i++) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`trivia_${i}`)
          .setLabel(q.options[i])
          .setStyle(ButtonStyle.Primary)
      );
    }
    
    if (!triviaMessage) {
      triviaMessage = await inter.reply({
        embeds: [{
          color: 0x7289DA,
          title: `🎯 Trivia - Pregunta ${currentQuestion + 1}/5`,
          description: q.question,
          footer: { text: `Respuestas correctas: ${correctAnswers}` }
        }],
        components: [row],
        fetchReply: true
      });
    } else {
      await triviaMessage.edit({
        embeds: [{
          color: 0x7289DA,
          title: `🎯 Trivia - Pregunta ${currentQuestion + 1}/5`,
          description: q.question,
          footer: { text: `Respuestas correctas: ${correctAnswers}` }
        }],
        components: [row]
      });
    }
    
    const collector = triviaMessage.createMessageComponentCollector({ time: 20000 });
    
    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: '❌ Este no es tu juego.', ephemeral: true });
      }
      
      const answer = parseInt(i.customId.split('_')[1]);
      const correct = answer === q.correct;
      
      if (correct) {
        correctAnswers++;
      } else {
        firstTryCorrect = false;
      }
      
      currentQuestion++;
      collector.stop();
      
      await triviaMessage.edit({
        embeds: [{
          color: correct ? 0x43B581 : 0xF04747,
          title: correct ? '✅ ¡Correcto!' : '❌ Incorrecto',
          description: `La respuesta correcta era: **${q.options[q.correct]}**`
        }],
        components: []
      });
      
      setTimeout(() => {
        try {
          askQuestion(inter);
        } catch (e) {
          console.error('Error in next trivia question:', e);
        }
      }, 2000);
    });
    
    collector.on('end', collected => {
      if (collected.size === 0) {
        triviaMessage.edit({
          embeds: [{
            color: 0xF04747,
            title: '⏱️ Tiempo Agotado',
            description: 'No respondiste a tiempo.'
          }],
          components: []
        });
      }
    });
  }
  
  async function showResults(inter) {
    if (correctAnswers === 5 && firstTryCorrect) {
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('trivia_reward_boost')
            .setLabel('Boost 20% x 12h')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('trivia_reward_levels')
            .setLabel('1.5 Niveles')
            .setStyle(ButtonStyle.Success)
        );
      
      const rewardMsg = await inter.followUp({
        embeds: [{
          color: 0xFFD700,
          title: '🏆 ¡Perfecto!',
          description: `¡Respondiste todas las preguntas correctamente!\n\nElige tu recompensa:`,
          fields: [
            { name: '🚀 Boost', value: '20% XP durante 12 horas', inline: true },
            { name: '⭐ Niveles', value: '1.5 niveles instantáneos', inline: true }
          ]
        }],
        components: [row],
        fetchReply: true
      });
      
      const rewardCollector = rewardMsg.createMessageComponentCollector({ time: 30000 });
      
      rewardCollector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: '❌ Esta no es tu recompensa.', ephemeral: true });
        }
        
        if (i.customId === 'trivia_reward_boost') {
          db.addBoost('user', interaction.user.id, 120, 12 * 60 * 60 * 1000, 'Boost de trivia 20% por 12h');
          await addUserLagcoins(interaction.guild.id, interaction.user.id, 300, 'trivia_boost');
          logFromInteraction(interaction, {
            type: LOG_TYPES.MINIGAME_WIN,
            command: 'minigame',
            amount: 300,
            importance: 'medium',
            reason: 'Trivia perfecta — recompensa boost + lagcoins',
            details: { minigame: 'trivia', reward: 'boost_20%_12h' }
          });
          await i.update({
            embeds: [{
              color: 0x43B581,
              title: '✅ Recompensa Recibida',
              description: '¡Has recibido un boost de 20% durante 12 horas!\n💰 +300 Lagcoins'
            }],
            components: []
          });
        } else {
          const userData = db.getUser(interaction.guild.id, interaction.user.id);
          userData.totalXp = addLevels(userData.totalXp, 1.5);
          userData.level = calculateLevel(userData.totalXp);
          db.saveUser(interaction.guild.id, interaction.user.id, userData);
          await addUserLagcoins(interaction.guild.id, interaction.user.id, 400, 'trivia_levels');
          logFromInteraction(interaction, {
            type: LOG_TYPES.MINIGAME_WIN,
            command: 'minigame',
            amount: 400,
            levelAfter: userData.level,
            importance: 'medium',
            reason: 'Trivia perfecta — recompensa niveles + lagcoins',
            details: { minigame: 'trivia', reward: '1.5_levels' }
          });
          
          await i.update({
            embeds: [{
              color: 0x43B581,
              title: '✅ Recompensa Recibida',
              description: `¡Has subido 1.5 niveles! Ahora estás en el nivel ${userData.level}\n💰 +400 Lagcoins`
            }],
            components: []
          });
        }
        
        db.setCooldown('minigame_trivia', interaction.user.id, 12 * 60 * 60 * 1000);
        rewardCollector.stop();
      });
    } else {
      await inter.followUp({
        embeds: [{
          color: correctAnswers >= 3 ? 0xFFD700 : 0xF04747,
          title: '📊 Resultados',
          description: `Respondiste correctamente **${correctAnswers}/5** preguntas.${correctAnswers === 5 ? '\n\nPero no todas fueron al primer intento.' : ''}`,
          footer: { text: 'Intenta de nuevo para ganar recompensas' }
        }]
      });
    }
  }
}

async function playRPS(interaction, opponent, hasReward) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('rps_accept')
        .setLabel('Aceptar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rps_decline')
        .setLabel('Rechazar')
        .setStyle(ButtonStyle.Danger)
    );
  
  const msg = await interaction.reply({
    content: `<@${opponent.id}>`,
    embeds: [{
      color: 0x7289DA,
      title: '🎮 Piedra, Papel o Tijeras',
      description: `<@${interaction.user.id}> te ha retado a jugar Piedra, Papel o Tijeras (mejor de 3)!\n\n${hasReward ? '**Recompensa:** El ganador recibe un boost de 30% durante 2 horas.' : '**Sin recompensa** (cooldown activo)'}`
    }],
    components: [row],
    fetchReply: true
  });
  
  const collector = msg.createMessageComponentCollector({ time: 60000 });
  
  collector.on('collect', async i => {
    if (i.user.id !== opponent.id) {
      return i.reply({ content: '❌ Este desafío no es para ti.', ephemeral: true });
    }
    
    if (i.customId === 'rps_decline') {
      await i.update({
        embeds: [{
          color: 0xF04747,
          title: '❌ Desafío Rechazado',
          description: `<@${opponent.id}> ha rechazado el desafío.`
        }],
        components: []
      });
      collector.stop();
      return;
    }
    
    if (i.customId === 'rps_accept') {
      collector.stop();
      await startRPSGame(i, interaction.user, opponent, hasReward);
    }
  });
}

async function startRPSGame(interaction, player1, player2, hasReward) {
  let p1Wins = 0;
  let p2Wins = 0;
  let round = 1;
  let gameMessage;
  
  await playRound();
  
  async function playRound() {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('rps_rock')
          .setLabel('🪨 Piedra')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rps_paper')
          .setLabel('📄 Papel')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rps_scissors')
          .setLabel('✂️ Tijeras')
          .setStyle(ButtonStyle.Primary)
      );
    
    if (!gameMessage) {
      await interaction.update({
        embeds: [{
          color: 0x7289DA,
          title: `🎮 Ronda ${round}`,
          description: `**Puntuación:**\n<@${player1.id}>: ${p1Wins} | <@${player2.id}>: ${p2Wins}\n\nHagan su elección:`,
        }],
        components: [row]
      });
      gameMessage = await interaction.fetchReply();
    } else {
      await gameMessage.edit({
        embeds: [{
          color: 0x7289DA,
          title: `🎮 Ronda ${round}`,
          description: `**Puntuación:**\n<@${player1.id}>: ${p1Wins} | <@${player2.id}>: ${p2Wins}\n\nHagan su elección:`,
        }],
        components: [row]
      });
    }
    
    const choices = {};
    const collector = gameMessage.createMessageComponentCollector({ time: 30000 });
    
    collector.on('collect', async i => {
      if (i.user.id !== player1.id && i.user.id !== player2.id) {
        return i.reply({ content: '❌ No estás en este juego.', ephemeral: true });
      }
      
      if (choices[i.user.id]) {
        return i.reply({ content: '❌ Ya hiciste tu elección.', ephemeral: true });
      }
      
      const choice = i.customId.split('_')[1];
      choices[i.user.id] = choice;
      
      await i.reply({ content: `✅ Elección registrada: ${choice}`, ephemeral: true });
      
      if (Object.keys(choices).length === 2) {
        collector.stop();
        await resolveRound(choices);
      }
    });
  }
  
  async function resolveRound(choices) {
    const p1Choice = choices[player1.id];
    const p2Choice = choices[player2.id];
    
    let winner = null;
    if (p1Choice === p2Choice) {
      winner = 'tie';
    } else if (
      (p1Choice === 'rock' && p2Choice === 'scissors') ||
      (p1Choice === 'paper' && p2Choice === 'rock') ||
      (p1Choice === 'scissors' && p2Choice === 'paper')
    ) {
      winner = player1.id;
      p1Wins++;
    } else {
      winner = player2.id;
      p2Wins++;
    }
    
    const emoji = { rock: '🪨', paper: '📄', scissors: '✂️' };
    
    await gameMessage.edit({
      embeds: [{
        color: winner === 'tie' ? 0xFFD700 : 0x43B581,
        title: winner === 'tie' ? '🤝 Empate' : `✅ Ganador de la Ronda: <@${winner}>`,
        description: `<@${player1.id}>: ${emoji[p1Choice]}\n<@${player2.id}>: ${emoji[p2Choice]}`
      }],
      components: []
    });
    
    if (p1Wins === 3 || p2Wins === 3) {
      setTimeout(() => {
        try {
          endGame();
        } catch (e) {
          console.error('Error ending RPS game:', e);
        }
      }, 2000);
    } else {
      round++;
      setTimeout(() => {
        try {
          playRound();
        } catch (e) {
          console.error('Error playing RPS round:', e);
        }
      }, 2000);
    }
  }
  
  async function endGame() {
    const winner = p1Wins === 3 ? player1 : player2;
    
    if (hasReward) {
      db.addBoost('user', winner.id, 130, 2 * 60 * 60 * 1000, 'Boost de RPS 30% por 2h');
      await addUserLagcoins(interaction.guild.id, winner.id, 500, 'rps_win');
      db.setCooldown('minigame_rps', player1.id, 12 * 60 * 60 * 1000);
      db.setCooldown('minigame_rps', player2.id, 12 * 60 * 60 * 1000);
      logFromInteraction(interaction, {
        type: LOG_TYPES.MINIGAME_WIN,
        userId: winner.id,
        command: 'minigame',
        amount: 500,
        importance: 'medium',
        reason: 'Victoria en Piedra/Papel/Tijeras',
        details: { minigame: 'rps', winnerId: winner.id, loserId: winner.id === player1.id ? player2.id : player1.id, score: `${p1Wins}-${p2Wins}` }
      });
    }
    
    await gameMessage.edit({
      embeds: [{
        color: 0xFFD700,
        title: '🏆 ¡Juego Terminado!',
        description: `**Ganador:** <@${winner.id}>\n\n**Puntuación Final:**\n<@${player1.id}>: ${p1Wins}\n<@${player2.id}>: ${p2Wins}${hasReward ? `\n\n✨ <@${winner.id}> ha ganado un boost de 30% durante 2 horas!\n💰 +500 Lagcoins` : ''}`,
      }],
      components: []
    });
  }
}

async function playRoulette(interaction, opponent, hasReward) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('roulette_accept')
        .setLabel('Aceptar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('roulette_decline')
        .setLabel('Rechazar')
        .setStyle(ButtonStyle.Danger)
    );
  
  const msg = await interaction.reply({
    content: `<@${opponent.id}>`,
    embeds: [{
      color: 0xFF0000,
      title: '💀 Ruleta Rusa',
      description: `<@${interaction.user.id}> te ha retado a jugar Ruleta Rusa!\n\n⚠️ **ADVERTENCIA:**\n${hasReward ? '• El **GANADOR** gana **2.5 niveles**\n• El **PERDEDOR** pierde **3 niveles**' : '• **Sin recompensas** (cooldown activo)'}`,
      footer: { text: '¡Este juego tiene consecuencias!' }
    }],
    components: [row],
    fetchReply: true
  });
  
  const collector = msg.createMessageComponentCollector({ time: 60000 });
  
  collector.on('collect', async i => {
    if (i.user.id !== opponent.id) {
      return i.reply({ content: '❌ Este desafío no es para ti.', ephemeral: true });
    }
    
    if (i.customId === 'roulette_decline') {
      await i.update({
        embeds: [{
          color: 0xF04747,
          title: '❌ Desafío Rechazado',
          description: `<@${opponent.id}> ha rechazado el desafío.`
        }],
        components: []
      });
      collector.stop();
      return;
    }
    
    if (i.customId === 'roulette_accept') {
      collector.stop();
      await startRouletteGame(i, interaction.user, opponent, hasReward);
    }
  });
}

async function startRouletteGame(interaction, player1, player2, hasReward) {
  const chamber = Array(6).fill(false);
  const bulletPos = Math.floor(Math.random() * 6);
  chamber[bulletPos] = true;
  
  let currentPlayer = Math.random() < 0.5 ? player1 : player2;
  let shotsFired = 0;
  let timedOut = false;
  
  await interaction.update({
    embeds: [{
      color: 0xFFD700,
      title: '🔫 Ruleta Rusa',
      description: `El tambor ha sido cargado y girado...\n\n<@${currentPlayer.id}> dispara primero.`,
    }],
    components: []
  });
  
  setTimeout(() => takeTurn(), 2000);
  
  async function takeTurn() {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('roulette_shoot')
          .setLabel('🔫 Disparar')
          .setStyle(ButtonStyle.Danger)
      );
    
    const remaining = 6 - shotsFired;
    const probability = Math.round((1 / remaining) * 100);
    
    await interaction.editReply({
      embeds: [{
        color: 0xFF4444,
        title: '🔫 Tu Turno',
        description: `<@${currentPlayer.id}>, es tu turno...\n\n**Cámaras restantes:** ${remaining}\n**Probabilidad de BANG:** ${probability}%\n\n⏱️ Tienes **30 segundos** para disparar o el gatillo se apretará solo y perderás el **DOBLE**.`,
      }],
      components: [row]
    });
    
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ time: 30000 });
    
    collector.on('collect', async i => {
      if (i.user.id !== currentPlayer.id) {
        return i.reply({ content: '❌ No es tu turno.', ephemeral: true });
      }
      
      collector.stop('shot');
      
      if (chamber[shotsFired]) {
        await i.update({
          embeds: [{
            color: 0xFF0000,
            title: '💥 BANG!',
            description: `<@${currentPlayer.id}> ha sido eliminado!`,
          }],
          components: []
        });
        
        setTimeout(() => endRouletteGame(currentPlayer === player1 ? player2 : player1, currentPlayer, false), 2000);
      } else {
        await i.update({
          embeds: [{
            color: 0x43B581,
            title: '💨 Clic...',
            description: `<@${currentPlayer.id}> está a salvo... por ahora.`,
          }],
          components: []
        });
        
        shotsFired++;
        currentPlayer = currentPlayer === player1 ? player2 : player1;
        setTimeout(() => takeTurn(), 2000);
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'shot') return;
      
      timedOut = true;
      const coward = currentPlayer;
      const winner = currentPlayer === player1 ? player2 : player1;
      
      await interaction.editReply({
        embeds: [{
          color: 0xFF0000,
          title: '⏱️💥 ¡TIEMPO AGOTADO!',
          description: `<@${coward.id}> no tuvo el valor de disparar...\n\n¡El gatillo se apretó SOLO!\n\n💀 **<@${coward.id}> pierde el DOBLE por cobarde!**`,
        }],
        components: []
      });
      
      setTimeout(() => endRouletteGame(winner, coward, true), 2000);
    });
  }
  
  async function endRouletteGame(winner, loser, wasTimeout) {
    const levelPenalty = wasTimeout ? 6 : 3;
    const lagcoinPenalty = wasTimeout ? 600 : 300;
    
    if (hasReward) {
      const winnerData = db.getUser(interaction.guild.id, winner.id);
      const loserData = db.getUser(interaction.guild.id, loser.id);
      
      winnerData.totalXp = addLevels(winnerData.totalXp, 2.5);
      winnerData.level = calculateLevel(winnerData.totalXp);
      
      loserData.totalXp = removeLevels(loserData.totalXp, levelPenalty);
      loserData.level = calculateLevel(loserData.totalXp);
      
      db.saveUser(interaction.guild.id, winner.id, winnerData);
      db.saveUser(interaction.guild.id, loser.id, loserData);
      
      await addUserLagcoins(interaction.guild.id, winner.id, 800, 'roulette_win');
      await addUserLagcoins(interaction.guild.id, loser.id, -lagcoinPenalty, 'roulette_loss');
      logFromInteraction(interaction, {
        type: LOG_TYPES.MINIGAME_WIN,
        userId: winner.id,
        command: 'minigame',
        amount: 800,
        importance: 'high',
        reason: 'Victoria en Ruleta Rusa',
        details: { minigame: 'roulette', loserId: loser.id, wasTimeout }
      });
      logFromInteraction(interaction, {
        type: LOG_TYPES.MINIGAME_LOSS,
        userId: loser.id,
        command: 'minigame',
        amount: -lagcoinPenalty,
        importance: 'medium',
        reason: 'Derrota en Ruleta Rusa',
        details: { minigame: 'roulette', winnerId: winner.id, levelPenalty, wasTimeout }
      });
      
      db.setCooldown('minigame_roulette', player1.id, 24 * 60 * 60 * 1000);
      db.setCooldown('minigame_roulette', player2.id, 24 * 60 * 60 * 1000);
    }
    
    const timeoutPenaltyText = wasTimeout ? `\n\n⚠️ **PENALIZACIÓN POR COBARDÍA:** ¡Perdiste el **DOBLE**!` : '';
    
    await interaction.editReply({
      embeds: [{
        color: 0xFFD700,
        title: '🏆 ¡Juego Terminado!',
        description: `**Ganador:** <@${winner.id}>\n**Perdedor:** <@${loser.id}>${hasReward ? `\n\n✨ <@${winner.id}> ha ganado **2.5 niveles**\n💚 +800 Lagcoins\n💔 <@${loser.id}> ha perdido **${levelPenalty} niveles**\n💔 -${lagcoinPenalty} Lagcoins${timeoutPenaltyText}` : ''}`,
      }],
      components: []
    });
  }
}

const HANGMAN_STAGES = [
  '```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```'
];

const HANGMAN_WORDS = [
  'DISCORD', 'MINECRAFT', 'POKEMON', 'ROBOTICA', 'ASTRONAUTA', 
  'COMPUTADORA', 'PROGRAMACION', 'VIDEOJUEGO', 'TECNOLOGIA', 'AVENTURA', 
  'DESARROLLO', 'SERVIDOR', 'MODERADOR', 'COMUNIDAD', 'RECOMPENSA', 
  'DESAFIO', 'VICTORIA', 'JUGADOR', 'MENSAJE', 'RANKING'
];

async function playSoloHangman(interaction) {
  let roundsWon = 0;
  let roundsPlayed = 0;
  
  await interaction.deferReply();
  
  async function playRound() {
    if (roundsPlayed >= 3) {
      return endHangmanGame();
    }
    
    roundsPlayed++;
    const word = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
    const guessedLetters = new Set();
    let wrongGuesses = 0;
    const maxWrongGuesses = 6;
    
    async function showBoard() {
      const displayWord = word.split('').map(l => guessedLetters.has(l) ? l : '_').join('');
      const embed = {
        color: 0x7289DA,
        title: `🎮 Ahorcado Solitario - Ronda ${roundsPlayed}/3`,
        description: `**Victorias:** ${roundsWon}/${roundsPlayed - 1}`,
        fields: [
          { name: '📝 Palabra', value: displayWord, inline: false },
          { name: '🎨 Dibujo', value: HANGMAN_STAGES[wrongGuesses], inline: false },
          { name: '❌ Errores', value: `${wrongGuesses}/${maxWrongGuesses}`, inline: true },
          { name: '📋 Letras', value: Array.from(guessedLetters).join(', ') || 'Ninguna', inline: true }
        ]
      };
      
      const letters = 'ABCDEFGHIJKLMNÑOPQRSTUVYZ'.split('');
      const rows = [];
      
      for (let i = 0; i < letters.length; i += 5) {
        const row = new ActionRowBuilder();
        for (let j = i; j < Math.min(i + 5, letters.length); j++) {
          const letter = letters[j];
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`hangman_${letter}`)
              .setLabel(letter)
              .setStyle(guessedLetters.has(letter) ? ButtonStyle.Secondary : ButtonStyle.Primary)
              .setDisabled(guessedLetters.has(letter))
          );
        }
        rows.push(row);
      }
      
      return { embeds: [embed], components: rows };
    }
    
    try {
      const boardData = await showBoard();
      const boardMsg = await interaction.followUp(boardData);
      
      const gameCollector = boardMsg.createMessageComponentCollector({ time: 300000 });
    
      gameCollector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: '❌ No es tu juego.', ephemeral: true });
        }
        
        const letter = i.customId.split('_')[1];
        guessedLetters.add(letter);
        
        if (!word.includes(letter)) {
          wrongGuesses++;
        }
        
        const isWon = word.split('').every(l => guessedLetters.has(l));
        const isLost = wrongGuesses >= maxWrongGuesses;
        
        const board = await showBoard();
        
        if (isWon) {
          roundsWon++;
          board.components = [];
          await i.update(board);
          gameCollector.stop('won');
          setTimeout(playRound, 1500);
        } else if (isLost) {
          board.components = [];
          await i.update(board);
          gameCollector.stop('lost');
          setTimeout(playRound, 1500);
        } else {
          await i.update(board);
        }
      });
      
      gameCollector.on('end', (collected, reason) => {
        if (reason === 'time') {
          boardMsg.edit({ components: [] }).catch(() => {});
        }
      });
    } catch (error) {
      console.error('Error en ronda de hangman:', error);
    }
  }
  
  async function endHangmanGame() {
    const userData = db.getUser(interaction.guild.id, interaction.user.id);
    let reward = '❌ No ganaste esta vez.';
    let rewardGiven = false;
    let footerText = '';
    
    if (roundsWon === 3) {
      db.addBoost('user', interaction.user.id, 125, 24 * 60 * 60 * 1000, 'Victoria Hangman +25% por 24h');
      await addUserLagcoins(interaction.guild.id, interaction.user.id, 600, 'hangman_perfect');
      logFromInteraction(interaction, {
        type: LOG_TYPES.MINIGAME_WIN,
        command: 'minigame',
        amount: 600,
        importance: 'medium',
        reason: 'Ahorcado perfecto 3/3',
        details: { minigame: 'hangman', roundsWon }
      });
      reward = '🎉 ¡Ganaste 3/3 rondas! **+25% boost por 24 horas**\n💰 +600 Lagcoins';
      rewardGiven = true;
    } else {
      footerText = '¡Puedes volver a intentarlo cuando termine el cooldown!';
    }
    
    db.setCooldown('minigame_hangman', interaction.user.id, 48 * 60 * 60 * 1000);
    
    const embed = {
      color: rewardGiven ? 0x4CAF50 : 0xF04747,
      title: rewardGiven ? '🏆 ¡Juego Terminado!' : '😔 ¡Perdiste!',
      description: `**Puntuación:** ${roundsWon}/3\n\n${reward}`
    };
    
    if (footerText) {
      embed.footer = { text: footerText };
    }
    
    await interaction.editReply({
      embeds: [embed],
      components: []
    });
  }
  
  await playRound();
}

async function playAhorcadosRoles(interaction, opponent) {
  const player1 = interaction.user;
  const player2 = opponent;
  
  const acceptRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ahorcados_accept').setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ahorcados_decline').setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
  );
  
  const inviteMsg = await interaction.reply({
    content: `<@${player2.id}> fuiste invitado a jugar Ahorcado (3 rondas con intercambio de roles)`,
    components: [acceptRow],
    fetchReply: true
  });
  
  const collector = inviteMsg.createMessageComponentCollector({ time: 30000 });
  let accepted = false;
  
  collector.on('collect', async i => {
    if (i.user.id !== player2.id) {
      return i.reply({ content: '❌ No puedes responder esto.', ephemeral: true });
    }
    
    if (i.customId === 'ahorcados_accept') {
      accepted = true;
      collector.stop();
      await i.update({ content: '✅ ¡Juego iniciado!', components: [] });
      await startAhorcadosGame(interaction, player1, player2);
    } else {
      collector.stop();
      await i.update({ content: '❌ Invitación rechazada.', components: [] });
    }
  });
  
  collector.on('end', () => {
    if (!accepted) {
      inviteMsg.edit({ content: '⏰ Invitación expirada.', components: [] }).catch(() => {});
    }
  });
}

async function startAhorcadosGame(interaction, player1, player2) {
  let hostId = Math.random() < 0.5 ? player1.id : player2.id;
  let guesserId = hostId === player1.id ? player2.id : player1.id;
  
  const gameState = {
    player1: player1.id,
    player2: player2.id,
    hostId,
    guesserId,
    round: 1,
    maxRounds: 3,
    scores: { [player1.id]: 0, [player2.id]: 0 },
    channel: interaction.channel
  };
  
  await runAhorcadosRound(interaction, gameState);
}

async function runAhorcadosRound(interaction, gameState) {
  if (gameState.round > gameState.maxRounds) {
    return endAhorcadosGame(interaction, gameState);
  }
  
  const modalId = `ahorcados_word_${gameState.round}_${Date.now()}`;
  const buttonId = `ahorcados_modal_trigger_${gameState.round}`;
  
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle(`Ronda ${gameState.round}/3 - Proporciona la Palabra`);
  
  const wordInput = new TextInputBuilder()
    .setCustomId('secret_word')
    .setLabel('Palabra secreta (A-Z, Ñ, mínimo 5 letras)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ejemplo: DISCORD')
    .setRequired(true);
  
  const hintInput = new TextInputBuilder()
    .setCustomId('word_hint')
    .setLabel('Pista (opcional)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ejemplo: Es un programa de chat')
    .setRequired(false);
  
  modal.addComponents(
    new ActionRowBuilder().addComponents(wordInput),
    new ActionRowBuilder().addComponents(hintInput)
  );
  
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(buttonId)
      .setLabel('🎯 Elegir palabra')
      .setStyle(ButtonStyle.Primary)
  );
  
  const triggerMessage = await gameState.channel.send({
    content: `<@${gameState.hostId}> haz clic para proporcionar la palabra. <@${gameState.guesserId}> será el adivinador.`,
    components: [buttonRow]
  });
  
  const client = gameState.channel.guild.client;
  let processed = false;
  
  const handleButton = async (i) => {
    if (i.customId !== buttonId || i.user.id !== gameState.hostId) return;
    if (!i.isButton()) return;
    try {
      await i.showModal(modal);
    } catch (error) {
      console.error('Error mostrando modal:', error);
    }
  };
  
  const handleModal = async (i) => {
    if (!i.isModalSubmit() || i.customId !== modalId || i.user.id !== gameState.hostId) return;
    if (processed) return;
    processed = true;
    client.off('interactionCreate', handleButton);
    client.off('interactionCreate', handleModal);
    clearTimeout(timeout);
    
    try {
      const word = i.fields.getTextInputValue('secret_word').toUpperCase().trim();
      const hint = i.fields.getTextInputValue('word_hint').trim() || 'Sin pista';
      
      if (word.length < 5 || !/^[ABCDEFGHIJKLMNÑOPQRSTUVYZ]+$/.test(word)) {
        processed = false;
        await i.reply({
          content: '❌ Palabra inválida. Debe tener mínimo 5 letras (A-Z, Ñ únicamente). Intenta de nuevo.',
          ephemeral: true
        });
        gameState.channel.guild.client.once('interactionCreate', handleModal);
        return;
      }
      
      await i.deferReply({ ephemeral: true });
      await i.editReply('✅ Palabra recibida. ¡El juego comienza!');
      
      await triggerMessage.delete().catch(() => {});
      await playAhorcadosRound(interaction, gameState, word);
    } catch (error) {
      console.error('Error en handleModal:', error);
      try {
        await i.reply({
          content: `❌ Error: ${error.message}`,
          ephemeral: true
        });
      } catch (e) {
        console.error('Error al responder:', e);
      }
    }
  };
  
  client.on('interactionCreate', handleButton);
  client.on('interactionCreate', handleModal);
  
  const timeout = setTimeout(() => {
    client.off('interactionCreate', handleButton);
    client.off('interactionCreate', handleModal);
    triggerMessage.delete().catch(() => {});
    gameState.channel.send('⏰ El anfitrión no proporcionó la palabra a tiempo.').catch(() => {});
  }, 60000);
}

async function playAhorcadosRound(interaction, gameState, word) {
  const guessedLetters = new Set();
  let wrongGuesses = 0;
  const maxWrongGuesses = 6;
  
  const guesserObj = await interaction.client.users.fetch(gameState.guesserId);
  
  async function showBoard() {
    const displayWord = word.split('').map(l => guessedLetters.has(l) ? l : '_').join('');
    const embed = {
      color: 0x7289DA,
      title: `🎯 Ahorcado - Ronda ${gameState.round}/3`,
      description: `**Anfitrión:** <@${gameState.hostId}>\n**Adivinador:** <@${gameState.guesserId}>`,
      fields: [
        { name: '📝 Palabra', value: displayWord, inline: false },
        { name: '🎨 Dibujo', value: HANGMAN_STAGES[wrongGuesses], inline: false },
        { name: '❌ Errores', value: `${wrongGuesses}/${maxWrongGuesses}`, inline: true },
        { name: '📋 Letras', value: Array.from(guessedLetters).join(', ') || 'Ninguna', inline: true }
      ]
    };
    
    const letters = 'ABCDEFGHIJKLMNÑOPQRSTUVYZ'.split('');
    const rows = [];
    
    for (let i = 0; i < letters.length; i += 5) {
      const row = new ActionRowBuilder();
      for (let j = i; j < Math.min(i + 5, letters.length); j++) {
        const letter = letters[j];
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`ahorcados_${letter}`)
            .setLabel(letter)
            .setStyle(guessedLetters.has(letter) ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(guessedLetters.has(letter))
        );
      }
      rows.push(row);
    }
    
    return { embeds: [embed], components: rows };
  }
  
  try {
    const boardData = await showBoard();
    const boardMsg = await gameState.channel.send(boardData);
    
    const gameCollector = boardMsg.createMessageComponentCollector({ time: 300000 });
  
  gameCollector.on('collect', async i => {
    if (i.user.id !== gameState.guesserId) {
      return i.reply({ content: '❌ No es tu turno.', ephemeral: true });
    }
    
    const letter = i.customId.split('_')[1];
    guessedLetters.add(letter);
    
    if (!word.includes(letter)) {
      wrongGuesses++;
    }
    
    const isWon = word.split('').every(l => guessedLetters.has(l));
    const isLost = wrongGuesses >= maxWrongGuesses;
    
    const board = await showBoard();
    
    if (isWon) {
      board.components = [];
      gameState.scores[gameState.guesserId]++;
      await i.update(board);
      gameCollector.stop('won');
      
      await gameState.channel.send(`✅ <@${gameState.guesserId}> adivinó la palabra **${word}**!`);
      await new Promise(r => setTimeout(r, 2000));
      
      gameState.round++;
      swapRoles(gameState);
      await runAhorcadosRound(interaction, gameState);
    } else if (isLost) {
      board.components = [];
      gameState.scores[gameState.hostId]++;
      await i.update(board);
      gameCollector.stop('lost');
      
      await gameState.channel.send(`❌ <@${gameState.guesserId}> perdió. La palabra era **${word}**`);
      await new Promise(r => setTimeout(r, 2000));
      
      gameState.round++;
      swapRoles(gameState);
      await runAhorcadosRound(interaction, gameState);
    } else {
      await i.update(board);
    }
  });
  
    gameCollector.on('end', () => {
      if (gameState.round <= gameState.maxRounds) {
        boardMsg.edit({ components: [] }).catch(() => {});
      }
    });
  } catch (error) {
    console.error('Error al crear el tablero:', error);
    await gameState.channel.send(`❌ Error al mostrar el tablero: ${error.message}`).catch(() => {});
  }
}

function swapRoles(gameState) {
  [gameState.hostId, gameState.guesserId] = [gameState.guesserId, gameState.hostId];
}

async function endAhorcadosGame(interaction, gameState) {
  const player1Name = (await interaction.client.users.fetch(gameState.player1)).username;
  const player2Name = (await interaction.client.users.fetch(gameState.player2)).username;
  
  const p1Score = gameState.scores[gameState.player1];
  const p2Score = gameState.scores[gameState.player2];
  const winner = p1Score > p2Score ? gameState.player1 : p2Score > p1Score ? gameState.player2 : null;
  
  const p1Data = db.getUser(interaction.guild.id, gameState.player1);
  const p2Data = db.getUser(interaction.guild.id, gameState.player2);
  
  if (winner) {
    const loser = winner === gameState.player1 ? gameState.player2 : gameState.player1;
    p1Data.totalXp = winner === gameState.player1 ? addLevels(p1Data.totalXp, 1) : p1Data.totalXp;
    p2Data.totalXp = winner === gameState.player2 ? addLevels(p2Data.totalXp, 1) : p2Data.totalXp;
  }
  
  db.saveUser(interaction.guild.id, gameState.player1, p1Data);
  db.saveUser(interaction.guild.id, gameState.player2, p2Data);
  
  db.setCooldown('minigame_ahorcados', gameState.player1, 30 * 60 * 1000);
  db.setCooldown('minigame_ahorcados', gameState.player2, 30 * 60 * 1000);
  
  await gameState.channel.send({
    embeds: [{
      color: winner ? 0x4CAF50 : 0xFFD700,
      title: '🏆 ¡Juego Terminado!',
      description: `**${player1Name}:** ${p1Score}\n**${player2Name}:** ${p2Score}\n\n${winner ? `🥇 Ganador: <@${winner}>` : '🤝 ¡Empate!'}`
    }]
  });
}

export async function startTriviaFromMenu(interaction) {
  const cooldown = db.checkCooldown('minigame_trivia', interaction.user.id);
  if (cooldown) {
    return interaction.reply({
      content: `⏱️ Debes esperar ${formatDuration(cooldown)} antes de jugar trivia de nuevo.`,
      ephemeral: true
    });
  }
  await playTrivia(interaction);
}

export async function startHangmanFromMenu(interaction) {
  const cooldown = db.checkCooldown('minigame_hangman', interaction.user.id);
  if (cooldown) {
    return interaction.reply({
      content: `⏱️ Debes esperar ${formatDuration(cooldown)} antes de jugar ahorcado de nuevo.`,
      ephemeral: true
    });
  }
  await playSoloHangman(interaction);
}
