/**
 * Super Steve - Player Logic
 * Handles player movement, physics, and collision
 * FIXED: Further optimized hitbox size to avoid transparent areas
 */

class SuperStevePlayer {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Player properties - FURTHER OPTIMIZED SIZE for precise hitbox
        this.x = 50;
        this.y = 300;
        this.width = 28;   // Further reduced from 32 -> 28 for tighter fit
        this.height = 38;  // Reduced from 40 -> 38 for better collision
        
        // Physics
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 4;
        this.jumpPower = 12;
        this.gravity = 0.5;
        this.isJumping = false;
        
        // State
        this.direction = 1; // 1 = right, -1 = left
        this.lives = 3;
        this.invincible = false;
        this.invincibleTime = 0;
        
        console.log('👤 SuperStevePlayer initialized');
        console.log(`   Hitbox: ${this.width}x${this.height} (further optimized)`);
    }
    
    reset(canvasHeight) {
        this.x = 50;
        this.y = canvasHeight - 150;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.direction = 1;
    }
    
    respawn(canvasHeight) {
        this.x = 50;
        this.y = canvasHeight - 150;
        this.velocityY = 0;
    }
    
    moveLeft() {
        this.velocityX = -this.speed;
        this.direction = -1;
    }
    
    moveRight() {
        this.velocityX = this.speed;
        this.direction = 1;
    }
    
    stopHorizontal() {
        this.velocityX = 0;
    }
    
    jump() {
        if (!this.isJumping) {
            this.velocityY = -this.jumpPower;
            this.isJumping = true;
        }
    }
    
    update() {
        // Apply gravity
        this.velocityY += this.gravity;
        
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Update invincibility timer
        if (this.invincible) {
            this.invincibleTime--;
            if (this.invincibleTime <= 0) {
                this.invincible = false;
            }
        }
    }
    
    checkPlatformCollision(platforms) {
        this.isJumping = true;
        let goalReached = false;
        
        platforms.forEach(platform => {
            // Check if player is colliding with platform from above
            // Using slightly looser Y collision for better feel
            if (this.x + this.width > platform.x + 2 &&  // Add 2px margin
                this.x < platform.x + platform.width - 2 &&
                this.y + this.height > platform.y &&
                this.y + this.height < platform.y + platform.height + this.velocityY) {
                
                // Land on platform
                this.y = platform.y - this.height;
                this.velocityY = 0;
                this.isJumping = false;
                
                // Check if goal platform
                if (platform.isGoal) {
                    goalReached = true;
                }
            }
        });
        
        return goalReached;
    }
    
    takeDamage() {
        if (this.invincible) return false;
        
        this.lives--;
        this.invincible = true;
        this.invincibleTime = 80; // ~1.3 seconds at 60 FPS
        
        return this.lives <= 0; // Return true if game over
    }
    
    bounceOffEnemy() {
        this.velocityY = -10;
    }
}

// Export for use in main game
window.SuperStevePlayer = SuperStevePlayer;
console.log('👤 SuperStevePlayer module loaded');
