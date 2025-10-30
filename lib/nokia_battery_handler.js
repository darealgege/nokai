class NokiaBattery {
    constructor() {
        this.batteryManager = null;
        this.fillElement = document.querySelector('.battery-fill');
        this.chargingIcon = document.querySelector('.charging-icon');
        // ✅ JAVÍTVA: Mindkét szövegelemet lekérjük
        this.bgPercentageElement = document.querySelector('.battery-percentage-background');
        this.overlayPercentageElement = document.querySelector('.battery-percentage-overlay');
    }

    async init() {
        if ('getBattery' in navigator) {
            try {
                this.batteryManager = await navigator.getBattery();
                console.log('🔋 Battery API available.');
                this.updateUI();
                this.batteryManager.addEventListener('levelchange', () => this.updateUI());
                this.batteryManager.addEventListener('chargingchange', () => this.updateUI());
            } catch (error) {
                console.warn('⚠️ Battery API could not be accessed.', error);
                this.handleNoApi();
            }
        } else {
            console.warn('⚠️ Battery API not supported by this browser.');
            this.handleNoApi();
        }
    }

    updateUI() {
        if (!this.batteryManager || !this.fillElement || !this.chargingIcon || !this.bgPercentageElement || !this.overlayPercentageElement) {
            return;
        }

        const levelPercent = Math.round(this.batteryManager.level * 100);
        const isCharging = this.batteryManager.charging;

        // 1. Töltöttségi szint és MINDKÉT százalék frissítése
        this.fillElement.style.width = `${levelPercent}%`;
        const percentageText = `${levelPercent}%`;
        this.bgPercentageElement.textContent = percentageText;
        this.overlayPercentageElement.textContent = percentageText;

        // 2. Töltés ikon állapotának frissítése
        this.chargingIcon.classList.toggle('hidden', !isCharging);

        // 3. Töltés animáció kezelése
        this.fillElement.classList.toggle('charging-animation', isCharging);
    }

    handleNoApi() {
        if (this.fillElement) this.fillElement.style.width = '100%';
        if (this.bgPercentageElement) this.bgPercentageElement.textContent = '100%';
        if (this.overlayPercentageElement) this.overlayPercentageElement.textContent = '100%';
        if (this.chargingIcon) this.chargingIcon.classList.add('hidden');
    }

    // A debug függvény is frissítve
    debugUpdateUI(level, isCharging) {
        console.log(`🐞 DEBUG: Setting battery to ${level}% and charging: ${isCharging}`);
        if (!this.fillElement || !this.chargingIcon || !this.bgPercentageElement || !this.overlayPercentageElement) {
            console.error('❌ Battery UI elements not found for debug.');
            return;
        }
        const levelPercent = Math.max(0, Math.min(100, level));
        
        this.fillElement.style.width = `${levelPercent}%`;
        const percentageText = `${levelPercent}%`;
        this.bgPercentageElement.textContent = percentageText;
        this.overlayPercentageElement.textContent = percentageText;

        this.chargingIcon.classList.toggle('hidden', !isCharging);
        this.fillElement.classList.toggle('charging-animation', isCharging);
    }
}

window.nokiaBattery = new NokiaBattery();