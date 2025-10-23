/**
 * Nokia DCIM Manager
 * Manages access to images stored in IndexedDB
 * UPDATED: Now uses IndexedDB instead of localStorage
 */

class DCIMManager {
    constructor() {
        // No longer needs storageKey - uses IndexedDB
    }

    /**
     * Get all images from DCIM
     * @returns {Promise<Array>} Array of image objects {id, full, retro, date, timestamp}
     */
    async getAllImages() {
        try {
            const images = await window.imageIndexedDB.getAllDCIMPhotos();
            return Array.isArray(images) ? images : [];
        } catch (error) {
            console.error('❌ Failed to load DCIM images:', error);
            return [];
        }
    }

    /**
     * Get a specific image by ID
     * @param {number|string} id - Image ID
     * @returns {Promise<Object|null>} Image object or null
     */
    async getImage(id) {
        try {
            return await window.imageIndexedDB.getDCIMPhoto(id);
        } catch (error) {
            console.error('❌ Failed to get image:', error);
            return null;
        }
    }

    /**
     * Get a specific image by index (for backward compatibility)
     * @param {number} index - Image index (0 = newest)
     * @returns {Promise<Object|null>} Image object or null
     */
    async getImageByIndex(index) {
        try {
            const images = await this.getAllImages();
            return images[index] || null;
        } catch (error) {
            console.error('❌ Failed to get image by index:', error);
            return null;
        }
    }

    /**
     * Get total number of images
     * @returns {Promise<number>}
     */
    async getImageCount() {
        try {
            return await window.imageIndexedDB.countDCIMPhotos();
        } catch (error) {
            console.error('❌ Failed to count images:', error);
            return 0;
        }
    }

    /**
     * Check if DCIM has any images
     * @returns {Promise<boolean>}
     */
    async hasImages() {
        const count = await this.getImageCount();
        return count > 0;
    }

    /**
     * Save a new image to DCIM
     * @param {Object} imageData - {id, full, retro, date, timestamp}
     * @returns {Promise<boolean>} Success
     */
    async saveImage(imageData) {
        try {
            // Ensure required fields
            if (!imageData.id) {
                imageData.id = Date.now();
            }
            if (!imageData.timestamp) {
                imageData.timestamp = imageData.id;
            }
            if (!imageData.date) {
                imageData.date = new Date().toISOString();
            }

            await window.imageIndexedDB.saveDCIMPhoto(imageData);
            console.log('✅ Image saved to DCIM');
            return true;
        } catch (error) {
            console.error('❌ Failed to save image:', error);
            return false;
        }
    }

    /**
     * Delete an image by ID
     * @param {number|string} id - Image ID
     * @returns {Promise<boolean>} Success
     */
    async deleteImage(id) {
        try {
            await window.imageIndexedDB.deleteDCIMPhoto(id);
            console.log(`🗑️ Image ${id} deleted from DCIM`);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete image:', error);
            return false;
        }
    }

    /**
     * Delete an image by index (for backward compatibility)
     * @param {number} index - Image index
     * @returns {Promise<boolean>} Success
     */
    async deleteImageByIndex(index) {
        try {
            const images = await this.getAllImages();
            if (index < 0 || index >= images.length) return false;
            
            const imageId = images[index].id;
            return await this.deleteImage(imageId);
        } catch (error) {
            console.error('❌ Failed to delete image by index:', error);
            return false;
        }
    }

    /**
     * Clear all images
     * @returns {Promise<boolean>} Success
     */
    async clearAll() {
        try {
            await window.imageIndexedDB.clearDCIM();
            console.log('🗑️ All DCIM images cleared');
            return true;
        } catch (error) {
            console.error('❌ Failed to clear DCIM:', error);
            return false;
        }
    }

    /**
     * Get DCIM storage statistics
     * @returns {Promise<Object>}
     */
    async getStorageStats() {
        try {
            const count = await this.getImageCount();
            return {
                count,
                using: 'IndexedDB'
            };
        } catch (error) {
            console.error('❌ Failed to get storage stats:', error);
            return {
                count: 0,
                using: 'IndexedDB',
                error: error.message
            };
        }
    }
}

// Initialize global instance
window.dcimManager = new DCIMManager();
