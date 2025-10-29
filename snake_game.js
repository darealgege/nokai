/**
 * Nokia Snake Game
 * Classic Snake game with retro Nokia design
 */

class SnakeGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        
        this.active = false;
        this.paused = false;
        this.gameOver = false;
        
        // Grid settings
        this.gridSize = 8;
        this.tileCountX = 0;
        this.tileCountY = 0;
        
        // Game state
        this.snake = [];
        this.food = { x: 0, y: 0 };
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.speed = 150; // milliseconds per frame
        this.gameLoopInterval = null;
        
        // Pause menu
        this.pauseMenuIndex = 0;
        this.pauseMenuItems = ['Resume Game', 'View Scores', 'Quit Game'];
        
        // Game Over menu
        this.gameOverMenuIndex = 0;
        this.gameOverMenuItems = ['New Game', 'View Scores', 'Quit Game'];
        
        // Scores view
        this.viewingScores = false;
        this.topScores = [];
        
        // Original handlers backup
        this.originalHandlers = {};
        
        // Load scores
        this.loadScores();
    }
    
    activate() {
        if (this.active) return;
        
        console.log('🐍 Snake Game Activated!');
        this.active = true;
        this.gameOver = false;
        this.paused = false;
        
        this.createUI();
        this.setupControls();
        this.initGame();
        
        this.gameLoopInterval = setInterval(() => this.gameLoop(), this.speed);
    }
    
    deactivate() {
        if (!this.active) return;
        
        console.log('🐍 Snake Game Deactivated!');
        this.active = false;
        this.paused = false;
        
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
        
        // Hide home screen and other content
        const homeScreen = document.getElementById('homeScreen');
        if (homeScreen) homeScreen.classList.add('hidden');
        
        this.container = document.createElement('div');
        this.container.id = 'snake-game-container';
        this.container.className = 'snake-game-container';
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'snake-canvas';
        
        // Calculate dimensions (full screen minus status bar)
        const containerWidth = screen.clientWidth;
        const containerHeight = screen.clientHeight - 21; // status bar height
        
        this.tileCountX = Math.floor(containerWidth / this.gridSize);
        this.tileCountY = Math.floor(containerHeight / this.gridSize);
        
        this.canvas.width = this.tileCountX * this.gridSize;
        this.canvas.height = this.tileCountY * this.gridSize;
        
        this.ctx = this.canvas.getContext('2d');
        
        this.container.appendChild(this.canvas);
        screen.appendChild(this.container);
        
        console.log(`🐍 Canvas created: ${this.tileCountX}x${this.tileCountY} tiles`);
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
        window.handleNavLeft = () => this.handleInput('left');
        window.handleNavRight = () => this.handleInput('right');
        window.handleOK = () => this.handleInput('ok');
        window.handleMenu = () => this.handleInput('menu');
        
        // Disable DTMF for other keys during game
        window.handleKey = () => {};
        window.handleCallStart = () => {};
        window.handleCallEnd = () => {};
        
        console.log('🐍 Controls setup complete');
    }
    
    restoreControls() {
        // Restore original handlers
        Object.assign(window, this.originalHandlers);
        this.originalHandlers = {};
        console.log('🐍 Controls restored');
    }
    
    handleInput(action) {
        // ✅ Scores nézet kezelése
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
        
        // ✅ Game Over menü kezelése
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
                        // New Game
                        this.startNewGame();
                    } else if (this.gameOverMenuIndex === 1) {
                        // View Scores
                        this.viewingScores = true;
                        this.draw();
                    } else {
                        // Quit
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
                        // Resume
                        this.togglePause();
                    } else if (this.pauseMenuIndex === 1) {
                        // View Scores
                        this.viewingScores = true;
                        this.draw();
                    } else {
                        // Quit
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
                    if (this.direction !== 'down') {
                        this.nextDirection = 'up';
                    }
                    break;
                case 'down':
                    if (this.direction !== 'up') {
                        this.nextDirection = 'down';
                    }
                    break;
                case 'left':
                    if (this.direction !== 'right') {
                        this.nextDirection = 'left';
                    }
                    break;
                case 'right':
                    if (this.direction !== 'left') {
                        this.nextDirection = 'right';
                    }
                    break;
                case 'menu':
                    playDTMF('5');
                    this.togglePause();
                    break;
            }
        }
    }
    
    initGame() {
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        
        // Start snake in the middle
        const centerX = Math.floor(this.tileCountX / 2);
        const centerY = Math.floor(this.tileCountY / 2);
        
        this.snake = [
            { x: centerX, y: centerY },
            { x: centerX - 1, y: centerY },
            { x: centerX - 2, y: centerY }
        ];
        
        this.placeFood();
        this.draw();
        
        console.log('🐍 Game initialized');
    }
    
    // ✅ Új függvény: Új játék indítása (bug fix!)
    startNewGame() {
        // ✅ KRITIKUS: Leállítjuk a régi interval-t!
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
        
        this.gameOver = false;
        this.paused = false;
        this.viewingScores = false;
        this.initGame();
        
        // Új interval indítása
        this.gameLoopInterval = setInterval(() => this.gameLoop(), this.speed);
        console.log('🐍 New game started');
    }
    
    placeFood() {
        let foodX, foodY, onSnake;
        
        do {
            onSnake = false;
            foodX = Math.floor(Math.random() * this.tileCountX);
            foodY = Math.floor(Math.random() * this.tileCountY);
            
            // Check if food is on snake
            for (const segment of this.snake) {
                if (segment.x === foodX && segment.y === foodY) {
                    onSnake = true;
                    break;
                }
            }
        } while (onSnake);
        
        this.food = { x: foodX, y: foodY };
    }
    
    gameLoop() {
        if (this.paused || !this.active || this.gameOver) return;
        
        // Update direction
        this.direction = this.nextDirection;
        
        // Calculate new head position
        const head = { ...this.snake[0] };
        
        switch (this.direction) {
            case 'up':
                head.y--;
                break;
            case 'down':
                head.y++;
                break;
            case 'left':
                head.x--;
                break;
            case 'right':
                head.x++;
                break;
        }
        
        // Check wall collision
        if (head.x < 0 || head.x >= this.tileCountX || 
            head.y < 0 || head.y >= this.tileCountY) {
            this.handleGameOver();
            return;
        }
        
        // Check self collision
        for (const segment of this.snake) {
            if (segment.x === head.x && segment.y === head.y) {
                this.handleGameOver();
                return;
            }
        }
        
        // Add new head
        this.snake.unshift(head);
        
        // Check food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.placeFood();
            // Don't remove tail (snake grows)
        } else {
            // Remove tail (snake moves)
            this.snake.pop();
        }
        
        this.draw();
    }
    
    draw() {
        if (!this.ctx) return;
        
        // Clear canvas with background color
        this.ctx.fillStyle = '#9db891';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw snake
        this.ctx.fillStyle = '#1a3a1a';
        for (let i = 0; i < this.snake.length; i++) {
            const segment = this.snake[i];
            const size = i === 0 ? this.gridSize : this.gridSize - 1;
            this.ctx.fillRect(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                size,
                size
            );
        }
        
        // Draw food
        this.ctx.fillStyle = '#3a5a3a';
        this.ctx.fillRect(
            this.food.x * this.gridSize,
            this.food.y * this.gridSize,
            this.gridSize - 1,
            this.gridSize - 1
        );
        
        // Draw score
        this.ctx.fillStyle = '#1a3a1a';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 4, 12);
        
        // ✅ Draw top score
        if (this.topScores.length > 0) {
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`Top: ${this.topScores[0].score}`, this.canvas.width - 4, 12);
        }
        
        // ✅ Draw scores view if active
        if (this.viewingScores) {
            this.drawScores();
        }
        // Draw pause menu if paused
        else if (this.paused) {
            this.drawPauseMenu();
        }
        // Draw game over if game over
        else if (this.gameOver) {
            this.drawGameOver();
        }
    }
    
    togglePause() {
        //playDTMF('5');
        this.paused = !this.paused;
        this.pauseMenuIndex = 0;
        this.draw();
        console.log(`🐍 Game ${this.paused ? 'paused' : 'resumed'}`);
    }
    
    drawPauseMenu() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(26, 58, 26, 0.85)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.fillStyle = '#9db891';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        // Menu items
        this.ctx.font = '12px sans-serif';
        this.pauseMenuItems.forEach((item, index) => {
            const y = this.canvas.height / 2 - 10 + index * 20;
            
            if (index === this.pauseMenuIndex) {
                // Selected item
                this.ctx.fillStyle = '#9db891';
                this.ctx.fillRect(
                    this.canvas.width / 2 - 50,
                    y - 12,
                    100,
                    16
                );
                this.ctx.fillStyle = '#1a3a1a';
            } else {
                this.ctx.fillStyle = '#9db891';
            }
            
            this.ctx.fillText(item, this.canvas.width / 2, y);
        });
    }
    
    handleGameOver() {
        this.gameOver = true;
        this.gameOverMenuIndex = 0; // ✅ Reset menu index
        
        // ✅ Mentés a score-nak
        this.saveScore(this.score);
        
        this.draw();
        console.log(`🐍 Game Over! Final score: ${this.score}`);
    }
    
    // ✅ Score kezelés
    loadScores() {
        try {
            const saved = localStorage.getItem('snake_top_scores');
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
        if (score === 0) return; // Ne mentsük a 0 pontot
        
        const now = new Date();
        const dateStr = now.toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Hozzáadjuk az új score-t
        this.topScores.push({
            score: score,
            date: dateStr
        });
        
        // Rendezés csökkenő sorrendben
        this.topScores.sort((a, b) => b.score - a.score);
        
        // Csak a top 10-et tartjuk meg
        this.topScores = this.topScores.slice(0, 10);
        
        // Mentés localStorage-ba
        try {
            localStorage.setItem('snake_top_scores', JSON.stringify(this.topScores));
            console.log('🏆 Score saved:', score);
        } catch (e) {
            console.error('Failed to save score:', e);
        }
    }
    
    drawGameOver() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(26, 58, 26, 0.85)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.fillStyle = '#9db891';
        this.ctx.font = 'bold 18px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        // Score
        this.ctx.font = '14px sans-serif';
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 - 10);
        
        // ✅ Menu items
        this.ctx.font = '12px sans-serif';
        this.gameOverMenuItems.forEach((item, index) => {
            const y = this.canvas.height / 2 + 20 + index * 20;
            
            if (index === this.gameOverMenuIndex) {
                // Selected item
                this.ctx.fillStyle = '#9db891';
                this.ctx.fillRect(
                    this.canvas.width / 2 - 50,
                    y - 12,
                    100,
                    16
                );
                this.ctx.fillStyle = '#1a3a1a';
            } else {
                this.ctx.fillStyle = '#9db891';
            }
            
            this.ctx.fillText(item, this.canvas.width / 2, y);
        });
    }
    
    // ✅ Top Scores megjelenitése
    drawScores() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(26, 58, 26, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.fillStyle = '#9db891';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('TOP 10 SCORES', this.canvas.width / 2, 20);
        
        // Scores list
        this.ctx.font = '8px sans-serif';
        this.ctx.textAlign = 'left';
        
        if (this.topScores.length === 0) {
            this.ctx.fillText('No scores yet!', this.canvas.width / 2 - 30, 40);
        } else {
            let y = 38;
            this.topScores.forEach((entry, index) => {
                const rank = `${index + 1}.`;
                const score = `${entry.score} pts`;
                const date = entry.date;
                
                // Rank
                this.ctx.textAlign = 'left';
                this.ctx.fillText(rank, 8, y);
                
                // Score
                this.ctx.textAlign = 'left';
                this.ctx.fillText(score, 22, y);
                
                // Date
                this.ctx.textAlign = 'right';
                this.ctx.fillText(date, this.canvas.width - 8, y);
                
                y += 12;
            });
        }
        
        // Hint
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('OK or Menu to close', this.canvas.width / 2, this.canvas.height - 10);
    }
    
    isActive() {
        return this.active;
    }
}

// Create global instance
window.snakeGame = new SnakeGame();
console.log('🐍 Snake Game module loaded');
