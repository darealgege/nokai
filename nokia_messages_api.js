/**
 * Nokia Messages API
 * Handles OpenAI API calls for message conversations
 */

class NokiaMessagesAPI {
    constructor() {
        this.apiUrl = 'openaiProxy.php';
        this.defaultModel = 'gpt-4.1-nano'; // Fast and cheap for SMS-style messages
    }

    /**
     * Send a message and get AI response
     * @param {Array} messages - Conversation history in OpenAI format
     * @param {string} systemPrompt - AI profile prompt
     * @param {string} model - Optional model override
     * @returns {Promise<Object>} API response
     */
    async sendMessage(messages, systemPrompt, model = this.defaultModel) {
        const payload = {
            model: model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                ...messages
            ],
            temperature: 0.7,
            max_tokens: 500, // SMS-style: shorter responses
            stream: false
        };

        //console.log('📤 SENDING MESSAGE TO AI');
        //console.log('🎯 Model:', model);
        //console.log('💬 Messages:', messages.length);
        const apiKey = window.apiKeyManager.getSessionApiKey();
            if (!apiKey) {
                throw new Error("API Key is not available.");
            }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            //console.log('📥 RECEIVED AI RESPONSE');
            //console.log('✅ Model used:', data.model);
            //console.log('💰 Tokens:', data.usage);

            return data;

        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    }

    /**
     * Stream a message (for future feature)
     * @param {Array} messages - Conversation history
     * @param {string} systemPrompt - AI profile prompt
     * @param {Function} onChunk - Callback for each chunk
     * @param {string} model - Optional model override
     */
    async streamMessage(messages, systemPrompt, onChunk, model = this.defaultModel) {
        const payload = {
            model: model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                ...messages
            ],
            temperature: 0.7,
            max_tokens: 500,
            stream: true
        };

        console.log('📤 STREAMING MESSAGE TO AI');

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices[0]?.delta?.content;
                            if (delta && onChunk) {
                                onChunk(delta);
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            }

            console.log('✅ Stream completed');

        } catch (error) {
            console.error('❌ Stream Error:', error);
            throw error;
        }
    }
}

// Initialize global instance
window.messagesAPI = new NokiaMessagesAPI();
