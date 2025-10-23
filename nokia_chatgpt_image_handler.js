/**
 * Nokia ChatGPT Image Handler
 * Handles image attachment and Vision API integration for ChatGPT app
 */

class ChatGPTImageHandler {
    constructor(chatApp) {
        this.app = chatApp;
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
        dialog.className = 'app-dialog chatgpt-image-attach-dialog';
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
        window.chatgptImageAttachIndex = 0;
        window.chatgptImageAttachActive = true;
        window.chatgptImageAttachImages = images;
    }

    /**
     * Select image to attach
     */
    selectImageToAttach(imageIndex) {
        const images = window.chatgptImageAttachImages;
        if (!images || imageIndex >= images.length) return;

        const selectedImage = images[imageIndex];

        // Close dialog
        const dialog = document.querySelector('.chatgpt-image-attach-dialog');
        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
        window.chatgptImageAttachActive = false;

        // Save the image with a temporary ID (will be associated with message later)
        this.pendingImageAttachment = {
            full: selectedImage.full,
            retro: selectedImage.retro
        };

        // ✅ ÚJ: Frissítsük az inputText-et indikátorral
        if (typeof updateDisplay === 'function') {
            updateDisplay();
        }
    }

    /**
     * Send message with image using Vision API
     */
    async sendMessageWithImage(messageText, conversationHistory) {
        if (!this.pendingImageAttachment) {
            throw new Error('No pending image attachment');
        }

        if (!window.visionHandler) {
            throw new Error('Vision handler not available');
        }

        // Get system prompt with date/weather
        const now = new Date();
        const dateTimeString = now.toLocaleString('hu-HU', { hour12: false });
        let systemPrompt = `Current date and time is ${dateTimeString}.`;
        
        if (typeof getWeatherData === 'function') {
            try {
                const weather = await getWeatherData();
                if (weather) {
                    systemPrompt += ` ${weather}`;
                }
            } catch (error) {
                console.warn('Could not get weather:', error);
            }
        }

        systemPrompt += `\n\nYou are a helpful AI assistant on a Nokia phone. The user may share photos with you as part of natural conversation - they might be sharing experiences (e.g., "Beautiful weather!" with a nature photo / "Szép az idő!" természet fotóval), showing you something (e.g., "My new outfit" with a selfie / "Az új ruchám" szelfi képpel), or asking for your opinion. Respond naturally and conversationally, as you would in a text message chat. Don't always assume they want technical image analysis unless they explicitly ask for it (e.g., "What's in this image?" / "Mi van ezen a képen?").`;

        // Build contextual prompt based on user's message
        let contextualPrompt = '';
        
        if (messageText && messageText.trim()) {
            // User provided context with their image
            contextualPrompt = messageText;
        } else {
            // No text provided - they just shared a photo
            contextualPrompt = `I'm sharing a photo with you. / Megosztok veled egy fotót.`;
        }

        // Call Vision API with the FULL quality image
        const visionResponse = await window.visionHandler.analyzeImage(
            this.pendingImageAttachment.full,
            contextualPrompt,
            conversationHistory || [],
            systemPrompt
        );

        // ✅ ÚJ API: Mentjük el a képet a központi tárolóba
        const attachmentId = window.imageAttachments.saveChatImage(
            this.pendingImageAttachment  // imageData: {full, retro}
        );

        // Clear pending attachment
        this.pendingImageAttachment = null;
        this.clearPendingAttachment(); 
        return {
            aiReply: visionResponse.choices[0].message.content,
            usage: visionResponse.usage,
            model: visionResponse.model || 'gpt-4.1-nano',
            attachmentId: attachmentId
        };
    }

    /**
     * Add image to message bubble (retro version for display)
     */
    async addImageToBubble(messageDiv, attachmentId) {
        if (!attachmentId || !window.imageAttachments) return;

        const imageData = await window.imageAttachments.getChatImage(attachmentId);
        if (!imageData) return;

        // Add image to message
        const imgEl = document.createElement('img');
        imgEl.src = imageData.retro;
        imgEl.className = 'chat-image';
        imgEl.style.maxWidth = '100%';
        imgEl.style.height = '96px';
        imgEl.style.borderRadius = '4px'; 
        imgEl.style.marginTop = '4px';
        imgEl.style.filter = 'grayscale(100%)';
        imgEl.style.display = 'block';

        messageDiv.appendChild(imgEl);
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
        // ✅ ÚJ: Frissítsük az inputText-et hogy az emoji eltűnjön
        if (typeof updateDisplay === 'function') {
            updateDisplay();
        }
    }
}

// Export for use in ChatGPT app
window.ChatGPTImageHandler = ChatGPTImageHandler;
