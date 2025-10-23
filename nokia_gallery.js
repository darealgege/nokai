/**
 * Nokia Gallery App
 * View, browse, and delete photos from DCIM
 */

class NokiaGallery {
    constructor() {
        this.isActive = false;
        this.container = null;
        this.photos = [];
        this.currentIndex = 0;
        this.isFullscreen = false;
    }
    
    async show() {
        if (this.isActive) return;
        
        this.isActive = true;
        await this.loadPhotos();
        this.createUI();
        
        console.log('🖼️ Gallery opened');
    }
    
    hide() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // ✅ Restore status bar if was in fullscreen
        if (this.isFullscreen) {
            this.isFullscreen = false;
            const statusBar = document.querySelector('.status-bar');
            if (statusBar) statusBar.style.display = 'flex';
        }
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        this.container = null;
        
        // Return to home screen
        if (window.appManager) {
            window.appManager.showHomeScreen();
        }
        
        console.log('🖼️ Gallery closed');
    }
    
    async loadPhotos() {
        try {
            // ✅ Load from IndexedDB instead of localStorage
            this.photos = await window.imageIndexedDB.getAllDCIMPhotos();
            if (!this.photos) {
                this.photos = [];
            }
        } catch(e) {
            console.error('Failed to load photos:', e);
            this.photos = [];
        }
        
        console.log(`📷 Loaded ${this.photos.length} photos from IndexedDB`);
    }
    
    createUI() {
        const screen = document.querySelector('.screen');
        if (!screen) return;
        
        // Hide other screens
        const homeScreen = document.getElementById('homeScreen');
        const screenContent = document.getElementById('screenContent');
        if (homeScreen) homeScreen.classList.add('hidden');
        if (screenContent) screenContent.classList.add('hidden');
        
        // Create gallery container
        this.container = document.createElement('div');
        this.container.className = 'gallery-container';
        
        if (this.photos.length === 0) {
            this.container.innerHTML = `
                <div class="gallery-empty">
                    <div style="font-size: 48px; margin-bottom: 10px;">📷</div>
                    <div style="font-size: 14px;">No photos</div>
                    <div style="font-size: 11px; margin-top: 5px; opacity: 0.7;">Take some photos with Camera app</div>
                </div>
                <div class="gallery-hint">
                    Menu Home
                </div>
            `;
        } else {
            this.container.innerHTML = `
                <div class="gallery-viewer" id="galleryViewer">
                    <img id="galleryImage" src="" alt="Photo">
                </div>
                <div class="gallery-info" id="galleryInfo">
                    <span id="galleryCounter">1/${this.photos.length}</span>
                    <span id="galleryDate"></span>
                </div>
                <div class="gallery-hint">
                    ◀▶ Browse | OK Fullscreen | C Delete | Menu Home
                </div>
            `;
        }
        
        screen.appendChild(this.container);
        
        // Event listeners - removed, now using D-pad navigation
        if (this.photos.length > 0) {
            this.showPhoto();
        }
    }
    
    showPhoto() {
        if (this.photos.length === 0) return;
        
        const photo = this.photos[this.currentIndex];
        const img = document.getElementById('galleryImage');
        const counter = document.getElementById('galleryCounter');
        const dateEl = document.getElementById('galleryDate');
        
        if (img) {
            // Show retro version
            img.src = photo.retro;
        }
        
        if (counter) {
            counter.textContent = `${this.currentIndex + 1}/${this.photos.length}`;
        }
        
        if (dateEl && photo.date) {
            const date = new Date(photo.date);
            dateEl.textContent = date.toLocaleString();
        }
    }
    
    prev() {
        if (this.photos.length === 0) return;
        
        this.currentIndex = (this.currentIndex - 1 + this.photos.length) % this.photos.length;
        this.showPhoto();
        
        //if (typeof playDTMF !== 'undefined') playDTMF('4');
    }
    
    next() {
        if (this.photos.length === 0) return;
        
        this.currentIndex = (this.currentIndex + 1) % this.photos.length;
        this.showPhoto();
        
        //if (typeof playDTMF !== 'undefined') playDTMF('6');
    }
    
    toggleFullscreen() {
        if (this.photos.length === 0) {
            console.log('🖼️ Gallery is empty, fullscreen is disabled.');
            return;
        }        
        this.isFullscreen = !this.isFullscreen;
        
        const viewer = document.getElementById('galleryViewer');
        const info = document.getElementById('galleryInfo');
        const hint = this.container.querySelector('.gallery-hint');
        const statusBar = document.querySelector('.status-bar');
        const screen = document.querySelector('.screen');
        
        if (this.isFullscreen) {
            // ✅ Fullscreen: Position relative to .screen, not .gallery-container
            const screenRect = screen.getBoundingClientRect();
            
            viewer.style.position = 'fixed';
            viewer.style.top = screenRect.top + 'px';
            viewer.style.left = screenRect.left + 'px';
            viewer.style.width = screenRect.width + 'px';
            viewer.style.height = screenRect.height + 'px';
            viewer.style.zIndex = '500';
            viewer.style.background = '#000';
            
            if (info) info.style.display = 'none';
            if (hint) hint.style.display = 'none';
            if (statusBar) statusBar.style.display = 'none';
        } else {
            // ✅ Normal: restore original layout
            viewer.style.position = '';
            viewer.style.top = '';
            viewer.style.left = '';
            viewer.style.width = '';
            viewer.style.height = '';
            viewer.style.right = '';
            viewer.style.bottom = '';
            viewer.style.zIndex = '';
            viewer.style.background = '';
            
            if (info) info.style.display = 'flex';
            if (hint) hint.style.display = 'block';
            if (statusBar) statusBar.style.display = 'flex';
        }
        
        //if (typeof playDTMF !== 'undefined') playDTMF('5');
    }
    
    deletePhoto() {
        if (this.photos.length === 0) return;

        if (typeof showConfirmationDialog === 'function') {
            showConfirmationDialog('Delete this photo?', async () => {
                await this.confirmDelete();
            });
        } else {
            if (confirm('Delete this photo?')) {
                this.confirmDelete();
            }
        }
    }
    
    async confirmDelete() {
        // ✅ Töröljük a fényképet!
        
        const photoToDelete = this.photos[this.currentIndex];
        
        // ✅ ÚJ API: Távolítsuk el a Gallery referenciát
        if (window.imageAttachments && photoToDelete.id) {
            window.imageAttachments.removeGalleryReference(photoToDelete.id);
        }
        
        // ✅ Delete from IndexedDB instead of localStorage
        try {
            await window.imageIndexedDB.deleteDCIMPhoto(photoToDelete.id);
            // Remove from local array
            this.photos.splice(this.currentIndex, 1);
        } catch(e) {
            console.error('Failed to delete photo:', e);
            alert('Failed to delete photo');
            return;
        }
        
        // Update view
        if (this.photos.length === 0) {
            this.hide();
            this.show(); // Recreate with empty state
        } else {
            if (this.currentIndex >= this.photos.length) {
                this.currentIndex = this.photos.length - 1;
            }
            this.showPhoto();
            
            // Update counter
            const counter = document.getElementById('galleryCounter');
            if (counter) {
                counter.textContent = `${this.currentIndex + 1}/${this.photos.length}`;
            }
        }
        
        console.log('🗑️ Photo deleted');
    }
}

// Initialize
window.nokiaGallery = new NokiaGallery();
