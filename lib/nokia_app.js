const version = '1.51';

// T9 character mappings
/* const T9_MAP = {
    '1': ['.', ',', '?', '!', '-', "'", '(', ')', '@', '/', ':', ';', '1'],
    '2': ['a', 'á', 'b', 'c', '2'],
    '3': ['d', 'e', 'é', 'f', '3'],
    '4': ['g', 'h', 'i', 'í', '4'],
    '5': ['j', 'k', 'l', '5'],
    '6': ['m', 'n', 'o', 'ó', 'ö', 'ő', '6'],
    '7': ['p', 'q', 'r', 's', '7'],
    '8': ['t', 'u', 'ú', 'ü', 'ű', 'v', '8'],
    '9': ['w', 'x', 'y', 'z', '9'],
    '0': [' ', '0'],
    '#': ['\n']
}; */

const T9_MAP = {
    '1': ['.', ',', '?', '!', '1', '+', '=', '-', ':', ';', '~', '&', '%', "'", '"', '(', ')', '@', '^', '[', ']', '{', '}', '<', '>', '/', '\\', '_'],
    '2': ['a', 'á', 'b', 'c', 'à', 'â', 'ä', 'ç', '2'],
    '3': ['d', 'e', 'é', 'f', 'è', 'ê', 'ë', '3'],
    '4': ['g', 'h', 'i', 'í', 'ï', 'î', '4'],
    '5': ['j', 'k', 'l', 'ł', '5'],
    '6': ['m', 'n', 'o', 'ó', 'ö', 'ő', 'ô', 'ò', 'ø', 'õ', '6'],
    '7': ['p', 'q', 'r', 's', '$', 'ß', 'š', '7'],
    '8': ['t', 'u', 'ú', 'ü', 'ű', 'v',  'ù', 'û', '8'],
    '9': ['w', 'x', 'y', 'z', 'ž', '9'],
    '0': [' ', '0', '\u00A0'], // szóköz és nem törhető szóköz    
    '#': ['\n'] // sortörés
};

// Reverse mapping for T9 prediction
const T9_KEYMAP = {};
for (const [key, chars] of Object.entries(T9_MAP)) {
    for (const ch of chars) {
        // ne írja felül a newline-t
        if (ch !== '\n') T9_KEYMAP[ch.toLowerCase()] = key;
    }
}

// DTMF tone frequencies
const DTMF_FREQUENCIES = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

// App state
const MODELS = ['gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4.1'];
const VOICE_MODELS = ['gpt-realtime-mini', 'gpt-realtime'];
let selectedVoiceModel = 0;
let selectedModel = 0;
let currentInput = '';
let lastKey = null;
let lastKeyTime = 0;
let keyPressCount = 0;
let conversationHistory = [];
let shiftMode = false;
let menuOpen = false;
let menuIndex = 0;
let cursorPosition = 0;
let t9Mode = false;
let t9Sequence = '';
let t9Suggestions = [];
let t9SelectedIndex = 0;
let dictionary = { en: [], hu: [] };
let currentLang = 'en';
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
window.currentInput = '';
window.lastKey = null;
window.lastKeyTime = 0;
window.keyPressCount = 0;
window.selectedVoiceModel = 0;
window.conversationHistory = [];
// ✅ UNIFIED HISTORY: Alias for backward compatibility
Object.defineProperty(window, 'conversationHistory', {
    get() {
        return window.unifiedHistoryManager ? 
            window.unifiedHistoryManager.getCurrentHistory() : [];
    }
});
window.shiftMode = false;
window.menuOpen = false;
window.menuIndex = 0;
window.cursorPosition = 0;
window.t9Mode = false; // Itt már a window-ra tesszük
window.t9Sequence = '';
window.t9Suggestions = [];
window.t9SelectedIndex = 0;
window.dictionary = { en: [], hu: [] };
window.currentLang = 'en';
// Voice handler instance
//let voiceHandler = null;
window.voiceHandler = null;

// Profile manager instance - NO local variable, use window.profileManager only
// let profileManager = null;  // REMOVED - use window.profileManager

// Make conversationHistory globally accessible
window.conversationHistory = [];

// Storage keys
const STORAGE_KEYS = {
    HISTORIES: 'nokia_chat_histories', 
    CONVERSATION: 'nokia_chat_conversation',
    INPUT: 'nokia_chat_input',
    CURSOR: 'nokia_chat_cursor',
    MODEL: 'nokia_chat_model',
    VOICE_MODEL: 'nokia_chat_voicemodel',
    T9MODE: 'nokia_chat_t9mode',
    LANG: 'nokia_chat_lang'
};

// Storage functions
/* async function loadFromStorage() {
    try {
        const savedConversation = localStorage.getItem(STORAGE_KEYS.CONVERSATION);
        const savedInput = localStorage.getItem(STORAGE_KEYS.INPUT);
        const savedCursor = localStorage.getItem(STORAGE_KEYS.CURSOR);
        const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL);
        const savedVoiceModel = localStorage.getItem(STORAGE_KEYS.VOICE_MODEL);
        const savedT9 = localStorage.getItem(STORAGE_KEYS.T9MODE);
        const savedLang = localStorage.getItem(STORAGE_KEYS.LANG);

        if (savedConversation && savedConversation !== '[]') {
            window.conversationHistory = JSON.parse(savedConversation);
            const screenContent = document.getElementById('screenContent');
            screenContent.querySelectorAll('.message').forEach(msg => msg.remove());
            await restoreMessages(); // ✅ Now async
        }
        if (savedInput) currentInput = savedInput;
        if (savedCursor) cursorPosition = parseInt(savedCursor, 10) || 0;
        if (savedModel) selectedModel = parseInt(savedModel, 10) || 0;
        if (savedVoiceModel) window.selectedVoiceModel = parseInt(savedVoiceModel, 10) || 0;
        if (savedT9) t9Mode = savedT9 === 'true';
        if (savedLang) currentLang = savedLang;
    } catch (e) {
        console.error('Storage load error:', e);
        window.conversationHistory = [];
    }
    const inputMode = document.getElementById('inputMode');
    if (inputMode) inputMode.textContent = t9Mode ? 'T9' : 'Abc';        
    updateDisplay();
} */

async function loadFromStorage() {
    try {
        // 1. Először az új, objektum alapú tárolót próbáljuk betölteni.
        const savedHistories = localStorage.getItem(STORAGE_KEYS.HISTORIES);
        if (savedHistories) {
            window.conversationHistories = JSON.parse(savedHistories);
        } else {
            // 2. Ha az új formátum nem létezik, megpróbáljuk a régit (migráció).
            const savedConversationLegacy = localStorage.getItem(STORAGE_KEYS.CONVERSATION_LEGACY);
            if (savedConversationLegacy && savedConversationLegacy !== '[]') {
                console.log('🔄 Migrating legacy conversation history to new format...');
                // A régi előzményt a 'main' kulcs alá tesszük az új objektumban.
                window.conversationHistories = {
                    main: JSON.parse(savedConversationLegacy)
                };
                // Elmentjük az új formátumban, és töröljük a régit.
                saveToStorage();
                localStorage.removeItem(STORAGE_KEYS.CONVERSATION_LEGACY);
            } else {
                // Ha egyik sem létezik, létrehozzuk az alapértelmezett üres struktúrát.
                window.conversationHistories = { main: [] };
            }
        }

        // Biztosítjuk, hogy a 'main' kontextus mindig létezzen.
        if (!window.conversationHistories.main) {
            window.conversationHistories.main = [];
        }

        // 3. Beállítjuk az aktív előzményt a 'main' kontextusra.
        // A többi kód (pl. restoreMessages) ezt a `window.conversationHistory` tömböt használja.
        window.conversationHistory = window.conversationHistories.main;

        // A többi beállítás betöltése változatlan
        const savedInput = localStorage.getItem(STORAGE_KEYS.INPUT);
        const savedCursor = localStorage.getItem(STORAGE_KEYS.CURSOR);
        const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL);
        const savedVoiceModel = localStorage.getItem(STORAGE_KEYS.VOICE_MODEL);
        const savedT9 = localStorage.getItem(STORAGE_KEYS.T9MODE);
        const savedLang = localStorage.getItem(STORAGE_KEYS.LANG);

        if (window.conversationHistory.length > 0) {
            const screenContent = document.getElementById('screenContent');
            screenContent.querySelectorAll('.message').forEach(msg => msg.remove());
            await restoreMessages();
        }
        if (savedInput) currentInput = savedInput;
        if (savedCursor) cursorPosition = parseInt(savedCursor, 10) || 0;
        if (savedModel) selectedModel = parseInt(savedModel, 10) || 0;
        if (savedVoiceModel) window.selectedVoiceModel = parseInt(savedVoiceModel, 10) || 0;
        if (savedT9) t9Mode = savedT9 === 'true';
        if (savedLang) currentLang = savedLang;

    } catch (e) {
        console.error('Storage load error:', e);
        window.conversationHistories = { main: [] };
        window.conversationHistory = [];
    }
    const inputMode = document.getElementById('inputMode');
    if (inputMode) inputMode.textContent = t9Mode ? 'T9' : 'Abc';        
    updateDisplay();
}    

function saveToStorage() {
    try {        
        // A régi, egyetlen előzmény mentése helyett...
        // localStorage.setItem(STORAGE_KEYS.CONVERSATION, JSON.stringify(window.conversationHistory));
        
        // ...az új, objektum alapú tárolót mentjük, ami az összes profilt tartalmazza.
        localStorage.setItem(STORAGE_KEYS.HISTORIES, JSON.stringify(window.conversationHistories || { main: [] }));
        localStorage.setItem(STORAGE_KEYS.INPUT, currentInput);
        localStorage.setItem(STORAGE_KEYS.CURSOR, cursorPosition.toString());
        localStorage.setItem(STORAGE_KEYS.MODEL, selectedModel.toString());
        localStorage.setItem(STORAGE_KEYS.VOICE_MODEL, window.selectedVoiceModel.toString());
        localStorage.setItem(STORAGE_KEYS.T9MODE, t9Mode.toString());
        localStorage.setItem(STORAGE_KEYS.LANG, currentLang);
    } catch (e) {
        console.error('Storage save error:', e);
    }
}

async function restoreMessages() {
    const screenContent = document.getElementById('screenContent');
    const inputLine = screenContent.querySelector('.input-line');
    const textMessages = window.conversationHistory.filter(msg => msg.type !== 'voice');
    
    for (const msg of textMessages) {
        const div = document.createElement('div');
        div.className = 'message ' + (msg.role === 'user' ? 'user-msg' : 'ai-msg');
        
        // ✅ JAVÍTÁS: Előtag és profile név használata
        let prefix = '';
        if (msg.metadata && msg.metadata.isVoice) {
            // Voice message
            prefix = msg.role === 'user' ? '🎤 ' : '🔊 ';
        } else if (msg.role === 'user') {
            // Text message - user
            prefix = '> ';
        } else {
            // Text message - AI (használjuk a metadata-ban tárolt profile nevet)
            const aiName = (msg.metadata && msg.metadata.profileName) ? msg.metadata.profileName : 'AI';
            prefix = `${aiName}: `;
        }
        
        const text = prefix + msg.content;
        
        // Convert URLs to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const htmlText = text.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #1a3a1a; text-decoration: underline;">${url}</a>`;
        });
        
        div.innerHTML = htmlText;
        
        // ✅ ÚJ: Kép hozzáadása (ha van attachmentId) - NOW ASYNC
        if (msg.attachmentId && window.imageAttachments) {
            const imageData = await window.imageAttachments.getChatImage(msg.attachmentId);
            if (imageData) {
                const imgEl = document.createElement('img');
                imgEl.src = imageData.retro;
                imgEl.className = 'chat-image';
                imgEl.style.maxWidth = '100%';
                imgEl.style.height = '96px';
                imgEl.style.borderRadius = '4px';
                imgEl.style.marginTop = '4px';
                imgEl.style.filter = 'grayscale(100%)';
                imgEl.style.display = 'block';
                div.appendChild(imgEl);
            }
        }
        
        screenContent.insertBefore(div, inputLine);
    }
    screenContent.scrollTop = screenContent.scrollHeight;
}

// Display update functions
/* function updateProfileDisplay() {
    const menuItem = document.querySelector('.menu-screen .menu-item[data-index="2"]');
    
    if (!menuItem || !window.profileManager) return;
    
    const profile = window.profileManager.getSelectedProfile();
    
    if (profile) {
        // Split emoji and text for different sizing
        const emoji = profile.emoji;
        const name = profile.name;
        const newHtml = `3. Profile: <span style="font-size: 80%;">${emoji}</span> ${name}`;
        
        if (menuItem.innerHTML !== newHtml) {
            menuItem.innerHTML = newHtml;
        }
    }
} */

/* function updateModelDisplay() {
    const menuItem = document.querySelector('[data-index="3"]');
    if (menuItem) menuItem.textContent = `4. Model: ${MODELS[selectedModel]}`;
} */

/* function updateT9Display() {
    const menuItem = document.querySelector('[data-index="4"]');
    if (menuItem) menuItem.textContent = `5. T9: ${t9Mode ? 'ON' : 'OFF'}`;
    const inputMode = document.getElementById('inputMode');
    if (inputMode) inputMode.textContent = t9Mode ? 'T9' : 'Abc';
} */

/* function updateLangDisplay() {
    const menuItem = document.querySelector('[data-index="5"]');
    if (menuItem) menuItem.textContent = `6. T9 Lang: ${currentLang.toUpperCase()}`;
} */

// Dictionary functions
/* async function loadDictionary(lang) {
    try {
        const response = await fetch(`words_${lang}.txt`);
        const text = await response.text();
        dictionary[lang] = text.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
        console.log(`Loaded ${dictionary[lang].length} ${lang} words`);
    } catch (e) {
        console.error(`Failed to load ${lang} dictionary:`, e);
        dictionary[lang] = [];
    }
} */

async function loadDictionary(lang) {
    try {
        const response = await fetch(`./T9/words_${lang}.txt`);
        const text = await response.text();
        const baseWords = text.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
        
        const customWordsKey = `nokia_custom_words_${lang}`;
        const savedCustomWords = localStorage.getItem(customWordsKey);
        const customWords = savedCustomWords ? JSON.parse(savedCustomWords) : [];

        dictionary[lang] = [...new Set([...baseWords, ...customWords])];
        
        console.log(`Loaded ${baseWords.length} base words and ${customWords.length} custom words for '${lang}'. Total: ${dictionary[lang].length}`);
    } catch (e) {
        console.error(`Failed to load ${lang} dictionary:`, e);
        dictionary[lang] = [];
    }
}


function saveCustomWord(word) {
    if (!word || word.length < 2) return;

    const lowerCaseWord = word.toLowerCase();
    const customWordsKey = `nokia_custom_words_${currentLang}`;
    
    const savedCustomWords = localStorage.getItem(customWordsKey);
    let customWords = savedCustomWords ? JSON.parse(savedCustomWords) : [];

    if (!customWords.includes(lowerCaseWord)) {
        customWords.push(lowerCaseWord);
        localStorage.setItem(customWordsKey, JSON.stringify(customWords));

        if (!dictionary[currentLang].includes(lowerCaseWord)) {
            dictionary[currentLang].push(lowerCaseWord);
            console.log(`New word "${lowerCaseWord}" saved and added to dictionary.`);
        }
        // --- ÚJ RÉSZ: ANIMÁCIÓ INDÍTÁSA ---
        const saveIcon = document.getElementById('saveIndicator');
        const saveSeparator = document.getElementById('saveSeparator');
            
            if (saveIcon && saveSeparator) {
                // 1. Az IKON animációjának indítása
                saveIcon.classList.add('animate');

                // 2. A SZEPARÁTOR AZONNALI MEGJELENÍTÉSE
                saveSeparator.classList.remove('hidden');

                // 3. Időzítő a visszaállításhoz 1 másodperc múlva
                setTimeout(() => {
                    saveIcon.classList.remove('animate');
                    saveSeparator.classList.add('hidden');
                }, 1000);
            }
        }
    }


function wordToT9(word) {
    return word.toLowerCase().split('').map(c => T9_KEYMAP[c] || '').join('');
}

function getT9Suggestions(sequence) {
    if (!sequence || !t9Mode || !dictionary[currentLang]) return [];
    const words = dictionary[currentLang].filter(word => wordToT9(word).startsWith(sequence));
    return words.slice(0, 5);
}

function applyT9Suggestion() {
    if (t9Suggestions.length === 0 || !t9Mode) return;
    const suggestion = t9Suggestions[t9SelectedIndex];
    
    const beforeSequence = currentInput.slice(0, cursorPosition - t9Sequence.length);
    const afterSequence = currentInput.slice(cursorPosition);
    
    let finalWord = suggestion;
    if (shiftMode) {
        finalWord = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
        shiftMode = false;
    }
    
    currentInput = beforeSequence + finalWord + afterSequence;
    cursorPosition = beforeSequence.length + finalWord.length;
    
    t9Sequence = '';
    t9Suggestions = [];
    t9SelectedIndex = 0;
    
    updateDisplay();
    saveToStorage();
}

function t9SequenceToFallbackWord(sequence) {
    if (!sequence) return '';
    
    // Végigmegyünk a számsorozat karakterein
    return sequence.split('').map(key => {
        // A T9_MAP-ból vesszük a gombhoz tartozó karaktertömböt
        const chars = T9_MAP[key];
        // Visszaadjuk az első karaktert, ha létezik, egyébként egy üres stringet
        return (chars && chars.length > 0) ? chars[0] : '';
    }).join(''); // Összefűzzük a karaktereket egyetlen szóvá
}

function t9SequenceToMultitapWord(sequence) {
    if (!sequence) return '';

    let result = '';
    let currentKey = '';
    let pressCount = 0;

    for (const key of sequence) {
        if (key === currentKey) {
            pressCount++;
        } else {
            // Ha új gombot nyomtunk, írjuk ki az előző karaktert
            if (currentKey) {
                const chars = T9_MAP[currentKey];
                if (chars) {
                    result += chars[pressCount % chars.length];
                }
            }
            // És kezdjük újra a számolást az új gombbal
            currentKey = key;
            pressCount = 0;
        }
    }

    // Az utolsó karakter kiírása a ciklus után
    if (currentKey) {
        const chars = T9_MAP[currentKey];
        if (chars) {
            result += chars[pressCount % chars.length];
        }
    }

    return result;
}

// UI update functions
let signalStrength = 5;
function updateSignalStrength() {
    const targetStrength = Math.floor(Math.random() * 3) + 3;
    if (targetStrength !== signalStrength) {
        signalStrength = targetStrength;
        document.querySelectorAll('.signal-bar').forEach((bar, index) => {
            bar.classList.toggle('inactive', index >= signalStrength);
        });
    }
}

function scheduleNextSignalUpdate() {
    const delay = Math.random() * 10000 + 5000;
    setTimeout(() => {
        updateSignalStrength();
        scheduleNextSignalUpdate();
    }, delay);
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const timeElement = document.getElementById('time');
    if (timeElement) {
        timeElement.textContent = `${hours}:${mins}`;
    }
}

function playDTMF(key) {
    if (!DTMF_FREQUENCIES[key] || !audioContext) return;
    if (audioContext.state === 'suspended') audioContext.resume();
    const [freq1, freq2] = DTMF_FREQUENCIES[key];
    const o1 = audioContext.createOscillator(), o2 = audioContext.createOscillator();
    const gain = audioContext.createGain();
    o1.frequency.value = freq1; o2.frequency.value = freq2;
    o1.connect(gain); o2.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
    o1.start(); o2.start();
    o1.stop(audioContext.currentTime + 0.15); o2.stop(audioContext.currentTime + 0.15);
}
