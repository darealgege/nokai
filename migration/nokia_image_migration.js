/**
 * Nokia Image Migration Script
 * Migrates images from localStorage to IndexedDB
 * Automatically cleans up localStorage after successful migration
 */

class ImageMigrationManager {
    constructor() {
        this.migrationKey = 'nokia_image_migration_v1_complete';
    }

    /**
     * Check if migration has already been completed
     */
    isMigrationComplete() {
        return localStorage.getItem(this.migrationKey) === 'true';
    }

    /**
     * Mark migration as complete
     */
    markMigrationComplete() {
        localStorage.setItem(this.migrationKey, 'true');
        console.log('✅ Migration marked as complete');
    }

    /**
     * Main migration function
     */
    async migrate() {
        // Check if already migrated
        if (this.isMigrationComplete()) {
            console.log('✅ Migration already complete, skipping');
            return {
                success: true,
                alreadyMigrated: true,
                dcimCount: 0,
                imagesCount: 0
            };
        }

        console.log('🔄 Starting image migration from localStorage to IndexedDB...');

        try {
            // Wait for IndexedDB to be ready
            await window.imageIndexedDB.init();

            let dcimCount = 0;
            let imagesCount = 0;

            // Migrate DCIM (Camera photos)
            const dcimResult = await this.migrateDCIM();
            dcimCount = dcimResult.count;

            // Migrate Image Storage (Messages & ChatGPT)
            const imagesResult = await this.migrateImageStorage();
            imagesCount = imagesResult.count;

            // Migrate old separate storage formats
            await this.migrateOldFormats();

            // ✅ NEW: Verify all images were migrated
            const verifyResult = await this.verifyMigration({
                dcimIds: dcimResult.ids || [],
                imageIds: imagesResult.ids || []
            });

            if (verifyResult.success) {
                // Mark migration complete
                this.markMigrationComplete();

                // ✅ NEW: Automatically clean up localStorage
                await this.cleanupLocalStorage();

                const result = {
                    success: true,
                    alreadyMigrated: false,
                    dcimCount,
                    imagesCount,
                    verified: true
                };

                console.log('🎉 Migration complete:', result);
                return result;
            } else {
                console.error('⚠️ Migration verification failed, keeping localStorage as backup');
                return {
                    success: false,
                    error: 'Verification failed',
                    details: verifyResult
                };
            }

        } catch (error) {
            console.error('❌ Migration failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Migrate DCIM from localStorage to IndexedDB
     * Returns: { count, ids }
     */
    async migrateDCIM() {
        console.log('📷 Migrating DCIM...');
        
        const dcimData = localStorage.getItem('nokia_dcim');
        if (!dcimData) {
            console.log('No DCIM data to migrate');
            return { count: 0, ids: [] };
        }

        try {
            const photos = JSON.parse(dcimData);
            if (!Array.isArray(photos)) {
                console.warn('Invalid DCIM data format');
                return { count: 0, ids: [] };
            }

            console.log(`Found ${photos.length} photos in localStorage`);

            const migratedIds = [];

            // Save each photo to IndexedDB
            for (const photo of photos) {
                // Ensure photo has required fields
                if (!photo.id) {
                    photo.id = photo.timestamp || Date.now() + Math.random();
                }
                if (!photo.timestamp) {
                    photo.timestamp = photo.id;
                }
                if (!photo.date) {
                    photo.date = new Date(photo.timestamp).toISOString();
                }

                await window.imageIndexedDB.saveDCIMPhoto(photo);
                migratedIds.push(photo.id);
            }
            
            console.log(`✅ Migrated ${photos.length} photos to IndexedDB`);
            return { count: photos.length, ids: migratedIds };

        } catch (error) {
            console.error('❌ Failed to migrate DCIM:', error);
            return { count: 0, ids: [] };
        }
    }

    /**
     * Migrate unified image storage
     * Returns: { count, ids }
     */
    async migrateImageStorage() {
        console.log('🖼️ Migrating image storage...');
        
        const storageData = localStorage.getItem('nokia_image_storage');
        if (!storageData) {
            console.log('No image storage data to migrate');
            return { count: 0, ids: [] };
        }

        try {
            const images = JSON.parse(storageData);
            if (typeof images !== 'object') {
                console.warn('Invalid image storage format');
                return { count: 0, ids: [] };
            }

            const imageIds = Object.keys(images);
            const imageCount = imageIds.length;
            console.log(`Found ${imageCount} images in localStorage`);

            // Save to IndexedDB
            await window.imageIndexedDB.saveAllImages(images);
            
            console.log(`✅ Migrated ${imageCount} images to IndexedDB`);
            return { count: imageCount, ids: imageIds };

        } catch (error) {
            console.error('❌ Failed to migrate image storage:', error);
            return { count: 0, ids: [] };
        }
    }

    /**
     * Migrate old separate storage formats (if they exist)
     */
    async migrateOldFormats() {
        console.log('🔍 Checking for old storage formats...');
        
        let migratedCount = 0;

        // Check for old Messages images
        const oldMessagesKey = 'nokia_messages_images';
        const oldMessagesData = localStorage.getItem(oldMessagesKey);
        
        if (oldMessagesData) {
            try {
                const oldMessages = JSON.parse(oldMessagesData);
                console.log(`Found ${Object.keys(oldMessages).length} old Messages images`);
                
                // Convert to new format
                for (const [id, data] of Object.entries(oldMessages)) {
                    const newImage = {
                        id: id,
                        full: data.full,
                        retro: data.retro,
                        timestamp: data.timestamp || Date.now(),
                        references: {
                            gallery: false,
                            messages: [data.messageId || 'unknown'],
                            chatgpt: false
                        }
                    };
                    await window.imageIndexedDB.saveImage(newImage);
                    migratedCount++;
                }
                
                console.log(`✅ Migrated ${migratedCount} old Messages images`);
            } catch (e) {
                console.error('❌ Failed to migrate old Messages images:', e);
            }
        }

        // Check for old ChatGPT images
        const oldChatKey = 'nokia_chat_images';
        const oldChatData = localStorage.getItem(oldChatKey);
        
        if (oldChatData) {
            try {
                const oldChat = JSON.parse(oldChatData);
                const oldChatCount = Object.keys(oldChat).length;
                console.log(`Found ${oldChatCount} old ChatGPT images`);
                
                // Convert to new format
                for (const [id, data] of Object.entries(oldChat)) {
                    const newImage = {
                        id: id,
                        full: data.full,
                        retro: data.retro,
                        timestamp: data.timestamp || Date.now(),
                        references: {
                            gallery: false,
                            messages: [],
                            chatgpt: true
                        }
                    };
                    await window.imageIndexedDB.saveImage(newImage);
                    migratedCount++;
                }
                
                console.log(`✅ Migrated ${oldChatCount} old ChatGPT images`);
            } catch (e) {
                console.error('❌ Failed to migrate old ChatGPT images:', e);
            }
        }

        if (migratedCount === 0) {
            console.log('No old format images found');
        }

        return migratedCount;
    }

    /**
     * ✅ NEW: Verify all images were successfully migrated
     * @param {Object} options - { dcimIds, imageIds }
     * @returns {Object} - { success, missing }
     */
    async verifyMigration({ dcimIds, imageIds }) {
        console.log('🔍 Verifying migration...');
        
        const missing = {
            dcim: [],
            images: []
        };

        // Verify DCIM photos
        for (const id of dcimIds) {
            const photo = await window.imageIndexedDB.getDCIMPhoto(id);
            if (!photo) {
                missing.dcim.push(id);
                console.warn(`⚠️ DCIM photo ${id} not found in IndexedDB`);
            }
        }

        // Verify images
        for (const id of imageIds) {
            const image = await window.imageIndexedDB.getImage(id);
            if (!image) {
                missing.images.push(id);
                console.warn(`⚠️ Image ${id} not found in IndexedDB`);
            }
        }

        const totalMissing = missing.dcim.length + missing.images.length;
        
        if (totalMissing === 0) {
            console.log('✅ All images verified in IndexedDB');
            return { success: true, missing: null };
        } else {
            console.error(`❌ ${totalMissing} images missing from IndexedDB`);
            return { success: false, missing };
        }
    }

    /**
     * ✅ IMPROVED: Clean up localStorage after successful migration
     */
    async cleanupLocalStorage() {
        console.log('🧹 Cleaning up localStorage...');
        
        const keysToRemove = [
            'nokia_dcim',
            'nokia_image_storage',
            'nokia_messages_images',
            'nokia_chat_images'
        ];

        let freedBytes = 0;

        keysToRemove.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                const size = new Blob([data]).size;
                localStorage.removeItem(key);
                freedBytes += size;
                console.log(`🗑️ Removed ${key} (${this.formatBytes(size)})`);
            }
        });

        if (freedBytes > 0) {
            console.log(`✅ Freed ${this.formatBytes(freedBytes)} from localStorage`);
        } else {
            console.log('✅ No cleanup needed, localStorage already clear');
        }

        return freedBytes;
    }

    /**
     * Format bytes for display
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Force re-migration (for development/testing)
     */
    async forceMigration() {
        console.warn('⚠️ Forcing re-migration (development mode)');
        localStorage.removeItem(this.migrationKey);
        return await this.migrate();
    }

    /**
     * Get migration status
     */
    getStatus() {
        const status = {
            complete: this.isMigrationComplete(),
            migrationKey: this.migrationKey
        };

        // Check if localStorage still has image data
        const hasLocalStorage = {
            dcim: !!localStorage.getItem('nokia_dcim'),
            images: !!localStorage.getItem('nokia_image_storage'),
            oldMessages: !!localStorage.getItem('nokia_messages_images'),
            oldChat: !!localStorage.getItem('nokia_chat_images')
        };

        status.localStorageClean = !Object.values(hasLocalStorage).some(v => v);
        status.localStorageStatus = hasLocalStorage;

        return status;
    }
}

// Initialize and run migration automatically
(async function() {
    console.log('🚀 Image migration manager initializing...');
    
    window.imageMigration = new ImageMigrationManager();
    
    try {
        const result = await window.imageMigration.migrate();
        
        if (result.success) {
            if (result.alreadyMigrated) {
                console.log('✅ Images already in IndexedDB');
            } else {
                console.log(`✅ Migration successful: ${result.dcimCount} DCIM + ${result.imagesCount} images`);
                console.log('✅ localStorage cleaned up automatically');
            }
        } else {
            console.error('❌ Migration failed:', result.error);
            console.warn('⚠️ localStorage kept as backup');
        }
    } catch (error) {
        console.error('❌ Migration error:', error);
    }
})();

// Expose to console for debugging
window.debugImageMigration = {
    status: () => window.imageMigration.getStatus(),
    forceMigration: () => window.imageMigration.forceMigration(),
    cleanup: () => window.imageMigration.cleanupLocalStorage(),
    stats: async () => {
        const indexedDBStats = await window.imageIndexedDB.getStorageStats();
        const migrationStatus = window.imageMigration.getStatus();
        return {
            indexedDB: indexedDBStats,
            migration: migrationStatus
        };
    }
};

console.log('💡 Debug commands available: window.debugImageMigration');
