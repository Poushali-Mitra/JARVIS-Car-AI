/**
 * @file service-reminder.js
 * @description Main script for the Service Reminder page.
 * Fetches and displays vehicle service status and history.
 * Implements smart, non-flickering UI updates.
 * Loads and initializes shared components like header and chatbot using jQuery.
 */

// Scope guard to prevent script from running multiple times
if (typeof window.ServiceReminderInitialized === 'undefined') {
    window.ServiceReminderInitialized = true;

    const API_BASE_URL = 'http://localhost:3001';
    const POLLING_INTERVAL = 5000; // 5 seconds

    // --- COMPONENT LOADING (jQuery Method) ---
    $(function(){
        // Load the header component and its script
        $("#header-placeholder").load("/header/header.html", function() {
            $.getScript("/header/header.js");
            console.log("Header loaded.");
        });

        // Load the chatbot component and its script
        $("#chatbot-placeholder").load("/chatbot/chatbot.html", function() {
            $.getScript("/chatbot/chatbot.js");
            console.log("Chatbot loaded.");
        });

        // Initialize the rest of the page once the document is ready
        initializePage();
    });

    // --- CORE LOGIC ---
    function initializePage() {
        initializePagination();
        setupEventListeners();

        fetchAndDisplayData();
        setInterval(fetchAndDisplayData, POLLING_INTERVAL);
        
        console.log("Service Reminder page initialized.");
    }
    
    async function fetchAndDisplayData() {
        try {
            const [statusData, historyData] = await Promise.all([
                fetch(`${API_BASE_URL}/api/get_status`).then(res => res.json()),
                fetch(`${API_BASE_URL}/api/get_history`).then(res => res.json())
            ]);
            updateServiceCards(statusData);
            updateTimeline(historyData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    }

    // --- PAGINATION ---
    function initializePagination() {
        const pageContainer = document.querySelector('.page-container');
        const pages = document.querySelectorAll('.page');
        const paginationContainer = document.querySelector('.pagination-dots');
        if (!pageContainer || pages.length === 0) return;

        paginationContainer.innerHTML = '';
        pages.forEach(page => {
            const dot = document.createElement('div');
            dot.className = 'pagination-dot';
            dot.dataset.sectionId = page.id;
            dot.title = page.id.charAt(0).toUpperCase() + page.id.slice(1);
            dot.innerHTML = `<i class="fas fa-${getPageIcon(page.id)}"></i>`;
            dot.addEventListener('click', () => page.scrollIntoView({ behavior: 'smooth' }));
            paginationContainer.appendChild(dot);
        });
        
        pageContainer.addEventListener('scroll', debounce(highlightActivePage, 100));
        highlightActivePage();
    }

    function getPageIcon(pageId) {
        const icons = { 'status': 'clipboard-check', 'history': 'history' };
        return icons[pageId] || 'circle';
    }

    function highlightActivePage() {
        const pageContainer = document.querySelector('.page-container');
        const dots = document.querySelectorAll('.pagination-dot');
        const scrollPosition = pageContainer.scrollTop;
        const containerHeight = pageContainer.clientHeight;

        let activeSectionId = null;
        document.querySelectorAll('.page').forEach(page => {
            if (scrollPosition >= page.offsetTop - containerHeight / 2) {
                activeSectionId = page.id;
            }
        });

        dots.forEach(dot => {
            dot.classList.toggle('active', dot.dataset.sectionId === activeSectionId);
        });
    }

    // --- SMART UI UPDATES ---
    function updateServiceCards(services) {
        const grid = document.querySelector('.service-cards-grid');
        if (!grid) return;

        services.forEach(service => {
            const serviceId = service.service_name.replace(/\s+/g, '-').toLowerCase();
            let card = grid.querySelector(`[data-service-id="${serviceId}"]`);

            if (!card) {
                card = createServiceCard(service);
                grid.appendChild(card);
            } else {
                // Only update if data has changed
                const valueEl = card.querySelector('.value');
                if(valueEl.textContent !== service.detail_value) valueEl.textContent = service.detail_value;
                
                const progressFill = card.querySelector('.progress-fill');
                if(progressFill.style.width !== `${service.progress_percent}%`) progressFill.style.width = `${service.progress_percent}%`;

                const progressLabel = card.querySelector('.progress-label');
                if(progressLabel.textContent !== service.progress_label) progressLabel.textContent = service.progress_label;
            }
        });
    }
    
    function createServiceCard(service) {
        const serviceId = service.service_name.replace(/\s+/g, '-').toLowerCase();
        const card = document.createElement('div');
        card.className = `service-card ${service.status.toLowerCase()}`;
        card.dataset.serviceId = serviceId;
        const iconMap = {'oil change required': 'oil-can', 'brake system': 'car-burst', 'coolant system': 'temperature-three-quarters', 'battery health': 'car-battery'};

        card.innerHTML = `
            <div class="card-header">
                <div class="service-icon ${service.status.toLowerCase()}-icon">
                    <i class="fas fa-${iconMap[service.service_name.toLowerCase()] || 'cog'}"></i>
                </div>
                <div class="urgency-badge ${service.status.toLowerCase()}">${service.status}</div>
            </div>
            <h3 class="card-title">${service.service_name}</h3>
            <div class="service-details">
                <div class="detail-item">
                    <span class="label">${service.detail_label || 'Status'}</span>
                    <span class="value ${service.status.toLowerCase()}">${service.detail_value}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Last Service:</span>
                    <span class="value">${formatDate(service.last_service_date)}</span>
                </div>
            </div>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill ${service.status.toLowerCase()}-progress" style="width: ${service.progress_percent}%"></div>
                </div>
                <div class="progress-label">${service.progress_label}</div>
            </div>
            <button class="schedule-btn ${service.status.toLowerCase()}-btn" data-service="${service.service_name}">
                <i class="fas fa-calendar-plus"></i> Schedule Service
            </button>
        `;
        return card;
    }
    
    function updateTimeline(history) {
        const timeline = document.querySelector('.timeline');
        if (!timeline) return;
        
        timeline.innerHTML = ''; 
        history.forEach((item, index) => {
            timeline.appendChild(createTimelineItem(item, index));
        });

        const lastItem = timeline.querySelector('.timeline-item:last-child');
        if (lastItem) {
            const timelineHeight = lastItem.offsetTop + lastItem.offsetHeight;
            timeline.style.setProperty('--timeline-height', `${timelineHeight}px`);
        } else {
             timeline.style.setProperty('--timeline-height', `0px`);
        }
    }
    
    function createTimelineItem(item) {
        const itemEl = document.createElement('div');
        itemEl.className = 'timeline-item';
        itemEl.innerHTML = `
            <div class="timeline-marker"><i class="fas fa-wrench"></i></div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <h4>${item.title}</h4>
                    <span class="timeline-date">${formatDate(item.service_date)}</span>
                </div>
                <p>${item.description}</p>
            </div>
        `;
        return itemEl;
    }

    function setupEventListeners() {
        document.body.addEventListener('click', function(e) {
            if (e.target.closest('.schedule-btn')) {
                const btn = e.target.closest('.schedule-btn');
                scheduleService(btn.dataset.service);
            }
        });
    }

    async function scheduleService(serviceName) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedule_service`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service_name: serviceName })
            });
            const data = await response.json();
            if (data.status === 'success') {
                showNotification('Service scheduled successfully!', 'success');
                fetchAndDisplayData();
            } else {
                throw new Error(data.message || 'Failed to schedule.');
            }
        } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
        }
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            notification.addEventListener('transitionend', () => notification.remove());
        }, 4000);
    }

    // --- UTILITY FUNCTIONS ---
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }
}

function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: false
    }, 'google_translate_element');
}