// ============================================================================
//  🕵️ EL IMPOSTOR — Base de datos de temas y palabras
//  Puedes agregar o quitar temas/palabras libremente (mínimo ~10 por tema).
//  Consejo: usa palabras concretas que se puedan describir con UNA palabra.
// ============================================================================
export const THEMES = {
  'Frutas': ['Manzana', 'Banano', 'Naranja', 'Fresa', 'Uva', 'Sandía', 'Piña', 'Mango', 'Pera', 'Durazno', 'Cereza', 'Limón', 'Kiwi', 'Melón', 'Coco', 'Papaya'],
  'Animales': ['Perro', 'Gato', 'León', 'Elefante', 'Jirafa', 'Águila', 'Serpiente', 'Tigre', 'Pingüino', 'Caballo', 'Mono', 'Oso', 'Conejo', 'Lobo', 'Murciélago', 'Cocodrilo'],
  'Animales marinos': ['Pulpo', 'Ballena', 'Medusa', 'Cangrejo', 'Estrella de mar', 'Caballito de mar', 'Foca', 'Calamar', 'Langosta', 'Tiburón', 'Delfín', 'Orca', 'Almeja', 'Pez payaso', 'Tortuga marina'],
  'Países': ['México', 'Argentina', 'España', 'Brasil', 'Japón', 'Italia', 'Egipto', 'Canadá', 'Chile', 'Alemania', 'Colombia', 'Perú', 'Francia', 'Australia', 'India', 'El Salvador', 'China'],
  'Comidas': ['Pizza', 'Hamburguesa', 'Tacos', 'Sushi', 'Paella', 'Lasaña', 'Empanada', 'Arepa', 'Pupusa', 'Ceviche', 'Hot dog', 'Ensalada', 'Espagueti', 'Sopa', 'Burrito', 'Tamal'],
  'Bebidas': ['Café', 'Té', 'Jugo', 'Limonada', 'Leche', 'Batido', 'Refresco', 'Horchata', 'Agua', 'Chocolate caliente', 'Cerveza', 'Vino', 'Energizante', 'Té helado'],
  'Postres': ['Helado', 'Pastel', 'Flan', 'Galleta', 'Brownie', 'Dona', 'Gelatina', 'Tres leches', 'Churro', 'Cupcake', 'Arroz con leche', 'Panqueque', 'Chocolate', 'Paleta'],
  'Verduras': ['Zanahoria', 'Tomate', 'Cebolla', 'Papa', 'Lechuga', 'Brócoli', 'Pepino', 'Pimiento', 'Calabaza', 'Espinaca', 'Maíz', 'Ajo', 'Repollo', 'Berenjena', 'Rábano'],
  'Deportes': ['Fútbol', 'Baloncesto', 'Tenis', 'Natación', 'Béisbol', 'Boxeo', 'Voleibol', 'Ciclismo', 'Golf', 'Atletismo', 'Judo', 'Surf', 'Rugby', 'Esgrima', 'Karate', 'Patinaje'],
  'Profesiones': ['Doctor', 'Maestro', 'Bombero', 'Policía', 'Cocinero', 'Piloto', 'Abogado', 'Arquitecto', 'Dentista', 'Carpintero', 'Astronauta', 'Periodista', 'Electricista', 'Panadero', 'Veterinario', 'Mecánico'],
  'Instrumentos musicales': ['Guitarra', 'Piano', 'Batería', 'Violín', 'Trompeta', 'Flauta', 'Saxofón', 'Arpa', 'Acordeón', 'Ukelele', 'Tambor', 'Marimba', 'Clarinete', 'Armónica', 'Maracas'],
  'Géneros musicales': ['Reguetón', 'Rock', 'Salsa', 'Cumbia', 'Pop', 'Rap', 'Jazz', 'Bachata', 'Merengue', 'Metal', 'Reggae', 'Tango', 'Blues', 'Mariachi', 'Electrónica', 'Ranchera'],
  'Transportes': ['Avión', 'Bicicleta', 'Barco', 'Tren', 'Autobús', 'Motocicleta', 'Helicóptero', 'Taxi', 'Submarino', 'Patineta', 'Cohete', 'Camión', 'Metro', 'Globo aerostático', 'Tractor'],
  'Ropa': ['Camiseta', 'Pantalón', 'Zapatos', 'Sombrero', 'Bufanda', 'Chaqueta', 'Vestido', 'Calcetines', 'Gorra', 'Guantes', 'Falda', 'Corbata', 'Sandalias', 'Pijama', 'Cinturón'],
  'Hogar': ['Sofá', 'Mesa', 'Cama', 'Refrigerador', 'Lámpara', 'Espejo', 'Estufa', 'Ventana', 'Cortina', 'Alfombra', 'Silla', 'Armario', 'Televisor', 'Microondas', 'Escritorio'],
  'Cocina': ['Cuchillo', 'Tenedor', 'Cuchara', 'Sartén', 'Olla', 'Plato', 'Vaso', 'Licuadora', 'Colador', 'Taza', 'Rallador', 'Tostadora', 'Batidora', 'Cucharón'],
  'Herramientas': ['Martillo', 'Destornillador', 'Sierra', 'Taladro', 'Llave inglesa', 'Alicate', 'Clavo', 'Tornillo', 'Cinta métrica', 'Pala', 'Hacha', 'Pincel', 'Escalera', 'Lija'],
  'Naturaleza': ['Montaña', 'Río', 'Volcán', 'Playa', 'Bosque', 'Desierto', 'Cascada', 'Isla', 'Lago', 'Selva', 'Cueva', 'Glaciar', 'Pradera', 'Océano', 'Pantano'],
  'Clima': ['Lluvia', 'Nieve', 'Tormenta', 'Sol', 'Viento', 'Niebla', 'Granizo', 'Huracán', 'Arcoíris', 'Rayo', 'Nube', 'Sequía', 'Tornado', 'Trueno', 'Rocío'],
  'Escuela': ['Cuaderno', 'Lápiz', 'Mochila', 'Pizarra', 'Libro', 'Regla', 'Borrador', 'Examen', 'Tarea', 'Recreo', 'Uniforme', 'Profesor', 'Calculadora', 'Tijeras', 'Pupitre'],
  'Cuerpo humano': ['Corazón', 'Cerebro', 'Pulmón', 'Rodilla', 'Codo', 'Oreja', 'Nariz', 'Dedo', 'Hombro', 'Estómago', 'Columna', 'Tobillo', 'Muñeca', 'Cabello', 'Ojo'],
  'Videojuegos': ['Minecraft', 'Fortnite', 'Mario', 'Zelda', 'Pac-Man', 'Tetris', 'Pokémon', 'Sonic', 'FIFA', 'Roblox', 'Among Us', 'Free Fire', 'Valorant', 'Counter-Strike', 'League of Legends'],
  'Tecnología': ['Celular', 'Computadora', 'Teclado', 'Internet', 'Robot', 'Cámara', 'Auriculares', 'Batería', 'Wifi', 'Impresora', 'Satélite', 'Drone', 'Tablet', 'Pantalla', 'Ratón'],
  'Lugares': ['Hospital', 'Escuela', 'Aeropuerto', 'Biblioteca', 'Cine', 'Supermercado', 'Parque', 'Iglesia', 'Estadio', 'Banco', 'Museo', 'Gasolinera', 'Zoológico', 'Panadería', 'Farmacia', 'Cárcel'],
  'Insectos y bichos': ['Mariposa', 'Abeja', 'Hormiga', 'Mosca', 'Mosquito', 'Araña', 'Cucaracha', 'Libélula', 'Grillo', 'Escarabajo', 'Luciérnaga', 'Avispa', 'Saltamontes', 'Oruga', 'Polilla'],
  'Fantasía y terror': ['Dragón', 'Vampiro', 'Fantasma', 'Hada', 'Zombi', 'Sirena', 'Unicornio', 'Duende', 'Bruja', 'Hombre lobo', 'Gigante', 'Mago', 'Esqueleto', 'Fénix', 'Momia'],
  'Celebraciones': ['Navidad', 'Halloween', 'Cumpleaños', 'Carnaval', 'Boda', 'Año Nuevo', 'Pascua', 'Día de Muertos', 'Graduación', 'San Valentín', 'Piñata', 'Fuegos artificiales'],
  'Juguetes y juegos': ['Pelota', 'Muñeca', 'Rompecabezas', 'Yoyó', 'Trompo', 'Ajedrez', 'Dominó', 'Cometa', 'Lego', 'Carrito', 'Escondite', 'Naipes', 'Monopoly', 'Bloques']
};

export const THEME_NAMES = Object.keys(THEMES);
