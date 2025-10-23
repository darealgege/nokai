/**
 * Nokia App Handlers - Utilities Module
 * Helper functions, dialogs, and utilities
 */

// Legacy menu functions (kept for compatibility, but deprecated)
function openMenu() {
    menuOpen = true;
    menuIndex = 0;
    
    //updateProfileDisplay();
    
    document.getElementById('screenContent').style.display = 'none';
    document.getElementById('menuScreen').classList.add('active');
    updateMenuSelection();
}

function closeMenu() {
    menuOpen = false;
    document.getElementById('screenContent').style.display = 'block';
    document.getElementById('menuScreen').classList.remove('active');
    updateDisplay();
}

function resetScreen(message = 'Session cleared!') {
    // ✅ ÚJ API: Töröljük az összes ChatGPT referenciát!
    if (window.imageAttachments) {
        window.imageAttachments.clearChatGPTReferences();
    }
    
    const screenContent = document.getElementById('screenContent');
    screenContent.innerHTML = '';
    const initialMessages = ['ChatGPT on Nokai', 'Ready to chat!', message];
    initialMessages.forEach(text => {
        const div = document.createElement('div');
        div.className = 'message';
        div.textContent = text;
        screenContent.appendChild(div);
    });
    const inputLine = document.createElement('div');
    inputLine.className = 'input-line';
    inputLine.innerHTML = '<span>&gt;</span><span id="inputText"></span>';
    screenContent.appendChild(inputLine);
    currentInput = '';
    cursorPosition = 0;
    window.conversationHistory = [];
    t9Sequence = '';
    t9Suggestions = [];
    saveToStorage();
    updateDisplay();
}

function updateMenuSelection() {
    const menuScreen = document.getElementById('menuScreen');
    const items = document.querySelectorAll('.menu-item');
    
    items.forEach((item, i) => {
        const isSelected = (i === menuIndex);
        item.classList.toggle('selected', isSelected);
        
        if (isSelected) {
            const itemTop = item.offsetTop;
            const itemHeight = item.offsetHeight;
            const containerHeight = menuScreen.clientHeight;
            const currentScroll = menuScreen.scrollTop;
            
            const minScroll = 0;
            const bottomPadding = 12;
            
            if (itemTop < currentScroll + 8) {
                menuScreen.scrollTop = Math.max(minScroll, itemTop - 8);
            }
            else if (itemTop + itemHeight + bottomPadding > currentScroll + containerHeight) {
                menuScreen.scrollTop = itemTop + itemHeight + bottomPadding - containerHeight;
            }
        }
    });
    
    //updateProfileDisplay();
}

function selectMenuItem() {
    const action = ['newSession', 'clear', 'about', 'home'][menuIndex];
    switch(action) {
        case 'newSession':
            resetScreen('Session cleared!');
            closeMenu();
            break;
        case 'clear':
            resetScreen('History cleared!');
            closeMenu();
            break;
        case 'about':
            closeMenu();
            showAboutDialog();
            break;
        case 'home':
            closeMenu();
            if (window.appManager) {
                window.appManager.showHomeScreen();
            }
            break;
    }
}

function updateDisplay() {
    const inputElement = document.getElementById('inputText');
    if (!inputElement) return;
    
    let displayText = currentInput.slice(0, cursorPosition);
    
    // ✅ NAGY BETŰS: chatGPTImageHandler
    if (window.chatGPTImageHandler && window.chatGPTImageHandler.hasPendingAttachment && window.chatGPTImageHandler.hasPendingAttachment()) {
        displayText = '🖼️: ' + displayText;
    }
    
    if (t9Mode && t9Sequence.length > 0 && t9Suggestions.length > 1) {
        displayText += ` [${t9SelectedIndex + 1}/${t9Suggestions.length}]`;
    }
    
    const afterCursor = currentInput.slice(cursorPosition);
    let cursorHtml = `<span class="cursor"${shiftMode ? ' style="text-decoration: underline;"' : ''}></span>`;
    inputElement.innerHTML = displayText + cursorHtml + afterCursor;
}

function updateShiftIndicator() {
    const indicator = document.getElementById('shiftIndicator');
    const separator = document.getElementById('shiftSeparator');
    if (!indicator || !separator) return;

    if (shiftMode) {
        indicator.textContent = '⬆️';
        separator.classList.remove('hidden');
    } else {
        indicator.textContent = '';
        separator.classList.add('hidden');
    }
}

/**
 * ✅ JAVÍTOTT FÜGGVÉNY
 * Megkeresi a kurzor alatti szót, mind a ChatGPT, mind a Messages appban.
 */
/* function getWordAtCursor() {
    let text = '';
    let cursor = 0;
    const isActiveMessages = window.nokiaMessages && window.nokiaMessages.isActive && window.nokiaMessages.viewMode === 'conversation';

    if (isActiveMessages) {
        const textarea = document.getElementById('messagesInputArea');
        if (!textarea) return null;
        text = textarea.value;
        cursor = textarea.selectionStart;
    } else {
        // Alapértelmezett a ChatGPT app
        text = window.currentInput;
        cursor = window.cursorPosition;
    }

    if (text.length === 0 || cursor === 0) return null;
    
    // Ha a kurzor szóközön vagy sortörésen van, akkor nincs szó.
    if ([' ', '\n'].includes(text[cursor - 1])) return null;

    const before = text.slice(0, cursor);
    const after = text.slice(cursor);

    // A szó elejének megkeresése
    const start = Math.max(before.lastIndexOf(' '), before.lastIndexOf('\n')) + 1;
    
    // A szó végének megkeresése
    let endAfter = after.indexOf(' ');
    const newlineIndex = after.indexOf('\n');
    if (newlineIndex !== -1 && (endAfter === -1 || newlineIndex < endAfter)) {
        endAfter = newlineIndex;
    }
    if (endAfter === -1) {
        endAfter = after.length;
    }
    const end = cursor + endAfter;

    const word = text.substring(start, end).trim();
    
    // Tisztítás, hogy csak betűk maradjanak a szótár-ellenőrzéshez
    const cleanedWord = word.replace(/[^\p{L}]/gu, '');

    if (!cleanedWord) return null;
    
    return { word: cleanedWord };
} */

/**
 * ✅ JAVÍTOTT FÜGGVÉNY
 * Megkeresi a kurzor alatti szót, mind a ChatGPT, mind a Messages appban.
 */
/**
 * ✅ JAVÍTOTT FÜGGVÉNY v4 - DOM-ból is olvas!
 * Megkeresi a kurzor alatti szót, mind a ChatGPT, mind a Messages appban.
 * 
 * FONTOS LOGIKA:
 * - ChatGPT appban: először currentInput-ot próbáljuk, ha üres, akkor DOM-ból olvassuk!
 * - Messages appban: textarea.value és textarea.selectionStart-ból dolgozunk
 * - MINDKÉT esetben: a szót a KURZOR pozíciója alapján keressük meg
 * - Karaktérenként összerakjuk a szót, kihagyva a szóközöket és írásjeleket!
 */
function getWordAtCursor() {
    let text = '';
    let cursor = 0;
    const isActiveMessages = window.nokiaMessages && window.nokiaMessages.isActive && window.nokiaMessages.viewMode === 'conversation';

    // 1. Adatok begyűjtése az aktív alkalmazásból
    if (isActiveMessages) {
        const textarea = document.getElementById('messagesInputArea');
        if (!textarea) return null;
        text = textarea.value;
        cursor = textarea.selectionStart;
    } else if (window.appManager && window.appManager.isInChatGPT()) {
        // ✅ ChatGPT appban
        text = window.currentInput || '';
        cursor = window.cursorPosition || 0;
        
        // ✅ ÚJ: Ha a currentInput üres, próbáljuk meg a DOM-ból olvasni!
        if (text.length === 0) {
            const inputElement = document.getElementById('inputText');
            if (inputElement) {
                // A DOM szövegét karakterenként összerakjuk
                const domText = inputElement.textContent || '';
                console.log('🔍 Reading from DOM:', domText);
                
                // Eltávolítjuk a kurzort (ha van)
                text = domText.replace(/\[\d+\/\d+\]/g, '').trim();
                cursor = text.length; // A kurzor a szöveg végén van
                
                console.log('✅ Extracted from DOM:', { text, cursor });
            }
        }
    } else {
        // Ha egyik app sem aktív, nincs mit keresni
        return null;
    }

    console.log('🔍 getWordAtCursor INPUT:', { text, cursor, textLength: text.length });

    if (text.length === 0) {
        console.log('⚠️ Empty text');
        return null;
    }
    
    if (cursor === 0) {
        console.log('⚠️ Cursor at position 0');
        return null;
    }

    // 2. Szó határainak megkeresése a KURZOR pozíciója alapján
    // ✅ Karaktérenként összerakjuk a szót!
    
    let searchPos = cursor - 1; // Az utolsó beírt karakter
    
    // Ha a kurzor pontosan egy szóközön vagy sortörésen áll
    if (searchPos >= 0 && (text[searchPos] === ' ' || text[searchPos] === '\n')) {
        console.log('⚠️ Cursor on/after space');
        return null;
    }
    
    if (searchPos < 0) {
        console.log('⚠️ Invalid search position');
        return null;
    }

    // 3. Keressük a szó ELEJre (visszafelé)
    let start = searchPos;
    while (start > 0 && text[start - 1] !== ' ' && text[start - 1] !== '\n') {
        start--;
    }

    // 4. Keressük a szó VÉGÉre (előrefelé)
    let end = searchPos + 1;
    while (end < text.length && text[end] !== ' ' && text[end] !== '\n') {
        end++;
    }

    // 5. A szó kivágása és tisztítása KARAKTÉRENKÉNT!
    const rawWord = text.substring(start, end);
    
    // ✅ Karaktérenként szűrjük: csak betűket tartunk meg!
    let cleanedWord = '';
    for (let i = 0; i < rawWord.length; i++) {
        const char = rawWord[i];
        // Ellenőrizzük, hogy betű-e (Unicode letter)
        if (/\p{L}/u.test(char)) {
            cleanedWord += char;
        }
    }

    console.log('✅ Word found:', { rawWord, cleanedWord, start, end });

    if (!cleanedWord) {
        console.log('⚠️ No valid word (only punctuation/spaces)');
        return null;
    }
    
    return { word: cleanedWord, inMessages: isActiveMessages };
}



/**
 * ✅ JAVÍTOTT FÜGGVÉNY
 * Elindítja a custom dictionary szó törlési folyamatát.
 * Most már működik mind a ChatGPT, mind a Messages appban.
 */
function startWordDeletion() {
    // ✅ JAVÍTÁS: Ellenőrizzük, hogy aktív app-ban vagyunk-e
    const inChatGPT = window.appManager && window.appManager.isInChatGPT();
    const inMessages = window.nokiaMessages && window.nokiaMessages.isActive && window.nokiaMessages.viewMode === 'conversation';
    
    // Ha egyik app sem aktív, kilépünk
    if (!inChatGPT && !inMessages) {
        console.log('⚠️ Word deletion: Not in active app');
        return;
    }

    // Ha már van nyitott dialógus, kilépünk
    if (menuOpen || isDialogActive) {
        console.log('⚠️ Word deletion: Dialog already open');
        return;
    }

    const wordData = getWordAtCursor();
    if (!wordData) {
        console.log('⚠️ Word deletion: No word found at cursor');
        return;
    }

    const { word } = wordData;
    const customWordsKey = `nokia_custom_words_${currentLang}`;
    const savedCustomWords = localStorage.getItem(customWordsKey);
    const customWords = savedCustomWords ? JSON.parse(savedCustomWords) : [];

    if (customWords.includes(word.toLowerCase())) {
        wordToDelete = word.toLowerCase();
        
        console.log(`✅ Custom word found in dictionary: "${word}" - showing deletion dialog`);
        
        // ✅ Az általános showConfirmationDialog használata
        showConfirmationDialog(`Remove from T9 custom dictionary: "${word}"?`, () => {
            deleteWordFromStorage(wordToDelete);
            wordToDelete = null;
        });
    } else {
        console.log(`⚠️ Word "${word}" is not in custom dictionary`);
    }
}

function deleteWordFromStorage(word) {
    const lowerCaseWord = word.toLowerCase();
    const customWordsKey = `nokia_custom_words_${currentLang}`;
    
    let customWords = JSON.parse(localStorage.getItem(customWordsKey) || '[]');
    const initialLength = customWords.length;
    customWords = customWords.filter(w => w !== lowerCaseWord);

    if (customWords.length < initialLength) {
        localStorage.setItem(customWordsKey, JSON.stringify(customWords));
        dictionary[currentLang] = dictionary[currentLang].filter(w => w !== lowerCaseWord);
        console.log(`Word "${lowerCaseWord}" has been deleted.`);
        addMessage(`Word removed: ${lowerCaseWord}`);
    }
}

/**
 * ✅ ÚJ: URL-ek konvertálása kattintható linkekre
 * @param {string} text - A szöveg, amiben linkeket keresünk
 * @returns {string} - HTML string linkekkel
 */
function convertUrlsToLinks(text) {
    if (!text) return '';
    
    // URL regex - HTTP és HTTPS protokollokat keres
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="retro-link">${url}</a>`;
    });
}

window.toggleFullscreen = function() {
    if (navigator.standalone !== undefined) {
        alert('iOS: Add to Home Screen for fullscreen experience!\n\niOS: Adj hozzá a képernyőhöz a teljes képernyős élményért!');
        return;
    }
    
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const elem = document.documentElement;
        
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.error('Fullscreen error:', err);
            });
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen().catch(err => {
                console.error('Fullscreen error:', err);
            });
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

document.addEventListener('fullscreenchange', () => {
    const btn = document.getElementById('fullscreenBtn');
    if (btn) btn.textContent = document.fullscreenElement ? '⛶' : '⛶';
});

// About dialog functions
function showAboutDialog() {
    // ✅ JAVÍTÁS: A verziószám dinamikus frissítése
    const versionElement = document.getElementById('aboutVersionText');
    if (versionElement && typeof version !== 'undefined') {
        versionElement.textContent = `Version ${version} - UI Redesign`;
    }

    // A dialógus megjelenítése (ez a rész változatlan)
    const dialog = document.getElementById('aboutDialog');
    if (dialog) {
        dialog.classList.remove('hidden');
        //playDTMF('5');
        const content = document.getElementById('aboutContent');
        if (content) content.scrollTop = 0;
    }
}

function closeAboutDialog() {
    const dialog = document.getElementById('aboutDialog');
    if (dialog) {
        dialog.classList.add('hidden');
        //playDTMF('1');
        
        // Settings dialog automatically becomes visible (it was never hidden)
        // If not in settings, go to home screen
        if (window.appManager && window.appManager.currentApp !== 'settings') {
            window.appManager.showHomeScreen();
        }
    }
}

function isAboutDialogOpen() {
    const dialog = document.getElementById('aboutDialog');
    return dialog && !dialog.classList.contains('hidden');
}

function scrollAboutDialog(amount) {
    const content = document.getElementById('aboutContent');
    if (content) {
        const currentScroll = content.scrollTop;
        const maxScroll = content.scrollHeight - content.clientHeight;
        
        let newScroll = currentScroll + amount;
        
        if (newScroll < 0) {
            newScroll = maxScroll;
        } else if (newScroll > maxScroll) {
            newScroll = 0;
        }
        
        content.scrollTop = newScroll;
        //playDTMF(amount > 0 ? '8' : '2');
    }
}

/**
 * ✅ ÚJ: Egyedi, Nokia-stílusú alert ablakot jelenít meg.
 * @param {string} message - A megjelenítendő üzenet.
 * @param {string} [title='Alert'] - Az ablak címe.
 */
function showAlert(message, title = 'Alert') {
    return new Promise((resolve) => {
        const dialog = document.getElementById('customAlertDialog');
        const titleEl = document.getElementById('alertDialogTitle');
        const messageEl = document.getElementById('alertDialogMessage');

        if (!dialog || !titleEl || !messageEl) {
            resolve(); // Ha nincs dialógus, azonnal térjünk vissza
            return;
        }

        titleEl.textContent = title;
        //messageEl.textContent = message;
        messageEl.innerHTML = message;
        dialog.classList.remove('hidden');

        window.isCustomAlertOpen = true;
        // A resolve függvényt elmentjük, hogy a handleOK meghívhassa
        window.customAlertResolve = resolve; 
    });
}

/**
 * ✅ ÚJ: Általános megerősítő dialógust jelenít meg.
 * @param {string} message - A dialógusban megjelenő kérdés.
 * @param {Function} onConfirm - A függvény, ami lefut, ha a felhasználó az 'Igen'-t választja.
 */
function showConfirmationDialog(message, onConfirm) {
    const confirmDialog = document.getElementById('confirmDialog');
    const confirmText = document.getElementById('confirmText');
    if (!confirmDialog || !confirmText) return;

    confirmText.textContent = message;
    confirmDialog.classList.remove('hidden');

    document.getElementById('optionYes').classList.add('selected');
    document.getElementById('optionNo').classList.remove('selected');

    // Globális flag-ek beállítása a handleOK számára
    window.isDialogActive = true;
    window.confirmationCallback = onConfirm; // Egyetlen, általános callback
}

/**
 * ✅ ÚJ: Elindítja a gyári visszaállítás folyamatát.
 */
function handleFactoryReset() {
    // 1. Első megerősítő kérdés
    showConfirmationDialog('Delete all data and reset the device?', async () => {
        try {
            // Ellenőrizzük, van-e egyáltalán mentett kulcs. Ha nincs, nincs mit resetelni/nincs PIN.
            const hasKey = await window.apiKeyManager.hasStoredKey();
            if (!hasKey) {
                await showAlert('No stored key found. Nothing to reset.', 'Info');
                return;
            }
            document.getElementById('confirmDialog').classList.add('hidden');
            isDialogActive = false; // Fontos a globális állapot frissítése is!
            // 2. PIN kód bekérése a törlés megerősítéséhez
            const pin = await window.pinScreen.show('Enter PIN to Confirm Reset');

            // Ha a felhasználó üresen hagyja, vagy megszakítja (a catch blokk kezeli)
            if (!pin) {
                await showAlert('PIN not entered. Reset cancelled.', 'Aborted');
                return;
            }

            // 3. A PIN validálása a kulcs dekódolásának megkísérlésével
            const apiKey = await window.apiKeyManager.loadAndDecryptKey(pin);

            if (apiKey) {
                // SIKERES VALIDÁLÁS: A PIN helyes, jöhet a törlés!
                console.log('🔥 PIN CORRECT. EXECUTING FACTORY RESET 🔥');
                
                // Adatbázisok törlése
                console.log('🗑️ Deleting IndexedDB databases...');
                indexedDB.deleteDatabase('NokaiConfigDB');
                indexedDB.deleteDatabase('DoomSavesDB');

                // LocalStorage törlése
                console.log('🗑️ Clearing localStorage...');
                Object.keys(localStorage)
                    .filter(key => key.startsWith('nokia_'))
                    .forEach(key => localStorage.removeItem(key));

                // Visszajelzés a felhasználónak és újraindítás
                await showAlert('Factory Reset Complete.<br>The device will now restart.', 'Success');
                
                setTimeout(() => {
                    location.reload();
                }, 200);

            } else {
                // SIKERTELEN VALIDÁLÁS: A PIN hibás
                await showAlert('Incorrect PIN. Factory reset aborted.', 'Error');
            }
        } catch (error) {
            // Ez a blokk fut le, ha a felhasználó a piros gombbal/C-vel szakítja meg a PIN bevitelt
            console.log('Factory reset cancelled by user during PIN entry.');
            await showAlert('Reset cancelled.', 'Aborted');
        }
    });
}

// ✅ ÚJ: System Info dialog functions
// ✅ TELJES System Info függvény - Szép formázással, MINDEN adattal
// Másold be a nokia_app_handlers_utils.js-be a getSystemInformation() helyére

async function getSystemInformation() {
    function byteSizeOfString(str) {
        if (str == null) return 0;
        try { return new Blob([String(str)]).size; }
        catch { return new TextEncoder().encode(String(str)).length; }
    }

    function bytesFromBase64DataUrl(dataUrl) {
        if (!dataUrl || typeof dataUrl !== "string") return 0;
        const m = dataUrl.match(/^data:[^;]+;base64,(.*)$/);
        if (!m) return 0;
        const b64 = m[1];
        const len = b64.length;
        if (len === 0) return 0;
        const padding = (b64.endsWith("==") ? 2 : (b64.endsWith("=") ? 1 : 0));
        return Math.max(0, (len * 3) / 4 - padding);
    }

    function formatBytes(bytes) {
        if (bytes === undefined || bytes === null || isNaN(bytes)) bytes = 0;
        const abs = Math.abs(bytes);
        if (abs < 1024) return `${bytes} B`;
        if (abs < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`;
        if (abs < 1024 ** 3) return `${(bytes / (1024 ** 2)).toFixed(2)} MB`;
        return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
    }

    // Adatgyűjtés
    const reportItems = [];
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!/^nokia_/i.test(key)) continue;
        const raw = localStorage.getItem(key);
        const valueBytes = byteSizeOfString(raw);
        totalBytes += valueBytes;
        const item = { key, valueBytes, extra: {}, raw };

        if (key === "nokia_dcim") {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    item.extra.dcimImageCount = parsed.length;
                    item.extra.rawImageBytes = parsed.reduce((acc, entry) => acc + bytesFromBase64DataUrl(entry.full), 0);
                    item.extra.retroImageBytes = parsed.reduce((acc, entry) => acc + bytesFromBase64DataUrl(entry.retro), 0);
                }
            } catch (e) {}
        }
        
        if (key === "nokia_messages_threads") {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    item.extra.threadCount = parsed.length; 
                    item.extra.totalMessages = parsed.reduce((sum, thread) => sum + (thread.messages?.length || 0), 0);
                }
            } catch(e) {}
        }

        if (key === "nokia_custom_words_hu" || key === "nokia_custom_words_en") {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) item.extra.wordCount = parsed.length;
            } catch(e) {}
        }

        reportItems.push(item);
    }
    
    const estimate = await (navigator.storage?.estimate?.() || Promise.resolve({ quota: 0, usage: 0 }));
    const quotaBytes = estimate.quota || 0;
    const usedBytes = estimate.usage || 0;
    
    // Adatok lekérése
    const dcim = reportItems.find(it => it.key === 'nokia_dcim');
    const messages = reportItems.find(it => it.key === 'nokia_messages_threads');
    const chat = reportItems.find(it => it.key === 'nokia_chat_conversation');
    const imageStorage = reportItems.find(it => it.key === 'nokia_image_storage');
    const customWordsHU = reportItems.find(it => it.key === 'nokia_custom_words_hu');
    const customWordsEN = reportItems.find(it => it.key === 'nokia_custom_words_en');
    
    const photoCount = dcim?.extra?.dcimImageCount || 0;
    const totalDcimSize = dcim?.valueBytes || 0;
    const rawTotalSize = dcim?.extra?.rawImageBytes || 0;
    const retroTotalSize = dcim?.extra?.retroImageBytes || 0;
    const structureSize = totalDcimSize - rawTotalSize - retroTotalSize;
    const msgCount = messages?.extra?.totalMessages || 0;
    const threadCount = messages?.extra?.threadCount || 0;
    
    const usagePercent = quotaBytes > 0 ? ((usedBytes / quotaBytes) * 100).toFixed(1) : 0;
    const freePercent = quotaBytes > 0 ? ((quotaBytes - usedBytes) / quotaBytes * 100).toFixed(1) : 0;
    
    // ✅ JAVÍTÁS: IndexedDB adatok lekérése
    let indexedDBTotalSize = 0;
    let dcimSize = 0;
    let imagesSize = 0;
    let indexedDBPhotoCount = 0;
    let indexedDBImageCount = 0;
    let galleryCount = 0;
    let messagesImageCount = 0;
    let chatgptImageCount = 0;
    let multipleRefsCount = 0;
    let noRefsCount = 0;
    
    try {
        if (window.imageIndexedDB) {
            const stats = await window.imageIndexedDB.getStorageStats();
            indexedDBTotalSize = stats.totalSize || 0;
            dcimSize = stats.dcimSize || 0;
            imagesSize = stats.imagesSize || 0;
            indexedDBPhotoCount = stats.dcim || 0;
            indexedDBImageCount = stats.images || 0;
            galleryCount = stats.gallery || 0;
            messagesImageCount = stats.messages || 0;
            chatgptImageCount = stats.chatgpt || 0;
            multipleRefsCount = stats.multipleRefs || 0;
            noRefsCount = stats.noRefs || 0;
        }
    } catch (e) {
        console.error('Failed to get IndexedDB stats:', e);
    }
    
    // 📋 HTML generálás
    let html = '';
    
    // 📱 DEVICE
    html += `<strong>📱 Device</strong><br>`;
    html += `Model: Nokai 3110<br>`;
    html += `Firmware: ${version}-Ekre<br>`;
    const screenEl = document.querySelector('.screen');
    if (screenEl) {
        html += `Screen: ${screenEl.clientWidth}x${screenEl.clientHeight}px<br>`;
    }
    html += `Language: ${navigator.language}<br><br>`;

    // 💾 STORAGE
    html += `<strong>💾 Storage</strong><br>`;
    html += `Total Quota: ${formatBytes(quotaBytes)}<br>`;
    html += `Used: ${formatBytes(usedBytes)} (${usagePercent}%)<br>`;
    html += `<br>`;
    html += `<strong>📊 Breakdown</strong><br>`;
    html += `└ App Data: ${formatBytes(totalBytes)}<br>`;
    html += `└ Camera Photos: ${formatBytes(dcimSize)}`;
    if (indexedDBPhotoCount > 0) {
        html += ` (${indexedDBPhotoCount} photo${indexedDBPhotoCount !== 1 ? 's' : ''})`;
    }
    html += `<br>`;
    html += `└ Attached Images: ${formatBytes(imagesSize)}`;
    if (indexedDBImageCount > 0) {
        html += ` (${indexedDBImageCount} image${indexedDBImageCount !== 1 ? 's' : ''})`;
    }
    html += `<br>`;
    html += `└ Other: ${formatBytes(usedBytes - totalBytes - dcimSize - imagesSize)}<br>`;
    html += `<br>`;
    html += `Free: ${formatBytes(quotaBytes - usedBytes)} (${freePercent}%)<br><br>`;
    
    // 🗂️ STORED DATA
    html += `<strong>🗂️ Stored Data</strong><br>`;
    
    // 📷 DCIM - Camera photos
    html += `<strong>📷 DCIM (Camera)</strong><br>`;
    html += `└ Total Photos: ${indexedDBPhotoCount} photo${indexedDBPhotoCount !== 1 ? 's' : ''}<br>`;
    html += `└ Storage Used: ${formatBytes(dcimSize)}<br>`;
    html += `<br>`;
    
    // 🖼️ Gallery - Images shown in gallery
    html += `<strong>🖼️ Gallery (Visible)</strong><br>`;
    const totalGalleryImages = indexedDBPhotoCount + galleryCount;
    html += `└ Total Images: ${totalGalleryImages} image${totalGalleryImages !== 1 ? 's' : ''}<br>`;
    if (indexedDBPhotoCount > 0) {
        html += `  └ Camera Photos: ${indexedDBPhotoCount}<br>`;
    }
    if (galleryCount > 0) {
        html += `  └ Other Images: ${galleryCount}<br>`;
    }
    html += `<br>`;
    
    // 💬 Messages
    html += `<strong>💬 Messages</strong><br>`;
    html += `└ Total Messages: ${msgCount} msg${msgCount !== 1 ? 's' : ''}<br>`;
    html += `└ Threads: ${threadCount} thread${threadCount !== 1 ? 's' : ''}<br>`;
    html += `└ Images Attached: ${messagesImageCount} image${messagesImageCount !== 1 ? 's' : ''}<br>`;
    if (messages?.valueBytes) html += `└ Storage Used: ${formatBytes(messages.valueBytes)}<br>`;
    html += `<br>`;
    
    // 🤖 ChatGPT
    html += `<strong>🤖 ChatGPT</strong><br>`;
    html += `└ Conversation Data: ${formatBytes(chat?.valueBytes || 0)}<br>`;
    html += `└ Images Attached: ${chatgptImageCount} image${chatgptImageCount !== 1 ? 's' : ''}<br>`;
    html += `<br>`;
    
    // 🗄️ Unified Image Storage (Messages & ChatGPT)
    html += `<strong>🗄️ Unified Image Storage</strong><br>`;
    html += `└ Total: ${indexedDBImageCount} image${indexedDBImageCount !== 1 ? 's' : ''}<br>`;
    html += `└ Size: ${formatBytes(imagesSize)}<br>`;
    if (messagesImageCount > 0) {
        html += `└ Used in Messages: ${messagesImageCount}<br>`;
    }
    if (chatgptImageCount > 0) {
        html += `└ Used in ChatGPT: ${chatgptImageCount}<br>`;
    }
    if (multipleRefsCount > 0) {
        html += `└ Shared: ${multipleRefsCount}<br>`;
    }
    if (noRefsCount > 0) {
        html += `└ Orphaned: ${noRefsCount}<br>`;
    }
    html += `<br>`;
    
    // 📖 T9 Dictionary
    const huWords = customWordsHU?.extra?.wordCount || 0;
    const enWords = customWordsEN?.extra?.wordCount || 0;
    html += `<strong>📖 Custom T9 Dictionary</strong><br>`;
    html += `└ HU: ${huWords} word${huWords !== 1 ? 's' : ''} (${formatBytes(customWordsHU?.valueBytes || 0)})<br>`;
    html += `└ EN: ${enWords} word${enWords !== 1 ? 's' : ''} (${formatBytes(customWordsEN?.valueBytes || 0)})<br>`;
    html += '<br>';

    // 💲 SERVICE COSTS
    if (window.costCalculator) {
        try {
            const costData = window.costCalculator.usageData;
            const total = costData.total.total;
            
            html += `<strong>💲 Service Costs</strong><br>`;
            
            if (total > 0) {
                html += `All Time Total: $${total.toFixed(4)}<br>`;
                
                // All Time Breakdown
                const textModels = Object.keys(costData.total.text || {});
                const visionModels = Object.keys(costData.total.vision || {});
                const voiceModels = Object.keys(costData.total.voice || {});
                
                if (textModels.length > 0) {
                    html += `└ Text Models:<br>`;
                    textModels.forEach(model => {
                        html += `  └ ${model}: $${costData.total.text[model].toFixed(4)}<br>`;
                    });
                }
                
                if (visionModels.length > 0) {
                    html += `└ Vision Models:<br>`;
                    visionModels.forEach(model => {
                        html += `  └ ${model}: $${costData.total.vision[model].toFixed(4)}<br>`;
                    });
                }
                
                if (voiceModels.length > 0) {
                    html += `└ Voice Models:<br>`;
                    voiceModels.forEach(model => {
                        html += `  └ ${model}: $${costData.total.voice[model].toFixed(4)}<br>`;
                    });
                }
                
                // This Month
                const currentMonth = new Date().toISOString().substring(0, 7);
                const monthlyData = costData.monthly[currentMonth];
                if (monthlyData && monthlyData.total > 0) {
                    html += `<br>`;
                    html += `This Month Total: $${monthlyData.total.toFixed(4)}<br>`;
                    
                    const monthTextModels = Object.keys(monthlyData.text || {});
                    const monthVisionModels = Object.keys(monthlyData.vision || {});
                    const monthVoiceModels = Object.keys(monthlyData.voice || {});
                    
                    if (monthTextModels.length > 0) {
                        html += `└ Text Models:<br>`;
                        monthTextModels.forEach(model => {
                            html += `  └ ${model}: $${monthlyData.text[model].toFixed(4)}<br>`;
                        });
                    }
                    
                    if (monthVisionModels.length > 0) {
                        html += `└ Vision Models:<br>`;
                        monthVisionModels.forEach(model => {
                            html += `  └ ${model}: $${monthlyData.vision[model].toFixed(4)}<br>`;
                        });
                    }
                    
                    if (monthVoiceModels.length > 0) {
                        html += `└ Voice Models:<br>`;
                        monthVoiceModels.forEach(model => {
                            html += `  └ ${model}: $${monthlyData.voice[model].toFixed(4)}<br>`;
                        });
                    }
                }
            } else {
                html += `No usage recorded yet.<br>`;
            }
        } catch (e) {
            console.error("Cost info error:", e);
            html += `Error loading cost data.<br>`;
        }
    }

    return html;
}


async function showSystemInfoDialog() {
    const dialog = document.getElementById('systemInfoDialog');
    const content = document.getElementById('systemInfoContent');
    if (dialog && content) {
        dialog.classList.remove('hidden');
        content.innerHTML = 'Loading...';
        //playDTMF('5');
        
        const infoHtml = await getSystemInformation();
        content.innerHTML = infoHtml;
        content.scrollTop = 0;
    }
}

function closeSystemInfoDialog() {
    const dialog = document.getElementById('systemInfoDialog');
    if (dialog) {
        dialog.classList.add('hidden');
        //playDTMF('1');
    }
}

function isSystemInfoDialogOpen() {
    const dialog = document.getElementById('systemInfoDialog');
    return dialog && !dialog.classList.contains('hidden');
}

function scrollSystemInfoDialog(amount) {
    const content = document.getElementById('systemInfoContent');
    if (content) {
        const currentScroll = content.scrollTop;
        const maxScroll = content.scrollHeight - content.clientHeight;
        let newScroll = currentScroll + amount;
        
        if (newScroll < 0) newScroll = maxScroll;
        else if (newScroll > maxScroll) newScroll = 0;
        
        content.scrollTop = newScroll;
        //playDTMF(amount > 0 ? '8' : '2');
    }
}


async function addMessage(text, className = '', attachmentId = null) {
    const screenContent = document.getElementById('screenContent');
    const inputLine = screenContent.querySelector('.input-line');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + className;
    
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const htmlText = text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #1a3a1a; text-decoration: underline;">${url}</a>`;
    });
    
    messageDiv.innerHTML = htmlText;
    
    // ✅ JAVÍTOTT: Async image loading
    if (attachmentId && window.imageAttachments) {
        try {
            const imageData = await window.imageAttachments.getChatImage(attachmentId);
            if (imageData && imageData.retro) {
                const imgEl = document.createElement('img');
                imgEl.src = imageData.retro;
                imgEl.style.maxWidth = '100%';
                imgEl.style.height = '96px';
                imgEl.style.borderRadius = '4px';
                imgEl.style.marginTop = '4px';
                imgEl.style.filter = 'grayscale(100%)';
                imgEl.style.display = 'block';
                messageDiv.appendChild(imgEl);
                console.log('✅ ChatGPT image loaded and displayed:', attachmentId);
            } else {
                console.warn('⚠️ Image data not found or invalid:', attachmentId);
            }
        } catch (error) {
            console.error('❌ Failed to load ChatGPT image:', error);
        }
    }
    
    screenContent.insertBefore(messageDiv, inputLine);
    screenContent.scrollTop = screenContent.scrollHeight;
    return messageDiv;
}