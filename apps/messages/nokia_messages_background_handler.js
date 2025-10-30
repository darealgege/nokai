/**
 * Nokia Messages Background Handler
 * Handles message processing in the background (when user exits the conversation)
 * Manages status transitions: sent → received → read
 * Manages delayed AI responses (3-45s)
 */

class MessagesBackgroundHandler {
    constructor() {
        this.pendingResponses = new Map(); // profileId -> { messageIndex, timer }
        this.pendingTransitions = new Map(); // profileId -> { messageIndex, type, timer }
    }

    /**
     * Start background processing for a user message
     * @param {string} profileId - Profile filename
     * @param {number} messageIndex - Index of the user message
     * @param {Object} profileData - Profile metadata (emoji, name)
     */
    startBackgroundProcessing(profileId, messageIndex, profileData) {
        // Clear any existing timers for this profile
        this.cancelPendingResponse(profileId);
        
        // Schedule status transitions: sent → received (1-4s) → read (1-5s)
        this.scheduleStatusTransition(profileId, messageIndex, 'received', this.randomDelay(1000, 4000));
        
        // Schedule AI response (3-45s delay)
        const responseDelay = this.randomDelay(3000, 45000);
        const timer = setTimeout(() => {
            this.processAIResponse(profileId, profileData);
        }, responseDelay);
        
        this.pendingResponses.set(profileId, { messageIndex, timer });
        
        console.log(`📤 Background processing started for ${profileId}`);
        console.log(`⏱️ Status transitions: sent → received → read`);
        console.log(`⏱️ AI response in ${Math.round(responseDelay / 1000)}s`);
    }

    /**
     * Schedule a status transition
     */
    scheduleStatusTransition(profileId, messageIndex, newStatus, delay) {
        const timer = setTimeout(() => {
            console.log(`🔄 [Status Transition] Starting: ${newStatus} for message ${messageIndex} in ${profileId}`);
            
            // Update status in storage
            window.messagesStorage.updateMessageStatus(profileId, messageIndex, newStatus);
            console.log(`💾 [Storage] Status updated to '${newStatus}'`);
            
            // If we just moved to 'received', schedule 'read' transition
            if (newStatus === 'received') {
                this.scheduleStatusTransition(profileId, messageIndex, 'read', this.randomDelay(1000, 5000));
            }
            
            // ✅ JAVÍTÁS: Ha a user JELENLEG nézi ezt a conversation-t, frissítsük a UI-t!
            if (window.nokiaMessages && 
                window.nokiaMessages.isActive && 
                window.nokiaMessages.viewMode === 'conversation' &&
                window.nokiaMessages.currentThread && 
                window.nokiaMessages.currentThread.profileId === profileId) {
                
                console.log(`👀 [UI Check] User is viewing this conversation!`);
                console.log(`👀 [UI Check] Messages app active: ${window.nokiaMessages.isActive}`);
                console.log(`👀 [UI Check] View mode: ${window.nokiaMessages.viewMode}`);
                console.log(`👀 [UI Check] Current thread: ${window.nokiaMessages.currentThread.profileId}`);
                
                // Frissítsük a thread-et a storage-ból
                window.nokiaMessages.currentThread = window.messagesStorage.getThread(profileId);
                console.log(`🔄 [UI Update] Refreshing conversation view...`);
                
                window.nokiaMessages.renderConversation();
                console.log(`✅ [UI Update] Conversation rendered!`);
            } else {
                console.log(`❌ [UI Check] User NOT viewing this conversation`);
                if (window.nokiaMessages) {
                    console.log(`   - App active: ${window.nokiaMessages.isActive}`);
                    console.log(`   - View mode: ${window.nokiaMessages.viewMode}`);
                    console.log(`   - Current thread: ${window.nokiaMessages.currentThread ? window.nokiaMessages.currentThread.profileId : 'null'}`);
                }
            }
            
            console.log(`✅ Status updated to '${newStatus}' for message ${messageIndex} in ${profileId}`);
        }, delay);
        
        // Store the timer
        const key = `${profileId}_${messageIndex}_${newStatus}`;
        this.pendingTransitions.set(key, timer);
    }

    /**
     * Process AI response in the background
     */
    async processAIResponse(profileId, profileData) {
        try {            
            console.log(`🤖 Processing AI response for ${profileId}`);
            
            // ✅ Töltsük be a friss thread-et
            const thread = window.messagesStorage.getThread(profileId);
            if (!thread) {
                console.error('❌ Thread not found!');
                return;
            }
            
            // ✅ Keresük meg a profile-t a profileManager-ben
            let profile = null;
            if (window.profileManager) {
                profile = window.profileManager.profiles.find(p => p.filename === profileId);
            }
            
            if (!profile) {
                console.error(`❌ Profile not found: ${profileId}`);
                return;
            }
            
            const modelName = MODELS[selectedModel];
            
            // ✅ ÚJ: Ellenőrizzük, van-e kép az utolsó user üzenetben!
            const lastUserMessage = thread.messages.filter(m => m.role === 'user').pop();
            const hasImage = lastUserMessage && lastUserMessage.images && lastUserMessage.images.length > 0;
            
            let aiReply, usage, usedModel;
            
            if (hasImage) {
                // ✅ VISION API hívás képpel
                console.log('📷 Message has image, using Vision API...');
                
                // Töltsük be a képet
                const attachmentId = lastUserMessage.images[0];
                const imageData = await window.imageAttachments.getMessageImage(attachmentId); // ✅ Now async
                
                if (!imageData || !imageData.full) { // ✅ Validate imageData.full too
                    console.error('❌ Image not found in storage!', { attachmentId, imageData });
                    throw new Error('Image not found');
                }
                
                // System prompt készítése
                const now = new Date();
                const dateTimeString = now.toLocaleString('hu-HU', { hour12: false });
                const weatherData = await getWeatherData();
                
                let systemPrompt = profile.prompt;
                systemPrompt += `\n\n[BACKGROUND INFO - Use ONLY if asked]\nCurrent date and time: ${dateTimeString}.`;
                if (weatherData) {
                    systemPrompt += `\n${weatherData}`;
                }
                systemPrompt += `\n[END BACKGROUND INFO]`;
                systemPrompt += `\n\nCRITICAL RULES:\n1. LANGUAGE: ALWAYS respond in the exact same language as the last user message.\n2. FORMAT: Keep your responses concise and conversational, suitable for an SMS message on a small screen.\n3. TIME/DATE: The current time is always fresh in the background info above. Only mention it if user explicitly asks.\n4. BACKGROUND INFO: Only mention weather/location/time if user explicitly asks. Do NOT volunteer this information.`;
                
                // Előzmények (text only, utolsó 10 üzenet)
                const history = thread.messages.slice(-10).map(m => ({
                    role: m.role,
                    content: m.content
                }));
                
                // ✅ ÚJ: Explicit időfrissítő üzenet hozzáadása a history végére
                history.push({
                    role: 'system',
                    content: `[CRITICAL TIME UPDATE]\nCurrent date and time RIGHT NOW: ${dateTimeString}\nIMPORTANT: If user asks about current time, use THIS fresh value, NOT any previous time mentions.\n[END TIME UPDATE]`
                });
                
                // Vision API hívás
                // ✅ ÚJ: Kontextuális prompt készítése, mint a Messages Image Handler-ben
                let contextualPrompt = '';
                if (lastUserMessage.content && lastUserMessage.content.trim()) {
                    contextualPrompt = lastUserMessage.content;
                } else {
                    contextualPrompt = `${profile.name} sent you a photo via MMS. / ${profile.name} küldött egy fotót MMS-ben.`;
                }
                
                const visionResponse = await window.visionHandler.analyzeImage(
                    imageData.full,
                    contextualPrompt,
                    history,
                    systemPrompt
                );
                
                aiReply = visionResponse.choices[0].message.content;
                usage = visionResponse.usage;
                usedModel = visionResponse.model || 'gpt-4o-mini';
                
                console.log(`✅ Vision API response received`);
                
            } else {
                 // ✅ UNIFIED HISTORY: API-hoz az unified history-t használjuk!
                const contextId = window.unifiedHistoryManager.getContextId(profileId);
                const unifiedHistory = window.unifiedHistoryManager.getHistory(contextId)
                    .filter(msg => msg.type === 'text' || msg.type === 'voice')
                    .map(msg => ({ role: msg.role, content: msg.content }));
                
                console.log(`📚 Messages API: Loading ${unifiedHistory.length} messages for context "${contextId}"`);
                
                const apiMessages = unifiedHistory;
                
                // Keressük-e?
                let searchData = null;
                if (lastUserMessage && window.decisionAgent && window.searchHandler) {
                    const needsSearch = await window.decisionAgent.shouldSearch(lastUserMessage.content);
                    if (needsSearch) {
                        console.log('💬 Messages App: Decision is to SEARCH.');
                        searchData = await window.searchHandler.executeSearch(lastUserMessage.content, true);
                    }
                }
        
                // System prompt készítése
                const now = new Date();
                const dateTimeString = now.toLocaleString('hu-HU', { hour12: false });
                const weatherData = await getWeatherData();
        
                let systemPrompt = profile.prompt;
                systemPrompt += `\n\n[BACKGROUND INFO - Use ONLY if asked]\nCurrent date and time: ${dateTimeString}.`;

                if (weatherData) {
                    systemPrompt += `\n${weatherData}`;
                }
                
                systemPrompt += `\n[END BACKGROUND INFO]`;

                if (searchData && (searchData.braveResults.length > 0 || searchData.perplexityResults.length > 0)) {
                    systemPrompt += '\n\n[SEARCH RESULTS - Use to answer current question]\n' + window.searchHandler.formatForContext(searchData) + '\n[END SEARCH RESULTS]';
                }

                systemPrompt += `\n\nCRITICAL RULES:\n1. MANDATORY LANGUAGE RULE: ALWAYS respond in the exact same language as the last user message, except if asked to use mixed languages.\n2. FORMAT: Keep your responses concise and conversational, suitable for an SMS message on a small screen.\n3. TIME/DATE: The current time is always fresh in the background info above. Only mention it if user explicitly asks.\n4. BACKGROUND INFO: Only mention weather/location/time if user explicitly asks. Do NOT volunteer this information.`;                
                
                console.log(`📤 Sending request to AI...`);
        
                // ✅ ÚJ: Explicit időfrissítő üzenet hozzáadása
                const messagesWithTimeUpdate = [
                    ...apiMessages,
                    {
                        role: 'system',
                        content: `[CRITICAL TIME UPDATE]\nCurrent date and time RIGHT NOW: ${dateTimeString}\nIMPORTANT: If user asks about current time, use THIS fresh value, NOT any previous time mentions from the conversation history.\n[END TIME UPDATE]`
                    }
                ];
                
                const response = await window.messagesAPI.sendMessage(messagesWithTimeUpdate, systemPrompt);
                aiReply = response.choices[0].message.content;
                usage = response.usage;
                usedModel = response.model || modelName;
                
                console.log(`✅ AI response received: "${aiReply.substring(0, 50)}..."`);
            }
            
            // Cost kalculáció
            const cost = await window.costCalculator.calculateAndStoreCost(
                usedModel, 
                usage, 
                hasImage ? 'vision' : 'text'
            );
            console.log(`💵 Estimated Cost: ${cost.toFixed(6)}`);
            
            // ✅ UNIFIED HISTORY: Context ID generálása
            const contextId = window.unifiedHistoryManager.getContextId(profileId);

            // ✅ UNIFIED HISTORY: AI válasz mentése
            window.unifiedHistoryManager.addMessage(contextId, {
                role: 'assistant',
                content: aiReply,
                type: 'text',
                metadata: {
                    app: 'messages',
                    profileName: profile.name,
                    model: usedModel,
                    tokens: usage,
                    hasImage: hasImage
                }
            });

            // Legacy: Thread storage (later migration)
            window.messagesStorage.addMessage(
                profileId,
                { emoji: profile.emoji, name: profile.name },
                'assistant',
                aiReply
            );

            console.log(`✅ AI message saved to storage (unified + legacy)`);
            
            // ❌ NE FRISSÍTSÜK ÚJRA! Az addMessage() már megtette!
            // A sendMessageFunc() már meghívta az addMessage()-t, ami elmentette az üzenetet
            
            // Mark thread as having unread messages
            window.messagesStorage.setUnreadStatus(profileId, true);
            
            // Update the status bar indicator
            if (window.messagesStorage.updateNewMessageIndicator) {
                window.messagesStorage.updateNewMessageIndicator();
            }
            
            // ✅ ÚJ: Ha a user JELENLEG nézi ezt a conversation-t, 1mp után töröljük az unread jelzést!
            if (window.nokiaMessages && 
                window.nokiaMessages.isActive && 
                window.nokiaMessages.viewMode === 'conversation' &&
                window.nokiaMessages.currentThread &&
                window.nokiaMessages.currentThread.profileId === profileId) {
                
                console.log('👀 User is viewing this conversation, auto-clearing unread in 1s...');
                
                setTimeout(() => {
                    // Ellenőrizzük újra, hogy még mindig ezen a thread-en van-e!
                    if (window.nokiaMessages && 
                        window.nokiaMessages.isActive && 
                        window.nokiaMessages.viewMode === 'conversation' &&
                        window.nokiaMessages.currentThread &&
                        window.nokiaMessages.currentThread.profileId === profileId) {
                        
                        window.messagesStorage.setUnreadStatus(profileId, false);
                        if (window.messagesStorage.updateNewMessageIndicator) {
                            window.messagesStorage.updateNewMessageIndicator();
                        }
                        console.log('✅ Unread status auto-cleared (user still viewing)');
                    }
                }, 1000);
            }
            
            // ✅ ÚJ: Ha a Messages app aktív ÉS a threads list-et nézi, frissítsük!
            if (window.nokiaMessages && 
                window.nokiaMessages.isActive && 
                window.nokiaMessages.viewMode === 'threads') {
                window.nokiaMessages.renderThreadsList();
                console.log(`🔄 Threads list refreshed after background message`);
            }
            
            // ✅ ÚJ: Ha a user JELENLEG nézi ezt a conversation-t, rendereljük újra!
            if (window.nokiaMessages && 
                window.nokiaMessages.isActive && 
                window.nokiaMessages.viewMode === 'conversation' &&
                window.nokiaMessages.currentThread &&
                window.nokiaMessages.currentThread.profileId === profileId) {
                console.log(`🔄 Refreshing conversation view...`);
                window.nokiaMessages.currentThread = window.messagesStorage.getThread(profileId);
                window.nokiaMessages.renderConversation();
            }
            
            // ✅ ÚJ: Hangjelzés
            this.playNotificationSound();
            
            // If the user is NOT viewing this conversation, show a notification
            if (!window.nokiaMessages || 
                !window.nokiaMessages.isActive || 
                !window.nokiaMessages.currentThread || 
                window.nokiaMessages.currentThread.profileId !== profileId) {
                console.log(`📨 New message from ${profileId} (in background)`);
            }
            
        } catch (error) {
            console.error(`❌ Background AI response failed for ${profileId}:`, error);
        } finally {
            // Clean up
            this.pendingResponses.delete(profileId);
        }
    }

    /**
     * Cancel pending response for a profile
     */
    cancelPendingResponse(profileId) {
        const pending = this.pendingResponses.get(profileId);
        if (pending) {
            clearTimeout(pending.timer);
            this.pendingResponses.delete(profileId);
            console.log(`🚫 Cancelled pending response for ${profileId}`);
        }
    }

    /**
     * Cancel all pending transitions for a profile
     */
    cancelPendingTransitions(profileId) {
        for (const [key, timer] of this.pendingTransitions.entries()) {
            if (key.startsWith(profileId)) {
                clearTimeout(timer);
                this.pendingTransitions.delete(key);
            }
        }
    }

    /**
     * Cancel all pending operations
     */
    cancelAll() {
        // Cancel all responses
        for (const [profileId] of this.pendingResponses) {
            this.cancelPendingResponse(profileId);
        }
        
        // Cancel all transitions
        for (const [key, timer] of this.pendingTransitions) {
            clearTimeout(timer);
            this.pendingTransitions.delete(key);
        }
    }

    /**
     * Generate a random delay between min and max milliseconds
     */
    randomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * ✅ ÚJ: Hangjelzés új üzenetnél
     */
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            // Két rövid "ding" hang
            const frequencies = [800, 1000]; // Magasabb frekvenciák a "ding" hangért
            const times = [0, 0.15]; // Második hang 150ms késéssel

            frequencies.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = freq;
                oscillator.type = 'sine'; // Puha, kellemes hang

                const startTime = audioContext.currentTime + times[index];
                gainNode.gain.setValueAtTime(0.1, startTime); // Szolíd hangerő
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

                oscillator.start(startTime);
                oscillator.stop(startTime + 0.1);
            });

            console.log('🔔 Notification sound played');
        } catch (error) {
            console.warn('⚠️ Could not play notification sound:', error);
        }
    }
}

// Initialize global instance
window.messagesBackgroundHandler = new MessagesBackgroundHandler();
