// AI Service Manager
// Handles communication with OpenAI, Mistral, and Gemini APIs

class AIServiceManager {
    constructor() {
        this.currentProvider = 'openai'; // Default provider
        this.conversationHistory = [];
        this.maxHistoryLength = 10; // Keep last 10 messages for context
    }

    // Set the current AI provider
    setProvider(provider) {
        if (['openai', 'mistral', 'gemini'].includes(provider)) {
            this.currentProvider = provider;
            return true;
        }
        return false;
    }

    // Get current provider info
    getCurrentProvider() {
        return {
            name: this.currentProvider,
            config: AI_CONFIG[this.currentProvider]
        };
    }

    // Add message to conversation history
    addToHistory(role, content) {
        this.conversationHistory.push({ role, content });

        // Keep only the last N messages to manage context length
        if (this.conversationHistory.length > this.maxHistoryLength) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
        }
    }

    // Clear conversation history
    clearHistory() {
        this.conversationHistory = [];
    }

    // Get conversation history for API context
    getConversationContext() {
        return this.conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    // Main method to get AI response
    async getAIResponse(userMessage) {
        // Add user message to history
        this.addToHistory('user', userMessage);

        try {
            let response;

            switch (this.currentProvider) {
                case 'openai':
                    response = await this.callOpenAI(userMessage);
                    break;
                case 'mistral':
                    response = await this.callMistral(userMessage);
                    break;
                case 'gemini':
                    response = await this.callGemini(userMessage);
                    break;
                default:
                    throw new Error('Unknown AI provider');
            }

            // Add AI response to history
            this.addToHistory('assistant', response);

            return response;

        } catch (error) {
            console.error(`Error with ${this.currentProvider}:`, error);
            throw error;
        }
    }

    // OpenAI API call
    async callOpenAI(userMessage) {
        const config = AI_CONFIG.openai;

        if (!config.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const messages = [
            { role: 'system', content: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses.' },
            ...this.getConversationContext()
        ];

        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: messages,
                max_tokens: config.maxTokens,
                temperature: config.temperature,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response from OpenAI';
    }

    // Mistral AI API call
    async callMistral(userMessage) {
        const config = AI_CONFIG.mistral;

        if (!config.apiKey) {
            throw new Error('Mistral API key not configured');
        }

        const messages = [
            { role: 'system', content: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses.' },
            ...this.getConversationContext()
        ];

        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: messages,
                max_tokens: config.maxTokens,
                temperature: config.temperature,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Mistral API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response from Mistral';
    }

    // Google Gemini API call
    async callGemini(userMessage) {
        const config = AI_CONFIG.gemini;

        if (!config.apiKey) {
            throw new Error('Gemini API key not configured');
        }

        // Gemini has a different API structure
        const contents = [
            {
                role: 'user',
                parts: [{ text: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses.' }]
            }
        ];

        // Add conversation context
        this.getConversationContext().forEach(msg => {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            });
        });

        const url = `${config.endpoint}?key=${config.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    maxOutputTokens: config.maxTokens,
                    temperature: config.temperature
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.candidates[0]?.content?.parts[0]?.text || 'No response from Gemini';
    }

    // Translate text using the current provider
    async translateText(text, sourceLang = 'auto', targetLang = 'English') {
        const provider = this.currentProvider;
        const systemPrompt = `You are a translation engine. Translate the user text into ${targetLang}. If a source language is provided (${sourceLang}), respect it; otherwise auto-detect. Return only the translated text with no extra commentary.`;

        switch (provider) {
            case 'openai': {
                const config = AI_CONFIG.openai;
                if (!config.apiKey) throw new Error('OpenAI API key not configured');
                const response = await fetch(config.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: config.model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: text }
                        ],
                        max_tokens: Math.min(1000, config.maxTokens),
                        temperature: 0.2,
                        stream: false
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
                }
                const data = await response.json();
                return data.choices[0]?.message?.content?.trim() || '';
            }
            case 'mistral': {
                const config = AI_CONFIG.mistral;
                if (!config.apiKey) throw new Error('Mistral API key not configured');
                const response = await fetch(config.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: config.model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: text }
                        ],
                        max_tokens: Math.min(1000, config.maxTokens),
                        temperature: 0.2,
                        stream: false
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Mistral API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
                }
                const data = await response.json();
                return data.choices[0]?.message?.content?.trim() || '';
            }
            case 'gemini': {
                const config = AI_CONFIG.gemini;
                if (!config.apiKey) throw new Error('Gemini API key not configured');
                const url = `${config.endpoint}?key=${config.apiKey}`;
                const contents = [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    { role: 'user', parts: [{ text }] }
                ];
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents,
                        generationConfig: {
                            maxOutputTokens: Math.min(1000, config.maxTokens),
                            temperature: 0.2
                        }
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
                }
                const data = await response.json();
                return data.candidates[0]?.content?.parts[0]?.text?.trim() || '';
            }
            default:
                throw new Error('Unknown provider');
        }
    }

    // Test API connection
    async testConnection(provider = null) {
        const testProvider = provider || this.currentProvider;
        const testMessage = 'Hello, this is a test message.';

        try {
            this.setProvider(testProvider);
            const response = await this.getAIResponse(testMessage);
            return {
                success: true,
                provider: testProvider,
                response: response
            };
        } catch (error) {
            return {
                success: false,
                provider: testProvider,
                error: error.message
            };
        }
    }

    // Get available providers
    getAvailableProviders() {
        return Object.keys(AI_CONFIG).filter(provider => {
            const config = AI_CONFIG[provider];
            return config && config.apiKey && config.apiKey.trim() !== '';
        });
    }

    // Validate API key format
    validateAPIKey(provider, apiKey) {
        if (!apiKey || apiKey.trim() === '') {
            return false;
        }

        switch (provider) {
            case 'openai':
                return apiKey.startsWith('sk-') && apiKey.length > 20;
            case 'mistral':
                return apiKey.startsWith('mistral-') && apiKey.length > 20;
            case 'gemini':
                return apiKey.length > 20; // Gemini keys don't have a specific prefix
            default:
                return false;
        }
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIServiceManager;
} else {
    window.AIServiceManager = AIServiceManager;
}
