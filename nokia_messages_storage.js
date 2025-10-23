/**
 * Nokia Messages Storage
 * Manages message threads and conversations in localStorage
 */

class NokiaMessagesStorage {
    constructor() {
        this.storageKey = 'nokia_messages_threads';
    }

    /**
     * Get all message threads
     * @returns {Array} Array of thread objects
     */
    getAllThreads() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('❌ Failed to load threads:', error);
            return [];
        }
    }

    /**
     * Get a specific thread by profile ID
     * @param {string} profileId - Profile filename (e.g., "2-penny.ini")
     * @returns {Object|null} Thread object or null if not found
     */
    getThread(profileId) {
        const threads = this.getAllThreads();
        return threads.find(t => t.profileId === profileId) || null;
    }

    /**
     * Create a new thread or update existing one
     * @param {string} profileId - Profile filename
     * @param {Object} profileData - Profile metadata (emoji, name)
     * @param {Array} messages - Array of message objects
     */
    saveThread(profileId, profileData, messages) {
        const threads = this.getAllThreads();
        const existingIndex = threads.findIndex(t => t.profileId === profileId);

        const thread = {
            profileId,
            emoji: profileData.emoji,
            name: profileData.name,
            messages: messages || [],
            lastMessageTime: Date.now(),
            unread: 0 // Could be used for future notification feature
        };

        if (existingIndex !== -1) {
            threads[existingIndex] = thread;
        } else {
            threads.push(thread);
        }

        // Sort by last message time (newest first)
        threads.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(threads));
            console.log(`💾 Thread saved: ${profileData.name}`);
        } catch (error) {
            console.error('❌ Failed to save thread:', error);
        }
    }

    /**
     * Add a message to a thread
     * @param {string} profileId - Profile filename
     * @param {Object} profileData - Profile metadata
     * @param {string} role - "user" or "assistant"
     * @param {string} content - Message text
     * @param {array} imageAttachmentIds - Optional array of image attachment IDs
     */
    addMessage(profileId, profileData, role, content, imageAttachmentIds = null) {
        const thread = this.getThread(profileId);
        const messages = thread ? thread.messages : [];

        const message = {
            role,
            content,
            timestamp: Date.now(),
            status: role === 'user' ? 'sent' : null, // ✅ User messages start as 'sent'
            statusHistory: role === 'user' ? [{ status: 'sent', time: Date.now() }] : [] // ✅ Track status changes
        };
        
        // ✅ Add image attachments if provided
        if (imageAttachmentIds && imageAttachmentIds.length > 0) {
            message.images = imageAttachmentIds;
        }

        messages.push(message);

        // ✅ FONTOS: saveThread() meghívása frissíti a lastMessageTime-ot is!
        this.saveThread(profileId, profileData, messages);
        
        console.log(`💬 Message added to ${profileId}: ${role} - "${content.substring(0, 50)}..."`);
        
        return message; // ✅ Return the message object
    }

    /**
     * ✅ ÚJ: Update message status
     * @param {string} profileId - Profile filename
     * @param {number} messageIndex - Index of the message in the thread
     * @param {string} newStatus - New status ('sent', 'received', 'read')
     */
    updateMessageStatus(profileId, messageIndex, newStatus) {
        const thread = this.getThread(profileId);
        if (!thread || !thread.messages[messageIndex]) return;

        const message = thread.messages[messageIndex];
        message.status = newStatus;
        
        // Add to status history
        if (!message.statusHistory) {
            message.statusHistory = [];
        }
        message.statusHistory.push({ status: newStatus, time: Date.now() });

        // Save the updated thread
        this.saveThread(profileId, { emoji: thread.emoji, name: thread.name }, thread.messages);
    }

    /**
     * ✅ ÚJ: Mark thread as having unread messages
     * @param {string} profileId - Profile filename
     * @param {boolean} hasUnread - Whether thread has unread messages
     */
    setUnreadStatus(profileId, hasUnread) {
        const threads = this.getAllThreads();
        const thread = threads.find(t => t.profileId === profileId);
        
        if (thread) {
            thread.unread = hasUnread ? 1 : 0;
            
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(threads));
            } catch (error) {
                console.error('❌ Failed to update unread status:', error);
            }
        }
    }

    /**
     * Delete a thread
     * @param {string} profileId - Profile filename
     */
    deleteThread(profileId) {
        // ✅ ÚJ API: Referenciák törlése a thread-hez tartozó képekről
        if (window.imageAttachments) {
            window.imageAttachments.removeMessagesThreadReferences(profileId);
        }
        
        const threads = this.getAllThreads();
        const filtered = threads.filter(t => t.profileId !== profileId);

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(filtered));
            console.log(`🗑️ Thread deleted: ${profileId}`);
        } catch (error) {
            console.error('❌ Failed to delete thread:', error);
        }
    }

    /**
     * Clear all messages in a thread
     * @param {string} profileId - Profile filename
     */
    clearThread(profileId) {
        const thread = this.getThread(profileId);
        if (thread) {
            // ✅ ÚJ API: Referenciák törlése a thread-hez tartozó képekről
            if (window.imageAttachments) {
                window.imageAttachments.removeMessagesThreadReferences(profileId);
            }
            
            this.saveThread(profileId, { emoji: thread.emoji, name: thread.name }, []);
            console.log(`🧹 Thread cleared: ${thread.name}`);
        }
    }

    /**
     * Get total number of threads
     * @returns {number}
     */
    getThreadCount() {
        return this.getAllThreads().length;
    }

    /**
     * ✅ ÚJ: Előnekérzése, hogy van-e olvasatlan üzenet
     * @returns {boolean}
     */
    hasUnreadMessages() {
        const threads = this.getAllThreads();
        return threads.some(thread => thread.unread > 0);
    }

    /**
     * ✅ ÚJ: Frissíti a status bar borítékok ikonját
     */
    updateNewMessageIndicator() {
        const indicator = document.getElementById('newMessageIndicator');
        if (!indicator) return;
        
        if (this.hasUnreadMessages()) {
            indicator.classList.remove('hidden');
        } else {
            indicator.classList.add('hidden');
        }
    }
}

// Initialize global instance
window.messagesStorage = new NokiaMessagesStorage();
