// nokia_api_key_manager.js

class ApiKeyManager {
    constructor() {
        // ✅ JAVÍTÁS: Az új, átnevezett osztályt használjuk
        this.db = new ApiKeyDbHelper('NokaiConfigDB', 'config');
        this.sessionApiKey = null;
    }

    // --- Titkosítási segédfüggvények ---
    bufToHex(buf) {
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    hexToBuf(hex) {
        const bytes = hex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || [];
        return new Uint8Array(bytes).buffer;
    }

    async deriveKeyFromPassword(pin, saltHex = null) {
        const encoder = new TextEncoder();
        const salt = saltHex ? new Uint8Array(this.hexToBuf(saltHex)) : crypto.getRandomValues(new Uint8Array(16));
        const passKey = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
            passKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
        return { key, saltHex: this.bufToHex(salt) };
    }

    // --- Fő Műveletek ---

    async saveAndEncryptKey(apiKey, pin) {
        if (!apiKey.startsWith('sk-') || !pin) {
            throw new Error('Invalid API key or PIN.');
        }
        if (pin.length < 4 || pin.length > 6) {
            throw new Error('PIN must be 4-6 digits.');
        }        
        const { key, saltHex } = await this.deriveKeyFromPassword(pin);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(apiKey));
        
        const payload = {
            v: 1,
            salt: saltHex,
            iv: this.bufToHex(iv),
            ct: this.bufToHex(ciphertext)
        };

        await this.db.saveData('encrypted_openai_key', payload);
        this.sessionApiKey = apiKey; // Mentsük el a session-be is
        console.log('✅ API Key encrypted and saved to IndexedDB.');
    }

    async loadAndDecryptKey(pin) {
        const payload = await this.db.loadData('encrypted_openai_key');
        if (!payload) return null;

        const { salt, iv, ct } = payload;
        const { key } = await this.deriveKeyFromPassword(pin, salt);
        try {
            const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.hexToBuf(iv) }, key, this.hexToBuf(ct));
            const apiKey = new TextDecoder().decode(plaintext);
            this.sessionApiKey = apiKey; // Mentsük el a session-be is
            return apiKey;
        } catch (e) {
            console.error('❌ Decryption failed. Incorrect password?');
            return null;
        }
    }

    async hasStoredKey() {
        const key = await this.db.loadData('encrypted_openai_key');
        return !!key;
    }

    // Kulcs lekérése a munkamenetből
    getSessionApiKey() {
        return this.sessionApiKey;
    }

    // Kulcs beállítása a munkamenetre (jelszó nélküli opció)
    setSessionApiKey(apiKey) {
        if (apiKey && apiKey.startsWith('sk-')) {
            this.sessionApiKey = apiKey;
            console.log('🔑 API Key stored for this session only.');
        }
    }

    // Kulcs törlése
    async clearStoredKey() {
        await this.db.saveData('encrypted_openai_key', null); // IndexedDB-ben a 'null' törlésnek felel meg
        this.sessionApiKey = null;
        console.log('🗑️ Stored API Key has been cleared.');
    }

    // PIN kód megváltoztatása
    async changePinCode(oldPin, newPin) {
        // 1. Ellenőrizzük, hogy van-e mentett kulcs
        const hasKey = await this.hasStoredKey();
        if (!hasKey) {
            throw new Error('No stored key found.');
        }

        // 2. Új PIN validálása
        if (!newPin || newPin.length < 4 || newPin.length > 6) {
            throw new Error('New PIN must be 4-6 digits.');
        }

        // 3. Régi PIN-nel megpróbáljuk dekódolni a kulcsot
        const apiKey = await this.loadAndDecryptKey(oldPin);
        if (!apiKey) {
            throw new Error('Incorrect current PIN.');
        }

        // 4. Újra kódoljuk az API kulcsot az új PIN-nel
        await this.saveAndEncryptKey(apiKey, newPin);
        
        console.log('✅ PIN code successfully changed.');
        return true;
    }
}

// Az IndexedDB segédosztály (már ismered a DOOM-ból)
class ApiKeyDbHelper {
    constructor(dbName, storeName) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.db = null;
    }
    async openDb() {
        return new Promise((resolve, reject) => {
            if (this.db) return resolve(this.db);
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = (e) => reject("IndexedDB error: " + e.target.errorCode);
            request.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
            request.onupgradeneeded = (e) => {
                if (!e.target.result.objectStoreNames.contains(this.storeName)) {
                    e.target.result.createObjectStore(this.storeName);
                }
            };
        });
    }
    async saveData(key, data) {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(data, key);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject('Failed to save data: ' + e.target.errorCode);
        });
    }
    async loadData(key) {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (e) => reject('Failed to load data: ' + e.target.errorCode);
        });
    }
}

// Globális példány létrehozása
window.apiKeyManager = new ApiKeyManager();