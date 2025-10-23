// nokia_setup_screen.js - VISSZAÁLLÍTOTT VÁLTOZÓNÉVVEL, TELJES, MŰKÖDŐ VERZIÓ

class SetupScreenHandler {
    constructor() {
        this.isActive = false;
        this.formItems = []; // VISSZANEVEZVE 'navigableItems'-ról
        this.selectedIndex = 0;
        this.isEditing = false;

        this.container = document.getElementById('setupScreen');
        this.contentContainer = this.container.querySelector('.setup-content');
        this.pasteCatcher = document.getElementById('paste-catcher');
        this.setupPasteListener();

        this.lastKey = null;
        this.lastKeyTime = 0;
        this.keyPressCount = 0;

        this.values = { apiKey: '', pin: '' };
        this.cursors = { apiKey: 0, pin: 0 };
        this.sessionOnly = false;

        this.maskTimeout = null;
    }

    show() {
        this.isActive = true;
        this.selectedIndex = 0;
        this.isEditing = false;
        // Most már a szövegblokkot is megtalálja a lekérdezés
        this.formItems = Array.from(this.container.querySelectorAll('.setup-form-item'));
        this.container.classList.remove('hidden');
        
        this.updateAllDisplays();
        this.updateSelection();

        // Biztosítjuk, hogy a görgetés mindig a legtetején kezdődjön.
        setTimeout(() => {
            if (this.contentContainer) {
                this.contentContainer.scrollTop = 0;
            }
        }, 10);
    }

    hide() {
        this.isActive = false;
        this.container.classList.add('hidden');
    }

    navigate(direction) {
        if (this.isEditing) return;

        const itemCount = this.formItems.length;
        if (itemCount === 0) return;

        if (direction === 'up') {
            this.selectedIndex = (this.selectedIndex - 1 + itemCount) % itemCount;
        } else { // 'down'
            this.selectedIndex = (this.selectedIndex + 1) % itemCount;
        }

        this.updateSelection();
    }

    updateSelection() {
        this.formItems.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });

        const selectedElement = this.formItems[this.selectedIndex];
        const container = this.contentContainer;
        if (!selectedElement || !container) return;

        // Manuális görgetési logika a felesleges ugrálás elkerülésére
        const elemTop = selectedElement.offsetTop - container.offsetTop;
        const elemBottom = elemTop + selectedElement.offsetHeight;
        const viewTop = container.scrollTop;
        const viewBottom = viewTop + container.clientHeight;

        if (elemTop < viewTop) {
            container.scrollTop = elemTop;
        } else if (elemBottom > viewBottom) {
            container.scrollTop = elemBottom - container.clientHeight;
        }
    }

    handleOK() {
        const currentItem = this.formItems[this.selectedIndex];
        const type = currentItem.dataset.type;

        // Ha a szövegblokk van kiválasztva, nyissa meg a linket
        if (type === 'static') {
            const link = currentItem.querySelector('a');
            if (link && link.href) {
                window.open(link.href, '_blank');
            }
            return;
        }

        if (type === 'checkbox') {
            this.sessionOnly = !this.sessionOnly;
            currentItem.classList.toggle('checked', this.sessionOnly);
            const pinItem = this.formItems.find(item => item.dataset.field === 'pin');
            if (pinItem) {
                pinItem.style.display = this.sessionOnly ? 'none' : 'block';
            }
        } else if (type === 'textarea' || type === 'password') {
            this.isEditing = !this.isEditing;
            currentItem.classList.toggle('editing', this.isEditing);
            if (this.isEditing && type === 'textarea') {
                this.pasteCatcher.focus();
            } else {
                this.pasteCatcher.blur();
            }
            this.resetT9State();
            clearTimeout(this.maskTimeout);
            this.updateAllDisplays();
        } else if (type === 'submit') {
            this.submit();
        }
    }

    handleKeyPress(key) {
        if (!this.isEditing) return;

        const currentItem = this.formItems[this.selectedIndex];
        const targetValueKey = currentItem.dataset.field;
        if (!targetValueKey) return;

        clearTimeout(this.maskTimeout);

        if (targetValueKey === 'pin') {
            if (this.values.pin.length < 6 && !isNaN(parseInt(key))) {
                let text = this.values.pin;
                let cursor = this.cursors.pin;
                text = text.slice(0, cursor) + key + text.slice(cursor);
                cursor++;
                this.values.pin = text;
                this.cursors.pin = cursor;
                this.updateAllDisplays();
            }
            this.resetT9State();
            return;
        }

        if (targetValueKey === 'apiKey') {
            let text = this.values.apiKey;
            let cursor = this.cursors.apiKey;
            const currentTime = Date.now();
            const chars = T9_MAP[key];
            if (!chars) return;

            if (this.lastKey === key && (currentTime - this.lastKeyTime) < 1000) {
                this.keyPressCount = (this.keyPressCount + 1) % chars.length;
                const newChar = chars[this.keyPressCount];
                text = text.slice(0, cursor - 1) + newChar + text.slice(cursor);
            } else {
                this.keyPressCount = 0;
                const newChar = chars[0];
                text = text.slice(0, cursor) + newChar + text.slice(cursor);
                cursor++;
            }

            this.lastKey = key;
            this.lastKeyTime = currentTime;
            this.values.apiKey = text;
            this.cursors.apiKey = cursor;
            this.updateAllDisplays(true);

            this.maskTimeout = setTimeout(() => {
                this.maskTimeout = null;
                this.updateAllDisplays();
            }, 1000);
        }
    }

    handleBackspace() {
        if (!this.isEditing) return;
        clearTimeout(this.maskTimeout);
        const currentItem = this.formItems[this.selectedIndex];
        const targetValueKey = currentItem.dataset.field;
        if (!targetValueKey) return;

        let text = this.values[targetValueKey];
        let cursor = this.cursors[targetValueKey];
        if (cursor > 0) {
            text = text.slice(0, cursor - 1) + text.slice(cursor);
            cursor--;
            this.values[targetValueKey] = text;
            this.cursors[targetValueKey] = cursor;
            this.resetT9State();
            this.updateAllDisplays();
        }
    }

    moveCursor(direction) {
        if (!this.isEditing) return;
        clearTimeout(this.maskTimeout);
        const currentItem = this.formItems[this.selectedIndex];
        const targetValueKey = currentItem.dataset.field;
        if (!targetValueKey) return;

        let cursor = this.cursors[targetValueKey];
        const textLength = this.values[targetValueKey].length;
        if (direction === 'left' && cursor > 0) cursor--;
        else if (direction === 'right' && cursor < textLength) cursor++;
        this.cursors[targetValueKey] = cursor;
        this.resetT9State();
        this.updateAllDisplays();
    }

    handlePaste(text) {
        if (!this.isEditing) return;
        clearTimeout(this.maskTimeout);
        const currentItem = this.formItems[this.selectedIndex];
        if (currentItem.dataset.type === 'textarea') {
            this.values.apiKey = text.trim();
            this.cursors.apiKey = this.values.apiKey.length;
            this.resetT9State();
            this.updateAllDisplays();
        }
    }

    setupPasteListener() {
        if (!this.pasteCatcher) return;
        this.pasteCatcher.addEventListener('input', (e) => {
            const pastedText = e.target.value;
            if (pastedText) {
                this.handlePaste(pastedText);
                e.target.value = '';
            }
        });
    }

    updateAllDisplays(keepLastCharVisible = false) {
        const apiKeyDisplay = document.getElementById('apiKeyDisplay');
        const pinDisplaySetup = document.getElementById('pinDisplaySetup');
        if (apiKeyDisplay) {
            apiKeyDisplay.innerHTML = this.renderWithCursor('apiKey', false, true, keepLastCharVisible);
        }
        if (pinDisplaySetup) {
            pinDisplaySetup.innerHTML = this.renderWithCursor('pin', true, false, false);
        }
    }

    renderWithCursor(key, isPassword = false, enableMasking = false, keepLastCharVisible = false) {
        let text = this.values[key];
        const cursorPosition = this.cursors[key];
        const currentItem = this.formItems[this.selectedIndex];
        const isSelectedAndEditing = this.isEditing && currentItem && currentItem.dataset.field === key;

        let displayText = '';
        if (isPassword) {
            displayText = '*'.repeat(text.length);
        } else if (enableMasking) {
            if (isSelectedAndEditing && keepLastCharVisible && cursorPosition > 0) {
                displayText = '*'.repeat(cursorPosition - 1) + text.charAt(cursorPosition - 1) + '*'.repeat(text.length - cursorPosition);
            } else {
                displayText = '*'.repeat(text.length);
            }
        } else {
            displayText = text;
        }

        let html = this.escapeHtml(displayText.slice(0, cursorPosition));
        if (isSelectedAndEditing) {
            html += '<span class="cursor"></span>';
        }
        html += this.escapeHtml(displayText.slice(cursorPosition));
        return html;
    }

    resetT9State() {
        this.lastKey = null;
        this.lastKeyTime = 0;
        this.keyPressCount = 0;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async submit() {
        try {
            if (this.sessionOnly) {
                if (!this.values.apiKey.startsWith('sk-')) {
                    throw new Error('Invalid API Key format.');
                }
                window.apiKeyManager.setSessionApiKey(this.values.apiKey);
            } else {
                if (!this.values.apiKey.startsWith('sk-')) {
                    throw new Error('Invalid API Key format.');
                }
                if (this.values.pin.length < 4 || this.values.pin.length > 6) {
                    throw new Error('PIN must be 4-6 digits.');
                }
                await window.apiKeyManager.saveAndEncryptKey(this.values.apiKey, this.values.pin);
            }
            await showAlert('Settings saved!<br>The device will now restart.', 'Success');
            location.reload();
        } catch (error) {
            await showAlert('Error: ' + error.message, 'Save Failed');
        }
    }
}

// Globális példány létrehozása
window.setupScreen = new SetupScreenHandler();