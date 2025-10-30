// Nokia Profile Manager
// Handles AI profile selection and management

class NokiaProfileManager {
    constructor() {
        this.profiles = [];
        this.selectedProfileIndex = 0;
        this.isDialogOpen = false;
        this.dialogScrollOffset = 0;
        
        // Callbacks
        this.onProfileChange = null;
        
        // Voice mapping for each profile
        this.profileVoiceMap = {
            'penny': 'marin',       
            'sheldon': 'verse',        
            'leonard': 'echo',        
            'gyuszi': 'echo',         
            'gazsi': 'ash',    
            'monday': 'shimmer',  
            'aion': 'ash',                      
            'photographer': 'marin',  
            'lang_teacher': 'cedar', 
            'teacher': 'sage', 
            'flight_instructor': 'ash', 
            'edhu': 'alloy', 
            'psychologist': 'ash', 
            'lawyer': 'ash', 
            'doctor': 'ash', 
            'bullshit_decoder': 'shimmer', 
            'bullshit_generator': 'shimmer', 
            'accountant': 'coral', 
            'poem_writer': 'coral', 
            'developer': 'ash', 
            'columbo': 'ash', 
            'lazy_teen': 'echo', 
            'peter': 'echo',  // alias for lazy_teen
            'friendly': 'echo', 
            'clown': 'ballad', 
            'pirate': 'ballad'
        };
    }
    
    // Load all available profiles
    async loadProfiles() {
        try {
            const response = await fetch('list_profiles.php');
            if (!response.ok) {
                throw new Error('Failed to fetch profile list');
            }
            
            const profileFiles = await response.json();
            
            for (const file of profileFiles) {
                try {
                    const fileResponse = await fetch(`profiles/${file}`);
                    if (!fileResponse.ok) {
                        throw new Error(`HTTP ${fileResponse.status}`);
                    }
                    const content = await fileResponse.text();
                    const profile = this.parseProfile(content, file);
                    if (profile) {
                        this.profiles.push(profile);
                    }
                } catch (error) {
                    console.error(`Failed to load profile ${file}:`, error);
                }
            }
            
            console.log(`✅ Loaded ${this.profiles.length} profiles`);
            
            // Load saved profile index OR set default to Penny (2-penny.ini)
            const savedIndex = localStorage.getItem('nokia_selected_profile');
            if (savedIndex !== null) {
                this.selectedProfileIndex = parseInt(savedIndex, 10);
                if (this.selectedProfileIndex >= this.profiles.length) {
                    this.selectedProfileIndex = 0;
                }
            } else {
                // Find Penny profile (2-penny.ini) as default
                const pennyIndex = this.profiles.findIndex(p => p.filename === '2-penny.ini');
                if (pennyIndex !== -1) {
                    this.selectedProfileIndex = pennyIndex;
                    console.log('👧 Default profile set to Penny');
                } else {
                    this.selectedProfileIndex = 0;
                    console.log('⚠️ Penny not found, using first profile as default');
                }
                // Save the default
                localStorage.setItem('nokia_selected_profile', this.selectedProfileIndex.toString());
            }
            
            const currentProfile = this.getSelectedProfile();
            if (currentProfile) {
                console.log(`👤 Active profile: ${currentProfile.emoji} ${currentProfile.name}`);
            }
            
        } catch (error) {
            console.error('Failed to load profiles:', error);
        }
    }
    
    // Parse profile .ini file
    parseProfile(content, filename) {
        const lines = content.split(/\r?\n/);
        
        if (lines.length < 2) {
            return null;
        }
        
        const firstLine = lines[0].trim();
        
        // Match ANY emoji at the start (more flexible regex)
        // This matches emojis with skin tones, variations, etc.
        const emojiMatch = firstLine.match(/^([\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F300}-\u{1FAD6}]+(?:[\u{FE00}-\u{FE0F}\u{1F3FB}-\u{1F3FF}])?\s*)(.+)$/u);
        
        if (!emojiMatch) {
            return null;
        }
        
        const emoji = emojiMatch[1].trim();
        const name = emojiMatch[2];
        const prompt = lines.slice(1).join('\n').trim();
        
        return {
            filename,
            emoji,
            name,
            prompt,
            fullName: `${emoji} ${name}`
        };
    }
    
    // Get current selected profile
    getSelectedProfile() {
        if (this.profiles.length === 0) return null;
        return this.profiles[this.selectedProfileIndex];
    }
    
    // Get voice for a profile
    getVoiceForProfile(profile) {
        if (!profile) return 'echo'; // default voice
        
        // Extract key from filename (remove number prefix and .ini extension)
        // e.g. "2-penny.ini" -> "penny"
        const key = profile.filename
            .replace(/^\d+-/, '')  // remove number prefix
            .replace(/\.ini$/, '') // remove .ini extension
            .toLowerCase();
        
        return this.profileVoiceMap[key] || 'echo'; // default to 'echo' if not found
    }
    
    showDialog() {
        if (this.isDialogOpen) return;
        
        const dialog = document.getElementById('profileDialog');
        if (!dialog) return;
        
        this.isDialogOpen = true;
        this.dialogScrollOffset = 0;
        
        this.renderProfileList();
        dialog.classList.remove('hidden');
        
        console.log('📋 Profile selection dialog opened');
    }
    
    closeDialog() {
        if (!this.isDialogOpen) return;
        
        const dialog = document.getElementById('profileDialog');
        if (!dialog) return;
        
        this.isDialogOpen = false;
        dialog.classList.add('hidden');
        
        console.log('❌ Profile selection dialog closed');
    }
    
    // Render profile list in dialog
    renderProfileList() {
        const listContainer = document.getElementById('profileList');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        const maxVisibleItems = 4;
        const startIndex = Math.max(0, this.selectedProfileIndex - Math.floor(maxVisibleItems / 2));
        const endIndex = Math.min(this.profiles.length, startIndex + maxVisibleItems);
        
        // Adjust start index if we're near the end
        const adjustedStart = Math.max(0, Math.min(startIndex, this.profiles.length - maxVisibleItems));
        
        for (let i = adjustedStart; i < Math.min(adjustedStart + maxVisibleItems, this.profiles.length); i++) {
            const profile = this.profiles[i];
            const item = document.createElement('div');
            item.className = 'profile-item';
            
            if (i === this.selectedProfileIndex) {
                item.classList.add('selected');
            }
            
            // ✅ JAVÍTÁS: Emoji és név külön span elemekben
            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'profile-item-emoji';
            emojiSpan.textContent = profile.emoji;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'profile-item-name';
            nameSpan.textContent = ' ' + profile.name;
            
            item.appendChild(emojiSpan);
            item.appendChild(nameSpan);
            item.dataset.profileIndex = i;
            
            listContainer.appendChild(item);
        }
        
        // Update scroll indicator
        const scrollIndicator = document.querySelector('.profile-dialog-scroll');
        if (scrollIndicator) {
            if (this.profiles.length > maxVisibleItems) {
                const scrollPercent = (this.selectedProfileIndex / (this.profiles.length - 1)) * 100;
                scrollIndicator.textContent = `${this.selectedProfileIndex + 1}/${this.profiles.length}`;
            } else {
                scrollIndicator.textContent = '';
            }
        }
    }
    
    // Navigate up in dialog
    navigateUp() {
        if (!this.isDialogOpen) return;
        
        if (this.selectedProfileIndex > 0) {
            this.selectedProfileIndex--;
        } else {
            // Wrap around to the end
            this.selectedProfileIndex = this.profiles.length - 1;
        }
        this.renderProfileList();
        //window.playDTMF('2');
    }
    
    // Navigate down in dialog
    navigateDown() {
        if (!this.isDialogOpen) return;
        
        if (this.selectedProfileIndex < this.profiles.length - 1) {
            this.selectedProfileIndex++;
        } else {
            // Wrap around to the beginning
            this.selectedProfileIndex = 0;
        }
        this.renderProfileList();
        //window.playDTMF('8');
    }
    
    confirmSelection() {
        if (!this.isDialogOpen) return;
        
        const selectedProfile = this.getSelectedProfile();
        console.log(`👉 Profile selected: ${selectedProfile.name} (index: ${this.selectedProfileIndex})`);
        
        localStorage.setItem('nokia_selected_profile', this.selectedProfileIndex.toString());
        
        this.closeDialog();
        
        const menuItem = document.querySelector('.menu-screen .menu-item[data-index="2"]');
        if (menuItem) {
            const emoji = selectedProfile.emoji;
            const name = selectedProfile.name;
            const newHtml = `3. Profile: <span style="font-size: 80%;">${emoji}</span> ${name}`;
            menuItem.innerHTML = newHtml;
            void menuItem.offsetHeight;
            menuItem.classList.remove('menu-item');
            void menuItem.offsetHeight;
            menuItem.classList.add('menu-item');
        }
        
        if (this.onProfileChange) {
            console.log('📢 Triggering onProfileChange callback');
            this.onProfileChange(selectedProfile);
        }
        
        //window.playDTMF('5');
        
        console.log(`✅ Profile selection complete`);
    }
    
    // Cancel selection (close dialog without changing)
    cancelSelection() {
        if (!this.isDialogOpen) return;
        
        // Restore previous selection from storage
        const savedIndex = localStorage.getItem('nokia_selected_profile');
        if (savedIndex !== null) {
            this.selectedProfileIndex = parseInt(savedIndex, 10);
        }
        
        this.closeDialog();
        
        // CRITICAL: Force update menu to show the original profile
        const menuItem = document.querySelector('.menu-screen .menu-item[data-index="2"]');
        if (menuItem) {
            const profile = this.getSelectedProfile();
            if (profile) {
                const emoji = profile.emoji;
                const name = profile.name;
                const newHtml = `3. Profile: <span style="font-size: 80%;">${emoji}</span> ${name}`;
                menuItem.innerHTML = newHtml;
            }
        }
        
        //window.playDTMF('1');
    }
}

// Export for use in main app
window.NokiaProfileManager = NokiaProfileManager;
