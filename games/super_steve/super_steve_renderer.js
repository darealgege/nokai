/**
 * Super Steve - Renderer  
 * ✨ WITH METRO/SUBWAY SYSTEM: Random metro/subway entrances
 * 🔧 FIXED: Enemy box removed, only emoji visible
 * 🔧 FIXED: Exit point dynamically positioned near level goal
 */

class SuperSteveRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Background layers
        this.mountains = [];
        this.clouds = [];
        this.birds = [];
        this.backgroundElements = [];
        
        // ✨ Metro system
        this.hasMetro = false;
        this.metroEntrances = [];
        this.metroExits = [];
        
        this.backgroundTheme = 'downtown';
        this.showMountains = false;
        
        // ✨ ÚJ: Level width tracking
        this.currentLevelWidth = 1500;
        
        // Generate persistent elements
        this.clouds = this.generateClouds();
        this.birds = this.generateBirds();
        
        console.log('🎨 SuperSteveRenderer initialized - WITH METRO SYSTEM!');
    }
    
    setBackgroundTheme(levelNum) {
        const themes = ['downtown', 'suburban', 'park'];
        this.backgroundTheme = themes[levelNum % themes.length];
        
        // Hegyek CSAK park pályán
        this.showMountains = (this.backgroundTheme === 'park');
        
        // ✨ ÚJ: Pályahossz számítása (ugyanaz mint a level generator-ben)
        this.currentLevelWidth = 1500 + (levelNum * 300);
        
        this.mountains = this.generateMountains();
        this.backgroundElements = this.generateBackgroundElements();
                
        // Z-index rendszer
        this.backgroundElements.sort((a, b) => a.x - b.x);
        
        // ✨ Metro entrances/exits szűrése
        this.metroEntrances = this.backgroundElements.filter(e => e.type === 'metro_entrance');
        this.metroExits = this.backgroundElements.filter(e => e.type === 'metro_exit');
        this.hasMetro = this.metroEntrances.length > 0;
        
        console.log(`🏙️ Theme: ${this.backgroundTheme}, Level Width: ${this.currentLevelWidth}, Mountains: ${this.showMountains}, Metro: ${this.hasMetro}`);
    }
    
    generateMountains() {
        const mountains = [];
        const numMountains = 6;
        
        for (let i = 0; i < numMountains; i++) {
            mountains.push({
                x: i * 500 + Math.random() * 100,
                width: 200 + Math.random() * 220,
                height: 60 + Math.random() * 80,
                speed: 0.02 + Math.random() * 0.03,
                peaks: this.generatePeaks(3 + Math.floor(Math.random() * 3)),
                style: Math.floor(Math.random() * 2)
            });
        }
        
        return mountains;
    }
    
    generatePeaks(count) {
        const peaks = [];
        for (let i = 0; i < count; i++) {
            peaks.push({
                position: (i + 0.5) / count + (Math.random() - 0.5) * 0.15,
                height: 0.6 + Math.random() * 0.4
            });
        }
        return peaks;
    }
    
    generateBirds() {
        const birds = [];
        const numBirds = 5;
        
        for (let i = 0; i < numBirds; i++) {
            birds.push({
                x: Math.random() * 2500,
                y: 25 + Math.random() * 50,
                speed: 0.25 + Math.random() * 0.4,
                direction: Math.random() > 0.5 ? 1 : -1,
                flap: Math.random() * Math.PI * 2,
                size: 2 + Math.random() * 1.5
            });
        }
        
        return birds;
    }
    
    generateBackgroundElements() {
        const elements = [];
        
        switch(this.backgroundTheme) {
            case 'downtown':
                // Downtown: 6 épület + 6 fa + METRO (40% esély)
                let buildX = 0;
                
                /*for (let i = 0; i < 6; i++) {
                    const width = 70 + Math.random() * 80;
                    const gap = 40 + Math.random() * 70;
                    elements.push({
                        type: 'building',
                        x: buildX,
                        width: width,
                        height: 80 + Math.random() * 90,
                        windowRows: Math.floor(6 + Math.random() * 4),
                        speed: 0.16 + Math.random() * 0.11,
                        color: '#8a8a8a'
                    });
                    buildX += width + gap;
                } */

                for (let i = 0; i < 6; i++) {
                    const width = 70 + Math.random() * 80;
                    const gap = 40 + Math.random() * 70;
                    const height = 80 + Math.random() * 90;
                    const windowRows = Math.floor((height - 20) / 12);
                    
                    elements.push({
                        type: 'building',
                        x: buildX,
                        width: width,
                        height: height,
                        windowRows: windowRows,
                        speed: 0.16 + Math.random() * 0.11,
                        color: '#8a8a8a'
                    });
                    buildX += width + gap;
                }                    
                
                // Fák
                for (let i = 0; i < 6; i++) {
                    elements.push({
                        type: 'tree',
                        x: 150 + i * 280 + Math.random() * 80,
                        size: 28 + Math.random() * 25,
                        speed: 0.20 + Math.random() * 0.10,
                        color: '#5a7a5a',
                        treeType: Math.floor(Math.random() * 3)
                    });
                }
                
                // ✨ METRO LEJÁRAT (40% esély)
                if (Math.random() < 0.4) {
                    elements.push({
                        type: 'metro_entrance',
                        x: 300 + Math.random() * 200,
                        width: 50,
                        height: 40,
                        speed: 0.16,
                        entranceType: 'metro'
                    });
                    
                    // ✨ JAVÍTOTT: Feljárat közel a goal-hoz (levelWidth - 350)
                    elements.push({
                        type: 'metro_exit',
                        x: this.currentLevelWidth - 350 - Math.random() * 50,
                        width: 50,
                        height: 40,
                        speed: 0.16,
                        entranceType: 'metro'
                    });
                }
                break;
                
            case 'suburban':
                // Suburban: 7 ház + 9 fa + ALULJÁRÓ (30% esély)
                let houseX = 0;
                
                for (let i = 0; i < 7; i++) {
                    const width = 58 + Math.random() * 28;
                    const gap = 45 + Math.random() * 60;
                    const height = 48 + Math.random() * 22;
                    elements.push({
                        type: 'house',
                        x: houseX,
                        width: width,
                        height: height,
                        speed: 0.19 + Math.random() * 0.08,
                        color: '#8a8a8a',
                        hasFence: Math.random() > 0.6
                    });
                    houseX += width + gap;
                }
                
                // Fák
                for (let i = 0; i < 9; i++) {
                    elements.push({
                        type: 'tree',
                        x: 100 + i * 200 + Math.random() * 60,
                        size: 30 + Math.random() * 28,
                        speed: 0.21 + Math.random() * 0.09,
                        color: '#5a7a5a',
                        treeType: Math.floor(Math.random() * 3)
                    });
                }
                
                // ✨ ALULJÁRÓ (30% esély)
                if (Math.random() < 0.3) {
                    elements.push({
                        type: 'metro_entrance',
                        x: 400 + Math.random() * 200,
                        width: 45,
                        height: 35,
                        speed: 0.19,
                        entranceType: 'subway'
                    });
                    
                    // ✨ JAVÍTOTT: Feljárat közel a goal-hoz (levelWidth - 350)
                    elements.push({
                        type: 'metro_exit',
                        x: this.currentLevelWidth - 350 - Math.random() * 50,
                        width: 45,
                        height: 35,
                        speed: 0.19,
                        entranceType: 'subway'
                    });
                }
                break;
                
            case 'park':
                // Park: Sok fa (nincs metro)
                for (let i = 0; i < 13; i++) {
                    elements.push({
                        type: 'tree',
                        x: i * 185 + Math.random() * 45,
                        size: 30 + Math.random() * 30,
                        speed: 0.23 + Math.random() * 0.11,
                        color: '#5a7a5a',
                        treeType: Math.floor(Math.random() * 3)
                    });
                }
                break;
        }
        
        return elements;
    }
    
    generateClouds() {
        const clouds = [];
        const numClouds = 9;
        
        for (let i = 0; i < numClouds; i++) {
            clouds.push({
                x: Math.random() * 3200,
                y: 10 + Math.random() * 60,
                size: 18 + Math.random() * 26,
                speed: 0.04 + Math.random() * 0.14,
                type: Math.floor(Math.random() * 3)
            });
        }
        
        return clouds;
    }
    
    updateBirds() {
        this.birds.forEach(bird => {
            bird.x += bird.speed * bird.direction;
            bird.flap = (bird.flap + 0.18) % (Math.PI * 2);
            
            if (bird.x > 3200) bird.x = -100;
            if (bird.x < -100) bird.x = 3200;
        });
    }
    
    drawBackground(cameraX) {
        // Sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        
        switch(this.backgroundTheme) {
            case 'downtown':
                gradient.addColorStop(0, '#7FB8D4');
                gradient.addColorStop(1, '#D0E8F0');
                break;
            case 'suburban':
                gradient.addColorStop(0, '#87CEEB');
                gradient.addColorStop(1, '#E0F6FF');
                break;
            case 'park':
                gradient.addColorStop(0, '#98D8E8');
                gradient.addColorStop(1, '#E8F8FF');
                break;
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Rétegezés
        if (this.showMountains) {
            this.drawMountains(cameraX || 0);
        }
        
        this.drawClouds(cameraX || 0);
        
        this.updateBirds();
        this.drawBirds(cameraX || 0);
        
        this.drawBackgroundElements(cameraX || 0);
    }
    
    drawMountains(cameraX) {
        this.ctx.save();
        this.ctx.fillStyle = '#9a9aaa';
        this.ctx.globalAlpha = 1.0;
        
        const groundY = this.canvas.height - 30;
        
        this.mountains.forEach(mountain => {
            const parallaxX = mountain.x - (cameraX * mountain.speed);
            let drawX = parallaxX % (this.canvas.width + mountain.width);
            if (drawX < -mountain.width) {
                drawX += this.canvas.width + mountain.width;
            }
            
            this.ctx.beginPath();
            this.ctx.moveTo(drawX, groundY);
            
            mountain.peaks.forEach(peak => {
                const peakX = drawX + mountain.width * peak.position;
                const peakY = groundY - mountain.height * peak.height;
                
                if (mountain.style === 0) {
                    this.ctx.lineTo(peakX, peakY);
                } else {
                    this.ctx.quadraticCurveTo(
                        peakX - mountain.width * 0.05,
                        peakY - 5,
                        peakX,
                        peakY
                    );
                }
            });
            
            this.ctx.lineTo(drawX + mountain.width, groundY);
            this.ctx.closePath();
            this.ctx.fill();
        });
        
        this.ctx.restore();
    }
    
    drawClouds(cameraX) {
        this.clouds.forEach(cloud => {
            const parallaxX = cloud.x - (cameraX * cloud.speed);
            let drawX = parallaxX % (this.canvas.width + cloud.size * 4);
            if (drawX < -cloud.size * 2) {
                drawX += this.canvas.width + cloud.size * 4;
            }
            
            this.drawCloud(drawX, cloud.y, cloud.size, cloud.type);
        });
    }
    
    drawCloud(x, y, size, type) {
        this.ctx.save();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.globalAlpha = 0.75;
        
        const r = size / 2.8;
        
        switch(type) {
            case 0:
                this.ctx.beginPath();
                this.ctx.arc(x, y, r * 1.1, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x - r * 0.65, y - r * 0.35, r * 0.9, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x + r * 0.65, y - r * 0.35, r * 0.9, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x - r * 1.05, y + r * 0.15, r * 0.8, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x + r * 1.05, y + r * 0.15, r * 0.8, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x, y + r * 0.5, r * 0.75, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 1:
                const w = size * 1.4;
                const h = size * 0.6;
                this.ctx.beginPath();
                this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.ellipse(x - w * 0.33, y - h * 0.1, w / 3, h / 2.5, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.ellipse(x + w * 0.33, y - h * 0.1, w / 3, h / 2.5, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.ellipse(x - w * 0.15, y - h * 0.4, w / 5, h / 3.5, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.ellipse(x + w * 0.15, y - h * 0.4, w / 5, h / 3.5, 0, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 2:
                this.ctx.beginPath();
                this.ctx.arc(x, y, r, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x - r * 0.6, y - r * 0.55, r * 0.95, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x + r * 0.6, y - r * 0.55, r * 0.95, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x, y - r * 0.8, r * 0.8, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x - r * 1.0, y + r * 0.1, r * 0.8, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x + r * 1.0, y + r * 0.1, r * 0.8, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x - r * 0.4, y + r * 0.5, r * 0.7, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x + r * 0.4, y + r * 0.5, r * 0.7, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x, y + r * 0.6, r * 0.6, 0, Math.PI * 2);
                this.ctx.fill();
                break;
        }
        
        this.ctx.restore();
    }
    
    drawBirds(cameraX) {
        this.ctx.save();
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.globalAlpha = 0.38;
        
        this.birds.forEach(bird => {
            const parallaxX = bird.x - (cameraX * 0.07);
            let drawX = parallaxX % (this.canvas.width + 120);
            if (drawX < -60) drawX += this.canvas.width + 120;
            
            const wingY = Math.sin(bird.flap) * bird.size * 0.8;
            const bx = Math.floor(drawX);
            const by = Math.floor(bird.y);
            
            this.ctx.fillRect(bx, by, 1, 1);
            this.ctx.fillRect(bx - 2, by - wingY, 1, 1);
            this.ctx.fillRect(bx + 2, by - wingY, 1, 1);
        });
        
        this.ctx.restore();
    }
    
    drawBackgroundElements(cameraX) {
        const groundY = this.canvas.height - 30;
        
        this.backgroundElements.forEach(element => {
            const parallaxX = element.x - (cameraX * element.speed);
            
            let wrapWidth;
            if (element.type === 'building') wrapWidth = 1200;
            else if (element.type === 'house') wrapWidth = 1000;
            else if (element.type === 'metro_entrance' || element.type === 'metro_exit') wrapWidth = 3000;
            else if (element.type === 'tree') wrapWidth = 1500;
            else wrapWidth = 1800;
            
            let drawX = parallaxX % (this.canvas.width + wrapWidth);
            if (drawX < -element.width - 60) {
                drawX += this.canvas.width + wrapWidth;
            }
            
            switch(element.type) {
                case 'building':
                    this.drawBuilding(drawX, groundY - element.height, element);
                    break;
                case 'house':
                    this.drawHouse(drawX, groundY - element.height, element);
                    break;
                case 'tree':
                    this.drawTree(drawX, groundY - element.size, element);
                    break;
                // Metro entrance/exit rajzolása átkerült a game.js-be (z-index)
            }
        });
    }
    
    // ✨ METRO LEJÁRAT RAJZOLÁSA
    drawMetroEntrance(x, y, entrance) {
        this.ctx.save();
        
        const groundY = this.canvas.height - 30;
        
        if (entrance.entranceType === 'metro') {
            // Metro állomás - VILÁGOSABB SZÍNEK!
            this.ctx.fillStyle = '#aaaaaa';  // Világosszürke
            this.ctx.fillRect(x, y, entrance.width, entrance.height);
            
            this.ctx.fillStyle = '#888888';  // Középsőtét
            this.ctx.fillRect(x + 5, y + 5, entrance.width - 10, entrance.height - 5);
            
            this.ctx.fillStyle = '#666666';  // Sötétebb belső
            this.ctx.fillRect(x + 8, y + 8, entrance.width - 16, entrance.height - 10);
            
            // "M" jel - SÁRGA (jól látszik grayscale-ben is!)
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('M', x + entrance.width / 2, y + 24);
            
            // Lépcsők
            this.ctx.strokeStyle = '#999999';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const stepY = groundY - 5 - i * 3;
                this.ctx.beginPath();
                this.ctx.moveTo(x + entrance.width / 4, stepY);
                this.ctx.lineTo(x + entrance.width * 3 / 4, stepY);
                this.ctx.stroke();
            }
        } else {
            // Aluljáró
            this.ctx.fillStyle = '#7a7a8a';
            this.ctx.fillRect(x, y, entrance.width, entrance.height);
            
            this.ctx.strokeStyle = '#5a5a6a';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, entrance.width, entrance.height);
            
            // Lépcsők
            this.ctx.fillStyle = '#4a4a5a';
            for (let i = 0; i < 4; i++) {
                const stepH = 7;
                const stepY = y + entrance.height - stepH * (i + 1);
                this.ctx.fillRect(x + 5, stepY, entrance.width - 10, stepH);
            }
            
            // Nyíl
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('↓', x + entrance.width / 2, y + 12);
        }
        
        this.ctx.restore();
    }
    
    // ✨ METRO FELJÁRAT RAJZOLÁSA
    drawMetroExit(x, y, exit) {
        this.ctx.save();
        const groundY = this.canvas.height - 30;
        if (exit.entranceType === 'metro') {
            this.ctx.fillStyle = '#aaaaaa';
            this.ctx.fillRect(x, y, exit.width, exit.height);
            
            this.ctx.fillStyle = '#888888';
            this.ctx.fillRect(x + 5, y + 5, exit.width - 10, exit.height - 5);
            
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(x + 8, y + 8, exit.width - 16, exit.height - 10);
            
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('M', x + exit.width / 2, y + 24);
            
            // Lépcsők
            this.ctx.strokeStyle = '#999999';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const stepY = groundY - 5 - i * 3;
                this.ctx.beginPath();
                this.ctx.moveTo(x + exit.width / 4, stepY);
                this.ctx.lineTo(x + exit.width * 3 / 4, stepY);
                this.ctx.stroke();
            }            
        } else {
            // Aluljáró
            this.ctx.fillStyle = '#7a7a8a';
            this.ctx.fillRect(x, y, exit.width, exit.height);
            
            this.ctx.strokeStyle = '#5a5a6a';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, exit.width, exit.height);

            // Lépcsők
            this.ctx.fillStyle = '#4a4a5a';
            for (let i = 0; i < 4; i++) {
                const stepH = 7;
                const stepY = y + exit.height - stepH * (i + 1);
                this.ctx.fillRect(x + 5, stepY, exit.width - 10, stepH);
            }                
            
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('↑', x + exit.width / 2, y + 9);
        }
        
        this.ctx.restore();
    }
    
    drawBuilding(x, y, building) {
        this.ctx.save();
        this.ctx.fillStyle = building.color;
        this.ctx.globalAlpha = 1.0;
        
        this.ctx.fillRect(x, y, building.width, building.height);
        this.ctx.fillRect(x - 2, y - 4, building.width + 4, 4);
        
        this.ctx.fillStyle = '#555555';
        this.ctx.globalAlpha = 1.0;
        
        const windowSize = 3;
        const spacing = 9;
        const cols = Math.floor((building.width - 8) / spacing);
        
        this.ctx.beginPath();
        for (let row = 0; row < building.windowRows; row++) {
            for (let col = 0; col < cols; col++) {
                const wx = x + col * spacing + 4;
                const wy = y + 10 + row * 12;
                if (wy + windowSize < y + building.height - 4) {
                    this.ctx.rect(wx, wy, windowSize, windowSize);
                }
            }
        }
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawHouse(x, y, house) {
        this.ctx.save();
        this.ctx.fillStyle = house.color;
        this.ctx.globalAlpha = 1.0;
        
        this.ctx.fillRect(x, y, house.width, house.height);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x - 5, y);
        this.ctx.lineTo(x + house.width / 2, y - 12);
        this.ctx.lineTo(x + house.width + 5, y);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#444444';
        this.ctx.globalAlpha = 1.0;
        
        const windowSize = 5;
        
        this.ctx.beginPath();
        
        const leftWindowX = x + 8;
        const windowY = y + 10;
        if (windowY + windowSize < y + house.height - 3) {
            this.ctx.rect(leftWindowX, windowY, windowSize, windowSize);
        }
        
        if (house.width > 70) {
            const midWindowX = x + house.width / 2 - windowSize / 2;
            if (windowY + windowSize < y + house.height - 3) {
                this.ctx.rect(midWindowX, windowY, windowSize, windowSize);
            }
        }
        
        const rightWindowX = x + house.width - windowSize - 8;
        if (windowY + windowSize < y + house.height - 3) {
            this.ctx.rect(rightWindowX, windowY, windowSize, windowSize);
        }
        
        this.ctx.fill();
        
        this.ctx.fillStyle = '#333333';
        this.ctx.globalAlpha = 1.0;
        const doorW = 7;
        const doorH = 11;
        this.ctx.fillRect(x + 7, y + house.height - doorH, doorW, doorH);
        
        if (house.hasFence) {
            this.ctx.strokeStyle = '#555555';
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 1.0;
            for (let i = 0; i < 3; i++) {
                const fx = x - 8 + i * 5;
                this.ctx.beginPath();
                this.ctx.moveTo(fx, y + house.height);
                this.ctx.lineTo(fx, y + house.height + 7);
                this.ctx.stroke();
            }
        }
        
        this.ctx.restore();
    }
    
    drawTree(x, y, tree) {
        this.ctx.save();
        this.ctx.imageSmoothingEnabled = false;

        const trunkW = tree.size * 0.13;
        const trunkH = tree.size * 0.36;

        this.ctx.fillStyle = '#6a5a4a';
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillRect(x + tree.size / 2 - trunkW / 2, y + tree.size - trunkH, trunkW, trunkH);

        this.ctx.fillStyle = tree.color;
        this.ctx.globalAlpha = 1.0;

        switch(tree.treeType) {
            case 0:
                this.ctx.beginPath();
                this.ctx.arc(x + tree.size / 2, y + tree.size / 3.2, tree.size / 2.7, 0, Math.PI * 2);
                this.ctx.closePath();
                this.ctx.fill();
                break;
            case 1:
                this.ctx.beginPath();
                this.ctx.moveTo(x + tree.size / 2, y);
                this.ctx.lineTo(x, y + tree.size * 0.7);
                this.ctx.lineTo(x + tree.size, y + tree.size * 0.7);
                this.ctx.closePath();
                this.ctx.fill();
                break;
            case 2:
                const cx = x + tree.size / 2;
                const cy = y + tree.size / 3.3;
                const rMain = tree.size / 3.0;
                const rSide = tree.size / 3.5;

                this.ctx.beginPath();
                this.ctx.arc(cx, cy, rMain, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.arc(x + tree.size / 3.3, y + tree.size / 2.3, rSide, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.arc(x + tree.size * 0.69, y + tree.size / 2.3, rSide, 0, Math.PI * 2);
                this.ctx.fill();
                break;
        }

        this.ctx.restore();
    }
    
    drawPlatforms(platforms) {
        platforms.forEach(platform => {
            this.ctx.fillStyle = platform.color;
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            this.ctx.strokeStyle = platform.isGoal ? '#FFA500' : '#654321';
            this.ctx.lineWidth = platform.isGoal ? 3 : 1;
            this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
            
            if (platform.height === 30) {
                this.ctx.fillStyle = '#228B22';
                this.ctx.fillRect(platform.x, platform.y, platform.width, 8);
            }
            
            if (platform.isGoal) {
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                this.ctx.fillRect(platform.x, platform.y - 60, platform.width, 60);
                this.ctx.font = '16px Arial';
                this.ctx.fillStyle = '#FFD700';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('🏁 GOAL', platform.x + platform.width / 2, platform.y - 30);
            }
        });
    }
    
    drawCoins(coins) {
        coins.forEach(coin => {
            if (!coin.collected) {
                const gradient = this.ctx.createRadialGradient(coin.x, coin.y, 0, coin.x, coin.y, coin.radius);
                gradient.addColorStop(0, '#FFD700');
                gradient.addColorStop(0.7, '#FFA500');
                gradient.addColorStop(1, '#FF8C00');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.strokeStyle = '#DAA520';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                
                if (coin.isGoal) {
                    this.ctx.font = `${coin.radius * 1.3}px Arial`;
                    this.ctx.fillText('⭐', coin.x - coin.radius * 0.7, coin.y + coin.radius * 0.5);
                }
            }
        });
    }
    
    drawObstacles(obstacles) {
        obstacles.forEach(obstacle => {
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(obstacle.type.emoji, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
        });
    }
    
    /**
     * ✨ JAVÍTOTT: Ellenség rajzolása - NINCS háttérnégyzet, csak az emoji!
     */
    drawEnemies(enemies) {
        enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            if (enemy.squashed) {
                const squashAmount = Math.min(enemy.squashTime / 20, 1);
                
                // ✨ NINCS fillRect - csak emoji
                this.ctx.font = `${20 * (1 - squashAmount * 0.5)}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.globalAlpha = 1 - squashAmount;
                this.ctx.fillText(enemy.type.emoji, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                this.ctx.globalAlpha = 1;
                
                if (enemy.squashTime < 15) {
                    this.ctx.font = 'bold 14px Arial';
                    this.ctx.fillStyle = '#FF0000';
                    this.ctx.strokeStyle = '#FFFFFF';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeText('POW!', enemy.x + enemy.width / 2, enemy.y - 15);
                    this.ctx.fillText('POW!', enemy.x + enemy.width / 2, enemy.y - 15);
                }
            } else {
                // ✨ NINCS fillRect - csak emoji
                this.ctx.font = '18px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(enemy.type.emoji, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            }
        });
    }
    
    drawParticles(particles) {
        particles.forEach(particle => {
            this.ctx.globalAlpha = particle.life / 40;
            
            if (particle.emoji) {
                this.ctx.font = `${particle.size * 1.5}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(particle.emoji, particle.x, particle.y);
            } else {
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        this.ctx.globalAlpha = 1;
    }
    
    drawHUD(score, level, lives, topScore) {
        this.ctx.fillStyle = '#1a3a1a';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${score}`, 4, 12);
        this.ctx.fillText(`Level: ${level}`, 4, 24);
        this.ctx.fillText(`❤️ x ${lives}`, 4, 36);
        
        if (topScore > 0) {
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`Top: ${topScore}`, this.canvas.width - 4, 12);
        }
    }
    
    drawPauseMenu(pauseMenuItems, pauseMenuIndex) {
        this.ctx.fillStyle = 'rgba(26, 58, 26, 0.85)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#9db891';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        this.ctx.font = '11px sans-serif';
        pauseMenuItems.forEach((item, index) => {
            const y = this.canvas.height / 2 - 5 + index * 18;
            
            if (index === pauseMenuIndex) {
                this.ctx.fillStyle = '#9db891';
                this.ctx.fillRect(this.canvas.width / 2 - 45, y - 10, 90, 14);
                this.ctx.fillStyle = '#1a3a1a';
            } else {
                this.ctx.fillStyle = '#9db891';
            }
            
            this.ctx.fillText(item, this.canvas.width / 2, y);
        });
    }
    
    drawGameOver(score, gameOverMenuItems, gameOverMenuIndex) {
        this.ctx.fillStyle = 'rgba(26, 58, 26, 0.85)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#9db891';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText(`Final Score: ${score}`, this.canvas.width / 2, this.canvas.height / 2 - 5);
        
        this.ctx.font = '11px sans-serif';
        gameOverMenuItems.forEach((item, index) => {
            const y = this.canvas.height / 2 + 15 + index * 18;
            
            if (index === gameOverMenuIndex) {
                this.ctx.fillStyle = '#9db891';
                this.ctx.fillRect(this.canvas.width / 2 - 45, y - 10, 90, 14);
                this.ctx.fillStyle = '#1a3a1a';
            } else {
                this.ctx.fillStyle = '#9db891';
            }
            
            this.ctx.fillText(item, this.canvas.width / 2, y);
        });
    }
    
    drawScores(topScores) {
        this.ctx.fillStyle = 'rgba(26, 58, 26, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#9db891';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('TOP 10 SCORES', this.canvas.width / 2, 20);
        
        this.ctx.font = '9px sans-serif';
        this.ctx.textAlign = 'left';
        
        if (topScores.length === 0) {
            this.ctx.fillText('No scores yet!', this.canvas.width / 2 - 30, 40);
        } else {
            let y = 38;
            topScores.forEach((entry, index) => {
                const rank = `${index + 1}.`;
                const score = `${entry.score} pts`;
                const date = entry.date;
                
                this.ctx.textAlign = 'left';
                this.ctx.fillText(rank, 8, y);
                this.ctx.fillText(score, 22, y);
                
                this.ctx.textAlign = 'right';
                this.ctx.fillText(date, this.canvas.width - 8, y);
                
                y += 12;
            });
        }
        
        this.ctx.font = '9px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('OK or Menu to close', this.canvas.width / 2, this.canvas.height - 8);
    }
}

window.SuperSteveRenderer = SuperSteveRenderer;
console.log('🎨 SuperSteveRenderer - FIXED: Enemy box removed, Exit point near goal!');
