/**
 * Nokia Phone App
 * Dedicated phone application with Call History and Contacts
 */

class NokiaPhoneApp {
    constructor() {
        this.isActive = false;
        this.currentView = 'history'; // 'history' or 'contacts'
        this.historyIndex = 0;
        this.contactsIndex = 0;
        this.callHistory = [];
        this.contacts = [];
        this.container = null;
        this.loadCallHistory();
        this.loadContacts();
    }

    // Load call history from storage
    loadCallHistory() {
        try {
            const saved = localStorage.getItem('nokia_call_history');
            this.callHistory = saved ? JSON.parse(saved) : [];
            // Sort by timestamp, newest first
            this.callHistory.sort((a, b) => b.timestamp - a.timestamp);
        } catch (e) {
            console.error('Failed to load call history:', e);
            this.callHistory = [];
        }
    }

    // Save call history to storage
    saveCallHistory() {
        try {
            localStorage.setItem('nokia_call_history', JSON.stringify(this.callHistory));
        } catch (e) {
            console.error('Failed to save call history:', e);
        }
    }

    // Load contacts (from profile manager)
/*     loadContacts() {
        if (window.profileManager && window.profileManager.profiles) {
            this.contacts = window.profileManager.profiles.map(p => ({
                id: p.id,
                name: p.name,
                emoji: p.emoji,
                prompt: p.prompt
            }));
        } else {
            this.contacts = [];
        }
    } */

        // Load contacts (from profile manager)
    loadContacts() {
        if (window.profileManager && window.profileManager.profiles) {
            this.contacts = window.profileManager.profiles.map(p => ({
                id: p.filename, // JAVÍTVA: A profil egyedi azonosítója a 'filename'.
                name: p.name,
                emoji: p.emoji,
                prompt: p.prompt
            }));
        } else {
            this.contacts = [];
        }
    }

    // Add new call to history
    addCallToHistory(contactName, contactEmoji, duration, transcript, cost) {
        const call = {
            id: Date.now(),
            timestamp: Date.now(),
            contactName: contactName || 'AI',
            contactEmoji: contactEmoji || '🤖',
            duration: duration,
            transcript: transcript || [],
            cost: cost || null
        };
        
        this.callHistory.unshift(call);
        
        // Keep only last 50 calls
        if (this.callHistory.length > 50) {
            this.callHistory = this.callHistory.slice(0, 50);
        }
        
        this.saveCallHistory();
    }

    // Show phone app
    show() {
        console.log('📱 Opening Phone App');
        this.loadContacts();
        
        // ✅ JAVÍTÁS: Értesítsük az App Manager-t, hogy a Phone App aktív
        if (window.appManager) {
            window.appManager.currentApp = 'phone';
            window.appManager.hideAllScreens();
        }
        
        this.isActive = true;
        this.currentView = 'history';
        this.historyIndex = 0;
        this.contactsIndex = 0;
        
        this.createUI();
        this.updateUI();
    }

    // Hide phone app
    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
        }
        this.isActive = false;
        console.log('📱 Phone App closed');
    }

    // Create UI
    createUI() {
        // Remove existing container if any
        const existing = document.getElementById('phoneAppContainer');
        if (existing) {
            existing.remove();
        }

        const screen = document.querySelector('.screen');
        if (!screen) return;

        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'phoneAppContainer';
        this.container.className = 'phone-app-container';

        // Create header
        const header = document.createElement('div');
        header.className = 'phone-app-header';
        
        const leftTab = document.createElement('div');
        leftTab.className = 'phone-app-tab';
        leftTab.id = 'phoneTabHistory';
        leftTab.innerHTML = '<span class="tab-icon">📞</span><span class="tab-label">Call History</span>';
        
        const rightTab = document.createElement('div');
        rightTab.className = 'phone-app-tab';
        rightTab.id = 'phoneTabContacts';
        rightTab.innerHTML = '<span class="tab-icon">👤</span><span class="tab-label">Contacts</span>';
        
        header.appendChild(leftTab);
        header.appendChild(rightTab);

        // Create content area
        const content = document.createElement('div');
        content.className = 'phone-app-content';
        content.id = 'phoneAppContent';

        // Create hint
        const hint = document.createElement('div');
        hint.className = 'phone-app-hint';
        hint.textContent = '◀▶ Switch View | ▲▼ Navigate | OK Select';
        
        this.container.appendChild(content);
        this.container.appendChild(header);
        this.container.appendChild(hint);

        screen.appendChild(this.container);
    }

    // Update UI based on current view
    updateUI() {
        if (!this.container) return;

        // Update tabs
        const historyTab = document.getElementById('phoneTabHistory');
        const contactsTab = document.getElementById('phoneTabContacts');
        
        if (historyTab && contactsTab) {
            historyTab.classList.toggle('active', this.currentView === 'history');
            contactsTab.classList.toggle('active', this.currentView === 'contacts');
        }

        // Update content
        const content = document.getElementById('phoneAppContent');
        if (!content) return;

        if (this.currentView === 'history') {
            this.renderHistory(content);
        } else {
            this.renderContacts(content);
        }
    }

    // Render call history
    renderHistory(container) {
        container.innerHTML = '';

        if (this.callHistory.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'phone-empty-state';
            empty.innerHTML = `
                <div class="empty-icon">📞</div>
                <div class="empty-text">No recent calls</div>
                <div class="empty-hint">Select from Contacts to start a call</div>
            `;
            container.appendChild(empty);
            return;
        }

        // Create list
        const list = document.createElement('div');
        list.className = 'phone-history-list';

        this.callHistory.forEach((call, index) => {
            const item = document.createElement('div');
            item.className = 'phone-history-item';
            if (index === this.historyIndex) {
                item.classList.add('selected');
            }

            const date = new Date(call.timestamp);
            const timeStr = date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' });

            item.innerHTML = `
                <div class="history-emoji">${call.contactEmoji}</div>
                <div class="history-details">
                    <div class="history-name">${call.contactName}</div>
                    <div class="history-meta">📅 ${dateStr} ${timeStr} 📞 ${call.duration}</div>
                </div>
            `;

            list.appendChild(item);
        });

        container.appendChild(list);

        // Auto-scroll to selected
        setTimeout(() => {
            const selected = container.querySelector('.phone-history-item.selected');
            if (selected) {
                const itemTop = selected.offsetTop;
                const itemHeight = selected.offsetHeight;
                const containerHeight = container.clientHeight;
                const targetScroll = itemTop - (containerHeight / 2) + (itemHeight / 2);
                container.scrollTop = Math.max(0, targetScroll);
            }
        }, 10);
    }

    // Render contacts
    renderContacts(container) {
        container.innerHTML = '';

        if (this.contacts.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'phone-empty-state';
            empty.innerHTML = `
                <div class="empty-icon">👤</div>
                <div class="empty-text">No contacts available</div>
            `;
            container.appendChild(empty);
            return;
        }

        // Create list
        const list = document.createElement('div');
        list.className = 'phone-contacts-list';

        this.contacts.forEach((contact, index) => {
            const item = document.createElement('div');
            item.className = 'phone-contact-item';
            if (index === this.contactsIndex) {
                item.classList.add('selected');
            }

            item.innerHTML = `
                <div class="contact-emoji">${contact.emoji}</div>
                <div class="contact-name">${contact.name}</div>
            `;

            list.appendChild(item);
        });

        container.appendChild(list);

        // Auto-scroll to selected
        setTimeout(() => {
            const selected = container.querySelector('.phone-contact-item.selected');
            if (selected) {
                const itemTop = selected.offsetTop;
                const itemHeight = selected.offsetHeight;
                const containerHeight = container.clientHeight;
                const targetScroll = itemTop - (containerHeight / 2) + (itemHeight / 2);
                container.scrollTop = Math.max(0, targetScroll);
            }
        }, 10);
    }

    // Navigate between views
    switchView(direction) {
        if (direction === 'left') {
            this.currentView = 'history';
        } else if (direction === 'right') {
            this.currentView = 'contacts';
        }
        this.updateUI();
    }

    // Navigate within current view
    navigate(direction) {
        if (this.currentView === 'history') {
            if (this.callHistory.length === 0) return;
            
            if (direction === 'up') {
                this.historyIndex = (this.historyIndex - 1 + this.callHistory.length) % this.callHistory.length;
            } else if (direction === 'down') {
                this.historyIndex = (this.historyIndex + 1) % this.callHistory.length;
            }
        } else {
            if (this.contacts.length === 0) return;
            
            if (direction === 'up') {
                this.contactsIndex = (this.contactsIndex - 1 + this.contacts.length) % this.contacts.length;
            } else if (direction === 'down') {
                this.contactsIndex = (this.contactsIndex + 1) % this.contacts.length;
            }
        }
        
        this.updateUI();
    }

    // Handle OK button
    handleOK() {
        if (this.currentView === 'history') {
            if (this.callHistory.length === 0) return;
            const call = this.callHistory[this.historyIndex];
            this.showCallDetails(call);
        } else {
            if (this.contacts.length === 0) return;
            const contact = this.contacts[this.contactsIndex];
            this.startCallWithContact(contact);
        }
    }

    // Show call details with transcript
    showCallDetails(call) {
        console.log('📋 Showing call details:', call.id);
        
        const screen = document.querySelector('.screen');
        if (!screen) return;

        // Store the current call ID for menu operations
        this.currentDetailsCallId = call.id;
        this.detailsMenuOpen = false;

        // Create details dialog
        const dialog = document.createElement('div');
        dialog.className = 'phone-call-details';
        dialog.id = 'phoneCallDetails';

        const header = document.createElement('div');
        header.className = 'details-header';
        
        // Format date and time
        const date = new Date(call.timestamp);
        const dateStr = date.toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' });
        const timeStr = date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
        
        // Build cost info (right side)
        let costHtml = '';
        if (call.cost !== undefined && call.cost !== null) {
            costHtml = `<div class="details-cost">💸 $${call.cost.toFixed(4)}</div>`;
        }
        
        header.innerHTML = `
            <div class="details-left">
                <div class="details-emoji">${call.contactEmoji}</div>
                <div class="details-info">
                    <div class="details-name">${call.contactName}</div>
                    <div class="details-duration">📞 ${call.duration}</div>
                </div>
            </div>
            <div class="details-right">
                <div class="details-date">📅 ${dateStr} ${timeStr}</div>
                ${costHtml}
            </div>
        `;

        const transcriptContainer = document.createElement('div');
        transcriptContainer.className = 'details-transcript';
        
        if (call.transcript && call.transcript.length > 0) {
            call.transcript.forEach(entry => {
                const line = document.createElement('div');
                line.className = entry.role === 'user' ? 'transcript-user' : 'transcript-ai';
                //line.textContent = `${entry.role === 'user' ? 'You' : call.contactName}: ${entry.text}`;
                // --- JAVÍTÁS KEZDETE ---
                // A beszélő nevét és az üzenetet külön kezeljük a biztonságos HTML-beszúrásért
                const speaker = entry.role === 'user' ? 'You' : call.contactName;
                const prefix = this.escapeHtml(`${speaker}: `);
                const contentWithLinks = this.convertUrlsToLinks(this.escapeHtml(entry.text));
                
                // innerHTML-t használunk, hogy a böngésző értelmezze az <a> taget
                line.innerHTML = prefix + contentWithLinks;
                // --- JAVÍTÁS VÉGE ---                
                transcriptContainer.appendChild(line);
            });
        } else {
            const empty = document.createElement('div');
            empty.className = 'transcript-empty';
            empty.textContent = 'No transcript available';
            transcriptContainer.appendChild(empty);
        }

        const hint = document.createElement('div');
        hint.className = 'details-hint';
        //hint.innerHTML = '▲▼ Scroll | Menu Options | OK Call Again | C Back';
        hint.innerHTML = '▲▼ Scroll | Menu Options | C Back';
        dialog.appendChild(header);
        dialog.appendChild(transcriptContainer);
        dialog.appendChild(hint);

        screen.appendChild(dialog);

        // Scroll to top
        setTimeout(() => {
            transcriptContainer.scrollTop = 0;
        }, 10);
    }

    // Close call details
    closeCallDetails() {
        this.closeDetailsMenu(); // Close menu if open
        const dialog = document.getElementById('phoneCallDetails');
        if (dialog) {
            dialog.remove();
        }
        this.currentDetailsCallId = null;
        this.detailsMenuOpen = false;
    }

    // Show details menu
    showDetailsMenu() {
        if (this.detailsMenuOpen) return;
        
        const dialog = document.getElementById('phoneCallDetails');
        if (!dialog) return;
        
        // Create menu overlay
        const menu = document.createElement('div');
        menu.className = 'phone-details-menu';
        menu.id = 'phoneDetailsMenu';
        menu.innerHTML = `
            <div class="menu-title">Call Options</div>
            <div class="menu-list">
                <div class="menu-item selected" data-action="call_again"><span class="tab-icon">📞</span> Call Again</div>
                <div class="menu-item" data-action="remove"><span class="tab-icon">🗑️</span> Remove Call</div>
                <div class="menu-item" data-action="back"><span class="tab-icon">↩️</span> Back to Call History</div>
            </div>
            <div class="menu-hint">▲▼ Navigate | OK Select | C Close</div>
        `;
        
        dialog.appendChild(menu);
        this.detailsMenuOpen = true;
        this.detailsMenuIndex = 0;
        
        console.log('📋 Details menu opened');
    }

    // Close details menu
    closeDetailsMenu() {
        const menu = document.getElementById('phoneDetailsMenu');
        if (menu) {
            menu.remove();
        }
        this.detailsMenuOpen = false;
    }

    // Navigate details menu
    navigateDetailsMenu(direction) {
        if (!this.detailsMenuOpen) return;
        
        const items = document.querySelectorAll('.phone-details-menu .menu-item');
        if (items.length === 0) return;
        
        items[this.detailsMenuIndex].classList.remove('selected');
        
        if (direction === 'up') {
            this.detailsMenuIndex = (this.detailsMenuIndex - 1 + items.length) % items.length;
        } else if (direction === 'down') {
            this.detailsMenuIndex = (this.detailsMenuIndex + 1) % items.length;
        }
        
        items[this.detailsMenuIndex].classList.add('selected');
    }

    // Select details menu item
    selectDetailsMenuItem() {
        if (!this.detailsMenuOpen) return;
        
        const items = document.querySelectorAll('.phone-details-menu .menu-item');
        const selectedItem = items[this.detailsMenuIndex];
        const action = selectedItem.getAttribute('data-action');
        
        if (action === 'call_again') {
            // ✅ ÚJ: Indítsunk hívást ezzel a kontakttal
            this.closeDetailsMenu();
            this.startCallFromDetails();
        } else if (action === 'remove') {
            // ✅ FELADAT 2: Megersítő dialógus megmut atása
            this.showRemoveConfirmation();
        } else if (action === 'back') {
            this.closeDetailsMenu();
            this.closeCallDetails();
        }
    }

    // ✅ ÚJ: Megersítő dialógus a call törléséhez
    showRemoveConfirmation() {
        // Close the details menu first
        this.closeDetailsMenu();
        
        const dialog = document.getElementById('phoneCallDetails');
        if (!dialog) return;
        
        // Create confirmation overlay
        const confirmation = document.createElement('div');
        confirmation.className = 'phone-remove-confirmation';
        confirmation.id = 'phoneRemoveConfirmation';
        confirmation.innerHTML = `
            <div class="confirm-title">Remove Call?</div>
            <div class="confirm-message">Delete this call from history?</div>
            <div class="confirm-options">
                <div class="confirm-option selected" data-choice="yes">Yes</div>
                <div class="confirm-option" data-choice="no">No</div>
            </div>
            <div class="confirm-hint">◀▶ Select | OK Confirm | C Cancel</div>
        `;
        
        dialog.appendChild(confirmation);
        this.confirmationOpen = true;
        this.confirmationChoice = 0; // 0 = Yes, 1 = No
        
        console.log('❌ Remove confirmation dialog opened');
    }

    // ✅ ÚJ: Megersítő dialógus bezárása
    closeRemoveConfirmation() {
        const confirmation = document.getElementById('phoneRemoveConfirmation');
        if (confirmation) {
            confirmation.remove();
        }
        this.confirmationOpen = false;
    }

    // ✅ ÚJ: Navigáció a megersítő dialógusban
    navigateRemoveConfirmation(direction) {
        if (!this.confirmationOpen) return;
        
        const options = document.querySelectorAll('.phone-remove-confirmation .confirm-option');
        if (options.length === 0) return;
        
        options[this.confirmationChoice].classList.remove('selected');
        
        if (direction === 'left') {
            this.confirmationChoice = 0; // Yes
        } else if (direction === 'right') {
            this.confirmationChoice = 1; // No
        }
        
        options[this.confirmationChoice].classList.add('selected');
    }

    // ✅ ÚJ: Megersítés a megersítő dialógusban
    confirmRemove() {
        if (!this.confirmationOpen) return;
        
        const options = document.querySelectorAll('.phone-remove-confirmation .confirm-option');
        const selectedOption = options[this.confirmationChoice];
        const choice = selectedOption.getAttribute('data-choice');
        
        if (choice === 'yes') {
            console.log('✅ User confirmed call removal');
            this.closeRemoveConfirmation();
            this.removeCurrentCall();
        } else {
            console.log('❌ User cancelled call removal');
            this.closeRemoveConfirmation();
            // Vissza a menübe
            this.showDetailsMenu();
        }
    }

    // ✅ ÚJ: Ellenőrzés, hogy a megersítő dialógus nyitva van-e
    isRemoveConfirmationOpen() {
        return this.confirmationOpen === true;
    }

    // Remove current call from history
    removeCurrentCall() {
        if (!this.currentDetailsCallId) return;
        
        const callIndex = this.callHistory.findIndex(c => c.id === this.currentDetailsCallId);
        if (callIndex === -1) return;
        
        this.callHistory.splice(callIndex, 1);
        this.saveCallHistory();
        
        console.log('🗑️ Call removed from history');
        
        // Close everything and return to history
        this.closeDetailsMenu();
        this.closeCallDetails();
        this.updateUI();
    }

    // Check if call details is open
    isCallDetailsOpen() {
        return !!document.getElementById('phoneCallDetails');
    }

    // Check if details menu is open
    isDetailsMenuOpen() {
        return this.detailsMenuOpen === true;
    }

    // Scroll call details
    scrollCallDetails(amount) {
        const dialog = document.getElementById('phoneCallDetails');
        if (!dialog) return;
        
        const transcript = dialog.querySelector('.details-transcript');
        if (transcript) {
            transcript.scrollTop += amount;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * A szövegben található URL-eket kattintható <a> linkekké alakítja.
     */
    convertUrlsToLinks(text) {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, (url) => {
            // A már escapelt szövegben a linket kicseréljük egy HTML tag-re
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="retro-link">${url}</a>`;
        });
    }

    async startCallWithContact(contact) {
        console.log('📞 Starting call with:', contact.name);
        this.hide();
        
        // Get the full profile object
        // JAVÍTVA: A profilt a 'filename' alapján keressük, amit a kontakt 'id' mezőjében tároltunk.
        const profile = window.profileManager ? window.profileManager.profiles.find(p => p.filename === contact.id) : null;
        
        if (profile && window.startVoiceCallWithProfile) {
            await window.startVoiceCallWithProfile(profile);
        }
    }
    
    // ✅ ÚJ: Hívás indítása a details képernyőről
    async startCallFromDetails() {
        if (!this.currentDetailsCallId) return;
        
        const call = this.callHistory.find(c => c.id === this.currentDetailsCallId);
        if (!call) return;
        
        console.log('📞 Starting call from details with:', call.contactName);
        
        this.closeCallDetails();
        this.hide();
        
        // Find the profile by name
        const profile = window.profileManager ? 
            window.profileManager.profiles.find(p => p.name === call.contactName) : null;
        
        if (profile && window.startVoiceCallWithProfile) {
            await window.startVoiceCallWithProfile(profile);
        }
    }        

    // Continue call from history
    async continueCallFromHistory() {
        if (this.callHistory.length === 0) return;
        
        const call = this.callHistory[this.historyIndex];
        console.log('📞 Continuing call with:', call.contactName);
        
        this.closeCallDetails();
        this.hide();
        
        // Find the profile by name
        const profile = window.profileManager ? 
            window.profileManager.profiles.find(p => p.name === call.contactName) : null;
        
        if (profile && window.startVoiceCallWithProfile) {
            // The conversation history will be automatically loaded from the main app
            await window.startVoiceCallWithProfile(profile);
        }
    }
}

// Initialize and export
window.nokiaPhoneApp = new NokiaPhoneApp();
console.log('✅ Nokia Phone App initialized');
