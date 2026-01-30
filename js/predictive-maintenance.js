// predictive-maintenance.js

document.addEventListener('DOMContentLoaded', async () => {
    // Load shared components and wait for them to be ready
    await loadSharedComponents();

    // Initialize header functionality after it's loaded
    initializeThemeLogic();
    initializeActiveNav();
    initializeMobileMenu();

    // Initialize page-specific logic
    new PredictiveMaintenance();
});

/**
 * Loads shared HTML components like the header and chatbot.
 */
async function loadSharedComponents() {
    try {
        const headerPlaceholder = document.getElementById('header-placeholder');
        if (headerPlaceholder) {
            const response = await fetch('/header/header.html');
            headerPlaceholder.innerHTML = await response.text();
        }
        
        const chatbotPlaceholder = document.getElementById('chatbot-placeholder');
        if(chatbotPlaceholder){
            const response = await fetch('/chatbot/chatbot.html');
            chatbotPlaceholder.innerHTML = await response.text();
            // Load chatbot script after its HTML is in place
            const script = document.createElement('script');
            script.src = '/chatbot/chatbot.js';
            document.body.appendChild(script);
        }

    } catch (error) {
        console.error('Error loading shared components:', error);
    }
}

/**
 * Sets up the theme toggling functionality.
 */
function initializeThemeLogic() {
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    if (!themeToggleButton) return;

    const applyTheme = (theme) => {
        const icon = themeToggleButton.querySelector('i');
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            if (icon) icon.className = 'fas fa-sun';
        } else {
            document.body.classList.remove('light-theme');
            if (icon) icon.className = 'fas fa-moon';
        }
    };

    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    themeToggleButton.addEventListener('click', () => {
        const isLight = document.body.classList.contains('light-theme');
        const newTheme = isLight ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
}

/**
 * Sets the 'active' class on the correct navigation link.
 */
function initializeActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('href') === currentPage) {
            item.classList.add('active');
        }
    });
}

/**
 * Sets up the toggle functionality for the mobile navigation menu.
 */
function initializeMobileMenu() {
    const menuToggleBtn = document.querySelector('.menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const navbar = document.querySelector('.navbar');

    if (menuToggleBtn && mobileMenu && navbar) {
        menuToggleBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            mobileMenu.classList.toggle('open');
            const toggleIcon = menuToggleBtn.querySelector('i');
            toggleIcon.className = mobileMenu.classList.contains('open') ? 'fas fa-times' : 'fas fa-bars';
        });

        document.addEventListener('click', (event) => {
            if (!navbar.contains(event.target) && mobileMenu.classList.contains('open')) {
                mobileMenu.classList.remove('open');
                menuToggleBtn.querySelector('i').className = 'fas fa-bars';
            }
        });
    }
}

// Real-time Data Fetching and Chart Updates
class PredictiveMaintenance {
    constructor() {
        this.charts = {};
        this.currentData = null;
        this.retryCount = 0;
        this.maxRetries = 10; // Stop trying after 10 failed attempts
        this.initializeCharts();
        this.startRealTimeUpdates();
    }

    initializeCharts() {
        console.log("✅ Initializing charts...");

        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error("❌ Chart.js is not loaded");
            return;
        }

        // Initialize all charts with empty data
        this.initializeChart('engineTempChart', 'Engine Temperature (°C)', '#00d4ff');
        this.initializeChart('oilPressureChart', 'Oil Pressure (kPa)', '#00ff88');
        this.initializeChart('tirePressureChart', 'Tire Pressure (psi)', '#ff8800');
        this.initializeChart('batteryVoltageChart', 'Battery Voltage (V)', '#A020F0');

        // Set initial status messages
        this.updatePredictionText('Waiting for sensor data... Please ensure the Python backend is running.');
        this.setAllStatuses('WAITING');

        console.log("✅ Charts initialized successfully");
    }

    initializeChart(canvasId, label, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`❌ Canvas element not found: ${canvasId}`);
            return null;
        }

        const isLightTheme = document.body.classList.contains('light-theme');
        const textColor = isLightTheme ? '#212529' : '#FFFFFF';
        const gridColor = isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

        const chart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Waiting for data...'],
                datasets: [{
                    label: label,
                    data: [0],
                    borderColor: color + '80', // Semi-transparent
                    backgroundColor: `${color}20`,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: textColor,
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    x: {
                        ticks: {
                            color: textColor,
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: textColor,
                            font: {
                                size: 14
                            }
                        }
                    }
                }
            }
        });

        this.charts[canvasId] = chart;
        return chart;
    }

    async startRealTimeUpdates() {
        // Start trying to fetch data immediately
        await this.fetchData();
        
        // Set up periodic updates every 5 seconds
        setInterval(() => {
            this.fetchData();
        }, 5000);
    }

    async fetchData() {
        // Stop retrying if we've exceeded max retries
        if (this.retryCount >= this.maxRetries) {
            this.updatePredictionText('Backend connection failed. Please restart the Python scripts and refresh the page.');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Check if we have actual sensor data (not just an empty object)
            if (data && Object.keys(data).length > 0 && data.engine_temperature_C !== undefined) {
                this.currentData = data;
                this.retryCount = 0; // Reset retry count on successful connection
                
                // Update charts with real data
                this.updateCharts(data);
                
                // Update status badges
                this.updateStatusBadges(data);
                
                // Update prediction text
                this.updatePredictionText(data.prediction || 'Analysis in progress...');
                
                console.log("✅ Real sensor data received and updated", data);
            } else {
                // Data exists but doesn't contain sensor readings yet
                this.updatePredictionText('Backend connected. Waiting for sensor data from MQTT...');
            }
            
        } catch (error) {
            this.retryCount++;
            console.error(`❌ Error fetching data (attempt ${this.retryCount}/${this.maxRetries}):`, error);
            
            if (this.retryCount === 1) {
                this.updatePredictionText('Connecting to backend... Please ensure predictive_engine.py is running on port 5000.');
            } else if (this.retryCount < this.maxRetries) {
                this.updatePredictionText(`Attempting to connect... (${this.retryCount}/${this.maxRetries})`);
            }
            
            this.setAllStatuses('OFFLINE');
        }
    }

    updateCharts(data) {
        const now = new Date().toLocaleTimeString();
        
        // Only update charts if we have valid sensor data
        if (data.engine_temperature_C !== undefined) {
            this.updateChart('engineTempChart', now, data.engine_temperature_C);
        }
        if (data.oil_pressure_kPa !== undefined) {
            this.updateChart('oilPressureChart', now, data.oil_pressure_kPa);
        }
        if (data.tire_pressure_psi !== undefined) {
            this.updateChart('tirePressureChart', now, data.tire_pressure_psi);
        }
        if (data.battery_voltage_V !== undefined) {
            this.updateChart('batteryVoltageChart', now, data.battery_voltage_V);
        }
    }

    updateChart(chartId, label, value) {
        const chart = this.charts[chartId];
        if (!chart) return;

        // Clear waiting message if present
        if (chart.data.labels[0] === 'Waiting for data...') {
            chart.data.labels = [];
            chart.data.datasets[0].data = [];
            chart.data.datasets[0].borderColor = chart.data.datasets[0].borderColor.replace('80', ''); // Remove transparency
        }

        // Add new data point
        chart.data.labels.push(label);
        chart.data.datasets[0].data.push(value);

        // Keep only last 20 data points
        if (chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }

        chart.update('active');
    }

    updateStatusBadges(data) {
        this.updateStatus('engine-status', data.engine_temperature_C, 85, 110);
        this.updateStatus('oil-status', data.oil_pressure_kPa, 200, 450);
        this.updateStatus('tire-status', data.tire_pressure_psi, 30, 35);
        this.updateStatus('battery-status', data.battery_voltage_V, 12.0, 14.5);
    }

    updateStatus(badgeId, value, min, max) {
        const badge = document.getElementById(badgeId);
        if (!badge || value === undefined) return;

        const range = max - min;
        const normalizedValue = (value - min) / range;

        if (normalizedValue < 0.2 || normalizedValue > 0.8) {
            badge.className = 'status-badge status-critical';
            badge.textContent = 'CRITICAL';
        } else if (normalizedValue < 0.3 || normalizedValue > 0.7) {
            badge.className = 'status-badge status-warning';
            badge.textContent = 'WARNING';
        } else {
            badge.className = 'status-badge status-normal';
            badge.textContent = 'NORMAL';
        }
    }

    setAllStatuses(status) {
        const statuses = ['engine-status', 'oil-status', 'tire-status', 'battery-status'];
        statuses.forEach(statusId => {
            const badge = document.getElementById(statusId);
            if (badge) {
                if (status === 'WAITING') {
                    badge.className = 'status-badge status-warning';
                    badge.textContent = 'WAITING';
                } else if (status === 'OFFLINE') {
                    badge.className = 'status-badge status-critical';
                    badge.textContent = 'OFFLINE';
                }
            }
        });
    }

    updatePredictionText(message) {
        const predictionElement = document.getElementById('prediction-text');
        if (!predictionElement) return;

        predictionElement.textContent = message;
        
        // Color coding based on message content
        if (message.includes('Error') || message.includes('failed') || message.includes('OFFLINE')) {
            predictionElement.style.color = '#ff4444';
        } else if (message.includes('Waiting') || message.includes('connecting') || message.includes('Attempting')) {
            predictionElement.style.color = '#ff8800';
        } else if (message.includes('Optimal') || message.includes('Normal')) {
            predictionElement.style.color = '#00ff88';
        } else {
            predictionElement.style.color = '#a0a8b8';
        }
    }
}

// Theme-aware chart updates when theme changes
function observeThemeChanges() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                // Reinitialize charts with new theme colors if we have data
                const predictiveMaintenance = window.predictiveMaintenanceInstance;
                if (predictiveMaintenance && predictiveMaintenance.currentData) {
                    predictiveMaintenance.initializeCharts();
                    predictiveMaintenance.updateCharts(predictiveMaintenance.currentData);
                }
            }
        });
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.predictiveMaintenanceInstance = new PredictiveMaintenance();
    observeThemeChanges();
});

function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: false
    }, 'google_translate_element');
}