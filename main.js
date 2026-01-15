import { AnchorEngine } from './urp.js';
import Chart from 'chart.js/auto';

class App {
    constructor() {
        this.textInput = document.getElementById('text-input');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.playIcon = this.playPauseBtn.querySelector('.play-icon');
        this.pauseIcon = this.playPauseBtn.querySelector('.pause-icon');

        this.wpmSlider = document.getElementById('wpm-slider');
        this.wpmValue = document.getElementById('wpm-value');

        this.chunkSlider = document.getElementById('chunk-size-slider');
        this.chunkValue = document.getElementById('chunk-size-value');

        this.fontSelect = document.getElementById('font-family-select');
        this.fontSizeSlider = document.getElementById('font-size-slider');
        this.fontSizeValue = document.getElementById('font-size-value');

        this.panel = document.getElementById('controls-panel');
        this.panelToggle = document.getElementById('panel-toggle');

        this.wordDisplay = document.getElementById('word-display');

        this.reportModal = document.getElementById('report-modal');
        this.closeReportBtn = document.getElementById('close-report-btn');

        // Stats Elements
        this.avgWpmEl = document.getElementById('avg-wpm');
        this.peakWpmEl = document.getElementById('peak-wpm');
        this.totalTimeEl = document.getElementById('total-time');
        this.heatmapEl = document.getElementById('text-heatmap');
        this.chartCanvas = document.getElementById('wpm-chart');

        this.engine = new AnchorEngine();

        this.words = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.wpm = 300;
        this.chunkSize = 1;
        this.timer = null;

        // Analytics Data
        this.sessionData = [];
        this.sessionStartTime = 0;

        this.init();
    }

    init() {
        // Event Listeners
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());

        this.wpmSlider.addEventListener('input', (e) => {
            this.wpm = parseInt(e.target.value);
            this.wpmValue.textContent = this.wpm;
            if (this.isPlaying) {
                // Restart timer with new speed
                this.stop();
                this.start();
            }
        });

        this.chunkSlider.addEventListener('input', (e) => {
            this.chunkSize = parseInt(e.target.value);
            this.chunkValue.textContent = this.chunkSize;
        });

        this.fontSelect.addEventListener('change', (e) => {
            this.wordDisplay.style.fontFamily = e.target.value;
        });

        this.fontSizeSlider.addEventListener('input', (e) => {
            const size = e.target.value;
            this.fontSizeValue.textContent = size;
            this.wordDisplay.style.fontSize = `${size}px`;
        });

        this.panelToggle.addEventListener('click', () => {
            this.panel.classList.toggle('collapsed');
            document.body.classList.toggle('panel-is-collapsed');
        });

        this.closeReportBtn.addEventListener('click', () => {
            this.reportModal.classList.add('hidden');
        });

        // Parse text whenever input changes (lightweight) or just do it on play
        this.textInput.addEventListener('input', () => {
            // Reset if they change text
            if (!this.isPlaying) {
                this.currentIndex = 0;
                this.engine.reset();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (document.activeElement === this.textInput) return;

            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlay();
            } else if (e.code === 'ArrowRight') {
                this.wpm = Math.min(1000, this.wpm + 50);
                this.updateWPMFromLogic();
            } else if (e.code === 'ArrowLeft') {
                this.wpm = Math.max(60, this.wpm - 50);
                this.updateWPMFromLogic();
            }
        });
    }

    updateWPMFromLogic() {
        this.syncUItoWPM();
        if (this.isPlaying) {
            // Speed change while playing requires loop restart or just wait for next timeout?
            // Actually, for immediate feedback, we restart the timer if speed change is significant.
            // But gradual drift is handled in the loop naturally.
        }
    }

    parseText() {
        const rawText = this.textInput.value.trim();
        if (!rawText) return [];
        return rawText.split(/\s+/).filter(w => w.length > 0);
    }

    togglePlay() {
        if (this.isPlaying) {
            this.stop();
        } else {
            // If we are at the end, restart
            if (this.words.length > 0 && this.currentIndex >= this.words.length) {
                this.currentIndex = 0;
                this.engine.reset();
                this.sessionData = []; // Clear old session data on restart
            }

            // If words array is empty or dirty, re-parse
            const currentText = this.textInput.value.trim();
            if (this.words.length === 0 || this.currentIndex === 0) {
                this.words = this.parseText();
                if (this.words.length === 0) return; // Nothing to read
                this.sessionData = []; // Clear for new text
            }

            this.start();
        }
    }

    start() {
        this.isPlaying = true;
        this.sessionStartTime = Date.now();
        this.updatePlayButton();
        this.runLoop();
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.timer);
        this.updatePlayButton();
    }

    updatePlayButton() {
        if (this.isPlaying) {
            this.playIcon.classList.add('hidden');
            this.pauseIcon.classList.remove('hidden');
        } else {
            this.playIcon.classList.remove('hidden');
            this.pauseIcon.classList.add('hidden');
        }
    }

    runLoop() {
        if (!this.isPlaying) return;

        if (this.currentIndex >= this.words.length) {
            this.stop();
            this.showReport(); // Show visualization on finish
            return;
        }

        const chunk = this.words.slice(this.currentIndex, this.currentIndex + this.chunkSize);
        this.currentIndex += this.chunkSize;

        this.renderChunk(chunk);

        // --- Adaptive Speed Logic (Cognitive Adaptation) ---
        const accelerationRate = 0.5; // WPM increase per word
        this.wpm = Math.min(1200, this.wpm + (accelerationRate * chunk.length));
        this.syncUItoWPM();

        // --- Track Analytics ---
        this.sessionData.push({
            words: chunk.join(' '),
            wpm: Math.round(this.wpm),
            timestamp: Date.now() - this.sessionStartTime
        });

        const msPerWord = 60000 / this.wpm;
        const delay = msPerWord * chunk.length;

        let extraDelay = 0;
        const lastWord = chunk[chunk.length - 1];
        if (lastWord.endsWith('.') || lastWord.endsWith('!') || lastWord.endsWith('?')) {
            extraDelay = msPerWord * 1.5;
        } else if (lastWord.endsWith(',') || lastWord.endsWith(';')) {
            extraDelay = msPerWord * 0.5;
        }

        this.timer = setTimeout(() => {
            this.runLoop();
        }, delay + extraDelay);
    }

    renderChunk(words) {
        const fullString = words.join(' ');
        const { pivotIndex, anchorChar } = this.engine.process(fullString);

        this.wordDisplay.innerHTML = '';

        const leftText = fullString.slice(0, pivotIndex).replace(/ /g, '\u00A0');
        const pivotText = fullString[pivotIndex];
        const rightText = fullString.slice(pivotIndex + 1).replace(/ /g, '\u00A0');

        const leftEl = document.createElement('div');
        leftEl.className = 'part-left';
        leftEl.textContent = leftText;

        const pivotEl = document.createElement('div');
        pivotEl.className = 'part-pivot';
        pivotEl.textContent = pivotText;

        const rightEl = document.createElement('div');
        rightEl.className = 'part-right';
        rightEl.textContent = rightText;

        this.wordDisplay.appendChild(leftEl);
        this.wordDisplay.appendChild(pivotEl);
        this.wordDisplay.appendChild(rightEl);
    }

    syncUItoWPM() {
        this.wpmValue.textContent = Math.round(this.wpm);
        this.wpmSlider.value = this.wpm;
    }

    showReport() {
        this.reportModal.classList.remove('hidden');
        this.renderStats();
        this.renderChart();
        this.renderHeatmap();
    }

    renderStats() {
        if (this.sessionData.length === 0) return;

        const totalWpm = this.sessionData.reduce((acc, curr) => acc + curr.wpm, 0);
        const avgWpm = Math.round(totalWpm / this.sessionData.length);
        const peakWpm = Math.max(...this.sessionData.map(d => d.wpm));
        const totalTime = (this.sessionData[this.sessionData.length - 1].timestamp / 1000).toFixed(1);

        this.avgWpmEl.textContent = avgWpm;
        this.peakWpmEl.textContent = peakWpm;
        this.totalTimeEl.textContent = totalTime;
    }

    renderChart() {
        const ctx = this.chartCanvas.getContext('2d');

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.sessionData.map((_, i) => i + 1),
                datasets: [{
                    label: 'Reading Speed (WPM)',
                    data: this.sessionData.map(d => d.wpm),
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#94a3b8' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        display: false // Hide word indices for cleaner look
                    }
                }
            }
        });
    }

    renderHeatmap() {
        this.heatmapEl.innerHTML = '';
        const maxWpm = Math.max(...this.sessionData.map(d => d.wpm));
        const minWpm = Math.min(...this.sessionData.map(d => d.wpm));

        this.sessionData.forEach(item => {
            const span = document.createElement('span');
            span.textContent = item.words + ' ';
            span.className = 'heatmap-word';

            // Color mapping: Blue (slow) -> Red (fast)
            // Or simpler: Opacity based on speed?
            // Let's do hue rotation: 240 (blue) -> 0 (red)
            const normalized = (item.wpm - minWpm) / (maxWpm - minWpm || 1);
            const hue = 200 - (normalized * 200); // 200 (light blue) to 0 (red)

            span.style.color = `hsl(${hue}, 100%, 70%)`;

            this.heatmapEl.appendChild(span);
        });
    }
}

// Start
new App();
