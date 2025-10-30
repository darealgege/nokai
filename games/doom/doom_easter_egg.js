// doom_easter_egg.js
// Teljes, beilleszthető fájl — tartalmazza az IndexedDB segédet és a teljes DoomEasterEgg osztályt.
// Illeszd be a projektedbe, cseréld le a korábbi fájlt.

/**
 * IndexedDB Helper Class for storing binary data like save games.
 */
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


/**
 * DOOM Easter Egg Module
 */
class DoomEasterEgg {
    constructor() {
        this.active = false;
        this.dpadPressCount = 0;
        this.lastDpadPressTime = 0;
        this.dpadPressTimeout = 2000;
        this.manuallyExitedGame = false; // Flag: true ha a játékból már kiléptünk DOS promptra

        // Instances
        this.dosInstance = null; // the factory / Dos() returned object (may contain fs, run, main, etc.)
        this.ciInstance = null;  // the command interface (returned by run() / main()) - used to control running app

        this.container = null;
        this.lastEscTime = 0;
        this.menuPressTimer = null;
        this.db = new IndexedDbHelper('DoomSavesDB', 'savefiles');
        this.saveFileNames = [
            'DEFAULT.CFG',
            ...Array.from({ length: 10 }, (_, i) => `DOOMSAV${i}.DSG`)
        ];
        this.keyMap = {
            up: 38,
            down: 40,
            left: 37,
            right: 39,
            fire: 83,
            space: 87,
            enter: 13,
            y: 89,
            n: 78,
            esc: 27,
            weapon1: 49, weapon2: 50, weapon3: 51, weapon4: 52,
            weapon5: 53, weapon6: 54, weapon7: 55, weapon8: 56
        };

        // For internal diagnostics (don't spam)
        this._fsLogged = false;
    }

    // ----------------- Utility helpers -----------------
    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // Find persist-like function in available objects
    findPersistFunction() {
        const candidates = [
            this.ciInstance,
            this.dosInstance,
            (this.dosInstance && this.dosInstance.fs)
        ];
        for (const obj of candidates) {
            if (!obj) continue;
            if (typeof obj.persist === 'function') return obj.persist.bind(obj);
            if (typeof obj.save === 'function') return obj.save.bind(obj);
            if (typeof obj.bundle === 'function') return obj.bundle.bind(obj);
        }
        return null;
    }

    // Find engine exit function if present
    findExitFunction() {
        const candidates = [this.ciInstance, this.dosInstance];
        for (const obj of candidates) {
            if (!obj) continue;
            if (typeof obj.exit === 'function') return obj.exit.bind(obj);
            if (typeof obj.stop === 'function') return obj.stop.bind(obj);
            if (typeof obj.kill === 'function') return obj.kill.bind(obj);
        }
        return null;
    }


    async listFs(path = '/') {
        const fs = (this.ciInstance && this.ciInstance.fs) || (this.dosInstance && this.dosInstance.fs) || (this.dosInstance && this.dosInstance.FS);
        if (!fs) {
            console.warn('listFs: no fs object available');
            return null;
        }

        // If fs.readdir exists (async)
        try {
            if (typeof fs.readdir === 'function') {
                const entries = await fs.readdir(path).catch(()=>null);
                console.log(`FS listing for ${path}:`, entries);
                // attempt to recurse shallowly for directories
                if (entries && entries.length) {
                    for (const e of entries) {
                        try {
                            const childPath = (path === '/' ? '' : path) + '/' + e;
                            // don't recurse into '.' '..'
                            if (e === '.' || e === '..') continue;
                            // try to stat to decide if directory
                            if (typeof fs.stat === 'function') {
                                const st = await fs.stat(childPath).catch(()=>null);
                                if (st && (st.isDirectory || st.type === 16384 || st.mode && (st.mode & 0o40000))) {
                                    // directory-like -> list one level deep
                                    const inner = await fs.readdir(childPath).catch(()=>null);
                                    console.log(`  ${childPath}/ ->`, inner);
                                }
                            }
                        } catch(e) { /* ignore per-entry errors */ }
                    }
                }
                return entries;
            }
        } catch (e) { console.debug('listFs: fs.readdir failed', e); }

        // Try sync variant
        try {
            if (typeof fs.readdirSync === 'function') {
                const entries = fs.readdirSync(path);
                console.log(`FS listing (sync) for ${path}:`, entries);
                return entries;
            }
        } catch (e) { console.debug('listFs: fs.readdirSync failed', e); }

        // Emscripten FS object
        try {
            if (fs && fs.readdir && typeof fs.readdir === 'function') {
                const entries = await fs.readdir(path);
                console.log(`FS listing ambiguous for ${path}:`, entries);
                return entries;
            }
        } catch (e) { /* ignore */ }

        console.warn('listFs: no supported readdir found for FS object');
        return null;
    }    

    // Flexible readFile that tries multiple fs variants and returns Uint8Array or null
    async flexibleReadFile(filePath) {
        if (!this.dosInstance && !this.ciInstance) return null;
        const fs = (this.ciInstance && this.ciInstance.fs) || (this.dosInstance && this.dosInstance.fs) || (this.dosInstance && this.dosInstance.FS);
        if (!fs) {
            console.warn('No fs object exposed on dosInstance/ciInstance.');
            return null;
        }

        if (!this._fsLogged) {
            try { console.log('Dos FS object keys:', Object.keys(fs)); } catch (e) {}
            this._fsLogged = true;
        }

        // try direct readFile
        try {
            if (typeof fs.readFile === 'function') {
                const data = await fs.readFile(filePath).catch(()=>null);
                if (data && data.length) return data;
            }
        } catch (e) { console.debug('flexibleReadFile: fs.readFile failed', e); }

        // try read() returning object/buffer
        try {
            if (typeof fs.read === 'function') {
                const res = await fs.read(filePath).catch(()=>null);
                if (res) {
                    if (res.buffer) return new Uint8Array(res.buffer);
                    if (res instanceof Uint8Array) return res;
                    if (res.data) return res.data;
                }
            }
        } catch (e) { console.debug('flexibleReadFile: fs.read failed', e); }

        // try emscripten-like open/read/close
        try {
            if (typeof fs.open === 'function' && (typeof fs.readSync === 'function' || typeof fs.read === 'function')) {
                const fd = await fs.open(filePath, 'r').catch(()=>null);
                if (fd != null) {
                    const stat = await (fs.stat ? fs.stat(filePath).catch(()=>null) : Promise.resolve(null));
                    const size = (stat && (stat.size || stat.len)) || 0;
                    const buffer = new Uint8Array(size || 0);
                    try {
                        if (typeof fs.read === 'function') {
                            await fs.read(fd, buffer, 0, buffer.length, 0);
                        } else if (typeof fs.readSync === 'function') {
                            fs.readSync(fd, buffer, 0, buffer.length, 0);
                        }
                    } catch(e) { /* ignore */ }
                    try { if (fs.close) await fs.close(fd); } catch(e) {}
                    if (buffer && buffer.length) return buffer;
                }
            }
        } catch (e) { console.debug('flexibleReadFile: open/read pattern failed', e); }

        // nothing worked
        console.warn('Could not read file (no supported fs API or file missing):', filePath);
        return null;
    }

    // Flexible writeFile that tries common APIs
async flexibleWriteFile(filePath, data) {
    if (!this.dosInstance && !this.ciInstance) {
        throw new Error('No dos/ci instance available for writing file.');
    }

    // Normalize to string path
    const normalize = p => (typeof p === 'string' ? p.replace(/\\/g, '/') : String(p));

    const nestedFs = (this.ciInstance && this.ciInstance.dos && this.ciInstance.dos.fs && this.ciInstance.dos.fs.fs)
                   || (this.dosInstance && this.dosInstance.dos && this.dosInstance.dos.fs && this.dosInstance.dos.fs.fs)
                   || null;

    const trySync = (fn, ...args) => {
        try { return fn(...args); } catch(e) { return { __err: e }; }
    };

    // Try nested FS (sync-style Emscripten-like object)
    if (nestedFs) {
        try {
            const p = normalize(filePath);
            // Ensure directory exists (try mkdir or mkdirTree if available)
            const dir = p.replace(/\/[^/]+$/, '');
            try {
                if (dir && typeof nestedFs.mkdirTree === 'function') nestedFs.mkdirTree(dir);
                else if (dir && typeof nestedFs.mkdir === 'function') {
                    try { nestedFs.mkdir(dir); } catch(e){ /* ignore if exists */ }
                }
            } catch(e){ /* ignore */ }

            if (typeof nestedFs.writeFile === 'function') {
                // some implementations accept (path, data)
                nestedFs.writeFile(p, data);
                return;
            }

            // open/write/close style
            if (typeof nestedFs.open === 'function' && typeof nestedFs.write === 'function') {
                const fd = trySync(nestedFs.open.bind(nestedFs), p, 'w+');
                if (!(fd && fd.__err) && fd != null) {
                    // nestedFs.write(fd, buffer, offset, length, position)
                    trySync(nestedFs.write.bind(nestedFs), fd, data, 0, data.length || data.byteLength, 0);
                    trySync(nestedFs.close.bind(nestedFs), fd);
                    return;
                }
            }
        } catch (e) {
            console.debug('nestedFs write attempt failed, falling back:', e);
        }
    }

    // Fallbacks: try promise-based fs on ciInstance/dosInstance
    const fsCandidates = [
        (this.ciInstance && this.ciInstance.fs) || null,
        (this.dosInstance && this.dosInstance.fs) || null,
        (this.dosInstance && this.dosInstance.FS) || null
    ].filter(Boolean);

    for (const fs of fsCandidates) {
        try {
            if (typeof fs.writeFile === 'function') {
                // some accept (path, data)
                await Promise.resolve(fs.writeFile(filePath, data));
                return;
            }
            // try open/write
            if (typeof fs.open === 'function' && typeof fs.write === 'function') {
                const maybeFd = await Promise.resolve(fs.open(filePath, 'w+')).catch(()=>null);
                if (maybeFd != null) {
                    try {
                        if (typeof fs.write === 'function') {
                            await Promise.resolve(fs.write(maybeFd, data, 0, data.length || data.byteLength, 0)).catch(()=>null);
                        } else if (typeof fs.writeSync === 'function') {
                            fs.writeSync(maybeFd, data, 0, data.length || data.byteLength, 0);
                        }
                    } catch(e) {}
                    if (typeof fs.close === 'function') await Promise.resolve(fs.close(maybeFd)).catch(()=>null);
                    return;
                }
            }
        } catch (e) {
            // continue to next candidate
        }
    }

    throw new Error('No supported writeFile API found on dos fs.');
}

    // Flexible exists check
    async flexibleExists(filePath) {
        if (!this.dosInstance && !this.ciInstance) return false;
        const fs = (this.ciInstance && this.ciInstance.fs) || (this.dosInstance && this.dosInstance.fs) || (this.dosInstance && this.dosInstance.FS);
        if (!fs) return false;
        try {
            if (typeof fs.exists === 'function') {
                return !!(await fs.exists(filePath));
            }
            if (typeof fs.stat === 'function') {
                const s = await fs.stat(filePath).catch(()=>null);
                return !!s;
            }
            // last resort: try read
            const data = await this.flexibleReadFile(filePath);
            return !!(data && data.length);
        } catch (e) {
            return false;
        }
    }

    // ----------------- Activation / lifecycle -----------------
    checkActivation(source) {
        // feltételek: nincs aktív menü, nincs input, stb. (a projekted változóihoz igazítva)
        if (this.active || (typeof menuOpen !== 'undefined' && menuOpen) || (typeof currentInput !== 'undefined' && currentInput && currentInput.trim().length > 0)) {
            return false;
        }

        if (window.voiceHandler && window.voiceHandler.isActive && window.voiceHandler.isActive()) return false;

        const now = Date.now();
        if (now - this.lastDpadPressTime > this.dpadPressTimeout) this.dpadPressCount = 0;
        this.dpadPressCount++;
        this.lastDpadPressTime = now;
        console.log(`🎮 D-pad press ${this.dpadPressCount}/10`);
        if (this.dpadPressCount >= 10) {
            this.dpadPressCount = 0;
            this.activate();
            return true;
        }
        return false;
    }

    async activate() {
        console.log('🎮 DOOM Easter Egg Activated!');
        this.active = true;
        this.createContainer();
        this.showMessage('Loading DOOM...', 'Please wait...');

        try {
            await this.loadJsDos();
            await this.initDoom();
            this.setupControls();
            console.log('✅ DOOM loaded successfully!');
        } catch (error) {
            console.error('❌ DOOM loading error:', error);
            this.showMessage('Failed to load DOOM', (error && error.message) ? error.message : String(error));
            setTimeout(() => this.deactivate(), 3000);
        }
    }

    /**
 * Teljes deactivate() függvény — másold be a DoomEasterEgg osztályodba,
 * helyettesítve a meglévő deactivate() implementációt.
 *
 * Feltételez: a class-ban léteznek a segédfüggvények:
 *  - this.sleep(ms)
 *  - this.findPersistFunction()
 *  - this.findExitFunction()
 *  - this.persistSavesToDb()
 *  - this.findAndSaveSavesFromNestedFs()
 *  - this.pressAndReleaseKey(code)
 *  - this._cleanupUI()
 *
 * Ha valamelyik nincs meg, a függvény ekkor is működik (fallback logikával),
 * de javasolt a többi helper megtartása (korábbi üzenetekben adtam őket).
 */
async deactivate() {
    console.log('🎮 DOOM Easter Egg Deactivating (robust shutdown)...');

    // mark inactive immediately so UI/input logic ne küldjön tovább bemenetet
    this.active = false;

    // if no instances at all, just cleanup UI and exit early
    if (!this.dosInstance && !this.ciInstance) {
        console.warn('No dos/ci instances found; performing UI cleanup only.');
        try { this._cleanupUI(); } catch(e){ console.warn('Cleanup error', e); }
        return;
    }

    // 1) Próbáljunk in-game menüből szép kilépést indítani (billentyűk)
    // CSAK HA MÉG NEM LÉPTÜNK KI MANUÁLISAN!
    /* if (!this.manuallyExitedGame) {
        try {
            console.log('🚀 Sending in-game exit key sequence (Menu → Exit → Yes)...');
            // open menu
            this.pressAndReleaseKey(this.keyMap.esc);
            await this.sleep(120);

            // navigate down/select sequence (sok DOOM menüben működik)
            this.pressAndReleaseKey(this.keyMap.down); await this.sleep(80);
            this.pressAndReleaseKey(this.keyMap.down); await this.sleep(80);
            this.pressAndReleaseKey(this.keyMap.down); await this.sleep(80);
            this.pressAndReleaseKey(this.keyMap.enter); await this.sleep(120);

            // press 'Y' / confirm if game asks (keycode 89 = 'Y')
            this.pressAndReleaseKey(89);
            await this.sleep(80);
            this.pressAndReleaseKey(this.keyMap.enter);
            await this.sleep(200); // adjunk rövid időt az írások indulásához
        } catch (e) {
            console.warn('Error while sending exit key sequence:', e);
        }
    } else {
        console.log('ℹ️ Skipping in-game exit sequence (already at DOS prompt)');
    } */

    // 2) Próbáljuk meg csatlakoztatni az engine onExit eseményét (ha van)
    let exitEventPromise = null;
    try {
        const candidate = this.ciInstance || this.dosInstance;
        if (candidate && typeof candidate.events === 'function') {
            try {
                const ev = candidate.events();
                if (ev && typeof ev.onExit === 'function') {
                    exitEventPromise = new Promise(resolve => {
                        try {
                            ev.onExit(() => {
                                console.log('🔔 Engine emitted onExit.');
                                resolve();
                            });
                        } catch (e) {
                            console.debug('Attaching onExit listener failed:', e);
                            resolve(); // fallback: resolve immediately so we don't hang
                        }
                    });
                }
            } catch (e) {
                console.debug('Candidate.events() threw:', e);
            }
        }
    } catch (e) {
        console.debug('Error while preparing onExit listener:', e);
        exitEventPromise = null;
    }

    // 3) Várakozás: ha onExit van, várjuk meg (de ne forever — cap)
    const MAX_EXIT_WAIT_MS = 1000;
    try {
        if (exitEventPromise) {
            console.log('⏳ Waiting for engine onExit (max', MAX_EXIT_WAIT_MS, 'ms)...');
            await Promise.race([ exitEventPromise, this.sleep(MAX_EXIT_WAIT_MS) ]);
        } else {
            // nincs onExit -> rövid polling várakozás, hogy a belső FS-írások befejeződjenek
            console.log('ℹ️ No onExit available — waiting', MAX_EXIT_WAIT_MS, 'ms for FS flush (poll).');
            await this.sleep(MAX_EXIT_WAIT_MS);
        }
    } catch (e) {
        console.warn('Error while waiting for exit/onExit:', e);
    }

    // 4) Mentés: elsődlegesen próbáljuk a nested-FS alapú keresést (reliable for this build),
    // ha az nincs, próbáljuk a persist() funkciót, végül fájlonkénti fallback.
    try {
        // Ha implementáltad a specializált nested-FS mentőt, használjuk azt
        if (typeof this.findAndSaveSavesFromNestedFs === 'function') {
            try {
                console.log('💾 Attempting to save using nested-FS discovery (findAndSaveSavesFromNestedFs)...');
                await this.findAndSaveSavesFromNestedFs();
                console.log('✅ Nested-FS save attempt finished.');
            } catch (e) {
                console.warn('Nested-FS save failed, will try persist()/fallback:', e);
                // fallthrough to next methods
                await this._tryPersistOrPerFileFallback();
            }
        } else {
            // ha nincs nested helper, menjünk közvetlenül persist/fallback útvonalra
            await this._tryPersistOrPerFileFallback();
        }
    } catch (e) {
        console.error('Error during save process:', e);
        // még ilyenkor is próbáljuk a fallbackot
        try { await this._tryPersistOrPerFileFallback(); } catch(e2){ console.warn('Fallback also failed', e2); }
    }

    // 5) Hívjuk meg az engine exit/stop/kill függvényt, ha elérhető
    try {
        const exitFn = this.findExitFunction ? this.findExitFunction() : null;
        if (exitFn) {
            console.log('🔚 Calling engine exit/stop function to release runtime resources...');
            const res = exitFn();
            if (res && typeof res.then === 'function') {
                await Promise.race([ res, this.sleep(2000) ]); // ne várjunk sokáig
            }
            console.log('✅ Engine exit/stop invoked.');
        } else {
            console.log('ℹ️ No engine exit/stop function found to call.');
        }
    } catch (e) {
        console.warn('Error while calling engine exit/stop function:', e);
    }

    // 6) Final cleanup UI + listeners
    try {
        this._cleanupUI();
    } catch (e) {
        console.warn('Cleanup UI error:', e);
    }

    console.log('✅ DOOM Deactivated — save attempt completed (best-effort).');
}

/* ---------- Kiegészítő privát helper, amelyet a deactivate() használhat  ----------
   Ha a class-odban nincs meg, illeszd be a következőt is a classba (privát helper):
*/
async _tryPersistOrPerFileFallback() {
    // elsődleges: persist() ha van
    try {
        if (typeof this.findPersistFunction === 'function') {
            const persistFn = this.findPersistFunction();
            if (persistFn) {
                console.log('💾 Calling persist()-like function as primary save...');
                const bundle = await persistFn();
                if (bundle && bundle.length) {
                    try {
                        await this.db.saveData('DOOM-changes', bundle);
                        console.log('✅ Persist bundle saved to IndexedDB (DOOM-changes).');
                        return;
                    } catch (e) {
                        console.warn('Saving persist bundle to DB failed:', e);
                        // fallthrough to per-file
                    }
                } else {
                    console.log('ℹ️ persist() returned empty/zero-length bundle.');
                }
            } else {
                console.log('ℹ️ No persist-like function found.');
            }
        }
    } catch (e) {
        console.warn('persist() invocation failed:', e);
    }

    // fallback: per-file read + save
    try {
        console.log('💾 Persist fallback: reading save files one-by-one and saving to IndexedDB...');
        // ha van nested-FS helper, azt már meghívtuk fent; itt is megpróbáljuk per-filet
        if (typeof this.saveFileNames === 'undefined' || !Array.isArray(this.saveFileNames)) {
            console.warn('No saveFileNames defined; nothing to save in per-file fallback.');
            return;
        }

        // prefer nested fs path if available (inst.dos.fs.fs)
        const nestedFs = (this.ciInstance && this.ciInstance.fs && this.ciInstance.fs.fs)
                       || (this.dosInstance && this.dosInstance.dos && this.dosInstance.dos.fs && this.dosInstance.dos.fs.fs)
                       || (this.dosInstance && this.dosInstance.fs && this.dosInstance.fs.fs)
                       || null;

        for (const filename of this.saveFileNames) {
            const candidates = [
                `DOOM/${filename}`,
                `/DOOM/${filename}`,
                filename,
                `/${filename}`,
                `save/${filename}`,
                `/save/${filename}`,
                `saves/${filename}`,
                `/saves/${filename}`
            ];
            let saved = false;

            if (nestedFs) {
                for (const p of candidates) {
                    try {
                        // nestedFs APIs are usually sync-style: readFile(path) will throw on missing
                        let data;
                        try {
                            data = nestedFs.readFile(p);
                        } catch (e) {
                            // some versions throw ErrnoError; continue searching
                            continue;
                        }
                        if (data && (data.length || data.byteLength)) {
                            await this.db.saveData(filename, data);
                            console.log(`  - Saved ${filename} from nestedFS path "${p}" (${data.length || data.byteLength} bytes)`);
                            saved = true;
                            break;
                        }
                    } catch (e) {
                        // ignore and continue
                    }
                }
            } else {
                // as ultimate fallback try this.dosInstance.fs.readFile if exists (promise-based)
                const fsObj = (this.ciInstance && this.ciInstance.fs) || (this.dosInstance && this.dosInstance.fs);
                if (fsObj && typeof fsObj.readFile === 'function') {
                    for (const p of candidates) {
                        try {
                            const data = await fsObj.readFile(p).catch(()=>null);
                            if (data && (data.length || data.byteLength)) {
                                await this.db.saveData(filename, data);
                                console.log(`  - Saved ${filename} from fs.readFile("${p}") (${data.length || data.byteLength} bytes)`);
                                saved = true;
                                break;
                            }
                        } catch (e) { continue; }
                    }
                }
            }

            if (!saved) {
                console.log(`  - ${filename} not found / not saved (checked candidates).`);
            }
        }

        console.log('✅ Per-file fallback completed.');
    } catch (e) {
        console.error('Per-file fallback failed:', e);
    }
}

    _cleanupUI() {
        try {
            // ✅ Állítsuk le az összes folyamatos billentyűt cleanup előtt
            if (this.stopAllKeys) {
                this.stopAllKeys();
            }
            
            // ✅ REMOVE D-PAD TOUCH LISTENERS!
            this.removeDpadListeners();
            
            this.dosInstance = null;
            this.ciInstance = null;
            this.manuallyExitedGame = false; // Reset flag
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
            /* if (this.originalHandlers) {
                Object.assign(window, this.originalHandlers);
                this.originalHandlers = null;
            } */
            
            // ✅ REINITIALIZE D-PAD TOUCH LISTENERS after cleanup
            setTimeout(() => {
                if (typeof window.reinitializeDpadTouch === 'function') {
                    window.reinitializeDpadTouch();
                    console.log('✅ D-pad touch listeners reinitialized after DOOM cleanup');
                }
            }, 100);
        } catch (e) {
            console.warn('Cleanup error:', e);
        }
    }

  async debugListAllFiles() {
        try {
            const ci = this.ciInstance || this.dosInstance;
            if (!ci) {
                console.warn("⚠️ No ciInstance/dosInstance available yet.");
                return;
            }

            // Prefer the js-dos bundle() API if available
            if (typeof ci.bundle === "function") {
                console.log("🗂️ Using js-dos.bundle() to list all files...");
                const bundle = await ci.bundle();
                if (!bundle) {
                    console.warn("bundle() returned null or undefined.");
                    return;
                }

                if (bundle.files && Array.isArray(bundle.files)) {
                    console.groupCollapsed(`📂 Bundle file listing (${bundle.files.length} files):`);
                    for (const f of bundle.files) {
                        const name = f.path || f.name || "(unknown)";
                        const size = f.data ? f.data.length : 0;
                        console.log(` - ${name} (${size} bytes)`);
                    }
                    console.groupEnd();
                } else if (bundle instanceof ArrayBuffer || bundle instanceof Uint8Array) {
                    console.log(`📦 bundle() returned raw binary of ${bundle.byteLength} bytes`);
                } else {
                    console.log("🧩 bundle() result keys:", Object.keys(bundle));
                }
                return;
            }

            // Try alternative FS access if bundle() not found
            const fs = ci.fs || ci.FS || ci.dos && ci.dos.fs;
            if (!fs) {
                console.warn("❌ No FS object found.");
                return;
            }

            // brute force inspect: print out keys
            console.log("🧩 FS object keys:", Object.keys(fs));

            // Try listing C:/ if possible
            try {
                if (typeof fs.readdir === "function") {
                    console.log("📂 Listing root folder:", await fs.readdir("/"));
                }
            } catch (e) {
                console.warn("⚠️ readdir() failed:", e);
            }

        } catch (err) {
            console.error("❌ debugListAllFiles error:", err);
        }
    }    


 // DoomEasterEgg class method - uses inst.dos.fs.fs sync APIs
    async findAndSaveSavesFromNestedFs() {
        const inst = this.ciInstance || this.dosInstance;
        if (!inst || !inst.dos || !inst.dos.fs || !inst.dos.fs.fs) {
            console.warn('No nested fs available at inst.dos.fs.fs');
            return;
        }
        const nestedFs = inst.dos.fs.fs;
        console.log('Using nested fs at inst.dos.fs.fs — keys:', Object.keys(nestedFs));

        const trySync = (fn, ...args) => {
            try { return fn(...args); } catch(e) { return { __err: e }; }
        };

        const listDir = (base, depth = 3) => {
            const out = [];
            const q = [{ path: base, depth }];
            const seen = new Set();
            while (q.length) {
                const cur = q.shift();
                let names = trySync(nestedFs.readdir.bind(nestedFs), cur.path);
                if (!names || names.__err) continue;
                for (const name of names) {
                    if (name === '.' || name === '..') continue;
                    const path = (cur.path === '/' || cur.path === '') ? name : `${cur.path.replace(/\/$/, '')}/${name}`;
                    if (seen.has(path)) continue;
                    seen.add(path);
                    let isDir = false;
                    const st = trySync(nestedFs.stat.bind(nestedFs), path);
                    if (!(st && st.__err) && st && (st.isDirectory || (st.mode && (st.mode & 0o40000)))) isDir = true;
                    out.push({ path, type: isDir ? 'dir' : 'file' });
                    if (isDir && cur.depth > 0) q.push({ path, depth: cur.depth - 1 });
                }
            }
            return out;
        };

        const roots = ['/', '', '/DOOM', 'DOOM', '/C', '/C/DOOM', '/save', '/saves', '/usr', '/home'];
        const all = new Set();
        for (const r of roots) {
            const list = listDir(r, 3);
            for (const e of list) all.add(e.path);
        }

        const candidates = Array.from(all).filter(p => /DOOMSAV\d+\.DSG$/i.test(p) || /DEFAULT\.CFG$/i.test(p));
        console.log('Found candidate save files:', candidates);

        for (const p of candidates) {
            const data = trySync(nestedFs.readFile.bind(nestedFs), p);
            if (data && data.__err) {
                console.warn('Could not read', p, data.__err);
                continue;
            }
            const key = p.split('/').pop();
            try {
                await this.db.saveData(key, data);
                console.log(`Saved ${key} from ${p} (${(data.length||data.byteLength||0)} bytes)`);
            } catch (e) {
                console.error('DB save failed for', key, e);
            }
        }

        if (!candidates.length) console.log('No save files found by pattern; inspect FS manually with debug scripts.');
    }

    // Persist saves: try persist() first, else per-file fallback
    async persistSavesToDb() {
        console.log('💾 Persist: attempting to save progress to IndexedDB (enhanced search)...');

        // 0) Diagnostics: list root and common dirs (best-effort)
        try {
            await this.listFs('/'); // show root
            // also try some common paths
            const commonPaths = ['/DOOM', '/doom', '/save', '/saves', '/SAVE', '/SAVES', '/USER', '/C/DOOM', '/'];
            for (const p of commonPaths) {
                try { await this.listFs(p); } catch(e) { /* ignore */ }
            }
        } catch (e) {
            console.debug('persist diagnostics failed:', e);
        }

        // 1) Try persist() if available (preferred)
        const persistFn = this.findPersistFunction();
        if (persistFn) {
            try {
                console.log('💾 Found persist function, calling it...');
                const bundle = await persistFn();
                if (bundle && bundle.length) {
                    await this.db.saveData('DOOM-changes', bundle);
                    console.log('✅ Persist bundle saved to IndexedDB (' + bundle.length + ' bytes).');
                    return;
                } else {
                    console.log('ℹ️ Persist returned empty bundle or zero length.');
                }
            } catch (e) {
                console.warn('Persist function failed:', e);
            }
        } else {
            console.log('ℹ️ No persist function found; will search per-file in candidate locations.');
        }

        // 2) Candidate directories to search for save files (in order)
        const candidateDirs = [
            'DOOM', '', '/', '/DOOM', '/doom', 'SAVE', 'SAVES', 'save', 'saves', 'USER', 'C/DOOM', 'C:/DOOM'
        ];

        try {
            for (const filename of this.saveFileNames) {
                let found = false;
                for (const dir of candidateDirs) {
                    const tryPath = dir ? (dir.replace(/\/$/, '') + '/' + filename) : filename;
                    const normalized = tryPath.replace(/^\/+/, ''); // remove leading slash for some fs variants
                    // Try multiple path forms
                    const variants = [
                        tryPath,
                        '/' + tryPath,
                        normalized,
                        'DOOM/' + filename,
                        '/DOOM/' + filename
                    ];
                    for (const p of variants) {
                        if (await this.flexibleExists(p)) {
                            const fileData = await this.flexibleReadFile(p);
                            if (fileData && fileData.length) {
                                await this.db.saveData(filename, fileData);
                                console.log(`  - Saved ${filename} from ${p} (${fileData.length} bytes)`);
                                found = true;
                                break;
                            }
                        }
                    }
                    if (found) break;
                }
                if (!found) {
                    console.log(`  - ${filename} not found in candidate dirs`);
                }
            }
            console.log('✅ Enhanced persist finished (per-file search).');
        } catch (err) {
            console.error('❌ Error during enhanced per-file persist:', err);
        }
    }

    // ----------------- Init / load -----------------
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

    // initDoom: adapt to multiple API shapes (run(), main(), fs.extract + main)
async initDoom() {
    const canvas = document.getElementById('dosbox');
    if (!canvas) throw new Error('Canvas element not found');

    const dos = await Dos(canvas, { wdosboxUrl: "https://js-dos.com/6.22/current/wdosbox.js" });
    this.dosInstance = dos;

    this.showMessage('Extracting DOOM...', 'Almost there...');
    await this.dosInstance.fs.extract("https://js-dos.com/cdn/upload/DOOM-@evilution.zip");

    // ✅ PONTOSAN AZ ELŐBBI MŰKÖDŐ MÓDSZER!
    this.showMessage('Initializing...', 'Please wait...');
    const ci = await this.dosInstance.main(["-c", "echo Ready"]);
    this.ciInstance = ci;
    
    await this.sleep(300);
    
    // ✅ Töltsd vissza a mentéseket (UGYANAZ MINT ELŐBB!)
    const nestedFs = (ci.dos && ci.dos.fs && ci.dos.fs.fs) || 
                     (this.dosInstance.dos && this.dosInstance.dos.fs && this.dosInstance.dos.fs.fs);
    
    if (nestedFs) {
        console.log('💾 Restoring progress from IndexedDB...');
        this.showMessage('Loading saves...', 'Please wait...');
        
        for (const filename of this.saveFileNames) {
            const savedData = await this.db.loadData(filename);
            if (savedData && savedData.length > 0) {
                try {
                    nestedFs.writeFile(`DOOM/${filename}`, savedData);
                    console.log(`  ✅ Restored ${filename} (${savedData.length} bytes)`);
                } catch (e) {
                    console.error(`  ❌ Failed ${filename}:`, e);
                }
            }
        }
    }

    // ✅ MOST begépeljük a DOOM indítását (mint ahogy te csináltad kézzel!)
    this.showMessage('Starting DOOM...', 'Get ready!');
    await this.sleep(300);
    
    // Gépelje be: "cd DOOM" + ENTER
    this.typeCommand("cd DOOM");
    await this.sleep(200);
    
    // Gépelje be: "DOOM.EXE" + ENTER
    this.typeCommand("DOOM");
    
    await this.sleep(500);
    this.hideMessage();
}

// Helper függvény parancsok begépeléséhez
typeCommand(cmd) {
    // ✅ NAGYBETŰSÍTSD a parancsot!
    const upperCmd = cmd.toUpperCase();
    
    for (const char of upperCmd) {
        const code = char.charCodeAt(0);
        this.sendKey(code, true);
        this.sendKey(code, false);
    }
    this.sendKey(13, true);  // Enter
    this.sendKey(13, false);
}
fireBullet() {
    this.pressAndReleaseKey(this.keyMap.fire);
}
    // ----------------- Controls -----------------
        
  setupControls() {
        // Mentjük az eredeti handler-eket (beleértve a call gombokat is)
        /* this.originalHandlers = {
            handleNavUp: window.handleNavUp,
            handleNavDown: window.handleNavDown,
            handleNavLeft: window.handleNavLeft,
            handleNavRight: window.handleNavRight,
            handleOK: window.handleOK,
            handleKey: window.handleKey,
            handleMenu: window.handleMenu,
            handleCallStart: window.handleCallStart,
            handleCallEnd: window.handleCallEnd
        }; */
        
        this.isExitConfirmationPending = false;
        
        // ✅ ÚJ: Folyamatos billentyűküldés nyomvatartáskor (javított verzió)
        this.intervalIds = {
            up: null,
            down: null,
            left: null,
            right: null
        };

        // ✅ Követjük, hogy melyik gomb van lenyomva
        this.pressedButtons = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        /* const startContinuousKey = (direction, keyCode) => {
            // ✅ JAVÍTÁS: Hang lejátszása az első lenyomáskor
            if (typeof playDTMF !== 'undefined') {
                playDTMF(dtmfKey);
            }

            //this.isExitConfirmationPending = false; // Töröljük a kilépési szándékot
            // Ha már aktív, ne indítsunk újat
            if (this.intervalIds[direction]) return;
            
            this.pressedButtons[direction] = true;
            
            // Első billentyű azonnal
            this.sendKey(keyCode, true);
            
            // Ismétlés másodpercenként
            this.intervalIds[direction] = setInterval(() => {
                // Biztonsági ellenőrzés: ha már nincs lenyomva, állítsuk le
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
        }; */

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

        // ✅ Globális cleanup funkció - minden gombot leállít
        const stopAllKeys = () => {
            stopContinuousKey('up', this.keyMap.up);
            stopContinuousKey('down', this.keyMap.down);
            stopContinuousKey('left', this.keyMap.left);
            stopContinuousKey('right', this.keyMap.right);
        };

        // D-pad vezérlés - üres handlerekkel felülírjuk (DOM eventek vezérelnek)
        window.handleNavUp = () => {};
        window.handleNavDown = () => {};
        window.handleNavLeft = () => {};
        window.handleNavRight = () => {};

        // ✅ DOM események a D-pad gombokhoz
        const dpadUp = document.querySelector('.dpad-up');
        const dpadDown = document.querySelector('.dpad-down');
        const dpadLeft = document.querySelector('.dpad-left');
        const dpadRight = document.querySelector('.dpad-right');

        // ✅ Mentjük a listener referenciákat, hogy később el tudjuk távolítani
        this.dpadListeners = {
            up: { element: dpadUp, handlers: {} },
            down: { element: dpadDown, handlers: {} },
            left: { element: dpadLeft, handlers: {} },
            right: { element: dpadRight, handlers: {} }
        };
        
        // Hozzuk létre és adjuk hozzá az egyes handler függvényeket
        if (dpadUp) {
            this.dpadListeners.up.handlers.mousedown = () => startContinuousKey('up', this.keyMap.up, '2');
            this.dpadListeners.up.handlers.touchstart = (e) => { e.preventDefault(); startContinuousKey('up', this.keyMap.up, '2'); };
            this.dpadListeners.up.handlers.mousedown = () => startContinuousKey('up', this.keyMap.up);
            this.dpadListeners.up.handlers.mouseup = () => stopContinuousKey('up', this.keyMap.up);
            this.dpadListeners.up.handlers.mouseleave = () => stopContinuousKey('up', this.keyMap.up);
            this.dpadListeners.up.handlers.touchstart = (e) => { e.preventDefault(); startContinuousKey('up', this.keyMap.up); };
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
            this.dpadListeners.down.handlers.touchstart = (e) => { e.preventDefault(); startContinuousKey('down', this.keyMap.down, '8'); };
            this.dpadListeners.down.handlers.mousedown = () => startContinuousKey('down', this.keyMap.down);
            this.dpadListeners.down.handlers.mouseup = () => stopContinuousKey('down', this.keyMap.down);
            this.dpadListeners.down.handlers.mouseleave = () => stopContinuousKey('down', this.keyMap.down);
            this.dpadListeners.down.handlers.touchstart = (e) => { e.preventDefault(); startContinuousKey('down', this.keyMap.down); };
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
            this.dpadListeners.left.handlers.touchstart = (e) => { e.preventDefault(); startContinuousKey('left', this.keyMap.left, '4'); };
            this.dpadListeners.left.handlers.mousedown = () => startContinuousKey('left', this.keyMap.left);
            this.dpadListeners.left.handlers.mouseup = () => stopContinuousKey('left', this.keyMap.left);
            this.dpadListeners.left.handlers.mouseleave = () => stopContinuousKey('left', this.keyMap.left);
            this.dpadListeners.left.handlers.touchstart = (e) => { e.preventDefault(); startContinuousKey('left', this.keyMap.left); };
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
            this.dpadListeners.right.handlers.touchstart = (e) => { e.preventDefault(); startContinuousKey('right', this.keyMap.right, '6'); };
            this.dpadListeners.right.handlers.mousedown = () => startContinuousKey('right', this.keyMap.right);
            this.dpadListeners.right.handlers.mouseup = () => stopContinuousKey('right', this.keyMap.right);
            this.dpadListeners.right.handlers.mouseleave = () => stopContinuousKey('right', this.keyMap.right);
            this.dpadListeners.right.handlers.touchstart = (e) => { e.preventDefault(); startContinuousKey('right', this.keyMap.right); };
            this.dpadListeners.right.handlers.touchend = (e) => { e.preventDefault(); stopContinuousKey('right', this.keyMap.right); };
            this.dpadListeners.right.handlers.touchcancel = (e) => { e.preventDefault(); stopContinuousKey('right', this.keyMap.right); };
            
            dpadRight.addEventListener('mousedown', this.dpadListeners.right.handlers.mousedown);
            dpadRight.addEventListener('mouseup', this.dpadListeners.right.handlers.mouseup);
            dpadRight.addEventListener('mouseleave', this.dpadListeners.right.handlers.mouseleave);
            dpadRight.addEventListener('touchstart', this.dpadListeners.right.handlers.touchstart, { passive: false });
            dpadRight.addEventListener('touchend', this.dpadListeners.right.handlers.touchend, { passive: false });
            dpadRight.addEventListener('touchcancel', this.dpadListeners.right.handlers.touchcancel, { passive: false });
        }

        // ✅ Biztonsági háló: ha az egér elhagyja a dokumentumot, állítsuk le mindent
        document.addEventListener('mouseup', stopAllKeys);
        document.addEventListener('mouseleave', stopAllKeys);
        // Touch esetén is
        document.addEventListener('touchend', stopAllKeys, { passive: false });
        document.addEventListener('touchcancel', stopAllKeys, { passive: false });

        // ✅ Ha blur (elveszti a fókuszt), állítsuk le mindent
        window.addEventListener('blur', stopAllKeys);

/*         window.handleOK = () => {
            // ✅ JAVÍTÁS: A felülírt függvények megkapják a saját playDTMF hívásukat
            if (typeof playDTMF !== 'undefined') playDTMF('5');
            //this.isExitConfirmationPending = false; // Töröljük a kilépési szándékot
            this.pressAndReleaseKey(this.keyMap.enter);
        } */

        // ✅ ZÖLD GOMB = 'Y' (Yes) a DOOM menüben
/*         window.handleCallStart = () => {
            console.log('🎮 Green button = Y in DOOM');
            this.pressAndReleaseKey(89); // Y key (ASCII 89)
            
             setTimeout(() => {
                if (this.active) {
                    console.log('✅ Detecting possible DOS prompt exit, triggering cleanup...');
                    this.manuallyExitedGame = true;
                    this.deactivate();
                }
            }, 1500); 
        }; */

        // ✅ ZÖLD GOMB = 'Y' (Yes) a DOOM menüben
         window.handleCallStart = () => {
            if (typeof playDTMF !== 'undefined') playDTMF('5'); // Zöld gomb hangja
            console.log('🎮 Green button = Y in DOOM');
            this.pressAndReleaseKey(this.keyMap.y); // Y key (ASCII 89)
            console.log(this.isExitConfirmationPending);
            // CSAK AKKOR indítjuk a leállítást, ha előtte az ESC-et megnyomták
            if (this.isExitConfirmationPending) {
                console.log('✅ Exit confirmation was pending, starting shutdown sequence...');
                
                setTimeout(() => {
                    if (this.active) {
                        console.log('✅ Detecting possible DOS prompt exit, triggering cleanup...');
                        this.manuallyExitedGame = true;
                        this.deactivate();
                    }
                }, 500);

            } else {
                console.log('🎮 Y was pressed, but not for exiting. No shutdown sequence.');
            }

            // Fontos: A 'Y' megnyomása után azonnal töröljük a flag-et,
            // hogy a következő 'Y' már ne indítsa el a leállítást.
            this.isExitConfirmationPending = false;
        };         

        // ✅ PIROS GOMB = 'N' (No) a DOOM menüben
        /* window.handleCallEnd = () => {
            if (typeof playDTMF !== 'undefined') playDTMF('1'); // Piros gomb hangja
            console.log('🎮 Red button = N in DOOM');
            this.pressAndReleaseKey(this.keyMap.n); // N key (ASCII 78)
        }; */

/*         const originalHandleKey = window.handleKey;
        window.handleKey = (key) => {
            if (this.active) {
                if (key === '0') {
                    this.pressAndReleaseKey(this.keyMap.space);
                } else if (key >= '1' && key <= '8') {
                    const weaponKey = this.keyMap['weapon' + key];
                    if (weaponKey) this.pressAndReleaseKey(weaponKey);
                }
            } else if (originalHandleKey) {
                originalHandleKey(key);
            }
        }; */

        const originalHandleKey = window.handleKey;
         window.handleKey = (key) => {
        // A hang lejátszása már a központi eseménykezelőben megtörténik,
        // itt csak a logikával kell foglalkoznunk.
            if (this.active) {
                // ✅ EZ AZ ÚJ BLOKK A MEGOLDÁS
                if (key === '0') {
                    this.pressAndReleaseKey(this.keyMap.space);
                } 
                // A fegyverváltás logikája változatlan marad
                else if (key >= '1' && key <= '8') {
                    const weaponKey = this.keyMap['weapon' + key];
                    if (weaponKey) this.pressAndReleaseKey(weaponKey);
                }
            } else if (originalHandleKey) {
                originalHandleKey(key);
            }
        };
        /* window.handleKey = (key) => {
            // ✅ JAVÍTÁS: Hang lejátszása a DOOM-ban is
            if (typeof playDTMF !== 'undefined') {
                playDTMF(key);
            }

            if (this.active) {
                if (key === '0') {
                    this.pressAndReleaseKey(this.keyMap.space);
                } else if (key >= '1' && key <= '8') {
                    const weaponKey = this.keyMap['weapon' + key];
                    if (weaponKey) this.pressAndReleaseKey(weaponKey);
                }
            } else if (originalHandleKey) {
                // Az eredeti függvény már kezeli a hangot, itt nem kell újra hívni.
                originalHandleKey(key);
            }
        }; */

         /* window.handleMenu = () => {
            if (this.active) {
                this.pressAndReleaseKey(this.keyMap.esc);
            } else if (this.originalHandlers && this.originalHandlers.handleMenu) {
                this.originalHandlers.handleMenu();
            }
        };  */

        window.handleMenu = () => {
            if (typeof playDTMF !== 'undefined') playDTMF('5'); // Menu gomb hangja
            if (this.active) {
                console.log('🚪 ESC pressed, exit confirmation is now pending...');
                this.pressAndReleaseKey(this.keyMap.esc);
                // Beállítjuk a flag-et, mert az ESC megnyomása után jöhet a kilépés kérdés
                this.isExitConfirmationPending = true; 

                // Opcionális: Ha a játékos mást csinál, töröljük a flag-et
                // Egy rövid idő után feltételezzük, hogy nem akart kilépni.
                setTimeout(() => {
                    if (this.isExitConfirmationPending) {
                        console.log('🚪 Resetting exit confirmation flag due to inactivity.');
                        this.isExitConfirmationPending = false;
                    }
                }, 5000); // 5 másodperc után töröljük a "kilépési szándékot"

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
                'Control': this.keyMap.fire,
                ' ': this.keyMap.space,
                'Enter': this.keyMap.enter,
                'Escape': this.keyMap.esc,
                'y': this.keyMap.y,
                'Y': this.keyMap.y,
                'n': this.keyMap.n,
                'N': this.keyMap.n
            };

            const doomKey = keyMap[e.key];
            if (doomKey) this.sendKey(doomKey, e.type === 'keydown');

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
        
        // ✅ Mentjük a stopAllKeys funkciót, hogy a cleanup során hívhassuk
        this.stopAllKeys = stopAllKeys;
    }

    // ✅ ÚJ FÜGGVÉNY: Eltávolítja a D-pad listener-eket
    removeDpadListeners() {
        if (!this.dpadListeners) return;
        
        for (const direction in this.dpadListeners) {
            const { element, handlers } = this.dpadListeners[direction];
            if (!element || !handlers) continue;
            
            // Remove mouse events
            if (handlers.mousedown) element.removeEventListener('mousedown', handlers.mousedown);
            if (handlers.mouseup) element.removeEventListener('mouseup', handlers.mouseup);
            if (handlers.mouseleave) element.removeEventListener('mouseleave', handlers.mouseleave);
            
            // Remove touch events (with passive: false option)
            if (handlers.touchstart) element.removeEventListener('touchstart', handlers.touchstart, { passive: false });
            if (handlers.touchend) element.removeEventListener('touchend', handlers.touchend, { passive: false });
            if (handlers.touchcancel) element.removeEventListener('touchcancel', handlers.touchcancel, { passive: false });
        }
        
        this.dpadListeners = null;
        console.log('✅ D-pad DOOM listeners removed');
    }


removeKeyboardListener() {
        // ✅ Állítsuk le az összes folyamatos billentyűt
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
        // prefer ciInstance.simulateKeyEvent, fallback to other known methods
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
            // As last resort, try to send to dosInstance.FS or keyboard API if available
            if (this.dosInstance && this.dosInstance.keyboard && typeof this.dosInstance.keyboard.sendKey === 'function') {
                this.dosInstance.keyboard.sendKey(keyCode, pressed);
                return;
            }
        } catch (error) {
            console.error('Error sending key:', error);
        }
    }

    // ----------------- UI Helpers -----------------
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
        this.container.id = 'doom-container';
        this.container.innerHTML = `<div id="doom-message"><div class="doom-message-title"></div><div class="doom-message-text"></div></div><canvas id="dosbox"></canvas>`;
        screen.appendChild(this.container);
    }

    showMessage(title, text) {
        const msgTitle = document.querySelector('#doom-message .doom-message-title');
        const msgText = document.querySelector('#doom-message .doom-message-text');
        if (msgTitle) msgTitle.textContent = title;
        if (msgText) msgText.textContent = text;
    }

    hideMessage() {
        const messageEl = document.getElementById('doom-message');
        if (messageEl) messageEl.style.display = 'none';
    }

    // ----------------- Misc -----------------
    isActive() {
        return this.active;
    }
}

// Create global instance
window.doomEasterEgg = new DoomEasterEgg();

// Optional: small console hint (comment out if noisy)
// console.log('🎮 DOOM Easter Egg module loaded — press D-pad 10 times to activate.');
