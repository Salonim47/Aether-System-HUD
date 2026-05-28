// DOM Selectors
const uptimeVal = document.getElementById('uptimeVal');
const connStatusBox = document.getElementById('connStatusBox');
const connStatusText = document.getElementById('connStatusText');

// Gauge Text Elements
const cpuPercentText = document.getElementById('cpuPercentText');
const cpuCoresVal = document.getElementById('cpuCoresVal');
const ramPercentText = document.getElementById('ramPercentText');
const ramDetailsVal = document.getElementById('ramDetailsVal');
const diskPercentText = document.getElementById('diskPercentText');
const diskDetailsVal = document.getElementById('diskDetailsVal');

// Rings
const cpuRing = document.getElementById('cpuRing');
const ramRing = document.getElementById('ramRing');
const diskRing = document.getElementById('diskRing');

// Network & Chart Elements
const netSentText = document.getElementById('netSentText');
const netRecvText = document.getElementById('netRecvText');
const telemetryChartCanvas = document.getElementById('telemetryChart');

// Process list
const processTableBody = document.getElementById('processTableBody');

// Console / Terminal Elements
const terminalLogs = document.getElementById('terminalLogs');
const terminalInput = document.getElementById('terminalInput');
const runCmdBtn = document.getElementById('runCmdBtn');
const micBtn = document.getElementById('micBtn');
const voiceStatus = document.getElementById('voiceStatus');

// WebSocket state
let ws = null;
const SERVER_URL = "http://127.0.0.1:8000";
const WS_URL = "ws://127.0.0.1:8000/ws";

// Gauge Circumference (r=70)
// C = 2 * pi * r = 2 * 3.14159 * 70 = 439.82
const RING_CIRCUMFERENCE = 439.82;

// Chart.js State
let telemetryChart = null;
const MAX_CHART_POINTS = 20;
let chartLabels = Array(MAX_CHART_POINTS).fill("");
let cpuHistory = Array(MAX_CHART_POINTS).fill(0);
let ramHistory = Array(MAX_CHART_POINTS).fill(0);

// Speech Recognition State
let recognition = null;
let isListening = false;

// Initialize Chart.js
function initChart() {
    const ctx = telemetryChartCanvas.getContext('2d');
    
    // Set up gradients for neon look
    const blueGradient = ctx.createLinearGradient(0, 0, 0, 180);
    blueGradient.addColorStop(0, 'rgba(0, 243, 255, 0.2)');
    blueGradient.addColorStop(1, 'rgba(0, 243, 255, 0)');
    
    const pinkGradient = ctx.createLinearGradient(0, 0, 0, 180);
    pinkGradient.addColorStop(0, 'rgba(255, 0, 127, 0.2)');
    pinkGradient.addColorStop(1, 'rgba(255, 0, 127, 0)');

    telemetryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'CPU Load (%)',
                    data: cpuHistory,
                    borderColor: '#00f3ff',
                    borderWidth: 2,
                    backgroundColor: blueGradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    shadowColor: 'rgba(0, 243, 255, 0.5)',
                    shadowBlur: 10
                },
                {
                    label: 'RAM Usage (%)',
                    data: ramHistory,
                    borderColor: '#ff007f',
                    borderWidth: 2,
                    backgroundColor: pinkGradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    shadowColor: 'rgba(255, 0, 127, 0.5)',
                    shadowBlur: 10
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#64748b',
                        font: {
                            family: 'Orbitron',
                            size: 10
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: false // hide timeline ticks
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: 'rgba(255,255,255,0.03)'
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'Share Tech Mono'
                        }
                    }
                }
            }
        }
    });
}

// Update SVG progress dials
function setRingVal(ring, percent) {
    const offset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
    ring.style.strokeDashoffset = offset;
}

// Establish WebSockets Connection to Python backend
function connectWebSocket() {
    connStatusText.innerText = "CONNECTING...";
    connStatusBox.classList.remove('connected');
    
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
        connStatusText.innerText = "ONLINE";
        connStatusBox.classList.add('connected');
        addLogLine("WEBSOCKET METRIC DAEMON CONNECTED.", "sys-log");
        playBeep(600, 0.1);
    };
    
    ws.onmessage = (event) => {
        const stats = JSON.parse(event.data);
        updateDashboard(stats);
    };
    
    ws.onclose = () => {
        connStatusText.innerText = "OFFLINE";
        connStatusBox.classList.remove('connected');
        addLogLine("WEBSOCKET METRIC DAEMON DISCONNECTED. ATTEMPTING RECONNECT IN 3S...", "sys-log");
        
        // Auto-reconnect loop
        setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (err) => {
        console.error("WebSocket Error: ", err);
    };
}

// Dynamically refresh the HUD visuals
function updateDashboard(stats) {
    // 1. Text Metrics
    cpuPercentText.innerText = `${Math.round(stats.cpu_percent)}%`;
    cpuCoresVal.innerText = `Cores: ${stats.cpu_cores}`;
    
    ramPercentText.innerText = `${Math.round(stats.ram_percent)}%`;
    ramDetailsVal.innerText = `${stats.ram_used} / ${stats.ram_total} GB`;
    
    diskPercentText.innerText = `${Math.round(stats.disk_percent)}%`;
    diskDetailsVal.innerText = `${stats.disk_used} / ${stats.disk_total} GB`;
    
    uptimeVal.innerText = stats.uptime;
    netSentText.innerText = `${stats.net_sent} MB`;
    netRecvText.innerText = `${stats.net_recv} MB`;
    
    // 2. Dials Fills
    setRingVal(cpuRing, stats.cpu_percent);
    setRingVal(ramRing, stats.ram_percent);
    setRingVal(diskRing, stats.disk_percent);
    
    // 3. Historical Telemetry Chart
    cpuHistory.push(stats.cpu_percent);
    cpuHistory.shift();
    ramHistory.push(stats.ram_percent);
    ramHistory.shift();
    
    if (telemetryChart) {
        telemetryChart.update('none'); // Update without animation overhead for performance
    }
    
    // 4. Processes Table
    updateProcessTable(stats.processes);
}

// Update tabular processes list
function updateProcessTable(processes) {
    if (!processes || processes.length === 0) {
        processTableBody.innerHTML = '<tr><td colspan="5" class="table-empty">No processes captured.</td></tr>';
        return;
    }
    
    processTableBody.innerHTML = '';
    processes.forEach(proc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${proc.pid}</td>
            <td>${proc.name}</td>
            <td style="color: var(--neon-blue);">${proc.cpu_percent}%</td>
            <td style="color: var(--neon-pink);">${proc.memory_percent}%</td>
            <td>
                <button class="kill-btn" onclick="terminateProcess(${proc.pid}, '${proc.name}')">
                    <i class="fa-solid fa-skull"></i> KILL
                </button>
            </td>
        `;
        processTableBody.appendChild(tr);
    });
}

// Terminate target system process
window.terminateProcess = async function(pid, name) {
    if (!confirm(`Confirm requested termination of process: ${name} (PID: ${pid})?`)) {
        return;
    }
    
    addLogLine(`ISSUING KILL COMMAND TO PROCESS: ${name} (PID: ${pid})...`, "sys-log");
    
    try {
        const res = await fetch(`${SERVER_URL}/terminate/${pid}`, {
            method: 'POST'
        });
        const data = await res.json();
        
        if (res.ok) {
            addLogLine(`SUCCESS: ${data.message}`, "out-log");
            playBeep(900, 0.15);
        } else {
            addLogLine(`ERROR: ${data.detail}`, "err-log");
            playBeep(300, 0.2);
        }
    } catch(err) {
        addLogLine(`HTTP connection failed to command process kill.`, "err-log");
    }
};

// Command Executor Hook
async function runCommand(commandText) {
    const cmd = commandText.trim();
    if (!cmd) return;
    
    addLogLine(cmd, "cmd-log");
    terminalInput.value = '';
    
    try {
        const res = await fetch(`${SERVER_URL}/run-command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command: cmd })
        });
        const data = await res.json();
        
        if (res.ok) {
            addLogLine(data.output, "out-log");
            playBeep(700, 0.08);
        } else {
            addLogLine(`Failed to execute request.`, "err-log");
        }
    } catch(err) {
        addLogLine(`Connection error. Make sure Python FastAPI backend is running!`, "err-log");
    }
}

// Log formatting helper
function addLogLine(text, className) {
    const line = document.createElement('div');
    line.className = `log-line ${className}`;
    line.innerText = text;
    terminalLogs.appendChild(line);
    
    // Auto-scroll to bottom
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

// Interactive sound maker
function playBeep(freq = 600, duration = 0.1) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

// Voice Command System Setup
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceStatus.innerText = "VOICE UNSUPPORTED";
        micBtn.style.display = 'none';
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('active');
        voiceStatus.innerText = "LISTENING...";
        voiceStatus.classList.add('listening');
        playBeep(1000, 0.05);
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        addLogLine(transcript, "voice-log");
        runCommand(transcript);
    };
    
    recognition.onerror = (event) => {
        console.error("Speech Error: ", event.error);
        voiceStatus.innerText = "ERROR";
        setTimeout(() => {
            voiceStatus.innerText = "READY";
            voiceStatus.classList.remove('listening');
        }, 2000);
    };
    
    recognition.onend = () => {
        isListening = false;
        micBtn.classList.remove('active');
        voiceStatus.classList.remove('listening');
        voiceStatus.innerText = "READY";
    };
    
    micBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
}

// Initialization on DOM Load
window.addEventListener('DOMContentLoaded', () => {
    initChart();
    connectWebSocket();
    initSpeechRecognition();
    
    // Command input handlers
    runCmdBtn.addEventListener('click', () => {
        runCommand(terminalInput.value);
    });
    
    terminalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            runCommand(terminalInput.value);
        }
    });
});
