// frontier_game.js
// Frontier: Elite II Game Module
// Based on DOOM Easter Egg implementation

/**
 * IndexedDB Helper Class for storing binary data like save games.
 */
if (typeof IndexedDbHelper === 'undefined') {
    class IndexedDbHelper {
        constructor(dbName, storeName) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.db = null;
    }

    async openDb() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = (event) => reject("IndexedDB error: " + (event.target && event.target.errorCode));
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    }

    async saveData(filename, data) {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(data, filename);
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject('Failed to save data: ' + (event.target && event.target.errorCode));
            } catch (e) {
                reject(e);
            }
        });
    }

    async loadData(filename) {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(filename);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = (event) => reject('Failed to load data: ' + (event.target && event.target.errorCode));
            } catch (e) {
                reject(e);
            }
        });
    }
}
}

/**
 * Frontier: Elite II Game Module
 */
class FrontierEliteGame {
    constructor() {
        this.active = false;
        this.dosInstance = null;
        this.ciInstance = null;
        this.container = null;
        this.lastEscTime = 0;
        this.db = new IndexedDbHelper('FrontierSavesDB', 'savefiles');
        
        // Frontier: Elite II specific key mappings
        this.keyMap = {
            up: 38,        // Arrow Up
            down: 40,      // Arrow Down
            left: 37,      // Arrow Left
            right: 39,     // Arrow Right
            enter: 13,
            esc: 27,
            space: 32,
            tab: 9,
            // Function keys
            f1: 112,  f2: 113,  f3: 114,  f4: 115,
            f5: 116,  f6: 117,  f7: 118,  f8: 119,
            f9: 120,  f10: 121,
            // Number keys
            key0: 48, key1: 49, key2: 50, key3: 51, key4: 52,
            key5: 53, key6: 54, key7: 55, key8: 56, key9: 57,
            // Letter keys for common actions
            keyA: 65, // Accelerate
            keyD: 68, // Decelerate
            keyS: 83, // Speed
            keyJ: 74, // Jump
            keyH: 72, // Hyperspace
            keyT: 84, // Trading
            keyM: 77  // Map
        };

        this.dpadListeners = null;
        this.intervalIds = {
            up: null,
            down: null,
            left: null,
            right: null
        };
        this.pressedButtons = {
            up: false,
            down: false,
            left: false,
            right: false
        };
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    async activate() {
        console.log('🚀 Frontier: Elite II Activated!');
        this.active = true;
        this.createContainer();
        this.showMessage('Loading Frontier: Elite II...', 'Please wait...');

        try {
            await this.loadJsDos();
            await this.initGame();
            this.setupControls();
            console.log('✅ Frontier: Elite II loaded successfully!');
        } catch (error) {
            console.error('❌ Frontier: Elite II loading error:', error);
            this.showMessage('Failed to load', (error && error.message) ? error.message : String(error));
            setTimeout(() => this.deactivate(), 3000);
        }
    }

    async deactivate() {
        console.log('🚀 Frontier: Elite II Deactivating...');
        this.active = false;

        if (!this.dosInstance && !this.ciInstance) {
            console.warn('No dos/ci instances found; performing UI cleanup only.');
            try { this._cleanupUI(); } catch(e){ console.warn('Cleanup error', e); }
            return;
        }

        try {
            this._cleanupUI();
        } catch (e) {
            console.warn('Cleanup UI error:', e);
        }

        console.log('✅ Frontier: Elite II Deactivated');
    }

    _cleanupUI() {
        try {
            if (this.stopAllKeys) {
                this.stopAllKeys();
            }
            
            this.removeDpadListeners();
            
            this.dosInstance = null;
            this.ciInstance = null;
            
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
                this.container = null;
            }
            
            setTimeout(() => {
                const screenContent = document.getElementById('screenContent');
                const menuScreen = document.getElementById('menuScreen');
                if (screenContent) screenContent.style.display = 'block';
                if (menuOpen && menuScreen) {
                    menuScreen.style.display = 'block';
                    menuScreen.classList.add('active');
                }
            }, 50);
            
            this.removeKeyboardListener();
            
            setTimeout(() => {
                if (typeof window.reinitializeDpadTouch === 'function') {
                    window.reinitializeDpadTouch();
                    console.log('✅ D-pad touch listeners reinitialized after Frontier cleanup');
                }
            }, 100);
        } catch (e) {
            console.warn('Cleanup error:', e);
        }
    }

    async loadJsDos() {
        if (window.Dos) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js-dos.com/6.22/current/js-dos.js';
            script.onload = () => setTimeout(() => window.Dos ? resolve() : reject(new Error('Dos object not found')), 100);
            script.onerror = () => reject(new Error('Failed to load js-dos library'));
            document.head.appendChild(script);
        });
    }

    async initGame() {
        const canvas = document.getElementById('frontier-dosbox');
        if (!canvas) throw new Error('Canvas element not found');

        const dos = await Dos(canvas, { wdosboxUrl: "https://js-dos.com/6.22/current/wdosbox.js" });
        this.dosInstance = dos;

        this.showMessage('Extracting Frontier: Elite II...', 'Almost there...');
        
        // Load local Frontier zip file - frontier.exe is directly in root
        await this.dosInstance.fs.extract("./games/frontier/frontier.zip");

        this.showMessage('Initializing...', 'Please wait...');
        const ci = await this.dosInstance.main(["-c", "echo Ready"]);
        this.ciInstance = ci;
        
        await this.sleep(300);
        
        this.showMessage('Starting Frontier: Elite II...', 'Get ready!');
        await this.sleep(300);
        
        // No CD needed - frontier.exe is in root
        this.typeCommand("frontier");
        
        await this.sleep(500);
        this.hideMessage();
    }

    typeCommand(cmd) {
        const upperCmd = cmd.toUpperCase();
        
        for (const char of upperCmd) {
            const code = char.charCodeAt(0);
            this.sendKey(code, true);
            this.sendKey(code, false);
        }
        this.sendKey(13, true);  // Enter
        this.sendKey(13, false);
    }

    setupControls() {
        this.intervalIds = {
            up: null,
            down: null,
            left: null,
            right: null
        };

        this.pressedButtons = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        const startContinuousKey = (direction, keyCode, dtmfKey) => {
            if (typeof playDTMF !== 'undefined') {
                playDTMF(dtmfKey);
            }
            if (this.intervalIds[direction]) return;
            this.pressedButtons[direction] = true;
            this.sendKey(keyCode, true);
            this.intervalIds[direction] = setInterval(() => {
                if (!this.pressedButtons[direction]) {
                    stopContinuousKey(direction, keyCode);
                    return;
                }
                this.sendKey(keyCode, false);
                setTimeout(() => {
                    if (this.pressedButtons[direction]) {
                        this.sendKey(keyCode, true);
                    }
                }, 50);
            }, 100);
        };

        const stopContinuousKey = (direction, keyCode) => {
            this.pressedButtons[direction] = false;
            if (this.intervalIds[direction]) {
                clearInterval(this.intervalIds[direction]);
                this.intervalIds[direction] = null;
            }
            this.sendKey(keyCode, false);
        };

        const stopAllKeys = () => {
            stopContinuousKey('up', this.keyMap.up);
            stopContinuousKey('down', this.keyMap.down);
            stopContinuousKey('left', this.keyMap.left);
            stopContinuousKey('right', this.keyMap.right);
        };

        window.handleNavUp = () => {};
        window.handleNavDown = () => {};
        window.handleNavLeft = () => {};
        window.handleNavRight = () => {};

        const dpadUp = document.querySelector('.dpad-up');
        const dpadDown = document.querySelector('.dpad-down');
        const dpadLeft = document.querySelector('.dpad-left');
        const dpadRight = document.querySelector('.dpad-right');

        this.dpadListeners = {
            up: { element: dpadUp, handlers: {} },
            down: { element: dpadDown, handlers: {} },
            left: { element: dpadLeft, handlers: {} },
            right: { element: dpadRight, handlers: {} }
        };
        
        if (dpadUp) {
            this.dpadListeners.up.handlers.mousedown = () => startContinuousKey('up', this.keyMap.up, '2');
            this.dpadListeners.up.handlers.mouseup = () => stopContinuousKey('up', this.keyMap.up);
            this.dpadListeners.up.handlers.mouseleave = () => stopContinuousKey('up', this.keyMap.up);
            this.dpadListeners.up.handlers.touchstart = (e) => { e.preventDefault(); startContinuousKey('up', this.keyMap.up, '2'); };
            this.dpadListeners.up.handlers.touchend = (e) => { e.preventDefault(); stopContinuousKey('up', this.keyMap.up); };
            this.dpadListeners.up.handlers.touchcancel = (e) => { e.preventDefault(); stopContinuousKey('up', this.keyMap.up); };
            
            dpadUp.addEventListener('mousedown', this.dpadListeners.up.handlers.mousedown);
            dpadUp.addEventListener('mouseup', this.dpadListeners.up.handlers.mouseup);
            dpadUp.addEventListener('mouseleave', this.dpadListeners.up.handlers.mouseleave);
            dpadUp.addEventListener('touchstart', this.dpadListeners.up.handlers.touchstart, { passive: false });
            dpadUp.addEventListener('touchend', this.dpadListeners.up.handlers.touchend, { passive: false });
            dpadUp.addEventListener('touchcancel', this.dpadListeners.up.handlers.touchcancel, { passive: false });
        }

        if (dpadDown) {
            this.dpadListeners.down.handlers.mousedown = () => startContinuousKey('down', this.keyMap.down, '8');
            this.dpadListeners.down.handlers.mouseup = () => stopContinuousKey('down', this.keyMap.down);
            this.dpadListeners.down.handlers.mouseleave = () => stopContinuousKey('down', this.keyMap.down);
            this.dpadListeners.down.handlers.touchstart = (e) => { e.preventDefault(); startContinuousKey('down', this.keyMap.down, '8'); };
            this.dpadListeners.down.handlers.touchend = (e) => { e.preventDefault(); stopContinuousKey('down', this.keyMap.down); };
            this.dpadListeners.down.handlers.touchcancel = (e) => { e.preventDefault(); stopContinuousKey('down', this.keyMap.down); };
            
            dpadDown.addEventListener('mousedown', this.dpadListeners.down.handlers.mousedown);
            dpadDown.addEventListener('mouseup', this.dpadListeners.down.handlers.mouseup);
            dpadDown.addEventListener('mouseleave', this.dpadListeners.down.handlers.mouseleave);
            dpadDown.addEventListener('touchstart', this.dpadListeners.down.handlers.touchstart, { passive: false });
            dpadDown.addEventListener('touchend', this.dpadListeners.down.handlers.touchend, { passive: false });
            dpadDown.addEventListener('touchcancel', this.dpadListeners.down.handlers.touchcancel, { passive: false });
        }

        if (dpadLeft) {
            this.dpadListeners.left.handlers.mousedown = () => startContinuousKey('left', this.keyMap.left, '4');
            this.dpadListeners.left.handlers.mouseup = () => stopContinuousKey('left', this.keyMap.left);
            this.dpadListeners.left.handlers.mouseleave = () => stopContinuousKey('left', this.keyMap.left);
            this.dpadListeners.left.handlers.touchstart = (e) => { e.preventDefault(); startContinuousKey('left', this.keyMap.left, '4'); };
            this.dpadListeners.left.handlers.touchend = (e) => { e.preventDefault(); stopContinuousKey('left', this.keyMap.left); };
            this.dpadListeners.left.handlers.touchcancel = (e) => { e.preventDefault(); stopContinuousKey('left', this.keyMap.left); };
            
            dpadLeft.addEventListener('mousedown', this.dpadListeners.left.handlers.mousedown);
            dpadLeft.addEventListener('mouseup', this.dpadListeners.left.handlers.mouseup);
            dpadLeft.addEventListener('mouseleave', this.dpadListeners.left.handlers.mouseleave);
            dpadLeft.addEventListener('touchstart', this.dpadListeners.left.handlers.touchstart, { passive: false });
            dpadLeft.addEventListener('touchend', this.dpadListeners.left.handlers.touchend, { passive: false });
            dpadLeft.addEventListener('touchcancel', this.dpadListeners.left.handlers.touchcancel, { passive: false });
        }

        if (dpadRight) {
            this.dpadListeners.right.handlers.mousedown = () => startContinuousKey('right', this.keyMap.right, '6');
            this.dpadListeners.right.handlers.mouseup = () => stopContinuousKey('right', this.keyMap.right);
            this.dpadListeners.right.handlers.mouseleave = () => stopContinuousKey('right', this.keyMap.right);
            this.dpadListeners.right.handlers.touchstart = (e) => { e.preventDefault(); startContinuousKey('right', this.keyMap.right, '6'); };
            this.dpadListeners.right.handlers.touchend = (e) => { e.preventDefault(); stopContinuousKey('right', this.keyMap.right); };
            this.dpadListeners.right.handlers.touchcancel = (e) => { e.preventDefault(); stopContinuousKey('right', this.keyMap.right); };
            
            dpadRight.addEventListener('mousedown', this.dpadListeners.right.handlers.mousedown);
            dpadRight.addEventListener('mouseup', this.dpadListeners.right.handlers.mouseup);
            dpadRight.addEventListener('mouseleave', this.dpadListeners.right.handlers.mouseleave);
            dpadRight.addEventListener('touchstart', this.dpadListeners.right.handlers.touchstart, { passive: false });
            dpadRight.addEventListener('touchend', this.dpadListeners.right.handlers.touchend, { passive: false });
            dpadRight.addEventListener('touchcancel', this.dpadListeners.right.handlers.touchcancel, { passive: false });
        }

        document.addEventListener('mouseup', stopAllKeys);
        document.addEventListener('mouseleave', stopAllKeys);
        document.addEventListener('touchend', stopAllKeys, { passive: false });
        document.addEventListener('touchcancel', stopAllKeys, { passive: false });
        window.addEventListener('blur', stopAllKeys);

        window.handleOK = () => {
            if (typeof playDTMF !== 'undefined') playDTMF('5');
            this.pressAndReleaseKey(this.keyMap.enter);
        };

        window.handleCallStart = () => {
            if (typeof playDTMF !== 'undefined') playDTMF('5');
            this.pressAndReleaseKey(this.keyMap.keyA); // Accelerate
        };

        window.handleCallEnd = () => {
            if (typeof playDTMF !== 'undefined') playDTMF('1');
            this.pressAndReleaseKey(this.keyMap.keyD); // Decelerate
        };

        const originalHandleKey = window.handleKey;
        window.handleKey = (key) => {
            if (this.active) {
                if (key === '0') {
                    this.pressAndReleaseKey(this.keyMap.space);
                } else if (key >= '1' && key <= '9') {
                    const numKey = this.keyMap['key' + key];
                    if (numKey) this.pressAndReleaseKey(numKey);
                }
            } else if (originalHandleKey) {
                originalHandleKey(key);
            }
        };

        window.handleMenu = () => {
            if (typeof playDTMF !== 'undefined') playDTMF('5');
            if (this.active) {
                this.pressAndReleaseKey(this.keyMap.esc);
                
                setTimeout(() => {
                    if (this.active) {
                        this.deactivate();
                    }
                }, 500);
            } else if (this.originalHandlers && this.originalHandlers.handleMenu) {
                this.originalHandlers.handleMenu();
            }
        };

        this.keyboardListener = (e) => {
            if (!this.active) return;
            e.preventDefault();
            e.stopPropagation();

            const keyMap = {
                'ArrowUp': this.keyMap.up,
                'ArrowDown': this.keyMap.down,
                'ArrowLeft': this.keyMap.left,
                'ArrowRight': this.keyMap.right,
                ' ': this.keyMap.space,
                'Enter': this.keyMap.enter,
                'Escape': this.keyMap.esc,
                'Tab': this.keyMap.tab,
                'a': this.keyMap.keyA,
                'A': this.keyMap.keyA,
                'd': this.keyMap.keyD,
                'D': this.keyMap.keyD,
                's': this.keyMap.keyS,
                'S': this.keyMap.keyS,
                'j': this.keyMap.keyJ,
                'J': this.keyMap.keyJ,
                'h': this.keyMap.keyH,
                'H': this.keyMap.keyH,
                't': this.keyMap.keyT,
                'T': this.keyMap.keyT,
                'm': this.keyMap.keyM,
                'M': this.keyMap.keyM
            };

            const gameKey = keyMap[e.key];
            if (gameKey) this.sendKey(gameKey, e.type === 'keydown');

            if (e.key === 'Escape' && e.type === 'keydown') {
                const now = Date.now();
                if (now - this.lastEscTime < 500) {
                    this.deactivate();
                } else {
                    this.pressAndReleaseKey(this.keyMap.esc);
                }
                this.lastEscTime = now;
                return;
            }
        };

        document.addEventListener('keydown', this.keyboardListener);
        document.addEventListener('keyup', this.keyboardListener);
        
        this.stopAllKeys = stopAllKeys;
    }

    removeDpadListeners() {
        if (!this.dpadListeners) return;
        
        for (const direction in this.dpadListeners) {
            const { element, handlers } = this.dpadListeners[direction];
            if (!element || !handlers) continue;
            
            if (handlers.mousedown) element.removeEventListener('mousedown', handlers.mousedown);
            if (handlers.mouseup) element.removeEventListener('mouseup', handlers.mouseup);
            if (handlers.mouseleave) element.removeEventListener('mouseleave', handlers.mouseleave);
            
            if (handlers.touchstart) element.removeEventListener('touchstart', handlers.touchstart, { passive: false });
            if (handlers.touchend) element.removeEventListener('touchend', handlers.touchend, { passive: false });
            if (handlers.touchcancel) element.removeEventListener('touchcancel', handlers.touchcancel, { passive: false });
        }
        
        this.dpadListeners = null;
        console.log('✅ D-pad Frontier listeners removed');
    }

    removeKeyboardListener() {
        if (this.stopAllKeys) {
            this.stopAllKeys();
        }
        
        if (this.keyboardListener) {
            document.removeEventListener('keydown', this.keyboardListener);
            document.removeEventListener('keyup', this.keyboardListener);
            this.keyboardListener = null;
        }
    }

    pressAndReleaseKey(keyCode) {
        this.sendKey(keyCode, true);
        setTimeout(() => this.sendKey(keyCode, false), 100);
    }

    sendKey(keyCode, pressed) {
        try {
            const ci = this.ciInstance || this.dosInstance;
            if (!ci) return;
            if (typeof ci.simulateKeyEvent === 'function') {
                ci.simulateKeyEvent(keyCode, pressed);
                return;
            }
            if (typeof ci.keyDown === 'function' || typeof ci.keyUp === 'function') {
                if (pressed && typeof ci.keyDown === 'function') ci.keyDown(keyCode);
                if (!pressed && typeof ci.keyUp === 'function') ci.keyUp(keyCode);
                return;
            }
            if (this.dosInstance && this.dosInstance.keyboard && typeof this.dosInstance.keyboard.sendKey === 'function') {
                this.dosInstance.keyboard.sendKey(keyCode, pressed);
                return;
            }
        } catch (error) {
            console.error('Error sending key:', error);
        }
    }

    createContainer() {
        const screenContent = document.getElementById('screenContent');
        const menuScreen = document.getElementById('menuScreen');
        if (screenContent) screenContent.style.display = 'none';
        if (menuScreen) menuScreen.style.display = 'none';

        const screen = document.querySelector('.screen');
        if (!screen) {
            console.error('Nokia screen not found!');
            return;
        }

        this.container = document.createElement('div');
        this.container.id = 'frontier-container';
        this.container.innerHTML = `<div id="frontier-message"><div class="frontier-message-title"></div><div class="frontier-message-text"></div></div><canvas id="frontier-dosbox"></canvas>`;
        screen.appendChild(this.container);
    }

    showMessage(title, text) {
        const msgTitle = document.querySelector('#frontier-message .frontier-message-title');
        const msgText = document.querySelector('#frontier-message .frontier-message-text');
        if (msgTitle) msgTitle.textContent = title;
        if (msgText) msgText.textContent = text;
    }

    hideMessage() {
        const messageEl = document.getElementById('frontier-message');
        if (messageEl) messageEl.style.display = 'none';
    }

    isActive() {
        return this.active;
    }
}

// Create global instance
window.frontierEliteGame = new FrontierEliteGame();

console.log('🚀 Frontier: Elite II module loaded');
