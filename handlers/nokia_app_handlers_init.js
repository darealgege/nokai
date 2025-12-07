/**
 * Nokia App Handlers - Initialization Module
 * DOMContentLoaded, button events, and app initialization
 */

// Weather cache (1 minute) with auto-refresh
let weatherCache = {
    data: null,
    timestamp: 0,
    ttl: 1 * 60 * 1000
};

// ✅ AUTO-REFRESH: Frissítjük percenként a weather-t
setInterval(async () => {
    if (weatherCache.timestamp > 0) { // Csak ha már volt lekérés
        console.log('🌤️ Auto-refreshing weather data...');
        try {
            const weather = await getWeatherData();
            if (weather) {
                console.log('✅ Weather auto-refresh successful');
            }
        } catch (error) {
            console.warn('⚠️ Weather auto-refresh failed:', error);
        }
    }
}, 1 * 60000); // 60 seconds

// Initialize search handler and decision agent
/* let searchHandler = null;
let decisionAgent = null; */
let searchProgressMessage = null;
let clearPressTimer = null;
let longPressTriggered = false;
// === JAVÍTÁS KEZDETE: Új változók a hívásidőzítőhöz ===
let callTimerInterval = null;
let callDurationSeconds = 0;
// === JAVÍTÁS VÉGE ===

// === JAVÍTÁS KEZDETE: Új segédfüggvények az időzítő kezeléséhez ===
function startCallTimer() {
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
    }
    
    callDurationSeconds = 0;
    
    // A lekérdezés ide került, hogy biztosan létezzen az elem
    const timerElement = document.getElementById('inCallTimer'); 
    if (timerElement) {
        timerElement.textContent = '00:00';
    }

    callTimerInterval = setInterval(() => {
        callDurationSeconds++;
        const minutes = Math.floor(callDurationSeconds / 60);
        const seconds = callDurationSeconds % 60;
        const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Időzítő frissítése
        const currentTimerElement = document.getElementById('inCallTimer');
        if (currentTimerElement) {
            currentTimerElement.textContent = formattedTime;
        }

        // ✅ ÚJ RÉSZ: A költség frissítése minden másodpercben
        const costElement = document.getElementById('inCallCost');
        if (costElement && window.costCalculator) {
            costElement.textContent = `$${window.costCalculator.currentCallCost.toFixed(4)}`;
        }
    }, 1000);
}

function stopCallTimer() {
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
    }
}
// === JAVÍTÁS VÉGE ===

async function handleApiKeySetup() {
    const hasKey = await window.apiKeyManager.hasStoredKey();

    if (hasKey) {
        try {
            const pin = await window.pinScreen.show('Enter PIN to Unlock');            
            // Ha a felhasználó a 'C' gombbal lépett ki (ami a hide() metódust hívja),
            // a promise reject-el, és a catch ág fut le.
            // Ha a felhasználó OK-t nyom, de nem írt be semmit, a 'pin' üres string lesz.
            if (!pin) {
                await showAlert('PIN entry is required to unlock the device.', 'Action Cancelled');
                // Újrapróbálkozás a teljes folyamattal.
                return handleApiKeySetup();
            }
            
            const apiKey = await window.apiKeyManager.loadAndDecryptKey(pin);
            
            if (apiKey) {
                console.log('✅ API Key unlocked successfully.');
                return true; // Sikeres indítás, mehet tovább az app.
            } else {
                await showAlert('Incorrect PIN.<br>Please try again.', 'Unlock Failed');
                // Helytelen PIN után újrapróbálkozás.
                return handleApiKeySetup();
            }
        } catch (error) {
            // Ez az ág akkor fut le, ha a pinScreen.show() reject-el (pl. piros gomb).
            await showAlert('PIN entry cancelled.<br>The device cannot start without the PIN code.', 'Startup Cancelled');
            
            // JAVÍTÁS: Az alert bezárása után ne adjuk fel, hanem indítsuk újra a folyamatot!
            return handleApiKeySetup();
        }
    } else {
        // Nincs mentett kulcs, mutatjuk a setup képernyőt.
        window.setupScreen.show();
        return false; // Itt a false jelzi, hogy a setup képernyőre várunk, ami helyes.
    }
}


function initializeSearchComponents() {
    if (window.NokiaSearchHandler) {
        // JAVÍTÁS: A 'window' objektumra tesszük
        window.searchHandler = new window.NokiaSearchHandler();
        window.searchHandler.onSearchProgress = (message, type) => {
            console.log(`🔍 ${message}`);
            
            if (voiceHandler && voiceHandler.isActive()) {
                if (searchProgressMessage && searchProgressMessage.parentNode) {
                    searchProgressMessage.textContent = message;
                } else {
                    searchProgressMessage = voiceHandler._addEventToTranscript(message, 'transcript-ai');
                }
                if (type === 'complete') {
                    searchProgressMessage = null;
                }
            } else {
                if (searchProgressMessage && searchProgressMessage.parentNode) {
                    searchProgressMessage.textContent = message;
                } else {
                    // A 'addMessage' a nokia_app_handlers_utils.js-ben van, ami globális
                    searchProgressMessage = addMessage(message);
                }
            }
        };
        window.searchHandler.onError = (error) => {
            console.error(`❌ Search error: ${error}`);
        };
    }
    
    if (window.NokiaDecisionAgent) {
        // JAVÍTÁS: A 'window' objektumra tesszük
        window.decisionAgent = new window.NokiaDecisionAgent();
    }
}

// Get weather data with geolocation
async function getWeatherData() {
    if (weatherCache.data && (Date.now() - weatherCache.timestamp) < weatherCache.ttl) {
        return weatherCache.data;
    }
    
    try {
        const position = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                maximumAge: 300000
            });
        });
        
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        
        const response = await fetch('weather.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude })
        });
        
        if (!response.ok) {
            throw new Error('Weather API error');
        }
        
        const weatherData = await response.json();
        console.log('🌤️ Weather data received:', weatherData);
        if (weatherData.success) {
            // ✅ Formázzuk a location objektumot stringgé
            let contextString = '';
            
            if (weatherData.location) {
                const loc = weatherData.location;
                contextString = `User location: ${loc.full_address || loc.name}`;
                if (loc.country) {
                    contextString += `, ${loc.country}`;
                }
                contextString += '. ';
            }
            
            // Hozzáadjuk a weather context-et
            if (weatherData.context) {
                contextString += weatherData.context;
            }
            
            weatherCache.data = contextString;
            weatherCache.timestamp = Date.now();
            console.log('✅ Weather + Location context prepared:', contextString);
            return contextString;
        }
        
        return null;
        
    } catch (error) {
        console.warn('Could not get weather data:', error);
        return null;
    }
}

// Voice call handling functions
window.handleCallStart = async function() {
    // ✅ ÚJ VÉDELMI SOR: Ellenőrzi, hogy a gomb le van-e tiltva.
    const callStartBtn = document.getElementById('callStartBtn');
    if (callStartBtn && callStartBtn.disabled) {
        console.log('⚠️ Call button is disabled, ignoring press.');
        return; // Azonnal kilépünk, ha a gomb inaktív.
    }    
    // ✅ DOOM PRIORITÁS ELLENŐRZÉS
    if (window.doomEasterEgg && window.doomEasterEgg.isActive()) {
        console.log('🎮 Green button pressed in DOOM mode. Simulating "Y".');
        
        // Y gomb küldése a DOOM-nak
        window.doomEasterEgg.pressAndReleaseKey(window.doomEasterEgg.keyMap.y);
        
        // ✅ JAVÍTÁS: CSAK akkor indítjuk a deactivate-et, ha ESC után vagyunk!
        if (window.doomEasterEgg.isExitConfirmationPending) {
            console.log('✅ Exit confirmation was pending, starting shutdown sequence...');
            
            setTimeout(() => {
                if (window.doomEasterEgg.isActive()) {
                    console.log('✅ Detecting possible DOS prompt exit, triggering cleanup...');
                    window.doomEasterEgg.manuallyExitedGame = true;
                    window.doomEasterEgg.deactivate();
                }
            }, 500);
        } else {
            console.log('🎮 Y was pressed in-game (not for exiting). No shutdown sequence.');
        }
        
        // Flag törlése minden esetben
        window.doomEasterEgg.isExitConfirmationPending = false;
        return;
    }

    // ✅ JAVÍTOTT VÉDELMI BLOKK
    if (window.isCustomAlertOpen || (window.pinScreen && window.pinScreen.isActive) || (window.setupScreen && window.setupScreen.isActive)) {
        //playDTMF('5'); // Csak hangot ad, de nem csinál semmit
        return;
    }  
    if (isAboutDialogOpen()) {
        closeAboutDialog();
        return;
    }
    
    if (voiceHandler && voiceHandler.isActive()) {
        console.log('⚠️ Call already active, ignoring new call request');
        return;
    }
    
    console.log('📞 Call start button pressed');
    
    if (window.nokiaMessages && (window.nokiaMessages.isActive || window.nokiaMessages.settingsOpen)) {
            
        if (window.nokiaMessages.settingsOpen) {
            window.nokiaMessages.closeSettings();
            window.nokiaMessages.hide();
            window.nokiaPhoneApp.show();
            // Váltsunk a Contacts tabra
            window.nokiaPhoneApp.currentView = 'contacts';
            window.nokiaPhoneApp.updateUI(); 
            return;
        }
        
        window.nokiaMessages.hide();
        window.nokiaPhoneApp.closeCallDetails();
        window.nokiaPhoneApp.show();
        // Váltsunk a Contacts tabra
        window.nokiaPhoneApp.currentView = 'contacts';
        window.nokiaPhoneApp.updateUI();        
        //window.appManager.showHomeScreen();        
        return;
    }

    // ✅ ÚJ LOGIKA: Phone App prioritás
    // Ha a Phone App aktív ÉS Contacts tabon van, hívjuk a kiválasztott contactot
/*     if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive && window.nokiaPhoneApp.currentView === 'contacts') {
        console.log('📱 Phone App Contacts tab active, calling selected contact...');
        if (window.nokiaPhoneApp.contacts.length > 0) {
            const contact = window.nokiaPhoneApp.contacts[window.nokiaPhoneApp.contactsIndex];
            await window.nokiaPhoneApp.startCallWithContact(contact);
        }
        return;
    } */

    // ✅ Új LOGIKA: Phone App prioritás
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        console.log('📱 Phone App is active, checking current state...');
        
        // 1. PRIORITÁS: Ha Call Details nyitva van, hívjuk azt a contact-ot
        if (window.nokiaPhoneApp.isCallDetailsOpen()) {
            console.log('📞 Call Details open, calling from details...');
            await window.nokiaPhoneApp.startCallFromDetails();
            return;
        }
        
        // 2. Ha Call History tab-on vagyunk, hívjuk a kiválasztott history elemet
        if (window.nokiaPhoneApp.currentView === 'history') {
            console.log('📱 Phone App History tab active, calling from history...');
            if (window.nokiaPhoneApp.callHistory.length > 0) {
                await window.nokiaPhoneApp.continueCallFromHistory();
            }
            return;
        }
        
        // 3. Ha Contacts tab-on vagyunk, hívjuk a kiválasztott contact-ot
        if (window.nokiaPhoneApp.currentView === 'contacts') {
            console.log('📱 Phone App Contacts tab active, calling selected contact...');
            if (window.nokiaPhoneApp.contacts.length > 0) {
                const contact = window.nokiaPhoneApp.contacts[window.nokiaPhoneApp.contactsIndex];
                await window.nokiaPhoneApp.startCallWithContact(contact);
            }
            return;
        }
    }        
       

    // Ha a Phone App nincs aktív, vagy nem Contacts tabon van, nyissuk meg a Phone App-ot Contacts tabon
    if (window.nokiaPhoneApp) {
        console.log('📱 Opening Phone App on Contacts tab...');
        window.nokiaPhoneApp.closeCallDetails();
        window.nokiaPhoneApp.show();
        // Váltsunk a Contacts tabra
        window.nokiaPhoneApp.currentView = 'contacts';
        window.nokiaPhoneApp.updateUI();
        return;
    }

/*     if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {    
        console.log('📱 Opening Phone App on Contacts tab...');
        window.nokiaPhoneApp.hide();
        window.appManager.showHomeScreen();         
        window.nokiaPhoneApp.show();
        // Váltsunk a Contacts tabra
        window.nokiaPhoneApp.currentView = 'contacts';
        window.nokiaPhoneApp.updateUI();
        return;
    }   */  
    
    // Fallback: ha nincs Phone App (nem kellene megesés), indítsunk egy hívást profile nélkül
    console.log('⚠️ Phone App not available, starting call without profile');
    await startVoiceCallWithProfile(null);
}

//async function startVoiceCallWithProfile(profile) {
    // ✅ JAVÍTÁS: Részletesebb, csoportosított logolás
window.startVoiceCallWithProfile = async function(profile) {    
    console.groupCollapsed(`📞 STARTING VOICE CALL`);
    console.log(`👤 Profile: ${profile ? profile.name : 'No profile'}`);
    const voiceName = window.profileManager ? window.profileManager.getVoiceForProfile(profile) : 'echo';
    console.log(`🎤 Voice Name (TTS): ${voiceName}`);
    console.log(`🧠 Voice Model (Realtime): ${VOICE_MODELS[window.selectedVoiceModel]}`);
    console.groupEnd();
            
    // ✅ Switch to ChatGPT app when starting call
/*     if (window.appManager) {
        window.appManager.currentApp = 'chatgpt';
        window.appManager.launchChatGPTApp();
        console.log('📱 Switched to ChatGPT app for voice call');
    } */
    
    const profileName = profile ? profile.name : 'AI';
    
    if (!window.voiceHandler){
        console.log('🎵 Creating new VoiceHandler instance');
        window.voiceHandler = new window.NokiaVoiceHandler();
    }
    
    // === JAVÍTÁS KEZDETE: Az onCallStateChange kiegészítése az időzítővel ===
    window.voiceHandler.onCallStateChange = (state) => {
        console.log('Call state:', state);
        
        // A DOM elemek lekérdezése a függvényen BELÜL történik,
        // így mindig a friss állapotot kapjuk meg.
        const callStatus = document.getElementById('callStatus');
        const callStartBtn = document.getElementById('callStartBtn');
        const inCallStatusText = document.getElementById('inCallStatusText');

        switch (state) {
            case 'dialing':
                if (inCallStatusText) inCallStatusText.textContent = 'Dialing...';
                if (callStatus) callStatus.classList.remove('hidden');
                if (callStartBtn) callStartBtn.disabled = true;
                break;
            case 'connected':
                if (inCallStatusText) inCallStatusText.textContent = 'Connected';
                startCallTimer(); // Időzítő indítása
                break;
            case 'ended':
                if (callStatus) callStatus.classList.add('hidden');
                if (callStartBtn) callStartBtn.disabled = false;
                stopCallTimer(); // Időzítő leállítása
                break;
        }
    };    
    // === JAVÍTÁS VÉGE ===
        
    voiceHandler.onTranscriptReceived = async (role, text) => {
    // ✅ UNIFIED HISTORY: Lekérjük a context ID-t
    const contextId = window.currentChatContextId || 'main';
    
    if (role === 'user') {
        if (window.searchHandler) {
            window.searchHandler.clearResults();
        }            
        // ✅ NEW: Add to current call transcript
        if (window.voiceHandler) {
            window.voiceHandler.currentCallTranscript.push({ role: 'user', text: text });
        }
        
        voiceHandler._addEventToTranscript('You: ' + text, 'transcript-user');
        
        // ✅ UNIFIED HISTORY: User üzenet mentése
        window.unifiedHistoryManager.addMessage(contextId, {
            role: 'user',
            content: text,
            type: 'voice',
            metadata: {
                app: 'phone',
                profileName: profile ? profile.name : 'AI',
                isVoice: true
            }
        });

        saveToStorage();
            
            if (decisionAgent && searchHandler && voiceHandler.isActive()) {
                const needsSearch = await decisionAgent.shouldSearchVoice(text);
                
                if (needsSearch) {
                    console.log('🎤 Voice search triggered');
                    
                    if (!voiceHandler.dataChannel || voiceHandler.dataChannel.readyState !== 'open') {
                        console.warn('Data channel not open, skipping search');
                        return;
                    }
                    
                    try {
                        voiceHandler.dataChannel.send(JSON.stringify({
                            type: 'conversation.item.create',
                            item: {
                                type: 'message',
                                role: 'user',
                                content: [{
                                    type: 'input_text',
                                    text: text
                                }]
                            }
                        }));
                        
                        voiceHandler.dataChannel.send(JSON.stringify({
                            type: 'response.create',
                            response: {
                                modalities: ['audio', 'text'],
                                instructions: 'Briefly respond in the user\'s language with a natural phrase like “Egy pillanat, utánanézek, tartsd a vonalat…” or “One moment, please hold the line, I’ll check that for you…”, mentioning what you’re searching for (e.g. “Egy pillanat, tartsd a vonalat amíg utánanézek az időjárásnak.”). Keep it short, friendly, and topic-aware — do not give results yet; wait for the search results to arrive first.'
                            }
                        }));
                    } catch (error) {
                        console.error('Error during voice search setup:', error);
                        return;
                    }
                    
                    searchHandler.executeSearch(text, true).then(searchData => {
                        if (!voiceHandler || !voiceHandler.dataChannel || voiceHandler.dataChannel.readyState !== 'open') {
                            console.warn('⚠️ Channel closed after search, cannot send results');
                            return;
                        }
                        
                        const searchContext = searchHandler.formatForContext(searchData);
                        // ✅ JAVÍTÁS: Részletes, csoportosított log a keresési kontextusról
                        console.groupCollapsed('📤 Sending Search Context to Voice AI');
                        console.log('Original Query:', `"${text}"`);
                        console.log('🦁 Brave Results:', searchData.braveResults);
                        console.log('🧠 Perplexity Results:', searchData.perplexityResults);
                        console.log('--- Formatted Context Sent ---');
                        console.log(searchContext);
                        console.groupEnd();                      
                        voiceHandler.dataChannel.send(JSON.stringify({
                            type: 'conversation.item.create',
                            item: {
                                type: 'message',
                                role: 'user',
                                content: [{
                                    type: 'input_text',
                                    text: `[SEARCH RESULTS]\n\n${searchContext}\n\n[END] Now answer the original question: "${text}"`
                                }]
                            }
                        }));
                        
                        if (voiceHandler.dataChannel.readyState !== 'open') return;
                        
                        voiceHandler.dataChannel.send(JSON.stringify({
                            type: 'response.create',
                            response: {
                                modalities: ['audio', 'text']
                            }
                        }));
                        
                        if (searchProgressMessage && searchProgressMessage.parentNode) {
                            searchProgressMessage.remove();
                            searchProgressMessage = null;
                        }
                        addMessage('✅ Search complete');
                    }).catch(error => {
                        console.error('Search error:', error);
                    });
                    
                    return;
                } else {
                     // ✅ JAVÍTÁS: Log, ha nincs szükség keresésre
                    console.log('🤖 Voice Decision: NO SEARCH needed.');
                    if (window.voiceHandler.dataChannel && window.voiceHandler.dataChannel.readyState === 'open') {
                        window.voiceHandler.dataChannel.send(JSON.stringify({
                            type: 'response.create',
                            response: {
                                modalities: ['audio', 'text']
                            }
                        }));
                    }
                }
            }
            
        } else if (role === 'ai') {
            // ✅ NEW: Add to current call transcript
            if (window.voiceHandler) {
                window.voiceHandler.currentCallTranscript.push({ role: 'ai', text: text });
            }
            
            const profileName = profile ? profile.name : 'AI';
            window.voiceHandler._addEventToTranscript(`${profileName}: ` + text, 'transcript-ai');
            
            // ✅ UNIFIED HISTORY: AI válasz mentése
            window.unifiedHistoryManager.addMessage(contextId, {
                role: 'assistant',
                content: text,
                type: 'voice',
                metadata: {
                    app: 'phone',
                    profileName: profileName,
                    isVoice: true
                }
            });
            
            saveToStorage();
        }
    };
    
    voiceHandler.onError = (error) => {
        addMessage('❌ Error: ' + error);
         if (voiceHandler && typeof voiceHandler._addEventToTranscript === 'function') {
            voiceHandler._addEventToTranscript('❌ Error: ' + error, 'transcript-user');
        }
    };
    
/*     const result = await voiceHandler.startCall(profile ? profile.prompt : null, voiceName);
    if (!result.success) {
        addMessage('❌ Failed to start call: ' + (result.error || 'Unknown error'));
    }
} */

const result = await voiceHandler.startCall(
        profile ? profile.prompt : null, // 1. paraméter: profilePrompt
        voiceName,                       // 2. paraméter: voiceName
        profile                          // 3. paraméter: a teljes profil objektum a UI-nak
    );

    if (!result.success) {
        const errorMsg = '❌ Failed to start call: ' + (result.error || 'Unknown error');
        if (window.voiceHandler && window.voiceHandler.isActive()) {
            window.voiceHandler._addEventToTranscript(errorMsg, 'transcript-user');
        } else {
            addMessage(errorMsg);
        }
    }
}     

const sanitizeInput = (input) => {
    return DOMPurify.sanitize(input);
};

async function sendMessage() {
    if (!currentInput.trim() || menuOpen) return;
    
    // ✅ UNIFIED HISTORY: MINDIG az aktuális profil context-ét használjuk
    const selectedProfile = window.profileManager ? window.profileManager.getSelectedProfile() : null;
    const contextId = selectedProfile ? 
        window.unifiedHistoryManager.getContextId(selectedProfile.filename) : 
        'main';
    
    // Frissítjük a globális context-et
    window.currentChatContextId = contextId;
    window.unifiedHistoryManager.switchContext(contextId);
    
    const currentHistory = window.unifiedHistoryManager.getHistory(contextId);
    // ✅ Ellenőrizzük, van-e csatolt kép
    const hasAttachment = window.chatGPTImageHandler && window.chatGPTImageHandler.hasPendingAttachment();
    
    if (t9Sequence.length > 0) {
        t9Sequence = '';
        t9Suggestions = [];
        t9SelectedIndex = 0;
    }
    
    //const selectedProfile = window.profileManager ? window.profileManager.getSelectedProfile() : null;
    const profileName = selectedProfile ? selectedProfile.name : 'AI';
    const profilePrompt = selectedProfile ? selectedProfile.prompt : '';
    
    // ✅ ÚJ: Friss idő készítése
    const now = new Date();
    const dateTimeString = now.toLocaleString('hu-HU', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
    });
    
    // ✅ SANITIZE + EMOJI CONVERSION
    // 1. Először szanitizáljuk a bemenetet a biztonság érdekében.
    const sanitizedUserMessage = sanitizeInput(currentInput);
    
    // 2. A már biztonságos szövegen végezzük el az emoji konverziót.
    let convertedUserMessage = sanitizedUserMessage;
    if (typeof window.convertToEmoji === 'function') {
        convertedUserMessage = window.convertToEmoji(sanitizedUserMessage);
    }

/*     const userMessage = currentInput;
    
    // ✅ EMOJI CONVERSION: Konvertáljuk a text shortcutokat emoji-kra
    let convertedUserMessage = userMessage;
    if (typeof window.convertToEmoji === 'function') {
        convertedUserMessage = window.convertToEmoji(userMessage);
    } */
    
    // ✅ JAVÍTÁS: userImageId deklarálása előre
    let userImageId = null;
    const userMessage = currentInput;
    // ✅ JAVÍTÁS: Teljes üzenet objektum mentése metadata-val
    const userMessageObject = {
        role: 'user',
        content: convertedUserMessage,
        metadata: {
            profileName: profileName,
            timestamp: Date.now()
        }
    };
    
    // Ha van kép, mentünk
    if (hasAttachment && window.chatGPTImageHandler.pendingImageAttachment) {
        userImageId = await window.imageAttachments.saveChatImage(window.chatGPTImageHandler.pendingImageAttachment);
        console.log('✅ ChatGPT image saved with ID:', userImageId);
    }
    
    // ✅ UNIFIED HISTORY: addMessage - új API
    window.unifiedHistoryManager.addMessage(contextId, {
        role: 'user',
        content: convertedUserMessage,
        type: 'text',
        metadata: {
            app: 'chatgpt',
            profileName: profileName,
            attachmentId: userImageId
        }
    });
    // ✅ ÚJ: Ha van kép, eléje rakjuk az emoji-t a MEGJELENÍTÉSHEZ
    let displayText = convertedUserMessage;
    if (hasAttachment) {
        displayText = '🖼️: ' + displayText;
    }
    
    // ✅ User üzenet megjelenítése KÉPPEL (és emoji-val ha van kép)
    await addMessage('> ' + displayText, 'user-msg', userImageId); // ✅ Await for async image loading
    
    currentInput = '';
    cursorPosition = 0;
    updateDisplay();
    saveToStorage();
    
    const loadingMessage = await addMessage('Thinking...');
    
    try {
        const apiKey = window.apiKeyManager.getSessionApiKey();
        if (!apiKey) {
            throw new Error("API Key is not available. Please set it up in the settings.");
        }
        const weatherData = await getWeatherData();
        
        // ✅ KÉPPEL: Vision API hívás
        if (hasAttachment) {
            console.groupCollapsed('📷 Sending message with image (ChatGPT App)');
            console.log(`👤 Profile: ${profileName}`);
            console.log(`📝 Message: ${userMessage}`);
            
            // System prompt készítése
            const now = new Date();
            const dateTimeString = now.toLocaleString('hu-HU', { hour12: false });
            
            let systemPrompt = profilePrompt || '';
            systemPrompt += `\n\n[BACKGROUND INFO - Use ONLY if asked]\nCurrent date and time: ${dateTimeString}.`;
            if (weatherData) {
                systemPrompt += `\n${weatherData}`;
            }
            systemPrompt += `\n[END BACKGROUND INFO]`;
            systemPrompt += `\n\nCRITICAL RULES:\n1. LANGUAGE: ALWAYS respond in the exact same language as the user's message.\n2. TIME/DATE: The current time is always fresh in the background info above. Only mention it if user explicitly asks.\n3. BACKGROUND INFO: Only mention weather/location/time if user explicitly asks. Do NOT volunteer this information.`;            
            loadingMessage.textContent = 'AI analyzing image...';
            
            // ✅ UNIFIED HISTORY: Csak text típusú üzenetek az API-nak
            const textOnlyHistory = currentHistory
                .filter(msg => msg.type === 'text')
                .map(msg => ({ role: msg.role, content: msg.content }));
            
            // ✅ ÚJ: Explicit időfrissítő üzenet hozzáadása a history végére
            textOnlyHistory.push({
                role: 'system',
                content: `[CRITICAL TIME UPDATE]\nCurrent date and time RIGHT NOW: ${dateTimeString}\nIMPORTANT: If user asks about current time, use THIS fresh value, NOT any previous time mentions.\n[END TIME UPDATE]`
            });
            
            // Vision API hívás a konvertált üzenettel
            const visionResult = await window.chatGPTImageHandler.sendMessageWithImage(
                convertedUserMessage,
                textOnlyHistory
            );
                        
            console.log(`✅ Model Used: ${visionResult.model}`);
            if (visionResult.usage) console.log(`📊 Tokens:`, visionResult.usage);
            console.groupEnd();
            
            // Kost kalkuláció
            const cost = await window.costCalculator.calculateAndStoreCost(
                visionResult.model, 
                visionResult.usage, 
                'vision'
            );
            console.log(`💵 Estimated Cost: ${cost.toFixed(6)}`);
            
            loadingMessage.remove();
            
            // ✅ JAVÍTÁS: AI válasz teljes objektummal
            window.unifiedHistoryManager.addMessage(contextId, {
            role: 'system',
            content: visionResult.aiReply,
            type: 'text',
            metadata: {
                app: 'chatgpt',
                profileName: profileName,
                model: visionResult.model,
                tokens: visionResult.usage
            }
        });
        await addMessage(`${profileName}: ` + visionResult.aiReply, 'ai-msg');
        saveToStorage();
        // ✅ ÚJ: Töröljük a pending image-et ÉS frissítjük a kijelzőt!
        if (window.chatGPTImageHandler) {
            window.chatGPTImageHandler.clearPendingAttachment();
        }
        return; // Kosóbbi kódot nem futtatjuk
        }
        
        // ✅ KÉP NÉLKÜL: Normál text API
        const modelName = MODELS[selectedModel];

        let searchData = null;
        if (decisionAgent && searchHandler) {
            const needsSearch = await decisionAgent.shouldSearch(userMessage);
            
            if (needsSearch) {
                console.log('🔍 Decision: SEARCH needed');
                loadingMessage.textContent = 'Searching web...';
                searchData = await searchHandler.executeSearch(userMessage, true);
            }
        }
        
        let systemContext = profilePrompt ? `${profilePrompt}\n\n` : '';
        systemContext += `[BACKGROUND INFO - Use ONLY if asked]\nCurrent date and time: ${dateTimeString}.`;

        if (weatherData) {
            systemContext += `\n${weatherData}`;
        }
        
        systemContext += `\n[END BACKGROUND INFO]`;
        
        systemContext += `\n\nIMPORTANT: Background info in brackets is for reference only. Do NOT mention it unless the user specifically asks about weather, location, or time.`;
        
        if (searchData && (searchData.braveResults.length > 0 || searchData.perplexityResults.length > 0)) {
            systemContext += '\n\n' + searchHandler.formatForContext(searchData);
            systemContext += '\n\nIMPORTANT: Use the search results above to answer the user\'s question with current, accurate information. Cite sources when relevant.';
        }
        
        // ✅ UNIFIED HISTORY: Csak text típusú üzenetek az API-nak
        const textOnlyHistory = currentHistory
            .filter(msg => msg.type === 'text')
            .map(msg => ({ role: msg.role, content: msg.content }));
        //console.log('✅ System context prepared:', systemContext);
        
        // ✅ ÚJ: Explicit időfrissítő üzenet hozzáadása
        const messagesWithContext = [
            {
                role: 'system',
                content: systemContext
            },
            ...textOnlyHistory,
            {
                role: 'system',
                content: `[CRITICAL TIME UPDATE]\nCurrent date and time RIGHT NOW: ${dateTimeString}\nIMPORTANT: If user asks about current time, use THIS fresh value, NOT any previous time mentions from the conversation history.\n[END TIME UPDATE]`
            }
        ];
        
        // ✅ JAVÍTÁS: Részletes, csoportosított logolás a nyers eredményekkel
        console.groupCollapsed(`📤 API Request (ChatGPT App)`);
        console.log(`🎯 Model: ${modelName}`);
        console.log(`👤 Profile: ${profileName}`);
        console.log(`📊 Messages Sent: ${messagesWithContext.length}`);
        console.log(`🔍 Search Data Included: ${searchData ? 'YES' : 'NO'}`);
        if (searchData) {
            console.log('🦁 Brave Results:', searchData.braveResults);
            console.log('🧠 Perplexity Results:', searchData.perplexityResults);
        }
        console.log('--- System Prompt ---');
        console.log(systemContext);
        console.groupEnd();
        loadingMessage.textContent = 'AI responding...';
        
        const response = await fetch('openaiProxy.php', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                // ✅ ÚJ: Fejléc hozzáadása
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: messagesWithContext,
                temperature: 0.7
            })
        });
        
        loadingMessage.remove();
        
        if (!response.ok) throw new Error('API error: ' + response.status);
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || 'Unknown API error');
        
        const aiResponse = data.choices[0].message.content;
          // ✅ JAVÍTÁS: A `modelName`-et adjuk át a költségkalkulátornak.
        const cost = await window.costCalculator.calculateAndStoreCost(modelName, data.usage, 'text');

        console.groupCollapsed('📥 API Response (ChatGPT App)');
        console.log(`✅ Model Used: ${data.model || modelName}`);        console.log(`📏 Length: ${aiResponse.length} chars`);
        if (data.usage) {
            console.log(`💰 Tokens:`, data.usage);
        }
        console.log(`💵 Estimated Cost: $${cost.toFixed(6)}`);
        console.log('--- AI Response ---');
        console.log(aiResponse);
        console.groupEnd();
        
        // ✅ UNIFIED HISTORY: AI válasz mentése
        window.unifiedHistoryManager.addMessage(contextId, {
            role: 'assistant',
            content: aiResponse,
            type: 'text',
            metadata: {
                app: 'chatgpt',
                profileName: profileName,
                model: data.model || modelName,
                tokens: data.usage
            }
        });

        await addMessage(`${profileName}: ` + aiResponse, 'ai-msg');
        saveToStorage();
        
        } catch (error) {
            if (loadingMessage) loadingMessage.remove();
            await addMessage('ERROR: ' + error.message);
            // ✅ UNIFIED HISTORY: Hibánál töröljük az utolsó user üzenetet
            const history = window.unifiedHistoryManager.getHistory(contextId);
            if (history.length > 0 && history[history.length - 1].role === 'user') {
                history.pop();
                window.unifiedHistoryManager.saveHistories();
            }
            saveToStorage();
        }
}

// Safe DOM element getter
function safeGetElement(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`Element not found: ${id}`);
    }
    return el;
}

// DOMContentLoaded - Main Initialization
document.addEventListener('DOMContentLoaded', async () => {
    
    if (document.getElementById('time')) {
        updateClock(); // Azonnali frissítés
        setInterval(updateClock, 1000); // Majd másodpercenkénti frissítés
    }    
    const unlockAudioContext = () => {
        if (window.audioContext && window.audioContext.state === 'suspended') {
            window.audioContext.resume().then(() => {
                console.log('✅ AudioContext resumed by user gesture.');
                // A sikeres feloldás után eltávolítjuk a listenereket, hogy ne fussanak le többször.
                document.body.removeEventListener('touchstart', unlockAudioContext);
                document.body.removeEventListener('mousedown', unlockAudioContext);
            });
        }
    };    
    document.body.addEventListener('touchstart', unlockAudioContext, { once: true });
    document.body.addEventListener('mousedown', unlockAudioContext, { once: true });
    initializeButtonListeners();
    initializeSearchComponents();
    // 1. Alapvető inicializálások, amik mindig kellenek
    if (window.nokiaBattery) {
        window.nokiaBattery.init();
    }
    if (window.appManager) {
        window.appManager.init(); // Ez most már csak létrehozza a home screent, de nem mutatja meg
    }
    await loadDictionary('en');
    await loadDictionary('hu');
    if (window.NokiaProfileManager) {
        window.profileManager = new window.NokiaProfileManager();
        await window.profileManager.loadProfiles();
        console.log('✅ Profile manager initialized');
        
        // ✅ UNIFIED HISTORY: Profile change callback
        window.profileManager.onProfileChange = (profile) => {
            console.log('👤 Profile changed to:', profile.name);
            
            const contextId = window.unifiedHistoryManager.getContextId(profile.filename);
            window.unifiedHistoryManager.switchContext(contextId);
            window.currentChatContextId = contextId;
            
            console.log(`🔄 Context switched to: ${contextId}`);
            console.log(`📊 Messages in context: ${window.unifiedHistoryManager.getMessageCount(contextId)}`);
            
            // ✅ UI frissítés ChatGPT-ben - CLEAR és history reload
            if (window.appManager && window.appManager.isInChatGPT()) {
                const screenContent = document.getElementById('screenContent');
                if (screenContent) {
                    // Töröljük az összes üzenetet
                    screenContent.querySelectorAll('.message').forEach(msg => msg.remove());
                    
                    // Újratöltjük az új context üzeneteit
                    restoreMessages();
                    
                    // Scroll to bottom
                    setTimeout(() => {
                        screenContent.scrollTop = screenContent.scrollHeight;
                    }, 50);
                }
            }
        };
    }
    
    // ✅ ÚJ: ChatGPT Image Handler inicializálása
    if (window.ChatGPTImageHandler) {
        window.chatGPTImageHandler = new window.ChatGPTImageHandler();
        console.log('✅ ChatGPT Image Handler initialized');
    }
    
    await window.costCalculator.initPromise;
    // 2. Döntés: Szükséges-e az API kulcs beállítása?
    const canStartApp = await handleApiKeySetup();

    // 3. A megfelelő képernyő megjelenítése
    if (canStartApp) {
        // Ha minden rendben, indulhat az app a főképernyővel
        await loadFromStorage(); // ✅ Now async
        //updateT9Display();
        //updateLangDisplay();
        updateShiftIndicator();
        
        window.appManager.showHomeScreen(); // Most mutatjuk meg a főképernyőt
    }
    // Ha a canStartApp false, a handleApiKeySetup már megmutatta a setup képernyőt

    // 4. A többi, nem vizuális inicializálás
    updateSignalStrength();
    scheduleNextSignalUpdate();
/*     if (document.getElementById('time')) {
        updateClock();
        setInterval(updateClock, 1000);
    } */
    //setTimeout(initializeSearchComponents, 500);
    //initializeSearchComponents();
    
function initializeButtonListeners() {
    console.log('🔘 Finalizing all button listeners (v-final)...');
    let touchEventProcessed = false;
    // --- Segédfüggvény a normál gombokhoz ---
    const addStandardListener = (element, dtmfKey, handlerName) => {
        if (!element || typeof handlerName !== 'string') return;
        if (element._safeHandlers) {
            element.removeEventListener('mousedown', element._safeHandlers.down);
            element.removeEventListener('touchstart', element._safeHandlers.down);
            element.removeEventListener('mouseup', element._safeHandlers.up);
            element.removeEventListener('touchend', element._safeHandlers.up);
            if (element._safeHandlers.unlock) {
                element.removeEventListener('mousedown', element._safeHandlers.unlock, { capture: true });
                element.removeEventListener('touchstart', element._safeHandlers.unlock, { capture: true });
            }
        }
        
        const handlePressDown = async (e) => {
            // Ha ez egy click esemény, és nemrég volt egy touch, akkor ignoráljuk
            if (e.type === 'mousedown' && touchEventProcessed) return;

            e.preventDefault();
            
            // Most már játszhatjuk a hangot (az AudioContext már feloldva a capture phase-ben)
            await playDTMF(dtmfKey);
            element.classList.add('active-key');
        };

        const handlePressUp = (e) => {
            // Ha ez egy click esemény, és nemrég volt egy touch, akkor ignoráljuk
            if (e.type === 'mouseup' && touchEventProcessed) {
                // Fontos: Reseteljük a zászlót a következő interakcióhoz
                touchEventProcessed = false;
                return;
            }

            e.preventDefault();
            element.classList.remove('active-key');
            
            // ✅ JAVÍTÁS: Dinamikusan hívjuk a globális függvényt név alapján!
            if (typeof window[handlerName] === 'function') {
                window[handlerName]();
            }

            // Ha ez egy touch esemény volt, állítsuk be a zászlót
            if (e.type === 'touchend') {
                touchEventProcessed = true;
                // Egy rövid idő után reseteljük a zászlót, hogy a normál kattintások működjenek
                setTimeout(() => {
                    touchEventProcessed = false;
                }, 300); // 300ms elég idő, hogy a böngésző ne küldjön szellem click-et
            }
        };

        
        element.addEventListener('mousedown', handlePressDown);
        element.addEventListener('touchstart', handlePressDown, { passive: false });
        element.addEventListener('mouseup', handlePressUp);
        element.addEventListener('touchend', handlePressUp, { passive: false });
        
        // ✅ KRITIKUS: SZINKRON AudioContext feloldás CAPTURE PHASE-ben!
        const unlockAudio = (e) => {
            if (window.audioContext && window.audioContext.state === 'suspended') {
                window.audioContext.resume();
                console.log('🔊 AudioContext unlocked in capture phase');
            }
        };
        element.addEventListener('mousedown', unlockAudio, { capture: true });
        element.addEventListener('touchstart', unlockAudio, { capture: true, passive: true });

        element._safeHandlers = { down: handlePressDown, up: handlePressUp, unlock: unlockAudio };
    };

    // --- Normál gombok regisztrálása ---
    // ✅ JAVÍTÁS: Használjunk wrapper függvényeket a numerikus gombokhoz
    document.querySelectorAll('.keypad .key[data-key]').forEach(button => {
        const key = button.dataset.key;
        if (!isNaN(parseInt(key))) {
            // Wrapper függvény, hogy dinamikusan hívhassa a handleKey-t a kulccsal
            const wrapperName = `_handleKey${key}`;
            window[wrapperName] = () => window.handleKey(key);
            addStandardListener(button, key, wrapperName);
        }
    });
    
    // ✅ JAVÍTÁS: String névvel adjuk át a függvényeket!
    addStandardListener(document.querySelector('.key-star'), '*', 'handleShift');
    addStandardListener(document.querySelector('.key-hash'), '#', 'handleHash');
    addStandardListener(document.querySelector('.nav-key[data-key="menu"]'), '5', 'handleMenu');
    addStandardListener(document.querySelector('.dpad-up'), '2', 'handleNavUp');
    addStandardListener(document.querySelector('.dpad-down'), '8', 'handleNavDown');
    addStandardListener(document.querySelector('.dpad-left'), '4', 'handleNavLeft');
    addStandardListener(document.querySelector('.dpad-right'), '6', 'handleNavRight');
    addStandardListener(document.querySelector('.dpad-center'), '5', 'handleOK');
    addStandardListener(document.getElementById('callStartBtn'), '5', 'handleCallStart');

    // --- Speciális, Long-Press gombok regisztrálása KÖZVETLENÜL ITT ---

    // 1. 'C' GOMB (Clear)
    const clearBtn = document.querySelector('.key-clear');
    let clearPressTimer = null;
    let longPressTriggered = false;
    window.currentChatContextId = 'main'; 

    // A régi `window.conversationHistory` helyett ezt fogjuk használni.
    // A `loadFromStorage` fogja feltölteni.
    window.conversationHistories = { main: [] };    

    if (clearBtn) {
        // ✅ SZINKRON AudioContext feloldás CAPTURE PHASE-ben!
        const unlockAudioClear = (e) => {
            if (window.audioContext && window.audioContext.state === 'suspended') {
                window.audioContext.resume();
                console.log('🔊 AudioContext unlocked (Clear button, capture)');
            }
        };
        clearBtn.addEventListener('mousedown', unlockAudioClear, { capture: true });
        clearBtn.addEventListener('touchstart', unlockAudioClear, { capture: true, passive: true });
        
        const startPress = async (e) => {
            e.preventDefault();
            longPressTriggered = false;
            
            clearPressTimer = setTimeout(() => {
                longPressTriggered = true;
                startWordDeletion(); // Hosszú lenyomásra ezt hívjuk
            }, 1500);
        };

        const endPress = async (e) => {
            e.preventDefault();
            clearTimeout(clearPressTimer);
            
            await playDTMF('1');

            if (!longPressTriggered) {
                handleClear(); // Rövid lenyomásra ezt hívjuk
            }
        };

        // Eseménykezelők hozzáadása
        clearBtn.addEventListener('mousedown', startPress);
        clearBtn.addEventListener('touchstart', startPress, { passive: false });
        clearBtn.addEventListener('mouseup', endPress);
        clearBtn.addEventListener('touchend', endPress);
        clearBtn.addEventListener('mouseleave', () => clearTimeout(clearPressTimer));
    }

    // 2. PIROS GOMB (End Call / DOOM)
    // ✅ JAVÍTÁS: Dinamikus függvényhívás
    addStandardListener(document.getElementById('callEndBtn'), '1', 'handleCallEnd');

    console.log('✅ All button listeners finalized.');
}

    const updateBodyScroll = () => {
        const body = document.body;
        const container = document.querySelector('.phone-container');
        if (!container) return;

        if (container.scrollHeight + 20 > window.innerHeight) {
            body.style.overflowY = 'auto';
        } else {
            body.style.overflowY = 'hidden';
        }
    };

    updateBodyScroll();
    window.addEventListener('resize', updateBodyScroll);    



    // ✅ ÚJ: Beillesztés (Ctrl+V) esemény kezelése
    document.addEventListener('paste', (event) => {
        // Csak akkor foglalkozunk vele, ha a setup képernyő aktív és szerkesztünk
        if (window.setupScreen && window.setupScreen.isActive && window.setupScreen.isEditing) {
            event.preventDefault(); // Megakadályozzuk az alapértelmezett beillesztést
            const pasteData = (event.clipboardData || window.clipboardData).getData('text');
            console.log('📋 Paste event detected:', pasteData);
            window.setupScreen.handlePaste(pasteData);
        }
    });    

    window.debugCallUI = function(state, customData) {
            if (!window.voiceHandler) {
                // Ha még nem létezik, hozzunk létre egy példányt a teszteléshez
                if (window.NokiaVoiceHandler) {
                    window.voiceHandler = new window.NokiaVoiceHandler();
                    console.log('🐞 Created temporary VoiceHandler for debug.');
                } else {
                    console.error('❌ NokiaVoiceHandler is not available.');
                    return;
                }
            }
            window.voiceHandler.debugShowInCallUI(state, customData);
        };

        console.log('✅ Debug function "debugCallUI()" is available in the console.');


    // ✅ ÚJ: Globális debug funkció az akkumulátorhoz
    window.debugBattery = function(level, isCharging) {
        if (window.nokiaBattery) {
            // Ha az API felülírná, ideiglenesen kikapcsoljuk a figyelőket
            if (window.nokiaBattery.batteryManager) {
                window.nokiaBattery.batteryManager.removeEventListener('levelchange', window.nokiaBattery.updateUI);
                window.nokiaBattery.batteryManager.removeEventListener('chargingchange', window.nokiaBattery.updateUI);
                console.warn('🔋 Real Battery API listeners temporarily disabled for debug.');
            }
            window.nokiaBattery.debugUpdateUI(level, isCharging);
        } else {
            console.error('❌ NokiaBattery handler is not available.');
        }
    };

    console.log('✅ Debug function "debugBattery(level, isCharging)" is available in the console.');

    // ✅ FELADAT 1: Messages notification icon frissítése page load után
    if (window.messagesStorage) {
        window.messagesStorage.updateNewMessageIndicator();
        console.log('✅ Messages notification indicator updated on page load');
    }

    // ✅ ÚJ: Unified History migráció futtatása (csak egyszer)
    if (!localStorage.getItem('unified_history_migrated')) {
        console.log('🔄 Running first-time history migration...');
        if (window.unifiedHistoryManager) {
            window.unifiedHistoryManager.migrateAllHistories();
            localStorage.setItem('unified_history_migrated', 'true');
            console.log('✅ Migration complete!');
        }
    }

    // ✅ ÚJ: Első weather lekérés indítása
    getWeatherData().then(() => {
        console.log('✅ Initial weather data loaded');
    }).catch(err => {
        console.warn('⚠️ Initial weather fetch failed:', err);
    });

});
