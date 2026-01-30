document.addEventListener('DOMContentLoaded', () => {
    loadSharedComponents().then(() => {
        initializePage();
    }).catch(error => {
        console.error('Initialization error:', error);
    });
});

async function loadSharedComponents() {
    try {
        const headerPlaceholder = document.getElementById('header-placeholder');
        if (headerPlaceholder) {
            const headerResponse = await fetch('/header/header.html');
            if (!headerResponse.ok) throw new Error('Header load failed');
            headerPlaceholder.innerHTML = await headerResponse.text();
            
            const headerScript = document.createElement('script');
            headerScript.src = '/header/header.js';
            document.body.appendChild(headerScript);
        }

        const chatbotPlaceholder = document.getElementById('chatbot-placeholder');
        if (chatbotPlaceholder) {
            const chatbotResponse = await fetch('/chatbot/chatbot.html');
            if (!chatbotResponse.ok) throw new Error('Chatbot load failed');
            chatbotPlaceholder.innerHTML = await chatbotResponse.text();
            
            const chatbotScript = document.createElement('script');
            chatbotScript.src = '/chatbot/chatbot.js';
            document.body.appendChild(chatbotScript);
        }
    } catch (error) {
        console.error('Component loading error:', error);
        throw error;
    }
}

let monitoringInterval;
let isCameraOn = false;

// --- FIX: Corrected the typo in the IP address ---
const alarmSoundSrc = 'http://127.0.0.1:5000/sounds/alarm.mp3';
const silentSoundSrc = 'http://127.0.0.1:5000/sounds/silent.mp3';

let audioPlayer; 
let isAlarming = false; 

let isVideoFeedLoaded = false;

function initializePage() {
    setupCameraToggle();
    try {
        audioPlayer = new Audio(silentSoundSrc);
        audioPlayer.loop = true;
    } catch (e) {
        console.error("Could not create alarm sound object.", e);
    }
    document.addEventListener('themeChanged', (e) => {
        console.log('Theme changed to:', e.detail.theme);
    });
}

function setupCameraToggle() {
    const toggleBtn = document.getElementById('camera-toggle');
    const cameraPreview = document.querySelector('.camera-preview');
    const cameraStatus = document.querySelector('.camera-status');
    const videoFeed = document.getElementById('video-feed'); 
    
    if (!toggleBtn || !cameraPreview || !cameraStatus || !videoFeed) return;

    videoFeed.onload = () => {
        // Only consider the feed loaded if it's not the placeholder image
        if (videoFeed.src.includes('video_feed')) {
            isVideoFeedLoaded = true;
            console.log("Video feed is now live and visible. Alarms are enabled.");
        }
    };

    cameraStatus.textContent = 'OFF';
    cameraPreview.classList.add('off');
    toggleBtn.innerHTML = '<i class="fas fa-power-off"></i> Turn On';
    toggleBtn.style.backgroundColor = 'var(--accent-green)';
    
    toggleBtn.addEventListener('click', () => {
        isCameraOn = !isCameraOn;
        
        if (isCameraOn) {
            isVideoFeedLoaded = false;
            
            if (audioPlayer) {
                audioPlayer.play().catch(e => console.error("Audio could not be started:", e));
            }

            cameraPreview.classList.remove('off');
            cameraStatus.textContent = 'LIVE';
            cameraStatus.style.backgroundColor = 'var(--accent-red)';
            toggleBtn.innerHTML = '<i class="fas fa-power-off"></i> Turn Off';
            toggleBtn.style.backgroundColor = 'var(--accent-red)';
            videoFeed.src = 'http://127.0.0.1:5000/video_feed';
            startMonitoring();
            addAlert('good', 'Camera Activated', 'Camera is now active', 'Just now');
        } else {
            isVideoFeedLoaded = false;
            
            if (audioPlayer) {
                audioPlayer.pause();
                audioPlayer.src = silentSoundSrc;
            }
            isAlarming = false;
            
            cameraPreview.classList.add('off');
            cameraStatus.textContent = 'OFF';
            cameraStatus.style.backgroundColor = '#666';
            toggleBtn.innerHTML = '<i class="fas fa-power-off"></i> Turn On';
            toggleBtn.style.backgroundColor = 'var(--accent-green)';
            
            // ==============================================================================
            // FIX: Add a unique timestamp to the image src to force the browser to reload it
            // This prevents caching issues when switching from a video stream.
            // ==============================================================================
            videoFeed.src = '../monitor.png?t=' + new Date().getTime();

            stopMonitoring();
            
            document.querySelectorAll('.stat-value').forEach(el => {
                el.textContent = '-';
                el.className = 'stat-value status-off';
            });
            
            addAlert('warning', 'Camera Deactivated', 'Camera is turned off', 'Just now');
        }
    });
}

function startMonitoring() {
    addAlert('good', 'System Initialized', 'Driver monitoring is now active.', 'Just now');
    if (monitoringInterval) clearInterval(monitoringInterval);
    monitoringInterval = setInterval(fetchModelResults, 500);
}

function stopMonitoring() {
    if (monitoringInterval) clearInterval(monitoringInterval);
    handleAlarm('none');
}

async function fetchModelResults() {
    if (!isCameraOn) return;
    try {
        const response = await fetch('http://127.0.0.1:5000/results');
        if (!response.ok) throw new Error('Failed to fetch model results');
        const data = await response.json();
        updateUI(data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function handleAlarm(alarmState) {
    if (!isVideoFeedLoaded) {
        document.body.classList.remove('flashing-critical', 'flashing-warning');
        return;
    }

    if (!audioPlayer) return;

    document.body.classList.remove('flashing-critical', 'flashing-warning');

    const shouldBeAlarming = alarmState !== 'none';

    if (shouldBeAlarming !== isAlarming) {
        isAlarming = shouldBeAlarming;
        if (isAlarming) {
            audioPlayer.src = alarmSoundSrc;
            console.log("ALARM ON: Switched to alarm.mp3");
        } else {
            audioPlayer.src = silentSoundSrc;
            console.log("ALARM OFF: Switched to silent.mp3");
        }
        audioPlayer.play().catch(e => console.error("Error resuming playback:", e));
    }

    if (isAlarming) {
        if (alarmState === 'drowsy_alarm' || alarmState === 'emotion_alarm') {
            document.body.classList.add('flashing-critical');
        } else {
            document.body.classList.add('flashing-warning');
        }
    }
}

function updateUI(data) {
    // This function remains unchanged
    updateStat(
        document.getElementById('drowsiness-state-value'),
        data.drowsiness_state,
        data.drowsiness_state === 'Drowsy' ? 'critical' : 'good'
    );
    updateStat(
        document.getElementById('mood-value'),
        data.mood,
        data.mood === 'sad' || data.mood === 'angry' ? 'critical' : 'good'
    );
    updateStat(
        document.getElementById('head-position-value'),
        data.head_position,
        data.head_position !== 'Centered' ? 'warning' : 'good'
    );
    updateStat(
        document.getElementById('behavior-value'),
        data.behavior,
        data.behavior !== 'Normal' ? 'warning' : 'good'
    );

    handleAlarm(data.alarm_state);

    if (data.drowsiness_state === 'Drowsy') {
        addAlert('critical', 'Severe Drowsiness Detected!', 'Please take a break. Your drowsiness is at a critical level.', 'Just now');
    }
    if (data.behavior === 'Distracted') {
        addAlert('warning', 'Distracted Driving!', 'A cell phone has been detected.', 'Just now');
    }
}

function updateStat(element, text, status) {
    // This function remains unchanged
    if (!element) return;
    element.textContent = text;
    element.className = 'stat-value';
    if (status === 'good') element.classList.add('status-good');
    else if (status === 'warning') element.classList.add('status-warning');
    else if (status === 'critical') element.classList.add('status-critical');
    else if (status === true) element.classList.add('status-off');
}

function addAlert(type, strongText, pText, smallText) {
    // This function remains unchanged
    const alertList = document.getElementById('alert-list');
    if (!alertList) return;
    const alertItem = document.createElement('div');
    alertItem.className = `alert-item ${type}`;
    let iconClass = 'fas fa-check-circle';
    if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    if (type === 'critical') iconClass = 'fas fa-skull-crossbones';
    alertItem.innerHTML = `
        <i class="${iconClass}"></i>
        <div>
            <strong>${strongText}</strong>
            <p>${pText}</p>
            <small>${smallText}</small>
        </div>
    `;
    alertList.prepend(alertItem);
    if (alertList.children.length > 8) {
        alertList.removeChild(alertList.lastChild);
    }
}

window.addEventListener('beforeunload', () => {
    stopMonitoring();
});

function googleTranslateElementInit() {
    new google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
}