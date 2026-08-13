/**
 * Spotify & Background Music Controller for Portfolio Pages
 * Connects with Spotify Embed API, allows visitors to pick custom Spotify songs/playlists,
 * select curated Spotify presets, paste Spotify links, and persist choice across pages.
 */

(function () {
      const STORAGE_KEY_SPOTIFY_URL = "portfolio_spotify_embed_url";
    const STORAGE_KEY_SPOTIFY_TITLE = "portfolio_spotify_title";
    // Spotify Curated Presets
    const SPOTIFY_PRESETS = [
        {
            name: "Lofi Study Beats ☕",
            desc: "Musik santai untuk fokus & belajar",
            url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX8Ueb1Hostx3?utm_source=generator&theme=0",
            badge: "Lofi"
        },
        {
            name: "Chill Hits 🌿",
            desc: "Lagu santai terpopuler",
            url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4WYpdgoIcn6?utm_source=generator&theme=0",
            badge: "Chill"
        },
        {
            name: "Peaceful Piano 🎹",
            desc: "Alunan piano lembut & menenangkan",
            url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO?utm_source=generator&theme=0",
            badge: "Piano"
        },
        {
            name: "Pop Hits Indonesia 🇮🇩",
            desc: "Lagu-lagu hits Indonesia pilihan",
            url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX0aDkgm6v0tN?utm_source=generator&theme=0",
            badge: "Pop Indo"
        },
        {
            name: "Deep Focus ⚡",
            desc: "Ambient & synthwave produktif",
            url: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0",
            badge: "Focus"
        },
        {
            name: "Jazzy Romance 🎷",
            desc: "Alunan jazz manis & hangat",
            url: "https://open.spotify.com/embed/playlist/37i9dQZF1DXbITWG1ZJKYt?utm_source=generator&theme=0",
            badge: "Jazz"
        }
    ];

     let currentSpotifyUrl = localStorage.getItem(STORAGE_KEY_SPOTIFY_URL) || SPOTIFY_PRESETS[0].url;
    let currentSpotifyTitle = localStorage.getItem(STORAGE_KEY_SPOTIFY_TITLE) || SPOTIFY_PRESETS[0].name;

 // Inject Styles for Music Player & Spotify Modal
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
             .spotify-glow {
                box-shadow: 0 0 20px rgba(29, 185, 84, 0.45);
            }
            .spotify-bg-gradient {
                background: linear-gradient(135deg, #121212 0%, #191414 50%, #0d2818 100%);
            }
            /* Custom Scrollbar for Spotify Drawer */
            .spotify-scroll::-webkit-scrollbar {
                width: 6px;
            }
            .spotify-scroll::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
            }
            .spotify-scroll::-webkit-scrollbar-thumb {
                background: #1DB954;
                border-radius: 8px;
            }
        `;
        document.head.appendChild(style);
    }

     // Helper: Parse Spotify URL / URI to Embed URL
    function formatSpotifyEmbedUrl(inputUrl) {
        if (!inputUrl) return null;
        let url = inputUrl.trim();
        // Handle spotify:type:id
        if (url.startsWith('spotify:')) {
            const parts = url.split(':');
            if (parts.length >= 3) {
                return `https://open.spotify.com/embed/${parts[1]}/${parts[2]}?utm_source=generator&theme=0`;
            }
        }
        // Handle https://open.spotify.com/...
        try {
            const match = url.match(/spotify\.com\/(?:embed\/)?(track|playlist|album|artist)\/([a-zA-Z0-9]+)/);
            if (match && match[1] && match[2]) {
                return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
            }
        } catch (e) { }
        return null;
    }
    // Create & Inject Floating Spotify Widget + Modal
    function createMusicPlayerUI() {
        if (document.getElementById("bg-music-widget")) return;

        const widget = document.createElement("div");
        widget.id = "bg-music-widget";
       widget.className = "fixed bottom-5 right-5 z-50 flex items-center select-none";

        widget.innerHTML = `
                      <!-- Floating Spotify Control Pill -->
            <div id="music-pill" class="glass rounded-full px-3.5 py-2 flex items-center gap-3 shadow-2xl border border-emerald-400/40 backdrop-blur-xl transition-all duration-300 hover:scale-105 bg-black/75 text-white cursor-pointer spotify-glow" onclick="toggleSpotifyModal()">

              <!-- Spotify Icon Button -->
                <div class="w-10 h-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-lg font-black text-xl flex-shrink-0 animate-pulse">
                    <i class="fa-brands fa-spotify"></i>
                </div>

                      <!-- Info Track / Playlist -->
                <div class="flex flex-col pr-1 min-w-[120px] max-w-[160px]">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[10px] font-black text-[#1DB954] tracking-wider uppercase flex items-center gap-1">
                            Spotify Music
                        </span>
                        <!-- Equalizer Animation -->
                        <div class="flex items-end gap-0.5 h-3">
                            <span class="w-0.5 bg-[#1DB954] rounded-full eq-bar-1"></span>
                            <span class="w-0.5 bg-[#1DB954] rounded-full eq-bar-2"></span>
                            <span class="w-0.5 bg-[#1DB954] rounded-full eq-bar-3"></span>
                        </div>
                    </div>
                   <span id="music-status-text" class="text-xs text-gray-200 font-bold truncate">
                        ${escapeHTML(currentSpotifyTitle)}
                    </span>
                </div>

               <!-- Change Song Button -->
                <button title="Pilih / Cari Lagu Spotify" class="bg-white/10 hover:bg-[#1DB954] hover:text-black text-white text-xs px-2.5 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 border border-white/10">
                    <i class="fa-solid fa-sliders"></i> <span class="hidden sm:inline">Pilih Lagu</span>
                </button>
            </div>

             <!-- Change Song Button -->
                <button title="Pilih / Cari Lagu Spotify" class="bg-white/10 hover:bg-[#1DB954] hover:text-black text-white text-xs px-2.5 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 border border-white/10">
                    <i class="fa-solid fa-sliders"></i> <span class="hidden sm:inline">Pilih Lagu</span>
                </button>
                      <!-- Scrollable Modal Content -->
                    <div class="spotify-scroll overflow-y-auto flex-grow pr-1 space-y-5">
                        
                        <!-- Embedded Spotify Player Frame -->
                        <div class="bg-black/60 rounded-2xl p-2 border border-white/10 shadow-inner">
                            <iframe id="spotify-iframe"
                                    src="${currentSpotifyUrl}"
                                    width="100%" 
                                    height="152" 
                                    frameborder="0" 
                                    allowfullscreen="" 
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                    loading="lazy"
                                    class="rounded-xl shadow-md">
                            </iframe>
                        </div>

      <!-- Custom Spotify Link Input -->
                        <div class="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <label class="block text-xs font-bold text-[#1DB954] mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                                <i class="fa-solid fa-link"></i> Putar Lagu / Playlist Spotify Anda
                            </label>
                            <div class="flex gap-2">
                                <input id="spotify-custom-input" 
                                       type="text" 
                                       placeholder="Paste link Spotify (contoh: https://open.spotify.com/track/...)" 
                                       class="flex-grow bg-black/50 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/20 focus:outline-none focus:border-[#1DB954] placeholder-gray-500">
                                <button onclick="loadCustomSpotifyUrl()" 
                                        class="bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition-transform active:scale-95 shadow-md flex items-center gap-1 flex-shrink-0">
                                    <i class="fa-solid fa-play"></i> Putar
                                </button>
                            </div>
                            <p id="spotify-input-error" class="text-[11px] text-rose-400 mt-1.5 hidden font-medium">Link Spotify tidak valid. Harap gunakan format link Spotify yang benar.</p>
                        </div>

                         <!-- Curated Preset Playlists -->
                        <div>
                            <h4 class="text-xs font-bold text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <i class="fa-solid fa-compact-disc text-[#1DB954]"></i> Rekomendasi Playlist Mood
                            </h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                ${SPOTIFY_PRESETS.map((preset, idx) => `
                                    <button onclick="selectSpotifyPreset(${idx})" 
                                            class="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-[#1DB954]/20 hover:border-[#1DB954]/60 border border-white/10 text-left transition-all group cursor-pointer">
                                        <div class="w-10 h-10 rounded-xl bg-[#1DB954]/20 group-hover:bg-[#1DB954] text-[#1DB954] group-hover:text-black flex items-center justify-center text-lg font-bold flex-shrink-0 transition-colors">
                                            <i class="fa-solid fa-music"></i>
                                        </div>
                                        <div class="overflow-hidden">
                                            <div class="flex items-center justify-between gap-1">
                                                <p class="text-xs font-bold text-white group-hover:text-[#1DB954] truncate transition-colors">${escapeHTML(preset.name)}</p>
                                            </div>
                                            <p class="text-[10px] text-gray-400 truncate mt-0.5">${escapeHTML(preset.desc)}</p>
                                        </div>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
       </div>
                     <!-- Footer -->
                    <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                        <span>💡 Musik tersimpan otomatis saat berpindah halaman</span>
                        <button onclick="toggleSpotifyModal()" class="text-xs font-bold text-[#1DB954] hover:underline">
                            Tutup
                        </button>
                    </div>

                   </div>
            </div>
        `;
                  document.body.appendChild(widget);
    }



     // Toggle Modal Visibility
    window.toggleSpotifyModal = function () {
        const modal = document.getElementById("spotify-modal");
        if (modal) {
            modal.classList.toggle("hidden");
        }
    };

    // Load Custom Spotify Link from Input
    window.loadCustomSpotifyUrl = function () {
        const input = document.getElementById("spotify-custom-input");
        const errorEl = document.getElementById("spotify-input-error");
        if (!input) return;
        
       const embedUrl = formatSpotifyEmbedUrl(input.value);
        if (embedUrl) {
            if (errorEl) errorEl.classList.add("hidden");
            const title = "Custom Spotify Music 🎵";
            updateSpotifyPlayer(embedUrl, title);
            input.value = "";
            toggleSpotifyModal();
        } else {
            if (errorEl) errorEl.classList.remove("hidden");
        }
    };

      // Select Curated Preset
    window.selectSpotifyPreset = function (index) {
        const preset = SPOTIFY_PRESETS[index];
        if (!preset) return;
        updateSpotifyPlayer(preset.url, preset.name);
        toggleSpotifyModal();
    };
         // Update Player & Persist
    function updateSpotifyPlayer(url, title) {
        currentSpotifyUrl = url;
        currentSpotifyTitle = title;
        localStorage.setItem(STORAGE_KEY_SPOTIFY_URL, url);
        localStorage.setItem(STORAGE_KEY_SPOTIFY_TITLE, title);

          const iframe = document.getElementById("spotify-iframe");
        if (iframe) iframe.src = url;
      
        const statusText = document.getElementById("music-status-text");
          if (statusText) statusText.innerText = title;
     
    }

    // Escape HTML Helper
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#
               
    }

// Init function
    function init() {
        injectStyles();
        createMusicPlayerUI();
      
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
