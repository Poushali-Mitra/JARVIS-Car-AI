/**
 * @file behavior-monitor.js
 * @description Main script for the Behavior Monitor page.
 * Connects to the backend to fetch and display driving data.
 * UPDATED: Uses frontend polling instead of WebSockets for real-time updates.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Page loaded. Initializing components...");
    
    const API_URL = 'http://localhost:3001/api/drivingdatas';
    const POLLING_INTERVAL = 3000; 

    // NEW: Variable to store the latest data for PDF generation
    let latestData = null;

    /**
     * Updates a single score card on the UI.
     * @param {string} name - The base name for the element IDs (e.g., 'overall-score').
     * @param {number} value - The score value.
     */
    const updateScoreCard = (name, value) => {
        const valueEl = document.getElementById(`${name}-value`);
        const progressEl = document.getElementById(`${name}-progress`);
        const statusEl = document.getElementById(`${name}-status`);

        if (valueEl) valueEl.textContent = value;
        if (progressEl) progressEl.style.width = `${value}%`;

        if (statusEl) {
            let statusText = 'Good';
            let statusClass = 'good';
            if (value > 90) {
                statusText = 'Excellent';
                statusClass = 'excellent';
            } else if (value <= 80) {
                statusText = 'Needs Improvement';
                statusClass = 'warning';
            }
            statusEl.textContent = statusText;
            statusEl.className = `score-status ${statusClass}`;
            progressEl.className = `progress-fill ${statusClass}`;
        }
    };
    
    /**
     * Updates a single metric bar on the UI.
     * @param {string} name - The base name for the element IDs (e.g., 'acceleration').
     * @param {number} score - The metric score value.
     */
    const updateMetricBar = (name, score) => {
        const scoreEl = document.getElementById(`${name}-score`);
        const progressEl = document.getElementById(`${name}-progress`);

        if(scoreEl) scoreEl.textContent = score;
        if(progressEl) {
            progressEl.style.width = `${score}%`;
            let statusClass = 'good';
             if (score > 90) statusClass = 'excellent';
             else if (score <= 80) statusClass = 'warning';
            progressEl.className = `progress-fill ${statusClass}`;
        }
    };

    /**
     * Renders the list of recent driving events.
     * @param {Array} events - An array of event objects.
     */
    const updateEventsTimeline = (events) => {
        const timelineEl = document.getElementById('events-timeline');
        if (!timelineEl) return;
        
        timelineEl.innerHTML = ''; // Clear existing events
        events.forEach(event => {
            const item = document.createElement('div');
            item.className = `event-item ${event.type}`;
            item.innerHTML = `
                <div class="event-time">${event.time}</div>
                <div class="event-description">${event.description}</div>
                <div class="event-location">${event.location}</div>
                <div class="event-badge ${event.type}">${event.type === 'good' ? 'Good' : 'Alert'}</div>
            `;
            timelineEl.appendChild(item);
        });
    };

     /**
     * Renders the list of improvement tips.
     * @param {Array} tips - An array of tip objects.
     */
    const updateImprovementTips = (tips) => {
        const tipsEl = document.getElementById('tips-content');
        if(!tipsEl) return;

        tipsEl.innerHTML = '';
        tips.forEach(tip => {
            const icon = tip.type === 'good' ? 'fa-leaf' : 'fa-exclamation-triangle';
            const item = document.createElement('div');
            item.className = 'tip-item';
            item.innerHTML = `
                <div class="tip-icon ${tip.type}"><i class="fas ${icon}"></i></div>
                <div class="tip-text">
                    <h4>${tip.title}</h4>
                    <p>${tip.description}</p>
                </div>
            `;
            tipsEl.appendChild(item);
        });
    };

    /**
     * NEW: Generates a downloadable PDF report from the driving data.
     * @param {object} data - The complete driving data object from the server.
     */
    const generatePDFReport = (data) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // --- Document Header ---
        doc.setFontSize(22);
        doc.text("Driving Behavior Report", 105, 20, { align: "center" });
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Report Generated: ${new Date().toLocaleString()}`, 105, 27, { align: "center" });
        
        // --- Summary Section ---
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.text("Overall Summary", 14, 45);
        
        doc.autoTable({
            startY: 50,
            head: [['Metric', 'Value']],
            body: [
                ['Overall Score', `${data.scores.overall}/100`],
                ['Distance Traveled', `${data.summary.distance} miles`],
                ['Total Drive Time', data.summary.driveTime],
                ['Average Speed', `${data.summary.avgSpeed} mph`],
                ['Fuel Efficiency', `+${data.summary.fuelEfficiency}% above avg`],
            ],
            theme: 'grid',
            headStyles: { fillColor: [26, 31, 46] } // Dark blue header
        });
        
        let finalY = doc.lastAutoTable.finalY;

        // --- Detailed Breakdown ---
        doc.setFontSize(18);
        doc.text("Detailed Breakdown", 14, finalY + 15);
        
        const scoresAndMetricsBody = [
            ['Speed Control Score', data.scores.speedControl],
            ['Eco Score', data.scores.eco],
            ['Acceleration', data.metrics.acceleration],
            ['Cornering', data.metrics.cornering],
            ['Braking', data.metrics.braking],
        ];

        const eventCountsBody = [
            ['Hard Braking', data.eventCounts.hardBraking],
            ['Rapid Acceleration', data.eventCounts.rapidAccel],
            ['Sharp Turns', data.eventCounts.sharpTurns],
            ['Speeding Incidents', data.eventCounts.speeding],
        ];
        
        doc.autoTable({
            startY: finalY + 20,
            head: [['Scores & Metrics', 'Value']],
            body: scoresAndMetricsBody,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 5,
            head: [['Event Type', 'Count']],
            body: eventCountsBody,
            theme: 'striped',
            headStyles: { fillColor: [255, 136, 0] } // Orange header for events
        });

        finalY = doc.lastAutoTable.finalY;
        
        // --- Recent Events ---
        doc.setFontSize(18);
        doc.text("Recent Driving Events", 14, finalY + 15);

        doc.autoTable({
            startY: finalY + 20,
            head: [['Time', 'Description', 'Location', 'Type']],
            body: data.recentEvents.map(event => [event.time, event.description, event.location, event.type.charAt(0).toUpperCase() + event.type.slice(1)]),
            theme: 'grid',
            headStyles: { fillColor: [26, 31, 46] }
        });

        finalY = doc.lastAutoTable.finalY;

        // --- Improvement Tips ---
        doc.setFontSize(18);
        doc.text("Improvement Tips", 14, finalY + 15);
        let tipsText = data.tips.map(tip => `• [${tip.type.toUpperCase()}] ${tip.title}: ${tip.description}`).join('\n');
        doc.setFontSize(11);
        doc.text(tipsText, 14, finalY + 22, { maxWidth: 180, lineHeightFactor: 1.5 });

        // --- Save the PDF ---
        doc.save('Driving-Behavior-Report.pdf');
        console.log("PDF report generated and downloaded.");
    };

    /**
     * The main function to update the entire UI with new data.
     * @param {object} data - The complete driving data object from the server.
     */
    const updateUI = (data) => {
        if (!data) return;
        
        // NEW: Store the fetched data so it can be used for the PDF report
        latestData = data;

        // Page 1: Dashboard
        updateScoreCard('overall-score', data.scores.overall);
        updateScoreCard('speed-control', data.scores.speedControl);
        updateScoreCard('eco-score', data.scores.eco);
        
        updateMetricBar('acceleration', data.metrics.acceleration);
        updateMetricBar('cornering', data.metrics.cornering);
        updateMetricBar('braking', data.metrics.braking);
        updateMetricBar('smooth-driving', data.metrics.smoothDriving);

        document.getElementById('hard-braking-count').textContent = data.eventCounts.hardBraking;
        document.getElementById('rapid-accel-count').textContent = data.eventCounts.rapidAccel;
        document.getElementById('sharp-turns-count').textContent = data.eventCounts.sharpTurns;
        document.getElementById('speeding-count').textContent = data.eventCounts.speeding;

        updateEventsTimeline(data.recentEvents);
        
        // Page 2: Summary & Insights
        document.getElementById('summary-score').textContent = `${data.scores.overall}/100`;
        document.getElementById('summary-distance').textContent = `${data.summary.distance} miles`;
        document.getElementById('summary-drivetime').textContent = data.summary.driveTime;
        document.getElementById('summary-avgspeed').textContent = `${data.summary.avgSpeed} mph`;
        document.getElementById('summary-fuel').textContent = `+${data.summary.fuelEfficiency}% above avg`;

        document.getElementById('trend-score').textContent = `${data.trends.scoreTrend > 0 ? '+' : ''}${data.trends.scoreTrend}`;
        document.getElementById('trend-best-day').textContent = `${data.trends.bestDay} (${data.trends.bestDayScore})`;
        document.getElementById('trend-improvement').textContent = `${data.trends.improvement} +${data.trends.improvementValue}%`;
        
        document.getElementById('achievement-title').textContent = data.achievement.title;
        document.getElementById('achievement-description').textContent = data.achievement.description;

        updateImprovementTips(data.tips);

        const goalProgress = Math.min(100, (data.goals.currentScore / data.goals.monthlyTarget) * 100);
        document.getElementById('goal-progress-bar').style.width = `${goalProgress}%`;
        document.getElementById('goal-text').textContent = `${data.goals.monthlyTarget}+ Score`;
        const pointsToGo = Math.max(0, data.goals.monthlyTarget - data.goals.currentScore);
        document.getElementById('goal-status').textContent = pointsToGo > 0 ? `${pointsToGo} points to go` : 'Goal Reached!';
    };

    /**
     * Fetches data from the API and updates the UI.
     * This function is now used for both the initial load and subsequent polling.
     */
    const fetchAndDisplayData = async () => {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Data fetched successfully:', data);
            updateUI(data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            // Optionally, display an error message on the UI
        }
    };

    /**
     * REMOVED: The WebSocket setup function is no longer necessary.
     */
    // const setupWebSocket = () => { ... };
    
    // --- LEGACY CODE FOR PAGE NAVIGATION (Unchanged) ---
    const loadComponent = async (componentUrl, placeholderId) => {
        const placeholder = document.getElementById(placeholderId);
        if (!placeholder) {
            console.error(`Error: Placeholder element with ID '${placeholderId}' not found.`);
            return;
        }
        try {
            const response = await fetch(componentUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${componentUrl}: ${response.status}`);
            }
            placeholder.innerHTML = await response.text();
            console.log(`${componentUrl} loaded successfully into #${placeholderId}.`);
        } catch (error) {
            console.error(`Error loading component from ${componentUrl}:`, error);
        }
    };

    const loadScript = (scriptUrl) => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.onload = () => {
                console.log(`${scriptUrl} script loaded successfully.`);
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load script: ${scriptUrl}`));
            document.body.appendChild(script);
        });
    };
    
    const initializeVerticalPagination = () => {
        const container = document.querySelector('.page-container');
        const sections = document.querySelectorAll('.page-section');
        const paginationDots = document.querySelectorAll('.pagination-dot');
        if (!container) return;
        paginationDots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                document.getElementById(dot.dataset.sectionId)?.scrollIntoView({ behavior: 'smooth' });
            });
        });
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    paginationDots.forEach(dot => {
                        dot.classList.toggle('active', dot.dataset.sectionId === entry.target.id);
                    });
                }
            });
        }, { root: container, threshold: 0.7 });
        sections.forEach(section => observer.observe(section));
        if (paginationDots.length > 0) paginationDots[0].classList.add('active');
    };

    const initializeButtonActions = () => {
        const viewAchievementsBtn = document.getElementById('viewAchievementsBtn');
        const achievementsSection = document.getElementById('page2');
        if (viewAchievementsBtn && achievementsSection) {
            viewAchievementsBtn.addEventListener('click', (e) => {
                achievementsSection.scrollIntoView({ behavior: 'smooth' });
            });
        }
        
        // NEW: Add click event listener for the 'Generate Report' button
        const generateReportBtn = document.querySelector('.btn-secondary');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => {
                if (latestData) {
                    if (window.jspdf && typeof window.jspdf.jsPDF === 'function') {
                        generatePDFReport(latestData);
                    } else {
                        console.error('jsPDF library is not loaded.');
                        alert('Error: Could not generate report. The PDF library failed to load.');
                    }
                } else {
                    alert('Data is not yet available. Please wait for the page to finish loading.');
                }
            });
        }
    };

    /**
     * Main initialization sequence.
     */
    const initializePage = async () => {
        // NEW: Load external libraries for PDF generation first
        try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
        } catch (error) {
            console.error('Could not load PDF generation libraries:', error);
            // Optionally disable the button if scripts fail to load
            const generateReportBtn = document.querySelector('.btn-secondary');
            if(generateReportBtn) {
                generateReportBtn.disabled = true;
                generateReportBtn.textContent = 'Report Unavailable';
            }
        }

        // Load shared components
        await loadComponent('../header/header.html', 'header-placeholder');
        await loadScript('../header/header.js');
        await loadComponent('../chatbot/chatbot.html', 'chatbot-placeholder');
        await loadScript('../chatbot/chatbot.js');

        // Initialize page-specific functionality
        initializeVerticalPagination();
        initializeButtonActions();

        // Fetch initial data immediately on load
        await fetchAndDisplayData();
        
        // Start polling for real-time updates
        setInterval(fetchAndDisplayData, POLLING_INTERVAL);
        console.log(`Polling for data every ${POLLING_INTERVAL / 1000} seconds...`);
    };

    initializePage();
});

function googleTranslateElementInit() {
    new google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
}