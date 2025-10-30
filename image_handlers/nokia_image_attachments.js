/**
 * Nokia Unified Image Storage Manager
 * Central image storage with reference counting
 * Images are only deleted when no app references them
 * UPDATED: Now uses IndexedDB instead of localStorage
 */

class ImageAttachmentsManager {
    constructor() {
        // ✅ Uses IndexedDB instead of localStorage
    }

    /**
     * Get all images from central storage
     */
    async getAllImages() {
        try {
            return await window.imageIndexedDB.getAllImages();
        } catch (error) {
            console.error('❌ Failed to get images:', error);
            return {};
        }
    }

    /**
     * Save all images to central storage (bulk operation)
     */
    async saveAllImages(images) {
        try {
            await window.imageIndexedDB.saveAllImages(images);
        } catch (error) {
            console.error('❌ Failed to save images:', error);
            throw error;
        }
    }

    /**
     * Add or update an image in central storage
     * @param {string} imageId - Unique image ID
     * @param {object} imageData - {full: base64, retro: base64}
     * @param {string} appType - 'gallery', 'messages', or 'chatgpt'
     * @param {string} threadId - Optional thread ID for messages
     * @returns {Promise<string>} - Image ID
     */
    async saveImage(imageId, imageData, appType, threadId = null) {
        const images = await this.getAllImages();

        if (!images[imageId]) {
            // ✅ ÚJ kép létrehozása
            images[imageId] = {
                id: imageId,
                full: imageData.full,
                retro: imageData.retro,
                timestamp: Date.now(),
                references: {
                    gallery: false,
                    messages: [],
                    chatgpt: false
                }
            };
        }

        // ✅ Referencia hozzáadása
        this.addReference(images[imageId], appType, threadId);

        // ✅ Save to IndexedDB
        await window.imageIndexedDB.saveImage(images[imageId]);
        console.log(`💾 Image saved: ${imageId} (${appType}${threadId ? ` - ${threadId}` : ''})`);
        return imageId;
    }

    /**
     * Add a reference to an image
     */
    addReference(image, appType, threadId = null) {
        if (appType === 'gallery') {
            image.references.gallery = true;
        } else if (appType === 'messages' && threadId) {
            if (!image.references.messages.includes(threadId)) {
                image.references.messages.push(threadId);
            }
        } else if (appType === 'chatgpt') {
            image.references.chatgpt = true;
        }
    }

    /**
     * Remove a reference from an image
     */
    removeReference(image, appType, threadId = null) {
        if (appType === 'gallery') {
            image.references.gallery = false;
        } else if (appType === 'messages' && threadId) {
            image.references.messages = image.references.messages.filter(id => id !== threadId);
        } else if (appType === 'chatgpt') {
            image.references.chatgpt = false;
        }
    }

    /**
     * Check if image has any references
     */
    hasReferences(image) {
        return image.references.gallery || 
               image.references.messages.length > 0 || 
               image.references.chatgpt;
    }

    /**
     * Save an image for Messages app
     * @param {object} imageData - {full: base64, retro: base64}
     * @param {string} threadId - Thread/profile ID
     * @returns {Promise<string>} - Image ID
     */
    async saveMessageImage(imageData, threadId) {
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return await this.saveImage(imageId, imageData, 'messages', threadId);
    }

    /**
     * Save an image for ChatGPT app
     * @param {object} imageData - {full: base64, retro: base64}
     * @returns {Promise<string>} - Image ID
     */
    async saveChatImage(imageData) {
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return await this.saveImage(imageId, imageData, 'chatgpt');
    }

    /**
     * Save an image from Gallery (DCIM → Storage)
     * @param {string} imageId - Existing DCIM image ID
     * @param {object} imageData - {full: base64, retro: base64}
     * @returns {Promise<string>} - Image ID
     */
    async saveGalleryImage(imageId, imageData) {
        return await this.saveImage(imageId, imageData, 'gallery');
    }

    /**
     * Get a specific image by ID
     */
    async getImage(imageId) {
        try {
            return await window.imageIndexedDB.getImage(imageId);
        } catch (error) {
            console.error('❌ Failed to get image:', error);
            return null;
        }
    }

    /**
     * Alias for backward compatibility
     */
    async getMessageImage(imageId) {
        return await this.getImage(imageId);
    }

    /**
     * Alias for backward compatibility
     */
    async getChatImage(imageId) {
        return await this.getImage(imageId);
    }

    /**
     * Remove reference from Messages thread
     * @param {string} threadId - Thread ID
     */
    async removeMessagesThreadReferences(threadId) {
        const images = await this.getAllImages();
        let removedCount = 0;

        for (const [imageId, imageData] of Object.entries(images)) {
            if (imageData.references.messages.includes(threadId)) {
                this.removeReference(imageData, 'messages', threadId);
                
                // ✅ Ha már nincs referencia, töröljük a képet
                if (!this.hasReferences(imageData)) {
                    await window.imageIndexedDB.deleteImage(imageId);
                    removedCount++;
                    console.log(`🗑️ Image deleted (no references): ${imageId}`);
                } else {
                    // Update the image with removed reference
                    await window.imageIndexedDB.saveImage(imageData);
                }
            }
        }

        if (removedCount > 0) {
            console.log(`🗑️ Removed thread references for: ${threadId} (${removedCount} images deleted)`);
        }
    }

    /**
     * Clear all ChatGPT references
     */
    async clearChatGPTReferences() {
        const images = await this.getAllImages();
        let removedCount = 0;

        for (const [imageId, imageData] of Object.entries(images)) {
            if (imageData.references.chatgpt) {
                this.removeReference(imageData, 'chatgpt');
                
                // ✅ Ha már nincs referencia, töröljük a képet
                if (!this.hasReferences(imageData)) {
                    await window.imageIndexedDB.deleteImage(imageId);
                    removedCount++;
                    console.log(`🗑️ Image deleted (no references): ${imageId}`);
                } else {
                    // Update the image with removed reference
                    await window.imageIndexedDB.saveImage(imageData);
                }
            }
        }

        if (removedCount > 0) {
            console.log(`🗑️ Cleared ChatGPT references (${removedCount} images deleted)`);
        }
    }

    /**
     * Remove Gallery reference (when image deleted from Gallery)
     * @param {string} imageId - Image ID
     */
    async removeGalleryReference(imageId) {
        const imageData = await window.imageIndexedDB.getImage(imageId);

        if (imageData) {
            this.removeReference(imageData, 'gallery');

            // ✅ Ha már nincs referencia, töröljük a képet
            if (!this.hasReferences(imageData)) {
                await window.imageIndexedDB.deleteImage(imageId);
                console.log(`🗑️ Image deleted (no references): ${imageId}`);
            } else {
                // Update the image with removed reference
                await window.imageIndexedDB.saveImage(imageData);
            }
        }
    }

    /**
     * Delete a chat image (DEPRECATED - use clearChatGPTReferences)
     */
    deleteChatImage(attachmentId) {
        console.warn('⚠️ deleteChatImage() is deprecated, references are handled automatically');
    }

    /**
     * Count total images in storage
     */
    async countAllImages() {
        return await window.imageIndexedDB.countImages();
    }

    /**
     * Count images used by Messages
     */
    async countMessageImages() {
        const images = await this.getAllImages();
        return Object.values(images).filter(img => img.references && img.references.messages && img.references.messages.length > 0).length;
    }

    /**
     * Count images used by ChatGPT
     */
    async countChatImages() {
        const images = await this.getAllImages();
        return Object.values(images).filter(img => img.references && img.references.chatgpt).length;
    }

    /**
     * Count images in Gallery
     */
    async countGalleryImages() {
        const images = await this.getAllImages();
        return Object.values(images).filter(img => img.references && img.references.gallery).length;
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        return await window.imageIndexedDB.getStorageStats();
    }

    /**
     * Clean up orphaned images (images with no references)
     */
    async cleanupOrphanedImages() {
        const images = await this.getAllImages();
        let removedCount = 0;

        for (const [imageId, imageData] of Object.entries(images)) {
            if (!this.hasReferences(imageData)) {
                await window.imageIndexedDB.deleteImage(imageId);
                removedCount++;
                console.log(`🗑️ Orphaned image deleted: ${imageId}`);
            }
        }

        if (removedCount > 0) {
            console.log(`🧹 Cleanup complete: ${removedCount} orphaned images deleted`);
        }

        return removedCount;
    }

    /**
     * Migrate old storage format to new unified format
     * NOTE: This is now handled by nokia_image_migration.js
     */
    async migrateOldStorage() {
        console.log('✅ Migration handled by nokia_image_migration.js');
    }
}

// Initialize global instance
window.imageAttachments = new ImageAttachmentsManager();
