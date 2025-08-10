// Enhanced Chat Interface with Multi-AI Provider Support and Chat Management
class ChatInterface {
    constructor() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.messageInput = document.getElementById('message');
        this.sendButton = document.getElementById('send-button');
        this.chatContainer = document.getElementById('chat');
        this.providerSelector = document.getElementById('ai-provider');
        this.providerIcon = document.getElementById('provider-icon');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.clearAllBtn = document.getElementById('clear-all-chats');
        this.chatSidebar = document.getElementById('chat-sidebar');
        this.chatList = document.getElementById('chat-list');
        this.isProcessing = false;

        // Chat management
        this.chats = [];
        this.currentChatId = null;
        this.saveTimeout = null; // For debouncing localStorage saves

        // Initialize AI service manager
        this.aiManager = new AIServiceManager();

        this.initializeEventListeners();
        this.loadChats();
        this.createNewChat(); // Start with a new chat
        this.updateProviderStatus();
        this.updateProviderIcon();
        this.ensureInputReady();
        // Test connection on startup if provider has API key
        const currentProvider = this.aiManager.getCurrentProvider();
        if (currentProvider.config.apiKey) {
            this.testCurrentProvider();
        }

        // Refocus input when window regains focus (Electron)
        window.addEventListener('focus', () => this.ensureInputReady());
    }

    initializeEventListeners() {
        // Send button click
        this.sendButton.addEventListener('click', () => this.sendMessage());
        // Enter key press
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        // Provider selection change
        this.providerSelector.addEventListener('change', (e) => {
            this.switchAIProvider(e.target.value);
        });
        // Chat management
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        this.newChatBtn.addEventListener('click', () => this.createNewChat());
        if (this.clearAllBtn) {
            this.clearAllBtn.addEventListener('click', () => this.clearAllChats());
        }
        // Section tabs
        const sectionTabs = {
            intelligence: document.getElementById('section-intelligence'),
            translate: document.getElementById('section-translate'),
            settings: document.getElementById('section-settings')
        };
        Object.entries(sectionTabs).forEach(([name, el]) => {
            if (!el) return;
            el.addEventListener('click', () => this.switchSectionTab(name));
        });
        // Settings save
        const saveBtn = document.getElementById('save-keys');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAPIKeys());
        }
        // Translation handlers
        const translateBtn = document.getElementById('translate-btn');
        const swapBtn = document.getElementById('swap-langs');
        if (translateBtn) translateBtn.addEventListener('click', () => this.handleTranslate());
        if (swapBtn) swapBtn.addEventListener('click', () => this.swapLanguages());
        // Hide sidebar on outside click
        document.addEventListener('click', (e) => {
            this.handleDocumentClick(e);
        });
    }

    handleDocumentClick(event) {
        // Check if sidebar is visible and click is outside of it
        if (!this.chatSidebar.classList.contains('chat-sidebar-hidden') &&
            !this.chatSidebar.contains(event.target) &&
            !this.sidebarToggle.contains(event.target)) {
            this.hideSidebar();
        }
    }

    hideSidebar() {
        this.chatSidebar.classList.add('chat-sidebar-hidden');
    }

    toggleSidebar() {
        this.chatSidebar.classList.toggle('chat-sidebar-hidden');
    }

    createNewChat() {
        const chatId = Date.now().toString();
        const newChat = {
            id: chatId,
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        this.chats.unshift(newChat);
        this.currentChatId = chatId;
        this.saveChats();
        this.renderChatList();
        this.loadChat(chatId);
        // Ensure typing is possible after creating a chat
        this.isProcessing = false;
        if (this.messageInput) {
            this.messageInput.disabled = false;
            this.messageInput.removeAttribute('disabled');
            this.messageInput.value = '';
            this.messageInput.focus();
        }
        if (this.sendButton) this.sendButton.disabled = false;
        // Always return to Intelligence view
        if (typeof this.switchSectionTab === 'function') this.switchSectionTab('intelligence');
        this.ensureInputReady();
    }

    loadChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;

        this.currentChatId = chatId;

        // Clear current chat display
        this.chatContainer.innerHTML = '';

        // Load messages
        if (chat.messages.length > 0) {
            chat.messages.forEach(msg => {
                this.addMessage(msg.content, msg.sender, false); // false = don't save to history
            });
        }

        // Update active state in sidebar
        this.updateActiveChat();
    }

    clearCurrentChat() {
        if (!this.currentChatId) return;

        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (chat) {
            chat.messages = [];
            this.saveChats();
            this.chatContainer.innerHTML = '';
            this.addSystemMessage('**Chat cleared!** Start a new conversation.');
        }
    }

    deleteChat(chatId) {
        const index = this.chats.findIndex(c => c.id === chatId);
        if (index !== -1) {
            this.chats.splice(index, 1);
            this.saveChats();
            this.renderChatList();

            // If we deleted the current chat, create a new one
            if (chatId === this.currentChatId) {
                this.createNewChat();
            }
        }
    }

    renderChatList() {
        this.chatList.innerHTML = '';

        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            chatItem.dataset.chatId = chat.id;

            const title = chat.messages.length > 0 ?
                chat.messages[0].content.substring(0, 30) + (chat.messages[0].content.length > 30 ? '...' : '') :
                'New Chat';

            const preview = chat.messages.length > 1 ?
                chat.messages[1].content.substring(0, 50) + (chat.messages[1].content.length > 50 ? '...' : '') :
                'No messages yet';

            chatItem.innerHTML = `
                <div class="chat-item-title">${title}</div>
                <div class="chat-item-preview">${preview}</div>
                <div class="chat-item-actions">
                    <button onclick="chatInterface.deleteChat('${chat.id}')" title="Delete Chat">🗑️</button>
                </div>
            `;

            chatItem.addEventListener('click', () => this.loadChat(chat.id));
            this.chatList.appendChild(chatItem);
        });
    }

    updateActiveChat() {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chatId === this.currentChatId);
        });
    }

    saveChats() {
        // Clear existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Debounce localStorage saves to prevent excessive writes
        this.saveTimeout = setTimeout(() => {
            try {
                localStorage.setItem('aiSidebarChats', JSON.stringify(this.chats));
            } catch (error) {
                console.warn('Failed to save chats to localStorage:', error);
            }
        }, 100); // Wait 100ms before saving
    }

    loadChats() {
        try {
            const savedChats = localStorage.getItem('aiSidebarChats');
            if (savedChats) {
                this.chats = JSON.parse(savedChats);
            }
        } catch (error) {
            console.warn('Failed to load chats from localStorage:', error);
            this.chats = [];
        }
    }

    switchAIProvider(provider) {
        if (this.aiManager.setProvider(provider)) {
            this.updateProviderStatus();
            this.updateProviderIcon();

            // Check if provider has API key configured
            const currentProvider = this.aiManager.getCurrentProvider();
            if (!currentProvider.config.apiKey) {
                this.addSystemMessage(`⚠️ **No API key configured for ${provider}**\n\nPlease add your API key in \`config.js\``);
            }
        }
    }

    updateProviderIcon() {
        if (!this.providerIcon) return;
        const val = this.providerSelector?.value || 'openai';
        const map = {
            openai: './assets/gpt-icon.svg',
            mistral: './assets/mistral-icon.svg',
            gemini: './assets/gemini-icon.svg'
        };
        this.providerIcon.src = map[val] || map.openai;
        this.providerIcon.alt = val;
    }

    async testCurrentProvider() {
        const provider = this.providerSelector.value;

        // Indicate testing state without changing inner content
        this.sendButton.classList.add('loading');
        this.sendButton.disabled = true;
        this.updateProviderStatus();

        try {
            const result = await this.aiManager.testConnection(provider);

            if (result.success) {
                this.addSystemMessage(`✅ **${provider.charAt(0).toUpperCase() + provider.slice(1)} connection successful!**`);
                this.updateProviderStatus('connected');
            } else {
                this.addSystemMessage(`❌ **${provider.charAt(0).toUpperCase() + provider.slice(1)} connection failed:**\n\n\`${result.error}\``);
                this.updateProviderStatus('disconnected');
            }
        } catch (error) {
            this.addSystemMessage(`❌ **Test failed:**\n\n\`${error.message}\``);
            this.updateProviderStatus('disconnected');
        } finally {
            // Restore button state
            this.sendButton.classList.remove('loading');
            this.sendButton.disabled = false;
        }
    }

    updateProviderStatus() {
        const selectedProvider = this.providerSelector.value;
        // Keep icon-only button; do not change inner text to preserve SVG
        this.sendButton.setAttribute('aria-label', 'Send');
    }

    switchSection(clickedSection) {
        // Remove selected class from all sections
        document.querySelectorAll('.section').forEach(s => {
            s.classList.remove('selected');
            s.classList.add('unselected');
        });

        // Add selected class to clicked section
        clickedSection.classList.remove('unselected');
        clickedSection.classList.add('selected');

        // Show/hide content based on section
        const sectionText = clickedSection.querySelector('p').textContent;
        this.showSectionContent(sectionText);
    }

    showSectionContent(sectionName) {
        const chatSection = document.getElementById('chat');
        const translationSection = document.getElementById('translation');
        const inputSection = document.getElementById('input');

        if (sectionName === 'intelligence') {
            chatSection.style.display = 'flex';
            translationSection.style.display = 'none';
            inputSection.style.display = 'block';
        } else if (sectionName === 'translate') {
            chatSection.style.display = 'none';
            translationSection.style.display = 'block';
            inputSection.style.display = 'none';
        } else if (sectionName === 'settings') {
            chatSection.style.display = 'none';
            translationSection.style.display = 'none';
            inputSection.style.display = 'none';
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isProcessing) return;

        // Check if current provider has API key
        const currentProvider = this.aiManager.getCurrentProvider();
        if (!currentProvider.config.apiKey || currentProvider.config.apiKey.trim() === '') {
            this.addSystemMessage(`⚠️ **Please configure your ${currentProvider.name} API key**\n\nAdd your API key in \`config.js\``);
            return;
        }

        // Add user message to chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        // Disable input while processing
        this.setInputState(false);
        this.isProcessing = true;

        try {
            // Get AI response using the service manager
            const aiResponse = await this.aiManager.getAIResponse(message);

            // Remove typing indicator and add AI response
            this.hideTypingIndicator();
            this.addMessage(aiResponse, 'ai');

        } catch (error) {
            console.error('Error getting AI response:', error);
            this.hideTypingIndicator();
            this.addMessage(`Sorry, I encountered an error: ${error.message}`, 'ai');
        } finally {
            this.setInputState(true);
            this.isProcessing = false;
        }

        // Update chat title with first message
        this.updateChatTitle(message);
    }

    updateChatTitle(firstMessage) {
        if (!this.currentChatId) return;

        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (chat && chat.messages.length === 1) { // Only update title for first message
            chat.title = firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '');
            chat.lastUpdated = new Date().toISOString();
            this.saveChats();
            this.renderChatList();
        }
    }

    addMessage(content, sender, saveToHistory = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        // Parse markdown for AI messages, keep user messages as plain text
        if (sender === 'ai') {
            try {
                // Configure marked.js options for security and styling
                marked.setOptions({
                    breaks: true, // Allow line breaks
                    gfm: true,    // GitHub Flavored Markdown
                    sanitize: false, // We'll handle sanitization manually
                    highlight: function(code, lang) {
                        // Basic syntax highlighting for common languages
                        if (lang && hljs.getLanguage(lang)) {
                            try {
                                return hljs.highlight(code, { language: lang }).value;
                            } catch (err) {
                                console.warn('Highlight.js error:', err);
                            }
                        }
                        return code;
                    }
                });

                // Sanitize HTML to prevent XSS attacks
                const sanitizedContent = this.sanitizeHTML(marked.parse(content));
                messageContent.innerHTML = sanitizedContent;
            } catch (error) {
                console.warn('Markdown parsing error:', error);
                // Fallback to plain text if markdown parsing fails
                messageContent.textContent = content;
            }
        } else {
            // User messages remain as plain text for security
            messageContent.textContent = content;
        }

        messageDiv.appendChild(messageContent);
        this.chatContainer.appendChild(messageDiv);

        // Scroll to bottom
        this.scrollToBottom();

        // Save to current chat if requested
        if (saveToHistory && this.currentChatId) {
            this.saveMessageToChat(content, sender);
        }
    }

    saveMessageToChat(content, sender) {
        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (chat) {
            chat.messages.push({
                content,
                sender,
                timestamp: new Date().toISOString()
            });
            chat.lastUpdated = new Date().toISOString();
            this.saveChats();
        }
    }

    addSystemMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system-message';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        try {
            // Parse markdown for system messages too
            const sanitizedContent = this.sanitizeHTML(marked.parse(content));
            messageContent.innerHTML = sanitizedContent;
        } catch (error) {
            console.warn('System message markdown parsing error:', error);
            // Fallback to plain text if markdown parsing fails
            messageContent.textContent = content;
        }

        messageDiv.appendChild(messageContent);
        this.chatContainer.appendChild(messageDiv);

        // Scroll to bottom
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';

        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingDiv.appendChild(dot);
        }

        this.chatContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    setInputState(enabled) {
        this.messageInput.disabled = !enabled;
        if (enabled) {
            this.messageInput.removeAttribute('disabled');
        }
        this.sendButton.disabled = !enabled;

        if (enabled) {
            this.messageInput.focus();
        }
    }

    scrollToBottom() {
        const content = document.getElementById('content');
        content.scrollTop = content.scrollHeight;
    }

    // Sanitize HTML to prevent XSS attacks
    sanitizeHTML(html) {
        const allowedTags = {
            'p': [],
            'h1': [], 'h2': [], 'h3': [], 'h4': [], 'h5': [], 'h6': [],
            'ul': [], 'ol': [], 'li': [],
            'blockquote': [],
            'code': [],
            'pre': [],
            'strong': [], 'b': [],
            'em': [], 'i': [],
            'a': ['href'],
            'hr': [],
            'table': [], 'thead': [], 'tbody': [], 'tr': [], 'th': [], 'td': [],
            'img': ['src', 'alt'],
            'br': [],
            'span': ['class']
        };

        const allowedAttributes = {
            'href': (value) => value.startsWith('http://') || value.startsWith('https://') || value.startsWith('#'),
            'src': (value) => value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:'),
            'alt': () => true,
            'class': () => true
        };

        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Recursively sanitize nodes
        const sanitizeNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.cloneNode();
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();

                // Check if tag is allowed
                if (!allowedTags[tagName]) {
                    return document.createTextNode(node.textContent);
                }

                // Create new element
                const newElement = document.createElement(tagName);

                // Copy allowed attributes
                for (let attr of node.attributes) {
                    const attrName = attr.name.toLowerCase();
                    const attrValue = attr.value;

                    if (allowedTags[tagName].includes(attrName) &&
                        allowedAttributes[attrName] &&
                        allowedAttributes[attrName](attrValue)) {
                        newElement.setAttribute(attrName, attrValue);
                    }
                }

                // Recursively sanitize child nodes
                for (let child of node.childNodes) {
                    const sanitizedChild = sanitizeNode(child);
                    if (sanitizedChild) {
                        newElement.appendChild(sanitizedChild);
                    }
                }

                return newElement;
            }

            return null;
        };

        // Sanitize all nodes
        const sanitizedNodes = [];
        for (let child of tempDiv.childNodes) {
            const sanitized = sanitizeNode(child);
            if (sanitized) {
                sanitizedNodes.push(sanitized);
            }
        }

        // Convert back to HTML string
        tempDiv.innerHTML = '';
        sanitizedNodes.forEach(node => tempDiv.appendChild(node));
        return tempDiv.innerHTML;
    }

    clearAllChats() {
        if (!confirm('Clear all chats? This cannot be undone.')) return;
        this.chats = [];
        this.currentChatId = null;
        this.saveChats();
        this.renderChatList();
        this.createNewChat();

        // Ensure input is usable immediately after clearing
        this.isProcessing = false;
        this.hideTypingIndicator();
        this.setInputState(true);
        if (this.messageInput) {
            this.messageInput.value = '';
            this.messageInput.removeAttribute('disabled');
            this.messageInput.focus();
        }
        if (this.sendButton) this.sendButton.disabled = false;

        // Hide sidebar so it doesn't overlay the input
        if (this.chatSidebar && !this.chatSidebar.classList.contains('chat-sidebar-hidden')) {
            this.hideSidebar();
        }
        // Always return to Intelligence view
        if (typeof this.switchSectionTab === 'function') this.switchSectionTab('intelligence');
        this.ensureInputReady();
    }

    switchSectionTab(name) {
        const tabs = ['intelligence', 'translate', 'settings'];
        tabs.forEach(t => {
            const el = document.getElementById(`section-${t}`);
            if (el) {
                el.classList.toggle('selected', t === name);
                el.classList.toggle('unselected', t !== name);
            }
        });

        const chat = document.getElementById('chat');
        const translation = document.getElementById('translation');
        const settings = document.getElementById('settings');
        const input = document.getElementById('input');

        // Always show input section regardless of the active tab
        if (input) input.style.display = 'block';

        if (name === 'intelligence') {
            if (chat) chat.style.display = 'flex';
            if (translation) translation.style.display = 'none';
            if (settings) settings.style.display = 'none';
        } else if (name === 'translate') {
            if (chat) chat.style.display = 'none';
            if (translation) translation.style.display = 'block';
            if (settings) settings.style.display = 'none';
        } else if (name === 'settings') {
            if (chat) chat.style.display = 'none';
            if (translation) translation.style.display = 'none';
            if (settings) settings.style.display = 'block';
            this.loadAPIKeysIntoForm();
        }
    }

    loadAPIKeysIntoForm() {
        const openai = (localStorage.getItem('openaiKey') || AI_CONFIG?.openai?.apiKey || '').trim();
        const mistral = (localStorage.getItem('mistralKey') || AI_CONFIG?.mistral?.apiKey || '').trim();
        const gemini = (localStorage.getItem('geminiKey') || AI_CONFIG?.gemini?.apiKey || '').trim();
        const setIf = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setIf('openai-key', openai);
        setIf('mistral-key', mistral);
        setIf('gemini-key', gemini);
    }

    saveAPIKeys() {
        const openai = (document.getElementById('openai-key')?.value || '').trim();
        const mistral = (document.getElementById('mistral-key')?.value || '').trim();
        const gemini = (document.getElementById('gemini-key')?.value || '').trim();

        try {
            if (openai) localStorage.setItem('openaiKey', openai); else localStorage.removeItem('openaiKey');
            if (mistral) localStorage.setItem('mistralKey', mistral); else localStorage.removeItem('mistralKey');
            if (gemini) localStorage.setItem('geminiKey', gemini); else localStorage.removeItem('geminiKey');
        } catch (e) {
            console.warn('Failed saving keys to localStorage', e);
        }

        // Reflect into AI_CONFIG if present
        if (typeof AI_CONFIG !== 'undefined') {
            if (AI_CONFIG.openai) AI_CONFIG.openai.apiKey = openai;
            if (AI_CONFIG.mistral) AI_CONFIG.mistral.apiKey = mistral;
            if (AI_CONFIG.gemini) AI_CONFIG.gemini.apiKey = gemini;
        }

        this.addSystemMessage('✅ **API keys saved locally.**');
    }

    async handleTranslate() {
        const source = document.getElementById('translate-source')?.value || '';
        const from = document.getElementById('source-lang')?.value || 'auto';
        const to = document.getElementById('target-lang')?.value || 'English';
        const output = document.getElementById('translate-output');
        if (!source.trim()) return;

        // Basic guard for API key
        const currentProvider = this.aiManager.getCurrentProvider();
        if (!currentProvider.config.apiKey || currentProvider.config.apiKey.trim() === '') {
            if (output) output.textContent = `No API key configured for ${currentProvider.name}. Add one in Settings.`;
            return;
        }

        if (output) output.textContent = 'Translating...';
        try {
            const result = await this.aiManager.translateText(source, from, to);
            if (output) output.textContent = result;
        } catch (e) {
            if (output) output.textContent = `Translation failed: ${e.message}`;
        }
    }

    swapLanguages() {
        const src = document.getElementById('source-lang');
        const dst = document.getElementById('target-lang');
        if (!src || !dst) return;
        const srcVal = src.value;
        const dstVal = dst.value;
        if (srcVal !== 'auto') {
            src.value = dstVal;
            dst.value = srcVal;
        } else {
            // if auto-detect is selected, just move target to English
            dst.value = 'English';
        }
    }

    ensureInputReady() {
        try {
            if (!this.messageInput) this.messageInput = document.getElementById('message');
            if (!this.sendButton) this.sendButton = document.getElementById('send-button');
            const inputEl = this.messageInput;
            if (!inputEl) return;

            // Force-enable and make interactable
            this.isProcessing = false;
            inputEl.disabled = false;
            inputEl.readOnly = false;
            inputEl.style.pointerEvents = 'auto';
            inputEl.removeAttribute('disabled');
            inputEl.removeAttribute('readonly');

            if (this.sendButton) this.sendButton.disabled = false;

            // Focus now and again after a tick (handles reflow/frame issues)
            inputEl.focus();
            setTimeout(() => {
                inputEl.focus();
            }, 0);
        } catch (e) {
            console.warn('ensureInputReady failed', e);
        }
    }
}

// Initialize the chat interface when the page loads
let chatInterface;
chatInterface = new ChatInterface();
