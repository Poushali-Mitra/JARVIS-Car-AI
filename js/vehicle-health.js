/*
 * vehicle-health.js
 * Final version with data polling for real-time updates.
 */

document.addEventListener('DOMContentLoaded', () => {

    const loadComponent = async (componentUrl, placeholderId, scriptUrl) => {
        try {
            const response = await fetch(componentUrl);
            if (!response.ok) throw new Error(`Failed to load ${componentUrl}`);
            const html = await response.text();
            const placeholder = document.getElementById(placeholderId);

            if (placeholder) {
                placeholder.innerHTML = html;
                if (scriptUrl) {
                    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
                    if (existingScript) existingScript.remove();
                    const script = document.createElement('script');
                    script.src = scriptUrl;
                    script.defer = true;
                    document.body.appendChild(script);
                }
            }
        } catch (error) {
            console.error(`Error loading component: ${error}`);
        }
    };

    const initializePage = async () => {
        await loadComponent('/header/header.html', 'header-placeholder', '/header/header.js');
        await loadComponent('/chatbot/chatbot.html', 'chatbot-placeholder', '/chatbot/chatbot.js');
        initializeDashboardLogic();
    };

    function initializeDashboardLogic() {
        let charts = {};
        let updateInterval;
        let metricStates = {};

        initializeCharts();
        fetchAndUpdateAllMetrics(); // For initial load
        startRealTimeUpdates(); // For subsequent updates
        setupEventListeners();
        animateMetricCards();

        async function initializeCharts() {
            try {
                // Engine Temperature Mini Chart
                const engineHistory = await (await fetch('http://localhost:3001/api/engine-history')).json();
                const engineCtx = document.getElementById('engineChart').getContext('2d');
                charts.engine = new Chart(engineCtx, {
                    type: 'line', data: { labels: engineHistory.map(d => new Date(d.timestamp).toLocaleTimeString()), datasets: [{ data: engineHistory.map(d => d.engineTemp), borderColor: '#00d4ff', backgroundColor: 'rgba(0, 212, 255, 0.1)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0 }] },
                    options: { scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false } } }
                });

                // Performance Analytics Chart
                const performanceCtx = document.getElementById('performanceChart').getContext('2d');
                charts.performance = new Chart(performanceCtx, {
                    type: 'line', data: { labels: [], datasets: [{ label: 'Engine Temp (°C)', data: [], borderColor: '#ff8800', backgroundColor: 'rgba(255, 136, 0, 0.1)', tension: 0.4, spanGaps: true }, { label: 'Oil Quality (%)', data: [], borderColor: '#00ff88', backgroundColor: 'rgba(0, 255, 136, 0.1)', tension: 0.4, spanGaps: true }, { label: 'Battery Voltage (V)', data: [], borderColor: '#00d4ff', backgroundColor: 'rgba(0, 212, 255, 0.1)', tension: 0.4, spanGaps: true }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#ffffff' } } }, scales: { x: { ticks: { color: '#a0a8b8' } }, y: { ticks: { color: '#a0a8b8' } } } }
                });
                updatePerformanceChart('24h');

            } catch (error) {
                console.error("Failed to initialize charts:", error);
            }
        }
        
        async function updatePerformanceChart(period) {
            try {
                const response = await fetch(`http://localhost:3001/api/performance-history?period=${period}`);
                const perfHistory = await response.json();
                if (charts.performance) {
                    charts.performance.data.labels = perfHistory.labels;
                    charts.performance.data.datasets[0].data = perfHistory.engineTemps;
                    charts.performance.data.datasets[1].data = perfHistory.oilQualities;
                    charts.performance.data.datasets[2].data = perfHistory.batteryVoltages;
                    charts.performance.update();
                }
            } catch (error) { console.error(`Failed to update performance chart for period ${period}:`, error); }
        }
        
        /**
         * Starts an interval to periodically fetch the latest metrics from the server.
         */
        function startRealTimeUpdates() {
            // Fetch new data every 5 seconds
            updateInterval = setInterval(fetchAndUpdateAllMetrics, 5000);
        }

        async function fetchAndUpdateAllMetrics() {
            try {
                const responses = await Promise.all([
                    fetch('http://localhost:3001/api/engine-data'), fetch('http://localhost:3001/api/oil-data'),
                    fetch('http://localhost:3001/api/brakes-data'), fetch('http://localhost:3001/api/battery-data'),
                    fetch('http://localhost:3001/api/tires-data'), fetch('http://localhost:3001/api/coolant-data')
                ]);
                const [engineData, oilData, brakesData, batteryData, tiresData, coolantData] = await Promise.all(responses.map(res => res.json()));

                updateEngineUI(engineData);
                updateOilUI(oilData);
                updateBrakesUI(brakesData);
                updateBatteryUI(batteryData);
                updateTiresUI(tiresData);
                updateCoolantUI(coolantData);
            } catch (error) {
                console.error("Failed to fetch initial vehicle metrics:", error);
            }
        }
        
        function renderStatusBadge(metric, statusString) {
            const statusElement = document.getElementById(`${metric}-status`);
            const card = document.querySelector(`[data-metric="${metric}"]`);
            if (!statusElement || !card) return;

            const statusMap = { 'Good': 'good', 'Normal': 'normal', 'Warning': 'warning', 'Critical': 'critical' };
            const statusClass = statusMap[statusString] || 'normal';

            statusElement.className = 'status-badge'; 
            card.classList.remove('alert');
            statusElement.classList.add(statusClass);
            statusElement.innerHTML = `<span class="status-dot"></span>${statusString.toUpperCase()}`;
            
            if (statusClass === 'critical') {
                card.classList.add('alert');
            }
            
            if (statusClass === 'critical' && metricStates[metric] !== 'critical') {
                showNotification(`${metric.charAt(0).toUpperCase() + metric.slice(1)} status is critical!`, 'critical');
            }
            metricStates[metric] = statusClass;
        }

        function updateEngineUI(data) {
            if (!data || data.engineTemp === undefined) return;
            document.getElementById('engine-temp').textContent = data.engineTemp;
            renderStatusBadge('engine', data.status);

            if (charts.engine && charts.engine.data.labels.length > 0 && data.timestamp) {
                const lastTimestamp = charts.engine.data.labels[charts.engine.data.labels.length - 1];
                const newTimestamp = new Date(data.timestamp).toLocaleTimeString();
                // Only update chart if data is new
                if(lastTimestamp !== newTimestamp){
                    charts.engine.data.labels.shift();
                    charts.engine.data.datasets[0].data.shift();
                    charts.engine.data.labels.push(newTimestamp);
                    charts.engine.data.datasets[0].data.push(data.engineTemp);
                    charts.engine.update('none');
                }
            }
        }

        function updateOilUI(data) {
            if (!data || data.oilQuality === undefined) return;
            document.getElementById('oil-quality').textContent = data.oilQuality;
            document.getElementById('oil-progress').style.width = `${data.oilQuality}%`;
            document.getElementById('oil-level').textContent = `${data.oilLevel || 'N/A'}%`;
            document.getElementById('oil-viscosity').textContent = data.viscosity || 'N/A';
            renderStatusBadge('oil', data.status);
        }

        function updateBrakesUI(data) {
            if (!data || data.condition === undefined) return;
            document.getElementById('brake-condition').textContent = data.condition;
            document.getElementById('brake-progress').style.width = `${data.condition}%`;
            document.querySelector('.brake-details .brake-wheel:nth-child(1) span').textContent = `Front: ${data.front}%`;
            document.querySelector('.brake-details .brake-wheel:nth-child(2) span').textContent = `Rear: ${data.rear}%`;
            renderStatusBadge('brakes', data.status);
        }
        
        function updateBatteryUI(data) {
            if (!data || !data.battery) return;
            const { voltage, charge, health } = data.battery;
            document.getElementById('battery-voltage').textContent = voltage.toFixed(1);
            document.getElementById('battery-charge').textContent = `${charge}%`;
            document.getElementById('battery-level').style.width = `${charge}%`;
            document.getElementById('battery-health').textContent = health;
            renderStatusBadge('battery', health);
        }

        function updateTiresUI(data) {
            if (!data || !data.tires) return;
            const { fl, fr, rl, rr } = data.tires;
            document.getElementById('tire-fl').textContent = fl;
            document.getElementById('tire-fr').textContent = fr;
            document.getElementById('tire-rl').textContent = rl;
            document.getElementById('tire-rr').textContent = rr;
            renderStatusBadge('tires', data.status);
        }

        function updateCoolantUI(data) {
            if (!data || data.coolantTemp === undefined) return;
            document.getElementById('coolant-temp').textContent = data.coolantTemp;
            document.getElementById('coolant-level').style.height = `${data.coolantLevel}%`;
            document.querySelector('.coolant-tank .level-indicator').textContent = `${data.coolantLevel}%`;
            renderStatusBadge('coolant', data.status);
        }

        function setupEventListeners() {
            document.querySelectorAll('.metric-card').forEach(card => card.addEventListener('click', () => openMetricModal(card.getAttribute('data-metric'))));
            document.getElementById('closeModal').addEventListener('click', closeModal);
            document.getElementById('metricModal').addEventListener('click', (event) => {
                if (event.target === document.getElementById('metricModal')) closeModal();
            });
            document.querySelector('.book-service-btn').addEventListener('click', () => {
                showNotification('Connecting to your service dealer...', 'info');
            });
            document.querySelectorAll('.chart-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    updatePerformanceChart(btn.getAttribute('data-period'));
                });
            });
        }

        function animateMetricCards() {
            document.querySelectorAll('.metric-card').forEach((card, index) => {
                setTimeout(() => card.classList.add('animate-in'), index * 100);
            });
        }
        
        function openMetricModal(metric) {
            const modal = document.getElementById('metricModal');
            const title = document.getElementById('modalTitle');
            const body = document.getElementById('modalBody');
            const metricDetails = {
                engine: { title: 'Engine Health Details', content: `<h4>Current Temperature: ${document.getElementById('engine-temp').textContent}°C</h4><p>The engine control unit (ECU) monitors temperature to ensure optimal performance. Normal operating temperatures range from 80°C to 95°C.</p><p class="warning">High temperatures can indicate issues with the cooling system.</p>` },
                oil: { title: 'Oil Quality & Level', content: `<h4>Quality: ${document.getElementById('oil-quality').textContent}%</h4><p>Oil quality degrades over time. Regular oil changes are crucial for engine longevity.</p><ul><li><strong>Level:</strong> ${document.getElementById('oil-level').textContent}</li><li><strong>Viscosity:</strong> ${document.getElementById('oil-viscosity').textContent}</li></ul>` },
                brakes: { title: 'Brake Pad Condition', content: `<h4>Remaining Life: ${document.getElementById('brake-condition').textContent}%</h4><p>This estimates the remaining thickness of your brake pads. A warning status indicates that you should schedule a replacement soon.</p>` },
                battery: { title: 'Battery Health', content: `<h4>Voltage: ${document.getElementById('battery-voltage').textContent}V</h4><p>A healthy 12V car battery should read between 12.4V and 12.7V when the engine is off.</p><ul><li><strong>Charge:</strong> ${document.getElementById('battery-charge').textContent}</li><li><strong>Health:</strong> ${document.getElementById('battery-health').textContent}</li></ul>` },
                tires: { title: 'Tire Pressure (PSI)', content: `<p>Maintaining correct tire pressure is vital for safety, fuel economy, and tire lifespan.</p><ul><li><strong>Front Left:</strong> ${document.getElementById('tire-fl').textContent} PSI</li><li><strong>Front Right:</strong> ${document.getElementById('tire-fr').textContent} PSI</li><li><strong>Rear Left:</strong> ${document.getElementById('tire-rl').textContent} PSI</li><li><strong>Rear Right:</strong> ${document.getElementById('tire-rr').textContent} PSI</li></ul>` },
                coolant: { title: 'Coolant System', content: `<h4>Temperature: ${document.getElementById('coolant-temp').textContent}°C</h4><p>The coolant system prevents the engine from overheating. The temperature should remain stable during operation.</p>` }
            };
            
            if (metricDetails[metric]) {
                title.textContent = metricDetails[metric].title;
                body.innerHTML = metricDetails[metric].content;
                modal.classList.add('active');
            }
        }
        
        function closeModal() {
            document.getElementById('metricModal').classList.remove('active');
        }
        
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => notification.classList.add('show'), 10);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(notification)) document.body.removeChild(notification);
                }, 500);
            }, 4000);
        }

        // Clean up the interval when the user navigates away
        window.addEventListener('beforeunload', () => {
            if (updateInterval) clearInterval(updateInterval);
        });
    }

    initializePage();
});

function googleTranslateElementInit() {
    new google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
}

