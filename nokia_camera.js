/**
 * Nokia Camera App
 * Retro camera with monochrome processing and photo capture
 */

class NokiaCamera {
    constructor() {
        this.isActive = false;
        this.stream = null;
        this.videoEl = null;
        this.container = null;
        this.facing = 'environment';
        
        // ✅ Camera settings
        this.quality = 'high'; // 'high', 'medium', 'low'
        this.flash = false;
        this.timer = 0; // 0, 3, 5, 10 seconds
        this.currentCameraIndex = 0;
        this.availableCameras = [];
        
        // ✅ Settings menu state
        this.settingsOpen = false;
        this.settingsIndex = 0;
        this.settingsItems = [];
        
        // Filter settings based on quality
        this.updateFilterSettings();
        
        // Canvas elements
        this.rawVideo = null;
        this.displayCanvas = null;
        this.displayCtx = null;
        this.offCanvas = document.createElement('canvas');
        this.offCtx = this.offCanvas.getContext('2d');
        
        this.raf = null;
    }
    
    updateFilterSettings() {
        // ✅ Adjust pixelSize based on quality
        const qualitySettings = {
            'high': { pixelSize: 2, threshold: 0.45, width: 1920, height: 1080 },
            'medium': { pixelSize: 3, threshold: 0.5, width: 1280, height: 720 },
            'low': { pixelSize: 4, threshold: 0.55, width: 640, height: 480 }
        };
        
        const settings = qualitySettings[this.quality];
        this.pixelSize = settings.pixelSize;
        this.threshold = settings.threshold;
        this.targetWidth = settings.width;
        this.targetHeight = settings.height;
        
        this.brightness = 0.1;
        this.contrast = 0.3;
        this.saturation = -1;
        this.gamma = 0.9;
        this.scanlines = true;
        this.grain = false;
    }
    
    show() {
        if (this.isActive) return;
        
        this.isActive = false;
        this.settingsOpen = false;
        this.createUI();
        this.startCamera();
        
        console.log('📷 Camera UI created');
    }
    
    hide() {
        if (!this.isActive && !this.settingsOpen) return;
        
        this.isActive = false;
        this.settingsOpen = false;
        this.stopCamera();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        this.container = null;
        
        // Return to home screen
        if (window.appManager) {
            window.appManager.showHomeScreen();
        }
        
        console.log('📷 Camera closed');
    }
    
    createUI() {
        const screen = document.querySelector('.screen');
        if (!screen) return;
        
        // Hide other screens
        const homeScreen = document.getElementById('homeScreen');
        const screenContent = document.getElementById('screenContent');
        if (homeScreen) homeScreen.classList.add('hidden');
        if (screenContent) screenContent.classList.add('hidden');
        
        // Create camera container
        this.container = document.createElement('div');
        this.container.className = 'camera-container';
        this.container.innerHTML = `
            <div class="camera-viewfinder">
                <video id="cameraVideo" playsinline autoplay muted></video>
                <canvas id="cameraCanvas"></canvas>
            </div>
            <div class="camera-hint">
                OK Capture | ◀▶ Switch | Menu Settings | C Back
            </div>
        `;
        
        screen.appendChild(this.container);
        
        // Get elements
        this.rawVideo = document.getElementById('cameraVideo');
        this.displayCanvas = document.getElementById('cameraCanvas');
        this.displayCtx = this.displayCanvas.getContext('2d', { alpha: false });
        
        this.isActive = true;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // ✅ Enumerate cameras
        this.enumerateCameras();
    }
    
    async enumerateCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableCameras = devices.filter(d => d.kind === 'videoinput');
            console.log('📷 Available cameras:', this.availableCameras.length);
        } catch(e) {
            console.error('Failed to enumerate cameras:', e);
        }
    }
    
    resizeCanvas() {
        if (!this.displayCanvas) return;
        
        const viewfinder = document.querySelector('.camera-viewfinder');
        if (!viewfinder) return;
        
        const rect = viewfinder.getBoundingClientRect();
        this.displayCanvas.width = Math.round(rect.width * 3);
        this.displayCanvas.height = Math.round(rect.height * 3);
        this.displayCtx.imageSmoothingEnabled = false;
    }
    
    async startCamera() {
        this.stopCamera();
        
        const deviceId = this.availableCameras[this.currentCameraIndex]?.deviceId;
        
        const constraints = {
            audio: false,
            video: deviceId ? {
                deviceId: { exact: deviceId },
                width: { ideal: this.targetWidth },
                height: { ideal: this.targetHeight }
            } : {
                facingMode: { ideal: this.facing },
                width: { ideal: this.targetWidth },
                height: { ideal: this.targetHeight }
            }
        };
        
        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.rawVideo.srcObject = this.stream;
            this.rawVideo.muted = true;
            this.rawVideo.playsInline = true;
            await this.rawVideo.play();
            
            const track = this.stream.getVideoTracks()[0];
            const settings = track.getSettings();
            console.log('📷 Camera settings:', settings);
            
            this.startProcessing();
            
            console.log('✅ Camera started');
        } catch (err) {
            console.error('❌ Camera error:', err);           
            if (this.availableCameras.length <= 1) {
                console.log('📷 Only one camera available');
                return;
            }
            
            this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
            this.startCamera();
            
            //if (typeof playDTMF !== 'undefined') playDTMF('6');
            
            console.log('📷 Switched to camera', this.currentCameraIndex + 1, '/', this.availableCameras.length);            
                //alert('Cannot access camera: ' + err.message);
            }
    }
    
    stopCamera() {
        if (this.raf) {
            cancelAnimationFrame(this.raf);
            this.raf = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        
        if (this.rawVideo) {
            try {
                this.rawVideo.pause();
                this.rawVideo.srcObject = null;
            } catch(e) {}
        }
    }
    
    switchCamera() {
        if (this.availableCameras.length <= 1) {
            console.log('📷 Only one camera available');
            return;
        }
        
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
        this.startCamera();
        
        //if (typeof playDTMF !== 'undefined') playDTMF('6');
        
        console.log('📷 Switched to camera', this.currentCameraIndex + 1, '/', this.availableCameras.length);
    }
    
    startProcessing() {
        if (!this.rawVideo) return;
        if (this.raf) {
            cancelAnimationFrame(this.raf);
            this.raf = null;
        }
        
        const drawFrame = () => {
            if (!this.rawVideo || this.rawVideo.readyState < 2) {
                this.raf = requestAnimationFrame(drawFrame);
                return;
            }
            
            const dw = this.displayCanvas.width;
            const dh = this.displayCanvas.height;
            const vw = Math.max(8, Math.round(dw / this.pixelSize));
            const vh = Math.max(8, Math.round(dh / this.pixelSize));
            this.offCanvas.width = vw;
            this.offCanvas.height = vh;
            
            try {
                this.offCtx.drawImage(this.rawVideo, 0, 0, this.offCanvas.width, this.offCanvas.height);
            } catch (err) {}
            
            let img = this.offCtx.getImageData(0, 0, this.offCanvas.width, this.offCanvas.height);
            let data = img.data;
            
            this.applyColorAdjustments(data);
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i+1], b = data[i+2];
                const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                data[i] = data[i+1] = data[i+2] = gray;
            }
            this.offCtx.putImageData(img, 0, 0);
            
            this.displayCtx.imageSmoothingEnabled = false;
            this.displayCtx.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
            
            const scaleX = this.displayCanvas.width / this.offCanvas.width;
            const scaleY = this.displayCanvas.height / this.offCanvas.height;
            const scale = Math.min(scaleX, scaleY);
            const outW = Math.round(this.offCanvas.width * scale);
            const outH = Math.round(this.offCanvas.height * scale);
            const dx = Math.round((this.displayCanvas.width - outW) / 2);
            const dy = Math.round((this.displayCanvas.height - outH) / 2);
            
            this.displayCtx.drawImage(this.offCanvas, 0, 0, this.offCanvas.width, this.offCanvas.height, dx, dy, outW, outH);
            
            if (this.scanlines) {
                const lineH = Math.max(1, Math.round(scale / 4));
                this.displayCtx.fillStyle = 'rgba(0,0,0,0.08)';
                for (let y = dy; y < dy + outH; y += lineH * 2) {
                    this.displayCtx.fillRect(dx, y, outW, lineH);
                }
            }
            
            if (this.grain) {
                this.displayCtx.globalAlpha = 0.06;
                for (let i = 0; i < 100; i++) {
                    const gx = Math.random() * this.displayCanvas.width;
                    const gy = Math.random() * this.displayCanvas.height;
                    const s = Math.random() * 2;
                    const gcol = (Math.random() * 255) | 0;
                    this.displayCtx.fillStyle = `rgba(${gcol},${gcol},${gcol},1)`;
                    this.displayCtx.fillRect(gx, gy, s, s);
                }
                this.displayCtx.globalAlpha = 1;
            }
            
            this.raf = requestAnimationFrame(drawFrame);
        };
        
        this.raf = requestAnimationFrame(drawFrame);
    }
    
    applyColorAdjustments(data) {
        const c = this.contrast;
        const contrastFactor = (1 + c);
        const b = this.brightness * 255;
        const sat = this.saturation;
        const g = this.gamma;
        
        const gammaLUT = new Uint8ClampedArray(256);
        if (g !== 1) {
            for (let i = 0; i < 256; i++) {
                gammaLUT[i] = Math.min(255, Math.max(0, Math.pow(i / 255, 1 / g) * 255 + 0.5) | 0);
            }
        } else {
            for (let i = 0; i < 256; i++) gammaLUT[i] = i;
        }
        
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i], gg = data[i+1], bch = data[i+2];
            
            r = ((r - 128) * contrastFactor) + 128 + b;
            gg = ((gg - 128) * contrastFactor) + 128 + b;
            bch = ((bch - 128) * contrastFactor) + 128 + b;
            
            r = r < 0 ? 0 : (r > 255 ? 255 : r);
            gg = gg < 0 ? 0 : (gg > 255 ? 255 : gg);
            bch = bch < 0 ? 0 : (bch > 255 ? 255 : bch);
            
            const luma = 0.2126 * r + 0.7152 * gg + 0.0722 * bch;
            if (sat !== 0) {
                const sFactor = 1 + sat;
                r = luma + (r - luma) * sFactor;
                gg = luma + (gg - luma) * sFactor;
                bch = luma + (bch - luma) * sFactor;
            } else {
                r = gg = bch = luma;
            }
            
            r = gammaLUT[Math.max(0, Math.min(255, Math.round(r)))];
            gg = gammaLUT[Math.max(0, Math.min(255, Math.round(gg)))];
            bch = gammaLUT[Math.max(0, Math.min(255, Math.round(bch)))];
            
            data[i] = r;
            data[i+1] = gg;
            data[i+2] = bch;
        }
    }
    
    async capturePhoto() {
        if (!this.rawVideo || this.rawVideo.readyState < 2) {
            alert('Camera not ready');
            return;
        }
        
        // ✅ Handle timer
        if (this.timer > 0) {
            console.log(`⏱️ Timer: ${this.timer} seconds`);
            
            // Show countdown overlay
            const countdown = document.createElement('div');
            countdown.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:72px;color:white;font-family:sans-serif;filter:opacity(0.6);font-weight:bold;text-shadow:2px 2px 4px black;z-index:1000;';
            countdown.textContent = this.timer;
            this.container.querySelector('.camera-viewfinder').appendChild(countdown);
            
            let remaining = this.timer;
            const countdownInterval = setInterval(() => {
                remaining--;
                if (remaining > 0) {
                    countdown.textContent = remaining;
                    //if (typeof playDTMF !== 'undefined') playDTMF('5');
                } else {
                    clearInterval(countdownInterval);
                    countdown.remove();
                    this.capturePhotoNow();
                }
            }, 1000);
            
            return;
        }
        
        // No timer - capture immediately
        this.capturePhotoNow();
    }
   
    
    async capturePhotoNow() {
        if (!this.rawVideo || this.rawVideo.readyState < 2) {
            return;
        }
        playShutter();
        //const retroImage = this.displayCanvas.toDataURL('image/png');
        const retroImage = this.displayCanvas.toDataURL('image/jpeg', 0.65);
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = this.rawVideo.videoWidth;
        fullCanvas.height = this.rawVideo.videoHeight;
        const fullCtx = fullCanvas.getContext('2d');
        fullCtx.drawImage(this.rawVideo, 0, 0);
        const fullImage = fullCanvas.toDataURL('image/jpeg', 0.80);
        
        const timestamp = Date.now();
        const photo = {
            id: timestamp,
            retro: retroImage,
            full: fullImage,
            date: new Date().toISOString(),
            timestamp: timestamp
        };
        
        // ✅ Save to IndexedDB instead of localStorage
        try {
            await window.imageIndexedDB.saveDCIMPhoto(photo);
            console.log('📸 Photo captured and saved to IndexedDB:', timestamp);
        } catch (error) {
            console.error('❌ Failed to save photo:', error);
            alert('Failed to save photo');
            return;
        }
        
        const flash = document.createElement('div');
        flash.style.cssText = `
            position:absolute;
            top:0;
            left:0;
            right:0;
            bottom:0;
            background: rgba(0, 0, 0, 0.85);
            pointer-events:none;
            opacity: 0;
            transition: opacity 120ms ease-out;
        `;
        const vf = this.container.querySelector('.camera-viewfinder');
        vf.appendChild(flash);

        requestAnimationFrame(() => {
        flash.style.opacity = '1';
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 150);
        }, 80);
        });
        
        //if (typeof playDTMF !== 'undefined') playDTMF('5');
    }
    
    // ✅ NEW: Show settings menu
    showSettings() {
        if (this.settingsOpen) return;
        
        this.settingsOpen = true;
        this.settingsIndex = 0;
        
        // Build settings items
        this.settingsItems = [
            { id: 'quality', icon: '📸', name: 'Quality', value: this.quality.toUpperCase() },
            { id: 'scanlines', icon: '📺', name: 'Scanlines', value: this.scanlines ? 'ON' : 'OFF' },
            { id: 'grain', icon: '🎞️', name: 'Film Grain', value: this.grain ? 'ON' : 'OFF' },
            { id: 'timer', icon: '⏱️', name: 'Timer', value: this.timer === 0 ? 'OFF' : `${this.timer}s` }
        ];
        
        // Create settings dialog
        const dialog = document.createElement('div');
        dialog.className = 'app-dialog camera-settings-dialog';
        dialog.style.display = 'block';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'dialog-title';
        titleDiv.textContent = 'Camera Settings';
        dialog.appendChild(titleDiv);
        
        const list = document.createElement('div');
        list.className = 'dialog-list settings-list';
        
        this.settingsItems.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dialog-list-item settings-item';
            if (index === this.settingsIndex) itemDiv.classList.add('selected');
            itemDiv.setAttribute('data-index', index);
            
            const icon = document.createElement('span');
            icon.className = 'item-icon';
            icon.textContent = item.icon;
            
            const name = document.createElement('span');
            name.className = 'item-name';
            name.textContent = item.name;
            
            const value = document.createElement('span');
            value.className = 'item-value';
            value.textContent = item.value;
            
            itemDiv.appendChild(icon);
            itemDiv.appendChild(name);
            itemDiv.appendChild(value);
            
            list.appendChild(itemDiv);
        });
        
        dialog.appendChild(list);
        
        const hint = document.createElement('div');
        hint.className = 'dialog-hint';
        hint.textContent = '▲▼ Navigate | OK Select | C/Menu Back';
        dialog.appendChild(hint);
        
        const screen = document.querySelector('.screen');
        screen.appendChild(dialog);
        
        console.log('⚙️ Camera settings opened');
        
        //if (typeof playDTMF !== 'undefined') playDTMF('5');
    }
    
    // ✅ NEW: Close settings menu
    closeSettings() {
        if (!this.settingsOpen) return;
        
        this.settingsOpen = false;
        
        const dialog = document.querySelector('.camera-settings-dialog');
        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
        
        console.log('⚙️ Camera settings closed');
    }
    
    // ✅ NEW: Navigate settings
    navigateSettings(direction) {
        if (!this.settingsOpen) return;
        
        const previousIndex = this.settingsIndex;
        
        if (direction === 'up') {
            this.settingsIndex = (this.settingsIndex - 1 + this.settingsItems.length) % this.settingsItems.length;
        } else if (direction === 'down') {
            this.settingsIndex = (this.settingsIndex + 1) % this.settingsItems.length;
        }
        
        const items = document.querySelectorAll('.camera-settings-dialog .dialog-list-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.settingsIndex);
        });
        
        const wrappedToStart = (direction === 'up' && previousIndex === 0);
        const wrappedToEnd = (direction === 'down' && this.settingsIndex === 0);
        
        const container = document.querySelector('.camera-settings-dialog .dialog-list');
        const selectedElement = items[this.settingsIndex];
        
        if (container && selectedElement) {
            const itemTop = selectedElement.offsetTop;
            const itemHeight = selectedElement.offsetHeight;
            const containerHeight = container.clientHeight;
            
            if (wrappedToStart) {
                container.scrollTop = container.scrollHeight;
            } else if (wrappedToEnd) {
                container.scrollTop = 0;
            } else {
                const targetScroll = itemTop - (containerHeight / 2) + (itemHeight / 2);
                container.scrollTop = Math.max(0, Math.min(targetScroll, container.scrollHeight - containerHeight));
            }
        }
        
        /* if (typeof playDTMF !== 'undefined') playDTMF(direction === 'up' ? '2' : '8'); */
    }
    
    // ✅ NEW: Select settings item
    selectSettingsItem() {
        if (!this.settingsOpen) return;
        
        const selectedItem = this.settingsItems[this.settingsIndex];
        
        //if (typeof playDTMF !== 'undefined') playDTMF('5');
        
        switch(selectedItem.id) {
            case 'quality':
                const qualities = ['high', 'medium', 'low'];
                const currentIndex = qualities.indexOf(this.quality);
                this.quality = qualities[(currentIndex + 1) % qualities.length];
                this.updateFilterSettings();
                this.updateSettingsValue(this.settingsIndex, this.quality.toUpperCase());
                // Restart camera with new quality
                this.startCamera();
                console.log('📸 Quality changed to:', this.quality);
                break;
                
            case 'scanlines':
                this.scanlines = !this.scanlines;
                this.updateSettingsValue(this.settingsIndex, this.scanlines ? 'ON' : 'OFF');
                console.log('📺 Scanlines:', this.scanlines);
                break;
                
            case 'grain':
                this.grain = !this.grain;
                this.updateSettingsValue(this.settingsIndex, this.grain ? 'ON' : 'OFF');
                console.log('🎞️ Film grain:', this.grain);
                break;
                
            case 'timer':
                const timers = [0, 3, 5, 10];
                const currentTimerIndex = timers.indexOf(this.timer);
                this.timer = timers[(currentTimerIndex + 1) % timers.length];
                this.updateSettingsValue(this.settingsIndex, this.timer === 0 ? 'OFF' : `${this.timer}s`);
                console.log('⏱️ Timer:', this.timer);
                break;
        }
    }
    
    // ✅ Helper: Update value without full refresh
    updateSettingsValue(itemIndex, newValue) {
        const dialog = document.querySelector('.camera-settings-dialog');
        if (!dialog) return;
        
        const item = dialog.querySelector(`[data-index="${itemIndex}"] .item-value`);
        if (item) {
            item.textContent = newValue;
        }
        
        if (this.settingsItems[itemIndex]) {
            this.settingsItems[itemIndex].value = newValue;
        }
    }
}
// Paraméterezhető shutter hang — tartalmaz audioContext resume-ot és hibalogot
window.playShutter = async function playShutter({ clickLevel = 1.0, noiseLength = 0.06, bright = 1 } = {}) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw new Error('No Web Audio API available in this browser.');

    const ctx = new AudioCtx();

    // biztosítsuk, hogy a context aktív legyen (user gesture-kötött helyeken szükséges)
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
        // engedély hiány lehet — továbbpróbálkozunk, de jelezzük
      }
    }

    const now = ctx.currentTime;

    // egyszerű click (oscillator) – ha más nincs, legalább ez legyen hallható
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 2500 + (bright * 500);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(Math.max(0.05, Math.min(1.5, clickLevel)), now + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 6000 + bright * 2000;

    osc.connect(g);
    g.connect(lp);
    lp.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);

    // Optional: gentle noise body (non-critical — may be muted on some devices)
    try {
      const sampleRate = ctx.sampleRate;
      const len = Math.max(256, Math.floor(sampleRate * noiseLength));
      const buf = ctx.createBuffer(1, len, sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2000 + bright * 1000;
      bp.Q.value = 1.2;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.linearRampToValueAtTime(0.25 * Math.min(1.2, clickLevel), now + 0.002);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + noiseLength + 0.02);
      s.connect(bp);
      bp.connect(ng);
      ng.connect(ctx.destination);
      s.start(now + 0.001);
      s.stop(now + noiseLength + 0.02);
    } catch (e) {
      // noise optional — ha nem megy, nem kritikus
      console.warn('playShutter: noise part failed:', e);
    }

    // log success
    console.log('playShutter: fired', { clickLevel, noiseLength, bright });
  } catch (err) {
    console.error('playShutter failed:', err);
  }
};

// Initialize
window.nokiaCamera = new NokiaCamera();
