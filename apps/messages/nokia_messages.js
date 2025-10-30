/**
 * Nokia Messages App
 * SMS-style messaging with AI profiles
 */

class NokiaMessages {
    constructor() {
        this.isActive = false;
        this.settingsOpen = false;
        this.viewMode = 'threads'; // 'threads' or 'conversation'
        this.currentThread = null;
        this.currentProfile = null;
        this.threadsIndex = 0;
        this.settingsIndex = 0;
        this.container = null;
        
        // ✅ SAJÁT input változók - NEM a globálist használja!
        this.messageInput = '';
        this.messageCursor = 0;
        this.inputMode = 'compose'; // 'compose' or 'viewing'
        
        // Settings items - these will be populated dynamically
        this.settingsItems = [];
        
        // ✅ ÚJ: Image handler
        this.imageHandler = new MessagesImageHandler(this);
    }

    show() {
        this.isActive = true;
        this.viewMode = 'threads';
        this.createUI();
        this.renderThreadsList();
        console.log('✅ Messages app opened');
    }

    hide(skipHomeScreen = false) {
        this.isActive = false;
        this.settingsOpen = false;
        this.viewMode = 'threads';
        this.currentThread = null;
        this.currentProfile = null;
        
        // Clean up DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        
        // Clear global input
        if (typeof currentInput !== 'undefined') {
            window.currentInput = '';
            window.cursorPosition = 0;
            if (typeof updateDisplay === 'function') updateDisplay();
        }
        
/*         // Return to home
        if (window.appManager) {
            window.appManager.showHomeScreen();
        } */

        // ✅ JAVÍTÁS: Csak akkor megyünk home screen-re, ha nem skínullázuk
        if (!skipHomeScreen && window.appManager) {
            window.appManager.showHomeScreen();
        }            
        
        console.log('✅ Messages app closed');
    }

    createUI() {
        const screen = document.querySelector('.screen');
        
        // Hide other screens
        const homeScreen = document.getElementById('homeScreen');
        const screenContent = document.getElementById('screenContent');
        if (homeScreen) homeScreen.classList.add('hidden');
        if (screenContent) screenContent.classList.add('hidden');
        
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'messages-container';
        this.container.innerHTML = `
            <div class="messages-content">
                <!-- Content will be dynamically rendered -->
            </div>
            <div class="messages-hint">
                <!-- Hint will be dynamically rendered -->
            </div>
        `;
        
        screen.appendChild(this.container);
    }

    renderThreadsList() {
        const content = this.container.querySelector('.messages-content');
        if (!content) return;

        let threads = window.messagesStorage.getAllThreads();
        
        // ✅ ÚJ: Rendezzük időrendi sorrendben ÉS az olvasatlanokat előre
        threads = threads.sort((a, b) => {
            // Először: olvasatlanok előre
            if (a.unread && !b.unread) return -1;
            if (!a.unread && b.unread) return 1;
            // Utána: legfrissebb elöl
            return b.lastMessageTime - a.lastMessageTime;
        });

        if (threads.length === 0) {
            content.innerHTML = `
                <div class="messages-empty">
                    <div class="empty-icon">📭</div>
                    <div class="empty-text">No messages</div>
                    <div class="empty-hint">Menu → New Message</div>
                </div>
            `;
            
            // Update hint
            const hint = this.container.querySelector('.messages-hint');
            if (hint) {
                hint.textContent = 'Menu New Message | C Back';
            }
            return;
        }

        // Render threads list
        let html = '<div class="threads-list">';
        
        threads.forEach((thread, index) => {
            const lastMsg = thread.messages[thread.messages.length - 1];
            const preview = lastMsg 
                ? (lastMsg.content.substring(0, 40) + (lastMsg.content.length > 40 ? '...' : ''))
                : 'No messages yet';
            
            const selected = (index === this.threadsIndex) ? 'selected' : '';
            const unreadIndicator = thread.unread > 0 ? '<span class="thread-unread-indicator">📨</span>' : '';
            
            html += `
                <div class="thread-item ${selected}" data-index="${index}">
                    <div class="thread-header">
                        <span class="thread-emoji">${thread.emoji}</span>
                        <span class="thread-name">${thread.name}</span>
                        ${unreadIndicator}
                    </div>
                    <div class="thread-preview">${preview}</div>
                </div>
            `;
        });
        
        html += '</div>';
        content.innerHTML = html;

        // Update hint
        const hint = this.container.querySelector('.messages-hint');
        if (hint) {
            hint.textContent = '▲▼ Navigate | OK Open | Menu Options';
        }
    }

    navigateThreads(direction) {
        if (this.viewMode !== 'threads') return;

        const threads = window.messagesStorage.getAllThreads();
        if (threads.length === 0) return;

        const previousIndex = this.threadsIndex;

        if (direction === 'up') {
            this.threadsIndex = (this.threadsIndex - 1 + threads.length) % threads.length;
        } else if (direction === 'down') {
            this.threadsIndex = (this.threadsIndex + 1) % threads.length;
        }

        // Update selection
        const items = this.container.querySelectorAll('.thread-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.threadsIndex);
        });

        // Centered scroll
        const wrappedToStart = (direction === 'up' && previousIndex === 0);
        const wrappedToEnd = (direction === 'down' && this.threadsIndex === 0);
        
        const container = this.container.querySelector('.threads-list');
        const selectedElement = items[this.threadsIndex];
        
        if (container && selectedElement) {
            if (wrappedToStart) {
                container.scrollTop = container.scrollHeight;
            } else if (wrappedToEnd) {
                container.scrollTop = 0;
            } else {
                const itemTop = selectedElement.offsetTop;
                const itemHeight = selectedElement.offsetHeight;
                const containerHeight = container.clientHeight;
                const targetScroll = itemTop - (containerHeight / 2) + (itemHeight / 2);
                container.scrollTop = Math.max(0, Math.min(targetScroll, container.scrollHeight - containerHeight));
            }
        }

        /* if (typeof playDTMF !== 'undefined') {
            playDTMF(direction === 'up' ? '2' : '8');
        } */
    }

    openThread() {
        if (this.viewMode !== 'threads') return;

        const threads = window.messagesStorage.getAllThreads();
        if (threads.length === 0) return;

        // ✅ JAVÍTÁS: Mindig a friss thread-et töltsük be a storage-ból!
        const selectedThread = threads[this.threadsIndex];
        this.currentThread = window.messagesStorage.getThread(selectedThread.profileId);
        
        // Find profile from profileManager
        if (window.profileManager) {
            this.currentProfile = window.profileManager.profiles.find(
                p => p.filename === this.currentThread.profileId
            );
        }

        this.viewMode = 'conversation';
        this.inputMode = 'compose';
        
        // ✅ Inicializáljuk a saját input-ot
        this.messageInput = '';
        this.messageCursor = 0;
        
        // ✅ ÚJ: Töröljük az olvasatlan jelzést
        window.messagesStorage.setUnreadStatus(this.currentThread.profileId, false);
        if (window.messagesStorage.updateNewMessageIndicator) {
            window.messagesStorage.updateNewMessageIndicator();
        }
        
        this.renderConversation();

        /* if (typeof playDTMF !== 'undefined') playDTMF('5'); */
    }

    renderConversation() {
        const content = this.container.querySelector('.messages-content');
        if (!content) return;

        let html = `
            <div class="conversation-header">
                <span class="conv-emoji">${this.currentThread.emoji}</span>
                <span class="conv-name">${this.currentThread.name}</span>
            </div>
            <div class="conversation-messages">
        `;

        this.currentThread.messages.forEach((msg) => {
            const msgClass = msg.role === 'user' ? 'msg-user' : 'msg-ai';
            
            // ✅ Konvertáljuk a linkeket
            const contentHtml = (typeof convertUrlsToLinks === 'function')
                ? convertUrlsToLinks(this.escapeHtml(msg.content))
                : this.escapeHtml(msg.content);
            
            html += `<div class="message-bubble ${msgClass}">`;
            html += `<div class="msg-text">${contentHtml}</div>`;
            
            // ✅ ÚJ: Képek megjelenítése permanensen (ha van images tömb)
            // NOTE: This will be rendered async later
            if (msg.images && msg.images.length > 0) {
                msg.images.forEach(attachmentId => {
                    html += `<img data-attachment-id="${attachmentId}" class="msg-image msg-image-loading" style="max-width: 100%; height: 32px; border-radius: 4px; margin-top: 4px; filter: grayscale(100%); display: block; align-self: end;" />`;
                });
            }
            
            // ✅ ÚJ: Timestamp és status megjelenítése permanensen
            if (msg.timestamp) {
                const date = new Date(msg.timestamp);
                const timeString = this.formatSmartTimestamp(date);
                
                let statusText = '';
                if (msg.role === 'user' && msg.status) {
                    // User messages: show status + time
                    const statusEmoji = msg.status === 'sent' ? '📤' : msg.status === 'received' ? '📥' : '✅';
                    statusText = `${statusEmoji} ${msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}, ${timeString}`;
                } else if (msg.role === 'assistant') {
                    // AI messages: just time
                    statusText = timeString;
                }
                
                if (statusText) {
                    html += `<div class="msg-timestamp">${statusText}</div>`;
                }
            }
            
            html += `</div>`;
        });

        html += '</div>';

        // ✅ EGYSZERŰ MEGOLDÁS: Textarea input!
        html += `
            <div class="conversation-input">
                <span class="input-prompt">&gt;</span>
                <div class="messages-input-wrapper">
                    <textarea id="messagesInputArea" class="messages-input-area" rows="1" readonly></textarea>
                    <span class="messages-cursor"></span>
                </div>
            </div>
        `;

        content.innerHTML = html;

        // Scroll to bottom
        const messagesDiv = content.querySelector('.conversation-messages');
        if (messagesDiv) {
            setTimeout(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 50);
            
            // ✅ Újabb scroll később is, hogy biztosan alul legyen
            setTimeout(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 200);
        }

        // ✅ Textarea setup: restore value
        const textarea = document.getElementById('messagesInputArea');
        if (textarea) {
            // Restore previous input
            textarea.value = this.messageInput || '';
            
            // ✅ Dinamikusan frissítjük a magasságot
            this.updateTextareaHeight(textarea);
        }
        
        // ✅ ÚJ: Frissítsük a kép indikátort, ha van csatolt kép
        this.updateInputWithImageIndicator();

        // Update hint
        const hint = this.container.querySelector('.messages-hint');
        if (hint) {
            hint.textContent = 'OK Send | C Back | Menu Options';
        }
        
        // ✅ Async: Load images from IndexedDB
        this.loadMessageImages();
    }
    
    /**
     * ✅ Async load images from IndexedDB after rendering
     */
    async loadMessageImages() {
        const imageElements = this.container.querySelectorAll('.msg-image-loading');
        for (const imgEl of imageElements) {
            const attachmentId = imgEl.getAttribute('data-attachment-id');
            if (attachmentId && window.imageAttachments) {
                try {
                    const imageData = await window.imageAttachments.getMessageImage(attachmentId);
                    if (imageData) {
                        imgEl.src = imageData.retro;
                        imgEl.classList.remove('msg-image-loading');
                    }
                } catch (error) {
                    console.error('Failed to load image:', attachmentId, error);
                }
            }
        }
    }

 _addMessageToUI(message) {
        const messagesDiv = this.container.querySelector('.conversation-messages');
        if (!messagesDiv) return null;

        const msgClass = message.role === 'user' ? 'msg-user' : 'msg-ai';
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${msgClass}`;

        const textDiv = document.createElement('div');
        textDiv.className = 'msg-text';
        
        // ✅ Konvertáljuk a linkeket
        const htmlContent = (typeof convertUrlsToLinks === 'function')
            ? convertUrlsToLinks(this.escapeHtml(message.content))
            : this.escapeHtml(message.content);
        textDiv.innerHTML = htmlContent;

        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'msg-timestamp';
        
        const date = new Date(message.timestamp);
        const timeString = date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', hour12: false });

        timestampDiv.textContent = (message.role === 'user') ? `Received, ${timeString}` : timeString;

        bubble.appendChild(textDiv);
        bubble.appendChild(timestampDiv);
        messagesDiv.appendChild(bubble);

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        return bubble;
    }

    
    
    // ✅ JAVÍTOTT sendMessage METÓDUS A TELJES INTEGRÁCIÓVAL
    async sendMessage() {
        return this._sendMessageInternal(false);
    }

    /**
     * ✅ Internal send message method
     * @param {boolean} isBackgroundCall - True if called from background handler
     */
    async _sendMessageInternal(isBackgroundCall = false) {
        if (!this.currentProfile) {
            console.error('❌ No current profile set!');
            return;
        }
        const sanitizeInput = (input) => {
            return DOMPurify.sanitize(input);
        };        
        // ✅ Ha háttérben fut, NEM kell textarea, csak API hívás
        if (!isBackgroundCall) {
            if (this.viewMode !== 'conversation') return;
            
            const textarea = document.getElementById('messagesInputArea');
            if (!textarea) return;
            
            let messageText = textarea.value.trim();
            
            // ✅ ÚJ: Távolítsuk el a kép indikátort a szövegből
            if (messageText.startsWith('🖼️: ')) {
                messageText = messageText.substring(4).trim();
            }
            
            // ✅ SANITIZE + EMOJI CONVERSION
            // 1. Először szanitizáljuk a bemenetet a biztonság érdekében.
            //    Feltételezzük, hogy a sanitizeInput globálisan elérhető.
            messageText = sanitizeInput(messageText);

            // 2. A már biztonságos szövegen végezzük el az emoji konverziót.
            if (typeof window.convertToEmoji === 'function') {
                messageText = window.convertToEmoji(messageText);
            }

            /* // ✅ EMOJI CONVERSION: Konvertáljuk a text shortcutokat emoji-kra
            if (typeof window.convertToEmoji === 'function') {
                messageText = window.convertToEmoji(messageText);
            } */
            
            // ✅ Ellenőrizzük, van-e csatolt kép, vagy van-e szöveg
            const hasAttachment = this.imageHandler.hasPendingAttachment();
            if (!messageText && !hasAttachment) return;
        
            // T9 szó mentése
            if (messageText) {
                const lastWord = messageText.split(/[\s\n]/).pop();
                const cleanedWord = lastWord.replace(/[^\p{L}]/gu, '');
                if (cleanedWord && !dictionary[currentLang].includes(cleanedWord.toLowerCase())) {
                    saveCustomWord(cleanedWord);
                }
            }
        
            // 1. ✅ UNIFIED HISTORY: Context ID generálása
            const contextId = window.unifiedHistoryManager.getContextId(this.currentProfile.filename);

            // Ha van kép, mentjük el
            let imageAttachmentIds = null;
            if (hasAttachment && this.imageHandler.pendingImageAttachment) {
                const attachmentId = await window.imageAttachments.saveMessageImage(
                    {
                        full: this.imageHandler.pendingImageAttachment.full,
                        retro: this.imageHandler.pendingImageAttachment.retro
                    },
                    this.currentProfile.filename
                );
                imageAttachmentIds = [attachmentId];
                console.log('✅ Messages image saved with ID:', attachmentId);
            }

            // ✅ UNIFIED HISTORY: User üzenet mentése
            window.unifiedHistoryManager.addMessage(contextId, {
                role: 'user',
                content: messageText || '[Image]',
                type: 'text',
                metadata: {
                    app: 'messages',
                    profileName: this.currentProfile.name,
                    attachmentIds: imageAttachmentIds,
                    status: 'sent'
                }
            });

            // Legacy: Thread storage (later migration)
            window.messagesStorage.addMessage(
                this.currentProfile.filename,
                { emoji: this.currentProfile.emoji, name: this.currentProfile.name }, 
                'user', 
                messageText || '[Image]',
                imageAttachmentIds
            );
        
            // 2. Input mező ürítése
            textarea.value = '';
            this.messageInput = '';
            this.messageCursor = 0;
            this.updateTextareaHeight(textarea);
            
            // ✅ Töröljük a pending image attachment-et!
            if (hasAttachment && this.imageHandler) {
                this.imageHandler.clearPendingAttachment();
            }
            
            // ✅ ÚJ: Töröljük az indikátort is!
            this.updateInputWithImageIndicator();
            
            // 3. ✅ UI FRISSÍTÉS: Frissítsük a thread-et és AZONNAL rendereljük!
            this.currentThread = window.messagesStorage.getThread(this.currentProfile.filename);
            this.renderConversation();
            
            console.log('✅ User message rendered on UI');
            
            // 4. ✅ Indítsuk el a háttérfeldolgozást
            const profileId = this.currentProfile.filename;
            const messageIndex = window.messagesStorage.getThread(profileId).messages.length - 1;
            const profileData = { emoji: this.currentProfile.emoji, name: this.currentProfile.name };
            
            if (window.messagesBackgroundHandler) {
                window.messagesBackgroundHandler.startBackgroundProcessing(
                    profileId,
                    messageIndex,
                    profileData
                );
            }
            
            // Kész vagyunk, visszatérünk
            return;
        }
    }

 showTypingIndicator() {
        const messagesDiv = this.container.querySelector('.conversation-messages');
        if (!messagesDiv) return null;

        if (messagesDiv.querySelector('.typing-indicator')) {
            return messagesDiv.querySelector('.typing-indicator');
        }

        const indicator = document.createElement('div');
        indicator.className = 'message-bubble msg-ai typing-indicator';
        indicator.innerHTML = '<div class="msg-text">...</div>';
        messagesDiv.appendChild(indicator);

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        return indicator;
    }

    backToThreads() {
        this.viewMode = 'threads';
        this.currentThread = null;
        this.currentProfile = null;
        this.inputMode = 'viewing';
        
        // Clear global input
        if (typeof currentInput !== 'undefined') {
            window.currentInput = '';
            window.cursorPosition = 0;
            if (typeof updateDisplay === 'function') updateDisplay();
        }

        this.renderThreadsList();

        //if (typeof playDTMF !== 'undefined') playDTMF('1');
    }

    // Settings

    showSettings() {
        if (this.settingsOpen) return;

        this.settingsOpen = true;
        this.settingsIndex = 0;
        
         // ✅ ÚJ: Dinamikusan felépítjük a menüt
        this.settingsItems = [];
        
        // ✅ ÚJ: Ha conversation nézetben vagyunk, adjuk hozzá a Call opciót ELŐSZÖR!
        if (this.viewMode === 'conversation' && this.currentProfile) {
            this.settingsItems.push({ 
                id: 'call_profile', 
                icon: '📞', 
                name: `Call ${this.currentProfile.name}` 
            });
        }
        
        this.settingsItems.push({ id: 'new_message', icon: '✉️', name: 'New Message' });

        if (this.viewMode === 'conversation') {
            this.settingsItems.push({ id: 'attach_image', icon: '📷', name: 'Attach Image' });
        }
        
        this.settingsItems.push(
            { id: 't9_toggle', icon: '⌨️', name: 'T9 Mode', value: t9Mode ? 'ON' : 'OFF' },
            { id: 't9_lang', icon: '🌐', name: 'T9 Language', value: currentLang.toUpperCase() }
        );

        if (this.viewMode === 'conversation') {
            this.settingsItems.push({ id: 'delete_thread', icon: '🗑️', name: 'Delete Thread' });
        }
        
        //this.settingsItems.push({ id: 'back', icon: '⬅️', name: 'Back' });

        const dialog = document.createElement('div');
        dialog.className = 'app-dialog messages-settings-dialog';
        dialog.style.display = 'block';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'dialog-title';
        titleDiv.textContent = 'Message Options';
        
        dialog.appendChild(titleDiv);

        const list = document.createElement('div');
        list.className = 'dialog-list settings-list';

        this.settingsItems.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            // ✅ A `settings-item` class-t csak akkor adjuk hozzá, ha van `value`
            itemDiv.className = `dialog-list-item ${item.value ? 'settings-item' : ''}`;
            if (index === this.settingsIndex) itemDiv.classList.add('selected');
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
        hint.textContent = '▲▼ Navigate | OK Select | C/Menu Back';
        dialog.appendChild(hint);

        const screen = document.querySelector('.screen');
        screen.appendChild(dialog);

        /* if (typeof playDTMF !== 'undefined') playDTMF('5'); */
    }

    closeSettings() {
        if (!this.settingsOpen) return;

        this.settingsOpen = false;

        const dialog = document.querySelector('.messages-settings-dialog');
        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
    }

    navigateSettings(direction) {
        if (!this.settingsOpen) return;

        const previousIndex = this.settingsIndex;

        if (direction === 'up') {
            this.settingsIndex = (this.settingsIndex - 1 + this.settingsItems.length) % this.settingsItems.length;
        } else if (direction === 'down') {
            this.settingsIndex = (this.settingsIndex + 1) % this.settingsItems.length;
        }

        const items = document.querySelectorAll('.messages-settings-dialog .dialog-list-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.settingsIndex);
        });

        // Centered scroll
        const wrappedToStart = (direction === 'up' && previousIndex === 0);
        const wrappedToEnd = (direction === 'down' && this.settingsIndex === 0);

        const container = document.querySelector('.messages-settings-dialog .dialog-list');
        const selectedElement = items[this.settingsIndex];

        if (container && selectedElement) {
            if (wrappedToStart) {
                container.scrollTop = container.scrollHeight;
            } else if (wrappedToEnd) {
                container.scrollTop = 0;
            } else {
                const itemTop = selectedElement.offsetTop;
                const itemHeight = selectedElement.offsetHeight;
                const containerHeight = container.clientHeight;
                const targetScroll = itemTop - (containerHeight / 2) + (itemHeight / 2);
                container.scrollTop = Math.max(0, Math.min(targetScroll, container.scrollHeight - containerHeight));
            }
        }

        /* if (typeof playDTMF !== 'undefined') {
            playDTMF(direction === 'up' ? '2' : '8');
        } */
    }

    async selectSettingsItem() {
        if (!this.settingsOpen) return;

        const selectedItem = this.settingsItems[this.settingsIndex];

        /* if (typeof playDTMF !== 'undefined') playDTMF('5'); */

        switch (selectedItem.id) {
            case 'call_profile':
                console.log('📞 Messages Options: Call Profile selected');
                console.log('Current Profile:', this.currentProfile);
                console.log('Current Thread:', this.currentThread);
                
                this.closeSettings();
                
                // ✅ JAVÍTÁS: ÚJRA LEKÉRJÜK a profilt a profileManager-ből!
                // Ez biztosítja, hogy pontosan ugyanazt a profil objektumot használjuk,
                // mint a Phone App.
                let profileToCall = null;
                
                if (this.currentThread && window.profileManager) {
                    // Első próbálkozás: profileId alapján
                    profileToCall = window.profileManager.profiles.find(
                        p => p.filename === this.currentThread.profileId
                    );
                    
                    // Ha nem találtuk, próbáljuk név alapján
                    if (!profileToCall && this.currentProfile) {
                        profileToCall = window.profileManager.profiles.find(
                            p => p.name === this.currentProfile.name
                        );
                    }
                }
                
                console.log('✅ Profile resolved from ProfileManager:', profileToCall);
                
                if (profileToCall && window.startVoiceCallWithProfile) {
                    this.hide(true); // ✅ Skip home screen!
                    await window.startVoiceCallWithProfile(profileToCall);
                } else {
                    console.error('❌ Cannot start call: profile not found in ProfileManager');
                    console.error('currentThread.profileId:', this.currentThread?.profileId);
                    console.error('Available profiles:', window.profileManager?.profiles.map(p => p.filename));
                }
                break;

            case 'new_message':
                this.closeSettings();
                this.showNewMessageDialog();
                break;
            case 'attach_image':
                this.closeSettings();
                await this.imageHandler.showImageAttachDialog(); // ✅ Now async
                break;
            case 'delete_thread':
                this.closeSettings();
                this.confirmDeleteThread();
                break;
            case 'back':
                this.closeSettings();
                // Ha conversation nézetben vagyunk, a back visszavisz a thread listára
                if (this.viewMode === 'conversation') {
                    this.backToThreads();
                }
                break;
            case 't9_toggle':
                t9Mode = !t9Mode;
                document.getElementById('inputMode').textContent = t9Mode ? 'T9' : 'Abc';
                saveToStorage();
                this.updateSettingsValue(this.settingsIndex, t9Mode ? 'ON' : 'OFF');
                break;
            case 't9_lang':
                currentLang = currentLang === 'en' ? 'hu' : 'en';
                if (dictionary[currentLang].length === 0) {
                    loadDictionary(currentLang);
                }
                saveToStorage();
                this.updateSettingsValue(this.settingsIndex, currentLang.toUpperCase());
                break;
        }
    }
    
    // ✅ ÚJ segédfüggvény az értékek frissítéséhez
    updateSettingsValue(itemIndex, newValue) {
        const dialog = document.querySelector('.messages-settings-dialog');
        if (!dialog) return;
        
        const item = dialog.querySelector(`[data-index="${itemIndex}"] .item-value`);
        if (item) {
            item.textContent = newValue;
        }
        
        // Frissítjük a belső állapotot is
        if (this.settingsItems[itemIndex]) {
            this.settingsItems[itemIndex].value = newValue;
        }
    }

    // New message (select profile)

    showNewMessageDialog() {
        if (!window.profileManager) return;

        const dialog = document.createElement('div');
        dialog.className = 'app-dialog messages-new-dialog';
        dialog.style.display = 'block';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'dialog-title';
        titleDiv.textContent = 'New Message To:';
        dialog.appendChild(titleDiv);

        const list = document.createElement('div');
        list.className = 'dialog-list';

        window.profileManager.profiles.forEach((profile, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dialog-list-item';
            if (index === 0) itemDiv.classList.add('selected');
            itemDiv.setAttribute('data-index', index);

            // ✅ JAVÍTÁS: Emoji és név külön span elemekben
            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'dialog-list-item-emoji';
            emojiSpan.textContent = profile.emoji;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'dialog-list-item-name';
            nameSpan.textContent = ' ' + profile.name;

            itemDiv.appendChild(emojiSpan);
            itemDiv.appendChild(nameSpan);

            list.appendChild(itemDiv);
        });

        dialog.appendChild(list);

        const hint = document.createElement('div');
        hint.className = 'dialog-hint';
        hint.textContent = '▲▼ Navigate | OK Select | C Cancel';
        dialog.appendChild(hint);

        const screen = document.querySelector('.screen');
        screen.appendChild(dialog);

        // Store context for navigation
        window.messagesNewDialogIndex = 0;
        window.messagesNewDialogActive = true;
    }

    selectNewMessageProfile(profileIndex) {
        if (!window.profileManager) return;

        const profile = window.profileManager.profiles[profileIndex];
        if (!profile) return;

        // Close dialog
        const dialog = document.querySelector('.messages-new-dialog');
        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
        window.messagesNewDialogActive = false;

        // Check if thread exists
        let thread = window.messagesStorage.getThread(profile.filename);
        
        if (!thread) {
            // Create new empty thread
            window.messagesStorage.saveThread(
                profile.filename,
                { emoji: profile.emoji, name: profile.name },
                []
            );
            thread = window.messagesStorage.getThread(profile.filename);
        }

        // Open conversation
        this.currentThread = thread;
        this.currentProfile = profile;
        this.viewMode = 'conversation';
        this.inputMode = 'compose';
        this.renderConversation();

        /* if (typeof playDTMF !== 'undefined') playDTMF('5'); */
    }

    // Confirm actions

confirmDeleteThread() {
    // ✅ JAVÍTÁS: Az új, általános megerősítő dialógust használjuk
    if (typeof showConfirmationDialog === 'function') {
        showConfirmationDialog('Delete this entire thread?', () => {
            if (this.currentThread && this.currentThread.profileId) {
                console.log('🗑️ Deleting thread:', this.currentThread.profileId);
                window.messagesStorage.deleteThread(this.currentThread.profileId);
                
                this.threadsIndex = 0;
                this.backToThreads();
            }
        });
    } else {
        // Fallback, ha a segédfüggvény nem található
        if (confirm('Delete this entire thread?')) {
            if (this.currentThread && this.currentThread.profileId) {
                window.messagesStorage.deleteThread(this.currentThread.profileId);
                this.threadsIndex = 0;
                this.backToThreads();
            }
        }
    }
}

    showConfirmDialog(message, onConfirm) {
        const confirmDialog = document.getElementById('confirmDialog');
        const confirmText = document.getElementById('confirmText');

        if (!confirmDialog || !confirmText) return;

        confirmText.textContent = message;
        confirmDialog.classList.remove('hidden');

        const optionYes = document.getElementById('optionYes');
        const optionNo = document.getElementById('optionNo');

        if (optionYes) optionYes.classList.add('selected');
        if (optionNo) optionNo.classList.remove('selected');

        // Set flag for handler
        window.messagesConfirmPending = true;
        window.messagesConfirmCallback = onConfirm;
        window.isDialogActive = true;
    }

    /**
     * ✅ ÚJ: Frissíti az input field-et a kép indikátorral
     */
    updateInputWithImageIndicator() {
        const textarea = document.getElementById('messagesInputArea');
        if (!textarea) return;

        const hasAttachment = this.imageHandler && this.imageHandler.hasPendingAttachment();
        const currentValue = textarea.value;
        const startsWithIndicator = currentValue.startsWith('🖼️: ');

        if (hasAttachment && !startsWithIndicator) {
            // Adjád hozzá az indikátort
            textarea.value = '🖼️: ' + currentValue;
            this.messageInput = textarea.value;
            // ✅ FONTOS: Frissítsük a kurzort is!
            if (typeof updateMessagesCursor === 'function') {
                updateMessagesCursor();
            }
        } else if (!hasAttachment && startsWithIndicator) {
            // Távolítsd el az indikátort
            textarea.value = currentValue.substring(4); // '🖼️: ' = 4 karakter
            this.messageInput = textarea.value;
            // ✅ FONTOS: Frissítsük a kurzort is!
            if (typeof updateMessagesCursor === 'function') {
                updateMessagesCursor();
            }
        }
        
        this.updateTextareaHeight(textarea);
    }

    // Utility

    /**
     * ✅ JAVÍTOTT FÜGGVÉNY
     * Intelligensen méretezi a textarea magasságát a tartalom alapján.
     */
    updateTextareaHeight(textarea) {
        if (!textarea) return;

        // Reseteljük a magasságot, hogy a böngésző újra tudja számolni a scrollHeight-ot
        textarea.style.height = 'auto';

        // A magasságot a tartalom valós magasságára állítjuk.
        // A CSS-ben megadott `max-height` korlátozni fogja a növekedést.
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    // Image attachment

    showImageAttachDialog() {
        // ✅ A Messages Image Handler-ben van implementálva!
        if (this.imageHandler) {
            this.imageHandler.showImageAttachDialog();
        }
    }

    /**
     * ✅ VÉGLEGES: Smart timestamp - MINDIG óra:perc-cel!
     * - Ma: csak idő (13:45)
     * - Tegnap: Yesterday + idő (Yesterday, 13:45)
     * - Bármikor más: dátum + idő (Oct 25, 13:45)
     */
    formatSmartTimestamp(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        const diffMs = today - msgDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        // Óra:perc formátum (13:45)
        const timeString = date.toLocaleTimeString('hu-HU', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        });
        
        if (diffDays === 0) {
            // Ma: csak idő
            return timeString;
        } else if (diffDays === 1) {
            // Tegnap: "Yesterday, 13:45"
            return `Yesterday, ${timeString}`;
        } else {
            // Bármikor más (2 napja, 10 napja, tavaly): "Oct 25, 13:45"
            const dateString = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            return `${dateString}, ${timeString}`;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
window.nokiaMessages = new NokiaMessages();