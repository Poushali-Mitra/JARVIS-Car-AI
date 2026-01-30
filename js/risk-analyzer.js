// Global variable to store user coordinates
let userCoords = null;
// Global variable for personal contacts
let contacts = [];

// Theme Management
async function initializeIncludes() {
    // Load header.html
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        try {
            const response = await fetch('/header/header.html');
            if (response.ok) {
                headerPlaceholder.innerHTML = await response.text();
                // Dynamically load header.js after header.html is loaded
                const headerScript = document.createElement('script');
                headerScript.src = '/header/header.js';
                headerScript.type = 'text/javascript';
                document.body.appendChild(headerScript);
            } else {
                console.error('Failed to load header.html:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching header.html:', error);
        }
    }

    // Load chatbot.html
    const chatbotPlaceholder = document.getElementById('chatbot-placeholder');
    if (chatbotPlaceholder) {
        try {
            const response = await fetch('/chatbot/chatbot.html');
            if (response.ok) {
                chatbotPlaceholder.innerHTML = await response.text();
                // Dynamically load chatbot.js after chatbot.html is loaded
                const chatbotScript = document.createElement('script');
                chatbotScript.src = '/chatbot/chatbot.js';
                chatbotScript.type = 'text/javascript';
                document.body.appendChild(chatbotScript);
            } else {
                console.error('Failed to load chatbot.html:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching chatbot.html:', error);
        }
    }

    // After all includes are loaded, fetch real-time data
    fetchWeatherData();
}

// Sets up event listeners for new interactive elements
function setupInteractiveElements() {
    // Map Elements
    const googleMapsBtn = document.getElementById('google-maps-btn');
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    const mainContent = document.querySelector('.main-content');
    const mapContainer = document.getElementById('map-container');
    const mapIframe = document.getElementById('map-iframe');

    // Header Emergency Dropdown Elements
    const headerEmergencyBtn = document.getElementById('header-emergency-btn');
    const headerEmergencyDropdown = document.getElementById('header-emergency-dropdown');

    // Contact Management Modal Elements
    const manageContactsBtn = document.getElementById('manage-contacts-btn');
    const contactModalOverlay = document.getElementById('contact-modal-overlay');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const contactForm = document.getElementById('contact-form');
    const contactIdInput = document.getElementById('contact-id');
    const contactNameInput = document.getElementById('contact-name');
    const contactNumberInput = document.getElementById('contact-number');
    const saveContactBtn = document.getElementById('save-contact-btn');

    // Google Maps toggle logic
    if (googleMapsBtn && mainContent && mapContainer && mapIframe) {
        googleMapsBtn.addEventListener('click', () => {
            mainContent.style.display = 'none';
            mapContainer.style.display = 'flex';
            if (userCoords) {
                mapIframe.src = `https://maps.google.com/maps?q=${userCoords.lat},${userCoords.lon}&hl=en&z=14&output=embed`;
            } else {
                mapIframe.src = `https://maps.google.com/maps?q=20.2961,85.8245&hl=en&z=14&output=embed`; // Default to a location
                console.warn("User location not available. Showing default map.");
            }
        });
    }

    if (backToDashboardBtn && mainContent && mapContainer && mapIframe) {
        backToDashboardBtn.addEventListener('click', () => {
            mainContent.style.display = 'block';
            mapContainer.style.display = 'none';
            mapIframe.src = ''; // Clear src to stop the map
        });
    }
    
    // Header emergency dropdown toggle
    if (headerEmergencyBtn && headerEmergencyDropdown) {
        headerEmergencyBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            headerEmergencyDropdown.classList.toggle('show');
        });
    }

    // Contact Modal Management
    if (manageContactsBtn) {
        manageContactsBtn.addEventListener('click', () => {
            contactModalOverlay.classList.add('show');
            resetContactForm();
            renderModalContacts();
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            contactModalOverlay.classList.remove('show');
        });
    }
    
    if (contactModalOverlay) {
        contactModalOverlay.addEventListener('click', (event) => {
            if (event.target === contactModalOverlay) {
                contactModalOverlay.classList.remove('show');
            }
        });
    }

    // Contact form submission logic
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = contactIdInput.value;
            const name = contactNameInput.value.trim();
            const number = contactNumberInput.value.trim();

            if (name && number) {
                if (id) { // Editing existing contact
                    const contactIndex = contacts.findIndex(c => c.id === id);
                    if (contactIndex > -1) {
                        contacts[contactIndex] = { id, name, number };
                    }
                } else { // Adding new contact
                    contacts.push({ id: Date.now().toString(), name, number });
                }
                saveContactsToStorage();
                renderModalContacts();
                renderPersonalContactsList();
                resetContactForm();
            }
        });
    }
    
    // --- START: New Emergency Card Accordion Logic ---
    const accordionToggles = document.querySelectorAll('.emergency-category-toggle');
    if (accordionToggles) {
        accordionToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                // This makes it a true accordion - only one item open at a time.
                // Remove this loop if you want to allow multiple items to be open.
                accordionToggles.forEach(otherToggle => {
                    if (otherToggle !== toggle) {
                        otherToggle.classList.remove('active');
                        const otherContent = otherToggle.nextElementSibling;
                        if (otherContent) otherContent.classList.remove('show');
                    }
                });

                // Toggle the clicked accordion item
                toggle.classList.toggle('active');
                const content = toggle.nextElementSibling;
                if (content) {
                    content.classList.toggle('show');
                }
            });
        });
    }
    // --- END: New Emergency Card Accordion Logic ---


    // Close the dropdown if the user clicks anywhere outside of it
    window.onclick = function(event) {
        if (headerEmergencyDropdown && !event.target.closest('.emergency-dropdown')) {
            if (headerEmergencyDropdown.classList.contains('show')) {
                headerEmergencyDropdown.classList.remove('show');
            }
        }
    }
}

// Function to get user's location and fetch weather data
function fetchWeatherData() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            userCoords = { lat: position.coords.latitude, lon: position.coords.longitude };

            try {
                const response = await fetch(`/api/weather?lat=${userCoords.lat}&lon=${userCoords.lon}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                
                const temperatureElement = document.querySelector('.env-item .env-value');
                if (temperatureElement) {
                    temperatureElement.textContent = `${Math.round(data.main.temp)}°F`; 
                }

                const skyElement = document.querySelector('.env-item:last-child .env-value');
                if (skyElement) {
                    skyElement.textContent = data.weather[0].main;
                }
            } catch (error) {
                console.error("Could not fetch weather data:", error);
            }
        }, (error) => {
            console.error("Error getting user location:", error);
        });
    } else {
        console.error("Geolocation is not supported by this browser.");
    }
}

// --- Contact Management Functions ---

function saveContactsToStorage() {
    localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
}

function loadContactsFromStorage() {
    const storedContacts = localStorage.getItem('emergencyContacts');
    contacts = storedContacts ? JSON.parse(storedContacts) : [];
    renderPersonalContactsList();
}

function renderPersonalContactsList() {
    const ul = document.getElementById('personal-contacts-ul'); // Target the UL directly
    if (!ul) return;
    ul.innerHTML = ''; // Clear previous content

    if (contacts.length === 0) {
        ul.innerHTML = '<li><span>No contacts added yet.</span></li>';
        return;
    }

    contacts.forEach(contact => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="tel:${contact.number}"><strong>${contact.name}:</strong> ${contact.number}</a>`;
        ul.appendChild(li);
    });
}

function renderModalContacts() {
    const modalList = document.getElementById('modal-contact-list');
    if (!modalList) return;
    modalList.innerHTML = '';

    if (contacts.length === 0) {
        modalList.innerHTML = '<li>No contacts to display.</li>';
        return;
    }

    contacts.forEach(contact => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="contact-info">
                <span class="name">${contact.name}</span>
                <span class="number">${contact.number}</span>
            </div>
            <div class="contact-actions">
                <button class="edit-btn" data-id="${contact.id}"><i class="fas fa-pen"></i></button>
                <button class="delete-btn" data-id="${contact.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        modalList.appendChild(li);
    });
    
    modalList.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditContact));
    modalList.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteContact));
}

function handleEditContact(e) {
    const id = e.currentTarget.dataset.id;
    const contact = contacts.find(c => c.id === id);
    if (contact) {
        document.getElementById('contact-id').value = contact.id;
        document.getElementById('contact-name').value = contact.name;
        document.getElementById('contact-number').value = contact.number;
        document.getElementById('save-contact-btn').textContent = 'Update Contact';
        document.getElementById('contact-name').focus();
    }
}

function handleDeleteContact(e) {
    const id = e.currentTarget.dataset.id;
    contacts = contacts.filter(c => c.id !== id);
    saveContactsToStorage();
    renderModalContacts();
    renderPersonalContactsList();
}

function resetContactForm() {
    const contactForm = document.getElementById('contact-form');
    if(contactForm) contactForm.reset();
    document.getElementById('contact-id').value = '';
    document.getElementById('save-contact-btn').textContent = 'Add Contact';
}

// --- Initialization ---

// Fetch data every 5 minutes
setInterval(fetchWeatherData, 300000);

// Ensure includes and event listeners are loaded when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeIncludes();
    setupInteractiveElements();
    loadContactsFromStorage();
});

// Error handling for missing elements
window.addEventListener('error', (e) => {
    console.warn('JARVIS Car AI: Minor rendering issue detected and handled gracefully.');
});

function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: false
    }, 'google_translate_element');
}