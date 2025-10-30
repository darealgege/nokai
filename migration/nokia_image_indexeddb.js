/**
 * Nokia Image IndexedDB Manager
 * Central IndexedDB storage for all images (DCIM, Messages, ChatGPT)
 * Replaces localStorage for images to avoid quota issues
 */

class ImageIndexedDB {
    constructor() {
        this.dbName = 'NokaiImageDB';
        this.dbVersion = 1;
        this.db = null;
        this.ready = false;
        this.initPromise = null;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.ready = true;
                console.log('✅ IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // DCIM Store - Camera photos
                if (!db.objectStoreNames.contains('dcim')) {
                    const dcimStore = db.createObjectStore('dcim', { keyPath: 'id' });
                    dcimStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('📷 Created DCIM object store');
                }

                // Image Storage - Unified storage for Messages & ChatGPT
                if (!db.objectStoreNames.contains('images')) {
                    const imagesStore = db.createObjectStore('images', { keyPath: 'id' });
                    imagesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('🖼️ Created Images object store');
                }

                console.log('🔄 IndexedDB schema upgraded to version', db.version);
            };
        });

        return this.initPromise;
    }

    /**
     * Ensure DB is ready
     */
    async ensureReady() {
        if (!this.ready) {
            await this.init();
        }
    }

    // ========================================
    // DCIM Operations (Camera & Gallery)
    // ========================================

    /**
     * Save photo to DCIM
     */
    async saveDCIMPhoto(photo) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dcim'], 'readwrite');
            const store = transaction.objectStore('dcim');
            
            const request = store.put(photo);
            
            request.onsuccess = () => {
                console.log('📸 Photo saved to DCIM:', photo.id);
                resolve(photo.id);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to save photo:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get all DCIM photos (newest first)
     */
    async getAllDCIMPhotos() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dcim'], 'readonly');
            const store = transaction.objectStore('dcim');
            const index = store.index('timestamp');
            
            const request = index.openCursor(null, 'prev'); // Newest first
            const photos = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    photos.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(photos);
                }
            };
            
            request.onerror = () => {
                console.error('❌ Failed to get DCIM photos:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get single DCIM photo by ID
     */
    async getDCIMPhoto(id) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dcim'], 'readonly');
            const store = transaction.objectStore('dcim');
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to get photo:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Delete DCIM photo by ID
     */
    async deleteDCIMPhoto(id) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dcim'], 'readwrite');
            const store = transaction.objectStore('dcim');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('🗑️ Photo deleted from DCIM:', id);
                resolve(true);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to delete photo:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Clear all DCIM photos
     */
    async clearDCIM() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dcim'], 'readwrite');
            const store = transaction.objectStore('dcim');
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('🗑️ All DCIM photos cleared');
                resolve(true);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to clear DCIM:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Count DCIM photos
     */
    async countDCIMPhotos() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dcim'], 'readonly');
            const store = transaction.objectStore('dcim');
            const request = store.count();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to count photos:', request.error);
                reject(request.error);
            };
        });
    }

    // ========================================
    // Image Storage Operations (Messages & ChatGPT)
    // ========================================

    /**
     * Save image to unified storage
     */
    async saveImage(image) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            
            const request = store.put(image);
            
            request.onsuccess = () => {
                console.log('💾 Image saved:', image.id);
                resolve(image.id);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to save image:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get all images as object (for compatibility with old API)
     */
    async getAllImages() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const images = {};
                request.result.forEach(img => {
                    images[img.id] = img;
                });
                resolve(images);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to get images:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get single image by ID
     */
    async getImage(id) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to get image:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Delete image by ID
     */
    async deleteImage(id) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('🗑️ Image deleted:', id);
                resolve(true);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to delete image:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Save all images (bulk operation for migration)
     */
    async saveAllImages(imagesObject) {
        await this.ensureReady();
        const transaction = this.db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        
        const promises = Object.entries(imagesObject).map(([id, image]) => {
            return new Promise((resolve, reject) => {
                const request = store.put(image);
                request.onsuccess = () => resolve(id);
                request.onerror = () => reject(request.error);
            });
        });
        
        return Promise.all(promises);
    }

    /**
     * Clear all images
     */
    async clearAllImages() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('🗑️ All images cleared');
                resolve(true);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to clear images:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Count all images
     */
    async countImages() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.count();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to count images:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Helper: Calculate bytes from base64 data URL
     */
    _bytesFromBase64DataUrl(dataUrl) {
        if (!dataUrl || typeof dataUrl !== "string") return 0;
        const m = dataUrl.match(/^data:[^;]+;base64,(.*)$/);
        if (!m) return 0;
        const b64 = m[1];
        const len = b64.length;
        if (len === 0) return 0;
        const padding = (b64.endsWith("==") ? 2 : (b64.endsWith("=") ? 1 : 0));
        return Math.max(0, (len * 3) / 4 - padding);
    }

    /**
     * Get storage statistics with size information
     */
    async getStorageStats() {
        await this.ensureReady();
        
        const dcimCount = await this.countDCIMPhotos();
        const imagesCount = await this.countImages();
        
        // Get all DCIM photos and calculate size
        const dcimPhotos = await this.getAllDCIMPhotos();
        let dcimSize = 0;
        dcimPhotos.forEach(photo => {
            if (photo.full) dcimSize += this._bytesFromBase64DataUrl(photo.full);
            if (photo.retro) dcimSize += this._bytesFromBase64DataUrl(photo.retro);
        });
        
        // Get detailed image stats
        const images = await this.getAllImages();
        let imagesSize = 0;
        
        const stats = {
            dcim: dcimCount,
            images: imagesCount,
            dcimSize: dcimSize,
            imagesSize: 0, // Will be calculated below
            totalSize: 0,  // Will be calculated at end
            gallery: 0,
            messages: 0,
            chatgpt: 0,
            multipleRefs: 0,
            noRefs: 0
        };

        for (const imageData of Object.values(images)) {
            // Calculate size
            if (imageData.full) imagesSize += this._bytesFromBase64DataUrl(imageData.full);
            if (imageData.retro) imagesSize += this._bytesFromBase64DataUrl(imageData.retro);
            
            if (imageData.references) {
                if (imageData.references.gallery) stats.gallery++;
                if (imageData.references.messages && imageData.references.messages.length > 0) stats.messages++;
                if (imageData.references.chatgpt) stats.chatgpt++;

                const refCount = (imageData.references.gallery ? 1 : 0) +
                               (imageData.references.messages ? imageData.references.messages.length : 0) +
                               (imageData.references.chatgpt ? 1 : 0);

                if (refCount > 1) stats.multipleRefs++;
                if (refCount === 0) stats.noRefs++;
            }
        }
        
        stats.imagesSize = imagesSize;
        stats.totalSize = dcimSize + imagesSize;

        return stats;
    }
}

// Initialize global instance
window.imageIndexedDB = new ImageIndexedDB();
