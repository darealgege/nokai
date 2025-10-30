/**
 * Super Steve - Metro Integration
 * ✨ Handles metro/subway entrance/exit interaction
 * 🔧 FIXED: Underground items and enemies no longer respawn when revisiting
 * 🔧 FIXED: Underground trigger points closer (40px instead of 80px)
 */

class MetroSystemIntegration {
    constructor(game) {
        this.game = game;
        this.undergroundGenerator = new UndergroundSceneGenerator();
        
        // State
        this.isUnderground = false;
        this.undergroundScene = null;
        this.nearSurfaceEntrance = null;  // Surface-en az entrance közelében
        this.nearSurfaceExit = null;      // Surface-en az exit közelében
        this.nearUndergroundEntrance = null;  // Underground-on az entrance közelében
        this.nearUndergroundExit = null;      // Underground-on az exit közelében
        
        // Original surface data (visszatéréshez)
        this.surfacePlayer = null;
        this.surfacePlatforms = null;
        this.surfaceCoins = null;
        this.surfaceEnemies = null;
        this.surfaceObstacles = null;
        
        // ✨ ÚJ: Underground állapotok mentése pályánként
        // Kulcs: level szám, Érték: { scene, coins, enemies, obstacles }
        this.undergroundStates = {};
        this.currentLevel = null;
        
        console.log('🚇 MetroSystemIntegration initialized - WITH PERSISTENT STATE!');
    }
    
    /**
     * Update - minden frame-ben hívni kell
     */
    update(player, renderer) {
        if (this.isUnderground) {
            // Underground módban - mindkét exit/entrance pont ellenőrzése
            this.checkUndergroundPoints(player);
        } else {
            // Surface módban - mindkét entrance/exit pont ellenőrzése
            this.checkSurfacePoints(player, renderer);
        }
    }
    
    /**
     * Surface-en ellenőrzi mindkét pontot (entrance ÉS exit)
     */
    checkSurfacePoints(player, renderer) {
        this.nearSurfaceEntrance = null;
        this.nearSurfaceExit = null;
        
        if (!renderer.hasMetro) return;
        
        const groundY = this.game.canvas.height - 30;
        const cameraX = this.game.camera.x;
        
        const playerCenterX = player.x + player.width / 2;
        const playerBottom = player.y + player.height;
        
        // Entrance ellenőrzése
        renderer.metroEntrances.forEach(entrance => {
            const entranceCenterX = entrance.x + entrance.width / 2;
            const entranceY = groundY - entrance.height;
            const distance = Math.abs(playerCenterX - entranceCenterX);
            
            if (distance < 60 && Math.abs(playerBottom - (entranceY + entrance.height)) < 50) {
                this.nearSurfaceEntrance = entrance;
            }
        });
        
        // Exit ellenőrzése
        renderer.metroExits.forEach(exit => {
            const exitCenterX = exit.x + exit.width / 2;
            const exitY = groundY - exit.height;
            const distance = Math.abs(playerCenterX - exitCenterX);
            
            if (distance < 60 && Math.abs(playerBottom - (exitY + exit.height)) < 50) {
                this.nearSurfaceExit = exit;
            }
        });
    }
    
    /**
     * ✨ JAVÍTOTT: Underground-on mindkét pontot ellenőrzi (közelebb trigger - 40px)
     */
    checkUndergroundPoints(player) {
        this.nearUndergroundEntrance = null;
        this.nearUndergroundExit = null;
        
        if (!this.undergroundScene) return;
        
        const playerCenterX = player.x + player.width / 2;
        const playerBottom = player.y + player.height;
        
        // Underground entrance pont - ✨ 40px távolság (közelebb)
        const entranceX = this.undergroundScene.entranceX;
        const entranceY = this.undergroundScene.groundY - 40;
        const distanceEntrance = Math.abs(playerCenterX - entranceX);
        
        if (distanceEntrance < 40 && Math.abs(playerBottom - entranceY) < 50) {
            this.nearUndergroundEntrance = true;
        }
        
        // Underground exit pont - ✨ 40px távolság (közelebb)
        const exitX = this.undergroundScene.exitX;
        const exitY = this.undergroundScene.groundY - 40;
        const distanceExit = Math.abs(playerCenterX - exitX);
        
        if (distanceExit < 40 && Math.abs(playerBottom - exitY) < 50) {
            this.nearUndergroundExit = true;
        }
    }
    
    /**
     * ✨ JAVÍTOTT: Leszállás underground-ra (entrance-on VAGY exit-en)
     * Most már ellenőrzi, hogy volt-e már ezen a pályán és visszatölti az állapotot
     */
    enterMetro(player, platforms, coins, enemies, obstacles, difficulty, canvasHeight, entryPoint) {
        console.log('🚇 Entering underground via:', entryPoint);
        
        // Mentjük a surface adatokat
        this.surfacePlayer = {
            x: player.x,
            y: player.y,
            velocityX: player.velocityX,
            velocityY: player.velocityY
        };
        this.surfacePlatforms = platforms.slice();
        this.surfaceCoins = coins.slice();
        this.surfaceEnemies = enemies.slice();
        this.surfaceObstacles = obstacles.slice();
        
        // Jelenlegi level meghatározása
        this.currentLevel = this.game.gameState.level;
        
        // ✨ ÚJ LOGIKA: Ellenőrizzük, hogy volt-e már ezen az underground pályán
        const savedState = this.undergroundStates[this.currentLevel];
        
        if (savedState) {
            // ✨ VAN MENTETT ÁLLAPOT - visszatöltjük!
            console.log('♻️ Restoring saved underground state for level', this.currentLevel);
            
            this.undergroundScene = savedState.scene;
            
            // Játékos pozíció: ha entrance-on megyünk le → entranceX, ha exit-en → exitX
            if (entryPoint === 'entrance') {
                player.x = this.undergroundScene.entranceX;
                console.log('📍 Placed at underground ENTRANCE:', player.x);
            } else {
                player.x = this.undergroundScene.exitX;
                console.log('📍 Placed at underground EXIT:', player.x);
            }
            
            player.y = this.undergroundScene.groundY - player.height - 5;
            player.velocityX = 0;
            player.velocityY = 0;
            player.isJumping = false;
            
            this.isUnderground = true;
            
            // Mentett állapot visszaadása
            return {
                platforms: savedState.platforms.slice(),
                coins: savedState.coins.slice(),
                enemies: savedState.enemies.slice(),
                obstacles: savedState.obstacles.slice(),
                levelWidth: this.undergroundScene.width
            };
        } else {
            // ✨ NINCS MENTETT ÁLLAPOT - új generálás
            console.log('🆕 Generating NEW underground scene for level', this.currentLevel);
            
            // Underground scene generálás
            const entrance = entryPoint === 'entrance' ? this.nearSurfaceEntrance : this.nearSurfaceExit;
            const entranceType = entrance.entranceType;
            this.undergroundScene = this.undergroundGenerator.generateUndergroundScene(
                entranceType,
                difficulty,
                canvasHeight
            );
            
            // Játékos pozíció: ha entrance-on megyünk le → entranceX, ha exit-en → exitX
            if (entryPoint === 'entrance') {
                player.x = this.undergroundScene.entranceX;
                console.log('📍 Placed at underground ENTRANCE:', player.x);
            } else {
                player.x = this.undergroundScene.exitX;
                console.log('📍 Placed at underground EXIT:', player.x);
            }
            
            player.y = this.undergroundScene.groundY - player.height - 5;
            player.velocityX = 0;
            player.velocityY = 0;
            player.isJumping = false;
            
            this.isUnderground = true;
            
            // ✨ ÚJ ÁLLAPOT MENTÉSE
            this.undergroundStates[this.currentLevel] = {
                scene: this.undergroundScene,
                platforms: this.undergroundScene.platforms.slice(),
                coins: this.undergroundScene.coins.slice(),
                enemies: this.undergroundScene.enemies.slice(),
                obstacles: this.undergroundScene.obstacles.slice()
            };
            
            return {
                platforms: this.undergroundScene.platforms.slice(),
                coins: this.undergroundScene.coins.slice(),
                enemies: this.undergroundScene.enemies.slice(),
                obstacles: this.undergroundScene.obstacles.slice(),
                levelWidth: this.undergroundScene.width
            };
        }
    }
    
    /**
     * ✨ JAVÍTOTT: Feljövés surface-re
     * Most már MENTI az underground állapotot feljövéskor
     */
    exitMetro(player, exitPoint, renderer) {
        console.log('🚇 Exiting to surface via:', exitPoint);
        
        // ✨ MENTJÜK AZ UNDERGROUND ÁLLAPOTOT feljövés előtt!
        if (this.currentLevel && this.undergroundScene) {
            console.log('💾 Saving underground state for level', this.currentLevel);
            
            this.undergroundStates[this.currentLevel] = {
                scene: this.undergroundScene,
                platforms: this.game.gameState.platforms.slice(),
                coins: this.game.gameState.coins.slice(),
                enemies: this.game.gameState.enemies.slice(),
                obstacles: this.game.gameState.obstacles.slice()
            };
        }
        
        // A megfelelő surface pontra helyezzük
        if (exitPoint === 'entrance') {
            // Underground entrance-ről jövünk → surface entrance-re
            const entrance = renderer.metroEntrances[0];
            player.x = entrance.x + entrance.width / 2 - player.width / 2;
            console.log('📍 Returned to surface ENTRANCE:', player.x);
        } else {
            // Underground exit-ről jövünk → surface exit-re
            const exit = renderer.metroExits[0];
            player.x = exit.x + exit.width / 2 - player.width / 2;
            console.log('📍 Returned to surface EXIT:', player.x);
        }
        
        player.y = this.surfacePlayer.y;
        player.velocityX = 0;
        player.velocityY = 0;
        player.isJumping = false;
        
        // Game state reset
        this.isUnderground = false;
        this.undergroundScene = null;
        this.nearUndergroundEntrance = null;
        this.nearUndergroundExit = null;
        
        return {
            platforms: this.surfacePlatforms,
            coins: this.surfaceCoins,
            enemies: this.surfaceEnemies,
            obstacles: this.surfaceObstacles || []
        };
    }
    
    /**
     * ✨ ÚJ: Underground állapotok törlése (új játék vagy új pálya esetén)
     */
    clearUndergroundStates() {
        console.log('🗑️ Clearing all underground states');
        this.undergroundStates = {};
        this.currentLevel = null;
    }
    
    /**
     * Underground háttér rajzolása
     */
    drawUndergroundBackground(ctx, canvas, cameraX) {
        if (!this.undergroundScene) return;
        
        this.undergroundGenerator.drawUndergroundBackground(
            ctx,
            canvas,
            this.undergroundScene,
            cameraX
        );
    }
    
    /**
     * Interakció UI rajzolása - 4 különböző pont!
     */
    drawInteractionPrompt(ctx, canvas, cameraX) {
        ctx.save();
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        const time = Date.now() / 200;
        
        // Surface entrance
        if (!this.isUnderground && this.nearSurfaceEntrance) {
            const x = this.nearSurfaceEntrance.x - cameraX + this.nearSurfaceEntrance.width / 2;
            const y = canvas.height - 30 - this.nearSurfaceEntrance.height;
            
            ctx.font = 'bold 11px Arial';
            const text = 'Underground';
            ctx.strokeText(text, x, y - 10);
            ctx.fillText(text, x, y - 10);
            
            const arrowY = y - 25 + Math.sin(time) * 3;
            ctx.strokeText('↓', x, arrowY);
            ctx.fillText('↓', x, arrowY);
        }
        
        // Surface exit
        if (!this.isUnderground && this.nearSurfaceExit) {
            const x = this.nearSurfaceExit.x - cameraX + this.nearSurfaceExit.width / 2;
            const y = canvas.height - 30 - this.nearSurfaceExit.height;
            
            ctx.font = 'bold 11px Arial';
            const text = 'Underground';
            ctx.strokeText(text, x, y - 10);
            ctx.fillText(text, x, y - 10);
            
            const arrowY = y - 25 + Math.sin(time) * 3;
            ctx.strokeText('↓', x, arrowY);
            ctx.fillText('↓', x, arrowY);
        }
        
        // Underground entrance
        if (this.isUnderground && this.nearUndergroundEntrance) {
            const x = this.undergroundScene.entranceX - cameraX;
            const y = this.undergroundScene.groundY;
            
            ctx.font = 'bold 10px Arial';
            const text = 'Back to Surface';
            ctx.strokeText(text, x, y - 50);
            ctx.fillText(text, x, y - 50);
            
            const arrowY = y - 65 + Math.sin(time) * 3;
            ctx.strokeText('↓', x, arrowY);
            ctx.fillText('↓', x, arrowY);
        }
        
        // Underground exit
        if (this.isUnderground && this.nearUndergroundExit) {
            const x = this.undergroundScene.exitX - cameraX;
            const y = this.undergroundScene.groundY;
            
            ctx.font = 'bold 10px Arial';
            const text = 'Back to Surface';
            ctx.strokeText(text, x, y - 50);
            ctx.fillText(text, x, y - 50);
            
            const arrowY = y - 65 + Math.sin(time) * 3;
            ctx.strokeText('↓', x, arrowY);
            ctx.fillText('↓', x, arrowY);
        }
        
        ctx.restore();
    }
    
    /**
     * Helper: Underground módban vagyunk-e
     */
    isInUnderground() {
        return this.isUnderground;
    }
    
    /**
     * Helper: Bármelyik surface ponton állunk-e
     */
    isNearAnySurfacePoint() {
        return this.nearSurfaceEntrance !== null || this.nearSurfaceExit !== null;
    }
    
    /**
     * Helper: Bármelyik underground ponton állunk-e
     */
    isNearAnyUndergroundPoint() {
        return this.nearUndergroundEntrance !== null || this.nearUndergroundExit !== null;
    }
    
    /**
     * Helper: Melyik surface ponton állunk
     */
    getCurrentSurfacePoint() {
        if (this.nearSurfaceEntrance) return 'entrance';
        if (this.nearSurfaceExit) return 'exit';
        return null;
    }
    
    /**
     * Helper: Melyik underground ponton állunk
     */
    getCurrentUndergroundPoint() {
        if (this.nearUndergroundEntrance) return 'entrance';
        if (this.nearUndergroundExit) return 'exit';
        return null;
    }
}

window.MetroSystemIntegration = MetroSystemIntegration;
console.log('🚇 MetroSystemIntegration loaded - WITH PERSISTENT STATE!');
