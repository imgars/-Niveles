# Discord Leveling Bot - Proyecto

## Descripcion General

Bot de Discord completo con sistema de niveles, XP, economia (Lagcoins), casino, minijuegos y tarjetas de rango personalizadas. Este proyecto esta listo para ejecutarse en Replit y ser desplegado a Render u otras plataformas de hosting.

## Funcionalidades Principales

### Sistema de Niveles y XP
- Formula de XP progresiva (niveles 1-5 muy rapidos, hasta nivel 90+ muy lentos)
- Cooldown de 10 segundos entre mensajes
- Ganancia de XP por mensajes, imagenes, videos y reacciones
- Recompensas automaticas de roles en niveles especificos
- Persistencia de datos en JSON y MongoDB

### Sistema de Economia (Lagcoins) - NUEVO
- Moneda virtual: Lagcoins
- Banco para depositar y proteger dinero
- 13 trabajos diferentes con herramientas requeridas
- Tienda con 19+ items en 10 categorias
- Sistema de robos entre usuarios
- Estadisticas detalladas de economia
- Rachas de recompensas diarias

### Sistema de Casino - NUEVO
- /casino - Ruleta clasica (hasta x3)
- /slots - Tragamonedas con jackpot (x10)
- /blackjack - Juega al 21 contra el dealer
- /coinflip - Lanza moneda 50/50
- /dice - Dados con predicciones (alto/bajo/exacto/dobles)
- Estadisticas de casino por usuario

### Comandos de Staff para Economia - NUEVO
- /addcoins - Anadir Lagcoins a usuarios
- /removecoins - Quitar Lagcoins a usuarios
- /setcoins - Establecer Lagcoins exactos
- /giveitem - Dar items a usuarios
- /removeitem - Quitar items a usuarios

### Sistema de Boosts
- Boosts acumulables (se suman entre si)
- Boost automatico de 200% para Boosters y VIPs
- Boost nocturno de 25% (18:00-06:00 Venezuela)
- Boosts personalizados por usuario, canal o globales
- Gestion completa via comandos

### Minijuegos
- **Trivia**: 5 preguntas, recompensas de boost o niveles
- **Piedra, Papel o Tijeras**: Mejor de 3, con recompensas
- **Ruleta Rusa**: Riesgoso! Ganador +2.5 niveles, perdedor -3 niveles
- **Ahorcado Solo**: 3 rondas, 25% boost o 1 nivel, cooldown 48h
- **Ahorcado Multi**: Host vs Adivinador, +0.5 niveles, cooldown 30min
- Sistema de cooldowns para cada minijuego

### Tarjetas Personalizadas
- Generacion dinamica con Canvas
- Temas pixel art segun rango del usuario
- Temas especiales para boosters, VIPs y usuario especial

### Dashboard Web
- Pagina web con tema retro pixel art (Pokemon, Zelda, Mario)
- Secciones: Inicio, Caracteristicas, Comandos, Minijuegos, Tarjetas, Leaderboard
- Leaderboard completo con hasta 500 usuarios
- API REST para obtener datos

## Configuracion Actual

### IDs Configurados en config.js
```javascript
STAFF_ROLE_ID: '1230949715127042098'
BOOSTER_ROLE_ID: '1229938887955189843'
VIP_ROLE_ID: '1230595787717611686'
SPECIAL_USER_ID: '956700088103747625'
LEVEL_UP_CHANNEL_ID: '1420907355956318239'
MISSION_COMPLETE_CHANNEL_ID: '1441276918916710501'
NO_XP_CHANNELS: ['1313723272290111559', '1258524941289263254']
```

### Roles de Nivel
- Nivel 1: Nuevo Miembro
- Nivel 5: Iniciado
- Nivel 10: Regular
- Nivel 20: Conocido
- Nivel 25: Miembro Activo
- Nivel 30: Veterano
- Nivel 35: Super Activo
- Nivel 40: Elite
- Nivel 50: Maestro
- Nivel 75: Leyenda
- Nivel 100: Inmortal

## Como Ejecutar

### En Replit (Configurado)
Este proyecto esta completamente configurado para Replit:

1. **Variables de entorno**: DISCORD_BOT_TOKEN y MONGODB_URI configurados en Secrets
2. **Workflow**: Configurado para ejecutar npm start automaticamente
3. **Dependencias**: Instaladas automaticamente con npm
4. **Puerto**: Servidor web en puerto 5000 con Dashboard
5. **MongoDB**: Sincronizacion automatica de datos

### URLs del Dashboard
- `/` - Pagina principal con todas las secciones
- `/api/leaderboard` - API JSON con hasta 500 usuarios
- `/api/stats` - Estadisticas generales
- `/health` - Health check para Uptime Robot

## Estructura del Proyecto

```
├── index.js              # Bot principal
├── config.js             # Configuracion
├── commands/             # Comandos slash (35+ archivos)
│   ├── level.js          # Comandos de niveles
│   ├── balance.js        # Comandos de economia
│   ├── casino.js         # Juegos de casino
│   ├── slots.js          # Tragamonedas
│   ├── blackjack.js      # Blackjack
│   ├── coinflip.js       # Lanzar moneda
│   ├── dice.js           # Dados
│   ├── tienda.js         # Tienda de items
│   ├── trabajar.js       # Sistema de trabajos
│   ├── addcoins.js       # Staff: dar Lagcoins
│   ├── removecoins.js    # Staff: quitar Lagcoins
│   ├── giveitem.js       # Staff: dar items
│   └── ...               # Mas comandos
├── utils/                # Utilidades
│   ├── database.js       # Persistencia JSON
│   ├── mongoSync.js      # Sincronizacion MongoDB
│   ├── economyDB.js      # Sistema de economia
│   ├── xpSystem.js       # Sistema de XP
│   ├── cardGenerator.js  # Generacion de imagenes
│   ├── timeBoost.js      # Boost nocturno
│   └── helpers.js        # Funciones auxiliares
├── public/               # Dashboard web
│   ├── index.html        # Pagina principal
│   ├── css/style.css     # Estilos
│   └── js/main.js        # JavaScript
└── data/                 # Datos persistentes
    ├── users.json        # Datos de usuarios
    ├── economy.json      # Datos de economia
    └── boosts.json       # Datos de boosts
```

## Comandos Disponibles

### Comandos de Niveles (8)
- /level, /nivel, /rank - Ver nivel con tarjeta
- /leaderboard, /lb - Tabla de clasificacion
- /rewards list - Ver recompensas
- /boost list, /boost status - Ver boosts
- /help - Ayuda

### Comandos de Economia (12)
- /balance - Ver saldo
- /perfil - Ver perfil completo
- /estadisticas - Estadisticas detalladas
- /daily - Recompensa diaria
- /trabajar - Trabajar para ganar Lagcoins
- /work - Trabajo rapido
- /tienda - Comprar items
- /inventario - Ver items
- /depositar - Depositar en banco
- /retirar - Retirar del banco
- /robar - Robar a usuarios
- /trade - Intercambiar Lagcoins

### Comandos de Casino (5)
- /casino - Ruleta clasica
- /slots - Tragamonedas
- /blackjack - 21
- /coinflip - Lanzar moneda
- /dice - Dados

### Minijuegos de XP (5)
- /minigame trivia - Trivia
- /minigame rps - Piedra, Papel, Tijeras
- /minigame roulette - Ruleta Rusa
- /ahorcado solo - Ahorcado solitario
- /ahorcado multi - Ahorcado multijugador

### Staff - Niveles (11)
- /addlevel, /removelevel, /setlevel - Gestion de niveles
- /xp add/remove/reset - Gestion de XP
- /boost add, /globalboost, /removeglobalboost - Gestion de boosts
- /banxp, /unbanxp - Sistema de bans
- /resettemporada - Resetear temporada
- /clearlevelroles - Limpiar roles

### Staff - Economia (5)
- /addcoins - Dar Lagcoins
- /removecoins - Quitar Lagcoins
- /setcoins - Establecer Lagcoins
- /giveitem - Dar items
- /removeitem - Quitar items

## Items de la Tienda

### Herramientas (Desbloquean trabajos)
- Cana de Pesca (500) - Pescador
- Hacha (600) - Lenador
- Pico (800) - Minero
- Pala (700) - Albanil

### Tecnologia
- Laptop Gaming (2000) - Programador
- Camara HD (1500) - Streaming

### Vehiculos
- Moto de Reparto (1200) - Repartidor
- Bicicleta (300)

### Instrumentos
- Guitarra Electrica (1800) - Musico

### Consumibles
- Bebida Energetica (150) - Reduce cooldown
- Trebol de la Suerte (500) - +20% casino
- Escudo Anti-Robo (800) - Proteccion

### Coleccionables
- Corona Dorada (10000)
- Diamante Brillante (5000)
- Trofeo de Oro (3000)

## Trabajos Disponibles (13)

| Trabajo | Ganancia | Herramienta | Cooldown |
|---------|----------|-------------|----------|
| Basico | 50-120 | Ninguna | 60s |
| Pescador | 100-250 | Cana Pesca | 45s |
| Lenador | 120-300 | Hacha | 45s |
| Minero | 150-400 | Pico | 45s |
| Albanil | 180-450 | Pala | 45s |
| Programador | 200-500 | Laptop | 40s |
| Chef | 150-350 | Utensilios | 50s |
| Repartidor | 80-200 | Moto | 30s |
| Streamer | 100-600 | Camara+Laptop | 120s |
| Musico | 120-400 | Guitarra | 60s |
| Artista | 100-450 | Kit Arte | 90s |
| Cazador | 180-500 | Arco | 60s |
| Granjero | 130-350 | Semillas | 45s |

## Variables de Entorno Requeridas

```
DISCORD_BOT_TOKEN=tu_token_de_discord
MONGODB_URI=tu_connection_string_mongodb
```

## Despliegue

### Render (Recomendado)
El bot esta configurado para desplegarse en Render:
- Repository: https://github.com/imgars/-Niveles.git
- Dashboard URL: https://niveles-wul5.onrender.com
- Build Command: npm install
- Start Command: node index.js

### Subir cambios a GitHub
```bash
git add .
git commit -m "Descripcion de cambios"
git push origin main
```

## Cambios Recientes

### 3 de Diciembre 2025 - v2.0.0
- NUEVO: Sistema de economia completo con Lagcoins
- NUEVO: 5 juegos de casino (ruleta, slots, blackjack, coinflip, dados)
- NUEVO: Tienda con 19+ items en 10 categorias
- NUEVO: 13 trabajos diferentes con herramientas
- NUEVO: Sistema de banco (depositar/retirar)
- NUEVO: Sistema de robos entre usuarios
- NUEVO: Comandos de staff para economia
- NUEVO: Estadisticas detalladas de casino y trabajos
- FIX: Lagcoins y items ahora se guardan correctamente en MongoDB
- FIX: Sincronizacion completa de economia con MongoDB
- UPDATE: Dashboard web actualizado con nuevos comandos
- UPDATE: Link del leaderboard actualizado a nueva URL

---

**Ultima actualizacion**: 3 de Diciembre de 2025
**Estado**: COMPLETO - Economia y Casino implementados
**Version**: 2.0.0 - Sistema de economia completo
**Entorno**: Replit + MongoDB Atlas
**MongoDB**: Conectado - Sincronizacion automatica
