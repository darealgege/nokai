/**
 * Super Steve - Level Generator
 * Generates platforms, coins, enemies, and obstacles
 */

class SuperSteveLevelGenerator {
    constructor() {
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
        
        console.log('🏗️ SuperSteveLevelGenerator initialized');
    }
    
    generateLevel(levelNum, canvasHeight) {
        const level = {
            platforms: [],
            coins: [],
            enemies: [],
            obstacles: []
        };
        
        const difficulty = Math.min(levelNum, 5); // Max 5 difficulty
        const levelWidth = 1500 + (levelNum * 300);
        
        // Ground platform
        level.platforms.push({ 
            x: 0, 
            y: canvasHeight - 30, 
            width: levelWidth, 
            height: 30, 
            color: '#2d5016' 
        });
        
        // Generate floating platforms
        let currentX = 200;
        let lastY = canvasHeight - 100;
        
        while (currentX < levelWidth - 300) {
            const platformWidth = 80 + Math.random() * 100;
            const gapSize = 100 + Math.random() * 120;
            const yChange = (Math.random() - 0.5) * 100;
            let newY = lastY + yChange;
            
            // Y position limits
            newY = Math.max(canvasHeight - 200, Math.min(canvasHeight - 60, newY));
            
            level.platforms.push({
                x: currentX,
                y: newY,
                width: platformWidth,
                height: 15,
                color: '#8B4513'
            });
            
            // Add coin above platform
            if (Math.random() > 0.3) {
                level.coins.push({
                    x: currentX + platformWidth / 2,
                    y: newY - 30,
                    radius: 10,
                    collected: false
                });
            }
            
            // Add enemy on platform
            if (Math.random() > 0.6 - (difficulty * 0.05)) {
                const enemyType = this.enemyTypes[Math.floor(Math.random() * this.enemyTypes.length)];
                level.enemies.push({
                    x: currentX + 30,
                    y: newY - 30,
                    width: 25,
                    height: 25,
                    velocityX: enemyType.speed * (Math.random() > 0.5 ? 1 : -1),
                    type: enemyType,
                    platformX: currentX,
                    platformWidth: platformWidth,
                    alive: true,
                    squashed: false,
                    squashTime: 0
                });
            }
            
            // Add obstacle on platform
            if (Math.random() > 0.7 - (difficulty * 0.03)) {
                const obstacleType = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
                level.obstacles.push({
                    x: currentX + platformWidth / 2 + (Math.random() - 0.5) * 50,
                    y: newY - 25,
                    width: 20,
                    height: 20,
                    type: obstacleType
                });
            }
            
            currentX += platformWidth + gapSize;
            lastY = newY;
        }
        
        // Goal platform at the end
        level.platforms.push({
            x: levelWidth - 200,
            y: canvasHeight - 100,
            width: 150,
            height: 15,
            color: '#FFD700',
            isGoal: true
        });
        
        // Goal star
        level.coins.push({
            x: levelWidth - 125,
            y: canvasHeight - 150,
            radius: 15,
            collected: false,
            isGoal: true
        });
        
        level.width = levelWidth;
        
        console.log(`🏗️ Generated level ${levelNum}: ${levelWidth}px wide, ${level.platforms.length} platforms`);
        
        return level;
    }
}

// Export for use in main game
window.SuperSteveLevelGenerator = SuperSteveLevelGenerator;
console.log('🏗️ SuperSteveLevelGenerator module loaded');
