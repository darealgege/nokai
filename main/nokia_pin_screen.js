// nokia_pin_screen.js

class PinScreenHandler {
    constructor() {
        this.isActive = false;
        this.pin = '';
        this.maxLength = 6;
        this.resolvePromise = null;
        this.rejectPromise = null;

        this.container = document.getElementById('pinScreen');
        this.titleElement = this.container.querySelector('.pin-title');
        this.displayElement = this.container.querySelector('.pin-display');
    }

    show(title) {
        return new Promise((resolve, reject) => {
            this.pin = '';
            this.titleElement.textContent = title;
            this.updateDisplay();
            this.container.classList.remove('hidden');
            this.isActive = true;
            
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
        });
    }

    hide() {
        this.container.classList.add('hidden');
        this.isActive = false;
        // Csak akkor reject-elünk, ha még nem oldottuk fel a promise-t
        if (this.rejectPromise) {
            this.rejectPromise('PIN entry cancelled');
            this.rejectPromise = null; // Elkerüljük a dupla hívást
            this.resolvePromise = null;
        }
    }


    handleKeyPress(key) {
        //playDTMF(key);
        if (this.pin.length < this.maxLength && !isNaN(parseInt(key))) {
            this.pin += key;
            this.updateDisplay();
        }
    }

    handleBackspace() {
        //playDTMF('1');
        if (this.pin.length > 0) {
            this.pin = this.pin.slice(0, -1);
            this.updateDisplay();
        }
    }

    handleConfirm() {
        if (this.resolvePromise) {
            const pinToReturn = this.pin;
            this.resolvePromise(pinToReturn);
            this.resolvePromise = null; // Elkerüljük a dupla hívást
            this.rejectPromise = null;
        }
        this.hide();
    }

    updateDisplay() {
        this.displayElement.textContent = '*'.repeat(this.pin.length);
    }
}

window.pinScreen = new PinScreenHandler();