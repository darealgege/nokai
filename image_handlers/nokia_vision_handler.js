/**
 * Nokia Vision Handler
 * Handles image analysis using OpenAI Vision API
 */

class NokiaVisionHandler {
    constructor() {
        this.apiKey = null;
    }

    /**
     * Initialize with API key from session
     */
    init() {
        if (window.apiKeyManager) {
            this.apiKey = window.apiKeyManager.getSessionApiKey();
        }
        return !!this.apiKey;
    }

    /**
     * Analyze a single image with Vision API
     * @param {string} base64Image - Base64 encoded image (full quality)
     * @param {string} userMessage - User's message/question about the image
     * @param {array} conversationHistory - Previous messages for context
     * @param {string} systemPrompt - System prompt (profile prompt if applicable)
     * @returns {Promise<object>} - API response
     */
    async analyzeImage(base64Image, userMessage, conversationHistory = [], systemPrompt = null) {
        if (!this.init()) {
            throw new Error('API key not available');
        }

        // ✅ Validate base64Image
        if (!base64Image || typeof base64Image !== 'string') {
            console.error('❌ Invalid base64Image:', base64Image);
            throw new Error('Invalid image data: base64Image is required');
        }

        // Ensure base64 has proper data URL prefix
        let imageUrl = base64Image;
        if (!base64Image.startsWith('data:image/')) {
            // Try to detect format from base64
            if (base64Image.startsWith('/9j/')) {
                imageUrl = `data:image/jpeg;base64,${base64Image}`;
            } else if (base64Image.startsWith('iVBORw')) {
                imageUrl = `data:image/png;base64,${base64Image}`;
            } else {
                imageUrl = `data:image/jpeg;base64,${base64Image}`;
            }
        }

        // Build messages array
        const messages = [];

        // Add system prompt if provided
        if (systemPrompt) {
            messages.push({
                role: 'system',
                content: systemPrompt
            });
        }

        // Add conversation history (text only)
        if (conversationHistory && conversationHistory.length > 0) {
            conversationHistory.forEach(msg => {
                if (msg.role && msg.content && typeof msg.content === 'string') {
                    messages.push({
                        role: msg.role,
                        content: msg.content
                    });
                }
            });
        }

        // Add current message with image
        messages.push({
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: userMessage || 'What do you see in this image?'
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: imageUrl,
                        detail: 'auto' // Can be 'low', 'high', or 'auto'
                    }
                }
            ]
        });

        // API call
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4.1-nano', // ✅ Vision-capable nano model
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Vision API error');
        }

        return await response.json();
    }

    /**
     * Analyze multiple images
     * @param {array} base64Images - Array of base64 encoded images
     * @param {string} userMessage - User's message/question
     * @param {array} conversationHistory - Previous messages
     * @param {string} systemPrompt - System prompt
     * @returns {Promise<object>} - API response
     */
    async analyzeMultipleImages(base64Images, userMessage, conversationHistory = [], systemPrompt = null) {
        if (!this.init()) {
            throw new Error('API key not available');
        }

        // Build messages array
        const messages = [];

        if (systemPrompt) {
            messages.push({
                role: 'system',
                content: systemPrompt
            });
        }

        if (conversationHistory && conversationHistory.length > 0) {
            conversationHistory.forEach(msg => {
                if (msg.role && msg.content && typeof msg.content === 'string') {
                    messages.push({
                        role: msg.role,
                        content: msg.content
                    });
                }
            });
        }

        // Build content array with text and all images
        const content = [
            {
                type: 'text',
                text: userMessage || 'What do you see in these images?'
            }
        ];

        // Add all images
        base64Images.forEach((base64Image) => {
            let imageUrl = base64Image;
            if (!base64Image.startsWith('data:image/')) {
                if (base64Image.startsWith('/9j/')) {
                    imageUrl = `data:image/jpeg;base64,${base64Image}`;
                } else if (base64Image.startsWith('iVBORw')) {
                    imageUrl = `data:image/png;base64,${base64Image}`;
                } else {
                    imageUrl = `data:image/jpeg;base64,${base64Image}`;
                }
            }

            content.push({
                type: 'image_url',
                image_url: {
                    url: imageUrl,
                    detail: 'auto'
                }
            });
        });

        messages.push({
            role: 'user',
            content: content
        });

        // API call
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4.1-nano', // ✅ Vision-capable nano model
                messages: messages,
                max_tokens: 1500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Vision API error');
        }

        return await response.json();
    }
}

// Initialize global instance
window.visionHandler = new NokiaVisionHandler();
