/**
 * Nokia Messages Image Handler
 * Handles image attachment and Vision API integration for Messages app
 */

class MessagesImageHandler {
    constructor(messagesApp) {
        this.app = messagesApp;
        this.pendingImageAttachment = null;
    }

    /**
     * Show image selection dialog
     */
    async showImageAttachDialog() {
        if (!window.dcimManager) {
            showAlert('DCIM Manager not available', 'Error');
            return;
        }

        // ✅ Now async
        const images = await window.dcimManager.getAllImages();
        if (images.length === 0) {
            showAlert('No images in gallery', 'Info');
            return;
        }

        const dialog = document.createElement('div');
        dialog.className = 'app-dialog messages-image-attach-dialog';
        dialog.style.display = 'block';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'dialog-title';
        titleDiv.textContent = 'Select Image';
        dialog.appendChild(titleDiv);

        // ✅ ÚJ: Grid layout 3 oszloppal
        const grid = document.createElement('div');
        grid.className = 'dialog-list image-attach-grid';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        grid.style.gap = '8px';
        grid.style.padding = '8px';
        grid.style.maxHeight = '125px';
        grid.style.overflowY = 'auto';

        images.forEach((img, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dialog-list-item image-attach-item';
            if (index === 0) itemDiv.classList.add('selected');
            itemDiv.setAttribute('data-index', index);
            itemDiv.style.display = 'flex';
            itemDiv.style.flexDirection = 'column';
            itemDiv.style.alignItems = 'center';
            itemDiv.style.padding = '4px';
            itemDiv.style.border = '1px solid #666';
            itemDiv.style.borderRadius = '4px';
            itemDiv.style.cursor = 'pointer';

            // ✅ Nagyobb thumbnail
            const thumb = document.createElement('img');
            thumb.src = img.retro;
            thumb.className = 'image-attach-thumb';
            thumb.style.width = '100%';
            thumb.style.height = '60px';
            thumb.style.objectFit = 'cover';
            thumb.style.borderRadius = '2px';
            thumb.style.filter = 'grayscale(100%)';

            // ✅ Fájlnév
            const text = document.createElement('span');
            text.textContent = `Image ${images.length - index}`;
            text.style.fontSize = '9px';
            text.style.marginTop = '2px';
            text.style.textAlign = 'center';
            text.style.overflow = 'hidden';
            text.style.textOverflow = 'ellipsis';
            text.style.whiteSpace = 'nowrap';
            text.style.width = '100%';

            itemDiv.appendChild(thumb);
            itemDiv.appendChild(text);
            grid.appendChild(itemDiv);
        });

        dialog.appendChild(grid);

        const hint = document.createElement('div');
        hint.className = 'dialog-hint';
        hint.textContent = '▲▼◀▶ Navigate | OK Attach | C Cancel';
        dialog.appendChild(hint);

        const screen = document.querySelector('.screen');
        screen.appendChild(dialog);

        // Store context
        window.messagesImageAttachIndex = 0;
        window.messagesImageAttachActive = true;
        window.messagesImageAttachImages = images;
    }

    /**
     * Select image to attach
     */
    selectImageToAttach(imageIndex) {
        const images = window.messagesImageAttachImages;
        if (!images || imageIndex >= images.length) return;

        const selectedImage = images[imageIndex];

        // Close dialog
        const dialog = document.querySelector('.messages-image-attach-dialog');
        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
        window.messagesImageAttachActive = false;

        // Save the image with a temporary ID (will be associated with message later)
        this.pendingImageAttachment = {
            full: selectedImage.full,
            retro: selectedImage.retro
        };

        // ✅ ÚJ: NE jelenítsen alert-et, hanem frissítse az input field-et mini ikonnal!
        if (this.app && this.app.updateInputWithImageIndicator) {
            this.app.updateInputWithImageIndicator();
        }
    }

    /**
     * Send message with image using Vision API
     */
    async sendMessageWithImage(messageText, profileData, systemPrompt) {
        if (!this.pendingImageAttachment) {
            throw new Error('No pending image attachment');
        }

        if (!window.visionHandler) {
            throw new Error('Vision handler not available');
        }

        // Get conversation history (last 10 messages, text only)
        const thread = window.messagesStorage.getThread(profileData.profileId);
        const history = thread ? thread.messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
        })) : [];

        // Build a natural, conversational prompt for the AI
        let contextualPrompt = '';
        
        // If user sent text with the image, that's the main context
        if (messageText && messageText.trim()) {
            contextualPrompt = messageText;
        } else {
            // If no text, provide natural context for MMS behavior
            // Example: User just sent a photo without text (like sharing a moment)
            contextualPrompt = `${profileData.name} sent you a photo via MMS. / ${profileData.name} küldött egy fotót MMS-ben.`;
        }

        // Call Vision API with the FULL quality image
        const visionResponse = await window.visionHandler.analyzeImage(
            this.pendingImageAttachment.full,
            contextualPrompt,
            history,
            systemPrompt
        );

        // ✅ ÚJ API: Mentjük el a képet a központi tárolóba
        const attachmentId = window.imageAttachments.saveMessageImage(
            this.pendingImageAttachment,  // imageData: {full, retro}
            profileData.profileId  // threadId
        );

        // Clear pending attachment
        this.pendingImageAttachment = null;

        return {
            aiReply: visionResponse.choices[0].message.content,
            usage: visionResponse.usage,
            model: visionResponse.model || 'gpt-4.1-nano',
            attachmentId: attachmentId
        };
    }

    /**
     * Render message with image attachment (retro version for display)
     */
    async renderMessageWithImage(bubble, attachmentId) {
        if (!attachmentId || !window.imageAttachments) return;

        const imageData = await window.imageAttachments.getMessageImage(attachmentId);
        if (!imageData) return;

        // Add image to bubble
        const imgEl = document.createElement('img');
        imgEl.src = imageData.retro;
        imgEl.className = 'msg-image';
        imgEl.style.maxWidth = '100%';
        imgEl.style.height = 'auto';
        imgEl.style.borderRadius = '4px';
        imgEl.style.marginTop = '4px';
        imgEl.style.filter = 'grayscale(100%)';
        imgEl.style.display = 'block';

        // Insert before timestamp
        const textDiv = bubble.querySelector('.msg-text');
        if (textDiv) {
            textDiv.appendChild(imgEl);
        }
    }

    /**
     * Check if there's a pending attachment
     */
    hasPendingAttachment() {
        return !!this.pendingImageAttachment;
    }

    /**
     * Clear pending attachment
     */
    clearPendingAttachment() {
        this.pendingImageAttachment = null;
    }
}

// Export for use in Messages app
window.MessagesImageHandler = MessagesImageHandler;
