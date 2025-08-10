// AI Service Configuration
// IMPORTANT: Never commit this file with real API keys to version control
// Add this file to .gitignore

const AI_CONFIG = {
    // OpenAI Configuration
    openai: {
        apiKey: '', // Add your OpenAI API key here
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-3.5-turbo',
        maxTokens: 1000,
        temperature: 0.7
    },

    // Mistral AI Configuration
    mistral: {
        apiKey: '', // Add your Mistral API key here
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        model: 'mistral-small-latest',
        maxTokens: 1000,
        temperature: 0.7
    },

    // Google Gemini Configuration
    gemini: {
        apiKey: '', // Add your Gemini API key here
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        model: 'gemini-2.0-flash',
        maxTokens: 1000,
        temperature: 0.7
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI_CONFIG;
} else {
    window.AI_CONFIG = AI_CONFIG;
}
