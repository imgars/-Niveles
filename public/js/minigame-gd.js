class GeometryDashGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    
    this.gameState = 'menu'; // menu, playing, gameover
    this.score = 0;
    this.gameSpeed = 8;
    this.speedIncrement = 0.002;
    
    this.player = {
      x: 100,
      y: this.height - 100,
      width: 30,
      height: 30,
      velocityY: 0,
      jumping: false,
      grounded: false
    };
    
    this.obstacles = [];
    this.particles = [];
    this.gravity = 0.6;
    this.jumpPower = -15;
    this.groundY = this.height - 50;
    
    this.obstacleSpawnRate = 0;
    this.obstacleSpawnThreshold = 120;
    
    this.setupEventListeners();
    this.animate();
  }
  
  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleJump();
      }
    });
    
    this.canvas.addEventListener('click', () => {
      this.handleJump();
    });
    
    this.canvas.addEventListener('touchstart', () => {
      this.handleJump();
    });
  }
  
  handleJump() {
    if (this.gameState === 'menu') {
      this.startGame();
    } else if (this.gameState === 'playing' && this.player.grounded) {
      this.player.velocityY = this.jumpPower;
      this.player.grounded = false;
    } else if (this.gameState === 'gameover') {
      this.reset();
    }
  }
  
  startGame() {
    this.gameState = 'playing';
    this.score = 0;
    this.gameSpeed = 8;
    this.obstacles = [];
  }
  
  reset() {
    this.gameState = 'menu';
    this.score = 0;
    this.gameSpeed = 8;
    this.obstacles = [];
    this.player.y = this.height - 100;
    this.player.velocityY = 0;
    this.player.grounded = false;
  }
  
  update() {
    if (this.gameState !== 'playing') return;
    
    // Gravedad
    this.player.velocityY += this.gravity;
    this.player.y += this.player.velocityY;
    
    // Colisión con el suelo
    if (this.player.y + this.player.height >= this.groundY) {
      this.player.y = this.groundY - this.player.height;
      this.player.velocityY = 0;
      this.player.grounded = true;
    } else {
      this.player.grounded = false;
    }
    
    // Aumentar velocidad gradualmente
    this.gameSpeed += this.speedIncrement;
    
    // Generar obstáculos
    this.obstacleSpawnRate++;
    if (this.obstacleSpawnRate > this.obstacleSpawnThreshold) {
      this.spawnObstacle();
      this.obstacleSpawnRate = 0;
      this.obstacleSpawnThreshold = Math.max(80, 120 - this.score * 0.1);
    }
    
    // Actualizar obstáculos
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.gameSpeed;
      
      // Colisión
      if (this.checkCollision(this.player, obs)) {
        this.gameState = 'gameover';
        this.createExplosion();
      }
      
      // Eliminar obstáculos fuera de pantalla
      if (obs.x + obs.width < 0) {
        this.obstacles.splice(i, 1);
        this.score += 10;
      }
    }
    
    // Actualizar partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.life--;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  spawnObstacle() {
    const types = ['spike', 'spike', 'cube'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let obs;
    if (type === 'spike') {
      obs = {
        x: this.width,
        y: this.groundY - 35,
        width: 25,
        height: 35,
        type: 'spike'
      };
    } else {
      obs = {
        x: this.width,
        y: this.groundY - 40,
        width: 30,
        height: 30,
        type: 'cube'
      };
    }
    
    this.obstacles.push(obs);
  }
  
  checkCollision(player, obs) {
    return player.x < obs.x + obs.width &&
           player.x + player.width > obs.x &&
           player.y < obs.y + obs.height &&
           player.y + player.height > obs.y;
  }
  
  createExplosion() {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.particles.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        life: 20,
        color: ['#FF10F0', '#00FFFF', '#39FF14'][Math.floor(Math.random() * 3)]
      });
    }
  }
  
  draw() {
    // Fondo con gradiente
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a1e3e');
    gradient.addColorStop(1, '#1a0a2e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Línea del suelo
    this.ctx.fillStyle = '#39FF14';
    this.ctx.fillRect(0, this.groundY, this.width, 5);
    
    // Dibujar partículas
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life / 20;
      this.ctx.fillRect(p.x, p.y, 4, 4);
      this.ctx.globalAlpha = 1;
    }
    
    // Dibujar jugador (cuadrado de Geometry Dash)
    if (this.gameState === 'menu') {
      this.ctx.fillStyle = '#FF10F0';
    } else if (this.gameState === 'gameover') {
      this.ctx.fillStyle = '#FF0000';
    } else {
      this.ctx.fillStyle = '#00FFFF';
    }
    
    this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
    
    // Borde del jugador
    this.ctx.strokeStyle = '#39FF14';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.player.x, this.player.y, this.player.width, this.player.height);
    
    // Dibujar obstáculos
    for (const obs of this.obstacles) {
      if (obs.type === 'spike') {
        this.ctx.fillStyle = '#FF0000';
        // Triángulo
        this.ctx.beginPath();
        this.ctx.moveTo(obs.x + obs.width / 2, obs.y);
        this.ctx.lineTo(obs.x, obs.y + obs.height);
        this.ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      }
    }
    
    // UI
    this.ctx.fillStyle = '#39FF14';
    this.ctx.font = 'bold 20px Press Start 2P';
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);
    this.ctx.fillText(`SPEED: ${(this.gameSpeed).toFixed(1)}`, 20, 70);
    
    // Menú
    if (this.gameState === 'menu') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      this.ctx.fillStyle = '#00FFFF';
      this.ctx.font = 'bold 32px Press Start 2P';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GEOMETRY DASH', this.width / 2, 100);
      
      this.ctx.fillStyle = '#39FF14';
      this.ctx.font = 'bold 16px Press Start 2P';
      this.ctx.fillText('Click para Jugar', this.width / 2, 200);
      this.ctx.fillText('Espacio para Saltar', this.width / 2, 240);
      
      this.ctx.textAlign = 'left';
    }
    
    // Game Over
    if (this.gameState === 'gameover') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      this.ctx.fillStyle = '#FF0000';
      this.ctx.font = 'bold 32px Press Start 2P';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', this.width / 2, 100);
      
      this.ctx.fillStyle = '#39FF14';
      this.ctx.font = 'bold 16px Press Start 2P';
      this.ctx.fillText(`SCORE: ${this.score}`, this.width / 2, 160);
      this.ctx.fillText('Click para Reintentar', this.width / 2, 240);
      
      this.ctx.textAlign = 'left';
    }
  }
  
  animate() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

// Inicializar cuando el documento cargue
document.addEventListener('DOMContentLoaded', () => {
  const gameCanvas = document.getElementById('geometry-dash-game');
  if (gameCanvas) {
    new GeometryDashGame(gameCanvas);
  }
});
