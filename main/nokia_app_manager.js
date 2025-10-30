/**
 * Nokia App Manager (FIXED v3)
 * Manages the main menu (home screen) and app launching system
 */

class NokiaAppManager {
    constructor() {
        this.currentApp = null;
        this.homeScreenIndex = 0;
        this.apps = [
            { id: 'phone', icon: '📞', name: 'Phone' },
            { id: 'messages', icon: '💬', name: 'Messages' },
            { id: 'chatgpt', icon: '🤖', name: 'ChatGPT' },
            { id: 'camera', icon: '📷', name: 'Camera' },
            { id: 'gallery', icon: '🖼️', name: 'Gallery' },
            { id: 'games', icon: '🎮', name: 'Games' },
            { id: 'settings', icon: '⚙️', name: 'Settings' }            
        ];
        this.settingsCategories = [
            { id: 'integrated_ai', icon: '🤖', name: 'Integrated AI' },
            { id: 'input', icon: '⌨️', name: 'Input Settings' }
        ];
        this.games = [
            { id: 'doom', icon: './games/doom/doom_icon.png', name: 'DOOM' },
            { id: 'super_steve', icon: './games/super_steve/super_steve_icon.png', name: 'Super Steve' },
            { id: 'snake', icon: '🐍', name: 'Snake' }
        ];
        this.dialogStack = [];
    }

    init() {
        this.createHomeScreen();
        //this.showHomeScreen();
        console.log('✅ App Manager initialized');
    }

    createHomeScreen() {
        const screen = document.querySelector('.screen');
        if (!screen) {
            console.error('❌ Screen not found!');
            const screenContainer = document.querySelector('.screen-container');
            if (screenContainer) {
                const innerScreen = screenContainer.querySelector('.screen');
                if (innerScreen) {
                    return this._createHomeScreenInElement(innerScreen);
                }
            }
            return;
        }
        this._createHomeScreenInElement(screen);
    }
    
    _createHomeScreenInElement(screen) {
        if (document.getElementById('homeScreen')) return;

        const homeScreen = document.createElement('div');
        homeScreen.id = 'homeScreen';
        homeScreen.className = 'home-screen hidden';
        
        const grid = document.createElement('div');
        grid.className = 'app-grid';
        
        this.apps.forEach((app, index) => {
            const appIcon = document.createElement('div');
            appIcon.className = 'app-icon';
            appIcon.setAttribute('data-app', app.id);
            if (index === this.homeScreenIndex) {
                appIcon.classList.add('selected');
            }
            
            const icon = document.createElement('div');
            icon.className = 'icon';
            icon.textContent = app.icon;
            
            const label = document.createElement('div');
            label.className = 'label';
            label.textContent = app.name;
            
            appIcon.appendChild(icon);
            appIcon.appendChild(label);
            grid.appendChild(appIcon);
        });
        
        homeScreen.appendChild(grid);
        
/*         const hint = document.createElement('div');
        hint.className = 'home-hint';
        hint.textContent = '▲▼◀▶ Navigate | OK Select';
        homeScreen.appendChild(hint); */
        
        const statusBar = screen.querySelector('.status-bar');
        if (statusBar && statusBar.nextSibling) {
            screen.insertBefore(homeScreen, statusBar.nextSibling);
        } else {
            screen.appendChild(homeScreen);
        }
    }


    // ✅ ÚJ, KÖZPONTI FÜGGVÉNY MINDEN KÉPERNYŐ ELREJTÉSÉRE
        hideAllScreens() {
            // Fő app konténerek elrejtése
            const screens = [
                document.getElementById('homeScreen'),
                document.getElementById('screenContent'),
                document.querySelector('.camera-container'),
                document.querySelector('.gallery-container'),
                document.querySelector('.messages-container')
            ];

            screens.forEach(s => {
                if (s) s.classList.add('hidden');
            });

            // Az AppManager saját dialógusainak bezárása
            this.closeAllDialogs();
            
            // Aktív app állapotának nullázása
            this.currentApp = null;
            
            console.log('⚫ All screens hidden');
        }

    showHomeScreen() {
        const screenContent = document.getElementById('screenContent');
        const menuScreen = document.getElementById('menuScreen');
        const homeScreen = document.getElementById('homeScreen');
        
        if (screenContent) {
            screenContent.classList.add('hidden');
            screenContent.style.display = 'none';
        }
        
        if (menuScreen) {
            menuScreen.classList.remove('active');
            menuScreen.classList.add('hidden');
            menuScreen.style.display = 'none';
        }
        
        if (homeScreen) {
            homeScreen.classList.remove('hidden');
            homeScreen.style.display = 'block';
        }
        
        this.currentApp = null;
        this.dialogStack = [];
        this.updateHomeScreenSelection();
        
        console.log('📱 Home screen displayed');
    }

    updateHomeScreenSelection() {
        const icons = document.querySelectorAll('.app-icon');
        icons.forEach((icon, index) => {
            icon.classList.toggle('selected', index === this.homeScreenIndex);
        });
    }

    navigateHome(direction) {
        const gridCols = 3;
        const totalApps = this.apps.length;
        const row = Math.floor(this.homeScreenIndex / gridCols);
        const col = this.homeScreenIndex % gridCols;
        
        switch(direction) {
            case 'up':
                if (row > 0) {
                    this.homeScreenIndex -= gridCols;
                } else {
                    const lastRow = Math.floor((totalApps - 1) / gridCols);
                    this.homeScreenIndex = lastRow * gridCols + col;
                    if (this.homeScreenIndex >= totalApps) {
                        this.homeScreenIndex = totalApps - 1;
                    }
                }
                break;
            case 'down':
                const potentialNextIndex = this.homeScreenIndex + gridCols;
                if (potentialNextIndex < totalApps) {
                    this.homeScreenIndex = potentialNextIndex;
                } else {
                    const currentRow = Math.floor(this.homeScreenIndex / gridCols);
                    const lastRow = Math.floor((totalApps - 1) / gridCols);
                    if (currentRow === lastRow) {
                        this.homeScreenIndex = col;
                    } else {
                        this.homeScreenIndex = totalApps - 1;
                    }
                }
                break;
            case 'left':
                this.homeScreenIndex = (this.homeScreenIndex - 1 + totalApps) % totalApps;
                break;
            case 'right':
                this.homeScreenIndex = (this.homeScreenIndex + 1) % totalApps;
                break;
        }
        
        this.updateHomeScreenSelection();

        // ✅ SCROLL FIX: Keep selected icon centered
            setTimeout(() => {
                const homeScreen = document.getElementById('homeScreen');
                const selectedIcon = homeScreen?.querySelector('.app-icon.selected');
                if (homeScreen && selectedIcon) {
                    const iconTop = selectedIcon.offsetTop;
                    const iconHeight = selectedIcon.offsetHeight;
                    const screenHeight = homeScreen.clientHeight;
                    
                    // Center the icon in viewport
                    const targetScroll = iconTop - (screenHeight / 2) + (iconHeight / 2);
                    homeScreen.scrollTop = Math.max(0, targetScroll);
                }
            }, 50);
            
           /*  if (typeof playDTMF !== 'undefined') {
                playDTMF(direction === 'up' || direction === 'down' ? '2' : '4');
            } */        
        
        // ✅ SCROLL FIX: Keep selected icon visible
        const homeScreen = document.getElementById('homeScreen');
        const selectedIcon = homeScreen?.querySelector('.app-icon.selected');
        if (homeScreen && selectedIcon) {
            // Scroll the icon into view
            selectedIcon.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
        
       /*  if (typeof playDTMF !== 'undefined') {
            playDTMF(direction === 'up' || direction === 'down' ? '2' : '4');
        } */
    }

    async launchApp(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) {
            console.error('App not found:', appId);
            return;
        }
        
        console.log('🚀 Launching app:', app.name);
        this.currentApp = appId;
        
        /* if (typeof playDTMF !== 'undefined') {
            playDTMF('5');
        } */
        
        switch(appId) {
            case 'phone':
                await this.launchPhoneApp();
                break;
            case 'messages':              
                    this.launchMessagesApp();  
                    break;                               
            case 'chatgpt':
                this.launchChatGPTApp();
                break;
            case 'camera':
                this.launchCameraApp();
                break;
            case 'gallery':
                this.launchGalleryApp();
                break;
            case 'settings':
                this.showSettingsMenu();
                break;
            case 'games':
                this.showGamesMenu();
                break;
        }
    }

    async launchPhoneApp() {
        // ✅ NEW: Launch dedicated Phone app
        if (window.nokiaPhoneApp) {
            window.nokiaPhoneApp.show();
        } else {
            console.error('❌ Phone app not initialized');
        }
    }

    launchChatGPTApp() {
        const homeScreen = document.getElementById('homeScreen');
        const screenContent = document.getElementById('screenContent');
        
        if (homeScreen) homeScreen.classList.add('hidden');
        if (screenContent) {
            screenContent.classList.remove('hidden');
            screenContent.style.display = 'block';
            
            // ✅ FIX: Scroll to bottom when opening ChatGPT app
            setTimeout(() => {
                screenContent.scrollTop = screenContent.scrollHeight;
            }, 50);
        }
        
        console.log('🤖 ChatGPT app launched');
    }

    launchMessagesApp() {
        if (window.nokiaMessages) {
            window.nokiaMessages.show();
        }
        console.log('💬 Messages app launched');
    }    

    launchCameraApp() {
        if (window.nokiaCamera) {
            window.nokiaCamera.show();
        }
        console.log('📷 Camera app launched');
    }

    launchGalleryApp() {
        if (window.nokiaGallery) {
            window.nokiaGallery.show();
        }
        console.log('🖼️ Gallery app launched');
    }

    showSettingsMenu() {
        this.currentApp = 'settings';
        
        // ✅ JAVÍTÁS: A menüpontok listája itt van definiálva
        const categoriesWithSpecialItems = [
            ...this.settingsCategories,
            { id: 'system_info', icon: '⚙️', name: 'System Information' },
            { id: 'factory_reset', icon: '🗑️', name: 'Factory Reset' },
            { id: 'about', icon: 'ℹ️', name: 'About' }
        ];
        
        // ✅ JAVÍTÁS: A callback függvény (onSelect) most már kezeli az összes esetet
        this.showCategoryDialog('Settings', categoriesWithSpecialItems, (selectedItem) => {
            switch (selectedItem.id) {
                case 'integrated_ai':
                case 'input':
                    // Ezek a normál kategóriák, amik almenüt nyitnak
                    this.showSettingsCategory(selectedItem.id);
                    break;
                case 'system_info':
                    // Speciális eset: System Info dialógus megnyitása
                    // A showSystemInfoDialog a nokia_app_handlers_utils.js-ben van definiálva
                    if (typeof showSystemInfoDialog === 'function') {
                        showSystemInfoDialog();
                    }
                    break;
                case 'factory_reset':
                this.closeCurrentDialog(true); 
                if (typeof handleFactoryReset === 'function') {                    
                    handleFactoryReset();                    
                }
                break;    
                case 'about':
                    // Speciális eset: About dialógus megnyitása
                    if (typeof showAboutDialog === 'function') {
                        showAboutDialog();
                    }
                    break;
            }
        });
    }

    showSettingsCategory(categoryId) {
        if (categoryId === 'integrated_ai') {
            this.showIntegratedAISettings();
        } else if (categoryId === 'input') {
            this.showInputSettings();
        }
    }

    showIntegratedAISettings() {
        let profileDisplayValue = 'Loading...';
        if (window.profileManager && window.profileManager.profiles.length > 0) {
            const profile = window.profileManager.getSelectedProfile();
            if (profile) {
                profileDisplayValue = `${profile.emoji} ${profile.name}`;
            } else {
                profileDisplayValue = 'No profile selected';
            }
        }
        
        const items = [
            { 
                id: 'model', 
                icon: '🧠', 
                name: 'Text Model', 
                value: (typeof MODELS !== 'undefined' && typeof selectedModel !== 'undefined') 
                    ? MODELS[selectedModel] 
                    : 'gpt-4.1-nano'
            },
            { 
                id: 'voice_model', // Új ID
                icon: '🎤',        // Új ikon
                name: 'Voice Model', // Új név
                value: VOICE_MODELS[window.selectedVoiceModel]
            },            
            { 
                id: 'profile', 
                icon: '👤', 
                name: 'AI Profile', 
                value: profileDisplayValue
            }
        ];
        
        this.showSettingsDialog('Integrated AI', items, (item) => {
            if (item.id === 'model') {
                this.toggleModel();
            } else if (item.id === 'voice_model') { // ✅ ÚJ ESET
                this.toggleVoiceModel();
            } else if (item.id === 'profile') {
                this.selectProfile();
            }
        });
    }

    showInputSettings() {
        const items = [
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
            }
        ];
        
        this.showSettingsDialog('Input Settings', items, (item) => {
            if (item.id === 't9_toggle') {
                this.toggleT9();
            } else if (item.id === 't9_lang') {
                this.toggleLanguage();
            }
        });
    }

    showGamesMenu() {
        this.showGamesDialog();
    }

    showGamesDialog() {
        const dialog = this.createDialog('Games', 'games-dialog');
        const grid = document.createElement('div');
        grid.className = 'games-grid';
        
        this.games.forEach((game, index) => {
            const gameIcon = document.createElement('div');
            gameIcon.className = 'game-icon-item';
            gameIcon.setAttribute('data-index', index);
            if (index === 0) gameIcon.classList.add('selected');
            
            const icon = document.createElement('div');
            icon.className = 'game-icon';
            
            // ✅ JAVÍTÁS: Külön osztály emoji és kép ikonokhoz
            if (game.icon.endsWith('.png') || game.icon.endsWith('.jpg')) {
                icon.classList.add('image-icon');
                const img = document.createElement('img');
                img.src = game.icon;
                img.alt = game.name;
                icon.appendChild(img);
            } else {
                icon.classList.add('emoji-icon');
                icon.textContent = game.icon;
            }
            
            const label = document.createElement('div');
            label.className = 'game-label';
            label.textContent = game.name;
            
            gameIcon.appendChild(icon);
            gameIcon.appendChild(label);
            grid.appendChild(gameIcon);
        });
        
        dialog.appendChild(grid);
        
        const hint = document.createElement('div');
        hint.className = 'dialog-hint';
        hint.textContent = '▲▼◀▶ Navigate | OK Select | C Back';
        dialog.appendChild(hint);
        
        this.showDialog(dialog, this.games, async (game) => {
            if (game.id === 'doom') {
                await this.launchDoom();
            } else if (game.id === 'snake') {
                this.launchSnake();
            } else if (game.id === 'super_steve') {
                this.launchSuperSteve();
            }
        });
    }

    launchSnake() {
        if (window.snakeGame) {
            console.log('🐍 Launching Snake game...');
            this.closeAllDialogs();
            window.snakeGame.activate();
        } else {
            console.error('❌ Snake game not initialized');
        }
    }

    launchSuperSteve() {
        if (window.superSteveGame) {
            console.log('🎮 Launching Super Steve game...');
            this.closeAllDialogs();
            window.superSteveGame.activate();
        } else {
            console.error('❌ Super Steve game not initialized');
        }
    }

    /* async launchDoom() {
        if (window.doomEasterEgg) {
            if (window.doomEasterEgg.isActive()) {
                console.log('🎮 DOOM already active, bringing to foreground');
                this.closeAllDialogs();
            } else {
                console.log('🎮 Starting new DOOM session');
                
                // ✅ FIX v3: Close ALL dialogs before DOOM
                this.closeAllDialogs();
                
                // Set up DOOM exit callback
                const originalDeactivate = window.doomEasterEgg.deactivate.bind(window.doomEasterEgg);
                const appManagerRef = this;
                
                window.doomEasterEgg.deactivate = async function() {
                    console.log('🎮 DOOM deactivating, restoring Games dialog...');
                    
                    await originalDeactivate();
                    
                    // ✅ Reinitialize D-pad touch listeners
                    if (typeof window.reinitializeDpadTouch === 'function') {
                        setTimeout(() => {
                            window.reinitializeDpadTouch();
                            console.log('✅ D-pad touch reinitialized after DOOM');
                        }, 100);
                    }
                    
                    // ✅ Recreate and show Games dialog
                    setTimeout(() => {
                        appManagerRef.showGamesMenu();
                        console.log('✅ Games dialog restored after DOOM exit');
                    }, 200);
                    
                    // Restore original deactivate
                    window.doomEasterEgg.deactivate = originalDeactivate;
                };
                
                window.doomEasterEgg.activate();
            }
        }
    } */

 async launchDoom() {
        if (window.doomEasterEgg) {
            if (window.doomEasterEgg.isActive()) {
                console.log('🎮 DOOM already active, bringing to foreground');
                this.closeAllDialogs();
            } else {
                console.log('🎮 Starting new DOOM session');
                
                // ✅ FIX: Close ALL dialogs before DOOM
                this.closeAllDialogs();
                
                // === JAVÍTÁS KEZDETE: Vezérlők manuális mentése és visszaállítása ===

                // 1. Mentsük el a jelenlegi, globális vezérlő függvényeket.
                // Ez a legfontosabb lépés, ami eddig hiányzott.
                const originalHandlers = {
                    handleNavUp: window.handleNavUp,
                    handleNavDown: window.handleNavDown,
                    handleNavLeft: window.handleNavLeft,
                    handleNavRight: window.handleNavRight,
                    handleOK: window.handleOK,
                    handleMenu: window.handleMenu,
                    handleKey: window.handleKey,
                    handleCallStart: window.handleCallStart,
                    handleCallEnd: window.handleCallEnd,
                    handleClear: window.handleClear,
                    handleShift: window.handleShift,
                    handleHash: window.handleHash
                };
                console.log('✅ Backed up global controls before launching DOOM.');

                // 2. Állítsuk be a DOOM kilépési callback-et (ez a rész már megvolt, de kiegészítjük).
                const originalDeactivate = window.doomEasterEgg.deactivate.bind(window.doomEasterEgg);
                const appManagerRef = this;
                
                window.doomEasterEgg.deactivate = async function() {
                    console.log('🎮 DOOM deactivating, restoring controls and Games dialog...');
                    
                    // Először lefut az eredeti deactivate, ami eltünteti a DOOM UI-t.
                    await originalDeactivate();
                    
                    // 3. ÁLLÍTSUK VISSZA a lementett globális vezérlőket.
                    Object.assign(window, originalHandlers);
                    console.log('✅ Global controls restored after DOOM exit.');
                    
                    // 4. A gombfigyelők újraindítása, hogy biztosan működjenek.
                    // Ez lecseréli a régi 'reinitializeDpadTouch' hívást egy megbízhatóbb megoldásra.
                    if (typeof initializeButtonListeners === 'function') {
                        setTimeout(() => {
                            initializeButtonListeners();
                            console.log('✅ All button listeners re-initialized after DOOM.');
                        }, 100);
                    }
                    
                    // A Játékok menü újbóli megjelenítése.
                    setTimeout(() => {
                        appManagerRef.showGamesMenu();
                        console.log('✅ Games dialog restored after DOOM exit');
                    }, 200);
                    
                    // Az eredeti deactivate függvény visszaállítása a következő indításhoz.
                    window.doomEasterEgg.deactivate = originalDeactivate;
                };
                
                // 5. Indítsuk el a DOOM-ot. Ez felül fogja írni a globális vezérlőket a sajátjaival.
                window.doomEasterEgg.activate();

                // === JAVÍTÁS VÉGE ===
            }
        }
    }        

    showCategoryDialog(title, items, onSelect) {
        const dialog = this.createDialog(title, 'category-dialog');
        const list = document.createElement('div');
        list.className = 'dialog-list';
        
        items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dialog-list-item';
            if (index === 0) itemDiv.classList.add('selected');
            itemDiv.setAttribute('data-index', index);
            
            const icon = document.createElement('span');
            icon.className = 'item-icon';
            
            if (item.icon.endsWith('.png') || item.icon.endsWith('.jpg')) {
                const img = document.createElement('img');
                img.src = item.icon;
                img.alt = item.name;
                icon.appendChild(img);
            } else {
                icon.textContent = item.icon;
            }
            
            const name = document.createElement('span');
            name.className = 'item-name';
            name.textContent = item.name;
            
            itemDiv.appendChild(icon);
            itemDiv.appendChild(name);
            list.appendChild(itemDiv);
        });
        
        dialog.appendChild(list);
        
        const hint = document.createElement('div');
        hint.className = 'dialog-hint';
        hint.textContent = '▲▼ Navigate | OK Select | C Back';
        dialog.appendChild(hint);
        
        this.showDialog(dialog, items, onSelect);
    }

    showSettingsDialog(title, items, onSelect) {
        const dialog = this.createDialog(title, 'settings-dialog');
        const list = document.createElement('div');
        list.className = 'dialog-list settings-list';
        
        items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dialog-list-item settings-item';
            if (index === 0) itemDiv.classList.add('selected');
            itemDiv.setAttribute('data-index', index);
            
            const icon = document.createElement('span');
            icon.className = 'item-icon';
            icon.textContent = item.icon;
            
            const name = document.createElement('span');
            name.className = 'item-name';
            name.textContent = item.name;
            
            // ✅ FIX: Only add value span if value exists
            if (item.value) {
                const value = document.createElement('span');
                value.className = 'item-value';
                value.textContent = item.value;
                itemDiv.appendChild(icon);
                itemDiv.appendChild(name);
                itemDiv.appendChild(value);
            } else {
                itemDiv.appendChild(icon);
                itemDiv.appendChild(name);
            }
            
            list.appendChild(itemDiv);
        });
        
        dialog.appendChild(list);
        
        const hint = document.createElement('div');
        hint.className = 'dialog-hint';
        hint.textContent = '▲▼ Navigate | OK Toggle | C Back';
        dialog.appendChild(hint);
        
        this.showDialog(dialog, items, onSelect);
    }

    createDialog(title, className) {
        const dialog = document.createElement('div');
        dialog.className = `app-dialog ${className}`;
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'dialog-title';
        titleDiv.textContent = title;
        dialog.appendChild(titleDiv);
        
        return dialog;
    }

    showDialog(dialogElement, items, onSelect) {
        const screen = document.querySelector('.screen');
        const homeScreen = document.getElementById('homeScreen');
        
        //if (homeScreen) homeScreen.classList.add('hidden');
        
        screen.appendChild(dialogElement);
        
        const context = {
            element: dialogElement,
            items: items,
            selectedIndex: 0,
            onSelect: onSelect
        };
        
        this.dialogStack.push(context);
        
        // ✅ SCROLL TO TOP ON OPEN (don't center first item)
        setTimeout(() => {
            const container = dialogElement.querySelector('.dialog-list');
            if (container) {
                container.scrollTop = 0;
            }
        }, 10);
        
        console.log('📋 Dialog opened:', dialogElement.querySelector('.dialog-title').textContent);
    }

    navigateDialog(direction) {
    if (this.dialogStack.length === 0) return;

    const context = this.dialogStack[this.dialogStack.length - 1];

    const isGridDialog = context.element.classList.contains('games-dialog');
    const itemElements = isGridDialog 
        ? context.element.querySelectorAll('.game-icon-item')
        : context.element.querySelectorAll('.dialog-list-item');
    
    if (isGridDialog) {
        // Grid navigation (2 columns)
        const gridCols = 2;
        const totalItems = context.items.length;
        const col = context.selectedIndex % gridCols;
        const row = Math.floor(context.selectedIndex / gridCols);
        const lastRow = Math.floor((totalItems - 1) / gridCols);

        switch(direction) {
            case 'up':
                if (row > 0) {
                    context.selectedIndex -= gridCols;
                } else {
                    // Wrap to the bottom row
                    context.selectedIndex = lastRow * gridCols + col;
                    // If the target spot in the last row is empty, go to the very last item
                    if (context.selectedIndex >= totalItems) {
                        context.selectedIndex = totalItems - 1;
                    }
                }
                break;
            
            // === JAVÍTOTT LEFELÉ LOGIKA KEZDETE ===
            case 'down':
                // Ha az utolsó sorban vagyunk, ugorjunk fel az elejére ugyanabban az oszlopban.
                if (row === lastRow) {
                    context.selectedIndex = col;
                } else {
                    // Ha nem az utolsó sorban vagyunk, próbáljunk lejjebb lépni.
                    const potentialNextIndex = context.selectedIndex + gridCols;
                    
                    // Ha a hely alattunk létezik, lépjünk oda.
                    if (potentialNextIndex < totalItems) {
                        context.selectedIndex = potentialNextIndex;
                    } else {
                        // Ha a hely alattunk üres (mert az utolsó sor rövidebb),
                        // akkor ugorjunk a grid legutolsó elemére.
                        context.selectedIndex = totalItems - 1;
                    }
                }
                break;
            // === JAVÍTOTT LEFELÉ LOGIKA VÉGE ===

            case 'left':
                context.selectedIndex = (context.selectedIndex - 1 + totalItems) % totalItems;
                break;
            case 'right':
                context.selectedIndex = (context.selectedIndex + 1) % totalItems;
                break;
        }
    } else {
        // List navigation (original)
        if (direction === 'up') {
            context.selectedIndex = (context.selectedIndex - 1 + context.items.length) % context.items.length;
        } else if (direction === 'down') {
            context.selectedIndex = (context.selectedIndex + 1) % context.items.length;
        }
    }
    
    // A .selected osztály frissítése az elemeken
    itemElements.forEach((item, index) => {
        item.classList.toggle('selected', index === context.selectedIndex);
    });

    // Görgetés a kiválasztott elemhez
    setTimeout(() => {
        const selectedElement = itemElements[context.selectedIndex];
        if (selectedElement) {
            selectedElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }
    }, 10);
    
    /* if (typeof playDTMF !== 'undefined') {
        playDTMF(direction === 'up' ? '2' : '8');
    } */
}

    selectDialogItem() {
        if (this.dialogStack.length === 0) return;
        
        const context = this.dialogStack[this.dialogStack.length - 1];
        const selectedItem = context.items[context.selectedIndex];
        
        if (context.onSelect) {
            context.onSelect(selectedItem);
        }
        
        /* if (typeof playDTMF !== 'undefined') {
            playDTMF('5');
        } */
    }

    closeCurrentDialog(silent = false) {
        if (this.dialogStack.length === 0) {
            this.showHomeScreen();
            return;
        }
        
        const context = this.dialogStack.pop();
        if (context.element && context.element.parentNode) {
            context.element.parentNode.removeChild(context.element);
        }
        
        if (this.dialogStack.length === 0) {
            this.showHomeScreen();
        }
        
        // ✅ Only play DTMF if not silent
        /* if (!silent && typeof playDTMF !== 'undefined') {
            playDTMF('1');
        }  */
        
        console.log('📋 Dialog closed' + (silent ? ' (silent)' : ''));
    }

    closeAllDialogs() {
        while (this.dialogStack.length > 0) {
            const context = this.dialogStack.pop();
            if (context.element && context.element.parentNode) {
                context.element.parentNode.removeChild(context.element);
            }
        }
        console.log('📋 All dialogs closed');
    }

    /* toggleModel() {
        if (typeof selectedModel !== 'undefined' && typeof MODELS !== 'undefined') {
            selectedModel = (selectedModel + 1) % MODELS.length;
            if (typeof saveToStorage === 'function') saveToStorage();
            
            // ✅ KEEP POSITION: Save current index before refresh
            const currentDialog = this.dialogStack[this.dialogStack.length - 1];
            const savedIndex = currentDialog ? currentDialog.selectedIndex : 0;
            
            this.closeCurrentDialog(true);  // ✅ Silent close
            this.showIntegratedAISettings();
            
            // Restore position
            if (this.dialogStack.length > 0) {
                this.dialogStack[this.dialogStack.length - 1].selectedIndex = savedIndex;
                const items = this.dialogStack[this.dialogStack.length - 1].element.querySelectorAll('.dialog-list-item');
                items.forEach((item, index) => {
                    item.classList.toggle('selected', index === savedIndex);
                });
            }
        }
    } */

    toggleModel() {
        if (typeof selectedModel !== 'undefined' && typeof MODELS !== 'undefined') {
            selectedModel = (selectedModel + 1) % MODELS.length;
            if (typeof saveToStorage === 'function') saveToStorage();
            
            const currentDialog = this.dialogStack[this.dialogStack.length - 1];
            if (currentDialog && currentDialog.element) {
                // Az index 0 maradt
                const itemElement = currentDialog.element.querySelector('[data-index="0"] .item-value');
                if (itemElement) itemElement.textContent = MODELS[selectedModel];
            }
        }
    }

     toggleVoiceModel() {
        if (typeof window.selectedVoiceModel !== 'undefined' && typeof VOICE_MODELS !== 'undefined') {
            window.selectedVoiceModel = (window.selectedVoiceModel + 1) % VOICE_MODELS.length;
            if (typeof saveToStorage === 'function') saveToStorage();

            const currentDialog = this.dialogStack[this.dialogStack.length - 1];
            if (currentDialog && currentDialog.element) {
                // Az új menüpont indexe 1
                const itemElement = currentDialog.element.querySelector('[data-index="1"] .item-value');
                if (itemElement) {
                    itemElement.textContent = VOICE_MODELS[window.selectedVoiceModel];
                }
            }
        }
    }

    selectProfile() {
        if (window.profileManager) {
            const currentDialog = this.dialogStack[this.dialogStack.length - 1];
            if (currentDialog && currentDialog.element) {
                currentDialog.element.style.display = 'none';
            }
            
            window.profileManager.showDialog();
            
            const originalOnChange = window.profileManager.onProfileChange;
            
            window.profileManager.onProfileChange = (profile) => {
                if (currentDialog && currentDialog.element) {
                    currentDialog.element.style.display = 'block';
                    
                    // ✅ JAVÍTÁS: A profil most már a 2-es indexen van
                    const profileItem = currentDialog.element.querySelector('[data-index="2"] .item-value');
                    if (profileItem) {
                        profileItem.textContent = `${profile.emoji} ${profile.name}`;
                    }
                }
                
                if (originalOnChange) {
                    originalOnChange(profile);
                }
                
                window.profileManager.onProfileChange = null;
            };
            
            const originalCancelSelection = window.profileManager.cancelSelection.bind(window.profileManager);
            window.profileManager.cancelSelection = function() {
                originalCancelSelection();
                
                if (currentDialog && currentDialog.element) {
                    currentDialog.element.style.display = 'block';
                }
                
                window.profileManager.cancelSelection = originalCancelSelection;
            };
        }
    }

    /* toggleT9() {
        if (typeof t9Mode !== 'undefined') {
            t9Mode = !t9Mode;
            if (typeof updateT9Display === 'function') updateT9Display();
            if (typeof saveToStorage === 'function') saveToStorage();
            
            // ✅ KEEP POSITION
            const currentDialog = this.dialogStack[this.dialogStack.length - 1];
            const savedIndex = currentDialog ? currentDialog.selectedIndex : 0;
            
            this.closeCurrentDialog(true);  // ✅ Silent close
            this.showInputSettings();
            
            if (this.dialogStack.length > 0) {
                this.dialogStack[this.dialogStack.length - 1].selectedIndex = savedIndex;
                const items = this.dialogStack[this.dialogStack.length - 1].element.querySelectorAll('.dialog-list-item');
                items.forEach((item, index) => {
                    item.classList.toggle('selected', index === savedIndex);
                });
            }
        }
    }

    toggleLanguage() {
        if (typeof currentLang !== 'undefined') {
            currentLang = currentLang === 'en' ? 'hu' : 'en';
            if (typeof dictionary !== 'undefined' && dictionary[currentLang].length === 0) {
                if (typeof loadDictionary === 'function') {
                    loadDictionary(currentLang);
                }
            }
            if (typeof updateLangDisplay === 'function') updateLangDisplay();
            if (typeof saveToStorage === 'function') saveToStorage();
            
            // ✅ KEEP POSITION
            const currentDialog = this.dialogStack[this.dialogStack.length - 1];
            const savedIndex = currentDialog ? currentDialog.selectedIndex : 0;
            
            this.closeCurrentDialog(true);  // ✅ Silent close
            this.showInputSettings();
            
            if (this.dialogStack.length > 0) {
                this.dialogStack[this.dialogStack.length - 1].selectedIndex = savedIndex;
                const items = this.dialogStack[this.dialogStack.length - 1].element.querySelectorAll('.dialog-list-item');
                items.forEach((item, index) => {
                    item.classList.toggle('selected', index === savedIndex);
                });
            }
        }
    } */

    toggleT9() {
        if (typeof t9Mode !== 'undefined') {
            t9Mode = !t9Mode;

            // 1. A státuszbárt továbbra is frissítjük.
            const inputModeEl = document.getElementById('inputMode');
            if (inputModeEl) {
                inputModeEl.textContent = t9Mode ? 'T9' : 'Abc';
            }
            
            if (typeof saveToStorage === 'function') saveToStorage();

            // 2. JAVÍTÁS: Célzottan frissítjük az értéket a JELENLEGI dialógusban.
            // Nem hívjuk meg a régi, globális updateT9Display() függvényt.
            const currentDialog = this.dialogStack[this.dialogStack.length - 1];
            if (currentDialog && currentDialog.element) {
                // Az 'Input Settings' dialógusban a T9 toggle az első elem (index 0).
                const itemElement = currentDialog.element.querySelector('[data-index="0"] .item-value');
                if (itemElement) {
                    itemElement.textContent = t9Mode ? 'ON' : 'OFF';
                }
            }
        }
    }

    toggleLanguage() {
        if (typeof currentLang !== 'undefined') {
            currentLang = currentLang === 'en' ? 'hu' : 'en';
            if (typeof dictionary !== 'undefined' && dictionary[currentLang].length === 0) {
                if (typeof loadDictionary === 'function') {
                    loadDictionary(currentLang);
                }
            }
            
            // A státuszbáron nincs mit frissíteni, így az a hívás elhagyható.
            if (typeof saveToStorage === 'function') saveToStorage();

            // JAVÍTÁS: Célzottan frissítjük az értéket a JELENLEGI dialógusban.
            // Nem hívjuk meg a régi, globális updateLangDisplay() függvényt.
            const currentDialog = this.dialogStack[this.dialogStack.length - 1];
            if (currentDialog && currentDialog.element) {
                // Az 'Input Settings' dialógusban a T9 lang a második elem (index 1).
                const itemElement = currentDialog.element.querySelector('[data-index="1"] .item-value');
                if (itemElement) {
                    itemElement.textContent = currentLang.toUpperCase();
                }
            }
        }
    }        

    isOnHomeScreen() {
        const homeScreen = document.getElementById('homeScreen');
        return homeScreen && !homeScreen.classList.contains('hidden');
    }

    isInChatGPT() {
        return this.currentApp === 'chatgpt';
    }

    hasOpenDialog() {
        return this.dialogStack.length > 0;
    }
}

window.appManager = new NokiaAppManager();