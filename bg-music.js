/**
 * Spotify & Background Music Controller for Portfolio Pages
 * Connects with Spotify Embed API, supports Live Spotify Music Search, Spotify Account connection,
 * and Saved Music Library (persisted in localStorage across index.html, informatika.html, bina.html).
 */

(function () {
    const STORAGE_KEY_SPOTIFY_URL = "portfolio_spotify_embed_url";
    const STORAGE_KEY_SPOTIFY_TITLE = "portfolio_spotify_title";
    const STORAGE_KEY_SPOTIFY_SAVED = "portfolio_spotify_saved_library";
    const STORAGE_KEY_SPOTIFY_ACCOUNT = "portfolio_spotify_user_account";

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
    let savedLibrary = [];
    try {
        savedLibrary = JSON.parse(localStorage.getItem(STORAGE_KEY_SPOTIFY_SAVED) || "[]");
    } catch (e) {
        savedLibrary = [];
    }
    let userAccount = localStorage.getItem(STORAGE_KEY_SPOTIFY_ACCOUNT) || "";

    // Inject Custom Styles for Music Player & Spotify Drawer
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
                box-shadow: 0 0 22px rgba(29, 185, 84, 0.45);
            }
            .spotify-bg-gradient {
                background: linear-gradient(135deg, #121212 0%, #191414 50%, #0d2818 100%);
            }
            .spotify-tab-btn {
                transition: all 0.2s ease;
                border-bottom: 2px solid transparent;
            }
            .spotify-tab-btn.active {
                color: #1DB954;
                border-bottom-color: #1DB954;
                font-weight: 800;
            }
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

    // Helper: Format Spotify Embed URL
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

    // Get Web / Mobile Spotify Direct Link
    function getSpotifyDirectUrl(embedUrl) {
        if (!embedUrl) return "https://open.spotify.com";
        try {
            const match = embedUrl.match(/spotify\.com\/embed\/(track|playlist|album|artist)\/([a-zA-Z0-9]+)/);
            if (match && match[1] && match[2]) {
                return `https://open.spotify.com/${match[1]}/${match[2]}`;
            }
        } catch (e) { }
        return embedUrl.replace('/embed', '');
    }

    // Create & Inject Floating Spotify Widget + Modal
    function createMusicPlayerUI() {
        if (document.getElementById("bg-music-widget")) return;

        const widget = document.createElement("div");
        widget.id = "bg-music-widget";
        widget.className = "fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 flex items-center select-none";

        widget.innerHTML = `
            <!-- Floating Spotify Control Pill -->
            <div id="music-pill" class="glass rounded-full px-3 sm:px-3.5 py-2 flex items-center gap-2.5 sm:gap-3 shadow-2xl border border-emerald-400/40 backdrop-blur-xl transition-all duration-300 hover:scale-105 bg-black/80 text-white cursor-pointer spotify-glow" onclick="toggleSpotifyModal()">
                
                <!-- Spotify Icon Button -->
                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-lg font-black text-lg sm:text-xl flex-shrink-0 animate-pulse">
                    <i class="fa-brands fa-spotify"></i>
                </div>

                <!-- Info Track / Playlist -->
                <div class="flex flex-col pr-1 min-w-[100px] max-w-[140px] sm:max-w-[160px]">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[9px] sm:text-[10px] font-black text-[#1DB954] tracking-wider uppercase flex items-center gap-1">
                            Spotify Music
                        </span>
                        <!-- Equalizer Animation -->
                        <div class="flex items-end gap-0.5 h-3">
                            <span class="w-0.5 bg-[#1DB954] rounded-full eq-bar-1"></span>
                            <span class="w-0.5 bg-[#1DB954] rounded-full eq-bar-2"></span>
                            <span class="w-0.5 bg-[#1DB954] rounded-full eq-bar-3"></span>
                        </div>
                    </div>
                    <span id="music-status-text" class="text-xs text-gray-100 font-bold truncate">
                        ${escapeHTML(currentSpotifyTitle)}
                    </span>
                </div>

                <!-- Action Button -->
                <button title="Cari & Putar Musik Spotify" class="bg-white/10 hover:bg-[#1DB954] hover:text-black text-white text-xs px-2.5 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 border border-white/10">
                    <i class="fa-solid fa-magnifying-glass text-[11px]"></i> <span class="hidden sm:inline">Cari Musik</span>
                </button>
            </div>

            <!-- Spotify Modal Drawer -->
            <div id="spotify-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
                <div class="spotify-bg-gradient rounded-3xl p-4 sm:p-6 max-w-xl w-full shadow-2xl border border-[#1DB954]/40 relative text-white max-h-[92vh] flex flex-col overflow-hidden animate-fade-in-up">
                    
                    <!-- Modal Header -->
                    <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#1DB954] text-black flex items-center justify-center text-xl sm:text-2xl font-black shadow-lg">
                                <i class="fa-brands fa-spotify"></i>
                            </div>
                            <div>
                                <h3 class="text-base sm:text-lg font-black font-playfair text-white flex items-center gap-2 leading-tight">
                                    Spotify Player & Live Search 🎵
                                </h3>
                                <p class="text-[11px] sm:text-xs text-gray-400">Cari lagu, sambungkan akun, atau pilih playlist favoritmu!</p>
                            </div>
                        </div>
                        <button onclick="toggleSpotifyModal()" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-red-500 hover:text-white flex items-center justify-center text-gray-300 transition-all text-sm">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <!-- Navigation Tabs -->
                    <div class="flex items-center justify-around border-b border-white/10 mb-4 text-xs font-bold text-gray-400">
                        <button id="tab-btn-search" class="spotify-tab-btn active pb-2 flex items-center gap-1.5" onclick="switchSpotifyTab('search')">
                            <i class="fa-solid fa-magnifying-glass text-[#1DB954]"></i> Cari Musik
                        </button>
                        <button id="tab-btn-presets" class="spotify-tab-btn pb-2 flex items-center gap-1.5" onclick="switchSpotifyTab('presets')">
                            <i class="fa-solid fa-compact-disc"></i> Playlist Mood
                        </button>
                        <button id="tab-btn-saved" class="spotify-tab-btn pb-2 flex items-center gap-1.5" onclick="switchSpotifyTab('saved')">
                            <i class="fa-solid fa-heart text-rose-400"></i> Favorit & Akun
                        </button>
                        <button id="tab-btn-link" class="spotify-tab-btn pb-2 flex items-center gap-1.5" onclick="switchSpotifyTab('link')">
                            <i class="fa-solid fa-link"></i> Link Kustom
                        </button>
                    </div>

                    <!-- Scrollable Modal Content -->
                    <div class="spotify-scroll overflow-y-auto flex-grow pr-1 space-y-4">
                        
                        <!-- Embedded Spotify Player Frame -->
                        <div class="bg-black/70 rounded-2xl p-2 border border-white/15 shadow-inner">
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
                            <div class="flex items-center justify-between px-2 pt-2 text-[11px] text-gray-300">
                                <span class="flex items-center gap-1 font-semibold text-emerald-400 truncate max-w-[240px]" id="current-playing-title-label">
                                    <i class="fa-solid fa-music"></i> ${escapeHTML(currentSpotifyTitle)}
                                </span>
                                <div class="flex items-center gap-2">
                                    <button onclick="saveActiveTrackToLibrary()" title="Simpan Lagu Ini ke Favorit" class="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold transition-all flex items-center gap-1">
                                        <i class="fa-solid fa-heart"></i> Simpan
                                    </button>
                                    <a id="spotify-open-app-link" href="${getSpotifyDirectUrl(currentSpotifyUrl)}" target="_blank" class="px-2.5 py-1 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold transition-all flex items-center gap-1">
                                        <i class="fa-brands fa-spotify"></i> Buka App
                                    </a>
                                </div>
                            </div>
                        </div>

                        <!-- TAB 1: CARI MUSIK LIVE -->
                        <div id="tab-content-search" class="space-y-3">
                            <div class="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                                <label class="block text-xs font-bold text-[#1DB954] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                    <i class="fa-solid fa-magnifying-glass"></i> Cari Lagu / Penyanyi / Album Spotify
                                </label>
                                <div class="flex gap-2">
                                    <input id="spotify-search-input" 
                                           type="text" 
                                           placeholder="Ketik lagu atau nama artis (contoh: Nadhif, Taylor Swift, Judika)..." 
                                           onkeyup="handleSearchKeyPress(event)"
                                           class="flex-grow bg-black/60 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/20 focus:outline-none focus:border-[#1DB954] placeholder-gray-400">
                                    <button onclick="performSpotifySearch()" 
                                            class="bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition-transform active:scale-95 shadow-md flex items-center gap-1 flex-shrink-0">
                                        <i class="fa-solid fa-search"></i> Cari
                                    </button>
                                </div>
                            </div>

                            <!-- Search Results Container -->
                            <div id="spotify-search-results" class="space-y-2">
                                <p class="text-xs text-gray-400 italic text-center py-4">Ketik judul lagu atau penyanyi favoritmu di atas lalu tekan **Cari**! 🎧</p>
                            </div>
                        </div>

                        <!-- TAB 2: REKOMENDASI PRESETS -->
                        <div id="tab-content-presets" class="hidden">
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
                                            <p class="text-xs font-bold text-white group-hover:text-[#1DB954] truncate transition-colors">${escapeHTML(preset.name)}</p>
                                            <p class="text-[10px] text-gray-400 truncate mt-0.5">${escapeHTML(preset.desc)}</p>
                                        </div>
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- TAB 3: FAVORIT & AKUN SAYA -->
                        <div id="tab-content-saved" class="hidden space-y-4">
                            <!-- Link Akun Spotify -->
                            <div class="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                                <label class="block text-xs font-bold text-[#1DB954] mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                                    <i class="fa-solid fa-user-check"></i> Sambungkan Akun / Profil Spotify Anda
                                </label>
                                <div class="flex gap-2">
                                    <input id="spotify-account-input" 
                                           type="text" 
                                           value="${escapeHTML(userAccount)}"
                                           placeholder="Link Profil / Playlist Spotify Anda (https://open.spotify.com/user/...)" 
                                           class="flex-grow bg-black/60 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/20 focus:outline-none focus:border-[#1DB954] placeholder-gray-400">
                                    <button onclick="saveSpotifyAccountLink()" 
                                            class="bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition-transform active:scale-95 shadow-md flex items-center gap-1 flex-shrink-0">
                                        <i class="fa-solid fa-floppy-disk"></i> Simpan
                                    </button>
                                </div>
                                <div id="spotify-account-status" class="mt-2 text-[11px] text-emerald-400 font-medium ${userAccount ? '' : 'hidden'}">
                                    <i class="fa-solid fa-circle-check"></i> Akun Spotify terhubung: <a href="${escapeHTML(userAccount)}" target="_blank" class="underline text-white font-bold">${escapeHTML(userAccount)}</a>
                                </div>
                            </div>

                            <!-- Daftar Lagu Tersimpan -->
                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <h4 class="text-xs font-bold text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                                        <i class="fa-solid fa-heart text-rose-400"></i> Lagu & Playlist Favorit Saya
                                    </h4>
                                    <span class="text-[10px] text-gray-400" id="saved-count-badge">${savedLibrary.length} Tersimpan</span>
                                </div>
                                <div id="saved-library-list" class="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    <!-- Rendered dynamically -->
                                </div>
                            </div>
                        </div>

                        <!-- TAB 4: INPUT LINK KUSTOM -->
                        <div id="tab-content-link" class="hidden">
                            <div class="bg-white/5 p-4 rounded-2xl border border-white/10">
                                <label class="block text-xs font-bold text-[#1DB954] mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                                    <i class="fa-solid fa-link"></i> Putar Link / URI Spotify Mana Saja
                                </label>
                                <div class="flex gap-2">
                                    <input id="spotify-custom-input" 
                                           type="text" 
                                           placeholder="Paste link Spotify (contoh: https://open.spotify.com/track/...)" 
                                           class="flex-grow bg-black/60 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/20 focus:outline-none focus:border-[#1DB954] placeholder-gray-400">
                                    <button onclick="loadCustomSpotifyUrl()" 
                                            class="bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition-transform active:scale-95 shadow-md flex items-center gap-1 flex-shrink-0">
                                        <i class="fa-solid fa-play"></i> Putar
                                    </button>
                                </div>
                                <p id="spotify-input-error" class="text-[11px] text-rose-400 mt-1.5 hidden font-medium">Link Spotify tidak valid. Harap gunakan format link Spotify yang benar.</p>
                            </div>
                        </div>

                    </div>

                    <!-- Footer Info -->
                    <div class="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                        <span>✨ Musik tersimpan otomatis di website Anda</span>
                        <button onclick="toggleSpotifyModal()" class="text-xs font-bold text-[#1DB954] hover:underline">
                            Tutup
                        </button>
                    </div>

                </div>
            </div>
        `;

        document.body.appendChild(widget);
        renderSavedLibrary();
    }

    // Switch Tabs in Spotify Modal
    window.switchSpotifyTab = function (tabName) {
        const tabs = ['search', 'presets', 'saved', 'link'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-btn-${t}`);
            const content = document.getElementById(`tab-content-${t}`);
            if (btn) {
                if (t === tabName) btn.classList.add('active');
                else btn.classList.remove('active');
            }
            if (content) {
                if (t === tabName) content.classList.remove('hidden');
                else content.classList.add('hidden');
            }
        });
    };

    // Toggle Modal Visibility
    window.toggleSpotifyModal = function () {
        const modal = document.getElementById("spotify-modal");
        if (modal) {
            modal.classList.toggle("hidden");
        }
    };

    // Handle Search Enter Key
    window.handleSearchKeyPress = function (e) {
        if (e.key === "Enter") {
            performSpotifySearch();
        }
    };

    // Perform Live Spotify Search
    window.performSpotifySearch = function () {
        const input = document.getElementById("spotify-search-input");
        const resultsContainer = document.getElementById("spotify-search-results");
        if (!input || !resultsContainer) return;

        const query = input.value.trim();
        if (!query) {
            resultsContainer.innerHTML = `<p class="text-xs text-amber-400 italic text-center py-3">Harap masukkan kata kunci lagu atau artis terlebih dahulu!</p>`;
            return;
        }

        // Show Loading state
        resultsContainer.innerHTML = `
            <div class="flex items-center justify-center gap-2 py-6 text-xs text-[#1DB954] font-bold">
                <i class="fa-solid fa-spinner animate-spin text-lg"></i> Mencari lagu di Spotify untuk "${escapeHTML(query)}"...
            </div>
        `;

        // Check if query is a Spotify Link directly
        const formattedLink = formatSpotifyEmbedUrl(query);
        if (formattedLink) {
            const title = "Custom Spotify Music 🎵";
            updateSpotifyPlayer(formattedLink, title);
            resultsContainer.innerHTML = `
                <div class="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-xs text-emerald-300 font-bold flex items-center justify-between">
                    <span><i class="fa-solid fa-circle-check"></i> Link Spotify diputar!</span>
                    <button onclick="toggleSpotifyModal()" class="text-white underline">Lihat Player</button>
                </div>
            `;
            return;
        }

        // Fetch Live Track Metadata via iTunes Search API (CORS enabled & instant track previews + metadata)
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=8`)
            .then(res => res.json())
            .then(data => {
                if (!data.results || data.results.length === 0) {
                    // Fallback to Spotify Search embed URL directly
                    const spotifySearchEmbed = `https://open.spotify.com/embed/search/${encodeURIComponent(query)}`;
                    resultsContainer.innerHTML = `
                        <div class="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                            <div>
                                <p class="text-xs font-bold text-white">Hasil Pencarian Spotify: "${escapeHTML(query)}"</p>
                                <p class="text-[10px] text-gray-400">Klik untuk memutar playlist pencarian di Spotify</p>
                            </div>
                            <button onclick="playSearchedItem('${spotifySearchEmbed}', 'Pencarian: ${escapeHTML(query)}')" 
                                    class="px-3 py-1.5 rounded-xl bg-[#1DB954] text-black font-extrabold text-xs hover:bg-[#1ed760] transition-all">
                                ▶ Putar
                            </button>
                        </div>
                    `;
                    return;
                }

                let html = '<div class="grid grid-cols-1 gap-2">';
                data.results.forEach(track => {
                    const trackTitle = `${track.trackName} - ${track.artistName}`;
                    // Construct Spotify Embed search URL or direct match
                    const spotifyUrl = `https://open.spotify.com/embed/search/${encodeURIComponent(track.trackName + " " + track.artistName)}`;
                    const artwork = track.artworkUrl100 || track.artworkUrl60 || "";

                    html += `
                        <div class="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group">
                            <div class="flex items-center gap-3 overflow-hidden">
                                ${artwork ? `<img src="${artwork}" class="w-10 h-10 rounded-xl object-cover shadow-sm flex-shrink-0">` : `<div class="w-10 h-10 rounded-xl bg-[#1DB954]/20 text-[#1DB954] flex items-center justify-center font-bold flex-shrink-0"><i class="fa-solid fa-music"></i></div>`}
                                <div class="overflow-hidden">
                                    <p class="text-xs font-bold text-white group-hover:text-[#1DB954] truncate transition-colors">${escapeHTML(track.trackName)}</p>
                                    <p class="text-[10px] text-gray-400 truncate">${escapeHTML(track.artistName)} • ${escapeHTML(track.collectionName || 'Single')}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-1 flex-shrink-0">
                                <button onclick="saveTrackToLibrary('${escapeHTML(track.trackName)}', '${escapeHTML(track.artistName)}', '${spotifyUrl}', '${artwork}')" 
                                        title="Simpan ke Favorit"
                                        class="w-8 h-8 rounded-xl bg-white/10 hover:bg-rose-500 hover:text-white text-rose-400 flex items-center justify-center text-xs transition-all">
                                    <i class="fa-solid fa-heart"></i>
                                </button>
                                <button onclick="playSearchedItem('${spotifyUrl}', '${escapeHTML(trackTitle)}')" 
                                        class="px-3 py-1.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs transition-transform active:scale-95 flex items-center gap-1 shadow-md">
                                    <i class="fa-solid fa-play"></i> Putar
                                </button>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                resultsContainer.innerHTML = html;
            })
            .catch(err => {
                const spotifySearchEmbed = `https://open.spotify.com/embed/search/${encodeURIComponent(query)}`;
                resultsContainer.innerHTML = `
                    <div class="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                        <div>
                            <p class="text-xs font-bold text-white">Cari di Spotify: "${escapeHTML(query)}"</p>
                            <p class="text-[10px] text-gray-400">Klik untuk memutar lagu ini di Spotify</p>
                        </div>
                        <button onclick="playSearchedItem('${spotifySearchEmbed}', 'Pencarian: ${escapeHTML(query)}')" 
                                class="px-3 py-1.5 rounded-xl bg-[#1DB954] text-black font-extrabold text-xs hover:bg-[#1ed760] transition-all">
                            ▶ Putar
                        </button>
                    </div>
                `;
            });
    };

    // Play Searched Item
    window.playSearchedItem = function (url, title) {
        updateSpotifyPlayer(url, title);
    };

    // Load Custom Spotify Link from Input
    window.loadCustomSpotifyUrl = function () {
        const input = document.getElementById("spotify-custom-input");
        const errorEl = document.getElementById("spotify-input-error");
        if (!input) return;

        const embedUrl = formatSpotifyEmbedUrl(input.value);
        if (embedUrl) {
            if (errorEl) errorEl.classList.add("hidden");
            const title = "Custom Spotify Track 🎵";
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

    // Connect / Save Spotify Account Profile Link
    window.saveSpotifyAccountLink = function () {
        const input = document.getElementById("spotify-account-input");
        const statusEl = document.getElementById("spotify-account-status");
        if (!input) return;

        const link = input.value.trim();
        userAccount = link;
        localStorage.setItem(STORAGE_KEY_SPOTIFY_ACCOUNT, link);

        if (link) {
            if (statusEl) {
                statusEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Akun Spotify terhubung: <a href="${escapeHTML(link)}" target="_blank" class="underline text-white font-bold">${escapeHTML(link)}</a>`;
                statusEl.classList.remove("hidden");
            }
            alert("Akun Spotify Anda berhasil dihubungkan & disimpan di website!");
        } else {
            if (statusEl) statusEl.classList.add("hidden");
        }
    };

    // Save Active Track to Saved Library
    window.saveActiveTrackToLibrary = function () {
        saveTrackToLibrary(currentSpotifyTitle, "Spotify Track", currentSpotifyUrl, "");
    };

    // Save Specific Track to Library
    window.saveTrackToLibrary = function (title, artist, url, artwork) {
        const existing = savedLibrary.find(item => item.url === url || item.title === title);
        if (!existing) {
            savedLibrary.unshift({
                title: title,
                artist: artist || "Spotify",
                url: url,
                artwork: artwork || "",
                id: Date.now()
            });
            localStorage.setItem(STORAGE_KEY_SPOTIFY_SAVED, JSON.stringify(savedLibrary));
            renderSavedLibrary();
            alert(`" ${title} " berhasil disimpan ke Daftar Favorit Anda! ❤️`);
        } else {
            alert(`Lagu "${title}" sudah ada di daftar favorit Anda.`);
        }
    };

    // Remove Track from Library
    window.removeSavedTrack = function (id) {
        savedLibrary = savedLibrary.filter(item => item.id !== id);
        localStorage.setItem(STORAGE_KEY_SPOTIFY_SAVED, JSON.stringify(savedLibrary));
        renderSavedLibrary();
    };

    // Render Saved Library Items
    function renderSavedLibrary() {
        const container = document.getElementById("saved-library-list");
        const badge = document.getElementById("saved-count-badge");
        if (badge) badge.innerText = `${savedLibrary.length} Tersimpan`;
        if (!container) return;

        if (savedLibrary.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-400 italic text-center py-4">Belum ada lagu tersimpan. Cari lagu atau klik tombol **Simpan** pada lagu yang diputar! 💚</p>`;
            return;
        }

        let html = '';
        savedLibrary.forEach(item => {
            html += `
                <div class="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                    <div class="flex items-center gap-3 overflow-hidden">
                        ${item.artwork ? `<img src="${item.artwork}" class="w-9 h-9 rounded-xl object-cover shadow-sm flex-shrink-0">` : `<div class="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold flex-shrink-0"><i class="fa-solid fa-heart"></i></div>`}
                        <div class="overflow-hidden">
                            <p class="text-xs font-bold text-white truncate">${escapeHTML(item.title)}</p>
                            <p class="text-[10px] text-gray-400 truncate">${escapeHTML(item.artist)}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                        <button onclick="playSearchedItem('${escapeHTML(item.url)}', '${escapeHTML(item.title)}')" 
                                class="px-2.5 py-1 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs transition-transform active:scale-95 flex items-center gap-1">
                            <i class="fa-solid fa-play"></i> Putar
                        </button>
                        <button onclick="removeSavedTrack(${item.id})" 
                                title="Hapus dari Favorit"
                                class="w-7 h-7 rounded-xl bg-white/5 hover:bg-red-500 text-gray-400 hover:text-white flex items-center justify-center text-xs transition-all">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    // Update Spotify Player Frame & Stored Values
    function updateSpotifyPlayer(url, title) {
        currentSpotifyUrl = url;
        currentSpotifyTitle = title;
        localStorage.setItem(STORAGE_KEY_SPOTIFY_URL, url);
        localStorage.setItem(STORAGE_KEY_SPOTIFY_TITLE, title);

        const iframe = document.getElementById("spotify-iframe");
        if (iframe) iframe.src = url;

        const statusText = document.getElementById("music-status-text");
        if (statusText) statusText.innerText = title;

        const titleLabel = document.getElementById("current-playing-title-label");
        if (titleLabel) titleLabel.innerHTML = `<i class="fa-solid fa-music"></i> ${escapeHTML(title)}`;

        const openAppLink = document.getElementById("spotify-open-app-link");
        if (openAppLink) openAppLink.href = getSpotifyDirectUrl(url);
    }

    // Helper: Escape HTML
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }

    // Init function
    function init() {
        injectStyles();
        createMusicPlayerUI();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
