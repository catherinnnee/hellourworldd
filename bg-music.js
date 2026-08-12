/**
 * Background Music Controller for Portfolio Pages
 * Handles background instrumental audio playback, UI controls, autoplay policy,
 * state persistence (across index.html, informatika.html, bina.html), and audio fallback.
 */

(function () {
    // Standard ambient instrumental audio sources (Royalty-free)
    const AUDIO_SOURCES = [
        "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
        "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=relaxing-mountains-rivers-11075.mp3",
        "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=soft-ambient-18671.mp3"
    ];

    // Local storage keys
    const STORAGE_KEY_PLAYING = "portfolio_bg_music_playing";
    const STORAGE_KEY_TIME = "portfolio_bg_music_time";
    const STORAGE_KEY_VOLUME = "portfolio_bg_music_volume";

    let audio = null;
    let isPlaying = false;
    let currentSourceIndex = 0;
    let audioContext = null;
    let synthInterval = null;
    let isSynthActive = false;

    // Inject Styles for Music Player
    function injectStyles() {
        if (document.getElementById("bg-music-styles")) return;
        const style = document.createElement("style");
        style.id = "bg-music-styles";
        style.textContent = `
            @keyframes spinDisc {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .animate-spin-disc {
                animation: spinDisc 4s linear infinite;
            }
            @keyframes eqBar1 {
                0%, 100% { height: 4px; }
                50% { height: 16px; }
            }
            @keyframes eqBar2 {
                0%, 100% { height: 16px; }
                50% { height: 6px; }
            }
            @keyframes eqBar3 {
                0%, 100% { height: 8px; }
                50% { height: 18px; }
            }
            .eq-bar-1 { animation: eqBar1 0.8s ease-in-out infinite; }
            .eq-bar-2 { animation: eqBar2 0.7s ease-in-out infinite 0.15s; }
            .eq-bar-3 { animation: eqBar3 0.9s ease-in-out infinite 0.3s; }
            .music-glow {
                box-shadow: 0 0 15px rgba(66, 160, 111, 0.4);
            }
        `;
        document.head.appendChild(style);
    }

    // Create & Inject Floating Music Player UI
    function createMusicPlayerUI() {
        if (document.getElementById("bg-music-widget")) return;

        const widget = document.createElement("div");
        widget.id = "bg-music-widget";
        widget.className = "fixed bottom-5 right-5 z-50 flex items-center";

        widget.innerHTML = `
            <!-- Floating Player Pill -->
            <div id="music-pill" class="glass rounded-full px-3 py-2 flex items-center gap-2.5 shadow-lg border border-sage-200/50 backdrop-blur-md transition-all duration-300 hover:scale-105">
                
                <!-- Rotating Vinyl Disc / Icon Button -->
                <button id="music-main-btn" title="Putar/Jeda Musik Background" class="w-10 h-10 rounded-full bg-sage-500 hover:bg-sage-600 text-white flex items-center justify-center shadow-md transition-transform relative overflow-hidden group">
                    <i id="music-disc-icon" class="fa-solid fa-compact-disc text-xl transition-all"></i>
                    <i id="music-play-overlay" class="fa-solid fa-play text-xs absolute hidden group-hover:block"></i>
                </button>

                <!-- Music Info & Equalizer -->
                <div id="music-info" class="flex flex-col pr-1 cursor-pointer select-none min-w-[110px] sm:min-w-[130px]">
                    <div class="flex items-center justify-between gap-1">
                        <span class="text-[11px] font-bold text-sage-800 dark:text-sage-300 tracking-wide uppercase">Instrumental</span>
                        <!-- Equalizer Animation Bars -->
                        <div id="music-eq" class="hidden flex items-end gap-0.5 h-4">
                            <span class="w-1 bg-sage-500 rounded-full eq-bar-1"></span>
                            <span class="w-1 bg-sage-500 rounded-full eq-bar-2"></span>
                            <span class="w-1 bg-sage-500 rounded-full eq-bar-3"></span>
                        </div>
                    </div>
                    <span id="music-status-text" class="text-xs text-gray-600 dark:text-gray-300 font-semibold truncate max-w-[110px] sm:max-w-[140px]">
                        Klik untuk Putar 🎵
                    </span>
                </div>

                <!-- Expanded Controls (Volume & Prev/Next) -->
                <div id="music-controls" class="flex items-center gap-2 border-l border-sage-200 dark:border-gray-700 pl-2 ml-1">
                    <button id="music-mute-btn" title="Mute / Unmute" class="text-sage-700 dark:text-sage-300 hover:text-sage-500 text-sm p-1 transition-colors">
                        <i id="music-volume-icon" class="fa-solid fa-volume-high"></i>
                    </button>
                    <input id="music-volume-slider" type="range" min="0" max="1" step="0.01" value="0.3" 
                           title="Volume Musik" 
                           class="w-14 sm:w-18 accent-sage-500 cursor-pointer h-1.5 bg-sage-200 rounded-lg appearance-none">
                </div>
            </div>

            <!-- Autoplay Prompt Toast (Shown if browser blocks autoplay) -->
            <div id="music-prompt-toast" class="hidden absolute bottom-14 right-0 glass px-3.5 py-2 rounded-xl text-xs font-semibold text-sage-800 dark:text-sage-200 shadow-xl border border-sage-300/40 whitespace-nowrap animate-bounce flex items-center gap-2">
                <i class="fa-solid fa-music text-sage-500"></i>
                <span>Klik di mana saja untuk memutar musik 🎵</span>
            </div>
        `;

        document.body.appendChild(widget);
        bindEvents();
    }

    // Synthesize Soft Ambient Chill Chords via Web Audio API (Fallback if audio file network fails)
    function startSynthFallback() {
        if (isSynthActive) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            audioContext = new AudioContext();
            isSynthActive = true;

            const notes = [261.63, 329.63, 392.00, 493.88, 523.25]; // C major 7th chord notes (C4, E4, G4, B4, C5)
            let noteIdx = 0;

            function playPadNote() {
                if (!isSynthActive || !isPlaying) return;
                try {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();

                    osc.type = "sine";
                    osc.frequency.value = notes[noteIdx % notes.length];
                    noteIdx++;

                    const vol = parseFloat(localStorage.getItem(STORAGE_KEY_VOLUME) || "0.3") * 0.15;
                    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
                    gain.gain.exponentialRampToValueAtTime(Math.max(vol, 0.001), audioContext.currentTime + 1.5);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 3.8);

                    osc.connect(gain);
                    gain.connect(audioContext.destination);

                    osc.start();
                    osc.stop(audioContext.currentTime + 4);
                } catch (e) {
                    console.warn("Synth pad note error:", e);
                }
            }

            playPadNote();
            synthInterval = setInterval(playPadNote, 2500);
        } catch (e) {
            console.warn("Web Audio Synth Fallback not supported:", e);
        }
    }

    function stopSynthFallback() {
        isSynthActive = false;
        if (synthInterval) clearInterval(synthInterval);
        if (audioContext) {
            audioContext.close().catch(() => { });
            audioContext = null;
        }
    }

    // Initialize Audio Element
    function initAudio() {
        audio = new Audio();
        audio.loop = true;
        audio.preload = "auto";

        const savedVol = parseFloat(localStorage.getItem(STORAGE_KEY_VOLUME) || "0.3");
        audio.volume = savedVol;

        const slider = document.getElementById("music-volume-slider");
        if (slider) slider.value = savedVol;

        // Try sources sequentially if load fails
        audio.src = AUDIO_SOURCES[currentSourceIndex];

        audio.addEventListener("error", function () {
            console.warn("Audio source failed to load, trying next source...");
            currentSourceIndex = (currentSourceIndex + 1) % AUDIO_SOURCES.length;
            if (currentSourceIndex < AUDIO_SOURCES.length) {
                audio.src = AUDIO_SOURCES[currentSourceIndex];
                if (isPlaying) audio.play().catch(() => startSynthFallback());
            } else {
                startSynthFallback();
            }
        });

        // Save position periodically
        audio.addEventListener("timeupdate", function () {
            if (audio.currentTime > 0) {
                localStorage.setItem(STORAGE_KEY_TIME, audio.currentTime.toString());
            }
        });
    }

    // Update UI Representation
    function updateUI(playing) {
        const discIcon = document.getElementById("music-disc-icon");
        const statusText = document.getElementById("music-status-text");
        const eqBars = document.getElementById("music-eq");
        const pill = document.getElementById("music-pill");
        const toast = document.getElementById("music-prompt-toast");

        if (playing) {
            if (discIcon) {
                discIcon.classList.add("animate-spin-disc");
                discIcon.classList.remove("fa-compact-disc");
                discIcon.classList.add("fa-music");
            }
            if (statusText) statusText.textContent = "Sedang Memutar 🎶";
            if (eqBars) eqBars.classList.remove("hidden");
            if (pill) pill.classList.add("music-glow");
            if (toast) toast.classList.add("hidden");
        } else {
            if (discIcon) {
                discIcon.classList.remove("animate-spin-disc");
                discIcon.classList.remove("fa-music");
                discIcon.classList.add("fa-compact-disc");
            }
            if (statusText) statusText.textContent = "Musik Dijeda ⏸️";
            if (eqBars) eqBars.classList.add("hidden");
            if (pill) pill.classList.remove("music-glow");
        }
    }

    // Toggle Play/Pause
    function togglePlay() {
        if (!audio) initAudio();

        if (isPlaying) {
            audio.pause();
            stopSynthFallback();
            isPlaying = false;
            localStorage.setItem(STORAGE_KEY_PLAYING, "false");
            updateUI(false);
        } else {
            // Restore saved time if available
            const savedTime = parseFloat(localStorage.getItem(STORAGE_KEY_TIME) || "0");
            if (savedTime && audio.currentTime === 0) {
                audio.currentTime = savedTime;
            }

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        isPlaying = true;
                        localStorage.setItem(STORAGE_KEY_PLAYING, "true");
                        updateUI(true);
                    })
                    .catch((err) => {
                        console.warn("Audio play blocked by browser, attempting synth fallback...", err);
                        startSynthFallback();
                        isPlaying = true;
                        localStorage.setItem(STORAGE_KEY_PLAYING, "true");
                        updateUI(true);
                    });
            }
        }
    }

    // Bind Event Listeners
    function bindEvents() {
        const mainBtn = document.getElementById("music-main-btn");
        const infoDiv = document.getElementById("music-info");
        const muteBtn = document.getElementById("music-mute-btn");
        const slider = document.getElementById("music-volume-slider");
        const volumeIcon = document.getElementById("music-volume-icon");

        if (mainBtn) mainBtn.addEventListener("click", togglePlay);
        if (infoDiv) infoDiv.addEventListener("click", togglePlay);

        if (muteBtn && slider) {
            let lastVol = 0.3;
            muteBtn.addEventListener("click", () => {
                if (audio.volume > 0) {
                    lastVol = audio.volume;
                    audio.volume = 0;
                    slider.value = 0;
                    volumeIcon.className = "fa-solid fa-volume-xmark text-red-400";
                } else {
                    audio.volume = lastVol || 0.3;
                    slider.value = audio.volume;
                    volumeIcon.className = "fa-solid fa-volume-high";
                }
                localStorage.setItem(STORAGE_KEY_VOLUME, audio.volume.toString());
            });

            slider.addEventListener("input", (e) => {
                const vol = parseFloat(e.target.value);
                if (audio) audio.volume = vol;
                localStorage.setItem(STORAGE_KEY_VOLUME, vol.toString());
                if (vol === 0) {
                    volumeIcon.className = "fa-solid fa-volume-xmark text-red-400";
                } else if (vol < 0.5) {
                    volumeIcon.className = "fa-solid fa-volume-low";
                } else {
                    volumeIcon.className = "fa-solid fa-volume-high";
                }
            });
        }

        // Global User Interaction Listener (for modern browser autoplay policy compliance)
        function handleFirstInteraction() {
            const wasPlaying = localStorage.getItem(STORAGE_KEY_PLAYING);
            // Default to true on first visit or if user previously left it playing
            if (wasPlaying === null || wasPlaying === "true") {
                if (!isPlaying && audio) {
                    const savedTime = parseFloat(localStorage.getItem(STORAGE_KEY_TIME) || "0");
                    if (savedTime && audio.currentTime === 0) audio.currentTime = savedTime;

                    audio.play().then(() => {
                        isPlaying = true;
                        localStorage.setItem(STORAGE_KEY_PLAYING, "true");
                        updateUI(true);
                    }).catch(() => {
                        // If still blocked, user can click the music button directly
                    });
                }
            }
            window.removeEventListener("click", handleFirstInteraction);
            window.removeEventListener("touchstart", handleFirstInteraction);
            window.removeEventListener("keydown", handleFirstInteraction);
        }

        window.addEventListener("click", handleFirstInteraction);
        window.addEventListener("touchstart", handleFirstInteraction);
        window.addEventListener("keydown", handleFirstInteraction);
    }

    // Auto Start / Restore State on DOM Ready
    function init() {
        injectStyles();
        createMusicPlayerUI();
        initAudio();

        const wasPlaying = localStorage.getItem(STORAGE_KEY_PLAYING);
        const toast = document.getElementById("music-prompt-toast");

        // Attempt autoplay on page load
        if (wasPlaying === null || wasPlaying === "true") {
            const savedTime = parseFloat(localStorage.getItem(STORAGE_KEY_TIME) || "0");
            if (savedTime) audio.currentTime = savedTime;

            const promise = audio.play();
            if (promise !== undefined) {
                promise
                    .then(() => {
                        isPlaying = true;
                        localStorage.setItem(STORAGE_KEY_PLAYING, "true");
                        updateUI(true);
                    })
                    .catch(() => {
                        // Autoplay blocked by browser policy until user click/touch
                        isPlaying = false;
                        updateUI(false);
                        if (toast) toast.classList.remove("hidden");
                    });
            }
        } else {
            isPlaying = false;
            updateUI(false);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
