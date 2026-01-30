function initializeChatbot() {
    try {
        const chatbotFloat = document.querySelector('.chatbot-float');
        const chatbotToggle = document.getElementById('chatbot-toggle');
        const chatbotWidget = document.getElementById('chatbot-widget');
        const chatbotClose = document.getElementById('chatbot-close');
        const chatbotInput = document.getElementById('chatbot-input');
        const chatbotSend = document.getElementById('chatbot-send');
        const chatbotMessages = document.getElementById('chatbot-messages');
        const chatbotMic = document.getElementById('chatbot-mic');

        if (!chatbotToggle || !chatbotWidget) { return; }

        const API_ENDPOINT = 'http://localhost:3000/api/chat';
        const carState = { oilLife: { percentage: 12, status: "Degraded", urgent: true }, brakeSystem: { health: 75, padThickness: 8.2, status: "Normal" }, coolantSystem: { fluidLevel: 92, status: "Optimal" }, batteryHealth: { healthScore: 87, status: "Good" } };
        let availableVoices = [];
        let recognition;

        function loadVoices() {
            return new Promise((resolve) => {
                availableVoices = window.speechSynthesis.getVoices();
                if (availableVoices.length > 0) { resolve(availableVoices); return; }
                window.speechSynthesis.onvoiceschanged = () => {
                    availableVoices = window.speechSynthesis.getVoices();
                    resolve(availableVoices);
                };
            });
        }
        loadVoices();
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = true;
            recognition.onstart = () => chatbotMic.classList.add('active');
            recognition.onend = () => chatbotMic.classList.remove('active');
            recognition.onerror = (event) => { console.error("Speech recognition error:", event.error); chatbotMic.classList.remove('active'); };
            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                }
                chatbotInput.value = finalTranscript;
                if (finalTranscript) sendMessage(true);
            };
            chatbotMic.addEventListener('click', () => {
                try {
                    window.speechSynthesis.cancel();
                    recognition.start();
                } catch (e) { console.error("Could not start recognition:", e); }
            });
        } else {
            if(chatbotMic) chatbotMic.style.display = 'none';
        }

        async function speakText(text) {
            console.log(`CHATBOT: speakText called.`);
            if (!('speechSynthesis' in window)) { console.error("SPEAKTEXT: Speech Synthesis not supported."); return; }
            if (availableVoices.length === 0) {
                console.log("CHATBOT: Voice list empty, awaiting load...");
                await loadVoices();
                console.log("CHATBOT: Voices loaded.", availableVoices.length);
            }

            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const savedVoiceName = localStorage.getItem('ai-voice-select');
            console.log(`CHATBOT: Retrieved voice name from localStorage: "${savedVoiceName}"`);

            if (savedVoiceName && savedVoiceName !== 'default') {
                const selectedVoice = availableVoices.find(voice => voice.name === savedVoiceName);
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                    console.log(`CHATBOT: SUCCESS! Assigning voice: "${selectedVoice.name}"`);
                } else {
                    console.warn(`CHATBOT: WARNING! Could not find voice "${savedVoiceName}" in the list. Using default.`);
                }
            } else {
                console.log("CHATBOT: No specific voice set. Using browser default.");
            }

            utterance.onstart = () => { if (recognition) recognition.stop(); };
            window.speechSynthesis.speak(utterance);
        }

        async function sendMessage(isVoiceInput = false) {
            const message = chatbotInput.value.trim();
            if (message) {
                addMessage(message, true);
                chatbotInput.value = '';
                showTypingIndicator();
                try {
                    const response = await fetch(API_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: message, carState: carState }),
                    });
                    removeTypingIndicator();
                    if (!response.ok) throw new Error('Network response was not ok.');
                    const data = await response.json();
                    addMessage(data.reply);
                    if (isVoiceInput) speakText(data.reply);
                } catch (error) {
                    console.error('Error fetching AI response:', error);
                    removeTypingIndicator();
                    addMessage('Sorry, I seem to be having trouble connecting to my core systems right now.');
                }
            }
        }

        function addMessage(message, isUser = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chatbot-message ${isUser ? 'user' : 'bot'}`;
            messageDiv.innerHTML = `<i class="fas fa-${isUser ? 'user' : 'robot'}"></i><div>${message}</div>`;
            chatbotMessages.appendChild(messageDiv);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }

        function showTypingIndicator() {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'chatbot-message bot typing-indicator';
            typingDiv.innerHTML = `<i class="fas fa-robot"></i><div><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
            chatbotMessages.appendChild(typingDiv);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }

        function removeTypingIndicator() {
            const indicator = chatbotMessages.querySelector('.typing-indicator');
            if (indicator) {
                indicator.remove();
            }
        }
        
        let isDragging = false;
        let startX, startY, initialX, initialY;

        function updateWidgetPosition() {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const iconRect = chatbotFloat.getBoundingClientRect();
            const iconCenterX = iconRect.left + iconRect.width / 2;
            const iconCenterY = iconRect.top + iconRect.height / 2;
            const isTopHalf = iconCenterY < viewportHeight / 2;
            const isLeftHalf = iconCenterX < viewportWidth / 2;
            chatbotWidget.classList.remove('top-right', 'top-left', 'bottom-right', 'bottom-left');
            if (isTopHalf && !isLeftHalf) {
                chatbotWidget.classList.add('top-right');
            } else if (isTopHalf && isLeftHalf) {
                chatbotWidget.classList.add('top-left');
            } else if (!isTopHalf && isLeftHalf) {
                chatbotWidget.classList.add('bottom-left');
            } else if (!isTopHalf && !isLeftHalf) {
                chatbotWidget.classList.add('bottom-right');
            }
        }

        function toggleChatbot() {
            chatbotWidget.classList.toggle('active');
            updateWidgetPosition();
        }

        function dragStart(e) {
            if (e.target.closest('.chatbot-widget')) return;
            isDragging = true;
            chatbotToggle.style.cursor = 'grabbing';
            chatbotToggle.style.transition = 'none';
            const rect = chatbotFloat.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            startX = e.clientX || e.touches[0].clientX;
            startY = e.clientY || e.touches[0].clientY;
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            const currentX = e.clientX || e.touches[0].clientX;
            const currentY = e.clientY || e.touches[0].clientY;
            const dx = currentX - startX;
            const dy = currentY - startY;
            let newX = initialX + dx;
            let newY = initialY + dy;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const navBarHeight = document.querySelector('.navbar') ? document.querySelector('.navbar').offsetHeight : 0;
            const iconWidth = chatbotFloat.offsetWidth;
            const iconHeight = chatbotFloat.offsetHeight;
            newX = Math.max(0, Math.min(newX, viewportWidth - iconWidth));
            newY = Math.max(navBarHeight, Math.min(newY, viewportHeight - iconHeight));
            chatbotFloat.style.left = `${newX}px`;
            chatbotFloat.style.top = `${newY}px`;
            chatbotFloat.style.right = 'auto';
            chatbotFloat.style.bottom = 'auto';
            updateWidgetPosition();
        }

        function dragEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            chatbotToggle.style.cursor = 'grab';
            chatbotToggle.style.transition = 'all 0.3s ease';
            const iconRect = chatbotFloat.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            if (iconRect.left < viewportWidth / 2) {
                chatbotFloat.style.left = '30px';
                chatbotFloat.style.right = 'auto';
            } else {
                chatbotFloat.style.right = '30px';
                chatbotFloat.style.left = 'auto';
            }
            const navBarHeight = document.querySelector('.navbar') ? document.querySelector('.navbar').offsetHeight : 0;
            const topBoundary = Math.max(navBarHeight, 70);
            if (iconRect.top < viewportHeight / 2) {
                chatbotFloat.style.top = `${topBoundary}px`;
                chatbotFloat.style.bottom = 'auto';
            } else {
                chatbotFloat.style.bottom = '30px';
                chatbotFloat.style.top = 'auto';
            }
            updateWidgetPosition();
        }

        if (chatbotToggle) chatbotToggle.addEventListener('click', toggleChatbot);
        if (chatbotClose) chatbotClose.addEventListener('click', toggleChatbot);
        if (chatbotSend) chatbotSend.addEventListener('click', () => sendMessage(false));
        if (chatbotInput) chatbotInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(false); });
        if (chatbotToggle) { chatbotToggle.addEventListener('mousedown', dragStart); chatbotToggle.addEventListener('touchstart', dragStart); }
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);

        chatbotFloat.style.bottom = '30px';
        chatbotFloat.style.right = '30px';
        updateWidgetPosition();
    } catch (error) {
        console.error('JARVIS: Chatbot initialization failed.', error);
    }
}
initializeChatbot();