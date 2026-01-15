import { AnchorEngine } from './urp.js';

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

        this.wordDisplay = document.getElementById('word-display');

        this.engine = new AnchorEngine();

        this.words = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.wpm = 300;
        this.chunkSize = 1;
        this.timer = null;

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
            if (e.code === 'Space' && document.activeElement !== this.textInput) {
                e.preventDefault(); // Prevent scrolling
                this.togglePlay();
            }
        });
    }

    parseText() {
        const rawText = this.textInput.value.trim();
        if (!rawText) return [];
        // Simple split by whitespace
        // We could do smarter chunking here later
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
            }

            // If words array is empty or dirty, re-parse
            const currentText = this.textInput.value.trim();
            // A simple check: if we have no words, definitely parse. 
            // If we have words but index is 0, maybe re-parse to be safe.
            if (this.words.length === 0 || this.currentIndex === 0) {
                this.words = this.parseText();
                if (this.words.length === 0) return; // Nothing to read
            }

            this.start();
        }
    }

    start() {
        this.isPlaying = true;
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
            return;
        }

        // Get the next chunk
        // Currently enforcing chunkSize = 1 for better anchoring effect logic
        // But handling multiple words is possible if we treat them as a "unit"
        const chunk = this.words.slice(this.currentIndex, this.currentIndex + this.chunkSize);
        this.currentIndex += this.chunkSize;

        // Render this chunk
        this.renderChunk(chunk);

        // Calculate delay
        // 60000 ms / WPM = ms per word
        const msPerWord = 60000 / this.wpm;
        const delay = msPerWord * chunk.length;

        // Adjust for punctuation? (Basic pause effect)
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
        // Handle single word primarily for anchoring logic
        const fullString = words.join(' ');

        // Calculate anchor
        const { pivotIndex, anchorChar } = this.engine.process(fullString);

        // Clear current content
        this.wordDisplay.innerHTML = '';

        // Split string
        const leftText = fullString.slice(0, pivotIndex).replace(/ /g, '\u00A0');
        const pivotText = fullString[pivotIndex];
        const rightText = fullString.slice(pivotIndex + 1).replace(/ /g, '\u00A0');

        // Create Grid Elements
        const leftEl = document.createElement('div');
        leftEl.className = 'part-left';
        leftEl.textContent = leftText;

        const pivotEl = document.createElement('div');
        pivotEl.className = 'part-pivot';
        pivotEl.textContent = pivotText;

        const rightEl = document.createElement('div');
        rightEl.className = 'part-right';
        rightEl.textContent = rightText;

        // Append to Grid
        this.wordDisplay.appendChild(leftEl);
        this.wordDisplay.appendChild(pivotEl);
        this.wordDisplay.appendChild(rightEl);

        // NO JS Calculation for alignment needed anymore!
        // CSS Grid handles it.
    }
}

// Start
new App();
