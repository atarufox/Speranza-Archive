/**
 * ARC RAIDERS DATABASE // CORE LOGIC
 * V2.2 - Pure Vanilla JS
 */

/* ==========================================================================
   CONFIG & DATA
   ========================================================================== */
const CONFIG = {
    GITHUB_BASE: 'https://raw.githubusercontent.com/atarufox/Speranza-Archive/main/',
    SECTIONS: ['INVENTARIO', 'OFFICINA', 'PROGETTI', 'MAPPA', 'MERCANTI', 'NEGOZIO', 'MISSIONI'],
    MAP_COORDS: {
        "dam-battleground": { x: 75, y: 30 },
        "buried-city": { x: 25, y: 70 },
        "the-spaceport": { x: 80, y: 80 },
        "blue-gate": { x: 45, y: 20 },
        "stella-montis": { x: 20, y: 30 },
        "default": { x: 50, y: 50 }
    },
    SIDEBAR: {
        'INVENTARIO': [
            { id: 'ALL', label: 'ALL' },
            { id: 'POTENZIAMENTI', label: 'POTENZIAMENTI', img: 'augments' },
            { id: 'SCUDI', label: 'SCUDI', img: 'shields' },
            { id: 'ARMI', label: 'ARMI', img: 'weapons' },
            { id: 'MUNIZIONI', label: 'MUNIZIONI', img: 'ammunitions' },
            { id: 'MOD', label: 'MOD', img: 'weapon_mods' },
            { id: 'USO_RAPIDO', label: 'USO_RAPIDO', img: 'quick_use' },
            { id: 'CHIAVI', label: 'CHIAVI', img: 'keys' },
            { id: 'MATERIALI', label: 'MATERIALI', img: 'crafting_materials' },
            { id: 'VARIE', label: 'VARIE', img: 'misc' },
            { id: 'COSMETICS', label: 'COSMETICS', icon: 'cosmetic' }
        ],
        'PROGETTI': [
            { id: 'ALL', label: 'ALL' },
            { id: 'ARMI', label: 'ARMI', img: 'weapons' },
            { id: 'MOD', label: 'MOD', img: 'weapon_mods' },
            { id: 'USO_RAPIDO', label: 'USO_RAPIDO', img: 'quick_use' },
            { id: 'MATERIALI', label: 'MATERIALI', img: 'crafting_materials' }
        ],
        'OFFICINA': [
            { id: 'ALL', label: 'ALL' },
            { id: 'scrappy', label: 'SCRAPPY' },
            { id: 'workbench', label: 'WORKBENCH' },
            { id: 'gunsmith', label: 'GUNSMITH' },
            { id: 'gear_bench', label: 'GEAR BENCH' },
            { id: 'explosives_station', label: 'EXPLOSIVES' },
            { id: 'refiner', label: 'REFINER' },
            { id: 'medical_lab', label: 'MEDICAL' },
            { id: 'utility_station', label: 'UTILITY' }
        ]
    }
};

/* ==========================================================================
   STATE
   ========================================================================== */
const State = {
    items: [],
    hideout: [],
    schedule: null,
    translations: {},
    
    // View State
    section: 'INVENTARIO',
    filter: 'ALL',
    lang: 'it',
    search: '',
    
    // User Data
    wishlist: new Map(),
    blueprints: new Set(),
    wishlistMode: false,
    connected: false,

    async init() {
        this.loadUser();
    },

    async connect() {
        if (this.connected) return;
        await Api.loadAll();
        this.connected = true;
        UI.applyTranslations();
        UI.renderAll();
        MapSys.start();
    },

    loadUser() {
        try {
            const wl = localStorage.getItem('arc_wishlist');
            if(wl) this.wishlist = new Map(JSON.parse(wl));
            
            const bp = localStorage.getItem('arc_blueprints');
            if(bp) this.blueprints = new Set(JSON.parse(bp));
        } catch(e) { console.warn('Save data corrupt', e); }
    },

    saveUser() {
        localStorage.setItem('arc_wishlist', JSON.stringify(Array.from(this.wishlist.entries())));
        localStorage.setItem('arc_blueprints', JSON.stringify(Array.from(this.blueprints)));
        UI.updateStats();
    }
};

/* ==========================================================================
   API
   ========================================================================== */
const Api = {
    async loadAll() {
        const [items, hideout, schedule, lang] = await Promise.all([
            this.getGithubFolder('items'),
            this.getHideout(),
            this.getSchedule(),
            this.getLang(State.lang)
        ]);
        State.items = items.flat();
        State.hideout = hideout;
        State.schedule = schedule;
        State.translations = lang;
    },

    async getGithubFolder(folder) {
        try {
            const index = await fetch(`https://api.github.com/repos/atarufox/Speranza-Archive/contents/${folder}`).then(r=>r.json());
            const files = index.filter(f => f.name.endsWith('.json'));
            return Promise.all(files.map(f => fetch(f.download_url).then(r=>r.json())));
        } catch(e) { return []; }
    },

    async getHideout() {
        const mods = ['explosives_station', 'gear_bench', 'gunsmith', 'medical_lab', 'refiner', 'scrappy', 'stash', 'utility_station', 'workbench'];
        const p = mods.map(m => fetch(`${CONFIG.GITHUB_BASE}hideout/${m}.json`).then(r => r.ok ? r.json() : null));
        return (await Promise.all(p)).filter(Boolean);
    },

    async getSchedule() {
        try {
            return await fetch(`${CONFIG.GITHUB_BASE}map-events/map-events.json?t=${Date.now()}`).then(r=>r.json());
        } catch { return null; }
    },

    async getLang(lang) {
        try {
            return await fetch(`${CONFIG.GITHUB_BASE}languages/${lang}.json`).then(r=>r.json());
        } catch { return {}; }
    }
};

/* ==========================================================================
   UI
   ========================================================================== */
const UI = {
    el: {},

    init() {
        // Cache Elements
        const ids = ['landing-screen', 'app-container', 'btn-connect', 'ui-connect-btn', 'main-nav', 'sidebar', 'grid-container', 'map-container', 'map-events-panel', 'map-clock', 'search-input', 'btn-wishlist', 'wishlist-counter', 'lang-select', 'btn-crt-toggle', 'crt-layer', 'empty-state', 'modal-overlay', 'modal-content', 'loading-text'];
        ids.forEach(id => this.el[id] = document.getElementById(id));

        // Listeners
        this.el['btn-connect'].onclick = () => {
            this.el['loading-text'].classList.remove('hidden');
            setTimeout(async () => {
                await State.connect();
                this.el['landing-screen'].style.opacity = 0;
                setTimeout(() => {
                    this.el['landing-screen'].remove();
                    this.el['app-container'].classList.remove('hidden');
                    this.el['app-container'].classList.add('fade-in');
                }, 1000);
            }, 500);
        };

        this.el['search-input'].oninput = (e) => {
            State.search = e.target.value.toLowerCase();
            this.renderGrid();
        };

        this.el['btn-wishlist'].onclick = () => {
            State.wishlistMode = !State.wishlistMode;
            this.el['btn-wishlist'].classList.toggle('text-arc-yellow', State.wishlistMode);
            this.el['btn-wishlist'].classList.toggle('border-arc-yellow', State.wishlistMode);
            this.renderGrid();
        };

        this.el['btn-crt-toggle'].onclick = () => {
            const op = this.el['crt-layer'].style.opacity;
            this.el['crt-layer'].style.opacity = op === '0' ? '0.15' : '0';
        };

        this.el['lang-select'].onchange = async (e) => {
            State.lang = e.target.value;
            State.translations = await Api.getLang(State.lang);
            this.applyTranslations();
            this.renderAll();
        };

        this.el['modal-overlay'].onclick = (e) => {
            if(e.target === this.el['modal-overlay']) this.closeModal();
        };
    },

    applyTranslations() {
        const t = State.translations.UI || {};
        if (this.el['ui-connect-btn']) {
            this.el['ui-connect-btn'].textContent = t.establish_uplink || 'ESTABLISH UPLINK';
        }
        if (this.el['search-input']) {
            this.el['search-input'].placeholder = t.search || 'SEARCH DATABASE';
        }
        if (this.el['btn-wishlist']) {
            const wishlistSpan = this.el['btn-wishlist'].querySelector('span:first-child');
            if (wishlistSpan) wishlistSpan.textContent = t.wishlist || 'WISHLIST';
        }
        if (this.el['empty-state']) {
            const noDataEl = this.el['empty-state'].querySelector('.font-teko');
            const archivesEl = this.el['empty-state'].querySelector('.font-raj');
            if (noDataEl) noDataEl.textContent = t.no_data || 'NO DATA';
            if (archivesEl) archivesEl.textContent = t.archives_empty || 'ARCHIVES ARE EMPTY';
        }
    },

    renderAll() {
        this.renderNav();
        this.renderSidebar();
        this.renderGrid();
        this.updateStats();
    },

    getText(obj) {
        if(!obj) return "";
        if(typeof obj === 'string') return obj;
        return obj[State.lang] || obj['en'] || "";
    },

    getImg(item) {
        if(item.imageFilename) {
            return item.imageFilename.startsWith('http') ? item.imageFilename : CONFIG.GITHUB_BASE + item.imageFilename.replace(/^\//,'');
        }
        return `${CONFIG.GITHUB_BASE}images/menu/${item.id}.png`;
    },

    updateStats() {
        let total = 0;
        State.wishlist.forEach(v => total += v);
        this.el['wishlist-counter'].innerText = total;
        this.el['wishlist-counter'].style.display = total > 0 ? 'inline-block' : 'none';
    },

    renderNav() {
        this.el['main-nav'].innerHTML = CONFIG.SECTIONS.map(sec => {
            // Try multiple translation paths for nav items
            const label = State.translations.Navigation?.[sec.toLowerCase()] || 
                         State.translations.nav?.[sec] || 
                         sec;
            const active = State.section === sec;
            return `<button class="px-4 py-2 font-teko text-xl tracking-wide uppercase border-b-2 transition-colors ${active ? 'border-arc-yellow text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}" data-sec="${sec}">${label}</button>`;
        }).join('');

        Array.from(this.el['main-nav'].children).forEach(btn => {
            btn.onclick = () => {
                State.section = btn.dataset.sec;
                State.filter = 'ALL';
                State.wishlistMode = false;
                State.search = '';
                this.el['search-input'].value = '';
                this.el['btn-wishlist'].classList.remove('text-arc-yellow', 'border-arc-yellow');
                
                // Toggle Map/Grid
                const isMap = State.section === 'MAPPA';
                this.el['grid-container'].style.display = isMap ? 'none' : 'grid';
                this.el['sidebar'].style.display = isMap ? 'none' : 'flex';
                this.el['map-container'].style.display = isMap ? 'block' : 'none';
                MapSys.active = isMap;
                
                this.renderAll();
                if(isMap) MapSys.tick();
            };
        });
    },

    renderSidebar() {
        const conf = CONFIG.SIDEBAR[State.section];
        const sidebar = this.el['sidebar'];
        sidebar.innerHTML = '';

        if(!conf) return;

        conf.forEach(opt => {
            const active = State.filter === opt.id;
            const btn = document.createElement('button');
            btn.className = `w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 relative group shrink-0 ${active ? 'bg-[#2a2d35] border-arc-yellow shadow-[0_0_10px_rgba(255,196,0,0.2)]' : 'bg-black/40 border-white/10 hover:border-white/40'}`;
            
            let icon = `<span class="font-bold text-xs ${active?'text-white':'text-gray-500'}">${opt.label.substring(0,2)}</span>`;
            if(opt.img) {
                const src = `${CONFIG.GITHUB_BASE}images/menu/${opt.img}_${active?'active':'inactive'}.png`;
                icon = `<img src="${src}" class="w-full h-full object-cover rounded-full">`;
            }

            btn.innerHTML = `
                ${icon}
                <div class="absolute left-full ml-3 bg-black/90 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none transition-opacity border border-white/20">${opt.label}</div>
            `;
            btn.onclick = () => { State.filter = opt.id; this.renderSidebar(); this.renderGrid(); };
            sidebar.appendChild(btn);
        });
    },

    renderGrid() {
        if(State.section === 'MAPPA') return;

        let list = State.section === 'OFFICINA' ? State.hideout : State.items;
        
        // FILTERING
        list = list.filter(item => {
            if(State.search && !this.getText(item.name).toLowerCase().includes(State.search)) return false;
            if(State.wishlistMode && !State.wishlist.has(item.id)) return false;

            const type = (item.type || '').toLowerCase();
            const isBP = type.includes('blueprint') || type.includes('schematic');

            if(State.section === 'PROGETTI') {
                if(!isBP) return false;
                if(State.filter === 'ALL') return true;
                if(State.filter === 'ARMI') return type.includes('weapon');
                if(State.filter === 'MOD') return type.includes('gadget') || type.includes('mod');
                if(State.filter === 'MATERIALI') return type.includes('material');
                return false;
            }

            if(State.section === 'OFFICINA') return State.filter === 'ALL' || item.id === State.filter;

            // INVENTARIO
            if(isBP) return false; // Hide BPs in Inventory
            if(State.filter === 'ALL') return true;
            
            // Loose Type Matching
            const f = State.filter;
            if(f === 'ARMI') return type.includes('weapon') || type.includes('gun');
            if(f === 'MOD') return type.includes('mod') || type.includes('attachment');
            if(f === 'MUNIZIONI') return type.includes('ammo');
            if(f === 'USO_RAPIDO') return type.includes('consumable') || type.includes('grenade');
            if(f === 'MATERIALI') return type.includes('material') || type.includes('resource');
            if(f === 'VARIE') return type.includes('loot') || type.includes('junk');
            if(f === 'POTENZIAMENTI') return type.includes('augment');
            if(f === 'SCUDI') return type.includes('shield');
            if(f === 'CHIAVI') return type.includes('key');
            if(f === 'COSMETICS') return type.includes('cosmetic');
            return false;
        });

        const container = this.el['grid-container'];
        container.innerHTML = '';
        this.el['empty-state'].style.display = list.length ? 'none' : 'flex';

        const frag = document.createDocumentFragment();
        list.forEach(item => {
            const name = this.getText(item.name);
            const rarity = (item.rarity || 'common').toLowerCase();
            const colors = { common: '#777', uncommon: '#00cc44', rare: '#00aaff', epic: '#a033cc', legendary: '#ffaa00' };
            const color = colors[rarity] || colors.common;
            const img = this.getImg(item);
            const isOwned = State.blueprints.has(item.id);
            const isBP = State.section === 'PROGETTI';
            const wl = State.wishlist.get(item.id) || 0;

            const card = document.createElement('div');
            card.className = 'item-card relative aspect-square bg-[#111] border border-white/5 rounded-sm overflow-hidden cursor-pointer group';
            if(isOwned) card.style.borderColor = '#00e5ff';
            
            card.innerHTML = `
                <div class="absolute bottom-0 inset-x-0 h-[2px]" style="background:${color}"></div>
                <div class="w-full h-full p-3 flex items-center justify-center">
                    <img src="${img}" class="max-w-full max-h-full object-contain pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" loading="lazy" onerror="this.style.opacity=0">
                </div>
                ${isBP && isOwned ? `<div class="absolute top-1 left-1 font-teko text-arc-teal text-xl">V</div>` : ''}
                ${wl > 0 ? `<div class="absolute top-1 right-1 bg-arc-yellow text-black text-xs font-bold px-1.5 rounded">${wl}</div>` : ''}
                
                <div class="absolute inset-x-0 bottom-0 h-8 bg-black/90 translate-y-full group-hover:translate-y-0 transition-transform flex z-20">
                     ${isBP ? 
                        `<button class="btn-bp w-full h-full text-[10px] font-bold uppercase tracking-wider ${isOwned?'text-red-500':'text-arc-teal'} hover:bg-white/5">${isOwned?'UNMARK':'OWNED'}</button>` :
                        `<button class="btn-add flex-1 hover:text-white text-gray-400 font-bold text-lg">+</button>
                         <button class="btn-sub flex-1 hover:text-white text-gray-400 font-bold text-lg">-</button>`
                     }
                </div>
            `;

            // Events
            card.onclick = (e) => {
                if(e.target.classList.contains('btn-add')) {
                    State.wishlist.set(item.id, (State.wishlist.get(item.id)||0)+1);
                    State.saveUser();
                    this.renderGrid();
                } else if(e.target.classList.contains('btn-sub')) {
                    const v = (State.wishlist.get(item.id)||0)-1;
                    if(v <= 0) State.wishlist.delete(item.id); else State.wishlist.set(item.id, v);
                    State.saveUser();
                    this.renderGrid();
                } else if(e.target.classList.contains('btn-bp')) {
                    if(isOwned) State.blueprints.delete(item.id); else State.blueprints.add(item.id);
                    State.saveUser();
                    this.renderGrid();
                } else {
                    this.openModal(item);
                }
            };

            frag.appendChild(card);
        });
        container.appendChild(frag);
    },

    openModal(item) {
        const modal = this.el['modal-content'];
        modal.innerHTML = '';
        
        const name = this.getText(item.name);
        const desc = this.getText(item.description);
        
        let html = `
            <div class="bg-[#151515] p-5 border-b border-white/10 flex justify-between items-start">
                <div>
                    <h2 class="font-teko text-4xl text-arc-yellow leading-none uppercase">${name}</h2>
                    <div class="font-raj text-gray-500 text-xs tracking-widest uppercase mt-1">${item.rarity || 'COMMON'} // ${item.type || 'ITEM'}</div>
                </div>
                <button class="text-white/50 hover:text-white text-4xl leading-none" onclick="UI.closeModal()">&times;</button>
            </div>
            <div class="p-6 overflow-y-auto max-h-[60vh] font-raj">
                ${desc ? `<p class="text-gray-300 italic border-l-2 border-white/20 pl-4 mb-6">${desc}</p>` : ''}
                ${this.renderRecipe(item.recipe, 'CRAFTING')}
                ${item.levels ? item.levels.map(l => this.renderRecipe(l.requirements || l.requirementItemIds, `LEVEL ${l.level}`)).join('') : ''}
                ${item.foundIn ? `<div class="mt-4 pt-4 border-t border-white/10"><span class="text-xs text-gray-500 font-bold block">LOCATION</span><span class="text-arc-teal uppercase tracking-wide">${this.getText(item.foundIn)}</span></div>` : ''}
            </div>
        `;
        modal.innerHTML = html;

        // Add Listeners for recipe buttons
        modal.querySelectorAll('.recipe-add-btn').forEach(btn => {
            btn.onclick = () => {
                const data = JSON.parse(btn.dataset.list);
                data.forEach(x => {
                    const c = State.wishlist.get(x.id)||0;
                    State.wishlist.set(x.id, c + x.qty);
                });
                State.saveUser();
                btn.innerText = "ADDED TO WISHLIST";
                btn.disabled = true;
                btn.classList.add('text-arc-yellow', 'border-arc-yellow');
            };
        });

        this.el['modal-overlay'].classList.remove('hidden');
    },

    closeModal() {
        this.el['modal-overlay'].classList.add('hidden');
        this.el['modal-content'].innerHTML = '';
    },

    renderRecipe(recipe, title) {
        if(!recipe) return '';
        const list = Array.isArray(recipe) ? 
            recipe.map(x => ({ id: x.item||x.itemId, qty: x.count||x.quantity })) : 
            Object.entries(recipe).map(([k,v]) => ({id:k, qty:v}));
        
        if(!list.length) return '';

        const rows = list.map(x => {
            const i = State.items.find(it => it.id === x.id);
            return `
                <div class="flex justify-between py-1 border-b border-white/5 text-sm">
                    <span class="text-gray-300">${i ? this.getText(i.name) : x.id}</span>
                    <span class="font-mono text-arc-yellow">x${x.qty}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="mb-4 bg-white/5 p-4 rounded-sm">
                <h3 class="font-teko text-xl text-white mb-2 uppercase">${title}</h3>
                ${rows}
                <button class="recipe-add-btn mt-3 w-full border border-white/20 py-1 text-xs text-gray-400 hover:text-white hover:border-white transition-colors" data-list='${JSON.stringify(list)}'>ADD ALL TO WISHLIST</button>
            </div>
        `;
    }
};

/* ==========================================================================
   MAP SYSTEM
   ========================================================================== */
const MapSys = {
    active: false,
    timer: null,

    start() {
        this.timer = setInterval(() => { if(this.active) this.tick(); }, 1000);
    },

    tick() {
        if(!State.schedule) return;
        const now = new Date();
        const nowTs = now.getTime();
        UI.el['map-clock'].innerText = now.toISOString().slice(11,19) + " UTC";

        const events = [];
        const { eventTypes, schedule } = State.schedule;

        Object.keys(schedule).forEach(mid => {
            Object.values(schedule[mid]).forEach(cat => {
                Object.entries(cat).forEach(([hStr, typeId]) => {
                    const def = eventTypes[typeId];
                    if(!def) return;
                    
                    const h = parseInt(hStr, 10);
                    const duration = (def.duration || 60) * 60000;

                    // Check Today & Tomorrow
                    [0, 1].forEach(offset => {
                        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset, h, 0, 0)).getTime();
                        const end = start + duration;

                        if(nowTs >= start && nowTs < end) {
                            events.push({ mid, name: def.name, status: 'ACTIVE', end: end });
                        } else if (nowTs < start && (start - nowTs) < 7200000) { // 2h ahead
                            events.push({ mid, name: def.name, status: 'SOON', start: start });
                        }
                    });
                });
            });
        });

        this.draw(events);
    },

    draw(events) {
        const markers = UI.el['map-markers']; // This is the container
        markers.innerHTML = '';
        
        // Ensure translations exist
        const locs = State.translations.locations || {};

        // Markers
        Object.entries(CONFIG.MAP_COORDS).forEach(([mid, pos]) => {
            if(mid === 'default') return;
            const active = events.find(e => e.mid === mid && e.status === 'ACTIVE');
            const soon = events.find(e => e.mid === mid && e.status === 'SOON');
            const evt = active || soon;

            const div = document.createElement('div');
            div.className = 'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10';
            div.style.left = pos.x + '%';
            div.style.top = pos.y + '%';
            
            if(evt) {
                const isAct = evt.status === 'ACTIVE';
                const color = isAct ? 'bg-[#00ff66]' : 'bg-[#00e5ff]';
                const glow = isAct ? 'shadow-[0_0_15px_#00ff66]' : '';
                const left = Math.floor(Math.abs((isAct ? evt.end : evt.start) - Date.now())/1000);
                
                div.innerHTML = `
                    <div class="w-3 h-3 rounded-full ${color} ${glow} ${isAct?'animate-pulse':''}"></div>
                    <div class="mt-2 bg-black/80 backdrop-blur px-2 py-1 rounded border border-white/20 text-center min-w-[100px]">
                        <div class="text-white font-teko leading-none text-lg">${evt.name}</div>
                        <div class="text-xs font-mono ${isAct?'text-green-400':'text-cyan-400'}">${Math.floor(left/60)}m ${left%60}s</div>
                    </div>
                `;
            } else {
                div.innerHTML = `<div class="w-2 h-2 rounded-full bg-white/20"></div>`;
            }
            markers.appendChild(div);
        });

        // Panel
        const panel = UI.el['map-events-panel'];
        const activeList = events.filter(e => e.status === 'ACTIVE');
        const soonList = events.filter(e => e.status === 'SOON').sort((a,b) => a.start - b.start);

        panel.innerHTML = `
            ${activeList.length ? `
                <div class="bg-black/60 p-3 border-l-2 border-green-500 backdrop-blur-sm">
                    <h3 class="font-teko text-green-400 text-xl border-b border-white/10 mb-2">ACTIVE UPLINKS</h3>
                    ${activeList.map(e => `<div class="flex justify-between text-sm mb-1"><span class="text-white">${locs[e.mid]||e.mid}</span><span class="text-green-400 font-mono">${Math.floor((e.end-Date.now())/60000)}m</span></div>`).join('')}
                </div>
            ` : ''}
            <div class="bg-black/60 p-3 border-l-2 border-cyan-500 backdrop-blur-sm">
                <h3 class="font-teko text-cyan-400 text-xl border-b border-white/10 mb-2">INCOMING SIGNALS</h3>
                ${soonList.slice(0,5).map(e => `<div class="flex justify-between text-sm mb-1"><span class="text-gray-300">${locs[e.mid]||e.mid}</span><span class="text-white font-mono">${Math.floor((e.start-Date.now())/60000)}m</span></div>`).join('')}
            </div>
        `;
    }
};

window.onload = () => State.init();