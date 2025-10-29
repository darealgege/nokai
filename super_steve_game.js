/**
 * Nokia Super Steve Game
 * Platform game with retro Nokia design
 * FIXED: Properly uses sprite manager for 2x2 stand animation and 1x2 walk animation
 */

class SuperSteveGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        
        this.active = false;
        this.paused = false;
        this.gameOver = false;
        
        // Camera
        this.camera = {
            x: 0,
            y: 0
        };
        
        // Controls state
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false  // ✨ DOWN key for metro
        };
        
        // Game state
        this.gameState = {
            level: 1,
            score: 0,
            platforms: [],
            coins: [],
            enemies: [],
            obstacles: [],
            particles: [],
            levelWidth: 0,
            levelComplete: false
        };
        
        // Enemy types
        this.enemyTypes = [
            { emoji: '👾', speed: 1.5, color: '#1a3a1a' },
            { emoji: '👻', speed: 1.2, color: '#2a4a2a' },
            { emoji: '🦇', speed: 2, color: '#3a5a3a' },            
            { emoji: '🐍', speed: 1.8, color: '#4a6a4a' },
            { emoji: '🐉', speed: 1.6, color: '#5a7a5a' },
            { emoji: '🦕', speed: 1.0, color: '#6a8a6a' },
            { emoji: '🐸', speed: 1.2, color: '#7a9a7a' },
            { emoji: '🐙', speed: 1.4, color: '#253b25ff' },
            { emoji: '🐊', speed: 1.6, color: '#54a854ff' },
            { emoji: '👾', speed: 1.5, color: '#597a59ff' },
            { emoji: '👽', speed: 1.2, color: '#61ab61ff' },  
            { emoji: '💀', speed: 1.2, color: '#63bb63ff' },         
            { emoji: '🦖', speed: 1.4, color: '#389938ff' }
        ];
        
        // Obstacle types
        this.obstacleTypes = [        
            { emoji: '🔥', deadly: true },
            { emoji: '💣', deadly: true },
            { emoji: '💥', deadly: true },            
            { emoji: '💩', deadly: true },                    
            { emoji: '🌵', deadly: true },
            { emoji: '💎', deadly: false, bonus: true },
            { emoji: '🎁', deadly: false, bonus: true },
            { emoji: '🏆', deadly: false, bonus: true }    
        ];
        
        // Pause menu
        this.pauseMenuIndex = 0;
        this.pauseMenuItems = ['Resume Game', 'Music Off', 'View Scores', 'Quit Game'];
        
        // Game Over menu
        this.gameOverMenuIndex = 0;
        this.gameOverMenuItems = ['New Game', 'View Scores', 'Quit Game'];
        
        // Scores view
        this.viewingScores = false;
        this.topScores = [];
        
        // Original handlers backup
        this.originalHandlers = {};
        
        // Game loop
        this.gameLoopInterval = null;
        
        // Event handlers for D-pad
        this.eventHandlers = {
            pressLeft: () => this.handleInput('left'),
            pressRight: () => this.handleInput('right'),
            releaseLeft: () => this.releaseKey('left'),
            releaseRight: () => this.releaseKey('right')
        };        
        
        // Sprite manager, player, level generator, renderer - will be initialized after canvas creation
        this.spriteManager = null;
        this.player = null;
        this.levelGenerator = null;
        this.renderer = null;
        
        // 🎵 Audio system
        this.audio = new SuperSteveAudio();
        
        // ✨ Metro system
        this.metroSystem = null;
        
        // Load scores
        this.loadScores();
        
        console.log('🎮 Super Steve Game initialized with METRO SYSTEM!');
    }
    
    activate() {
        if (this.active) return;
        
        console.log('🎮 Super Steve Game Activated!');
        this.active = true;
        this.gameOver = false;
        this.paused = false;
        
        // 🎵 Initialize and start audio
        this.audio.init();
        this.audio.startBackgroundMusic();
        
        // ✨ JAVÍTÁS: Játékállapot nullázása minden aktiváláskor ✨
        // Ez biztosítja, hogy minden új játék tiszta lappal induljon.
        this.gameState.score = 0;
        this.gameState.level = 1;
        
        // Ha a játékos objektum már létezik egy előző menetből, az életeit is visszaállítjuk.
        if (this.player) {
            this.player.lives = 3;
        }
        
        this.createUI();
            
        // 1. Sprite Manager inicializálása
        this.spriteManager = new SuperSteveSprites();
        
        // 2. Várjuk meg a sprite-ok betöltését
        this.waitForSpritesAndInit();
    }

    waitForSpritesAndInit() {
        // Várakozási ciklus
        const checkInterval = setInterval(() => {
            if (this.spriteManager && this.spriteManager.allLoaded) {
                clearInterval(checkInterval);
                
                console.log('✅ Sprites loaded, initializing modules...');
                
                // 2. Player inicializálása a dinamikus méretekkel
                this.player = new SuperStevePlayer(this.canvas);
                const recommendedSize = this.spriteManager.getRecommendedPlayerSize();
                this.player.width = recommendedSize.width;
                this.player.height = recommendedSize.height;
                console.log(`   Player hitbox: ${this.player.width}x${this.player.height}`);

                // 3. A többi modul inicializálása
                this.levelGenerator = new SuperSteveLevelGenerator();
                this.renderer = new SuperSteveRenderer(this.canvas, this.ctx);
                
                // ✨ 4. Metro system inicializálása
                this.metroSystem = new MetroSystemIntegration(this);
                console.log('   Metro system initialized!');
                
                this.setupControls();
                this.initGame();
                
                // 4. Játékciklus indítása
                this.gameLoopInterval = setInterval(() => this.gameLoop(), 1000 / 60);
            }
        }, 100); // 100ms-enként ellenőrizzük
    }
    
    deactivate() {
        if (!this.active) return;
        
        console.log('🎮 Super Steve Game Deactivated!');
        this.active = false;
        this.paused = false;
        
        // 🎵 Stop audio
        this.audio.stopBackgroundMusic();
        
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
        
        this.restoreControls();
        this.removeUI();
        
        // Return to Games menu
        if (window.appManager) {
            setTimeout(() => window.appManager.showGamesMenu(), 100);
        }
    }
    
    createUI() {
        const screen = document.querySelector('.screen');
        if (!screen) {
            console.error('Screen not found!');
            return;
        }
        
        // Hide home screen
        const homeScreen = document.getElementById('homeScreen');
        if (homeScreen) homeScreen.classList.add('hidden');
        
        this.container = document.createElement('div');
        this.container.id = 'super-steve-game-container';
        this.container.className = 'super-steve-game-container';
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'super-steve-canvas';
        
        // Calculate dimensions (full screen minus status bar)
        const containerWidth = screen.clientWidth;
        const containerHeight = screen.clientHeight - 20; // status bar height
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        this.ctx = this.canvas.getContext('2d');
        
        // ✨ JAVÍTÁS: Grayscale filter már canvas létrehozáskor
        //this.ctx.filter = 'grayscale(100%)';
        
        // Kezdeti tiszta képernyő grayscale-lel
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.container.appendChild(this.canvas);
        screen.appendChild(this.container);
        
        console.log(`🎮 Canvas created: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    removeUI() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.canvas = null;
        this.ctx = null;
    }
    
    setupControls() {
        // Backup original handlers
        this.originalHandlers = {
            handleNavUp: window.handleNavUp,
            handleNavDown: window.handleNavDown,
            handleNavLeft: window.handleNavLeft,
            handleNavRight: window.handleNavRight,
            handleOK: window.handleOK,
            handleMenu: window.handleMenu,
            handleKey: window.handleKey,
            handleCallStart: window.handleCallStart,
            handleCallEnd: window.handleCallEnd
        };
        
        // Override handlers
        window.handleNavUp = () => this.handleInput('up');
        window.handleNavDown = () => this.handleInput('down');
        window.handleOK = () => this.handleInput('ok');
        window.handleMenu = () => this.handleInput('menu');
        
        // Disable DTMF for other keys during game
        window.handleKey = () => {};
        window.handleCallStart = () => {};
        window.handleCallEnd = () => {};
        
        // Setup D-pad release handlers
        this.setupDpadRelease();
        
        console.log('🎮 Controls setup complete');
    }
    
    setupDpadRelease() {
        const dpadLeft = document.querySelector('.dpad-left');
        const dpadRight = document.querySelector('.dpad-right');
        
        if (dpadLeft) {
            dpadLeft.addEventListener('mousedown', this.eventHandlers.pressLeft);
            dpadLeft.addEventListener('touchstart', this.eventHandlers.pressLeft);
            dpadLeft.addEventListener('mouseup', this.eventHandlers.releaseLeft);
            dpadLeft.addEventListener('touchend', this.eventHandlers.releaseLeft);
            dpadLeft.addEventListener('mouseleave', this.eventHandlers.releaseLeft);
        }
        if (dpadRight) {
            dpadRight.addEventListener('mousedown', this.eventHandlers.pressRight);
            dpadRight.addEventListener('touchstart', this.eventHandlers.pressRight);
            dpadRight.addEventListener('mouseup', this.eventHandlers.releaseRight);
            dpadRight.addEventListener('touchend', this.eventHandlers.releaseRight);
            dpadRight.addEventListener('mouseleave', this.eventHandlers.releaseRight);
        }
        
        this.dpadButtons = { dpadLeft, dpadRight };
    }
    
    restoreControls() {
        // Restore original handlers
        Object.assign(window, this.originalHandlers);
        this.originalHandlers = {};
        
        // Remove D-pad release handlers
        if (this.dpadButtons) {
            const { dpadLeft, dpadRight } = this.dpadButtons;
            if (dpadLeft) {
                dpadLeft.removeEventListener('mousedown', this.eventHandlers.pressLeft);
                dpadLeft.removeEventListener('touchstart', this.eventHandlers.pressLeft);
                dpadLeft.removeEventListener('mouseup', this.eventHandlers.releaseLeft);
                dpadLeft.removeEventListener('touchend', this.eventHandlers.releaseLeft);
                dpadLeft.removeEventListener('mouseleave', this.eventHandlers.releaseLeft);
            }
            if (dpadRight) {
                dpadRight.removeEventListener('mousedown', this.eventHandlers.pressRight);
                dpadRight.removeEventListener('touchstart', this.eventHandlers.pressRight);
                dpadRight.removeEventListener('mouseup', this.eventHandlers.releaseRight);
                dpadRight.removeEventListener('touchend', this.eventHandlers.releaseRight);
                dpadRight.removeEventListener('mouseleave', this.eventHandlers.releaseRight);
            }
            this.dpadButtons = null;
        }
        
        console.log('🎮 Controls restored');
    }
    
    handleInput(action) {
        // Scores view handling
        if (this.viewingScores) {
            if (action === 'ok' || action === 'menu') {
                if (action === 'menu') {
                    playDTMF('5');
                }
                this.viewingScores = false;
                this.draw();
            }            
            return;
        }
        
        // Game Over menu handling
        if (this.gameOver) {
            switch (action) {
                case 'up':
                    this.gameOverMenuIndex = (this.gameOverMenuIndex - 1 + this.gameOverMenuItems.length) % this.gameOverMenuItems.length;
                    this.draw();
                    break;
                case 'down':
                    this.gameOverMenuIndex = (this.gameOverMenuIndex + 1) % this.gameOverMenuItems.length;
                    this.draw();
                    break;
                case 'menu':
                    playDTMF('5');                
                    break;                      
                case 'ok':
                    if (this.gameOverMenuIndex === 0) {
                        this.startNewGame();
                    } else if (this.gameOverMenuIndex === 1) {
                        this.viewingScores = true;
                        this.draw();
                    } else {
                        this.deactivate();
                    }
                    break;
            }
            return;
        }
        
        if (this.paused) {
            // Pause menu navigation
            switch (action) {
                case 'up':
                    this.pauseMenuIndex = (this.pauseMenuIndex - 1 + this.pauseMenuItems.length) % this.pauseMenuItems.length;
                    this.draw();
                    break;
                case 'down':
                    this.pauseMenuIndex = (this.pauseMenuIndex + 1) % this.pauseMenuItems.length;
                    this.draw();
                    break;
                case 'ok':
                    if (this.pauseMenuIndex === 0) {
                        this.togglePause();
                    } else if (this.pauseMenuIndex === 1) {
                        // 🎵 Music On/Off toggle (only music, not SFX!)
                        const isMusicMuted = this.audio.toggleMusicMute();
                        this.pauseMenuItems[1] = isMusicMuted ? 'Music On' : 'Music Off';
                        this.draw();
                    } else if (this.pauseMenuIndex === 2) {
                        this.viewingScores = true;
                        this.draw();
                    } else {
                        this.deactivate();
                    }
                    break;
                case 'menu':
                    playDTMF('5');
                    this.togglePause();
                    break;
            }
        } else {
            // Game controls
            switch (action) {
                case 'up':
                    this.keys.up = true;
                    setTimeout(() => this.keys.up = false, 100);
                    break;
                case 'down':
                    // ✨ METRO: Enter/Exit metro - ÚJ LOGIKA!
                    if (this.metroSystem) {
                        if (this.metroSystem.isInUnderground()) {
                            // Underground mode - próbáljunk kijönni
                            if (this.metroSystem.isNearAnyUndergroundPoint()) {
                                const exitPoint = this.metroSystem.getCurrentUndergroundPoint();
                                const surfaceData = this.metroSystem.exitMetro(this.player, exitPoint, this.renderer);
                                if (surfaceData) {
                                    this.gameState.platforms = surfaceData.platforms;
                                    this.gameState.coins = surfaceData.coins;
                                    this.gameState.enemies = surfaceData.enemies;
                                    this.gameState.obstacles = surfaceData.obstacles;
                                    this.gameState.levelWidth = Math.max(...this.gameState.platforms.map(p => p.x + p.width));
                                }
                            }
                        } else {
                            // Surface mode - próbáljunk lemenn
                            if (this.metroSystem.isNearAnySurfacePoint()) {
                                const entryPoint = this.metroSystem.getCurrentSurfacePoint();
                                const undergroundData = this.metroSystem.enterMetro(
                                    this.player,
                                    this.gameState.platforms,
                                    this.gameState.coins,
                                    this.gameState.enemies,
                                    this.gameState.obstacles,
                                    this.gameState.level,
                                    this.canvas.height,
                                    entryPoint  // ✨ Melyik ponton megyeink le!
                                );
                                if (undergroundData) {
                                    this.gameState.platforms = undergroundData.platforms;
                                    this.gameState.coins = undergroundData.coins;
                                    this.gameState.enemies = undergroundData.enemies;
                                    this.gameState.obstacles = undergroundData.obstacles;
                                    this.gameState.levelWidth = undergroundData.levelWidth;
                                }
                            }
                        }
                    }
                    break;
                case 'left':
                    this.keys.left = true;
                    break;
                case 'right':
                    this.keys.right = true;
                    break;
                case 'menu':
                    playDTMF('5');
                    this.togglePause();
                    break;
                case 'ok':
                    this.keys.up = true;
                    setTimeout(() => this.keys.up = false, 100);
                    break;
            }
        }
    }
    
    releaseKey(action) {
        if (action === 'left') {
            this.keys.left = false;
        } else if (action === 'right') {
            this.keys.right = false;
        }
    }
    
    initGame() {
        if (this.levelGenerator) {
            this.loadLevel(this.gameState.level);
            console.log('🎮 Game initialized');
        }
    }
    
    startNewGame() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }

        console.log('🎮 New game started');

        this.gameOver = false;
        this.paused = false;
        this.viewingScores = false;
        
        // 🎵 Restart music after game over
        if (!this.audio.muted) {
            this.audio.startBackgroundMusic();
        }
        
        // ✨ JAVÍTÁS: Állapotok teljes visszaállítása ✨
        this.gameState.level = 1;
        this.gameState.score = 0;

        // A játékos életeinek visszaállítása
        if (this.player) {
            this.player.lives = 3;
        }
        
        // ✨ ÚJ: Metro system reset + underground állapotok törlése!
        if (this.metroSystem) {
            this.metroSystem.isUnderground = false;
            this.metroSystem.undergroundScene = null;
            this.metroSystem.nearMetroEntrance = null;
            this.metroSystem.nearMetroExit = null;
            this.metroSystem.clearUndergroundStates(); // ✨ TÖRLI AZ ÖSSZES MENTETT UNDERGROUND ÁLLAPOTOT
            console.log('🚇 Metro system reset to surface');
        }

        // ✨ KULCSFONTOSSÁGÚ JAVÍTÁS: A pálya explicit újratöltése ✨
        // Ez biztosítja, hogy az érmék, ellenfelek és a játékos pozíciója is alaphelyzetbe kerüljön.
        this.loadLevel(this.gameState.level);

        // A játékciklus újraindítása
        this.gameLoopInterval = setInterval(() => this.gameLoop(), 1000 / 60);
    }
    
    loadLevel(levelNum) {
        if (!this.levelGenerator || !this.player) return;
        
        // ✨ ÚJ: Metro system reset surface-re + underground állapot törlése az új pályához!
        if (this.metroSystem) {
            this.metroSystem.isUnderground = false;
            this.metroSystem.undergroundScene = null;
            this.metroSystem.nearMetroEntrance = null;
            this.metroSystem.nearMetroExit = null;
            // ✨ CSAK AZ AKTUÁLIS PÁLYÁHOZ TARTOZÓ UNDERGROUND ÁLLAPOTOT TÖRÖLJÜK
            // (a többi pálya állapota megmarad, ha visszalépünk rájuk)
            if (this.metroSystem.undergroundStates && this.metroSystem.undergroundStates[levelNum]) {
                delete this.metroSystem.undergroundStates[levelNum];
                console.log('🗑️ Cleared underground state for level', levelNum);
            }
            console.log('🚇 Metro system reset - loading surface level', levelNum);
        }
        
        const levelData = this.levelGenerator.generateLevel(levelNum, this.canvas.height);
        this.gameState.platforms = levelData.platforms;
        this.gameState.coins = levelData.coins;
        this.gameState.enemies = levelData.enemies;
        this.gameState.obstacles = levelData.obstacles;
        this.gameState.particles = [];
        this.gameState.levelWidth = levelData.width;
        this.gameState.levelComplete = false;
        
        // ✨ ÚJ: Háttér téma beállítása a pályához
        if (this.renderer) {
            this.renderer.setBackgroundTheme(levelNum);
        }
        
        this.player.x = 50;
        this.player.y = this.canvas.height - 150;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        this.camera.x = 0;
        
        this.draw();
    }
    
    createParticles(x, y, color, emoji) {
        for (let i = 0; i < 10; i++) {
            this.gameState.particles.push({
                x: x,
                y: y,
                velocityX: (Math.random() - 0.5) * 6,
                velocityY: (Math.random() - 0.5) * 6 - 1,
                size: Math.random() * 5 + 3,
                color: color,
                life: 40,
                emoji: emoji
            });
        }
    }
    
    gameLoop() {
        if (this.paused || !this.active || this.gameOver || !this.player) return;
        
        this.update();
        this.draw();
    }
    
    update() {
        if (!this.player) return;
        
        // ✨ METRO: Update metro system
        if (this.metroSystem) {
            this.metroSystem.update(this.player, this.renderer);
        }
        
        // Horizontal movement
        if (this.keys.left) {
            this.player.moveLeft();
        } else if (this.keys.right) {
            this.player.moveRight();
        } else {
            this.player.stopHorizontal();
        }

        // Jump
        if (this.keys.up && !this.player.isJumping) {
            this.player.jump();
            this.audio.playJump(); // 🔊 Jump sound
        }

        // Update player
        this.player.update();

        // ✨ FIXED: Update animation using sprite manager
        if (this.spriteManager) {
            const animResult = this.spriteManager.updateAnimation(this.player);
            
            // 👟 Lépéshang lejátszása walk animáció frame váltásnál
            if (animResult && animResult.stepOccurred) {
                this.audio.playStep();
            }
        }

        // Platform collision
        const goalReached = this.player.checkPlatformCollision(this.gameState.platforms);
        if (goalReached) {
            this.gameState.levelComplete = true;
        }

        // Coin collection
        this.gameState.coins.forEach(coin => {
            if (!coin.collected) {
                const dx = (this.player.x + this.player.width / 2) - coin.x;
                const dy = (this.player.y + this.player.height / 2) - coin.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < coin.radius + this.player.width / 2) {
                    coin.collected = true;
                    this.gameState.score += coin.isGoal ? 100 : 10;
                    
                    this.createParticles(coin.x, coin.y, '#FFD700', '✨');
                    
                    if (coin.isGoal) {
                        this.audio.playLevelComplete(); // 🎵 Level complete jingle
                        setTimeout(() => {
                            this.gameState.level++;
                            this.loadLevel(this.gameState.level);
                        }, 500);
                    } else {
                        this.audio.playCoin(); // 🔊 Coin sound
                    }
                }
            }
        });

        // Enemy movement and collision
        this.gameState.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            if (enemy.squashed) {
                enemy.squashTime++;
                if (enemy.squashTime > 20) {
                    enemy.alive = false;
                }
                return;
            }
            
            enemy.x += enemy.velocityX;
            
            // Stay on platform
            if (enemy.x < enemy.platformX) {
                enemy.x = enemy.platformX;
                enemy.velocityX *= -1;
            }
            if (enemy.x > enemy.platformX + enemy.platformWidth - enemy.width) {
                enemy.x = enemy.platformX + enemy.platformWidth - enemy.width;
                enemy.velocityX *= -1;
            }
            
            // Collision with player
            if (!this.player.invincible &&
                this.player.x + this.player.width > enemy.x &&
                this.player.x < enemy.x + enemy.width &&
                this.player.y + this.player.height > enemy.y &&
                this.player.y < enemy.y + enemy.height) {
                
                // Jump on enemy from above
                if (this.player.velocityY > 0 && this.player.y + this.player.height - this.player.velocityY <= enemy.y + 10) {
                    enemy.squashed = true;
                    enemy.squashTime = 0;
                    this.player.bounceOffEnemy();
                    this.gameState.score += 50;
                    this.audio.playEnemyDefeat(); // 🔊 Enemy defeat sound
                    
                    this.createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.type.color, '💥');
                } else {
                    this.takeDamage();
                }
            }
        });

        // Obstacles
        this.gameState.obstacles.forEach(obstacle => {
            if (this.player.x + this.player.width > obstacle.x &&
                this.player.x < obstacle.x + obstacle.width &&
                this.player.y + this.player.height > obstacle.y &&
                this.player.y < obstacle.y + obstacle.height) {
                
                if (obstacle.type.deadly && !this.player.invincible) {
                    this.takeDamage();
                } else if (obstacle.type.bonus) {
                    // ✨ JAVÍTÁS: Mentsük el a pozíciót a részecskékhez, MIELŐTT eltüntetjük az akadályt
                    const particleX = obstacle.x + obstacle.width / 2;
                    const particleY = obstacle.y + obstacle.height / 2;

                    // Akadály eltüntetése
                    obstacle.x = -10000;
                    
                    // Pontszám növelése
                    this.gameState.score += 25;
                    this.audio.playBonus(); // 🔊 Bonus sound
                    
                    // Részecske-effekt létrehozása a helyes emojival
                    this.createParticles(particleX, particleY, '#00FFFF', obstacle.type.emoji);
                }
            }
        });

        // Update particles
        this.gameState.particles = this.gameState.particles.filter(particle => {
            particle.x += particle.velocityX;
            particle.y += particle.velocityY;
            particle.velocityY += 0.2;
            particle.life--;
            return particle.life > 0;
        });

        // Camera follow
        this.camera.x = this.player.x - this.canvas.width / 3;
        if (this.camera.x < 0) this.camera.x = 0;
        if (this.camera.x > this.gameState.levelWidth - this.canvas.width) {
            this.camera.x = this.gameState.levelWidth - this.canvas.width;
        }

        // Player falls
        if (this.player.y > this.canvas.height + 50) {
            this.takeDamage();
            this.player.respawn(this.canvas.height);
            this.camera.x = 0;
            
            // ✨ ÚJ: Ha underground pályán estunk le, reset surface-re
            if (this.metroSystem && this.metroSystem.isInUnderground()) {
                console.log('🚇 Fell off underground - returning to surface');
                const surfaceData = this.metroSystem.exitMetro(this.player);
                if (surfaceData) {
                    this.gameState.platforms = surfaceData.platforms;
                    this.gameState.coins = surfaceData.coins;
                    this.gameState.enemies = surfaceData.enemies;
                    this.gameState.obstacles = surfaceData.obstacles;
                }
            }
        }
    }
    
    takeDamage() {
        if (!this.player) return;
        
        const gameOver = this.player.takeDamage();
        
        this.createParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#FF0000', '💔');
        
        if (gameOver) {
            this.handleGameOver();
        } else {
            this.audio.playLifeLost(); // 🔊 Life lost sound
        }
    }
    
    draw() {
        if (!this.ctx || !this.renderer) return;
        
        // 1. Save clean state
        this.ctx.save();

        // 2. Ensure grayscale filter is active
        this.ctx.filter = 'grayscale(100%)';

        // 3. Draw background (metro or surface)
        if (this.metroSystem && this.metroSystem.isInUnderground()) {
            // ✨ Underground background
            this.metroSystem.drawUndergroundBackground(this.ctx, this.canvas, this.camera.x);
        } else {
            // Normal surface background
            this.renderer.drawBackground(this.camera.x);
        }

        // 4. SAVE grayscale state (important for metro drawing later!)
        this.ctx.save();
        this.ctx.translate(-this.camera.x, 0);

        // ✨ METRO: Draw entrances/exits BEFORE platforms (camera translate belül!)
        if (this.metroSystem && !this.metroSystem.isInUnderground()) {
            if (this.renderer && this.renderer.hasMetro) {
                const groundY = this.canvas.height - 30;
                
                this.renderer.metroEntrances.forEach(entrance => {
                    // Világ koordináták - camera automatikusan translate-eli!
                    this.renderer.drawMetroEntrance(entrance.x, groundY - entrance.height, entrance);
                });
                
                this.renderer.metroExits.forEach(exit => {
                    this.renderer.drawMetroExit(exit.x, groundY - exit.height, exit);
                });
            }
        }
         // ✨ JAVÍTÁS KEZDETE: Underground feljáratok kirajzolása ✨
        // Hozzáadunk egy 'else if' ágat, ami akkor fut le, ha a játékos az undergroundban van.
        else if (this.metroSystem && this.metroSystem.isInUnderground()) {
            const scene = this.metroSystem.undergroundScene;
            if (scene && this.renderer) {
                // Készítünk egy "ál" lejárat objektumot a renderelő függvény számára,
                // a jelenlegi underground pálya típusa alapján ('metro' vagy 'subway').
                const dummyExitObject = {
                    width: 50,
                    height: 40,
                    entranceType: scene.type
                };

                // Az underground pályán mindkét ponton "felfelé" lehet menni,
                // ezért a drawMetroExit funkciót használjuk mindkettőhöz.
                // A scene.entranceX és scene.exitX a pontok közepét jelöli,
                // ezért a rajzolási X koordinátát korrigáljuk a szélesség felével.
                // Az Y koordináta a talajszint (scene.groundY) felett van a feljárat magasságával.
                this.renderer.drawMetroExit(
                    scene.entranceX - dummyExitObject.width / 2,
                    scene.groundY - dummyExitObject.height,
                    dummyExitObject
                );

                this.renderer.drawMetroExit(
                    scene.exitX - dummyExitObject.width / 2,
                    scene.groundY - dummyExitObject.height,
                    dummyExitObject
                );
            }
        }
        // ✨ JAVÍTÁS VÉGE ✨

        // Draw game elements
        this.renderer.drawPlatforms(this.gameState.platforms);
        this.renderer.drawCoins(this.gameState.coins);
        this.renderer.drawObstacles(this.gameState.obstacles);
        this.renderer.drawEnemies(this.gameState.enemies);
        this.renderer.drawParticles(this.gameState.particles);

        // ✨ FIXED: Draw player using sprite manager
        if (this.spriteManager && this.player) {
            this.spriteManager.drawPlayer(this.ctx, this.player, this.camera.x);
        }

        // 5. Restore camera translate (back to grayscale state, no translate)
        this.ctx.restore();
        
        // 7. Draw HUD (still grayscale)
        const topScore = this.topScores.length > 0 ? this.topScores[0].score : 0;
        if (this.player) {
            this.renderer.drawHUD(this.gameState.score, this.gameState.level, this.player.lives, topScore);
        }
        
        // ✨ METRO: Draw interaction prompt (still grayscale)
        if (this.metroSystem) {
            this.metroSystem.drawInteractionPrompt(this.ctx, this.canvas, this.camera.x);
        }
        
        // 8. Restore grayscale filter (back to clean state)
        this.ctx.restore();

        // 8. Draw menus (colored)
        if (this.viewingScores) {
            this.renderer.drawScores(this.topScores);
        } else if (this.paused) {
            this.renderer.drawPauseMenu(this.pauseMenuItems, this.pauseMenuIndex);
        } else if (this.gameOver) {
            this.renderer.drawGameOver(this.gameState.score, this.gameOverMenuItems, this.gameOverMenuIndex);
        }
    }
    
    togglePause() {        
        this.paused = !this.paused;
        this.pauseMenuIndex = 0;
        
        // 🎵 Pause/Resume music
        if (this.paused) {
            this.audio.stopBackgroundMusic();
        } else {
            this.audio.startBackgroundMusic();
        }
        
        this.draw();
        console.log(`🎮 Game ${this.paused ? 'paused' : 'resumed'}`);
    }
    
    handleGameOver() {
        this.gameOver = true;
        this.gameOverMenuIndex = 0;
        
        this.audio.playGameOver(); // 🎵 Game over theme
        this.saveScore(this.gameState.score);
        
        this.draw();
        console.log(`🎮 Game Over! Final score: ${this.gameState.score}`);
    }
    
    loadScores() {
        try {
            const saved = localStorage.getItem('super_steve_top_scores');
            if (saved) {
                this.topScores = JSON.parse(saved);
            } else {
                this.topScores = [];
            }
        } catch (e) {
            console.error('Failed to load scores:', e);
            this.topScores = [];
        }
    }
    
    saveScore(score) {
        if (score === 0) return;
        
        const now = new Date();
        const dateStr = now.toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        this.topScores.push({
            score: score,
            date: dateStr
        });
        
        this.topScores.sort((a, b) => b.score - a.score);
        this.topScores = this.topScores.slice(0, 10);
        
        try {
            localStorage.setItem('super_steve_top_scores', JSON.stringify(this.topScores));
            console.log('🏆 Score saved:', score);
        } catch (e) {
            console.error('Failed to save score:', e);
        }
    }
    
    isActive() {
        return this.active;
    }
}

// Create global instance
window.superSteveGame = new SuperSteveGame();
console.log('🎮 Super Steve Game module loaded - FIXED version!');