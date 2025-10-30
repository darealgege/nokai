/**
 * Nokia Storage Cleanup Manager
 * Automatically maintains storage health and removes orphaned data
 * UPDATED: Works with IndexedDB async API
 */

class NokiaStorageCleanup {
    constructor() {
        this.cleanupLog = [];
    }

    /**
     * Run full storage cleanup
     * @returns {object} - Cleanup results
     */
    async runFullCleanup() {
        console.log('🧹 Starting full storage cleanup...');
        this.cleanupLog = [];
        
        const results = {
            orphanedImages: 0,
            migratedImages: 0,
            freedBytes: 0,
            errors: []
        };

        try {
            // 1. Cleanup orphaned unified images
            const orphanedResult = await this.cleanupOrphanedImages();
            results.orphanedImages = orphanedResult.count;
            results.freedBytes += orphanedResult.bytes;

            // 2. Migrate DCIM images to unified storage if needed
            const migrateResult = await this.migrateDCIMToUnified();
            results.migratedImages = migrateResult.count;

            // 3. Cleanup old message images migration data
            const oldDataResult = await this.cleanupOldImageStorage();
            results.freedBytes += oldDataResult.bytes;

            console.log('✅ Cleanup complete:', results);
            
        } catch (error) {
            console.error('❌ Cleanup error:', error);
            results.errors.push(error.message);
        }

        return results;
    }

    /**
     * Clean up orphaned images (images with no references)
     */
    async cleanupOrphanedImages() {
        if (!window.imageAttachments) {
            return { count: 0, bytes: 0 };
        }

        // ✅ Now async
        const removed = await window.imageAttachments.cleanupOrphanedImages();

        this.log(`Removed ${removed} orphaned images`);

        return { count: removed, bytes: 0 };
    }

    /**
     * Migrate DCIM images that are used in Messages/ChatGPT to unified storage
     */
    async migrateDCIMToUnified() {
        let migratedCount = 0;

        if (!window.imageAttachments || !window.dcimManager) {
            return { count: 0 };
        }

        try {
            // ✅ Get all DCIM images (now async and returns array)
            const dcimImages = await window.dcimManager.getAllImages();
            
            // ✅ Get unified storage (now async and returns object)
            const unifiedImages = await window.imageAttachments.getAllImages();

            // Check each DCIM image
            for (const dcimImage of dcimImages) {
                const imageId = dcimImage.id;

                // If image is NOT in unified storage but has references, migrate it
                if (!unifiedImages[imageId]) {
                    // Check if it's used anywhere
                    const isUsedInMessages = await this.isImageUsedInMessages(imageId);
                    const isUsedInChatGPT = await this.isImageUsedInChatGPT(imageId);

                    if (isUsedInMessages || isUsedInChatGPT) {
                        // Migrate to unified storage
                        await window.imageAttachments.saveGalleryImage(imageId, {
                            full: dcimImage.full,
                            retro: dcimImage.retro
                        });

                        // Add references
                        if (isUsedInMessages) {
                            const threads = await this.getThreadsUsingImage(imageId);
                            for (const threadId of threads) {
                                const img = await window.imageAttachments.getImage(imageId);
                                if (img && !img.references.messages.includes(threadId)) {
                                    img.references.messages.push(threadId);
                                    await window.imageIndexedDB.saveImage(img);
                                }
                            }
                        }

                        if (isUsedInChatGPT) {
                            const img = await window.imageAttachments.getImage(imageId);
                            if (img) {
                                img.references.chatgpt = true;
                                await window.imageIndexedDB.saveImage(img);
                            }
                        }

                        migratedCount++;
                        this.log(`Migrated image ${imageId} to unified storage`);
                    }
                }
            }

            if (migratedCount > 0) {
                console.log(`✅ Migrated ${migratedCount} images to unified storage`);
            }

        } catch (error) {
            console.error('❌ Migration error:', error);
        }

        return { count: migratedCount };
    }

    /**
     * Check if image is used in Messages
     */
    async isImageUsedInMessages(imageId) {
        if (!window.messagesStorage) return false;

        const threads = window.messagesStorage.getAllThreads();
        for (const thread of threads) {
            if (thread.messages) {
                for (const msg of thread.messages) {
                    if (msg.images && msg.images.includes(imageId)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Check if image is used in ChatGPT
     */
    async isImageUsedInChatGPT(imageId) {
        if (!window.conversationHistory) return false;

        for (const msg of window.conversationHistory) {
            if (msg.attachmentId === imageId) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get threads using a specific image
     */
    async getThreadsUsingImage(imageId) {
        const threadIds = [];
        if (!window.messagesStorage) return threadIds;

        const threads = window.messagesStorage.getAllThreads();
        for (const thread of threads) {
            if (thread.messages) {
                for (const msg of thread.messages) {
                    if (msg.images && msg.images.includes(imageId)) {
                        threadIds.push(thread.profileId);
                        break;
                    }
                }
            }
        }
        return threadIds;
    }

    /**
     * Cleanup old image storage formats (nokia_messages_images, nokia_chat_images)
     */
    async cleanupOldImageStorage() {
        let freedBytes = 0;

        const oldKeys = ['nokia_messages_images', 'nokia_chat_images'];

        oldKeys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                const size = new Blob([data]).size;
                localStorage.removeItem(key);
                freedBytes += size;
                this.log(`Removed old storage: ${key} (${this.formatBytes(size)})`);
            }
        });

        return { bytes: freedBytes };
    }

    /**
     * Format bytes for display
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Add log entry
     */
    log(message) {
        const entry = `[${new Date().toISOString()}] ${message}`;
        this.cleanupLog.push(entry);
        console.log('🧹 ' + message);
    }

    /**
     * Get cleanup log
     */
    getLog() {
        return this.cleanupLog;
    }

    /**
     * Run automatic cleanup on app start
     */
    async runStartupCleanup() {
        console.log('🔄 Running startup cleanup...');
        
        // Wait a bit for everything to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));

        const results = await this.runFullCleanup();

        if (results.orphanedImages > 0 || results.migratedImages > 0 || results.freedBytes > 0) {
            console.log('✅ Startup cleanup freed:', this.formatBytes(results.freedBytes));
        } else {
            console.log('✅ Storage is clean');
        }

        return results;
    }

    /**
     * Check storage health
     */
    async checkStorageHealth() {
        const health = {
            totalStorage: 0,
            usedStorage: 0,
            dcimImages: 0,
            unifiedImages: 0,
            orphanedImages: 0,
            migratedImages: 0,
            warnings: []
        };

        try {
            // Storage quota
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                health.totalStorage = estimate.quota || 0;
                health.usedStorage = estimate.usage || 0;
            }

            // ✅ DCIM images (now async)
            if (window.dcimManager) {
                health.dcimImages = await window.dcimManager.getImageCount();
            }

            // ✅ Unified images (now async)
            if (window.imageAttachments) {
                const stats = await window.imageAttachments.getStorageStats();
                health.unifiedImages = stats.images || 0;
                health.orphanedImages = stats.noRefs || 0;

                // Check for orphaned images
                if (health.orphanedImages > 0) {
                    health.warnings.push(`${health.orphanedImages} orphaned images found`);
                }
            }

            // Check for old storage format
            if (localStorage.getItem('nokia_messages_images') || localStorage.getItem('nokia_chat_images')) {
                health.warnings.push('Old image storage format detected');
            }

        } catch (error) {
            console.error('Health check error:', error);
        }

        return health;
    }
}

// Initialize global instance
window.storageCleanup = new NokiaStorageCleanup();

// Run automatic cleanup on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.storageCleanup.runStartupCleanup(), 2000);
    });
} else {
    setTimeout(() => window.storageCleanup.runStartupCleanup(), 2000);
}

console.log('✅ Storage Cleanup Manager initialized');
