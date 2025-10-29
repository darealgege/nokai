/**
 * Super Steve - Underground Scene Generator
 * ✨ Metro stations and subway tunnels
 * 🔧 FIXED: Subway columns are now decorative only - can't jump on them
 */

class UndergroundSceneGenerator {
    constructor() {
        console.log('🚇 UndergroundSceneGenerator initialized!');
    }
    
    /**
     * Generál egy underground scene-t
     * @param {string} type - 'metro' vagy 'subway'
     * @param {number} levelDifficulty - 1-10
     * @param {number} canvasHeight - Canvas magassága
     * @returns {Object} Underground scene adatai
     */
    generateUndergroundScene(type, levelDifficulty, canvasHeight) {
        if (type === 'metro') {
            return this.generateMetroStation(levelDifficulty, canvasHeight);
        } else {
            return this.generateSubwayTunnel(levelDifficulty, canvasHeight);
        }
    }
    
    /**
     * Metro állomás generálás
     */
    generateMetroStation(difficulty, canvasHeight) {
        const platforms = [];
        const coins = [];
        const enemies = [];
        const obstacles = [];
        
        const groundY = canvasHeight - 30;
        const ceilingY = 50;
        
        // ✨ METRO ÁLLOMÁS LAYOUT
        
        // Indulási platform (bal oldal)
        platforms.push({
            x: 50,
            y: groundY,
            width: 150,
            height: 30,
            color: '#5a5a6a',
            isGoal: false
        });
        
        // Középső sín
        platforms.push({
            x: 250,
            y: groundY + 20,
            width: 1300,
            height: 10,
            color: '#3a3a4a',
            isGoal: false
        });
        
        // Kis platformok (ugrálni kell)
        let platformX = 300;
        for (let i = 0; i < 7; i++) {
            const width = 60 + Math.random() * 40;
            const height = 25;
            const y = groundY - 40 - Math.random() * 50;
            
            platforms.push({
                x: platformX,
                y: y,
                width: width,
                height: height,
                color: '#6a6a7a',
                isGoal: false
            });
            
            // Érmék a platform felett
            if (Math.random() < 0.7) {
                coins.push({
                    x: platformX + width / 2,
                    y: y - 30,
                    radius: 8,
                    collected: false,
                    isGoal: false
                });
            }
            
            platformX += width + 100 + Math.random() * 80;
        }
        
        // Feljárat platform (jobb oldal)
        platforms.push({
            x: 1700,
            y: groundY,
            width: 200,
            height: 30,
            color: '#5a5a6a',
            isGoal: false
        });
        
        // Ellenségek (patkányok a metróban)
        if (difficulty >= 2) {
            const numEnemies = 2 + Math.floor(difficulty / 3);
            for (let i = 0; i < numEnemies; i++) {
                const randomPlatform = platforms[2 + Math.floor(Math.random() * 6)];
                enemies.push({
                    x: randomPlatform.x + 20,
                    y: randomPlatform.y - 30,
                    width: 20,
                    height: 20,
                    velocityX: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random()),
                    velocityY: 0,
                    alive: true,
                    squashed: false,
                    squashTime: 0,
                    platformX: randomPlatform.x,
                    platformWidth: randomPlatform.width,
                    type: {
                        emoji: '🐀',
                        speed: 1.5,
                        color: '#4a4a4a'
                    }
                });
            }
        }
        
        return {
            type: 'metro',
            platforms: platforms,
            coins: coins,
            enemies: enemies,
            obstacles: obstacles,
            entranceX: 125,
            exitX: 1800,
            groundY: groundY,
            ceilingY: ceilingY,
            backgroundColor: '#2a2a3a',
            wallColor: '#3a3a4a',
            width: 2000
        };
    }
    
    /**
     * Aluljáró generálás
     */
    generateSubwayTunnel(difficulty, canvasHeight) {
        const platforms = [];
        const coins = [];
        const enemies = [];
        const obstacles = [];
        
        const groundY = canvasHeight - 30;
        const ceilingY = 50;
        
        // ✨ ALULJÁRÓ LAYOUT
        
        // Folytonos padló (járda)
        platforms.push({
            x: 0,
            y: groundY,
            width: 2000,
            height: 30,
            color: '#6a6a7a',
            isGoal: false
        });
        
        // ✨ OSZLOPOK ELTÁVOLÍTVA - csak vizuálisan rajzoljuk ki őket!
        // (A drawSubwayBackground() rajzolja őket, nem platformként)
        
        // Emelkedő platformok
        let platformX = 300;
        for (let i = 0; i < 6; i++) {
            const width = 80 + Math.random() * 40;
            const height = 20;
            const y = groundY - 60 - i * 20;
            
            platforms.push({
                x: platformX,
                y: y,
                width: width,
                height: height,
                color: '#7a7a8a',
                isGoal: false
            });
            
            // Érmék
            if (Math.random() < 0.7) {
                coins.push({
                    x: platformX + width / 2,
                    y: y - 25,
                    radius: 8,
                    collected: false,
                    isGoal: false
                });
            }
            
            platformX += width + 120 + Math.random() * 60;
        }
        
        // Ellenségek (denevérek)
        if (difficulty >= 2) {
            const numEnemies = 1 + Math.floor(difficulty / 2);
            for (let i = 0; i < numEnemies; i++) {
                enemies.push({
                    x: 500 + i * 350,
                    y: groundY - 40,
                    width: 20,
                    height: 20,
                    velocityX: (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.7),
                    velocityY: 0,
                    alive: true,
                    squashed: false,
                    squashTime: 0,
                    platformX: 0,
                    platformWidth: 2000,
                    type: {
                        emoji: '🦇',
                        speed: 1.5,
                        color: '#3a3a3a'
                    }
                });
            }
        }
        
        return {
            type: 'subway',
            platforms: platforms,
            coins: coins,
            enemies: enemies,
            obstacles: obstacles,
            entranceX: 100,
            exitX: 1850,
            groundY: groundY,
            ceilingY: ceilingY,
            backgroundColor: '#3a3a4a',
            wallColor: '#4a4a5a',
            width: 2000
        };
    }
    
    /**
     * Underground háttér rajzolása
     */
    drawUndergroundBackground(ctx, canvas, scene, cameraX) {
        // Háttér
        ctx.fillStyle = scene.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (scene.type === 'metro') {
            this.drawMetroBackground(ctx, canvas, scene, cameraX);
        } else {
            this.drawSubwayBackground(ctx, canvas, scene, cameraX);
        }
    }
    
    /**
     * Metro állomás háttér
     */
    drawMetroBackground(ctx, canvas, scene, cameraX) {
        ctx.save();
        
        // Falak
        ctx.fillStyle = scene.wallColor;
        
        // Felső fal
        ctx.fillRect(0, 0, canvas.width, scene.ceilingY);
        
        // Csempézett minta
        for (let x = 0; x < 2500; x += 50) {
            for (let y = scene.ceilingY; y < scene.groundY - 50; y += 50) {
                const screenX = x - cameraX;
                if (screenX > -60 && screenX < canvas.width + 10) {
                    ctx.strokeStyle = '#4a4a5a';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(screenX, y, 50, 50);
                }
            }
        }
        
        // Metro vonal jelek
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        
        for (let x = 200; x < 2000; x += 400) {
            const screenX = x - cameraX;
            if (screenX > -30 && screenX < canvas.width + 30) {
                ctx.fillText('M', screenX, 35);
            }
        }
        
        // Síneken csíkok
        ctx.strokeStyle = '#5a5a6a';
        ctx.lineWidth = 3;
        for (let x = 250; x < 1550; x += 30) {
            const screenX = x - cameraX;
            if (screenX > -10 && screenX < canvas.width + 10) {
                ctx.beginPath();
                ctx.moveTo(screenX, scene.groundY + 20);
                ctx.lineTo(screenX + 15, scene.groundY + 20);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
    
    /**
     * ✨ JAVÍTOTT: Aluljáró háttér - OSZLOPOK KIRAJZOLÁSA
     */
    drawSubwayBackground(ctx, canvas, scene, cameraX) {
        ctx.save();
        
        // Falak
        ctx.fillStyle = scene.wallColor;
        ctx.fillRect(0, 0, canvas.width, scene.ceilingY);
        
        // ✨ OSZLOPOK kirajzolása (csak dekoráció, nem platform!)
        ctx.fillStyle = '#4a4a5a';
        for (let i = 0; i < 7; i++) {
            const x = 200 + i * 250;
            const screenX = x - cameraX;
            
            // Csak akkor rajzoljuk ki ha a képernyőn van
            if (screenX > -30 && screenX < canvas.width + 10) {
                ctx.fillRect(screenX, scene.ceilingY, 20, scene.groundY - scene.ceilingY);
                
                // Oszlop széle (világosabb)
                ctx.strokeStyle = '#5a5a6a';
                ctx.lineWidth = 1;
                ctx.strokeRect(screenX, scene.ceilingY, 20, scene.groundY - scene.ceilingY);
            }
        }
        
        // Plafon csempék
        for (let x = 0; x < 2500; x += 60) {
            const screenX = x - cameraX;
            if (screenX > -70 && screenX < canvas.width + 10) {
                ctx.fillStyle = '#5a5a6a';
                ctx.fillRect(screenX, 10, 55, 30);
                
                // Fények
                if (x % 180 === 0) {
                    ctx.fillStyle = '#FFFACD';
                    ctx.globalAlpha = 0.6;
                    ctx.fillRect(screenX + 10, 15, 35, 20);
                    ctx.globalAlpha = 1.0;
                }
            }
        }
        
        // Jelek a falakon
        ctx.fillStyle = '#7a7a8a';
        ctx.font = '14px Arial';
        for (let x = 300; x < 2000; x += 500) {
            const screenX = x - cameraX;
            if (screenX > -30 && screenX < canvas.width + 30) {
                ctx.fillText('→', screenX, scene.groundY - 180);
            }
        }
        
        ctx.restore();
    }
}

window.UndergroundSceneGenerator = UndergroundSceneGenerator;
console.log('🚇 UndergroundSceneGenerator loaded - Columns are decorative only!');
