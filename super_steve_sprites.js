/**
 * Super Steve - Sprite Manager
 * Handles character sprite loading and animation
 * ✨ JAVÍTVA: Helyesen kezeli a 2x2-es (stand_anim) és 1x2-es (walk) sprite-lap elrendezéseket.
 * ✨ JAVÍTVA: Az animáció sebessége növelve lett, és vertikális eltolás került hozzáadásra a pontosabb pozicionálásért.
 */

class SuperSteveSprites {
    constructor() {
        // Sprite definíciók
        this.sprites = {
            stand_anim: {
                img: new Image(), // <<< EZ A SOR HIÁNYZOTT VALÓSZÍNŰLEG
                frames: 4,
                framesPerRow: 2,
                currentFrame: 0,
                frameWidth: 0,
                frameHeight: 0,
                loaded: false,
                frameData: [
                    // Frame 0
                    { width: 28, height: 38, offsetX: 0, offsetY: 0, sourceOffsetX: 0, sourceOffsetY: -10, zoom: 1.3 },
                    // Frame 1
                    { width: 28, height: 38, offsetX: 5, offsetY: 0, sourceOffsetX: 0, sourceOffsetY: -10, zoom: 1.3 },
                    // Frame 2
                    { width: 28, height: 38, offsetX: 0, offsetY: 0, sourceOffsetX: 0, sourceOffsetY: -5, zoom: 1.1 },
                    // Frame 3
                    { width: 28, height: 38, offsetX: 5, offsetY: 0, sourceOffsetX: 0, sourceOffsetY: 0, zoom: 1.15 }
                ]
            },
            walk: {
                img: new Image(),
                frames: 4, // ✨ JAVÍTVA: 2-ről 4-re, mert 2x2 = 4 képkocka
                framesPerRow: 2, // Ez már helyes volt (2 képkocka egy sorban)
                currentFrame: 0,
                frameWidth: 0,
                frameHeight: 0,
                loaded: false,
                // ✨ JAVÍTVA: A tömböt is 4 eleműre kell bővíteni
                frameData: [
                    { width: 28, height: 38, offsetX: 0, offsetY: 0, sourceOffsetX: 0, sourceOffsetY: 0, zoom: 1.2 },
                    { width: 28, height: 38, offsetX: 0, offsetY: 0, sourceOffsetX: 0, sourceOffsetY: 0, zoom: 1.2 },
                    { width: 28, height: 38, offsetX: 0, offsetY: 0, sourceOffsetX: 0, sourceOffsetY: 0, zoom: 1.2 }, // Hozzáadva
                    { width: 28, height: 38, offsetX: 0, offsetY: 0, sourceOffsetX: 0, sourceOffsetY: 0, zoom: 1.2 }  // Hozzáadva
                ]
            },
            jump: {
                img: new Image(), // <<< EZ A SOR HIÁNYZOTT VALÓSZÍNŰLEG
                frames: 1,
                framesPerRow: 1,
                currentFrame: 0,
                frameWidth: 0,
                frameHeight: 0,
                loaded: false,
                frameData: [
                    { width: 28, height: 38, offsetX: 0, offsetY: 0, sourceOffsetX: 0, sourceOffsetY: 0, zoom: 1.4 }
                ]
            }
        };
        
        // Animációs időzítés
        this.animationCounter = 0;
        this.animationSpeed = 20; // ✨ JAVÍTVA: Az eredeti 32 helyett 20, a gyorsabb, folyamatosabb animációért

        // Utolsó sprite típusának követése az animáció reseteléséhez váltáskor
        this.lastSpriteType = 'stand_anim';
        
        // Zászló, ami jelzi, ha minden sprite betöltődött
        this.allLoaded = false;
        
        // Debug mód
        this.debugMode = false; // Állítsd 'true'-ra, ha látni szeretnéd az animációs logokat és a hitboxot
        
        // ✨ JAVÍTVA: Vertikális eltolás a sprite pozicionálásához (pozitív érték lefelé tolja)
        this.verticalOffset = -1; // A sprite-ot x pixellel lejjebb rajzolja
        
        // Sprite képek betöltése
        this.loadSprites();
        
        console.log('🎨 SuperSteveSprites initialized');
        console.log(`   Animation speed: ${this.animationSpeed} frames`);
        console.log(`   Vertical offset: ${this.verticalOffset}px`);
    }
    
    loadSprites() {
        // A képek elérési útjai. Mivel a fájlnevek a kódban már helyesek voltak, itt nincs változás.
        this.sprites.stand_anim.img.src = 'super_steve_stand_anim.png';
        this.sprites.walk.img.src = 'super_steve_walk.png';
        this.sprites.jump.img.src = 'super_steve_jump.png'; // Feltételezve, hogy létezik egy ugrás kép is
        
        // Betöltéskezelők beállítása
        this.sprites.stand_anim.img.onload = () => this.onSpriteLoad('stand_anim');
        this.sprites.walk.img.onload = () => this.onSpriteLoad('walk');
        this.sprites.jump.img.onload = () => this.onSpriteLoad('jump');
    }
    
    onSpriteLoad(spriteName) {
        const sprite = this.sprites[spriteName];
        sprite.loaded = true;
        
        // ✨ JAVÍTVA: Képkocka méreteinek számítása az elrendezés alapján
        const numRows = Math.ceil(sprite.frames / sprite.framesPerRow);
        sprite.frameWidth = Math.floor(sprite.img.width / sprite.framesPerRow);
        sprite.frameHeight = Math.floor(sprite.img.height / numRows);
        
        console.log(`🖼️ Sprite loaded: ${spriteName}`);
        console.log(`   Image size: ${sprite.img.width}x${sprite.img.height}`);
        console.log(`   Frames: ${sprite.frames}, Layout: ${sprite.framesPerRow}x${numRows}`);
        console.log(`   Calculated Frame size: ${sprite.frameWidth}x${sprite.frameHeight}`);
        
        // Ellenőrizzük, hogy minden sprite betöltődött-e
        this.checkAllLoaded();
    }
    
    checkAllLoaded() {
        if (this.sprites.stand_anim.loaded && 
            this.sprites.walk.loaded && 
            this.sprites.jump.loaded) {
            this.allLoaded = true;
            console.log('✅ All sprites loaded successfully!');
        }
    }
    
    getCurrentSpriteType(player) {
        // Visszaadja a sprite típusát a játékos állapota alapján
        if (player.isJumping) {
            return 'jump';
        } else if (player.velocityX !== 0) {
            return 'walk';
        } else {
            return 'stand_anim';
        }
    }
    
    getCurrentSprite(player) {
        const spriteType = this.getCurrentSpriteType(player);
        return this.sprites[spriteType];
    }
    
    updateAnimation(player) {
        if (!this.allLoaded) return null;
        
        const currentSpriteType = this.getCurrentSpriteType(player);
        const currentSprite = this.sprites[currentSpriteType];
        
        // Képkocka és számláló nullázása, ha a sprite típusa megváltozik
        if (currentSpriteType !== this.lastSpriteType) {
            currentSprite.currentFrame = 0;
            this.animationCounter = 0;
            this.lastSpriteType = currentSpriteType;
        }
        
        // Csak a több képkockás sprite-okat animáljuk
        if (currentSprite.frames <= 1) return null;
        
        // Animációs számláló növelése
        this.animationCounter++;
        
        let stepOccurred = false;
        
        if (this.animationCounter >= this.animationSpeed) {
            this.animationCounter = 0;
            const oldFrame = currentSprite.currentFrame;
            currentSprite.currentFrame = (currentSprite.currentFrame + 1) % currentSprite.frames;
            
            // 👟 Lépéshang jelzése walk animációnál
            if (currentSpriteType === 'walk' && oldFrame !== currentSprite.currentFrame) {
                stepOccurred = true;
            }
        }
        
        return { stepOccurred: stepOccurred, spriteType: currentSpriteType };
    }
    
    // ✨ JAVÍTVA: Új segédfüggvény a képkocka X és Y pozíciójának kiszámítására
    getFramePosition(sprite, frameIndex) {
        const col = frameIndex % sprite.framesPerRow;
        const row = Math.floor(frameIndex / sprite.framesPerRow);
        
        return {
            x: col * sprite.frameWidth,
            y: row * sprite.frameHeight
        };
    }
    
    drawPlayer(ctx, player, cameraX) {
    if (!this.allLoaded) {
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        return;
    }

    if (player.invincible && Math.floor(player.invincibleTime / 8) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }

    const currentSprite = this.getCurrentSprite(player);
    const framePos = this.getFramePosition(currentSprite, currentSprite.currentFrame);
    
    const frameConfig = currentSprite.frameData[currentSprite.currentFrame];
    if (!frameConfig) {
        console.error("Hiányzó frameData!");
        return;
    }
    
    const zoom = frameConfig.zoom || 1.0;
    const zoomedWidth = frameConfig.width * zoom;
    const zoomedHeight = frameConfig.height * zoom;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.translate(
        Math.floor(player.x + player.width / 2),
        Math.floor(player.y + player.height / 2 + this.verticalOffset)
    );

    if (player.direction === -1) {
        ctx.scale(-1, 1);
    }

    ctx.drawImage(
        currentSprite.img,
        framePos.x + frameConfig.sourceOffsetX + 0.5,
        framePos.y + frameConfig.sourceOffsetY + 0.5,
        currentSprite.frameWidth - 1,
        currentSprite.frameHeight - 1,
        -zoomedWidth / 2 + frameConfig.offsetX,
        -zoomedHeight / 2 + frameConfig.offsetY,
        zoomedWidth,
        zoomedHeight
    );

    ctx.restore();
    ctx.globalAlpha = 1;

    // Debug: Hitbox és infók kirajzolása
    if (this.debugMode) {
        // Fizikai hitbox kirajzolása
        ctx.strokeStyle = '#FF00FF'; // Lila
        ctx.lineWidth = 1;
        ctx.strokeRect(player.x, player.y, player.width, player.height);
        
        // ✨ VISSZAÁLLÍTVA: A hiányzó debug információs szöveg kirajzolása ✨
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2; // Fekete körvonal a jobb olvashatóságért
        ctx.font = 'bold 10px monospace';
        const spriteType = this.getCurrentSpriteType(player);
        const info = `${spriteType}[${currentSprite.currentFrame}/${currentSprite.frames}]`;
        // Kirajzolás körvonallal
        ctx.strokeText(info, player.x, player.y - 5);
        ctx.fillText(info, player.x, player.y - 5);
    }
}

    getRecommendedPlayerSize() {
        // Ez a funkció megpróbálja a hitbox méretét a sprite-hoz igazítani.
        // Az eredeti értékek a player.js-ben is jók, de ez egy finomhangolási lehetőség.
        if (!this.allLoaded) {
            return { width: 20, height: 38 };
        }
        const jumpSprite = this.sprites.jump;
        const aspectRatio = jumpSprite.frameWidth / jumpSprite.frameHeight;
        const height = 38;
        //const width = Math.floor(height * aspectRatio * 1.0); // szűkebb hitbox
        const width = 10
        return { width: width, height: height };
    }
}

// Exportálás a fő játék számára
window.SuperSteveSprites = SuperSteveSprites;
console.log('🎨 SuperSteveSprites module loaded - FIXED version!');