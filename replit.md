# -Niveles

## Recent Changes
- **Editor de Rankcards v3 - 8 Mejoras Mayores (Marzo 2026):**
  - **Sistema de capas:** Las capas de la rankcard (fondo, dibujo, imágenes, stickers, avatar, texto) se pueden reordenar arrastrando en la pestaña "Capas". El orden se guarda en `layerOrder` del config.
  - **Tienda de la comunidad (Marketplace):** Los usuarios pueden publicar sus diseños de rankcard para que otros los compren. Comisión del 15% (el autor recibe 85%). Máximo 5 publicaciones por usuario. Precios entre 500-500,000 LC. Datos en `data/marketplace.json`. Endpoints: `GET/POST /api/rankcard/marketplace/*`, comandos: `/rankcard marketplace`, `/rankcard publish`.
  - **Animaciones GIF:** Hasta 3 efectos simultáneos por tarjeta: wave, floating-particles, shimmer, glow-text, pulse-bar, rainbow-bar, sparkle, breathing. Genera GIF de 20 frames a 80ms usando `gifenc`. Costo: 3,000 LC.
  - **Tipografía expandida:** Selector de tamaño de texto (pequeño/normal/grande). 6 efectos de texto: shadow, outline, gradient, pixel-shadow, glow (VIP). Costo efecto: 500 LC.
  - **Marcos decorativos:** 5 estándar (1,000 LC): pixel-simple, rounded, double-line, dotted-border, corner-deco. 6 VIP (2,000 LC): golden, neon-frame, fire-frame, diamond, galaxy-frame, rainbow-frame. Pestaña "Marcos" con preview visual.
  - **Vista previa en Discord:** Comando `/rankcard preview` genera y envía la rankcard actual como imagen (o GIF si tiene animaciones) por DM efímero.
  - **Gradientes personalizados:** Fondos con 2-3 colores y 4 direcciones (horizontal, vertical, diagonal, radial). Costo: 800 LC. También gradiente para barra XP (+400 LC).
  - **Historial de diseños:** Últimos 5 diseños guardados automáticamente al comprar/cambiar. Restaurar desde pestaña "Historial" o `/rankcard history`. Datos en `data/design_history.json`. Endpoints: `GET /api/rankcard/history`, `POST /api/rankcard/history/restore`.
  - **Editor HTML v3:** 11 pestañas: Dibujar, Colores, Fondos, Marcos, Objetos, Imágenes, Texto, Capas, Animaciones, Tienda, Historial.
  - **Nuevas dependencias:** `gifenc` (generación GIF)
  - **Nuevos exports rankcardService:** `RANKCARD_FRAME_COST`, `RANKCARD_VIP_FRAME_COST`, `RANKCARD_GRADIENT_COST`, `RANKCARD_ANIMATION_COST`, `RANKCARD_TEXT_EFFECT_COST`, `MARKETPLACE_COMMISSION`, `getFramesForRole()`, `getTextEffectsForRole()`, `getAnimationTypes()`, `getGradientDirections()`, `getLayerOrderDefault()`, `STANDARD_FRAMES`, `VIP_FRAMES`, `TEXT_EFFECTS`, `GRADIENT_DIRECTIONS`, `ANIMATION_TYPES`, `LAYER_ORDER_DEFAULT`.
  - **Nuevos métodos DB:** `getMarketplaceListings()`, `getMarketplaceListingById()`, `getUserMarketplaceListings()`, `addMarketplaceListing()`, `buyMarketplaceListing()`, `removeMarketplaceListing()`, `getDesignHistory()`, `saveDesignToHistory()`, `restoreDesignFromHistory()`.
  - **Archivos modificados:** `utils/database.js`, `utils/rankcardService.js`, `utils/cardGenerator.js`, `public/rankcard-editor.html`, `index.js`, `commands/rankcard.js`

- **Dashboard & Admin Panel Overhaul (Marzo 2026):**
  - **Leaderboard simplificado:** Eliminado el podio exagerado del top 3. Ahora los 3 primeros usuarios se muestran como filas normales pero con colores personalizados: dorado (#FFD700), plateado (#C0C0C0) y bronce (#CD7F32). Incluyen medallas emoji.
  - **Todos los comandos en el Admin Panel:** Pagina "Comandos Staff" en el admin panel muestra TODOS los comandos del bot (~80+) organizados en 9 categorias: Niveles, Staff Niveles, Economia, Staff Economia, Casino, Minijuegos, Utilidad, Social, Staff Sistemas. Cada comando tiene toggle para activar/desactivar y edicion de descripcion. Filtros por categoria.
  - **Backend staff commands:** Nuevos endpoints API: `GET /api/admin/staff-commands`, `POST /api/admin/staff-commands/toggle`, `PUT /api/admin/staff-commands/update`. Estado almacenado en `data/staff_commands.json`. Los comandos desactivados desde el panel se bloquean en Discord con mensaje de error.
  - **Historial de logins:** El dashboard principal del admin panel muestra los inicios de sesion de cada usuario con nombre, rol, fecha y hora. Se almacenan en `data/login_history.json` (max 100 registros). Se registra automaticamente al autenticarse.
  - **Metodos DB:** `getStaffCommands()`, `setStaffCommand()`, `isStaffCommandEnabled()`, `addLoginRecord()`, `getLoginHistory()` en `utils/database.js`.
  - **Sistema de preguntas eliminado:** Quitada la seccion "Preguntas Frecuentes" completa del dashboard (formulario, lista, modal de respuesta). Eliminados los 3 endpoints API (`/api/questions`). Eliminado CSS y JS asociado.
  - **Rankcard select con custom:** El comando `/rankcard select` ahora muestra la opcion "Personalizada" cuando el usuario tiene una rankcard custom. Permite alternar entre la rankcard personalizada y los temas predefinidos. `generateRankCard` ahora respeta `selectedCardTheme` en vez de auto-aplicar la custom.
  - **Archivos modificados:** `public/index.html`, `public/js/main.js`, `public/css/style.css`, `public/admin/dashboard.html`, `public/admin/js/admin.js`, `public/admin/css/admin.css`, `index.js`, `utils/database.js`, `utils/cardGenerator.js`, `commands/rankcard.js`

- **Fix Preview/Discord Consistency (Marzo 2026):**
  - Replaced all `Math.random()` calls in `cardGenerator.js` with a seeded PRNG (`createSeededRandom`) based on user ID hash (`userSeedFromId`).
  - Every background (stars, galaxy, geometric, cyberpunk, waves) and decorative effect (drawStars, drawNeonGlow, drawCupheadEffects, drawUndertaleEffects, drawFortniteEffects, themed card backgrounds) now produces identical results for the same user across renders.
  - Web preview and Discord `/level` output now look the same since the seed is initialized at the start of `generateRankCard` and `generateCustomRankCard`.
  - Module-level `_seededRand` variable is set per render call, used by all drawing functions.

- **Editor de Rankcards v2 - Mejoras Completas (Marzo 2026):**
  - **Soporte móvil completo:** Touch events (touchstart/touchmove/touchend) en el canvas de dibujo para que funcione en dispositivos móviles. Interfaz responsive con pestañas deslizables, controles touch-friendly y hints para móvil.
  - **Aislamiento de fuentes:** La tipografía seleccionada en el editor solo aplica al nombre de usuario en la rankcard del usuario. No afecta al leaderboard (usa Arial hardcoded) ni a rankcards de otros usuarios. Mensaje aclaratorio en la UI.
  - **5 fondos prediseñados:** 3 estándar (Cielo Estrellado, Olas del Mar, Geométrico) y 2 VIP/Booster (Cyberpunk, Galaxia). Cada uno con costo extra (1,500 LC estándar, 2,500 LC VIP). Opcional - los usuarios pueden usar color sólido personalizado.
  - **Más pinceles:** Estándar: Redondo, Cuadrado, Fino, Medio, Borrador, Cubo Relleno, Punteado, Caligrafía. VIP: Spray, Neón, Marcador, Brillos, Arcoíris, Pixel Art, Estrellas.
  - **Borrador y cubo rellenador:** Borrador disponible para todos (movido de VIP a estándar). Cubo rellenador con flood fill algorithm.
  - **Fix paleta Neón:** Los colores neón ahora también se aplican al color de dibujo del pincel (antes solo cambiaban el color de acento). Sección dedicada de colores neón para dibujo.
  - **Resolución variable (VIP/Booster):** 3 opciones: Estándar (800x250), HD (1000x312), Full HD (1200x375). Costo extra de 2,000 LC. El canvas de dibujo se redimensiona al cambiar resolución.
  - **Objetos decorativos (stickers):** 20 objetos estándar y 10 VIP. Se renderizan como formas vectoriales dibujadas (no emojis) para compatibilidad con @napi-rs/canvas. Se colocan tocando/haciendo clic en la vista previa, se arrastran para reposicionar, doble clic para eliminar. Costo: 300 LC por objeto.
  - **Imágenes con selector de archivos:** Un solo botón "Agregar imagen" que abre la galería/gestor de archivos del dispositivo. Máximo 3 imágenes (base64, máx 2MB c/u). Lista dinámica con thumbnails, tamaño editable (W/H), y botón de eliminar. Imágenes existentes se cargan al editar.
  - **Mejor posicionamiento de imágenes:** Overlays visuales semi-transparentes sobre la vista previa que se pueden arrastrar (mouse y touch) para reposicionar las imágenes directamente. Se actualizan al redimensionar ventana.
  - **Fix stickers duplicados:** Los stickers ya no se duplican al arrastrarlos. Flag `stickerDragJustEnded` previene que el evento click genere nuevos stickers después de un drag.
  - **UI mejorada para móviles:** Pestañas organizadas (Dibujar, Colores, Fondos, Objetos, Imágenes, Texto, Ajustes VIP). Diseño responsive completo. Función de deshacer (undo) con historial.
  - **Express body limit:** Incrementado a 10mb para `/api/rankcard` para soportar payloads con imágenes base64.
  - **Archivos modificados:** `utils/rankcardService.js`, `utils/cardGenerator.js`, `public/rankcard-editor.html`, `index.js`

- **Fix Configuracion Page Blank (Febrero 2026):**
  - Fixed the Configuracion page in the admin panel showing completely blank/gray.
  - Root cause: `.toggle-slider` (maintenance toggle) had `position: absolute; inset: 0; background: #ccc` without a positioned parent, causing it to cover the entire viewport with a gray overlay.
  - Fix: Wrapped the checkbox input and toggle-slider in a `.toggle-switch` container (which has `position: relative` and explicit dimensions).
  - Added hash-based URL routing to admin.js (e.g., `dashboard.html#configuracion` navigates directly to that page).

- **Sistema de Reacciones y Emociones (Febrero 2026):**
  - Slash command `/react` con 5 subcomandos: `hug`, `kiss`, `pat`, `ship`, `kill`.
  - 45+ comandos con prefijo `!` para reacciones: afecto, enojo, humor, emociones, interacción, especiales.
  - Cada comando muestra un embed con GIF anime aleatorio al estilo Nekotina.
  - Comandos de dos usuarios muestran fotos de perfil de ambos (author icon + thumbnail).
  - `ship` calcula compatibilidad determinista basada en IDs con barra de amor y comentario.
  - Archivos: `data/reactionGifs.js` (GIFs), `utils/reactionHandler.js` (lógica), `commands/react.js` (slash).
  - Prefix handler integrado en el segundo `messageCreate` de `index.js`.
  - Categoría "Reacciones" añadida al comando `/help`.

- **Mejoras Mobile + Rediseño Leaderboard (Febrero 2026):**
  - **Menú hamburguesa móvil:** Botón de 3 líneas que abre/cierra la navegación en pantallas pequeñas (<768px). Se cierra automáticamente al seleccionar una sección.
  - **Sección Inactividad fusionada:** El contenido de la sección "Inactividad" fue integrado como una tarjeta dentro de "Características", eliminando el enlace de navegación independiente.
  - **Rediseño del Leaderboard:** Top 3 usuarios mostrados en tarjetas tipo podio (oro, plata, bronce) con avatares grandes, corona animada para el #1 y efectos de brillo. El resto de usuarios en lista compacta con filas hover. Paginación corregida para contabilizar el podio.
  - **CSS responsive completo:** Media queries mejoradas para todos los componentes: hero stats compactos, grids de una columna, tarjetas de comandos adaptadas, tablas con fuentes reducidas, leaderboard adaptado a columnas verticales en móvil, espaciados optimizados.

- **Dashboard Admin v3 - Sección Economía (Febrero 2026):**
  - Nueva página "Economía" en el panel admin con navegación en sidebar.
  - **Resumen económico:** Total coins en circulación, coins en banco, riqueza total, total de transacciones, usuario más rico.
  - **Detección de anomalías:** Análisis automático de usuarios con riqueza > 500k, wallet alta, ganancias excesivas en casino, transacciones masivas en 24h. Severidades: medium/high/critical con colores.
  - **Historial de transacciones:** Tabla de todas las transacciones recientes con filtro por tipo, cantidades coloreadas (positivo/negativo), usuario, descripción y fecha.
  - **Catálogo de tienda:** Vista de todos los items (50+) con emoji, nombre, categoría, descripción, precio y comando que desbloquea. Filtro por categoría.
  - **4 nuevos endpoints API:** `/api/admin/economy/overview`, `/api/admin/economy/transactions`, `/api/admin/economy/anomalies`, `/api/admin/economy/shop`.
  - Completamente responsive para mobile.

- **Dashboard Admin v3 - Expansión Completa (Febrero 2026):**
  - **Nuevas páginas:** Graficas (Chart.js), Alertas, Misiones Live, Control Sistemas, Audit Log.
  - **Chart.js integrado:** 4 gráficas interactivas (XP timeseries, niveles subidos, distribución de niveles, comandos top 10), selector de período 7/14/30 días.
  - **Sistema de alertas:** Polling cada 60s, badges con número en campana y sidebar, descartar alertas, severidades (info/warning/error/critical).
  - **Misiones en tiempo real:** Polling cada 30s, barras de progreso animadas por misión y usuario.
  - **Control avanzado de sistemas:** Toggle por sistema con razón, override por canal, programar reactivación, 8 sistemas configurables.
  - **Audit Log:** Tabla paginada de acciones admin, filtros por acción/admin, exportar CSV.
  - **Acciones en masa de usuarios:** Checkboxes de selección múltiple, barra de acciones flotante, 8 tipos de acción masiva.
  - **Detalle de usuario con pestañas:** Stats, Controles Avanzados (ban XP, cooldowns, matrimonio, seguro, racha, nacionalidad), Inventario, Historial.
  - **Gestión completa de boosts:** Crear boost global/usuario/canal con multiplicador y duración, eliminar boosts activos.
  - **Exportar datos:** CSV y JSON para usuarios y leaderboard.
  - **Mobile responsive:** Sidebar colapsable con hamburger, grids adaptables, tablas con scroll horizontal, toasts de notificación.
  - **Backend:** 18+ nuevos endpoints API en index.js, audit log en database.js, timeseries, sistemas avanzados, boosts CRUD.

- **Sistema de Auditoría Avanzado (Febrero 2026):**
  - Reescritura completa de `activityLogger.js` con persistencia MongoDB y 30+ tipos de log.
  - 13 categorías de sistema: economía, niveles, casino, minijuegos, misiones, nacionalidades, social, admin, tienda, powerups, robos, seguridad, general.
  - 4 niveles de importancia: low, medium, high, critical.
  - Logging detallado en 28 archivos de comandos con montos, saldos, y resultados.
  - Interceptor global de comandos en `index.js` que registra cada uso de comando.
  - Filtros avanzados en API: por tipo, sistema, importancia, período (hora/día/semana), paginación.
  - Detección automática de actividad sospechosa: abuso de robos, rachas de casino, uso excesivo de admin.
  - Exportación de logs en CSV y JSON desde el panel admin.
  - Panel admin actualizado con dropdowns de filtros, alertas, paginación, indicadores de importancia.
  - Almacenamiento dual: memoria (1000 entradas) + MongoDB (persistente).

- **Persistencia de Nacionalidades en MongoDB (Febrero 2026):**
  - Las nacionalidades ahora se guardan en MongoDB en lugar de solo archivo JSON.
  - Las funciones `getUserNationality`, `assignRandomNationality`, y `travelToCountry` ahora son async.
  - Cuando MongoDB está conectado, los datos se guardan ahí y sobreviven a reinicios de Render.
  - Si MongoDB falla, el sistema usa JSON local como fallback.
  - Requiere variable de entorno: `MONGODB_URI` con credenciales válidas.

- **Balance Update (Febrero 2026):**
  - Cooldowns actualizados: Casino 30-60s, Trabajo 1min, Robo 30s, Robo Banco 2min.
  - Sistema de límite de banco: Base 10k, expansiones comprables (+5k, +10k, +20k).
  - Precios de consumibles ajustados: Bebida 3k, Trébol 6k, Escudo 15k.
  - Probabilidad de robo reducida 10%: Usuario 15%, Banco 5%.
  - Escudo Anti-Robo ahora activa correctamente la protección de seguro.
  - Panel de estadísticas movido antes del leaderboard en el dashboard web.
  - Ruleta Rusa: timeout de 30s por turno, si no disparas pierde el DOBLE (6 niveles, 600 LC).

- **Comando /gamecard con IA (Enero 2026):**
  - Reconstruido completamente el comando `/gamecard` con generación de imágenes por IA.
  - Dos subcomandos: `/gamecard profile` (tarjeta de perfil) y `/gamecard battle` (tarjeta de batalla).
  - Soporte para 8 videojuegos: Roblox, Minecraft, Brawl Stars, Geometry Dash, Fortnite, Clash Royale/CoC, Genshin Impact, Valorant.
  - Opción de petición personalizada para que la IA genere exactamente lo que el usuario quiere.
  - Usa Gemini AI (Replit AI Integrations) para generar las imágenes.
  - Manejo de errores mejorado con reintentos para rate limits.
  - Requiere variables de entorno: `AI_INTEGRATIONS_GEMINI_API_KEY`, `AI_INTEGRATIONS_GEMINI_BASE_URL`.

- **Panel Admin Completo v2 (Enero 2026):**
  - Sistema de cuentas de administrador (Gars y Mazin).
  - Logs en tiempo real: XP, niveles, Lagcoins, trabajo, casino, robos, misiones, items.
  - Gestion de usuarios: busqueda por nombre/ID, ver detalles completos.
  - Modificacion de usuarios: agregar/quitar/establecer/resetear XP, nivel, Lagcoins (cartera y banco).
  - Historial de actividad por usuario con filtros.
  - Auto-refresh de logs cada 5 segundos.
  - Dashboard con estadisticas en tiempo real del bot.
  - Sistema XP: muestra XP total, promedio, maximo, top 10 usuarios.
  - Niveles: distribucion de usuarios por nivel, top 10 por nivel.
  - Roles: muestra roles asignados por nivel y roles especiales.
  - Misiones: estadisticas semanales de misiones completadas.
  - Power-ups: boosts globales, de usuario y de canal activos.
  - Estadisticas: metricas completas del sistema.
  - Configuracion: visualizacion de la configuracion del bot y toggle de mantenimiento.
- **Economy Rebalancing (Jan 2026):** 
  - Nerfed all job earnings by 40-50% to control inflation.
  - Increased shop prices (e.g., 100 XP now costs 3000 Lagcoins).
  - Increased all power-up prices significantly.
  - Rebalanced casino games with higher house edges and lower multipliers.
  - Fixed Slots Jackpot bug and capped it at x6 reward.
- **Reequilibrio de la Economía (Enero 2026):**
  - Se redujeron las ganancias de todos los trabajos en un 40-50% para controlar la inflación.
  - Se incrementaron los precios de la tienda (ej. 100 XP ahora cuesta 3000 Lagcoins).
  - Se incrementaron significativamente los precios de todos los power-ups.
  - Se reequilibraron los juegos del casino con mayor ventaja para la casa y menores multiplicadores.
  - Se corrigió el error del Jackpot en las Slots y se limitó a una recompensa x6.
  - Se nerfeó el sistema de robos: probabilidad base reducida al 25%, robo máximo del 10% y multas incrementadas.
- **Restauración de Nacionalidades (Enero 2026):**
  - Se revirtieron los multiplicadores de nacionalidad y salarios a sus valores originales según la preferencia del usuario.

## Overview
This project is a comprehensive Discord bot featuring a leveling and XP system, a virtual economy (Lagcoins), a casino with various games, minigames, power-ups, anti-theft insurance, nationality assignments, auctions, user streaks, and customizable PIXEL ART rank cards. The bot is designed for deployment on Render from GitHub, ensuring persistence and scalability. It aims to provide an engaging and interactive experience for Discord communities through gamification and social features.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes. I prefer detailed explanations. Do not make changes to the folder `Z`. Do not make changes to the file `Y`.

## System Architecture
The bot is built with Node.js and uses a command-based structure for Discord interactions. Data persistence is handled via MongoDB for production deployments (Render) with a JSON fallback for development (Replit).

**UI/UX Decisions:**
- **PIXEL ART Theme:** A consistent pixel art style is applied to rank cards and leaderboards, with 12 distinct themes (Pixel, Ocean, Zelda, Pokemon, Geometry Dash, Night, Roblox, Minecraft, FNAF, Cuphead, Undertale, Fortnite) unlocked based on user level, special conditions, or shop purchase (500k Lagcoins for Cuphead/Undertale/Fortnite).
- **Interactive Menus:** Commands like `/work` utilize interactive menus for better user experience.
- **Web Dashboard:** A public web dashboard (`public/index.html`) provides additional information and leaderboards, including paginated results and user lookup modals.

**Technical Implementations:**
- **Leveling System:** Progressive XP formula with cooldowns and automatic role rewards at specific levels.
- **Economy System:** Features Lagcoins as virtual currency, banking, 24+ jobs, a shop with 50+ items, a theft system with insurance, daily streaks, and weekly taxes.
- **Power-Ups:** 12 different power-ups across 4 categories (work, casino, theft, XP boosts) with temporary durations.
- **Anti-Robo Insurance:** Four tiers of protection (50% to 100%) against theft.
- **Nationalities:** Over 30 countries with varying probabilities, work multipliers, and a travel system requiring passports and visas for developed nations.
- **Casino & Minigames:** A variety of casino games (Roulette, Slots, Blackjack, Coinflip, Dice, Horse Racing, Poker, Duels) and minigames (Trivia, Hangman, Rock-Paper-Scissors, Russian Roulette).
- **Boost System:** Accumulable boosts (XP, economy) with automatic boosts for VIPs/Boosters and a nocturnal boost.
- **Card Generation:** Dynamic generation of pixel art profile cards and game-specific cards (Minecraft, Brawl Stars, Roblox).

**Feature Specifications:**
- **Cooldowns:** Comprehensive `/cooldowns` command to view all active cooldowns.
- **Gifting System:** `/gift` command to transfer items, Lagcoins, or XP between users.
- **Tax System:** Weekly progressive tax system based on total wealth, with penalties for non-payment.

**System Design Choices:**
- **Modularity:** Project structure uses `commands/`, `utils/`, `data/` directories for better organization.
- **Deployment:** Optimized for Render deployment, with specific instructions for configuring environment variables.
- **Database Synchronization:** `mongoSync.js` handles synchronization with MongoDB, `database.js` for JSON persistence.

## External Dependencies
- **Discord API:** Core integration for bot functionality.
- **MongoDB:** Primary database for persistent data storage in production.
- **Render:** Cloud platform for hosting the bot.
- **GitHub:** Version control and deployment source for Render.