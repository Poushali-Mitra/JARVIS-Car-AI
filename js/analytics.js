/**
 * @file analytics.js
 * @description Main script for the Analytics page.
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadComponentsAndScripts();
        initializeAnalyticsFeatures();
    } catch (error) {
        console.error('Analytics page failed to initialize:', error);
    }
});

/**
 * Loads shared HTML components and their scripts.
 */
async function loadComponentsAndScripts() {
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

/**
 * Helper to dynamically load a script.
 * @param {string} src - The script source URL.
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) existingScript.remove();
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Script load error for ${src}`));
        document.body.appendChild(script);
    });
}

/**
 * Initializes all charts and other features on the analytics page.
 */
function initializeAnalyticsFeatures() {
    console.log('Initializing analytics charts...');
    createDrivingScoreChart();
    createFuelEfficiencyChart();
    createTripTypesChart();
}

/**
 * Creates the Driving Score line chart.
 */
function createDrivingScoreChart() {
    const ctx = document.getElementById('drivingScoreChart')?.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{
                label: 'Driving Score',
                data: [82, 85, 83, 88, 92, 90, 87],
                borderColor: 'rgba(0, 212, 255, 1)',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#fff',
                pointBorderColor: 'rgba(0, 212, 255, 1)',
                pointHoverRadius: 7,
            }]
        },
        options: getCommonChartOptions()
    });
}

/**
 * Creates the Fuel Efficiency bar chart.
 */
function createFuelEfficiencyChart() {
    const ctx = document.getElementById('fuelEfficiencyChart')?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'MPG',
                data: [27.5, 29.1, 28.4, 30.2, 28.8, 26.5, 29.5],
                backgroundColor: 'rgba(0, 255, 136, 0.6)',
                borderColor: 'rgba(0, 255, 136, 1)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: getCommonChartOptions(true)
    });
}

/**
 * Creates the Trip Types doughnut chart.
 */
function createTripTypesChart() {
    const ctx = document.getElementById('tripTypesChart')?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Commute', 'Highway', 'City', 'Errands'],
            datasets: [{
                label: 'Trip Types',
                data: [45, 25, 20, 10],
                backgroundColor: [
                    'rgba(0, 212, 255, 0.8)',
                    'rgba(0, 255, 136, 0.8)',
                    'rgba(255, 136, 0, 0.8)',
                    'rgba(139, 92, 246, 0.8)'
                ],
                borderColor: '#242938',
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#a0a8b8',
                        boxWidth: 12,
                        padding: 15
                    }
                }
            }
        }
    });
}

/**
 * Provides common configuration for charts to avoid repetition.
 * @param {boolean} hideYAxis - Whether to hide the Y-axis grid lines.
 * @returns {object} A Chart.js options object.
 */
function getCommonChartOptions(hideYAxis = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: {
                ticks: { color: '#a0a8b8' },
                grid: { color: 'rgba(160, 168, 184, 0.1)' }
            },
            y: {
                beginAtZero: true,
                ticks: { color: '#a0a8b8' },
                grid: { 
                    color: hideYAxis ? 'transparent' : 'rgba(160, 168, 184, 0.1)'
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };
}

function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: false
    }, 'google_translate_element');
}