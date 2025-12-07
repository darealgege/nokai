/**
 * Nokia App Handlers - Navigation Module (FIXED v2)
 * Handles D-pad and navigation controls with App Manager integration
 */

// ChatGPT Settings state tracking
let chatGPTSettingsOpen = false;
let chatGPTSettingsIndex = 0;
let chatGPTSettingsItems = [];

// Navigation priority order:
// 1. About dialog
// 2. Profile dialog
// 3. Confirm dialog
// 4. Gallery app
// 5. Camera app
// 6. ChatGPT Settings (if in ChatGPT app)
// 7. App Manager dialogs
// 8. App Manager home screen
// 9. ChatGPT screen content

window.handleNavUp = function() {
    // ✅ JAVÍTÁS: A hívásképernyő kezelése a legmagasabb prioritással
    if (window.voiceHandler && window.voiceHandler.isActive()) {
        console.log('📞 NavUp in active call: Scrolling transcript up.');
        const transcript = document.getElementById('inCallTranscript');
        if (transcript) {
            transcript.scrollTop -= 20; // Görgetés felfelé
        }
        return; // Megakadályozzuk, hogy a háttérben lévő elemek reagáljanak
    }    
    // ✅ VÉDELMI BLOKK
    if (window.pinScreen && window.pinScreen.isActive) {
        //playDTMF('2'); // A PIN képernyőn nincs fel/le, de a hangot lejátsszuk
        return;
    }
    if (window.setupScreen && window.setupScreen.isActive) {
        window.setupScreen.navigate('up');
        //playDTMF('2');
        return;
    }
    
    //playDTMF('2');
    // ✅ MÓDOSÍTVA: Új dialógus prioritása
    if (isSystemInfoDialogOpen()) {
        scrollSystemInfoDialog(-20);
        return;
    }    
    
    // About dialog has HIGHEST priority
    if (isAboutDialogOpen()) {
        scrollAboutDialog(-20);
        return;
    }

    // ✅ Phone app navigation - MAGAS PRIORITÁS (diálógusok után, de más app-ok előtt!)
    // Call Details Menu
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isDetailsMenuOpen()) {
        window.nokiaPhoneApp.navigateDetailsMenu('up');
        return;
    }
    
    // Remove Confirmation
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
        // Fel/le gomboknak nincs funkciója a megersítőben
        return;
    }
    
    // Call Details
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isCallDetailsOpen()) {
        window.nokiaPhoneApp.scrollCallDetails(-20);
        return;
    }
    
    // Main Phone App
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        window.nokiaPhoneApp.navigate('up');
        return;
    }    

    // Profile dialog has priority
    if (window.profileManager && window.profileManager.isDialogOpen) {
        window.profileManager.navigateUp();
        return;
    }

    

    // Messages image attach dialog navigation
    if (window.messagesImageAttachActive) {
        const images = window.messagesImageAttachImages || [];
        if (images.length === 0) return;
        
        const prevIndex = window.messagesImageAttachIndex;
        window.messagesImageAttachIndex = (prevIndex - 1 + images.length) % images.length;
        
        const items = document.querySelectorAll('.messages-image-attach-dialog .dialog-list-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === window.messagesImageAttachIndex);
        });
        
        const container = document.querySelector('.messages-image-attach-dialog .dialog-list');
        if (container && items[window.messagesImageAttachIndex]) {
            items[window.messagesImageAttachIndex].scrollIntoView({ block: 'nearest' });
        }
        return;
    }

    // ChatGPT image attach dialog navigation
    if (window.chatgptImageAttachActive) {
        const images = window.chatgptImageAttachImages || [];
        if (images.length === 0) return;
        
        const prevIndex = window.chatgptImageAttachIndex;
        window.chatgptImageAttachIndex = (prevIndex - 1 + images.length) % images.length;
        
        const items = document.querySelectorAll('.chatgpt-image-attach-dialog .dialog-list-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === window.chatgptImageAttachIndex);
        });
        
        const container = document.querySelector('.chatgpt-image-attach-dialog .dialog-list');
        if (container && items[window.chatgptImageAttachIndex]) {
            items[window.chatgptImageAttachIndex].scrollIntoView({ block: 'nearest' });
        }
        return;
    }

    // ✅ Messages "New Message" dialog
    if (window.messagesNewDialogActive) {
        const items = document.querySelectorAll('.messages-new-dialog .dialog-list-item');
        if (items.length === 0) return;
        
        items[window.messagesNewDialogIndex].classList.remove('selected');
        window.messagesNewDialogIndex = (window.messagesNewDialogIndex - 1 + items.length) % items.length;
        items[window.messagesNewDialogIndex].classList.add('selected');
        
        // ✅ SCROLL FIX
        const container = document.querySelector('.messages-new-dialog .dialog-list');
        if (container && items[window.messagesNewDialogIndex]) {
            const item = items[window.messagesNewDialogIndex];
            const itemTop = item.offsetTop;
            const itemHeight = item.offsetHeight;
            const containerHeight = container.clientHeight;
            const targetScroll = itemTop - (containerHeight / 2) + (itemHeight / 2);
            container.scrollTop = Math.max(0, Math.min(targetScroll, container.scrollHeight - containerHeight));
        }
               
        return;
    }

    // ✅ Messages Settings dialog
    if (window.nokiaMessages && window.nokiaMessages.settingsOpen) {
        window.nokiaMessages.navigateSettings('up');
        return;
    }

    // ✅ Messages app navigation
    if (window.nokiaMessages && window.nokiaMessages.isActive) {
        if (window.nokiaMessages.viewMode === 'threads') {
            window.nokiaMessages.navigateThreads('up');
        }
        // In conversation view, up/down scroll the messages
        else if (window.nokiaMessages.viewMode === 'conversation') {
            const messagesDiv = document.querySelector('.conversation-messages');
            if (messagesDiv) {
                messagesDiv.scrollTop -= 20;
                //playDTMF('2');
            }
        }
        return;
    }

    // ✅ Gallery app navigation
    if (window.nokiaGallery && window.nokiaGallery.isActive) {
        //playDTMF('2');
        return;
    }
    
    // ✅ Camera app navigation
    if (window.nokiaCamera && window.nokiaCamera.isActive) {
        if (window.nokiaCamera.settingsOpen) {
            window.nokiaCamera.navigateSettings('up');
        }
        return;
    }
    
    // ✅ ChatGPT Settings has priority (if open)
    if (chatGPTSettingsOpen) {
        navigateChatGPTSettings('up');
        return;
    }
    
    // App Manager dialogs have priority
    if (window.appManager && window.appManager.hasOpenDialog()) {
        window.appManager.navigateDialog('up');
        return;
    }
    
    // Home screen navigation
    if (window.appManager && window.appManager.isOnHomeScreen()) {
        window.appManager.navigateHome('up');
        return;
    }
    
    //playDTMF('2');
    
    // ChatGPT screen scrolling
    document.getElementById('screenContent').scrollTop -= 20;
}

window.handleNavDown = function() {
    // ✅ JAVÍTÁS: A hívásképernyő kezelése a legmagasabb prioritással
    if (window.voiceHandler && window.voiceHandler.isActive()) {
        console.log('📞 NavDown in active call: Scrolling transcript down.');
        const transcript = document.getElementById('inCallTranscript');
        if (transcript) {
            transcript.scrollTop += 20; // Görgetés lefelé
        }
        return; // Megakadályozzuk, hogy a háttérben lévő elemek reagáljanak
    }

    // ✅ VÉDELMI BLOKK
    if (window.pinScreen && window.pinScreen.isActive) {
        //playDTMF('8');
        return;
    }
    if (window.setupScreen && window.setupScreen.isActive) {
        window.setupScreen.navigate('down');
        //playDTMF('8');
        return;
    }
    //playDTMF('8');
    // ✅ MÓDOSÍTVA: Új dialógus prioritása
    if (isSystemInfoDialogOpen()) {
        scrollSystemInfoDialog(20);
        return;
    }    
    // About dialog has priority
    if (isAboutDialogOpen()) {
        scrollAboutDialog(20);
        return;
    }

    // ✅ Phone app navigation - MAGAS PRIORITÁS (diálógusok után, de más app-ok előtt!)
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isDetailsMenuOpen()) {
        window.nokiaPhoneApp.navigateDetailsMenu('down');
        return;
    }
    
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
        return;
    }
    
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isCallDetailsOpen()) {
        window.nokiaPhoneApp.scrollCallDetails(20);
        return;
    }
    
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        window.nokiaPhoneApp.navigate('down');
        return;
    }    
    
    // Profile dialog has priority
    if (window.profileManager && window.profileManager.isDialogOpen) {
        window.profileManager.navigateDown();
        return;
    }

    // Messages image attach dialog navigation
    if (window.messagesImageAttachActive) {
        const images = window.messagesImageAttachImages || [];
        if (images.length === 0) return;
        
        const prevIndex = window.messagesImageAttachIndex;
        window.messagesImageAttachIndex = (prevIndex + 1) % images.length;
        
        const items = document.querySelectorAll('.messages-image-attach-dialog .dialog-list-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === window.messagesImageAttachIndex);
        });
        
        const container = document.querySelector('.messages-image-attach-dialog .dialog-list');
        if (container && items[window.messagesImageAttachIndex]) {
            items[window.messagesImageAttachIndex].scrollIntoView({ block: 'nearest' });
        }
        return;
    }

    // ChatGPT image attach dialog navigation
    if (window.chatgptImageAttachActive) {
        const images = window.chatgptImageAttachImages || [];
        if (images.length === 0) return;
        
        const prevIndex = window.chatgptImageAttachIndex;
        window.chatgptImageAttachIndex = (prevIndex + 1) % images.length;
        
        const items = document.querySelectorAll('.chatgpt-image-attach-dialog .dialog-list-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === window.chatgptImageAttachIndex);
        });
        
        const container = document.querySelector('.chatgpt-image-attach-dialog .dialog-list');
        if (container && items[window.chatgptImageAttachIndex]) {
            items[window.chatgptImageAttachIndex].scrollIntoView({ block: 'nearest' });
        }
        return;
    }    

    // ✅ Messages "New Message" dialog
    if (window.messagesNewDialogActive) {
        const items = document.querySelectorAll('.messages-new-dialog .dialog-list-item');
        if (items.length === 0) return;
        
        items[window.messagesNewDialogIndex].classList.remove('selected');
        window.messagesNewDialogIndex = (window.messagesNewDialogIndex + 1) % items.length;
        items[window.messagesNewDialogIndex].classList.add('selected');
        
        // ✅ SCROLL FIX
        const container = document.querySelector('.messages-new-dialog .dialog-list');
        if (container && items[window.messagesNewDialogIndex]) {
            const item = items[window.messagesNewDialogIndex];
            const itemTop = item.offsetTop;
            const itemHeight = item.offsetHeight;
            const containerHeight = container.clientHeight;
            const targetScroll = itemTop - (containerHeight / 2) + (itemHeight / 2);
            container.scrollTop = Math.max(0, Math.min(targetScroll, container.scrollHeight - containerHeight));
        }
        
        //playDTMF('8');
        return;
    }

    // ✅ Messages Settings dialog
    if (window.nokiaMessages && window.nokiaMessages.settingsOpen) {
        window.nokiaMessages.navigateSettings('down');
        return;
    }

    // ✅ Messages app navigation
    if (window.nokiaMessages && window.nokiaMessages.isActive) {
        if (window.nokiaMessages.viewMode === 'threads') {
            window.nokiaMessages.navigateThreads('down');
        }
        // In conversation view, down scrolls the messages
        else if (window.nokiaMessages.viewMode === 'conversation') {
            const messagesDiv = document.querySelector('.conversation-messages');
            if (messagesDiv) {
                messagesDiv.scrollTop += 20;
                //playDTMF('8');
            }
        }
        return;
    }
    
    // ✅ Gallery app navigation
    if (window.nokiaGallery && window.nokiaGallery.isActive) {
        //playDTMF('8');
        return;
    }
    
    // ✅ Camera app navigation
    if (window.nokiaCamera && window.nokiaCamera.isActive) {
        if (window.nokiaCamera.settingsOpen) {
            window.nokiaCamera.navigateSettings('down');
        }
        return;
    }
    
    // ✅ ChatGPT Settings has priority (if open)
    if (chatGPTSettingsOpen) {
        navigateChatGPTSettings('down');
        return;
    }
    
    // App Manager dialogs have priority
    if (window.appManager && window.appManager.hasOpenDialog()) {
        window.appManager.navigateDialog('down');
        return;
    }
    
    // Home screen navigation
    if (window.appManager && window.appManager.isOnHomeScreen()) {
        window.appManager.navigateHome('down');
        return;
    }
    
    //playDTMF('8');
    
    // ChatGPT screen scrolling
    document.getElementById('screenContent').scrollTop += 20;
}

window.handleNavLeft = function() {
    // ✅ JAVÍTÁS: A hívásképernyőn a balra gombnak nincs funkciója
    if (window.voiceHandler && window.voiceHandler.isActive()) {
        console.log('📞 NavLeft ignored during active call.');
        return;
    }
    //playDTMF('4');
    // ✅ VÉDELMI BLOKK
    if (window.pinScreen && window.pinScreen.isActive) {
        // A PIN képernyőn a balra is törölhet, mint a C
        window.pinScreen.handleBackspace();
        return;
    }
    if (window.setupScreen && window.setupScreen.isActive) {
        window.setupScreen.moveCursor('left');
        return;
    }    


    // ✅ MÓDOSÍTVA: Új dialógusok figyelmen kívül hagyják
    if (isSystemInfoDialogOpen() || isAboutDialogOpen()) {
        return;
    }    
    // About dialog - ignore left key
    if (isAboutDialogOpen()) {
        return;
    }
    
    // ✅ Confirm dialog has priority
    if (isDialogActive) {
        //playDTMF('4');
        document.getElementById('optionYes').classList.add('selected');
        document.getElementById('optionNo').classList.remove('selected');
        return;
    }

    // ✅ Phone app navigation - Switch to history
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        // ✅ Remove Confirmation - navigate left (Yes)
        if (window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
            window.nokiaPhoneApp.navigateRemoveConfirmation('left');
            return;
        }
        
        if (!window.nokiaPhoneApp.isCallDetailsOpen()) {
            window.nokiaPhoneApp.switchView('left');
        }
        return;
    }    


    // ✅ Phone app navigation - MAGAS PRIORITÁS (diálógusok után, de más app-ok előtt!)
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        if (window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
            window.nokiaPhoneApp.navigateRemoveConfirmation('left');
            return;
        }
        
        if (!window.nokiaPhoneApp.isCallDetailsOpen()) {
            window.nokiaPhoneApp.switchView('left');
        }
        return;
    }

    // ✅ Phone app navigation - MAGAS PRIORITÁS (diálógusok után, de más app-ok előtt!)
    // Call Details Menu
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isDetailsMenuOpen()) {
        window.nokiaPhoneApp.navigateDetailsMenu('up');
        return;
    }
    
    // Remove Confirmation
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
        // Fel/le gomboknak nincs funkciója a megersítőben
        return;
    }
    
    // Call Details
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isCallDetailsOpen()) {
        window.nokiaPhoneApp.scrollCallDetails(-20);
        return;
    }
    
    // Main Phone App
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        window.nokiaPhoneApp.navigate('up');
        return;
    }    

    

    // Messages image attach dialog navigation
    if (window.messagesImageAttachActive) {
        const images = window.messagesImageAttachImages || [];
        if (images.length === 0) return;
        
        const prevIndex = window.messagesImageAttachIndex;
        window.messagesImageAttachIndex = (prevIndex - 1 + images.length) % images.length;
        
        const items = document.querySelectorAll('.messages-image-attach-dialog .dialog-list-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === window.messagesImageAttachIndex);
        });
        
        const container = document.querySelector('.messages-image-attach-dialog .dialog-list');
        if (container && items[window.messagesImageAttachIndex]) {
            items[window.messagesImageAttachIndex].scrollIntoView({ block: 'nearest' });
        }
        return;
    }

    // ChatGPT image attach dialog navigation
    if (window.chatgptImageAttachActive) {
        const images = window.chatgptImageAttachImages || [];
        if (images.length === 0) return;
        
        const prevIndex = window.chatgptImageAttachIndex;
        window.chatgptImageAttachIndex = (prevIndex - 1 + images.length) % images.length;
        
        const items = document.querySelectorAll('.chatgpt-image-attach-dialog .dialog-list-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === window.chatgptImageAttachIndex);
        });
        
        const container = document.querySelector('.chatgpt-image-attach-dialog .dialog-list');
        if (container && items[window.chatgptImageAttachIndex]) {
            items[window.chatgptImageAttachIndex].scrollIntoView({ block: 'nearest' });
        }
        return;
    }
    
    // ✅ Messages: cursor movement left
    if (window.nokiaMessages && window.nokiaMessages.isActive && window.nokiaMessages.viewMode === 'conversation') {
        const textarea = document.getElementById('messagesInputArea');
        if (textarea) {
            //playDTMF('4');
            const cursorPos = textarea.selectionStart;
            if (cursorPos > 0) {
                // ✅ Accept T9 word before moving
                if (t9Mode && t9Sequence.length > 0) {
                    const oldSuffix = t9Suggestions.length > 1 ? ` [${t9SelectedIndex + 1}/${t9Suggestions.length}]` : '';
                    if (oldSuffix && textarea.value.substring(cursorPos).startsWith(oldSuffix)) {
                        textarea.value = textarea.value.substring(0, cursorPos) + textarea.value.substring(cursorPos + oldSuffix.length);
                    }
                    acceptT9Word();
                }
                
                textarea.selectionStart = textarea.selectionEnd = cursorPos - 1;
                updateMessagesCursor();
            }
        }
        return;
    }
    
    // ✅ Camera app - switch camera (if settings not open)
    if (window.nokiaCamera && window.nokiaCamera.isActive && !window.nokiaCamera.settingsOpen) {
        window.nokiaCamera.switchCamera();
        return;
    }
    
    // ✅ Gallery app - previous photo
    if (window.nokiaGallery && window.nokiaGallery.isActive) {
        window.nokiaGallery.prev();
        return;
    }
    
    

    // App Manager dialogs have priority
    if (window.appManager && window.appManager.hasOpenDialog()) {
        window.appManager.navigateDialog('left');
        return;
    }    
    
    // Home screen navigation
    if (window.appManager && window.appManager.isOnHomeScreen()) {
        window.appManager.navigateHome('left');
        return;
    }
    
    
    
    // ChatGPT text input cursor movement
    if (!chatGPTSettingsOpen && cursorPosition > 0) {
        acceptT9Word();        
        cursorPosition--;
        updateDisplay();
        saveToStorage();
    }
}

window.handleNavRight = function() {
    // ✅ JAVÍTÁS: A hívásképernyőn a jobbra gombnak nincs funkciója
    if (window.voiceHandler && window.voiceHandler.isActive()) {
        console.log('📞 NavRight ignored during active call.');
        return;
    }
    //playDTMF('6');

    // ✅ VÉDELMI BLOKK
    if (window.pinScreen && window.pinScreen.isActive) {
        return; // Nincs funkciója
    }
    if (window.setupScreen && window.setupScreen.isActive) {
        window.setupScreen.moveCursor('right');
        return;
    }

    // ✅ MÓDOSÍTVA: Új dialógusok figyelmen kívül hagyják
    if (isSystemInfoDialogOpen() || isAboutDialogOpen()) {
        return;
    }    
    // About dialog - ignore right key
    if (isAboutDialogOpen()) {
        return;
    }
    
    // ✅ Confirm dialog has priority
    if (isDialogActive) {
        //playDTMF('6');
        document.getElementById('optionYes').classList.remove('selected');
        document.getElementById('optionNo').classList.add('selected');
        return;
    }

    // ✅ Phone app navigation - Switch to contacts
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        // ✅ Remove Confirmation - navigate right (No)
        if (window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
            window.nokiaPhoneApp.navigateRemoveConfirmation('right');
            return;
        }
        
        if (!window.nokiaPhoneApp.isCallDetailsOpen()) {
            window.nokiaPhoneApp.switchView('right');
        }
        return;
    }


    // ✅ Phone app navigation - MAGAS PRIORITÁS (diálógusok után, de más app-ok előtt!)
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        if (window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
            window.nokiaPhoneApp.navigateRemoveConfirmation('left');
            return;
        }
        
        if (!window.nokiaPhoneApp.isCallDetailsOpen()) {
            window.nokiaPhoneApp.switchView('left');
        }
        return;
    }

    // ✅ Phone app navigation - MAGAS PRIORITÁS (diálógusok után, de más app-ok előtt!)
    // Call Details Menu
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isDetailsMenuOpen()) {
        window.nokiaPhoneApp.navigateDetailsMenu('up');
        return;
    }
    
    // Remove Confirmation
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
        // Fel/le gomboknak nincs funkciója a megersítőben
        return;
    }
    
    // Call Details
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isCallDetailsOpen()) {
        window.nokiaPhoneApp.scrollCallDetails(-20);
        return;
    }
    
    // Main Phone App
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        window.nokiaPhoneApp.navigate('up');
        return;
    }        

    // Messages image attach dialog navigation
    if (window.messagesImageAttachActive) {
        const images = window.messagesImageAttachImages || [];
        if (images.length === 0) return;
        
        const prevIndex = window.messagesImageAttachIndex;
        window.messagesImageAttachIndex = (prevIndex + 1) % images.length;
        
        const items = document.querySelectorAll('.messages-image-attach-dialog .dialog-list-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === window.messagesImageAttachIndex);
        });
        
        const container = document.querySelector('.messages-image-attach-dialog .dialog-list');
        if (container && items[window.messagesImageAttachIndex]) {
            items[window.messagesImageAttachIndex].scrollIntoView({ block: 'nearest' });
        }
        return;
    }

    // ChatGPT image attach dialog navigation
    if (window.chatgptImageAttachActive) {
        const images = window.chatgptImageAttachImages || [];
        if (images.length === 0) return;
        
        const prevIndex = window.chatgptImageAttachIndex;
        window.chatgptImageAttachIndex = (prevIndex + 1) % images.length;
        
        const items = document.querySelectorAll('.chatgpt-image-attach-dialog .dialog-list-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === window.chatgptImageAttachIndex);
        });
        
        const container = document.querySelector('.chatgpt-image-attach-dialog .dialog-list');
        if (container && items[window.chatgptImageAttachIndex]) {
            items[window.chatgptImageAttachIndex].scrollIntoView({ block: 'nearest' });
        }
        return;
    }
    
    // ✅ Messages: cursor movement right
    if (window.nokiaMessages && window.nokiaMessages.isActive && window.nokiaMessages.viewMode === 'conversation') {
        const textarea = document.getElementById('messagesInputArea');
        if (textarea) {
            //playDTMF('6');
            const cursorPos = textarea.selectionStart;
            const textLength = textarea.value.length;
            
            // ✅ Check if we're at the end (excluding suffix)
            const hasSuffix = t9Mode && t9Sequence.length > 0 && t9Suggestions.length > 1;
            const suffix = hasSuffix ? ` [${t9SelectedIndex + 1}/${t9Suggestions.length}]` : '';
            const effectiveEnd = textLength - suffix.length;
            
            if (cursorPos < effectiveEnd) {
                // ✅ Accept T9 word before moving
                if (t9Mode && t9Sequence.length > 0) {
                    if (suffix && textarea.value.substring(cursorPos).startsWith(suffix)) {
                        textarea.value = textarea.value.substring(0, cursorPos) + textarea.value.substring(cursorPos + suffix.length);
                    }
                    acceptT9Word();
                }
                
                textarea.selectionStart = textarea.selectionEnd = cursorPos + 1;
                updateMessagesCursor();
            }
        }
        return;
    }
    
    // ✅ Camera app - switch camera (if settings not open)
    if (window.nokiaCamera && window.nokiaCamera.isActive && !window.nokiaCamera.settingsOpen) {
        window.nokiaCamera.switchCamera();
        return;
    }
    
    // ✅ Gallery app - next photo
    if (window.nokiaGallery && window.nokiaGallery.isActive) {
        window.nokiaGallery.next();
        return;
    }
    
    

    
    // App Manager dialogs have priority
    if (window.appManager && window.appManager.hasOpenDialog()) {
        window.appManager.navigateDialog('right');
        return;
    }

    // Home screen navigation
    if (window.appManager && window.appManager.isOnHomeScreen()) {
        window.appManager.navigateHome('right');
        return;
    }
    
    
    
    // ChatGPT text input cursor movement
    if (!chatGPTSettingsOpen && cursorPosition < currentInput.length) {
        acceptT9Word();
        cursorPosition++;
        updateDisplay();
        saveToStorage();
    }
}

window.handleOK = async function() {
    // ✅ ÚJ: DOOM "Enter" gomb kezelése, magas prioritással
    if (window.doomEasterEgg && window.doomEasterEgg.isActive()) {
        console.log('✅ OK button = ENTER in DOOM!');
        // A doom_easter_egg.js-ben definiált keyMap alapján szimulálunk egy Enter lenyomást
        window.doomEasterEgg.pressAndReleaseKey(window.doomEasterEgg.keyMap.enter);
        return; // Nagyon fontos, hogy itt megálljon a függvény!
    }    
    
    
    // ✅ JAVÍTÁS: Az OK gombnak nincs funkciója hívás közben
    if (window.voiceHandler && window.voiceHandler.isActive()) {
        console.log('📞 OK button ignored during active call.');
        return;
    }
    //playDTMF('5');
    // ✅ JAVÍTÁS: A dialógusok kezelése a legmagasabb prioritású
    if (window.isCustomAlertOpen) {
        const dialog = document.getElementById('customAlertDialog');
        if (dialog) dialog.classList.add('hidden');
        window.isCustomAlertOpen = false;
        if (typeof window.customAlertResolve === 'function') {
            window.customAlertResolve();
            window.customAlertResolve = null;
        }
        return;
    }
    if (isDialogActive) {
        const isYesSelected = document.getElementById('optionYes').classList.contains('selected');
        
        if (isYesSelected && typeof window.confirmationCallback === 'function') {
            window.confirmationCallback();
        }
        window.messagesConfirmCallback = null;
        window.galleryDeletePending = false;
        window.messagesConfirmPending = false;
        // Dialógus bezárása és a callback-ek törlése
        document.getElementById('confirmDialog').classList.add('hidden');
        isDialogActive = false;
        window.confirmationCallback = null;
        
        // A régi, felesleges flag-ek nullázása a biztonság kedvéért
        /* window.galleryDeletePending = false;
        window.messagesConfirmPending = false;
        window.messagesConfirmCallback = null; */
        
        return;
    }

    // Csak ezután jöhetnek a speciális képernyők
    if (window.pinScreen && window.pinScreen.isActive) {
        window.pinScreen.handleConfirm();
        return;
    }
    if (window.setupScreen && window.setupScreen.isActive) {
        const currentItem = window.setupScreen.formItems[window.setupScreen.selectedIndex];
        if (currentItem.dataset.type === 'submit') {
            await window.setupScreen.submit();
        } else {
            window.setupScreen.handleOK();
        }
        return;
    }

    // Messages image attach dialog
    if (window.messagesImageAttachActive) {
        const index = window.messagesImageAttachIndex || 0;
        window.nokiaMessages.imageHandler.selectImageToAttach(index);
        return;
    }

    // ChatGPT image attach dialog
    if (window.chatgptImageAttachActive) {
        const index = window.chatgptImageAttachIndex || 0;
        // ChatGPT app image selection
        const images = window.chatgptImageAttachImages;
        if (images && images[index]) {
            const dialog = document.querySelector('.chatgpt-image-attach-dialog');
            if (dialog && dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
            window.chatgptImageAttachActive = false;
            
            // Set pending image in ChatGPT app
            if (window.chatGPTImageHandler) {
                window.chatGPTImageHandler.pendingImageAttachment = {
                    full: images[index].full,
                    retro: images[index].retro
                };
                // ✅ ÚJ: Frissítsük a kijelzőt hogy az emoji megjelenődjön!
                if (typeof updateDisplay === 'function') {
                    updateDisplay();
                }
            }
        }
        return;
    }

    // ✅ ÚJ: Teljes Setup képernyő logika
    const setupScreen = document.getElementById('setupScreen');
    if (setupScreen && !setupScreen.classList.contains('hidden')) {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const passwordInput = document.getElementById('passwordInput');
        const sessionOnlyCheckbox = document.getElementById('sessionOnlyCheckbox');

        const apiKey = apiKeyInput.value.trim();
        const password = passwordInput.value;
        const sessionOnly = sessionOnlyCheckbox.checked;

        try {
            if (sessionOnly) {
                if (!apiKey.startsWith('sk-')) {
                    alert('Invalid API Key format.');
                    return;
                }
                window.apiKeyManager.setSessionApiKey(apiKey);
                console.log('✅ API Key set for this session.');
                // Indulhat az alkalmazás
                location.reload(); // A legegyszerűbb módja az újraindításnak
            } else {
                const hasKey = await window.apiKeyManager.hasStoredKey();
                if (hasKey) { // "Unlock" mód
                    if (!password) {
                        alert('Password is required to unlock.');
                        return;
                    }
                    const unlockedKey = await window.apiKeyManager.loadAndDecryptKey(password);
                    if (unlockedKey) {
                        console.log('✅ API Key unlocked successfully.');
                        location.reload();
                    } else {
                        alert('Incorrect password.');
                    }
                } else { // Első beállítás mód
                    if (!apiKey.startsWith('sk-')) {
                        alert('Invalid API Key format.');
                        return;
                    }
                    if (password.length < 4 || password.length > 6) {
                        alert('PIN must be 4-6 digits.');
                        return;
                    } 
                    await window.apiKeyManager.saveAndEncryptKey(apiKey, password);
                    alert('API Key saved successfully!');
                    location.reload();
                }
            }
        } catch (error) {
            console.error("API Key setup error:", error);
            alert("An error occurred: " + error.message);
        }
        return;
    }
    
    // ✅ MÓDOSÍTVA: Új dialógusok bezárása
    if (isSystemInfoDialogOpen()) {
        closeSystemInfoDialog();
        return;
    }    
    // About dialog has priority - close on OK press
    if (isAboutDialogOpen()) {
        closeAboutDialog();
        return;
    }
    

    // ✅ JAVÍTOTT: Általános megerősítő dialógus kezelése
     if (isDialogActive) {
        const isYesSelected = document.getElementById('optionYes').classList.contains('selected');
        
        // Lefuttatjuk a callback-et, ha létezik és az 'Igen'-t választották
        if (isYesSelected && typeof window.confirmationCallback === 'function') {
            window.confirmationCallback();
        }

        // A régi, specifikus callback-ek már nem kellenek, de a biztonság kedvéért itt is töröljük őket
        window.messagesConfirmCallback = null;
        window.galleryDeletePending = false;
        
        // Dialógus bezárása és a callback törlése
        document.getElementById('confirmDialog').classList.add('hidden');
        isDialogActive = false;
        window.confirmationCallback = null; // Fontos a takarítás!
        return;
    }
    
    // Profile dialog has priority
    if (window.profileManager && window.profileManager.isDialogOpen) {
        window.profileManager.confirmSelection();
        return;
    }

    // ✅ Messages "New Message" dialog - select profile
    if (window.messagesNewDialogActive) {
        if (window.nokiaMessages) {
            window.nokiaMessages.selectNewMessageProfile(window.messagesNewDialogIndex);
        }
        return;
    }

    // ✅ Messages Settings dialog - select item
    if (window.nokiaMessages && window.nokiaMessages.settingsOpen) {
        await window.nokiaMessages.selectSettingsItem(); // ✅ Now async
        return;
    }

    // ✅ Messages app - open thread or send message
    if (window.nokiaMessages && window.nokiaMessages.isActive && !window.nokiaMessages.settingsOpen) {
        console.log('📱 Messages OK pressed, viewMode:', window.nokiaMessages.viewMode);
        
        if (window.nokiaMessages.viewMode === 'threads') {
            window.nokiaMessages.openThread();
        } else if (window.nokiaMessages.viewMode === 'conversation') {
            // ✅ Ellenőrizzük a textarea értékét
            const textarea = document.getElementById('messagesInputArea');
            console.log('📋 Textarea:', textarea);
            console.log('📋 Textarea value:', textarea ? textarea.value : 'N/A');
            
            if (textarea && textarea.value.trim().length > 0) {
                console.log('✅ Calling sendMessage');
                window.nokiaMessages.sendMessage();
            } else {
                console.log('⛔ Empty or no textarea');
            }
        }
        //playDTMF('5');
        return;
    }
    
    // ✅ Gallery app - toggle fullscreen
    if (window.nokiaGallery && window.nokiaGallery.isActive) {
        window.nokiaGallery.toggleFullscreen();
        return;
    }
    
    // ✅ Camera app - capture photo
    if (window.nokiaCamera && window.nokiaCamera.isActive) {
        // ✅ If settings open, select item
        if (window.nokiaCamera.settingsOpen) {
            window.nokiaCamera.selectSettingsItem();
        } else {
            window.nokiaCamera.capturePhoto();
        }
        return;
    }
    
    // ✅ Phone app - handle OK
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        // ✅ Remove Confirmation - confirm choice
        if (window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
            window.nokiaPhoneApp.confirmRemove();
            return;
        }
        
        if (window.nokiaPhoneApp.isDetailsMenuOpen()) {
            // In details menu: select menu item
            window.nokiaPhoneApp.selectDetailsMenuItem();
        } else if (window.nokiaPhoneApp.isCallDetailsOpen()) {
            // In call details: continue call
            /* await window.nokiaPhoneApp.continueCallFromHistory(); */
        } else {
            // In main view: handle selection
            window.nokiaPhoneApp.handleOK();
        }
        return;
    }
    
    // ✅ ChatGPT Settings has priority
    if (chatGPTSettingsOpen) {
        await selectChatGPTSettingsItem(); // ✅ Now async
        return;
    }
    
    // App Manager dialogs have priority
    if (window.appManager && window.appManager.hasOpenDialog()) {
        window.appManager.selectDialogItem();
        return;
    }
    
    // Home screen - launch app
    if (window.appManager && window.appManager.isOnHomeScreen()) {
        const selectedApp = window.appManager.apps[window.appManager.homeScreenIndex];
        window.appManager.launchApp(selectedApp.id);
        return;
    }
    
    //playDTMF('5');
    
    // ChatGPT: send message
    if (currentInput.trim().length > 0) {
        sendMessage();
    }
}

window.handleMenu = function() {
    playDTMF('5');
    // A DOOM-ban az ESC gombot szimulálja.
    if (window.doomEasterEgg && window.doomEasterEgg.isActive()) {
        window.doomEasterEgg.pressAndReleaseKey(window.doomEasterEgg.keyMap.esc);
        return; // FONTOS: Itt megállunk!
    }

    if (window.frontierEliteGame && window.frontierEliteGame.isActive()) {        
        return; // FONTOS: Itt megállunk!
    }    

    if (window.flightSimulator4Game && window.flightSimulator4Game.isActive()) {        
        return; // FONTOS: Itt megállunk!
    }        

    // ✅ Phone app - handle menu
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        if (window.nokiaPhoneApp.isCallDetailsOpen()) {
            // In call details: show menu
            if (window.nokiaPhoneApp.isDetailsMenuOpen()) {
                window.nokiaPhoneApp.closeDetailsMenu();
            } else if (window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
            return;            
            }  else {
                window.nokiaPhoneApp.showDetailsMenu();
            }
            return;
        } else if (window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
            return;            
        }  
        // In main phone view: do nothing (go to default behavior)
        return;
    }

    // ✅ Phone app - close menu, details or app
/*     if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        // ✅ Remove Confirmation - cancel
        if (window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
            return;            
        }        
    }   */  

    // --- LEGMAGASABB PRIORITÁSÚ FELTÉTELEK ---
    // Ha egyedi alert van nyitva, a Menu gomb is bezárja.
    if (window.isCustomAlertOpen) {
        const dialog = document.getElementById('customAlertDialog');
        if (dialog) dialog.classList.add('hidden');
        window.isCustomAlertOpen = false;
        if (typeof window.customAlertResolve === 'function') {
            window.customAlertResolve();
            window.customAlertResolve = null;
        }
        return; // FONTOS: Itt megállunk!
    }

    // A PIN és Setup képernyőkön a Menu gombnak nincs funkciója.
    if ((window.pinScreen && window.pinScreen.isActive) || (window.setupScreen && window.setupScreen.isActive)) {
        return; // FONTOS: Itt megállunk!
    }

    // A magas Z-indexű dialógusokat (About, System Info) bezárjuk.
    if (isSystemInfoDialogOpen()) {
        closeSystemInfoDialog();
        return; // FONTOS: Itt megállunk!
    }
    if (isAboutDialogOpen()) {
        closeAboutDialog();
        return; // FONTOS: Itt megállunk!
    }

    // --- ALKALMAZÁS-SPECIFIKUS LOGIKA ---
    // Ha a Messages app aktív, annak a saját beállításait kezeljük.
    if (window.nokiaMessages && window.nokiaMessages.isActive) {
        if (window.nokiaMessages.settingsOpen) {
            window.nokiaMessages.closeSettings();
        } else {
            window.nokiaMessages.showSettings();
        }
        return; // FONTOS: Itt megállunk!
    }

    // Ha a Camera app aktív, annak a beállításait kezeljük.
    if (window.nokiaCamera && window.nokiaCamera.isActive) {
        if (window.nokiaCamera.settingsOpen) {
            window.nokiaCamera.closeSettings();
        } else {
            window.nokiaCamera.showSettings();
        }
        return; // FONTOS: Itt megállunk!
    }

    // Ha a Gallery app aktív, a Menu gomb visszavisz a főképernyőre.
    if (window.nokiaGallery && window.nokiaGallery.isActive) {
        window.nokiaGallery.hide(); // Ez már tartalmazza a főképernyőre váltást.
        return; // FONTOS: Itt megállunk!
    }

    // Ha a ChatGPT beállításai nyitva vannak, bezárjuk őket.
    if (chatGPTSettingsOpen) {
        closeChatGPTSettings();
        return; // FONTOS: Itt megállunk!
    }

    // Ha az App Manager (pl. Settings) dialógusa van nyitva, bezárjuk és a főképernyőre ugrunk.
    if (window.appManager && window.appManager.hasOpenDialog()) {
        window.appManager.closeAllDialogs();
        window.appManager.showHomeScreen();
        return; // FONTOS: Itt megállunk!
    }

    // Ha a ChatGPT appban vagyunk (de a beállításai nincsenek nyitva), akkor megnyitjuk a beállításait.
    if (window.appManager && window.appManager.isInChatGPT()) {
        showChatGPTSettings();
        return; // FONTOS: Itt megállunk!
    }

    // --- VÉGSŐ, ALAPÉRTELMEZETT VISELKEDÉS ---
    // Ha a fentiek egyike sem igaz, a Menu gomb mindig a főképernyőre visz.
    if (window.appManager) {
        window.appManager.showHomeScreen();
    }
};


window.handleClear = function() {
    //playDTMF('1');    
    // ✅ JAVÍTOTT: Először a speciális képernyőket kezeljük, beleértve a PIN képernyőt is
    if (window.pinScreen && window.pinScreen.isActive) {
        window.pinScreen.handleBackspace();
        return;
    }
    if (window.setupScreen && window.setupScreen.isActive) {
        window.setupScreen.handleBackspace();
        return;
    }
    // ✅ MÓDOSÍTVA: Új dialógusok bezárása
    if (isSystemInfoDialogOpen()) {
        closeSystemInfoDialog();
        return;
    }    
    // About dialog has priority
    if (isAboutDialogOpen()) {
        closeAboutDialog();
        return;
    }
    
    // ✅ Phone app - close menu, details or app
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        // ✅ Remove Confirmation - cancel
        if (window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
            window.nokiaPhoneApp.closeRemoveConfirmation();
            // Vissza a menübe
            window.nokiaPhoneApp.showDetailsMenu();
            return;
        }
        
        if (window.nokiaPhoneApp.isDetailsMenuOpen()) {
            window.nokiaPhoneApp.closeDetailsMenu();
        } else if (window.nokiaPhoneApp.isCallDetailsOpen()) {
            window.nokiaPhoneApp.closeCallDetails();
        } else {
            window.nokiaPhoneApp.hide();
            if (window.appManager) {
                window.nokiaGallery.hide();
                window.nokiaCamera.hide();
                window.appManager.showHomeScreen();
            }
        }
        return;
    }

    // Profile dialog has priority
    if (window.profileManager && window.profileManager.isDialogOpen) {
        window.profileManager.cancelSelection();
        return;
    }

    // Messages image attach dialog cancel
    if (window.messagesImageAttachActive) {
        const dialog = document.querySelector('.messages-image-attach-dialog');
        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
        window.messagesImageAttachActive = false;
        return;
    }

    // ChatGPT image attach dialog cancel
    if (window.chatgptImageAttachActive) {
        const dialog = document.querySelector('.chatgpt-image-attach-dialog');
        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
        window.chatgptImageAttachActive = false;
        return;
    }

    // ✅ Messages "New Message" dialog - cancel
    if (window.messagesNewDialogActive) {
        //playDTMF('1');
        const dialog = document.querySelector('.messages-new-dialog');
        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
        window.messagesNewDialogActive = false;
        return;
    }

    // ✅ Messages app - close settings or go back OR delete character
    if (window.nokiaMessages && (window.nokiaMessages.isActive || window.nokiaMessages.settingsOpen)) {
        //playDTMF('1');
        if (window.nokiaMessages.settingsOpen) {
            window.nokiaMessages.closeSettings();
        } else if (window.nokiaMessages.viewMode === 'conversation') {
            // ✅ Conversation view: töröljük a karaktert a textarea-ból
            const textarea = document.getElementById('messagesInputArea');
            
            // ✅ ÚJ: Ellenőrizzük, van-e csatolt kép, és üres-e a textarea
            if (window.nokiaMessages.imageHandler && window.nokiaMessages.imageHandler.hasPendingAttachment()) {
                const currentValue = textarea ? textarea.value : '';
                
                // ✅ Ha a textarea CSAK az indikátort tartalmazza ("🖼️: "), töröljük a kép csatolást
                if (currentValue === '🖼️: ' || currentValue.length === 0) {
                    window.nokiaMessages.imageHandler.clearPendingAttachment();
                    window.nokiaMessages.updateInputWithImageIndicator();
                    console.log('✅ Image attachment cleared');
                    return;
                }
                
                // ✅ Ha van szöveg is, akkor normal backspace
            }
            
            if (textarea && textarea.value.length > 0) {
                const cursorPos = textarea.selectionStart;
                if (cursorPos > 0) {
                    // ✅ T9 word handling
                    if (t9Mode && t9Sequence.length > 0) {
                        // ✅ A kurzor a valódi szó végén van, NEM a számláló után!
                        const currentWord = t9Suggestions.length > 0 ? t9Suggestions[t9SelectedIndex] : t9Sequence;
                        const wordStart = cursorPos - currentWord.length;
                        
                        // Töröljük a szót ÉS a számlálót is
                        const displaySuffix = t9Suggestions.length > 1 ? ` [${t9SelectedIndex + 1}/${t9Suggestions.length}]` : '';
                        const afterCursor = textarea.value.substring(cursorPos);
                        
                        // Ellenőrizzük hogy a számláló következik-e
                        if (afterCursor.startsWith(displaySuffix)) {
                            // Töröljük a szót és a számlálót
                            textarea.value = textarea.value.substring(0, wordStart) + afterCursor.substring(displaySuffix.length);
                        } else {
                            // Csak a szót töröljük
                            textarea.value = textarea.value.substring(0, wordStart) + afterCursor;
                        }
                        
                        textarea.selectionStart = textarea.selectionEnd = wordStart;
                        t9Sequence = '';
                        t9Suggestions = [];
                        t9SelectedIndex = 0;
                        if (window.nokiaMessages) window.nokiaMessages.updateTextareaHeight(textarea);
                        updateMessagesCursor();
                    } else {
                        // ✅ ÚJ: Ha a kurzor a 4. karakternél van és az indikátor ott van, töröljük egyben!
                        if (cursorPos === 4 && textarea.value.startsWith('🖼️: ')) {
                            // Töröljük az TELJES indikátort egyszerre
                            window.nokiaMessages.imageHandler.clearPendingAttachment();
                            window.nokiaMessages.updateInputWithImageIndicator();
                            console.log('✅ Image attachment cleared (via backspace)');
                        } else {
                            // Normal backspace
                            textarea.value = textarea.value.substring(0, cursorPos - 1) + textarea.value.substring(cursorPos);
                            textarea.selectionStart = textarea.selectionEnd = cursorPos - 1;
                            if (window.nokiaMessages) window.nokiaMessages.updateTextareaHeight(textarea);
                            updateMessagesCursor();
                        }
                    }
                }
            } else {
                // Empty textarea: go back to threads
                window.nokiaMessages.backToThreads();
            }
        } else if (window.nokiaMessages.viewMode === 'threads') {
            window.nokiaMessages.hide();
        } else {
            window.nokiaMessages.hide();
        }
        return;
    }    
    
    // ✅ Camera app - close settings or return to home
    if (window.nokiaCamera && (window.nokiaCamera.isActive || window.nokiaCamera.settingsOpen)) {
        //playDTMF('1');
        if (window.nokiaCamera.settingsOpen) {
            // Close settings and return to camera
            window.nokiaCamera.closeSettings();
        } else {
            // Close camera and return to home
            window.nokiaCamera.hide();
        }
        return;
    }
    
    // ✅ Gallery app - C button behavior depends on mode
    if (window.nokiaGallery && window.nokiaGallery.isActive) {
        // ✅ If in fullscreen, exit fullscreen
        if (window.nokiaGallery.isFullscreen) {
            window.nokiaGallery.toggleFullscreen();
        } else {
            // ✅ Normal mode: delete photo
            //playDTMF('1');
            window.nokiaGallery.deletePhoto();
        }
        return;
    }   
    
    
    // ✅ ChatGPT Settings - close and return to chat
    if (chatGPTSettingsOpen) {
        closeChatGPTSettings();
        return;
    }
    
    // App Manager dialogs - close with C button
    if (window.appManager && window.appManager.hasOpenDialog()) {
        window.appManager.closeCurrentDialog();
        return;
    }
    
    // Confirm dialog
    if (isDialogActive) {
        document.getElementById('confirmDialog').classList.add('hidden');
        isDialogActive = false;
        wordToDelete = null;
        
        // ✅ Clear gallery delete flag
        if (window.galleryDeletePending) {
            window.galleryDeletePending = false;
            window.galleryDeleteIndex = null;
        }
        
        // ✅ Clear messages delete flag
        if (window.messagesConfirmPending) {
            window.messagesConfirmPending = false;
            window.messagesConfirmCallback = null;
        }
        return;
    }
    
    // DOOM fire button
    if (window.doomEasterEgg && window.doomEasterEgg.isActive()) {
        console.log('🔫 C button = FIRE in DOOM!');
        window.doomEasterEgg.fireBullet();
        return;
    }
        

    // ✅ VISSZAÁLLÍTOTT, MŰKÖDŐ CHATGPT BACKSPACE LOGIKA
    // Ez a blokk csak akkor fut le, ha semelyik fenti feltétel nem teljesült.
    // ✅ ÚJ: Ellenőrizzük a kép csatolást is
    if (window.chatGPTImageHandler && window.chatGPTImageHandler.hasPendingAttachment && window.chatGPTImageHandler.hasPendingAttachment()) {
        if (currentInput.length === 0) {
            // Üres input és van kép -> töröljük a képet
            window.chatGPTImageHandler.clearPendingAttachment();
            updateDisplay();
            console.log('✅ Image attachment cleared (ChatGPT)');
            return;
        }
    }
    
    if (currentInput.length > 0 && cursorPosition > 0) {
        if (t9Mode && t9Sequence.length > 0) {
            const currentWord = t9Suggestions.length > 0 ? t9Suggestions[t9SelectedIndex] : t9Sequence;
            const wordStart = cursorPosition - currentWord.length;
            currentInput = currentInput.slice(0, wordStart) + currentInput.slice(cursorPosition);
            cursorPosition = wordStart;
            t9Sequence = '';
            t9Suggestions = [];
            t9SelectedIndex = 0;
        } else {
            currentInput = currentInput.slice(0, cursorPosition - 1) + currentInput.slice(cursorPosition);
            cursorPosition--;
        }
        updateDisplay();
        saveToStorage();
    }
    lastKey = null;
}


window.handleCallEnd = function() {
    // 1. DOOM MÓD KEZELÉSE (legmagasabb prioritás)
    if (window.doomEasterEgg && window.doomEasterEgg.isActive()) {
        console.log('🎮 Red button in DOOM mode. Simulating "N".');
        window.doomEasterEgg.pressAndReleaseKey(window.doomEasterEgg.keyMap.n);
        return;
    }

// 2. HÍVÁS MEGSZAKÍTÁSA (második legmagasabb prioritás)
    if (voiceHandler && voiceHandler.isActive()) {
        console.log('📞 Ending active call.');
        voiceHandler.endCall();

        // ✅ ÚJ: A hívás befejezése után azonnal visszaállítjuk a kontextust a fő csevegésre.
        // Ez a legfontosabb javítás, ami megakadályozza az előzmények keveredését.
        console.log(`📞 Call ended. Resetting chat context from "${window.currentChatContextId}" to "main".`);
        window.currentChatContextId = 'main';
        
        return;
    }

    // ✅ Phone app - close menu, details or app
    if (window.nokiaPhoneApp && window.nokiaPhoneApp.isActive) {
        // ✅ Remove Confirmation - cancel
        if (window.nokiaPhoneApp.isRemoveConfirmationOpen()) {
            window.nokiaPhoneApp.closeRemoveConfirmation();
            // Vissza a menübe
            window.nokiaPhoneApp.showDetailsMenu();
            return;
        }
        
        if (window.nokiaPhoneApp.isDetailsMenuOpen()) {
            window.nokiaPhoneApp.closeDetailsMenu();
        } else if (window.nokiaPhoneApp.isCallDetailsOpen()) {
            window.nokiaPhoneApp.closeCallDetails();
        } else {
            window.nokiaPhoneApp.hide();
            if (window.appManager) {
                window.nokiaGallery.hide();
                window.nokiaCamera.hide();                
                window.appManager.showHomeScreen();
            }
        }        
        return;
    }

    if (window.nokiaMessages && (window.nokiaMessages.isActive || window.nokiaMessages.settingsOpen)) {
            
        if (window.nokiaMessages.settingsOpen) {
            window.nokiaMessages.closeSettings();
            return;
        }
        
        window.nokiaMessages.hide();
        window.appManager.showHomeScreen();        
        return;
    }

    // 3. DIALÓGUSOK ÉS ALKALMAZÁSOK BEZÁRÁSA (ugyanaz a logika, mint a 'C' gombnál)
    // Ez a blokk hiányzott vagy volt hiányos korábban.
    if (window.profileManager && window.profileManager.isDialogOpen) {
        window.profileManager.cancelSelection();
        return;
    }

    if (window.appManager && window.appManager.isInChatGPT()) {        
        if (chatGPTSettingsOpen) {
            closeChatGPTSettings();
            window.appManager.showHomeScreen();
            return;
        }
        window.appManager.showHomeScreen(); 
        return; // FONTOS: Itt megállunk!
    }        

    if (window.messagesNewDialogActive) {
        const dialog = document.querySelector('.messages-new-dialog');
        if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
        window.messagesNewDialogActive = false;
        return;
    }
    if (window.nokiaMessages && window.nokiaMessages.settingsOpen) {
        window.nokiaMessages.closeSettings();
        return;
    }


    if (chatGPTSettingsOpen) {
        closeChatGPTSettings();
        return;
    }

    if (isSystemInfoDialogOpen()) {
        closeSystemInfoDialog();
        return;
    }
    if (isAboutDialogOpen()) {
        closeAboutDialog();
        return;
    }

    if (window.appManager && window.appManager.hasOpenDialog()) {
        window.appManager.closeCurrentDialog();
        return;
    }    

    // 4. PIN/SETUP KÉPERNYŐK KEZELÉSE
    if (window.pinScreen && window.pinScreen.isActive) {
        window.pinScreen.hide(); // A piros gomb megszakítja a PIN bevitelt
        return;
    }
    if (window.setupScreen && window.setupScreen.isActive) {
        // A setup képernyőn a piros gombnak nincs funkciója, csak hangot ad
        return;
    }

    // 5. Ha semmi más nem történt, a gombnak nincs logikai funkciója
    console.log('📞 Red button pressed, but no active call or dialog to close.');
};    

// ===========================
// ChatGPT Settings Functions
// ===========================

function showChatGPTSettings() {
    if (!window.appManager) return;
    
    if (chatGPTSettingsOpen) {
        console.log('⚠️ ChatGPT Settings already open, ignoring');
        return;
    }
    
    let profileDisplayValue = 'Loading...';
    if (window.profileManager && window.profileManager.profiles.length > 0) {
        const profile = window.profileManager.getSelectedProfile();
        if (profile) {
            profileDisplayValue = `${profile.emoji} ${profile.name}`;
        } else {
            profileDisplayValue = 'No profile selected';
        }
    }
    
    // ✅ JAVÍTÁS: A 'new_session' került a lista elejére
    chatGPTSettingsItems = [
        {
            id: 'new_session',
            icon: '🔄',
            name: 'New Session'
        },
        {
            id: 'attach_image',
            icon: '📷',
            name: 'Attach Image'
        },
        { 
            id: 'model', 
            icon: '🧠', 
            name: 'AI Model', 
            value: (typeof MODELS !== 'undefined' && typeof selectedModel !== 'undefined') 
                ? MODELS[selectedModel] 
                : 'gpt-4.1-nano'
        },
        { 
            id: 'profile', 
            icon: '👤', 
            name: 'AI Profile', 
            value: profileDisplayValue
        },
        { 
            id: 't9_toggle', 
            icon: '⌨️', 
            name: 'T9 Mode', 
            value: (typeof t9Mode !== 'undefined') ? (t9Mode ? 'ON' : 'OFF') : 'OFF'
        },
        { 
            id: 't9_lang', 
            icon: '🌐', 
            name: 'T9 Language', 
            value: (typeof currentLang !== 'undefined') ? currentLang.toUpperCase() : 'EN'
        },
        {
            id: 'home',
            icon: '🏠',
            name: 'Back to Home'
        }
    ];
    
    const dialog = document.createElement('div');
    dialog.className = 'app-dialog settings-dialog chatgpt-settings-dialog';
    dialog.style.display = 'block';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'dialog-title';
    titleDiv.textContent = 'ChatGPT Settings';
    dialog.appendChild(titleDiv);
    
    const list = document.createElement('div');
    list.className = 'dialog-list settings-list';
    
    chatGPTSettingsItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'dialog-list-item settings-item';
        if (index === chatGPTSettingsIndex) itemDiv.classList.add('selected');
        itemDiv.setAttribute('data-index', index);
        
        const icon = document.createElement('span');
        icon.className = 'item-icon';
        icon.textContent = item.icon;
        
        const name = document.createElement('span');
        name.className = 'item-name';
        name.textContent = item.name;
        
        itemDiv.appendChild(icon);
        itemDiv.appendChild(name);
        
        if (item.value) {
            const value = document.createElement('span');
            value.className = 'item-value';
            value.textContent = item.value;
            itemDiv.appendChild(value);
        }
        
        list.appendChild(itemDiv);
    });
    
    dialog.appendChild(list);
    
    const hint = document.createElement('div');
    hint.className = 'dialog-hint';
    hint.textContent = '▲▼ Navigate | OK Select | Menu/C Back';
    dialog.appendChild(hint);
    
    const screen = document.querySelector('.screen');
    screen.appendChild(dialog);
    
    chatGPTSettingsOpen = true;
    
    setTimeout(() => {
        const container = dialog.querySelector('.dialog-list');
        const selectedItem = dialog.querySelector('.dialog-list-item.selected');
        if (container && selectedItem) {
            const itemTop = selectedItem.offsetTop;
            const itemHeight = selectedItem.offsetHeight;
            const containerHeight = container.clientHeight;
            
            container.scrollTop = Math.max(0, itemTop - (containerHeight / 2) + (itemHeight / 2));
        }
    }, 10);
    
    console.log('📋 ChatGPT Settings opened');
}

function closeChatGPTSettings() {
    chatGPTSettingsOpen = false;
    
    // Remove dialog from DOM
    const dialog = document.querySelector('.chatgpt-settings-dialog');
    if (dialog && dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
    }
    
    console.log('📋 ChatGPT Settings closed');
}

function navigateChatGPTSettings(direction) {
    if (!chatGPTSettingsOpen) return;
    
    const previousIndex = chatGPTSettingsIndex;
    
    if (direction === 'up') {
        chatGPTSettingsIndex = (chatGPTSettingsIndex - 1 + chatGPTSettingsItems.length) % chatGPTSettingsItems.length;
    } else if (direction === 'down') {
        chatGPTSettingsIndex = (chatGPTSettingsIndex + 1) % chatGPTSettingsItems.length;
    }
    
    // Check if we wrapped around
    const wrappedToStart = (direction === 'up' && previousIndex === 0);
    const wrappedToEnd = (direction === 'down' && chatGPTSettingsIndex === 0);
    
    // Update selection
    const items = document.querySelectorAll('.chatgpt-settings-dialog .dialog-list-item');
    items.forEach((item, index) => {
        item.classList.toggle('selected', index === chatGPTSettingsIndex);
    });
    
    // ✅ CENTERED SCROLL: Keep selected item centered
    const container = document.querySelector('.chatgpt-settings-dialog .dialog-list');
    const selectedElement = items[chatGPTSettingsIndex];
    
    if (container && selectedElement) {
        const itemTop = selectedElement.offsetTop;
        const itemHeight = selectedElement.offsetHeight;
        const containerHeight = container.clientHeight;
        
        if (wrappedToStart) {
            // Jumped to last item - scroll to bottom
            container.scrollTop = container.scrollHeight;
        } else if (wrappedToEnd) {
            // Jumped to first item - scroll to top
            container.scrollTop = 0;
        } else {
            // Normal navigation - keep item centered
            const targetScroll = itemTop - (containerHeight / 2) + (itemHeight / 2);
            container.scrollTop = Math.max(0, Math.min(targetScroll, container.scrollHeight - containerHeight));
        }
    }
    
    //playDTMF(direction === 'up' ? '2' : '8');
}

async function selectChatGPTSettingsItem() {
    if (!chatGPTSettingsOpen) return;
    
    const selectedItem = chatGPTSettingsItems[chatGPTSettingsIndex];
    
    switch(selectedItem.id) {
        case 'attach_image':
            closeChatGPTSettings();
            if (window.chatGPTImageHandler) {
                await window.chatGPTImageHandler.showImageAttachDialog(); // ✅ Now async
            }
            break;
            
        case 'model':
            if (typeof selectedModel !== 'undefined' && typeof MODELS !== 'undefined') {
                selectedModel = (selectedModel + 1) % MODELS.length;
                if (typeof saveToStorage === 'function') saveToStorage();
                
                // ✅ JAVÍTÁS: Az index 2-re változik (New Session=0, Attach Image=1, Model=2)
                updateChatGPTSettingsValue(2, MODELS[selectedModel]);
            }
            break;
            
        case 'profile':
            if (window.profileManager) {
                const dialog = document.querySelector('.chatgpt-settings-dialog');
                if (dialog) dialog.style.display = 'none';
                
                window.profileManager.showDialog();
                
                window.profileManager.onProfileChange = (profile) => {
                    console.log('Profile changed:', profile.name);
                    
                    if (dialog) dialog.style.display = 'block';
                    
                    // ✅ JAVÍTÁS: Az index 3-ra változik (New Session=0, Attach Image=1, Model=2, Profile=3)
                    updateChatGPTSettingsValue(3, `${profile.emoji} ${profile.name}`);
                    
                    window.profileManager.onProfileChange = null;
                };
                
                const originalCancelSelection = window.profileManager.cancelSelection.bind(window.profileManager);
                window.profileManager.cancelSelection = function() {
                    originalCancelSelection();
                    if (dialog) dialog.style.display = 'block';
                    window.profileManager.cancelSelection = originalCancelSelection;
                };
            }
            break;
            
        case 't9_toggle':
            if (typeof t9Mode !== 'undefined') {
                t9Mode = !t9Mode;
                const inputModeEl = document.getElementById('inputMode');
                if (inputModeEl) {
                    inputModeEl.textContent = t9Mode ? 'T9' : 'Abc';
                }
                if (typeof saveToStorage === 'function') saveToStorage();
                
                console.log('✅ T9 Mode toggled to:', t9Mode);
                
                // ✅ JAVÍTÁS: Az index 4-re változik (New Session=0, Attach Image=1, Model=2, Profile=3, T9 Mode=4)
                updateChatGPTSettingsValue(4, t9Mode ? 'ON' : 'OFF');
            }
            break;
            
        case 't9_lang':
            if (typeof currentLang !== 'undefined') {
                currentLang = currentLang === 'en' ? 'hu' : 'en';
                if (typeof dictionary !== 'undefined' && dictionary[currentLang].length === 0) {
                    if (typeof loadDictionary === 'function') {
                        loadDictionary(currentLang);
                    }
                }
                if (typeof saveToStorage === 'function') saveToStorage();
                
                console.log('✅ T9 Language changed to:', currentLang);
                
                // ✅ JAVÍTÁS: Az index 5-re változik (New Session=0, Attach Image=1, Model=2, Profile=3, T9 Mode=4, T9 Lang=5)
                updateChatGPTSettingsValue(5, currentLang.toUpperCase());
            }
            break;
            
        case 'new_session':
            closeChatGPTSettings();
            resetScreen('Session cleared!');
            break;
            
        case 'home':
            closeChatGPTSettings();
            window.appManager.showHomeScreen();
            break;
    }
}

// ✅ NEW HELPER: Update value without full refresh
function updateChatGPTSettingsValue(itemIndex, newValue) {
    const dialog = document.querySelector('.chatgpt-settings-dialog');
    if (!dialog) return;
    
    const item = dialog.querySelector(`[data-index="${itemIndex}"] .item-value`);
    if (item) {
        item.textContent = newValue;
    }
    
    // Also update in items array
    if (chatGPTSettingsItems[itemIndex]) {
        chatGPTSettingsItems[itemIndex].value = newValue;
    }
}

/**
 * ✅ JAVÍTOTT FÜGGVÉNY
 * A kurzor pozícióját számolja ki a Messages app textarea-jában.
 * Most már figyelembe veszi a 14px-es betűméretet és a görgetést is.
 */
function updateMessagesCursor() {
    const textarea = document.getElementById('messagesInputArea');
    const cursor = document.querySelector('.messages-cursor');
    
    if (!textarea || !cursor) return;

    // Létrehozunk egy rejtett div-et a méréshez, ha még nem létezik
    let mirrorDiv = document.getElementById('textarea-mirror-div');
    if (!mirrorDiv) {
        mirrorDiv = document.createElement('div');
        mirrorDiv.id = 'textarea-mirror-div';
        mirrorDiv.style.position = 'absolute';
        mirrorDiv.style.visibility = 'hidden';
        mirrorDiv.style.pointerEvents = 'none';
        mirrorDiv.style.top = '-9999px';
        mirrorDiv.style.left = '-9999px';
        document.body.appendChild(mirrorDiv);
    }

    const style = window.getComputedStyle(textarea);
    
    // Lemásoljuk a textarea stílusait, amik befolyásolják az elrendezést
    mirrorDiv.style.width = textarea.clientWidth + 'px';
    mirrorDiv.style.font = style.font;
    mirrorDiv.style.lineHeight = style.lineHeight;
    mirrorDiv.style.padding = style.padding;
    mirrorDiv.style.letterSpacing = style.letterSpacing;
    mirrorDiv.style.wordWrap = 'break-word';
    mirrorDiv.style.whiteSpace = 'pre-wrap';
    mirrorDiv.style.border = style.border;

    const text = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    // A kurzor előtti szöveg, HTML-kódolva
    const textBeforeCursor = text.substring(0, cursorPos)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

    mirrorDiv.innerHTML = textBeforeCursor + '<span id="cursor-pos-span"></span>';
    
    const posSpan = document.getElementById('cursor-pos-span');
    
    // A span pozíciója a mérő div-en belül
    const cursorLeft = posSpan.offsetLeft;
    const cursorTop = posSpan.offsetTop;

    // A kurzor pozícióját a textarea görgetésével korrigáljuk
    const scrollTop = textarea.scrollTop;

    cursor.style.left = cursorLeft + 'px';
    cursor.style.top = (cursorTop - scrollTop) + 'px';

    // ✅ ÚJ: Automatikus görgetés a kurzor láthatóságáért
    const cursorHeight = cursor.offsetHeight;
    const visibleTop = textarea.scrollTop;
    const visibleBottom = textarea.scrollTop + textarea.clientHeight;

    // Ha a kurzor a látható terület fölé került
    if (cursorTop < visibleTop) {
        textarea.scrollTop = cursorTop;
    }
    // Ha a kurzor a látható terület alá került
    else if (cursorTop + cursorHeight > visibleBottom) {
        textarea.scrollTop = cursorTop + cursorHeight - textarea.clientHeight;
    }
}