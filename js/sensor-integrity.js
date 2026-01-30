// public/js/sensor-integrity.js
$(function(){
        // Load the header component and its script
        $("#header-placeholder").load("/header/header.html", function() {
            $.getScript("/header/header.js");
            console.log("Header loaded.");
        });

        // Load the chatbot component and its script using the confirmed working pattern
        $("#chatbot-placeholder").load("/chatbot/chatbot.html", function() {
            $.getScript("/chatbot/chatbot.js");
            console.log("Chatbot loaded.");
        });

        // Initialize the sensor page once the document is ready
        initializeSensorPage();
    });

function updateSensorCard(sensorData) {
    const card = document.querySelector(`[data-sensor-id="${sensorData.sensorId}"]`);
    if (!card) return;

    // --- Card Status and Header ---
    card.classList.remove('good', 'warning', 'critical');
    card.classList.add(sensorData.status);
    card.querySelector('.sensor-icon-wrapper').className = `sensor-icon-wrapper ${sensorData.status}`;
    card.querySelector('.sensor-title-section h4').textContent = sensorData.name;
    card.querySelector('.sensor-location').textContent = sensorData.location;
    const statusBadge = card.querySelector('.sensor-status-badge');
    statusBadge.className = `sensor-status-badge ${sensorData.status}`;
    statusBadge.innerHTML = `<span class="status-dot"></span> ${sensorData.statusText}`;

    // --- Metrics Population (New Logic) ---
    const primaryPanel = card.querySelector('.primary-metric-panel');
    const secondaryPanel = card.querySelector('.secondary-metrics-panel');
    primaryPanel.innerHTML = '';
    secondaryPanel.innerHTML = '';
    
    const primaryMetric = sensorData.metrics.find(m => m.type === 'primary');
    if (primaryMetric) {
        primaryPanel.classList.remove('good', 'warning', 'critical');
        primaryPanel.classList.add(primaryMetric.status);
        primaryPanel.innerHTML = `
            <div class="metric-value">${primaryMetric.value}</div>
            <div class="metric-label">${primaryMetric.label}</div>
        `;
    }

    sensorData.metrics.filter(m => m.type !== 'primary').forEach(metric => {
        secondaryPanel.innerHTML += `
            <div class="secondary-metric">
                <div class="metric-value">${metric.value}</div>
                <div class="metric-label">${metric.label}</div>
            </div>
        `;
    });

    // --- Chart Section ---
    const trendIndicator = card.querySelector('.trend-indicator');
    trendIndicator.className = `trend-indicator ${sensorData.trend.status}`;
    trendIndicator.innerHTML = `<i class="fas ${sensorData.trend.icon}"></i> ${sensorData.trend.status.charAt(0).toUpperCase() + sensorData.trend.status.slice(1)}`;
    const canvas = card.querySelector('.main-chart'); // Updated selector
    const ctx = canvas.getContext('2d');
    if (canvas.chartInstance) canvas.chartInstance.destroy();
    
    let borderColor = sensorData.status === 'good' ? 'rgba(0, 255, 136, 0.8)' : 
                      sensorData.status === 'warning' ? 'rgba(255, 136, 0, 0.8)' : 
                      sensorData.status === 'critical' ? 'rgba(255, 68, 68, 0.8)' : 'rgba(0, 212, 255, 0.8)';
    const backgroundColor = borderColor.replace('0.8', '0.1');

    canvas.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(sensorData.chartData.length).fill(''),
            datasets: [{ data: sensorData.chartData, borderColor, backgroundColor, fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2.5 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } }
        }
    });

    // --- Footer Section ---
    const nextAction = card.querySelector('.next-action');
    nextAction.innerHTML = `<i class="fas ${sensorData.footer.icon}"></i><span>${sensorData.footer.text} <strong>${sensorData.footer.textBold}</strong></span>`;
    const actionBtn = card.querySelector('.action-btn');
    actionBtn.className = `action-btn ${sensorData.button.status}`;
    actionBtn.innerHTML = `<i class="fas ${sensorData.button.icon}"></i> ${sensorData.button.text}`;
}

async function initializeSensorPage() {
    const allCards = document.querySelectorAll('.sensor-card-detailed');
    allCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    });

    try {
        const response = await fetch('http://localhost:3001/api/sensors');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const sensors = await response.json();
        sensors.forEach(updateSensorCard);
    } catch (error) {
        console.error("Could not fetch sensor data:", error);
    }

    setTimeout(() => {
        allCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }, 100); 
}

function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: false
    }, 'google_translate_element');
}