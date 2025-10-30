/**
 * Nokia Unified History Manager
 * 
 * Központi history kezelő, amely MINDEN app (ChatGPT, Messages, Phone) üzeneteit
 * profil alapú context-ekbe rendezi. Így minden profil látja a saját teljes
 * előzményeit (text, SMS, voice) minden app-ban, de más profilok history-ját NEM.
 * 
 * @version 1.0
 * @date 2025-10-26
 */

class NokiaUnifiedHistoryManager {
    constructor() {
        // Storage key for unified history
        this.storageKey = 'nokia_unified_history';
        
        // Context ID format: 'profile-{filename}' or 'main' for default
        // Example: 'profile-2-penny.ini' or 'main'
        this.contexts = {};
        
        // Current active context
        this.currentContextId = 'main';
        
        // Legacy migration flags
        this.migrated = {
            chatgpt: false,
            messages: false,
            phone: false
        };
        
        this.loadHistories();
    }

    /**
     * Load all histories from localStorage
     */
    loadHistories() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.contexts = JSON.parse(saved);
            } else {
                // Create default main context
                this.contexts = { main: [] };
            }
            
            console.log('✅ Unified History Manager loaded');
            console.log(`📚 Contexts: ${Object.keys(this.contexts).length}`);
            
        } catch (error) {
            console.error('❌ Failed to load unified history:', error);
            this.contexts = { main: [] };
        }
    }

    /**
     * Save all histories to localStorage
     */
    saveHistories() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.contexts));
        } catch (error) {
            console.error('❌ Failed to save unified history:', error);
        }
    }

    /**
     * Get context ID for a profile
     * @param {Object|string} profile - Profile object vagy profile filename
     * @returns {string} Context ID
     */
    getContextId(profile) {
        if (!profile) return 'main';
        
        if (typeof profile === 'string') {
            // Ha string, akkor filename
            return `profile-${profile}`;
        }
        
        if (profile.filename) {
            return `profile-${profile.filename}`;
        }
        
        return 'main';
    }

    /**
     * Get history for a specific context
     * @param {string} contextId - Context ID
     * @returns {Array} History messages
     */
    getHistory(contextId) {
        if (!this.contexts[contextId]) {
            this.contexts[contextId] = [];
        }
        return this.contexts[contextId];
    }

    /**
     * Get history for current context
     * @returns {Array} History messages
     */
    getCurrentHistory() {
        return this.getHistory(this.currentContextId);
    }

    /**
     * Switch to a different context
     * @param {string} contextId - Context ID
     */
    switchContext(contextId) {
        this.currentContextId = contextId;
        console.log(`🔄 Context switched to: ${contextId}`);
    }

    /**
     * Add a message to a specific context
     * @param {string} contextId - Context ID
     * @param {Object} message - Message object
     */
    addMessage(contextId, message) {
        if (!this.contexts[contextId]) {
            this.contexts[contextId] = [];
        }
        
        // Add timestamp if not present
        if (!message.timestamp) {
            message.timestamp = Date.now();
        }
        
        // Add metadata if not present
        if (!message.metadata) {
            message.metadata = {};
        }
        
        this.contexts[contextId].push(message);
        this.saveHistories();
        
        console.log(`💬 Message added to context "${contextId}":`, message.role, message.type || 'text');
    }

    /**
     * Add a message to current context
     * @param {Object} message - Message object
     */
    addMessageToCurrent(message) {
        this.addMessage(this.currentContextId, message);
    }

    /**
     * Clear history for a specific context
     * @param {string} contextId - Context ID
     */
    clearContext(contextId) {
        this.contexts[contextId] = [];
        this.saveHistories();
        console.log(`🗑️ Context cleared: ${contextId}`);
    }

    /**
     * Clear current context
     */
    clearCurrentContext() {
        this.clearContext(this.currentContextId);
    }

    /**
     * Delete a context completely
     * @param {string} contextId - Context ID
     */
    deleteContext(contextId) {
        delete this.contexts[contextId];
        this.saveHistories();
        console.log(`❌ Context deleted: ${contextId}`);
    }

    /**
     * Get all context IDs
     * @returns {Array<string>}
     */
    getAllContextIds() {
        return Object.keys(this.contexts);
    }

    /**
     * Get message count for a context
     * @param {string} contextId - Context ID
     * @returns {number}
     */
    getMessageCount(contextId) {
        return this.getHistory(contextId).length;
    }

    /**
     * Get messages by type (text, sms, voice)
     * @param {string} contextId - Context ID
     * @param {string} type - Message type
     * @returns {Array}
     */
    getMessagesByType(contextId, type) {
        return this.getHistory(contextId).filter(msg => 
            (msg.type || 'text') === type
        );
    }

    /**
     * Get last message in context
     * @param {string} contextId - Context ID
     * @returns {Object|null}
     */
    getLastMessage(contextId) {
        const history = this.getHistory(contextId);
        return history.length > 0 ? history[history.length - 1] : null;
    }

    /**
     * ✅ MIGRATE: ChatGPT conversation history
     * Migrates from old conversationHistories format
     */
    migrateChatGPTHistory() {
        if (this.migrated.chatgpt) {
            console.log('ℹ️ ChatGPT history already migrated');
            return;
        }

        try {
            const oldHistoriesStr = localStorage.getItem('nokia_chat_histories');
            if (!oldHistoriesStr) {
                console.log('ℹ️ No old ChatGPT history to migrate');
                this.migrated.chatgpt = true;
                return;
            }

            const oldHistories = JSON.parse(oldHistoriesStr);
            
            // Migrate 'main' context
            if (oldHistories.main && oldHistories.main.length > 0) {
                console.log(`📦 Migrating ${oldHistories.main.length} ChatGPT messages from 'main'`);
                
                oldHistories.main.forEach(msg => {
                    // Add type metadata
                    if (!msg.metadata) msg.metadata = {};
                    msg.metadata.app = 'chatgpt';
                    msg.type = 'text';
                    
                    this.contexts.main.push(msg);
                });
            }

            // Migrate profile-specific contexts
            Object.keys(oldHistories).forEach(key => {
                if (key !== 'main' && oldHistories[key].length > 0) {
                    const contextId = key.startsWith('profile-') ? key : `profile-${key}`;
                    console.log(`📦 Migrating ${oldHistories[key].length} ChatGPT messages from '${key}' to '${contextId}'`);
                    
                    if (!this.contexts[contextId]) {
                        this.contexts[contextId] = [];
                    }
                    
                    oldHistories[key].forEach(msg => {
                        if (!msg.metadata) msg.metadata = {};
                        msg.metadata.app = 'chatgpt';
                        msg.type = 'text';
                        
                        this.contexts[contextId].push(msg);
                    });
                }
            });

            this.saveHistories();
            this.migrated.chatgpt = true;
            console.log('✅ ChatGPT history migration complete');
            
        } catch (error) {
            console.error('❌ ChatGPT history migration failed:', error);
        }
    }

    /**
     * ✅ MIGRATE: Messages (SMS) threads
     * Migrates from nokia_messages_threads format
     */
    migrateMessagesHistory() {
        if (this.migrated.messages) {
            console.log('ℹ️ Messages history already migrated');
            return;
        }

        try {
            const oldThreadsStr = localStorage.getItem('nokia_messages_threads');
            if (!oldThreadsStr) {
                console.log('ℹ️ No old Messages threads to migrate');
                this.migrated.messages = true;
                return;
            }

            const oldThreads = JSON.parse(oldThreadsStr);
            console.log(`📦 Migrating ${oldThreads.length} Messages threads`);

            oldThreads.forEach(thread => {
                const contextId = this.getContextId(thread.profileId);
                console.log(`  - Migrating ${thread.messages.length} messages for ${thread.name} (${contextId})`);
                
                if (!this.contexts[contextId]) {
                    this.contexts[contextId] = [];
                }

                thread.messages.forEach(msg => {
                    // Convert SMS message to unified format
                    const unifiedMsg = {
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp,
                        type: 'sms',
                        metadata: {
                            app: 'messages',
                            profileId: thread.profileId,
                            profileName: thread.name,
                            profileEmoji: thread.emoji,
                            status: msg.status,
                            statusHistory: msg.statusHistory,
                            images: msg.images
                        }
                    };

                    this.contexts[contextId].push(unifiedMsg);
                });
            });

            this.saveHistories();
            this.migrated.messages = true;
            console.log('✅ Messages history migration complete');
            
        } catch (error) {
            console.error('❌ Messages history migration failed:', error);
        }
    }

    /**
     * ✅ MIGRATE: Phone call history
     * Migrates from nokia_call_history format
     */
    migratePhoneHistory() {
        if (this.migrated.phone) {
            console.log('ℹ️ Phone history already migrated');
            return;
        }

        try {
            const oldCallsStr = localStorage.getItem('nokia_call_history');
            if (!oldCallsStr) {
                console.log('ℹ️ No old Phone call history to migrate');
                this.migrated.phone = true;
                return;
            }

            const oldCalls = JSON.parse(oldCallsStr);
            console.log(`📦 Migrating ${oldCalls.length} Phone calls`);

            oldCalls.forEach(call => {
                // Find profile by name (ezt finomítani kell!)
                // Egyelőre csak a name alapján próbáljuk
                const profile = window.profileManager ? 
                    window.profileManager.profiles.find(p => p.name === call.contactName) : null;
                
                const contextId = profile ? 
                    this.getContextId(profile.filename) : 
                    'main'; // Ha nem találjuk a profilt, main-be rakjuk

                console.log(`  - Migrating call with ${call.contactName} (${contextId})`);

                if (!this.contexts[contextId]) {
                    this.contexts[contextId] = [];
                }

                // Convert each transcript entry to a message
                if (call.transcript && call.transcript.length > 0) {
                    call.transcript.forEach(entry => {
                        const unifiedMsg = {
                            role: entry.role === 'user' ? 'user' : 'assistant',
                            content: entry.text,
                            timestamp: call.timestamp, // Use call timestamp (not perfect, but close enough)
                            type: 'voice',
                            metadata: {
                                app: 'phone',
                                callId: call.id,
                                contactName: call.contactName,
                                contactEmoji: call.contactEmoji,
                                duration: call.duration,
                                cost: call.cost,
                                isVoice: true
                            }
                        };

                        this.contexts[contextId].push(unifiedMsg);
                    });
                }
            });

            this.saveHistories();
            this.migrated.phone = true;
            console.log('✅ Phone history migration complete');
            
        } catch (error) {
            console.error('❌ Phone history migration failed:', error);
        }
    }

    /**
     * ✅ Migrate all old histories
     */
    migrateAllHistories() {
        console.log('🔄 Starting unified history migration...');
        
        this.migrateChatGPTHistory();
        this.migrateMessagesHistory();
        this.migratePhoneHistory();
        
        console.log('✅ All history migrations complete!');
        console.log(`📊 Total contexts: ${Object.keys(this.contexts).length}`);
        
        // Print summary
        Object.keys(this.contexts).forEach(contextId => {
            const count = this.contexts[contextId].length;
            console.log(`  - ${contextId}: ${count} messages`);
        });
    }
}

// Initialize global instance
window.unifiedHistoryManager = new NokiaUnifiedHistoryManager();
console.log('✅ Nokia Unified History Manager initialized');
