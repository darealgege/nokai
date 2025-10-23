// Nokia Voice Handler - OpenAI Realtime API WebRTC Integration
class NokiaVoiceHandler {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.mediaStream = null;
        this.isCallInProgress = false;
        this.isCallActive = false;
        this.ephemeralKey = null;
        this.audioTrackReady = false; // Reset for next call
        this.audioElement = null;
        this.localAudioContext = null;
        this.remoteAudioContext = null;
        this.audioTrackReady = false; // Track if audio is ready
        
        // ✅ NEW: Call tracking
        this.currentCallProfile = null;
        this.currentCallTranscript = [];
        this.callStartTime = null;
        
        // Telephone quality filter (true = retro sound, false = HD sound)
        this.usePhoneFilter = false; // TODO: Fix MediaStreamDestination compatibility
        
        // Callbacks
        this.onCallStateChange = null;
        this.onTranscriptReceived = null;
        this.onError = null;
        
        // Audio elements for call sounds
        this.callSounds = {
            dialing: null,
            ended: null
        };
        
        // Ephemeral key cache with expiry
        this.keyCache = {
            key: null,
            expiresAt: null
        };
        
        this.initAudioElements();
    }

    // Initialize audio elements for call effects
    initAudioElements() {
        // Create audio element for AI response
        this.audioElement = document.createElement('audio');
        this.audioElement.autoplay = true;
        
        // Dialing sound (simple tone generation)
        this.callSounds.dialing = this.createDialingSound();
        
        // Call ended sound
        this.callSounds.ended = this.createEndCallSound();
        
        // ✅ DTMF sequence will be generated dynamically when needed
    }

    // Generate synthetic dialing tone
    createDialingSound() {
        const audio = new Audio();
        audio.loop = true;
        
        // Create a proper ringing tone (long beep + long silence)
        // UK/EU style: 400ms beep + 200ms silence + 400ms beep + 2000ms silence
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const beep1Duration = 0.4;    // First beep: 400ms
        const silence1Duration = 0.2; // Short gap: 200ms
        const beep2Duration = 0.4;    // Second beep: 400ms
        const silence2Duration = 2.0; // Long pause: 2000ms
        const frequency = 425; // Standard European ringtone frequency
        
        const sampleRate = audioContext.sampleRate;
        const totalDuration = beep1Duration + silence1Duration + beep2Duration + silence2Duration;
        const frameCount = sampleRate * totalDuration;
        
        const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);
        
        let offset = 0;
        
        // First beep
        const beep1Frames = sampleRate * beep1Duration;
        for (let i = 0; i < beep1Frames; i++) {
            data[offset + i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
        }
        offset += beep1Frames;
        
        // Short silence
        offset += sampleRate * silence1Duration;
        
        // Second beep
        const beep2Frames = sampleRate * beep2Duration;
        for (let i = 0; i < beep2Frames; i++) {
            data[offset + i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
        }
        offset += beep2Frames;
        
        // Long silence (rest is already zero)
        
        // Convert to WAV and create blob URL
        const wav = this.audioBufferToWav(buffer);
        const blob = new Blob([wav], { type: 'audio/wav' });
        audio.src = URL.createObjectURL(blob);
        
        return audio;
    }

    // Generate call end tone
    createEndCallSound() {
        const audio = new Audio();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const duration = 0.3;
        const sampleRate = audioContext.sampleRate;
        const frameCount = sampleRate * duration;
        
        const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Descending tone for call end
        const startFreq = 800;
        const endFreq = 400;
        
        for (let i = 0; i < frameCount; i++) {
            const t = i / frameCount;
            const frequency = startFreq + (endFreq - startFreq) * t;
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * (1 - t);
        }
        
        const wav = this.audioBufferToWav(buffer);
        const blob = new Blob([wav], { type: 'audio/wav' });
        audio.src = URL.createObjectURL(blob);
        
        return audio;
    }

    // ✅ ÚJ: Play random DTMF tones (simulating number dialing)
    async playRandomDTMFSequence() {
        const dtmfKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        const sequence = [];
        
        // Generate 5 random digits
        for (let i = 0; i < 5; i++) {
            const randomKey = dtmfKeys[Math.floor(Math.random() * dtmfKeys.length)];
            sequence.push(randomKey);
        }
        
        console.log(`📞 Dialing sequence: ${sequence.join('')}`);
        
        // Play each DTMF tone with 0.15s delay between them
        for (let i = 0; i < sequence.length; i++) {
            // Check if call was cancelled
            if (!this.isCallInProgress) {
                console.log('⚠️ DTMF sequence cancelled');
                return;
            }
            
            this.playDTMF(sequence[i]);
            
            // Wait 0.15s before next tone (except for last one)
            if (i < sequence.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 150));
            }
        }
        
        console.log('✅ DTMF sequence complete');
    }
    
    // Play single DTMF tone
    playDTMF(key) {
        const frequencies = {
            '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
            '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
            '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
            '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
        };
        
        if (!frequencies[key]) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') audioContext.resume();
        
        const [freq1, freq2] = frequencies[key];
        const o1 = audioContext.createOscillator();
        const o2 = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        o1.frequency.value = freq1;
        o2.frequency.value = freq2;
        o1.connect(gain);
        o2.connect(gain);
        gain.connect(audioContext.destination);
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
        
        o1.start();
        o2.start();
        o1.stop(audioContext.currentTime + 0.15);
        o2.stop(audioContext.currentTime + 0.15);
    }

    // Convert AudioBuffer to WAV format
    audioBufferToWav(buffer) {
        const length = buffer.length * buffer.numberOfChannels * 2;
        const arrayBuffer = new ArrayBuffer(44 + length);
        const view = new DataView(arrayBuffer);
        const channels = [];
        let offset = 0;
        let pos = 0;

        // Write WAV header
        const setUint16 = (data) => {
            view.setUint16(pos, data, true);
            pos += 2;
        };
        const setUint32 = (data) => {
            view.setUint32(pos, data, true);
            pos += 4;
        };

        // "RIFF" chunk descriptor
        setUint32(0x46464952);
        setUint32(36 + length);
        setUint32(0x45564157);

        // "fmt " sub-chunk
        setUint32(0x20746d66);
        setUint32(16);
        setUint16(1);
        setUint16(buffer.numberOfChannels);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * buffer.numberOfChannels * 2);
        setUint16(buffer.numberOfChannels * 2);
        setUint16(16);

        // "data" sub-chunk
        setUint32(0x61746164);
        setUint32(length);

        // Write interleaved data
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        while (pos < arrayBuffer.byteLength) {
            for (let i = 0; i < buffer.numberOfChannels; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return arrayBuffer;
    }

 // ÚJ: Hívásképernyő létrehozása és megjelenítése
    _showInCallUI(profile) {
        this.inCallScreen = document.getElementById('inCallScreen');
        if (!this.inCallScreen) {
            console.error("❌ In-call UI container #inCallScreen not found in HTML!");
            return;
        }

        const profileNameEl = this.inCallScreen.querySelector('#inCallProfileName');
        const profileEmojiEl = this.inCallScreen.querySelector('#inCallProfileEmoji');
        const statusTextEl = this.inCallScreen.querySelector('#inCallStatusText');
        const timerEl = this.inCallScreen.querySelector('#inCallTimer');
        const transcriptEl = this.inCallScreen.querySelector('#inCallTranscript');
        const costEl = this.inCallScreen.querySelector('#inCallCost');
        if (profile) {
            if (profileNameEl) profileNameEl.textContent = profile.name;
            if (profileEmojiEl) profileEmojiEl.textContent = profile.emoji;
        } else {
            if (profileNameEl) profileNameEl.textContent = 'AI';
            if (profileEmojiEl) profileEmojiEl.textContent = '🤖';
        }

        if (statusTextEl) statusTextEl.textContent = 'Dialing...';
        if (timerEl) timerEl.textContent = '00:00';
        if (costEl) costEl.textContent = '$0.0000';
        if (transcriptEl) transcriptEl.innerHTML = '';

        this.inCallScreen.classList.remove('hidden');
    }

    // JAVÍTOTT: Csak elrejti a meglévő UI-t
    _hideInCallUI() {
        if (this.inCallScreen) {
            this.inCallScreen.classList.add('hidden');
        }
    }

    // JAVÍTOTT: A kontextus alapú keresést használja
    _addEventToTranscript(text, className = '') {
        if (!this.inCallScreen || this.inCallScreen.classList.contains('hidden')) return null;
        
        const transcriptContainer = this.inCallScreen.querySelector('.in-call-transcript');
        if (!transcriptContainer) return null;

        const eventDiv = document.createElement('div');
        eventDiv.className = className;
        
        // ✅ Konvertáljuk a linkeket
        const htmlText = (typeof convertUrlsToLinks === 'function') 
            ? convertUrlsToLinks(text) 
            : text;
        eventDiv.innerHTML = htmlText;
        
        transcriptContainer.appendChild(eventDiv);

        transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
        return eventDiv;
    }

    // Start voice call
     async startCall(profilePrompt, voiceName = 'echo', profile) {
        if (this.isCallInProgress) {
            console.warn('⚠️ Call already in progress, ignoring new startCall request.');
            return { success: false, error: 'Call already in progress.' };
        }
        this.isCallInProgress = true; // ZÁSZLÓ BEÁLLÍTÁSA AZONNAL
        
        // ✅ NEW: Initialize call tracking
        this.currentCallProfile = profile;
        this.currentCallTranscript = [];
        this.callStartTime = Date.now();
        
        try {            
            console.log(`🎤 Starting voice call with voice: ${voiceName}`);
            this._showInCallUI(profile); // A teljes profilt átadjuk a UI-nak
            // ✅ KÖLTSÉGKÖVETÉS INDÍTÁSA
            const selectedModelName = VOICE_MODELS[window.selectedVoiceModel];
            if (window.costCalculator) {
                window.costCalculator.startCallCostTracking(selectedModelName);
            }
            
            // ✅ 1. DTMF SEQUENCE - AZONNAL (mint amikor beutöd a számokat)
            console.log('🔢 Playing DTMF dialing sequence...');
            await this.playRandomDTMFSequence();
            console.log('✅ DTMF sequence finished');
            
            // ✅ 2. Random késleltetés (1.5-3.5s) mielőtt a csengés elindul
            const dialingDelay = Math.random() * 2000 + 1500; // 1500-3500ms
            console.log(`⏳ Waiting ${Math.round(dialingDelay)}ms before ringing...`);
            await new Promise(resolve => setTimeout(resolve, dialingDelay));
            
            // ✅ 3. Dialing sound (csengés)
            if (!this.isCallInProgress) throw new Error('Cancelled by user before dialing sound.');
            this.callSounds.dialing.play().catch(e => console.warn('Could not play dialing sound:', e));
            console.log('🔊 Dialing sound started');
            
            if (this.onCallStateChange) {
                this.onCallStateChange('dialing');
            }

            this.ephemeralKey = await this.getEphemeralKey(voiceName);
            console.log('✅ Got ephemeral key');

            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
            console.log('✅ Got microphone access');

            this.peerConnection = new RTCPeerConnection();

            this.peerConnection.ontrack = (event) => {
                console.log('🔊 Received audio track from AI');
                this.audioElement.srcObject = event.streams[0];
                
                this.callSounds.dialing.pause();
                this.callSounds.dialing.currentTime = 0;
                this.isCallActive = true;
                this.audioTrackReady = true;
                
                if (this.onCallStateChange) {
                    this.onCallStateChange('connected');
                }
            };

            this.peerConnection.addTrack(this.mediaStream.getTracks()[0]);
            console.log('✅ Added microphone track');

            // Step 6: Create data channel for events
            const dataChannel = this.peerConnection.createDataChannel('oai-events');
            this.dataChannel = dataChannel; // Store reference
            
            dataChannel.addEventListener('message', (e) => {
                const event = JSON.parse(e.data);
                this.handleRealtimeEvent(event);
            });

            dataChannel.onopen = async () => {
                // ✅ JAVÍTÁS: Ellenőrizzük hogy még él-e a hívás (gyors bontás esetén már nem)
                if (!this.isCallInProgress || !this.dataChannel) {
                    console.log('⚠️ Call was cancelled before data channel opened');
                    return;
                }
                
                console.log('✅ Data channel opened');
                
                // Save 'this' context for async operations
                const self = this;
                
                // Get current date and time
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
                
                // Get weather data (if available from main app)
                let weatherContext = '';
                if (typeof getWeatherData === 'function') {
                    try {
                        const weather = await getWeatherData();
                        if (weather) {
                            weatherContext = `. ${weather}`;
                        }
                    } catch (error) {
                        console.warn('Could not get weather for voice session:', error);
                    }
                }
                
                // Get existing conversation history from main app
                const existingHistory = window.conversationHistory || [];
                //const profilePrompt = profile ? profile.prompt : null;
                // Build instructions with profile prompt if provided
                // IMPORTANT: This is only sent ONCE at session start, not with every message!
                /* let instructions = '';
                if (profilePrompt) {
                    instructions = `${profilePrompt}\n\nCurrent date and time: ${dateTimeString}${weatherContext}.\n\nIMPORTANT: The user primarily speaks Hungarian (magyar nyelv). ALWAYS detect and respond in the SAME language the user is speaking. If the user speaks Hungarian, you MUST respond in Hungarian. If the user speaks English, respond in English.`;
                } else {
                    instructions = `Current date and time: ${dateTimeString}${weatherContext}. You are a helpful assistant on a Nokai phone. Keep responses concise and friendly. The user primarily speaks Hungarian (magyar nyelv). Always respond in the same language the user is speaking. When you see search results in brackets, use that information to answer accurately.`;
                } */

                let instructions = '';
                                if (profilePrompt) {
                                    instructions = `${profilePrompt}\n\nCurrent date and time: ${dateTimeString}${weatherContext}.`;
                                } else {
                                    instructions = `Current date and time: ${dateTimeString}${weatherContext}. You are a helpful assistant on a Nokai phone. Keep responses concise and friendly.`;
                                }

                                // ✅ JAVÍTÁS: Egységes és erősebb utasítások a kereséshez és a nyelvhez
                                instructions += `\n\nIMPORTANT RULES:
                1.  LANGUAGE: ALWAYS respond in the SAME language the user is speaking. If they speak Hungarian, you MUST respond in Hungarian.
                2.  SEARCH RESULTS: If you are provided with [SEARCH RESULTS] in a subsequent message, you MUST use that information to answer the user's original question accurately. Announce that you are using fresh information, for example by saying "I just looked it up..." or "According to the latest information...".`;                    
                
                // Configure session for better transcription
                dataChannel.send(JSON.stringify({
                    type: 'session.update',
                    session: {
                        instructions: instructions,
                        voice: voiceName, // SET THE VOICE HERE
                        input_audio_transcription: {
                            model: 'whisper-1'
                        },
                        turn_detection: {
                            type: 'server_vad',
                            threshold: 0.5,
                            prefix_padding_ms: 300,
                            silence_duration_ms: 500,
                            create_response: false  // CRITICAL: Don't auto-create response!
                        },
                        input_audio_format: 'pcm16',
                        output_audio_format: 'pcm16'
                    }
                }));
                
// Add existing conversation history to Realtime API context
// IMPORTANT: Limit to last 20 messages to avoid hitting context limits!
if (existingHistory.length > 0) {
    const maxMessages = 20;
    const recentHistory = existingHistory.slice(-maxMessages);
    console.log(`📚 Loading last ${recentHistory.length} messages (of ${existingHistory.length} total) into voice context`);

    const buildContentForRole = (role, msg) => {
        // Normalize incoming msg.content into an array of content items
        let items = [];

        if (Array.isArray(msg.content)) {
            items = msg.content;
        } else if (msg.content && typeof msg.content === 'object' && msg.content.type) {
            items = [msg.content];
        } else {
            // plain string or other -> wrap into an item
            items = [{ text: String(msg.content ?? '' ) }];
        }

        // Now map/normalize types according to role expectations:
        // assistant -> wants { type: 'text', text: '...' }
        // user/system -> wants { type: 'input_text' | 'input_audio', text: '...' }
        if (role === 'assistant') {
            return items.map(it => ({
                type: 'text',
                text: (it.text || it.content || '')
            }));
        } else {
            // for user/system: if incoming item explicitly has input_audio, keep it; otherwise use input_text
            return items.map(it => {
                if (it.type === 'input_audio' || it.type === 'audio' || it.audio) {
                    return { type: 'input_audio', audio: it.audio || it.data || it.base64 || null };
                } else {
                    return { type: 'input_text', text: (it.text || it.content || '') };
                }
            });
        }
    };

    recentHistory.forEach((msg) => {
        try {
            const role = (msg.role === 'assistant' ? 'assistant' : (msg.role === 'system' ? 'system' : 'user'));
            const content = buildContentForRole(role, msg);

            const payload = {
                type: 'conversation.item.create',
                item: {
                    type: 'message',
                    role: role,
                    content: content
                }
            };

            // Debug log: lásd pontosan mi kerül elküldésre (távolítsd el később)
            //console.log('➡️ Sending conversation.item.create payload:', JSON.stringify(payload, null, 2));

            this.dataChannel.send(JSON.stringify(payload));
        } catch (err) {
            console.error('❌ Failed to send history item to Realtime API:', err);
        }
    });

    console.log('✅ Conversation history loaded into voice session');
    
    // CRITICAL: Add a dummy user message to "close" the conversation history
    // This prevents the AI from trying to respond to the last message in history
    console.log('📌 Adding conversation boundary marker...');
    this.dataChannel.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
            type: 'message',
            role: 'user',
            content: [{
                type: 'input_text',
                text: '[New call started]'
            }]
        }
    }));
}
                
                // Wait a moment for history to fully load AND for audio track to be ready
                await new Promise(resolve => setTimeout(resolve, 100)); // Csökkentve 200-ról 100-ra
                
                // CRITICAL: Wait for audio track to be ready before sending greeting
                // This ensures the AI's voice will be heard
                console.log('⏳ Waiting for audio track to be ready...');
                let audioWaitCount = 0;
                while (!self.audioTrackReady && audioWaitCount < 50) { // Max 5 seconds
                    await new Promise(resolve => setTimeout(resolve, 100));
                    audioWaitCount++;
                }
                
                if (!self.audioTrackReady) {
                    console.warn('⚠️ Audio track not ready, but proceeding anyway...');
                } else {
                    console.log('✅ Audio track ready!');
                }
                
                // Cancel any pending responses from previous sessions
                // This prevents the AI from continuing an old interrupted conversation
                // Note: May produce "response_cancel_not_active" error, which we filter in handleRealtimeEvent
                console.log('🧹 Clearing any pending responses...');
                this.dataChannel.send(JSON.stringify({
                    type: 'response.cancel'
                }));
                
                // Small delay to ensure cancellation is processed (if there was something to cancel)
                await new Promise(resolve => setTimeout(resolve, 50)); // Csökkentve 150-ről 50-re
                
                // Send a greeting message when call connects
                // The AI will respond to the "[New call started]" marker with our greeting
                console.log('📞 Triggering AI greeting...');
                this.dataChannel.send(JSON.stringify({
                    type: 'response.create',
                    response: {
                        modalities: ['audio', 'text'],
                        instructions: `Respond to the "[New call started]" message by picking up the phone and saying ONLY "Hello?" with rising intonation. Just one word. Nothing else.`
                    }
                }));
                };

            // Step 7: Create offer and exchange SDP
            const offer = await this.peerConnection.createOffer();
            if (!this.isCallInProgress) throw new Error('Cancelled by user before setting local description.');

            await this.peerConnection.setLocalDescription(offer);
            if (!this.isCallInProgress) throw new Error('Cancelled by user before SDP exchange.');

            const sdpResponse = await this.exchangeSDP(offer.sdp);
            if (!this.isCallInProgress) throw new Error('Cancelled by user before setting remote description.');
            
            // Kritikus ellenőrzés: csak akkor próbáljuk beállítani, ha a peerConnection még létezik
            if (this.peerConnection) {
                await this.peerConnection.setRemoteDescription({ type: 'answer', sdp: sdpResponse });
            } else {
                throw new Error('Cancelled just before setting remote description.');
            }

            console.log('✅ Connection established');
            return { success: true };

        } catch (error) {
            // A catch blokk most már elkapja a "Cancelled by user" üzeneteket is,
            // amiket nem kell hibaként naplózni.
            if (error.message.startsWith('Cancelled by user')) {
                console.log(`📞 Call attempt gracefully cancelled: ${error.message}`);
            } else {
                console.error('❌ Failed to start call:', error);
                if (this.onError) this.onError(error.message);
            }            
            // ✅ KÖLTSÉGKÖVETÉS LEÁLLÍTÁSA HIBA ESETÉN IS
            if (window.costCalculator) {
                window.costCalculator.stopCallCostTracking();
            }
            
            // Biztosítjuk, hogy a hívás mindenképp leálljon hiba esetén is.
            if (this.isCallInProgress) {
                this.endCall();
            }
            
            return { success: false, error: error.message };
        }
    }

    // End voice call
    endCall() {
    if (!this.isCallInProgress) return;
    this.isCallInProgress = false;

    // ✅ JAVÍTÁS: Mentsük el a végső költséget egy helyi változóba, MIELŐTT lenullázzuk.
    const finalCost = window.costCalculator?.currentCallCost || 0;

    // ✅ NEW: Save call to history
    if (this.currentCallProfile && this.callStartTime && window.nokiaPhoneApp) {
        const endTime = Date.now();
        const durationMs = endTime - this.callStartTime;
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        const durationStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        window.nokiaPhoneApp.addCallToHistory(
            this.currentCallProfile.name,
            this.currentCallProfile.emoji,
            durationStr,
            this.currentCallTranscript,
            finalCost
        );
        
        console.log('✅ Call saved to history:', {
            contact: this.currentCallProfile.name,
            duration: durationStr,
            transcriptLines: this.currentCallTranscript.length
        });
    }
    
    // Reset call tracking
    this.currentCallProfile = null;
    this.currentCallTranscript = [];
    this.callStartTime = null;
    
    // Most már biztonságosan leállíthatjuk és lenullázhatjuk a számlálót.
    if (window.costCalculator) {
        window.costCalculator.stopCallCostTracking();
    }
    
    // A logolás most már a mentett `finalCost` változót használja.
    console.groupCollapsed('📞 CALL ENDED - Summary');
    console.log(`🗣️ Final Estimated Cost: $${finalCost.toFixed(6)}`);
    console.log(`⏱️ Duration: ${document.getElementById('inCallTimer')?.textContent || 'N/A'}`);
    console.groupEnd();

    this._hideInCallUI();
    
    // A függvény többi része változatlan marad
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
        try {
            console.log('🧹 Cancelling active response before disconnect...');
            this.dataChannel.send(JSON.stringify({
                type: 'response.cancel'
            }));
        } catch (error) {
            console.warn('⚠️ Could not cancel response:', error);
        }
    }
    
    // ✅ JAVÍTÁS: 0.5s késleltetés a call end hang előtt
    setTimeout(() => {
        this.callSounds.ended.play().catch(e => console.warn('Could not play end sound:', e));
        console.log('🔊 Call end sound played');
    }, 200);
    
    if (this.callSounds.dialing) {
        this.callSounds.dialing.pause();
        this.callSounds.dialing.currentTime = 0;
    }

    if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
    }

    if (this.dataChannel) {
        this.dataChannel.close();
        this.dataChannel = null;
    }

    if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
    }

    if (this.audioElement) {
        this.audioElement.srcObject = null;
    }

    this.isCallActive = false;
    this.ephemeralKey = null;

    if (this.onCallStateChange) {
        this.onCallStateChange('ended');
    }

    console.log('✅ Call ended');
    window.appManager.showHomeScreen();
}

    // Get ephemeral key from server (with caching)
    async getEphemeralKey(voiceName = 'echo') {
        // Check if we have a valid cached key
        const now = Date.now();
        if (this.keyCache.key && this.keyCache.expiresAt && now < this.keyCache.expiresAt) {
            console.log('✅ Using cached ephemeral key (valid for ' + Math.round((this.keyCache.expiresAt - now) / 1000) + 's)');
            return this.keyCache.key;
        }
        const selectedModelName = VOICE_MODELS[window.selectedVoiceModel];
        console.log(`🔑 Requesting new ephemeral key with voice: ${voiceName} and model: ${selectedModelName}...`);

        const apiKey = window.apiKeyManager.getSessionApiKey();
        if (!apiKey) {
            throw new Error("API Key is not available for voice call.");
        }

        const response = await fetch('realtime-session.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: selectedModelName, // ✅ JAVÍTÁS: A kiválasztott modell átadása
                voice: voiceName,
                instructions: 'You are a helpful assistant on a Nokai (yes, Nokai, NOT Nokia!) phone. Keep responses concise and friendly.'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get ephemeral key');
        }

        const data = await response.json();
        const key = data.client_secret.value;
        
        // Cache the key for 50 seconds (keys are valid for 60 seconds)
        this.keyCache.key = key;
        this.keyCache.expiresAt = now + 50000; // 50 seconds
        console.log('✅ New ephemeral key cached (valid for 50s)');
        
        return key;
    }

    // Exchange SDP with OpenAI
    async exchangeSDP(sdp) {
        const response = await fetch(
            'https://api.openai.com/v1/realtime?model=gpt-realtime-2025-08-28',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.ephemeralKey}`,
                    'Content-Type': 'application/sdp'
                },
                body: sdp
            }
        );

        if (!response.ok) {
            throw new Error('Failed to exchange SDP');
        }

        return await response.text();
    }

    // Handle realtime events from OpenAI
    handleRealtimeEvent(event) {
        switch (event.type) {
            case 'response.audio_transcript.done':
                console.log('🤖 AI:', event.transcript);
                if (this.onTranscriptReceived) {
                    this.onTranscriptReceived('ai', event.transcript);
                }
                break;

            case 'conversation.item.input_audio_transcription.completed':
                if (event.transcript) {
                    console.log('😄 User:', event.transcript);
                    if (this.onTranscriptReceived) {
                        this.onTranscriptReceived('user', event.transcript);
                    }
                }
                break;

            case 'error':
                // Ignore expected cancellation errors
                if (event.error && (event.error.code === 'response_cancel_not_active' || 
                    event.error.code === 'conversation_already_has_active_response')) {
                    console.log('ℹ️ Cancellation info: ' + event.error.code + ' (expected during search)');
                    break;
                }
                
                console.error('❌ Realtime API error:', event.error);
                if (event.error.code === 'session_expired') {
                    this.endCall();
                }
                if (this.onError) {
                    this.onError(event.error.message);
                }
                break;

            case 'response.done':
                console.log('✅ Response completed');
                break;

            default:
                // console.log('Event:', event.type);
                break;
        }
    }

    // Apply telephone quality filter (classic phone sound)
    applyTelephoneFilter(stream) {
        try {
            console.log('📞 Applying telephone filter...');
            
            // Check if stream has audio tracks
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                console.warn('⚠️ No audio tracks in stream, using direct connection');
                this.audioElement.srcObject = stream;
                return;
            }
            
            console.log(`✅ Found ${audioTracks.length} audio track(s)`);
            
            // Reuse existing audioContext or create new one
            if (!this.remoteAudioContext) {
                this.remoteAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('✅ Audio context created, state:', this.remoteAudioContext.state);
            }
            
            const audioCtx = this.remoteAudioContext;
            
            // Resume context if suspended
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().then(() => {
                    console.log('▶️ Audio context resumed');
                }).catch(err => {
                    console.error('❌ Failed to resume context:', err);
                });
            }
            
            // Create source from stream
            let source;
            try {
                source = audioCtx.createMediaStreamSource(stream);
                console.log('✅ Media stream source created');
            } catch (err) {
                console.error('❌ Failed to create media stream source:', err);
                // Fallback to direct connection
                this.audioElement.srcObject = stream;
                return;
            }
            
            // Create filter chain
            const highpass = audioCtx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 300;
            highpass.Q.value = 0.7;
            
            const lowpass = audioCtx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.value = 3400;
            lowpass.Q.value = 0.7;
            
            const compressor = audioCtx.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;
            
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 0.85;
            
            console.log('✅ Filter nodes created');
            
            // Connect the chain: source -> highpass -> lowpass -> compressor -> gain
            source.connect(highpass);
            highpass.connect(lowpass);
            lowpass.connect(compressor);
            compressor.connect(gainNode);
            
            // Create destination and connect to audio element
            const destination = audioCtx.createMediaStreamDestination();
            gainNode.connect(destination);
            
            // Set the filtered stream to audio element
            this.audioElement.srcObject = destination.stream;
            
            console.log('☎️ Telephone filter applied successfully!');
            console.log('📊 Filter chain: source -> highpass(300Hz) -> lowpass(3400Hz) -> compressor -> gain(85%)');
            
        } catch (error) {
            console.error('❌ Filter error:', error);
            console.error('Stack:', error.stack);
            // Fallback: use original stream without filter
            console.warn('⚠️ Falling back to unfiltered audio');
            this.audioElement.srcObject = stream;
        }
    }
    
    // Check if call is active
    isActive() {
        return !!this.peerConnection;
    }

    /**
     * ✅ ÚJ: Debug funkció a hívás közbeni UI tesztelésére
     * @param {string} state - 'dialing', 'connected', vagy 'custom'
     * @param {object} customData - Opcionális adatok a 'custom' állapothoz
     */
    debugShowInCallUI(state = 'connected', customData = {}) {
        console.log(`🐞 DEBUG: Showing In-Call UI in state: ${state}`);

        if (!window.voiceHandler) {
            window.voiceHandler = this;
        }

        if (window.appManager) {
            window.appManager.hideAllScreens();
        } else {
            document.getElementById('homeScreen')?.classList.add('hidden');
            document.getElementById('screenContent')?.classList.add('hidden');
        }

        const profile = customData.profile || window.profileManager?.getSelectedProfile() || {
            name: 'Debug Profile',
            emoji: '🐞'
        };

        this._showInCallUI(profile);

        // ✅ JAVÍTÁS ITT: A státuszbár ikon megjelenítése
        const callStatusIcon = document.getElementById('callStatus');
        if (callStatusIcon) {
            callStatusIcon.classList.remove('hidden');
        }

        const statusTextEl = this.inCallScreen.querySelector('#inCallStatusText');
        const timerEl = this.inCallScreen.querySelector('#inCallTimer');
        // ✅ JAVÍTÁS: Indítsuk el a költségkalkulációt a GLOBÁLISAN kiválasztott hangmodellel.
        if (window.costCalculator) {
            const modelName = VOICE_MODELS[window.selectedVoiceModel];
            console.log(`🐞 DEBUG: Starting cost tracking for model: ${modelName}`);
            window.costCalculator.startCallCostTracking(modelName);
        }
        switch (state) {
            case 'dialing':
                if (statusTextEl) statusTextEl.textContent = 'Dialing...';
                if (timerEl) timerEl.textContent = '00:00';
                stopCallTimer();
                break;
            
            case 'connected':
                if (statusTextEl) statusTextEl.textContent = 'Connected';
                startCallTimer();
                break;

            case 'custom':
                if (statusTextEl) statusTextEl.textContent = customData.statusText || 'Custom State';
                if (timerEl) timerEl.textContent = customData.timerText || '12:34';
                if (customData.startTimer) {
                    startCallTimer();
                } else {
                    stopCallTimer();
                }
                break;
        }

        this._addEventToTranscript('Debug mode activated.', 'transcript-ai');
        this._addEventToTranscript('This is a test transcript entry.', 'transcript-user');
        this._addEventToTranscript('You can now style the UI.', 'transcript-ai');
    }

}

// Export for use in main app
window.NokiaVoiceHandler = NokiaVoiceHandler;
