/**
 * Nokia App Handlers - Keyboard Module
 * Handles number keys, special keys, and text input
 */


window.isDialogActive = false; // ✅ Make it global so Gallery can access it
let wordToDelete = null;


// Key handling functions
window.handleKey = function(key) {
    // Always play DTMF sound FIRST
    //playDTMF(key);    
    // ✅ JAVÍTOTT: Először a speciális képernyőket kezeljük
    if (window.pinScreen && window.pinScreen.isActive) {
        //playDTMF(key);
        window.pinScreen.handleKeyPress(key);
        return;
    }
    if (window.setupScreen && window.setupScreen.isActive) {
        //playDTMF(key);
        if (window.setupScreen.isEditing) {
            window.setupScreen.handleKeyPress(key);
        }
        return;
    }

    // ✅ MÓDOSÍTVA: Új dialógusok bezárása
    if (isSystemInfoDialogOpen()) {
        closeSystemInfoDialog();
        return;
    }    
    // About dialog has priority - close on any number key press
    if (isAboutDialogOpen()) {
        closeAboutDialog();
        return;
    }
    
    // DOOM has highest priority
    if (window.doomEasterEgg && window.doomEasterEgg.isActive()) {
        // ... DOOM kezelés
        return;
    }



    // Profile dialog has priority - ignore keys
    if (window.profileManager && window.profileManager.isDialogOpen) {
        return;
    }
    
    // App Manager dialogs have priority - ignore keys
    if (window.appManager && window.appManager.hasOpenDialog()) {
        return;
    }
    
    // Home screen is active - ignore text input keys
    if (window.appManager && window.appManager.isOnHomeScreen()) {
        return;
    }
    
    // Legacy menu has priority
    if (menuOpen) return;
    
    // ✅ Messages app: használjuk a T9 rendszert, de írjuk a textarea-ba
    if (window.nokiaMessages && window.nokiaMessages.isActive && window.nokiaMessages.viewMode === 'conversation') {
        const textarea = document.getElementById('messagesInputArea');
        if (!textarea) return;
        
        // ✅ Használjuk a globális T9 változókat, de a textarea-val dolgozunk
        const currentTime = Date.now();
        const chars = T9_MAP[key];
        if (!chars) return;

        // Space (0)
        if (key === '0') {
            const timeSinceLastKey = currentTime - lastKeyTime;

            // ✅ ÚJ: Szó mentése szóköz leütésekor
            const textBeforeCursor = textarea.value.slice(0, textarea.selectionStart);
            const lastSpaceIndex = Math.max(textBeforeCursor.lastIndexOf(' '), textBeforeCursor.lastIndexOf('\n'));
            let lastWord = textBeforeCursor.substring(lastSpaceIndex + 1);
            const cleanedWord = lastWord.replace(/[^\p{L}]/gu, ''); // Unicode betűk megtartása
            if (cleanedWord && !dictionary[currentLang].includes(cleanedWord.toLowerCase())) {
                saveCustomWord(cleanedWord);
            }
            // ✅ VÉGE: Szó mentése

            if (t9Mode && t9Sequence.length > 0) {
                // ✅ Elfogadjuk a szót - el kell távolítani a számlálót!
                const cursorPos = textarea.selectionStart;
                const textValue = textarea.value;
                const oldSuffix = t9Suggestions.length > 1 ? ` [${t9SelectedIndex + 1}/${t9Suggestions.length}]` : '';
                
                // Távolítsuk el a számlálót
                if (oldSuffix && textValue.substring(cursorPos).startsWith(oldSuffix)) {
                    textarea.value = textValue.substring(0, cursorPos) + textValue.substring(cursorPos + oldSuffix.length);
                }
                
                acceptT9Word();
                
                // Most adjuk hozzá a space-t
                const newCursorPos = textarea.selectionStart;
                textarea.value = textarea.value.substring(0, newCursorPos) + ' ' + textarea.value.substring(newCursorPos);
                textarea.selectionStart = textarea.selectionEnd = newCursorPos + 1;
            } else {
                // Multi-tap: space or 0
                if (lastKey === key && timeSinceLastKey < 1000) {
                    keyPressCount = (keyPressCount + 1) % chars.length;
                    textarea.value = textarea.value.slice(0, -1) + chars[keyPressCount];
                } else {
                    keyPressCount = 0;
                    textarea.value += chars[0];
                }
            }
            lastKey = key;
            lastKeyTime = currentTime;
            if (window.nokiaMessages) window.nokiaMessages.updateTextareaHeight(textarea);
            updateMessagesCursor(); // ✅ Frissítsük a kurzort
            return;
        }

        // Punctuation (1)
        if (key === '1') {
            // ✅ ÚJ: Szó mentése írásjel leütésekor
            const textBeforeCursor = textarea.value.slice(0, textarea.selectionStart);
            const lastSpaceIndex = Math.max(textBeforeCursor.lastIndexOf(' '), textBeforeCursor.lastIndexOf('\n'));
            let lastWord = textBeforeCursor.substring(lastSpaceIndex + 1);
            const cleanedWord = lastWord.replace(/[^\p{L}]/gu, '');
            if (cleanedWord && !dictionary[currentLang].includes(cleanedWord.toLowerCase())) {
                saveCustomWord(cleanedWord);
            }
            // ✅ VÉGE: Szó mentése

            if (t9Mode && t9Sequence.length > 0) {
                // ✅ Elfogadjuk a szót - távolítsuk el a számlálót
                const cursorPos = textarea.selectionStart;
                const textValue = textarea.value;
                const oldSuffix = t9Suggestions.length > 1 ? ` [${t9SelectedIndex + 1}/${t9Suggestions.length}]` : '';
                
                if (oldSuffix && textValue.substring(cursorPos).startsWith(oldSuffix)) {
                    textarea.value = textValue.substring(0, cursorPos) + textValue.substring(cursorPos + oldSuffix.length);
                }
                
                acceptT9Word();
            }
            
            if (lastKey === key && (currentTime - lastKeyTime) < 1000) {
                keyPressCount = (keyPressCount + 1) % chars.length;
                textarea.value = textarea.value.slice(0, -1) + chars[keyPressCount];
            } else {
                keyPressCount = 0;
                textarea.value += chars[0];
            }
            lastKey = key;
            lastKeyTime = currentTime;
            if (window.nokiaMessages) window.nokiaMessages.updateTextareaHeight(textarea);
            updateMessagesCursor();
            return;
        }

        // T9 MODE
        if (t9Mode && key >= '2' && key <= '9') {
            const timeSinceLastKey = currentTime - lastKeyTime;
            let textValue = textarea.value; // ✅ let, nem const!
            const cursorPos = textarea.selectionStart;

            // If previous key was '*', accept word
            if (lastKey === '*' && t9Sequence.length > 0) {
                // ✅ Távolítsuk el a számlálót mielőtt elfogadjuk
                const oldSuffix = t9Suggestions.length > 1 ? ` [${t9SelectedIndex + 1}/${t9Suggestions.length}]` : '';
                if (oldSuffix && textValue.substring(cursorPos).startsWith(oldSuffix)) {
                    textarea.value = textValue.substring(0, cursorPos) + textValue.substring(cursorPos + oldSuffix.length);
                    textValue = textarea.value; // ✅ Frissítsük
                }
                
                acceptT9Word();
                
                keyPressCount = 0;
                let char = chars[0];
                if (shiftMode) {
                    char = char.toUpperCase();
                    shiftMode = false;
                    updateShiftIndicator();
                }
                
                textarea.value = textValue.substring(0, cursorPos) + char + textValue.substring(cursorPos);
                textarea.selectionStart = textarea.selectionEnd = cursorPos + 1;
                lastKey = key;
                lastKeyTime = currentTime;
                if (window.nokiaMessages) window.nokiaMessages.updateTextareaHeight(textarea);
                updateMessagesCursor();
                return;
            }

            const isAtWordBoundary = cursorPos === 0 || [' ', '\n'].includes(textValue[cursorPos - 1]);

            if (t9Sequence.length > 0 || isAtWordBoundary) {
                if (t9Sequence.length > 0 && timeSinceLastKey > 2000) {
                    acceptT9Word();
                }
                
                // ✅ Számoljuk ki a jelenlegi szó kezdőpozícióját
                let t9WordStartPos;
                let oldSuffixLength = 0;
                
                if (t9Sequence.length === 0) {
                    // Új szó kezdése
                    t9WordStartPos = cursorPos;
                } else {
                    // Folytatódik a szó
                    const oldWord = t9Suggestions.length > 0 ? t9Suggestions[t9SelectedIndex] : t9Sequence;
                    const oldSuffix = t9Suggestions.length > 1 ? ` [${t9SelectedIndex + 1}/${t9Suggestions.length}]` : '';
                    oldSuffixLength = oldSuffix.length;
                    t9WordStartPos = cursorPos - oldWord.length;
                }
                
                t9Sequence += key;
                let suggestions = getT9Suggestions(t9Sequence);
                t9SelectedIndex = 0;

                const multitapWord = t9SequenceToMultitapWord(t9Sequence);
                const finalSuggestions = [...new Set([...suggestions, multitapWord])];
                t9Suggestions = finalSuggestions;
                
                const beforeWord = textValue.substring(0, t9WordStartPos);
                // ✅ A régi számlálót is távolítsuk el!
                const afterWord = textValue.substring(cursorPos + oldSuffixLength);
                
                if (t9Suggestions.length > 0) {
                    let word = t9Suggestions[0];
                    if (shiftMode && word.length > 0) {
                        word = word.charAt(0).toUpperCase() + word.slice(1);
                    }
                    
                    // ✅ Suggestion számláló közvetlenül a szöveg után
                    const displayWord = t9Suggestions.length > 1 
                        ? `${word} [${t9SelectedIndex + 1}/${t9Suggestions.length}]`
                        : word;
                    
                    textarea.value = beforeWord + displayWord + afterWord;
                    // ✅ AZONNALI MÉRETFRISSÍTÉS
                    if (window.nokiaMessages) window.nokiaMessages.updateTextareaHeight(textarea);
                    // ✅ Kurzor a valódi szó végére, NEM a számláló után
                    textarea.selectionStart = textarea.selectionEnd = beforeWord.length + word.length;
                } else {
                    textarea.value = beforeWord + t9Sequence + afterWord;
                    if (window.nokiaMessages) window.nokiaMessages.updateTextareaHeight(textarea);
                    textarea.selectionStart = textarea.selectionEnd = beforeWord.length + t9Sequence.length;
                }
                
                lastKey = key;
                lastKeyTime = currentTime;
                updateMessagesCursor();
                return;
            } else {
                // Fallback to Multi-tap
                if (lastKey === key && timeSinceLastKey < 1000) {
                    keyPressCount = (keyPressCount + 1) % chars.length;
                    let char = chars[keyPressCount];
                    const prevChar = textValue[cursorPos - 1];
                    const wasUpperCase = prevChar && prevChar === prevChar.toUpperCase() && prevChar !== prevChar.toLowerCase();
                    if (wasUpperCase) char = char.toUpperCase();
                    textarea.value = textValue.substring(0, cursorPos - 1) + char + textValue.substring(cursorPos);
                    textarea.selectionStart = textarea.selectionEnd = cursorPos;
                } else {
                    keyPressCount = 0;
                    let char = chars[0];
                    if (shiftMode) {
                        char = char.toUpperCase();
                        shiftMode = false;
                        updateShiftIndicator();
                    }
                    textarea.value = textValue.substring(0, cursorPos) + char + textValue.substring(cursorPos);
                    textarea.selectionStart = textarea.selectionEnd = cursorPos + 1;
                }
                lastKey = key;
                lastKeyTime = currentTime;
                if (window.nokiaMessages) window.nokiaMessages.updateTextareaHeight(textarea);
                updateMessagesCursor();
                return;
            }
        }

        // MULTI-TAP MODE
        if (!t9Mode && key >= '2' && key <= '9') {
            const textValue = textarea.value;
            const cursorPos = textarea.selectionStart;
            
            if (lastKey === key && (currentTime - lastKeyTime) < 1000) {
                keyPressCount = (keyPressCount + 1) % chars.length;
                let char = chars[keyPressCount];
                const prevChar = textValue[cursorPos - 1];
                const wasUpperCase = prevChar && prevChar === prevChar.toUpperCase() && prevChar !== prevChar.toLowerCase();
                if (wasUpperCase) char = char.toUpperCase();
                textarea.value = textValue.substring(0, cursorPos - 1) + char + textValue.substring(cursorPos);
                textarea.selectionStart = textarea.selectionEnd = cursorPos;
            } else {
                keyPressCount = 0;
                let char = chars[0];
                if (shiftMode) {
                    char = char.toUpperCase();
                    shiftMode = false;
                    updateShiftIndicator();
                }
                textarea.value = textValue.substring(0, cursorPos) + char + textValue.substring(cursorPos);
                textarea.selectionStart = textarea.selectionEnd = cursorPos + 1;
            }
            
            lastKey = key;
            lastKeyTime = currentTime;
            if (window.nokiaMessages) window.nokiaMessages.updateTextareaHeight(textarea);
            updateMessagesCursor();
            return;
        }
        
        return;
    }
    
    // ONLY ChatGPT app-ban írunk a globális változókba
    if (!window.appManager || !window.appManager.isInChatGPT()) {
        return;
    }    
    


    const currentTime = Date.now();
    const chars = T9_MAP[key];
    if (!chars) return;

    // Space (0) - multi-tap for space/0
    if (key === '0') {
        const timeSinceLastKey = currentTime - lastKeyTime;
        
        if (t9Mode && t9Sequence.length > 0) {
            acceptT9Word();
            currentInput = currentInput.slice(0, cursorPosition) + ' ' + currentInput.slice(cursorPosition);
            cursorPosition++;
        } else {
            // Word saving logic
            const textBeforeCursor = currentInput.slice(0, cursorPosition);
            const lastSpaceIndex = Math.max(textBeforeCursor.lastIndexOf(' '), textBeforeCursor.lastIndexOf('\n'));
            let lastWord = textBeforeCursor.substring(lastSpaceIndex + 1);

            // Clean word before saving
            const cleanedWord = lastWord.replace(/[^\p{L}]/gu, '');

            if (cleanedWord && !dictionary[currentLang].includes(cleanedWord.toLowerCase())) {
                saveCustomWord(cleanedWord);
            }

            // Multi-tap: space or 0
            if (lastKey === key && timeSinceLastKey < 1000) {
                keyPressCount = (keyPressCount + 1) % chars.length;
                currentInput = currentInput.slice(0, cursorPosition - 1) + chars[keyPressCount] + currentInput.slice(cursorPosition);
            } else {
                keyPressCount = 0;
                currentInput = currentInput.slice(0, cursorPosition) + chars[0] + currentInput.slice(cursorPosition);
                cursorPosition++;
            }
        }

        lastKey = key;
        lastKeyTime = currentTime;
        updateDisplay();
        saveToStorage();
        return;
    }

    // Punctuation (1)
    if (key === '1') {
        if (t9Mode && t9Sequence.length > 0) {
            t9Sequence = '';
            t9Suggestions = [];
            t9SelectedIndex = 0;
            shiftMode = false;
        }
        
        if (lastKey === key && (currentTime - lastKeyTime) < 1000) {
            keyPressCount = (keyPressCount + 1) % chars.length;
            currentInput = currentInput.slice(0, cursorPosition - 1) + chars[keyPressCount] + currentInput.slice(cursorPosition);
        } else {
            keyPressCount = 0;
            currentInput = currentInput.slice(0, cursorPosition) + chars[0] + currentInput.slice(cursorPosition);
            cursorPosition++;
        }
        lastKey = key;
        lastKeyTime = currentTime;
        updateDisplay();
        saveToStorage();
        return;
    }

    // T9 MODE
    if (t9Mode && key >= '2' && key <= '9') {
        const timeSinceLastKey = currentTime - lastKeyTime;

        // If previous key was '*' (suggestion cycling), accept word
        if (lastKey === '*' && t9Sequence.length > 0) {
            acceptT9Word();
            
            keyPressCount = 0;
            let char = chars[0];
            
            if (shiftMode) {
                char = char.toUpperCase();
                shiftMode = false;
                updateShiftIndicator();
            }
            
            currentInput = currentInput.slice(0, cursorPosition) + char + currentInput.slice(cursorPosition);
            cursorPosition++;
            
            lastKey = key;
            lastKeyTime = currentTime;
            updateDisplay();
            saveToStorage();
            return; 
        }

        const isAtWordBoundary = cursorPosition === 0 || [' ', '\n'].includes(currentInput[cursorPosition - 1]);

        if (t9Sequence.length > 0 || isAtWordBoundary) {
            if (t9Sequence.length > 0 && timeSinceLastKey > 2000) {
                acceptT9Word();
            }
            
            const t9WordStartPos = t9Sequence.length === 0 ? cursorPosition : cursorPosition - (t9Suggestions.length > 0 ? t9Suggestions[t9SelectedIndex].length : t9Sequence.length);
            
            t9Sequence += key;

            // Get dictionary suggestions
            let suggestions = getT9Suggestions(t9Sequence);
            t9SelectedIndex = 0;

            // Generate fallback and multi-tap words
            const fallbackWord = t9SequenceToFallbackWord(t9Sequence);
            const multitapWord = t9SequenceToMultitapWord(t9Sequence);

            // Compile suggestions without duplicates
            const finalSuggestions = [...new Set([
                ...suggestions, 
                multitapWord           
            ])];

            t9Suggestions = finalSuggestions;
            
            const beforeWord = currentInput.slice(0, t9WordStartPos);
            const afterWord = currentInput.slice(cursorPosition);
            
            if (t9Suggestions.length > 0) {
                let word = t9Suggestions[0];
                if (shiftMode && word.length > 0) {
                    word = word.charAt(0).toUpperCase() + word.slice(1);
                }
                currentInput = beforeWord + word + afterWord;
                cursorPosition = beforeWord.length + word.length;

            } else {
                currentInput = beforeWord + t9Sequence + afterWord;
                cursorPosition = beforeWord.length + t9Sequence.length;
            }
            
            lastKey = key;
            lastKeyTime = currentTime;
            updateDisplay();
            saveToStorage();
            return;
        } else {
            // "FREESTYLE" MODE (Fallback to Multi-tap)
            console.log('T9 Fallback to Multi-tap');
            if (lastKey === key && timeSinceLastKey < 1000) {
                keyPressCount = (keyPressCount + 1) % chars.length;
                let char = chars[keyPressCount];
                const prevChar = currentInput[cursorPosition - 1];
                const wasUpperCase = prevChar && prevChar === prevChar.toUpperCase() && prevChar !== prevChar.toLowerCase();
                if (wasUpperCase) {
                    char = char.toUpperCase();
                }
                currentInput = currentInput.slice(0, cursorPosition - 1) + char + currentInput.slice(cursorPosition);
            } else {
                keyPressCount = 0;
                let char = chars[0];
                if (shiftMode) {
                    char = char.toUpperCase();
                    shiftMode = false;
                }
                currentInput = currentInput.slice(0, cursorPosition) + char + currentInput.slice(cursorPosition);
                cursorPosition++;
            }
            lastKey = key;
            lastKeyTime = currentTime;
            updateDisplay();
            saveToStorage();
            return;
        }
    } 

    // MULTI-TAP MODE
    if (!t9Mode && key >= '2' && key <= '9') {
        if (lastKey === key && (currentTime - lastKeyTime) < 1000) {
            keyPressCount = (keyPressCount + 1) % chars.length;
            let char = chars[keyPressCount];
            
            const prevChar = currentInput[cursorPosition - 1];
            const wasUpperCase = prevChar && prevChar === prevChar.toUpperCase() && prevChar !== prevChar.toLowerCase();

            if (wasUpperCase) {
                char = char.toUpperCase();
            }
            
            currentInput = currentInput.slice(0, cursorPosition - 1) + char + currentInput.slice(cursorPosition);
        } else {
            keyPressCount = 0;
            let char = chars[0];
            
            if (shiftMode) {
                char = char.toUpperCase();
                shiftMode = false;
                updateShiftIndicator();
            }
            
            currentInput = currentInput.slice(0, cursorPosition) + char + currentInput.slice(cursorPosition);
            cursorPosition++;
        }
        
        lastKey = key;
        lastKeyTime = currentTime;
        updateDisplay();
        saveToStorage();
    }

    lastKey = key;
    lastKeyTime = currentTime;
    updateDisplay();
    saveToStorage();
}

// * cycles through T9 suggestions OR types * character
window.handleShift = function() {
    //playDTMF('*')
    // About dialog has priority - close on * press
    if (isAboutDialogOpen()) {
        closeAboutDialog();
        return;
    }
    
    // Profile dialog has priority - ignore
    if (window.profileManager && window.profileManager.isDialogOpen) {
        return;
    }
    
    // ✅ Gallery app - ignore * button
    if (window.nokiaGallery && window.nokiaGallery.isActive) {
        // Gallery doesn't use * button, just play sound
        //playDTMF('*');
        return;
    }
    
    // ✅ Camera app - ignore * button
    if (window.nokiaCamera && window.nokiaCamera.isActive) {
        // Camera doesn't use * button, just play sound
        //playDTMF('*');
        return;
    }
    
    // App Manager dialogs have priority - ignore
    if (window.appManager && window.appManager.hasOpenDialog()) {
        return;
    }
    
    // Home screen is active - ignore
    if (window.appManager && window.appManager.isOnHomeScreen()) {
        return;
    }
    
    // Legacy menu has priority
    if (menuOpen) return;
    
    // ✅ Messages: T9 suggestion cycling vagy * karakter
    if (window.nokiaMessages && window.nokiaMessages.isActive && window.nokiaMessages.viewMode === 'conversation') {
        const textarea = document.getElementById('messagesInputArea');
        if (!textarea) return;
        
        const currentTime = Date.now();
        const timeSinceLastKey = currentTime - lastKeyTime;
        
        // If in T9 mode with suggestions, cycle through them
        if (t9Mode && t9Sequence.length > 0 && t9Suggestions.length > 1) {
            const textValue = textarea.value;
            const cursorPos = textarea.selectionStart;
            const currentWord = t9Suggestions[t9SelectedIndex];
            
            // ✅ Találjuk meg a szó ÉS a számláló kezdetét
            const currentSuffix = ` [${t9SelectedIndex + 1}/${t9Suggestions.length}]`;
            const wordStart = cursorPos - currentWord.length;
            
            // ✅ A számláló a kurzor UTÁN van!
            const afterCursor = textValue.substring(cursorPos);
            let afterWord = afterCursor;
            
            // Ha a számláló ott van, távolítsuk el
            if (afterCursor.startsWith(currentSuffix)) {
                afterWord = afterCursor.substring(currentSuffix.length);
            }
            
            t9SelectedIndex = (t9SelectedIndex + 1) % t9Suggestions.length;
            const newWord = t9Suggestions[t9SelectedIndex];
            
            const beforeWord = textValue.substring(0, wordStart);
            
            let word = newWord;
            if (shiftMode && word.length > 0) {
                word = word.charAt(0).toUpperCase() + word.slice(1);
            }
            
            // ✅ Új számláló
            const newSuffix = ` [${t9SelectedIndex + 1}/${t9Suggestions.length}]`;
            const displayWord = `${word}${newSuffix}`;
            
            textarea.value = beforeWord + displayWord + afterWord;
            // ✅ AZONNALI MÉRETFRISSÍTÉS
            if (window.nokiaMessages) window.nokiaMessages.updateTextareaHeight(textarea);
            // ✅ Kurzor a valódi szó végére
            textarea.selectionStart = textarea.selectionEnd = beforeWord.length + word.length;
            
            lastKey = '*';
            lastKeyTime = currentTime;
            updateMessagesCursor();
        }
        // If pressed quickly twice, insert * character
        else if (lastKey === '*' && timeSinceLastKey < 1000) {
            const cursorPos = textarea.selectionStart;
            const textValue = textarea.value;
            textarea.value = textValue.substring(0, cursorPos) + '*' + textValue.substring(cursorPos);
            textarea.selectionStart = textarea.selectionEnd = cursorPos + 1;
            lastKey = '*';
            lastKeyTime = currentTime;
            if (window.nokiaMessages) window.nokiaMessages.updateTextareaHeight(textarea);
            updateMessagesCursor();
        }
        // Otherwise toggle shift mode
        else {
            shiftMode = !shiftMode;
            lastKey = '*';
            lastKeyTime = currentTime;
            updateShiftIndicator();
        }
        return;
    }
    
    // ONLY ChatGPT app
    if (!window.appManager || !window.appManager.isInChatGPT()) {
        return;
    }
    
    const currentTime = Date.now();
    const timeSinceLastKey = currentTime - lastKeyTime;
    
    // If in T9 mode with suggestions, cycle through them
    if (t9Mode && t9Sequence.length > 0 && t9Suggestions.length > 1) {
        const currentWord = t9Suggestions[t9SelectedIndex];
        const wordStart = cursorPosition - currentWord.length;
        
        t9SelectedIndex = (t9SelectedIndex + 1) % t9Suggestions.length;
        const newWord = t9Suggestions[t9SelectedIndex];
        
        const beforeWord = currentInput.slice(0, wordStart);
        const afterWord = currentInput.slice(cursorPosition);
        
        let word = newWord;
        if (shiftMode && word.length > 0) {
            word = word.charAt(0).toUpperCase() + word.slice(1);
        }
        
        currentInput = beforeWord + word + afterWord;
        cursorPosition = beforeWord.length + word.length;
        
        console.log(`Switched to suggestion ${t9SelectedIndex + 1}/${t9Suggestions.length}: ${word}`);
        
        lastKey = '*';
        lastKeyTime = currentTime;
        updateDisplay();
        saveToStorage();
    }
    // If pressed quickly twice, insert * character
    else if (lastKey === '*' && timeSinceLastKey < 1000) {
        currentInput = currentInput.slice(0, cursorPosition) + '*' + currentInput.slice(cursorPosition);
        cursorPosition++;
        lastKey = '*';
        lastKeyTime = currentTime;
        updateDisplay();
        saveToStorage();
    }
    // Otherwise toggle shift mode
    else {
        shiftMode = !shiftMode;
        lastKey = '*';
        lastKeyTime = currentTime;
        updateDisplay();
        updateShiftIndicator();
    }
}

// # key: newline or # character (multi-tap)
window.handleHash = function() {
    //playDTMF('#');
    // ✅ MÓDOSÍTVA: Új dialógusok bezárása
    if (isSystemInfoDialogOpen()) {
        closeSystemInfoDialog();
        return;
    }    
    // About dialog has priority - close on # press
    if (isAboutDialogOpen()) {
        closeAboutDialog();
        return;
    }
    
    // Profile dialog has priority - ignore
    if (window.profileManager && window.profileManager.isDialogOpen) {
        return;
    }
    
    // App Manager dialogs have priority - ignore
    if (window.appManager && window.appManager.hasOpenDialog()) {
        return;
    }
    
    // Home screen is active - ignore
    if (window.appManager && window.appManager.isOnHomeScreen()) {
        return;
    }
    
    // Legacy menu has priority
    if (menuOpen) return;
    
    // ✅ Messages: newline vagy # karakter
    if (window.nokiaMessages && window.nokiaMessages.isActive && window.nokiaMessages.viewMode === 'conversation') {
        const textarea = document.getElementById('messagesInputArea');
        if (!textarea) return;

        // ✅ ÚJ: Szó mentése sortöréskor
        const textBeforeCursor = textarea.value.slice(0, textarea.selectionStart);
        const lastSpaceIndex = Math.max(textBeforeCursor.lastIndexOf(' '), textBeforeCursor.lastIndexOf('\n'));
        let lastWord = textBeforeCursor.substring(lastSpaceIndex + 1);
        const cleanedWord = lastWord.replace(/[^\p{L}]/gu, '');
        if (cleanedWord && !dictionary[currentLang].includes(cleanedWord.toLowerCase())) {
            saveCustomWord(cleanedWord);
        }
        // ✅ VÉGE: Szó mentése
        
        const currentTime = Date.now();
        const timeSinceLastKey = currentTime - lastKeyTime;
        
        if (t9Mode && t9Sequence.length > 0) {
            // ✅ Elfogadjuk a szót - távolítsuk el a számlálót
            const cursorPos = textarea.selectionStart;
            const textValue = textarea.value;
            const oldSuffix = t9Suggestions.length > 1 ? ` [${t9SelectedIndex + 1}/${t9Suggestions.length}]` : '';
            
            if (oldSuffix && textValue.substring(cursorPos).startsWith(oldSuffix)) {
                textarea.value = textValue.substring(0, cursorPos) + textValue.substring(cursorPos + oldSuffix.length);
            }
            
            acceptT9Word();
        }
        
        const cursorPos = textarea.selectionStart;
        const textValue = textarea.value;
        
        // If pressed quickly twice, insert # character
        if (lastKey === '#' && timeSinceLastKey < 1000) {
            // Replace last newline with #
            if (textValue[cursorPos - 1] === '\n') {
                textarea.value = textValue.substring(0, cursorPos - 1) + '#' + textValue.substring(cursorPos);
                textarea.selectionStart = textarea.selectionEnd = cursorPos;
            } else {
                textarea.value = textValue.substring(0, cursorPos) + '#' + textValue.substring(cursorPos);
                textarea.selectionStart = textarea.selectionEnd = cursorPos + 1;
            }
        } else {
            // First press: insert newline
            textarea.value = textValue.substring(0, cursorPos) + '\n' + textValue.substring(cursorPos);
            textarea.selectionStart = textarea.selectionEnd = cursorPos + 1;
        }
        
        lastKey = '#';
        lastKeyTime = currentTime;
        if (window.nokiaMessages) window.nokiaMessages.updateTextareaHeight(textarea);
        updateMessagesCursor();
        return;
    }
    
    // ONLY ChatGPT app
    if (!window.appManager || !window.appManager.isInChatGPT()) {
        return;
    }
    
    const currentTime = Date.now();
    const timeSinceLastKey = currentTime - lastKeyTime;
    
    if (t9Mode && t9Sequence.length > 0) {
        acceptT9Word();
    }   
    
    // If pressed quickly twice, insert # character
    if (lastKey === '#' && timeSinceLastKey < 1000) {
        // Replace last newline with #
        if (currentInput[cursorPosition - 1] === '\n') {
            currentInput = currentInput.slice(0, cursorPosition - 1) + '#' + currentInput.slice(cursorPosition);
        } else {
            currentInput = currentInput.slice(0, cursorPosition) + '#' + currentInput.slice(cursorPosition);
            cursorPosition++;
        }
    } else {
        // First press: insert newline
        currentInput = currentInput.slice(0, cursorPosition) + '\n' + currentInput.slice(cursorPosition);
        cursorPosition++;
    }
    
    lastKey = '#';
    lastKeyTime = currentTime;
    updateDisplay();
    saveToStorage();
}

function acceptT9Word() {
    if (t9Sequence.length > 0) {
        const acceptedWord = t9Suggestions[t9SelectedIndex];

        if (acceptedWord && !dictionary[currentLang].includes(acceptedWord.toLowerCase())) {
            console.log(`New T9 word accepted and will be saved: "${acceptedWord}"`);
            saveCustomWord(acceptedWord);
        }

        console.log(`T9 word accepted: ${acceptedWord || t9Sequence}`);
        
        t9Sequence = '';
        t9Suggestions = [];
        t9SelectedIndex = 0;
        shiftMode = false;
        updateShiftIndicator();
    }
}