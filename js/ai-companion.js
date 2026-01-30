document.addEventListener('DOMContentLoaded', function() {
    loadHeaderAndScripts();
    initializeApp();
});

const API_ENDPOINT = 'http://localhost:3000/api/chat';

let conversationHistory = [];
let availableVoices = [];
let recognition;

let isListening = false;
let isAwake = false;
let isSpeaking = false; // FIX: Flag to check if speech synthesis is active
let recognitionStopFlag = false;
let silenceTimeout;

function loadHeaderAndScripts() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!headerPlaceholder) return;
    fetch('/header/header.html')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load header.html');
            return response.text();
        })
        .then(html => {
            headerPlaceholder.innerHTML = html;
            const headerScript = document.createElement('script');
            headerScript.src = '/header/header.js'; 
            document.body.appendChild(headerScript);
        })
        .catch(error => console.error('Error loading header:', error));
}

function initializeApp() {
    loadVoices();
    initializeVoiceInterface();
    initializeLanguageSelector();
    initializeChatInput();
    initializeClearChat();
    initializeSuggestedPrompts();
    initializeStopSpeechButton();
}

function loadVoices() {
    return new Promise((resolve) => {
        availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
            resolve(availableVoices);
            return;
        }
        window.speechSynthesis.onvoiceschanged = () => {
            availableVoices = window.speechSynthesis.getVoices();
            resolve(availableVoices);
        };
    });
}

function initializeLanguageSelector() {
    const languageSelect = document.getElementById('language-select');
    if (!languageSelect) return;

    languageSelect.addEventListener('change', () => {
        if (recognition) {
            console.log(`Language changed to: ${languageSelect.value}. Restarting recognition.`);
            recognition.lang = languageSelect.value;
            
            if (isListening) {
                recognition.stop();
                // onend will handle the automatic restart with the new language.
            }
        }
    });
}

function initializeStopSpeechButton() {
    const stopSpeechBtn = document.getElementById('stop-speech-btn');
    if (!stopSpeechBtn) return;
    stopSpeechBtn.addEventListener('click', () => {
        window.speechSynthesis.cancel(); 
        stopSpeechBtn.style.display = 'none';
        isSpeaking = false; // FIX: Reset speaking flag
        if (!recognitionStopFlag && recognition) {
            try {
                recognition.start();
            } catch(e) { console.error("Could not restart recognition after stopping speech:", e); }
        }
    });
}

function updateVoiceUI(isActive, statusText = 'Click to start listening') {
    const voiceButton = document.getElementById('voice-btn');
    const voiceWaves = document.querySelectorAll('.voice-wave');
    const voiceStatus = document.getElementById('voice-status');

    if (!voiceButton || !voiceWaves.length || !voiceStatus) return;

    voiceStatus.textContent = statusText;
    if (isActive) {
        voiceButton.classList.add('active');
        voiceWaves.forEach(wave => wave.style.animationPlayState = 'running');
    } else {
        voiceButton.classList.remove('active');
        voiceWaves.forEach(wave => wave.style.animationPlayState = 'paused');
        isAwake = false;
    }
}

function initializeVoiceInterface() {
    const voiceButton = document.getElementById('voice-btn');
    const languageSelect = document.getElementById('language-select');

    if (!voiceButton || !('webkitSpeechRecognition' in window)) {
        console.error("Voice interface or Speech Recognition API not supported.");
        updateVoiceUI(false, "Voice not supported");
        if (voiceButton) voiceButton.disabled = true;
        return;
    }
    
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = languageSelect.value;

    recognition.onstart = () => {
        isListening = true;
        recognitionStopFlag = false;
        const status = isAwake ? 'Listening...' : 'Dormant | Say "Jarvis" or "Javed"';
        updateVoiceUI(true, status);
    };

    recognition.onend = () => {
        isListening = false;
        if (!recognitionStopFlag) {
            recognition.start(); // Auto-restart unless manually stopped
        } else {
            updateVoiceUI(false, 'Click to start listening');
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        const status = event.error === 'not-allowed' ? 'Mic access blocked' : 'Error listening';
        updateVoiceUI(false, status);
    };

    recognition.onresult = (event) => {
        // FIX: Ignore recognition results while the AI is speaking
        if (isSpeaking) {
            return;
        }

        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }

        const transcript = finalTranscript.toLowerCase().trim();
        if (!transcript) return;

        if (!isAwake) {
            if (transcript.includes('jarvis') || transcript.includes('javed') || transcript.includes('जावेद')) {
                console.log("Wake word detected!");
                isAwake = true;
                speakText("Ready to go sir", 'en-US');
                updateVoiceUI(true, 'Listening...');
                clearTimeout(silenceTimeout);
                silenceTimeout = setTimeout(() => {
                    if (isAwake) {
                        isAwake = false;
                        updateVoiceUI(true, 'Dormant | Say "Jarvis" or "Javed"');
                    }
                }, 5000);
            }
        } else {
            clearTimeout(silenceTimeout);
            handleUserMessage(transcript);
            isAwake = false;
            updateVoiceUI(true, 'Dormant | Say "Jarvis" or "Javed"');
        }
    };

    voiceButton.addEventListener('click', () => {
        if (isListening) {
            recognitionStopFlag = true;
            recognition.stop();
        } else {
            try {
                window.speechSynthesis.cancel();
                recognition.start();
            } catch (e) {
                console.error("Could not start recognition:", e);
                updateVoiceUI(false, 'Recognition blocked');
            }
        }
    });
}

async function speakText(text, langCode = 'en-US') {
    if (!('speechSynthesis' in window)) return;
    
    // Stop listening while we prepare to speak
    if (isListening) {
        recognition.stop();
    }

    await loadVoices();
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    
    const utterance = new SpeechSynthesisUtterance(text);
    const stopSpeechBtn = document.getElementById('stop-speech-btn');
    
    const selectedVoice = availableVoices.find(voice => voice.lang === langCode) || availableVoices.find(voice => voice.lang.startsWith(langCode.split('-')[0]));
    utterance.voice = selectedVoice || null;
    utterance.lang = langCode;

    // FIX: Control the isSpeaking flag and recognition state
    utterance.onstart = () => {
        isSpeaking = true;
        if (stopSpeechBtn) stopSpeechBtn.style.display = 'block';
    };
    
    utterance.onend = () => {
        isSpeaking = false;
        if (stopSpeechBtn) stopSpeechBtn.style.display = 'none';
        if (!recognitionStopFlag && recognition) {
            try {
                recognition.start();
            } catch(e) { console.error("Could not restart recognition after speech:", e); }
        }
    };

    utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        isSpeaking = false;
        if (stopSpeechBtn) stopSpeechBtn.style.display = 'none';
        if (!recognitionStopFlag && recognition) {
            try {
                recognition.start();
            } catch(err) { console.error("Could not restart recognition after speech error:", err); }
        }
    };

    window.speechSynthesis.speak(utterance);
}


function initializeChatInput() {
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    chatForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const userText = messageInput.value.trim();
        if (userText) {
            handleUserMessage(userText);
            messageInput.value = '';
        }
    });
}

async function handleUserMessage(text) {
    const userText = text.trim();
    if (!userText) return;

    const languageSelect = document.getElementById('language-select');
    const currentLanguageCode = isListening ? recognition.lang : (languageSelect.value || 'en-US');
    
    addMessage(userText, 'user');
    conversationHistory.push({ role: 'user', parts: [{ text: userText }] });
    showTypingIndicator();

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversationHistory: conversationHistory,
                currentLanguage: currentLanguageCode,
            }),
        });

        if (!response.ok) throw new Error(`Network response error: ${response.status}`);
        
        const data = await response.json();
        addMessage(data.reply, 'ai', data.language, true);
        conversationHistory.push({ role: 'model', parts: [{ text: data.reply }] });

    } catch (error) {
        console.error("Error getting AI response:", error);
        addMessage("Sorry, I'm having trouble connecting.", 'ai', 'en-US', true);
    }
}

function addMessage(text, type, langCode = 'en-US', speak = false) {
    const chatMessagesContainer = document.getElementById('chat-messages');
    const typingIndicator = chatMessagesContainer.querySelector('.typing-indicator-message');
    if (typingIndicator) typingIndicator.remove();

    const messageWrapper = document.createElement('div');
    messageWrapper.className = `message ${type === 'user' ? 'user-message' : 'ai-message'}`;
    messageWrapper.innerHTML = `<i class="fas fa-${type === 'user' ? 'user' : 'robot'}"></i><div>${text}</div>`;
    
    chatMessagesContainer.appendChild(messageWrapper);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

    if (speak && type === 'ai') {
        speakText(text, langCode);
    }
}

function initializeClearChat() {
    const clearButton = document.getElementById('clear-chat-btn');
    const chatMessagesContainer = document.getElementById('chat-messages');
    clearButton.addEventListener('click', () => {
        chatMessagesContainer.innerHTML = '';
        conversationHistory = [];
        addMessage("Hello! I'm JARVIS. How can I assist you today?", 'ai', 'en-US', false);
    });
}

function initializeSuggestedPrompts() {
    const promptsContainer = document.getElementById('suggested-prompts');
    promptsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('prompt-btn')) {
            handleUserMessage(e.target.textContent);
        }
    });
}

function showTypingIndicator() {
    const chatMessagesContainer = document.getElementById('chat-messages');
    const existingIndicator = chatMessagesContainer.querySelector('.typing-indicator-message');
    if (existingIndicator) return;
    const indicatorWrapper = document.createElement('div');
    indicatorWrapper.className = 'message ai-message typing-indicator-message';
    indicatorWrapper.innerHTML = `<i class="fas fa-robot"></i><div><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    chatMessagesContainer.appendChild(indicatorWrapper);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}