(function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
})();

function googleTranslateElementInit() {
    new google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
}

function setGoogleTranslateCookie(lang) {
    if (lang && lang !== 'en') {
        document.cookie = `googtrans=/en/${lang}; path=/;`;
    } else {
        document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadSharedComponents();
        initializeSettingsPage();
    } catch (error) {
        console.error("An error occurred during settings page initialization:", error);
    }
});

async function loadSharedComponents() {
    const components = {
        'header-placeholder': { html: '../header/header.html', script: '../header/header.js' },
        'chatbot-placeholder': { html: '../chatbot/chatbot.html', script: '../chatbot/chatbot.js' }
    };
    for (const id in components) {
        const placeholder = document.getElementById(id);
        if (!placeholder) continue;
        const { html, script } = components[id];
        try {
            const response = await fetch(html);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            placeholder.innerHTML = await response.text();
            if (script) await loadScript(script);
        } catch (error) {
            console.error(`Failed to load component '${id}':`, error);
        }
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { return resolve(); }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Script load error for ${src}`));
        document.body.appendChild(script);
    });
}

function initializeSettingsPage() {
    const themeSelect = document.getElementById('theme-select');
    const languageSelect = document.getElementById('language-select');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    const voiceSelect = document.getElementById('ai-voice-select');

    function populateVoiceList() {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = populateVoiceList;
            return;
        }
        
        const savedVoiceName = localStorage.getItem('ai-voice-select');
        voiceSelect.innerHTML = '<option value="default">Default</option>';

        voices.filter(voice => voice.lang.startsWith('en-'))
              .forEach(voice => {
                  const option = document.createElement('option');
                  let displayName = voice.name.replace('Microsoft ', '').replace('Google ', '').replace(/ - English \(.*\)/, '').replace(' US English', ' US').replace(' UK English', ' UK');
                  option.textContent = `${displayName} (${voice.lang})`;
                  option.value = voice.name;
                  voiceSelect.appendChild(option);
              });

        if (savedVoiceName) {
            voiceSelect.value = savedVoiceName;
        }
    }

    populateVoiceList();

    function loadControlStates() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (themeSelect) themeSelect.value = savedTheme;
        const savedLang = localStorage.getItem('selectedLanguage') || 'en';
        if (languageSelect) languageSelect.value = savedLang;
        document.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach(checkbox => {
            const savedState = localStorage.getItem(checkbox.id);
            if (savedState !== null) checkbox.checked = (savedState === 'true');
        });
        document.querySelectorAll('.setting-select:not(#theme-select):not(#language-select):not(#ai-voice-select)').forEach(select => {
            const savedValue = localStorage.getItem(select.id);
            if (savedValue !== null) select.value = savedValue;
        });
    }

    loadControlStates();

    if (voiceSelect) {
        voiceSelect.addEventListener('change', (event) => {
            const selectedVoiceName = event.target.value;
            localStorage.setItem('ai-voice-select', selectedVoiceName);
            console.log(`SETTINGS.JS: Voice changed and saved to localStorage: "${selectedVoiceName}"`);
            showNotification('AI voice changed in real-time.');
        });
    }

    if (themeSelect) {
        themeSelect.addEventListener('change', (event) => {
            const newTheme = event.target.value;
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
    
    if (languageSelect) {
        languageSelect.addEventListener('change', (event) => {
            const selectedLang = event.target.value;
            localStorage.setItem('selectedLanguage', selectedLang);
            setGoogleTranslateCookie(selectedLang);
            showNotification(`Applying language...`);
            setTimeout(() => window.location.reload(), 500);
        });
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const selectedVoiceName = voiceSelect.value;
            localStorage.setItem('ai-voice-select', selectedVoiceName);
            console.log(`SETTINGS.JS: Voice saved via button click: "${selectedVoiceName}"`);
            document.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach(checkbox => {
                localStorage.setItem(checkbox.id, checkbox.checked);
            });
            document.querySelectorAll('.setting-select:not(#theme-select):not(#language-select)').forEach(select => {
                localStorage.setItem(select.id, select.value);
            });
            showNotification('Settings saved successfully!');
        });
    }

    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
            const settingKeys = ['theme', 'selectedLanguage', 'maintenance-alerts', 'safety-warnings', 'performance-updates', 'voice-commands', 'auto-response', 'data-collection', 'location-services', 'ai-voice-select'];
            settingKeys.forEach(key => localStorage.removeItem(key));
            setGoogleTranslateCookie('en');
            showNotification('Settings reset to defaults. Reloading...');
            setTimeout(() => window.location.reload(), 500);
        });
    }
}

function showNotification(message) {
    document.querySelector('.notification')?.remove();
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
    Object.assign(notification.style, { position: 'fixed', top: '90px', right: '20px', backgroundColor: 'var(--accent-blue)', color: 'white', padding: '15px 25px', borderRadius: '8px', zIndex: '10001', opacity: '0', transform: 'translateX(100%)', transition: 'transform 0.5s ease, opacity 0.5s ease' });
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.opacity = '1'; notification.style.transform = 'translateX(0)'; }, 50);
    setTimeout(() => { notification.style.opacity = '0'; notification.style.transform = 'translateX(100%)'; setTimeout(() => notification.remove(), 500); }, 3000);
}