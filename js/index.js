// index.js
$(function(){
  // Load the header component
  $("#header-placeholder").load("/header/header.html", function() {
    // This ensures that the script can find the elements it needs to work with.
    $.getScript("/header/header.js");
  });

  // Load the chatbot component
  $("#chatbot-placeholder").load("/chatbot/chatbot.html", function() {
    // Similarly, after the chatbot's HTML is loaded, we load its script.
    $.getScript("/chatbot/chatbot.js");
  });
});

// AI Car Animation Controls
function initializeCarAnimations() {
    const cars = document.querySelectorAll('.ai-car');
    const dataStreams = document.querySelectorAll('.car-data-stream');
    const hudElements = document.querySelectorAll('.car-hud-element');

    // Add hover effects to cars for interactivity
    cars.forEach((car, index) => {
        car.addEventListener('mouseenter', () => {
            car.style.transform += ' scale(1.1)';
            car.style.opacity = '1';
            car.style.zIndex = '10';
        });

        car.addEventListener('mouseleave', () => {
            car.style.transform = car.style.transform.replace(' scale(1.1)', '');
            car.style.opacity = '0.7';
            car.style.zIndex = '0';
        });
    });

    // Randomize data stream animation intervals for a more dynamic look
    dataStreams.forEach((stream, index) => {
        const randomDelay = Math.random() * 2000;
        setTimeout(() => {
            stream.style.animationDelay = `${randomDelay}ms`;
        }, index * 200);
    });

    // Simulate live data updates for the HUD elements
    const hudData = [
        () => `SPD: ${Math.floor(Math.random() * 40 + 45)} mph`,
        () => `TEMP: ${Math.floor(Math.random() * 20 + 85)}°C`,
        () => `BAT: ${Math.floor(Math.random() * 20 + 80)}%`,
        () => `GPS: ${Math.random() > 0.8 ? 'SYNC' : 'ACTIVE'}`
    ];

    setInterval(() => {
        hudElements.forEach((hud, index) => {
            if (hudData[index]) {
                hud.textContent = hudData[index]();
            }
        });
    }, 3000);
}

// Initialize all functionality when DOM is loaded - Only once
let initialized = false;

function initializeApp() {
    if (initialized) return;
    initialized = true;

    // Only initialize functions if their required elements exist
    setTimeout(() => {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        // Only initialize car animations on the home page
        if (currentPage === 'index.html') {
            try {
                initializeCarAnimations();
            } catch (error) {
                console.warn('JARVIS: Car animations handled gracefully');
            }
        }
    }, 300);

    // Add smooth transitions only once to the body
    if (!document.body.style.transition) {
        document.body.style.transition = 'all 0.3s ease';
    }
}

// Ensure the app is initialized after the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Generic error handling for the page
window.addEventListener('error', (e) => {
    console.warn('JARVIS Car AI: Minor rendering issue detected and handled gracefully.');
});

function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: false
    }, 'google_translate_element');
}