let itemsDB = [], hideoutDB = [], overridesDB = {};
    let wishlist = new Map();
    let ownedBlueprints = new Set();
    let currentFilter = 'ALL', viewMode = 'STASH', currentLang = 'it', adminMode = false;
    let isEditing = false, isWishlistView = false; 
    let currentSection = 'INVENTARIO';
    let bpViewMode = 0; 
    let isModalOpen = false; 
    let activeTranslation = {}; 

    const GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/atarufox/Speranza-Archive/main/';

    // --- INIT APP (Boot Sequence Step 1) ---
    async function initApp() {
        try {
            // 1. Fetch available languages
            const availableLangs = ['it', 'en', 'es', 'fr'];
            const langLabels = { 'it': 'ITA', 'en': 'ENG', 'es': 'ESP', 'fr': 'FRA' };
            dom.langSelect.innerHTML = '<option value="">LANG</option>'; 
            
            const ts = new Date().getTime();

            for (let lang of availableLangs) {
                try {
                    let check = await fetch(`${GITHUB_RAW_BASE_URL}languages/${lang}.json?t=${ts}`, { method: 'HEAD' });
                    if (!check.ok) check = await fetch(`${GITHUB_RAW_BASE_URL}languages/${lang}.json?t=${ts}`); // Fallback GET
                    
                    if (check.ok) {
                        let opt = document.createElement('option');
                        opt.value = lang;
                        opt.text = langLabels[lang] || lang.toUpperCase();
                        dom.langSelect.appendChild(opt);
                    }
                } catch(e) { console.log("Lang check failed for", lang); }
            }
            
            // 2. Set Default Lang (IT) and load its text immediately for the intro button
            if(dom.langSelect.querySelector('option[value="it"]')) {
                dom.langSelect.value = 'it';
                await loadLanguage('it');
            } else if (dom.langSelect.options.length > 1) {
                dom.langSelect.selectedIndex = 1;
                await loadLanguage(dom.langSelect.value);
            }
        } catch(e) { console.error("Init failed", e); }
    }

    async function loadLanguage(lang) {
        dom.loader.style.display = 'flex';
        dom.loaderText.textContent = `LOADING LANGUAGE: ${lang.toUpperCase()}...`;
        const ts = new Date().getTime();

        try {
            const response = await fetch(`${GITHUB_RAW_BASE_URL}languages/${lang}.json?t=${ts}`);
            if(!response.ok) throw new Error(`Language file not found: ${lang}`);
            
            activeTranslation = await response.json();
            currentLang = lang;
            
            updateStaticText();
            // If already connected, re-render the app
            if(document.body.classList.contains('db-loaded')) {
                renderSidebar();
                updateUI();
                render();
            }
        } catch (error) {
            console.error("Failed to load language:", error);
            activeTranslation = {}; 
            updateStaticText();
        } finally {
            dom.loader.style.display = 'none';
        }
    }

    async function connectToDatabase() {
        dom.loader.style.display = 'flex'; itemsDB = []; hideoutDB = []; 
        dom.loaderText.textContent = "ESTABLISHING CONNECTION...";
        
        try {
            const repo = 'atarufox/Speranza-Archive';
            const ts = new Date().getTime(); // Cache busting for DB files
            
            // Load Items
            dom.loaderText.textContent = "DOWNLOADING ITEM DATABASE...";
            const itemsUrl = `https://api.github.com/repos/${repo}/contents/items?t=${ts}`;
            const responseItems = await fetch(itemsUrl);
            if (!responseItems.ok) throw new Error(`GitHub API error (Items): ${responseItems.status}`);
            const filesItems = await responseItems.json();
            const jsonFilesItems = filesItems.filter(f => f.name.endsWith('.json'));
            
            // Load Hideout
            dom.loaderText.textContent = "DOWNLOADING HIDEOUT DATA...";
            const hideoutUrl = `https://api.github.com/repos/${repo}/contents/hideout?t=${ts}`;
            const responseHideout = await fetch(hideoutUrl);
            let jsonFilesHideout = [];
            if (responseHideout.ok) {
                const filesHideout = await responseHideout.json();
                jsonFilesHideout = filesHideout.filter(f => f.name.endsWith('.json'));
            }

            dom.loaderText.textContent = `PROCESSING ${jsonFilesItems.length + jsonFilesHideout.length} FILES...`;
            
            const itemPromises = jsonFilesItems.map(file => fetch(file.download_url + `?t=${ts}`).then(res => res.json()));
            const hideoutPromises = jsonFilesHideout.map(file => fetch(file.download_url + `?t=${ts}`).then(res => res.json()));

            const loadedItems = await Promise.all(itemPromises);
            const loadedHideout = await Promise.all(hideoutPromises);

            itemsDB = loadedItems;
            hideoutDB = normalizeHideoutData(loadedHideout, 'RaidTheory');

            enableUI(); analyzeTypes();
        } catch (error) {
            console.error(error); dom.loader.style.display = 'none';
            alert("Connection Failed. Check console.");
        }
    }

    function enableUI() {
        document.body.classList.add('db-loaded');
        dom.search.disabled = false;
        dom.loader.style.display = 'none';
        
        // Hide intro, show grid
        setSection('INVENTARIO'); 
        setFilter('ALL');
    }

    // --- TRANSLATION HELPERS (Fixed: Safe checks & Fallbacks) ---
    function getUI(key) {
        if (activeTranslation && activeTranslation.ui && activeTranslation.ui[key]) return activeTranslation.ui[key];
        // LOG WARNING IF MISSING (Only once per key to avoid spam? No, spam is fine for debugging)
        console.warn(`⚠️ MISSING TRANSLATION (ui): ${key}`);
        return `UI_${key.toUpperCase()}`; 
    }
    
    function getNav(key) {
        if (activeTranslation && activeTranslation.nav && activeTranslation.nav[key]) return activeTranslation.nav[key];
        console.warn(`⚠️ MISSING TRANSLATION (nav): ${key}`);
        return `NAV_${key}`;
    }
    
    function getFilter(key) {
        if (activeTranslation && activeTranslation.filters && activeTranslation.filters[key]) return activeTranslation.filters[key];
        console.warn(`⚠️ MISSING TRANSLATION (filter): ${key}`);
        return `FILT_${key}`;
    }

    function translateType(rawType) {
        if(!rawType) return "";
        if(rawType.toLowerCase() === 'item') return getUI('item');
        if (activeTranslation && activeTranslation.types && activeTranslation.types[rawType]) return activeTranslation.types[rawType];
        return rawType.toUpperCase();
    }

    // --- CONFIGURAZIONE FILTRI SIDEBAR ---
    const SIDEBAR_CONFIG = {
        'INVENTARIO': [
            { id: 'ALL', img: 'all', type: 'img', labelKey: 'ALL' }, 
            { id: 'POTENZIAMENTI', img: 'augments', type: 'img', labelKey: 'POTENZIAMENTI' },
            { id: 'SCUDI', img: 'shields', type: 'img', labelKey: 'SCUDI' },
            { id: 'ARMI', img: 'weapons', type: 'img', labelKey: 'ARMI' },
            { id: 'MUNIZIONI', img: 'ammunitions', type: 'img', labelKey: 'MUNIZIONI' },
            { id: 'MOD', img: 'weapon_mods', type: 'img', labelKey: 'MOD' },
            { id: 'USO_RAPIDO', img: 'quick_use', type: 'img', labelKey: 'USO_RAPIDO' },
            { id: 'CHIAVI', img: 'keys', type: 'img', labelKey: 'CHIAVI' },
            { id: 'MATERIALI', img: 'crafting_materials', type: 'img', labelKey: 'MATERIALI' },
            { id: 'VARIE', img: 'misc', type: 'img', labelKey: 'VARIE' },
            { id: 'COSMETICS', icon: 'icon-cosmetic', type: 'svg', labelKey: 'COSMETICS' }
        ],
        'PROGETTI': [
            { id: 'ALL', icon: 'icon-all', type: 'svg', labelKey: 'ALL' }, 
            { id: 'ARMI', img: 'weapons', type: 'img', labelKey: 'ARMI' },
            { id: 'MOD', img: 'weapon_mods', type: 'img', labelKey: 'MOD' },
            { id: 'USO_RAPIDO', img: 'quick_use', type: 'img', labelKey: 'USO_RAPIDO' },
            { id: 'MATERIALI', img: 'crafting_materials', type: 'img', labelKey: 'MATERIALI' }
        ],
        'OFFICINA': [
            { id: 'ALL', img: 'all', type: 'img', labelKey: 'ALL' },
            { targetId: 'scrappy' },
            { targetId: 'workbench' },
            { targetId: 'gunsmith' },
            { targetId: 'gear_bench' },
            { targetId: 'explosives_station' },
            { targetId: 'refiner' },
            { targetId: 'medical_lab' },
            { targetId: 'utility_station' }
        ], 
        'MERCANTI': [], 
        'NEGOZIO': [],
        'MISSIONI': []
    };

    const dom = {
        grid: document.getElementById('grid-container'),
        loader: document.getElementById('loader'),
        loaderText: document.getElementById('loader-text'),
        search: document.getElementById('searchInput'),
        searchClear: document.getElementById('searchClear'),
        tt: document.getElementById('tooltip'),
        sidebar: document.getElementById('sidebarPanel'),
        sbTooltip: document.getElementById('sidebar-tooltip'),
        wlCounter: document.getElementById('wlCounter'),
        infoModal: document.getElementById('infoModal'),
        adminModal: document.getElementById('adminModal'),
        modalBackdrop: document.getElementById('modalBackdrop'),
        btnWishlistText: document.getElementById('btnWishlistText'),
        btnWishlist: document.getElementById('btnWishlist'),
        btnConnectBig: document.getElementById('btnConnectBig'),
        langSelect: document.getElementById('langSelect')
    };

    dom.search.addEventListener('input', (e) => { dom.searchClear.style.display = e.target.value ? 'block' : 'none'; render(); });
    dom.langSelect.addEventListener('change', (e) => { if(e.target.value) loadLanguage(e.target.value); });
    
    function updateStaticText() {
        dom.search.placeholder = (getUI('search') && getUI('search') !== 'UI_SEARCH') ? getUI('search') : 'SEARCH';
        
        if(dom.btnConnectBig) {
            const transBtn = getUI('connect_btn');
            dom.btnConnectBig.innerText = (transBtn && transBtn !== 'UI_CONNECT_BTN') ? transBtn : "CONNECT TO SPERANZA";
        }

        if(dom.btnWishlistText && !isWishlistView && currentSection !== 'PROGETTI') {
             const transWl = getUI('what_i_need');
             dom.btnWishlistText.innerText = (transWl && transWl !== 'UI_WHAT_I_NEED') ? transWl : "WHAT I NEED";
        }
        
        document.querySelectorAll('.nav-item').forEach(el => {
            const key = el.getAttribute('data-nav');
            if(key) el.innerText = getNav(key) || key;
        });
    }

    // Modal controls
    window.closeInfoModal = function() { dom.infoModal.style.display = 'none'; dom.modalBackdrop.style.display = 'none'; isModalOpen = false; };
    window.closeAdmin = function() { isEditing = false; dom.adminModal.style.display = 'none'; dom.modalBackdrop.style.display = 'none'; isModalOpen = false; };
    window.saveEdit = saveEdit;

    // --- NAVIGATION LOGIC ---
    function setSection(sectionName) {
        currentSection = sectionName;
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-nav') === sectionName);
        });
        if(sectionName === 'PROGETTI') {
            document.body.classList.add('section-progetti');
            document.body.classList.add('sidebar-empty');
        } else {
            document.body.classList.remove('section-progetti');
            if(SIDEBAR_CONFIG[sectionName] && SIDEBAR_CONFIG[sectionName].length > 0) {
                document.body.classList.remove('sidebar-empty');
            } else {
                document.body.classList.add('sidebar-empty');
            }
        }
        renderSidebar();
        if(document.body.classList.contains('db-loaded')) {
            currentFilter = 'ALL'; viewMode = 'STASH'; isWishlistView = false;
            dom.btnWishlist.classList.remove('active'); updateUI(); render();
        }
    }

    function renderSidebar() {
        const config = SIDEBAR_CONFIG[currentSection] || [];
        dom.sidebar.innerHTML = "";
        if(config.length === 0) return; 

        config.forEach(item => {
            if(item.sep) {
                const sep = document.createElement('div');
                sep.className = 'sidebar-sep';
                dom.sidebar.appendChild(sep);
                return;
            }
            let realItem = null;
            let displayTitle = "";
            if (currentSection === 'OFFICINA' && item.targetId) {
                realItem = hideoutDB.find(x => x.id === item.targetId);
                if (realItem) displayTitle = getLoc(realItem.name); else displayTitle = item.targetId;
            } else {
                displayTitle = getFilter(item.labelKey);
            }

            const div = document.createElement('div');
            div.className = 'filter-circle';
            div.onmouseenter = (e) => showSidebarTooltip(e, displayTitle);
            div.onmouseleave = hideSidebarTooltip;

            let isActive = false;
            if (currentSection === 'OFFICINA') {
                if (item.id === 'ALL' && currentFilter === 'ALL') isActive = true;
                if (item.targetId && currentFilter === item.targetId) isActive = true;
            } else {
                if (item.id === currentFilter) isActive = true;
            }
            if(isActive) div.classList.add('active');

            if (currentSection === 'OFFICINA' && item.targetId) {
                div.onclick = () => setFilter(item.targetId);
                div.dataset.filter = item.targetId;
            } else {
                div.onclick = () => setFilter(item.id);
                div.dataset.filter = item.id;
            }

            if(item.type === 'svg') {
                div.innerHTML = `<svg><use href="#${item.icon}"></use></svg>`;
            } else {
                div.classList.add('has-image');
                let imgName = item.img; 
                if (currentSection === 'OFFICINA' && item.targetId) imgName = item.targetId;
                
                div.innerHTML = `
                    <img class="icon-inactive" src="${GITHUB_RAW_BASE_URL}images/menu/${imgName}_inactive.png" onerror="this.style.display='none'" alt="">
                    <img class="icon-active" src="${GITHUB_RAW_BASE_URL}images/menu/${imgName}_active.png" onerror="this.style.display='none'" alt="">
                `;
            }
            dom.sidebar.appendChild(div);
        });
    }

    function showSidebarTooltip(e, text) {
        if(!text) return;
        const rect = e.currentTarget.getBoundingClientRect();
        dom.sbTooltip.innerText = text;
        dom.sbTooltip.style.display = 'block';
        dom.sbTooltip.style.left = (rect.right + 10) + 'px';
        dom.sbTooltip.style.top = (rect.top + (rect.height / 2) - (dom.sbTooltip.offsetHeight / 2)) + 'px';
    }
    function hideSidebarTooltip() { dom.sbTooltip.style.display = 'none'; }

    function setFilter(f) {
        currentFilter = f; 
        viewMode = (f === 'HIDEOUT') ? 'HIDEOUT' : 'STASH';
        if(currentSection !== 'PROGETTI') { isWishlistView = false; dom.btnWishlist.classList.remove('active'); }
        renderSidebar(); render();
    }

    function handleTopRightButton() {
        if(currentSection === 'PROGETTI') { bpViewMode = (bpViewMode + 1) % 3; updateUI(); render(); } else { toggleWishlistView(); }
    }

    function toggleWishlistView() {
        isWishlistView = !isWishlistView;
        if(isWishlistView) { dom.btnWishlist.classList.add('active'); viewMode = 'WISHLIST'; } 
        else { dom.btnWishlist.classList.remove('active'); setFilter('ALL'); }
        render();
    }

    function updateUI() {
        if (currentSection === 'PROGETTI') {
             dom.btnWishlist.classList.remove('active', 'bp-filter-owned', 'bp-filter-missing');
             document.getElementById('iconWishlist').style.display = 'none';
             dom.wlCounter.style.display = 'none';
             if(bpViewMode === 0) {
                 const t = getUI('all');
                 dom.btnWishlistText.innerText = (t !== 'UI_ALL') ? t : 'ALL';
             } else if(bpViewMode === 1) {
                 const t = getUI('have');
                 dom.btnWishlistText.innerText = (t !== 'UI_HAVE') ? t : 'OWNED';
                 dom.btnWishlist.classList.add('bp-filter-owned');
             } else if(bpViewMode === 2) {
                 const t = getUI('missing');
                 dom.btnWishlistText.innerText = (t !== 'UI_MISSING') ? t : 'MISSING';
                 dom.btnWishlist.classList.add('bp-filter-missing');
             }
        } else {
             document.getElementById('iconWishlist').style.display = 'block';
             const t = getUI('what_i_need');
             dom.btnWishlistText.innerText = (t !== 'UI_WHAT_I_NEED') ? t : 'WHAT I NEED';
             dom.btnWishlist.classList.remove('bp-filter-owned', 'bp-filter-missing');
             updateWishlistCounter();
        }
    }

    function normalizeHideoutData(sourceData, sourceRepo) {
        let normalized = [];
        if (sourceRepo === 'RaidTheory') { 
            if(Array.isArray(sourceData)) {
                sourceData.forEach(d => {
                    if (d.levels) {
                        let newItem = {
                            id: d.id, name: d.name,
                            levels: d.levels.map(l => ({
                                level: l.level,
                                requirements: (l.requirementItemIds || []).map(req => ({ item: req.itemId, count: req.quantity }))
                            }))
                        };
                        normalized.push(newItem);
                    }
                });
            }
        }
        return normalized;
    }

    function analyzeTypes() {
        const typeCounts = {}; let total = itemsDB.length;
        itemsDB.forEach(i => { const t = i.type || "UNDEFINED"; typeCounts[t] = (typeCounts[t] || 0) + 1; });
        console.group("ANALISI DATI"); console.log(`TOTALE: ${total}`); console.table(typeCounts); console.groupEnd();
    }

    function getLoc(obj) {
        if(!obj) return "";
        if(typeof obj === 'string') return obj;
        return obj[currentLang] || obj['en'] || "";
    }

    function getImg(data) {
        if(!data) return null;
        if (data.imageFilename) {
            if (data.imageFilename.startsWith('http')) return data.imageFilename;
            const cleanPath = data.imageFilename.replace(/^[\/|\\]/, '');
            return GITHUB_RAW_BASE_URL + cleanPath;
        }
        return null;
    }

    function getItem(id) { 
        let base = itemsDB.find(x => x.id === id);
        if (!base) base = hideoutDB.find(x => x.id === id);
        if(!base) return null;
        if(overridesDB[id]) {
            let merged = { ...base, ...overridesDB[id] };
            if(overridesDB[id].name) merged.name = { ...(base.name || {}), ...overridesDB[id].name };
            if(overridesDB[id].description) merged.description = { ...(base.description || {}), ...overridesDB[id].description };
            return merged;
        }
        return base;
    }

    function isBlueprint(item) {
        const t = (item.type || "").toLowerCase();
        const name = item.name ? JSON.stringify(item.name).toLowerCase() : "";
        return t.includes('blueprint') || t.includes('schematic') || name.includes('blueprint') || name.includes('recipe');
    }

    function isCosmetic(item) {
        const t = (item.type || "").toLowerCase();
        return t.includes('cosmetic') || t.includes('outfit') || t.includes('backpack') || t.includes('customization');
    }

    function normalizeReqs(reqsObj) {
        if (!reqsObj) return [];
        if (Array.isArray(reqsObj)) {
            return reqsObj.map(r => {
                if(r.itemId && r.quantity !== undefined) return { item: r.itemId, count: r.quantity };
                return r; 
            });
        }
        return Object.entries(reqsObj).map(([key, val]) => ({ item: key, count: val }));
    }

    function clearSearch() { dom.search.value = ""; dom.searchClear.style.display = 'none'; render(); }
    
    function updateWishlistCounter() {
        let count = 0;
        wishlist.forEach(v => count += parseInt(v) || 0);
        dom.wlCounter.innerText = count;
        dom.wlCounter.style.display = count > 0 ? 'inline-block' : 'none';
    }
    
    function exportUserData() {
        const data = { wishlist: Array.from(wishlist.entries()), blueprints: Array.from(ownedBlueprints) };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr); anchor.setAttribute("download", "arc_user_data.json");
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
    }

    function importUserData(e) {
        const file = e.target.files[0];
        if(!file) return;
        const r = new FileReader();
        r.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if(data.wishlist) wishlist = new Map(data.wishlist);
                if(data.blueprints) ownedBlueprints = new Set(data.blueprints);
                saveUserData(); updateWishlistCounter(); render();
                alert("Dati utente caricati con successo!");
            } catch(ex) { alert("Errore nel file dati."); }
        };
        r.readAsText(file);
    }
    
    function saveUserData() {
        localStorage.setItem('arc_wishlist', JSON.stringify(Array.from(wishlist.entries())));
        localStorage.setItem('arc_blueprints', JSON.stringify(Array.from(ownedBlueprints)));
        updateWishlistCounter();
    }
    
    window.addReqsToWishlist = function(reqsJson, btn) {
        if(!reqsJson) return;
        try {
            const reqs = JSON.parse(decodeURIComponent(reqsJson));
            reqs.forEach(r => {
               const current = wishlist.get(r.item) || 0;
               wishlist.set(r.item, current + r.count);
            });
            saveUserData();
            btn.classList.add('added');
            const t = getUI('added');
            btn.innerText = (t !== 'UI_ADDED') ? t : 'ADDED';
        } catch(e) { console.error(e); }
    };

    // --- RENDER GRID ---
    function render() {
        const grid = dom.grid; grid.innerHTML = "";
        const search = dom.search.value.toLowerCase();
        let source = [];

        if (itemsDB.length === 0 && hideoutDB.length === 0 && !isWishlistView && wishlist.size === 0) {
             // EMPTY STATE
             return;
        }
        
        if(currentSection !== 'INVENTARIO' && currentSection !== 'PROGETTI' && currentSection !== 'OFFICINA' && !isWishlistView) {
             grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; margin-top: 100px; color: #666;">
                    <h3 style="font-family: var(--font-head); font-size: 3rem; color: #aaa;">SEZIONE ${currentSection}</h3>
                    <p style="color:var(--arc-yellow)">WORK IN PROGRESS</p>
                </div>`;
            return;
        }

        if(isWishlistView) {
             wishlist.forEach((qty, id) => { 
                const item = getItem(id); 
                if(item) source.push({...item, _wishQty: qty}); 
            });
            if (source.length === 0) {
                 grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; margin-top: 100px; color: #444;">
                    <h3 style="font-family: var(--font-head); font-size: 2rem; color: #aaa;">WISHLIST VUOTA</h3>
                </div>`;
                return;
            }
            let totalW = 0, totalV = 0;
            source.forEach(i => { totalW += (i.weightKg||0)*i._wishQty; totalV += (i.value||0)*i._wishQty; });
            const head = document.createElement('div'); head.style.gridColumn='1/-1'; head.style.color='#aaa'; head.style.fontFamily='var(--font-head)'; head.style.fontSize='1.5rem';
            head.innerHTML = `WISHLIST: <span style="color:#fff">${source.length}</span> ITEMS | WEIGHT: <span style="color:#fff">${totalW.toFixed(1)}</span>KG | VALUE: <span style="color:var(--arc-yellow)">${totalV}</span>`;
            grid.appendChild(head);
        
        } else if (currentSection === 'OFFICINA') {
            source = hideoutDB.filter(x => {
                if(search && !(getLoc(x.name)||x.id).toLowerCase().includes(search)) return false;
                const id = x.id.toUpperCase();
                if (x.id === 'stash') return false;
                if(currentFilter === 'ALL') return true;
                if(currentFilter === x.id) return true;
                return false;
            });
        } else {
            source = itemsDB.map(x => getItem(x.id)).filter(item => {
                if(!item) return false;
                if(search && !(getLoc(item.name)||item.id).toLowerCase().includes(search)) return false;
                const t = (item.type || "").toLowerCase();
                const isBP = isBlueprint(item);
                const isCosm = isCosmetic(item);

                if(currentSection === 'PROGETTI') {
                    if(!isBP) return false;
                    if(bpViewMode === 1 && !ownedBlueprints.has(item.id)) return false; 
                    if(bpViewMode === 2 && ownedBlueprints.has(item.id)) return false;  
                    if (currentFilter === 'ALL') return true;
                    if (currentFilter === 'ARMI') return t.includes('hand cannon') || t.includes('assault rifle') || t.includes('smg') || t.includes('pistol') || t.includes('lmg') || t.includes('battle rifle') || t.includes('shotgun') || t.includes('sniper rifle') || t.includes('special');
                    if (currentFilter === 'MOD') return t.includes('modification') || t.includes('gadget');
                    if (currentFilter === 'USO_RAPIDO') return t.includes('quick use');
                    if (currentFilter === 'MATERIALI') return t.includes('material');
                    return false;
                }

                if (currentFilter === 'ALL') {
                    if (isBP) return false;
                    if (isCosm) return false;
                    return true;
                }
                
                if (currentFilter === 'COSMETICS') return isCosm;
                if (currentFilter === 'POTENZIAMENTI') return t.includes('augment');
                if (currentFilter === 'SCUDI') return t.includes('shield');
                if (currentFilter === 'ARMI') return t.includes('hand cannon') || t.includes('assault rifle') || t.includes('smg') || t.includes('pistol') || t.includes('lmg') || t.includes('battle rifle') || t.includes('shotgun') || t.includes('sniper rifle') || t.includes('special');
                if (currentFilter === 'MUNIZIONI') return t.includes('ammunition');
                if (currentFilter === 'MOD') return t.includes('modification') || t.includes('gadget');
                if (currentFilter === 'USO_RAPIDO') return t.includes('quick use');
                if (currentFilter === 'CHIAVI') return t.includes('key');
                if (currentFilter === 'MATERIALI') return t.includes('refined material') || t.includes('topside material') || t.includes('basic material') || t.includes('material') || t.includes('nature') || t.includes('recyclable');
                if (currentFilter === 'VARIE') return t.includes('trinket') || t.includes('misc') || t.includes('junk') || t.includes('valuable');
                return false;
            });
        }

        if(currentSection === 'PROGETTI') {
            const visibleCount = source.length; 
            const ownedCount = source.filter(i => ownedBlueprints.has(i.id)).length;
            const header = document.createElement('div');
            header.className = 'section-header-bp';
            header.style.gridColumn = '1/-1';
            header.innerHTML = `<div class="sh-title">PROGETTI</div><div class="sh-subtitle">TROVATO: <span style="color:var(--arc-white)">${ownedCount}</span> / <span style="color:#666">${visibleCount}</span></div>`;
            grid.appendChild(header);
        }

        source.forEach(data => {
            const isItem = !isBlueprint(data) && (currentSection !== 'OFFICINA' || isWishlistView);
            const rarity = (data.rarity||'common').toLowerCase();
            let imgUrl = getImg(data);
            if (currentSection === 'OFFICINA' && !isWishlistView) imgUrl = `${GITHUB_RAW_BASE_URL}images/menu/${data.id.toLowerCase()}.png`; 

            const slot = document.createElement('div');
            slot.className = `slot ${rarity}`;
            
            if (currentSection === 'PROGETTI') {
                if (ownedBlueprints.has(data.id)) {
                    slot.classList.add('owned');
                    slot.innerHTML += `<div class="bp-badge bp-owned">V</div>`;
                } else {
                    slot.classList.add('is-missing');
                }
            }

            if(adminMode && overridesDB[data.id]) slot.style.borderTop = "2px solid var(--arc-yellow)";
            
            let inner = "";
            if(imgUrl) {
                inner = `<img src="${imgUrl}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="slot-fallback-container" style="display:none; flex-direction:column; align-items:center; text-align:center; width:100%; height:100%; justify-content:center;">
                            <svg class="slot-fallback" viewBox="0 0 24 24"><path d="M12 2l-10 6 10 6 10-6-10-6zm0 14l-10-6v8l10 6 10-6v-8l-10 6z"/></svg>
                            <div class="fallback-text">${getLoc(data.name).substr(0,10)}</div>
                         </div>`;
            } else {
                inner = `<div class="slot-fallback-container" style="display:flex; flex-direction:column; align-items:center; text-align:center; width:100%; height:100%; justify-content:center;">
                            <svg class="slot-fallback" viewBox="0 0 24 24"><path d="M12 2l-10 6 10 6 10-6-10-6zm0 14l-10-6v8l10 6 10-6v-8l-10 6z"/></svg>
                            <div class="fallback-text">${getLoc(data.name).substr(0,10)}</div>
                         </div>`;
            }
            slot.innerHTML += inner;

            if(isItem) {
                if (currentSection !== 'PROGETTI') {
                    let controlsHtml = `
                    <div class="slot-controls">
                        <button class="wl-btn plus" onclick="modWishlist('${data.id}', 1, event)">+</button>
                        <button class="wl-btn minus" onclick="modWishlist('${data.id}', -1, event)">-</button>
                    </div>`;
                    slot.innerHTML += controlsHtml;
                    
                    if(wishlist.has(data.id) && !isWishlistView) slot.innerHTML += `<div class="wishlist-badge">${wishlist.get(data.id)}</div>`;
                    if(isWishlistView) slot.innerHTML += `<div style="position:absolute; top:2px; right:2px; color:var(--arc-yellow); font-weight:bold; font-size:0.8rem">x${data._wishQty}</div>`;
                }
            }

            slot.onmouseenter = (e) => { if(!isEditing && !isModalOpen) showTooltip(data, isItem, e); };
            slot.onmouseleave = () => { if(!isEditing) hideTooltip(); };
            slot.onmousemove = (e) => { if(!isEditing) moveTooltip(e); };
            
            slot.onclick = (e) => { 
                if(adminMode) { isEditing = true; openAdminEdit(data); } 
                else if (currentSection === 'PROGETTI' || isBlueprint(data)) toggleBlueprint(data.id, e); 
                else openInfoModal(data); 
            };
            
            grid.appendChild(slot);
        });
    }

    function toggleBlueprint(id, e) {
        if(e) e.stopPropagation();
        if (ownedBlueprints.has(id)) ownedBlueprints.delete(id); else ownedBlueprints.add(id);
        saveUserData(); updateUI(); render(); 
    }

    function modWishlist(id, delta, e) {
        e.stopPropagation();
        let currentVal = parseInt(wishlist.get(id) || 0);
        let newVal = currentVal + delta;
        if (newVal <= 0) wishlist.delete(id); else wishlist.set(id, newVal);
        saveUserData(); 
        if (isWishlistView) render(); else {
            const slot = e.target.closest('.slot');
            let badge = slot.querySelector('.wishlist-badge');
            if (newVal > 0) {
                if (!badge) { badge = document.createElement('div'); badge.className = 'wishlist-badge'; slot.appendChild(badge); }
                badge.innerText = newVal;
            } else if (badge) { badge.remove(); }
        }
    }

    function toggleAdminMode() {
        adminMode = !adminMode;
        document.getElementById('btnAdmin').classList.toggle('active');
        document.getElementById('btnExport').style.display = adminMode ? 'flex' : 'none';
        if(!adminMode) { isEditing = false; dom.tt.classList.remove('interactive', 'admin-overlay'); hideTooltip(); }
    }

    function openAdminEdit(data) {
        dom.tt.classList.add('interactive', 'admin-overlay');
        dom.tt.style.display = 'block'; dom.tt.style.left='50%'; dom.tt.style.top='50%'; dom.tt.style.transform='translate(-50%,-50%)'; 
        const html = `
            <div style="padding:25px; background:#111; color:#fff;">
                <h3 style="color:var(--arc-yellow); margin-bottom:20px; font-family:var(--font-head); font-size:2rem; text-transform:uppercase;">EDIT: ${data.id}</h3>
                <div class="edit-form">
                    <div class="edit-row"><span>Name (${currentLang}):</span> <input id="ed-name" class="edit-input" value="${getLoc(data.name).replace(/"/g, '&quot;')}"></div>
                    <div class="edit-row"><span>Desc:</span> <textarea id="ed-desc" class="edit-input">${getLoc(data.description)}</textarea></div>
                    <div class="edit-row"><span>Rarity:</span> 
                        <select id="ed-rarity" class="edit-input">
                            <option value="Common" ${data.rarity=='Common'?'selected':''}>Common</option>
                            <option value="Uncommon" ${data.rarity=='Uncommon'?'selected':''}>Uncommon</option>
                            <option value="Rare" ${data.rarity=='Rare'?'selected':''}>Rare</option>
                            <option value="Epic" ${data.rarity=='Epic'?'selected':''}>Epic</option>
                            <option value="Legendary" ${data.rarity=='Legendary'?'selected':''}>Legendary</option>
                        </select>
                    </div>
                    <div class="edit-row"><span>Value:</span> <input id="ed-val" type="number" class="edit-input" value="${data.value || 0}"></div>
                    <div class="edit-row"><span>Weight:</span> <input id="ed-w" type="number" step="0.1" class="edit-input" value="${data.weightKg || 0}"></div>
                    <div class="edit-row"><span>Stack:</span> <input id="ed-stack" type="number" class="edit-input" value="${data.stackSize || 1}"></div>
                    <div style="display:flex; gap:10px; margin-top:15px;">
                        <button onclick="saveEdit('${data.id}')" style="background:var(--arc-yellow); border:none; padding:10px 20px; font-family:var(--font-head); font-size:1.2rem; cursor:pointer;">SAVE</button>
                        <button onclick="closeAdmin()" style="background:#333; border:none; padding:10px 20px; font-family:var(--font-head); font-size:1.2rem; cursor:pointer; color:white;">CANCEL</button>
                    </div>
                </div>
            </div>`;
        dom.tt.innerHTML = html;
        isModalOpen = true; 
    }
    
    function saveEdit(id) {
        if(!overridesDB[id]) overridesDB[id] = {};
        if(!overridesDB[id].name) overridesDB[id].name = {};
        if(!overridesDB[id].description) overridesDB[id].description = {};
        overridesDB[id].name[currentLang] = document.getElementById('ed-name').value;
        overridesDB[id].description[currentLang] = document.getElementById('ed-desc').value;
        overridesDB[id].rarity = document.getElementById('ed-rarity').value;
        overridesDB[id].value = parseFloat(document.getElementById('ed-val').value);
        overridesDB[id].weightKg = parseFloat(document.getElementById('ed-w').value);
        overridesDB[id].stackSize = parseInt(document.getElementById('ed-stack').value);
        closeAdmin(); render();
    }
    function exportOverrides() {
        if(Object.keys(overridesDB).length === 0) { alert("No changes."); return; }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(overridesDB, null, 2));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr); anchor.setAttribute("download", "arc_overrides.json");
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
    }

    // --- CARD GENERATOR ---
    function generateCardHTML(data) {
        const name = getLoc(data.name) || data.id;
        const desc = getLoc(data.description);
        const rarity = (data.rarity || 'common').toUpperCase();
        let type = (data.type || 'ITEM').toUpperCase();
        
        if(data.levels) {
            const t = getUI('upgrades');
            type = (t !== 'UI_UPGRADES') ? t : "UPGRADES";
        } else {
            type = translateType(data.type) || type;
        }

        let tagColor = 'var(--col-common)';
        if(data.type && data.type.toLowerCase().includes('material')) tagColor = 'var(--col-material)';
        if(data.recyclesInto) tagColor = 'var(--col-recycle)'; 
        let rarColor = `var(--col-${rarity.toLowerCase()})`;
        
        const weight = (data.weightKg || 0).toString().replace('.', ',');
        const val = (data.value || 0).toLocaleString(currentLang);
        const stack = `${data.stackSize || 1}/${data.stackSize || 1}`;
        const pesoKey = `${GITHUB_RAW_BASE_URL}images/menu/weight.png`;
        const monetaKey = `${GITHUB_RAW_BASE_URL}images/menu/coins.png`;
        
        const pesoIconUrl = pesoKey; 
        const monetaIconUrl = monetaKey;

        let ecoHtml = "";
        if(data.foundIn) {
            const labelRaw = getUI('obtained_recycling');
            const labelClean = (labelRaw !== 'UI_OBTAINED_RECYCLING') ? labelRaw.replace('RICICLANDO', '') : "SOURCE";
            ecoHtml += `<div class="tt-found"><div class="tt-found-label">${labelClean} :</div><div class="tt-found-val"><svg><use href="#icon-arc"></use></svg> ${getLoc(data.foundIn)}</div></div>`;
        }

        return `
            <div style="background:var(--card-bg); color:var(--card-text);">
                <div class="tt-header">
                    <div class="tt-tag" style="background:${tagColor}"><svg style="width:16px;height:16px;fill:white;margin-right:4px;"><use href="#icon-wrench"></use></svg>${type}</div>
                    <div class="tt-tag" style="background:${rarColor}; margin-left:1px;">${rarity}</div>
                </div>
                <div class="tt-body">
                    <div class="tt-title">${name}</div>
                    <div class="tt-desc">${desc}</div>
                    ${ecoHtml}
                </div>
                <div class="tt-footer">
                    <div class="tt-foot-item"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" fill="#1a1a1a"></path></svg> ${stack}</div>
                    <div class="tt-foot-item"><img src="${pesoIconUrl}" style="height: 22px; width: auto; object-fit: contain;" onerror="this.style.display='none'" alt="Kg"> ${weight}</div>
                    <div class="tt-foot-item"><img src="${monetaIconUrl}" style="height: 22px; width: auto; object-fit: contain;" onerror="this.style.display='none'" alt="$"> ${val}</div>
                </div>
            </div>
        `;
    }

    function showTooltip(data, isItem, e) {
        if(isModalOpen) return; 
        dom.tt.innerHTML = generateCardHTML(data);
        dom.tt.style.display = 'block';
        moveTooltip(e);
    }
    function hideTooltip() { dom.tt.style.display = 'none'; }
    function moveTooltip(e) {
        if(isModalOpen) return; const t = dom.tt;
        let l = e.clientX + 20, tp = e.clientY + 20;
        if(l + 370 > window.innerWidth) l = e.clientX - 380;
        if(tp + t.offsetHeight > window.innerHeight) tp = e.clientY - t.offsetHeight;
        t.style.left = l + 'px'; t.style.top = tp + 'px';
    }

    function openInfoModal(data) {
        if(!data) return;
        hideTooltip(); isModalOpen = true; const modal = dom.infoModal;
        
        const uiCraft = getUI('crafting'); const txtCraft = (uiCraft !== 'UI_CRAFTING') ? uiCraft : "CRAFTING";
        const uiBench = getUI('bench'); const txtBench = (uiBench !== 'UI_BENCH') ? uiBench : "BENCH";
        const uiIng = getUI('ingredient'); const txtIng = (uiIng !== 'UI_INGREDIENT') ? uiIng : "INGREDIENT";
        const uiQty = getUI('qty'); const txtQty = (uiQty !== 'UI_QTY') ? uiQty : "QTY";
        
        let craftHtml = ''; let craftList = normalizeReqs(data.recipe); 
        if (craftList.length > 0 || data.craftBench) {
            craftHtml += `<div class="info-section"><div class="info-title">${txtCraft}</div>`;
            if (data.craftBench) {
                let benchName = String(data.craftBench).replace(/_/g, ' ').toUpperCase();
                craftHtml += `<div style="margin-bottom:10px; color:#aaa; font-size:0.9rem;"><span style="color:#fff; font-weight:700;">${txtBench}:</span> ${benchName}</div>`;
            }
            if (craftList.length > 0) {
                let rows = craftList.map(r => {
                    const ing = getItem(r.item); const name = ing ? getLoc(ing.name) : r.item;
                    let imgHtml = ''; if(ing) { const idLower = ing.id.toLowerCase(); imgHtml = `<img src="${GITHUB_RAW_BASE_URL}images/items/${idLower}.png" class="mini-icon" onerror="this.style.display='none'">`; }
                    const clickAttr = ing ? `onclick="closeInfoModal(); setTimeout(()=> openInfoModal(getItem('${ing.id}')), 100)" style="cursor:pointer; color:#fff; display:flex; align-items:center;"` : `style="color:#e0e0e0; display:flex; align-items:center;"`;
                    return `<tr><td ${clickAttr}>${imgHtml}${name}</td><td style="text-align:right; font-weight:700; color:var(--arc-yellow);">x${r.count}</td></tr>`;
                }).join('');
                craftHtml += `<table class="info-table" style="margin-top:5px;"><thead><tr><th>${txtIng}</th><th style="text-align:right;">${txtQty}</th></tr></thead><tbody>${rows}</tbody></table>`;
            }
            craftHtml += `</div>`;
        }
        
        const uiUp = getUI('upgrades'); const txtUp = (uiUp !== 'UI_UPGRADES') ? uiUp : "UPGRADES";
        const uiLvl = getUI('level'); const txtLvl = (uiLvl !== 'UI_LEVEL') ? uiLvl : "LEVEL";
        const uiTrack = getUI('track'); const txtTrack = (uiTrack !== 'UI_TRACK') ? uiTrack : "TRACK";

        let upgradesHtml = '';
        if (data.levels && Array.isArray(data.levels)) {
            upgradesHtml += `<div class="info-section"><div class="info-title">${txtUp}</div>`;
            data.levels.sort((a,b) => a.level - b.level).forEach(lvl => {
                const reqs = lvl.requirements;
                let rows = reqs.map(r => {
                    const ing = getItem(r.item); const name = ing ? getLoc(ing.name) : r.item;
                    let imgHtml = ''; if(ing) { const idLower = ing.id.toLowerCase(); imgHtml = `<img src="${GITHUB_RAW_BASE_URL}images/items/${idLower}.png" class="mini-icon" onerror="this.style.display='none'">`; } else { imgHtml = `<span style="width:32px;height:32px;display:inline-block;background:rgba(255,255,255,0.1);margin-right:10px;border-radius:2px;vertical-align:middle;"></span>`; }
                    const clickAttr = ing ? `onclick="closeInfoModal(); setTimeout(()=> openInfoModal(getItem('${ing.id}')), 100)"` : '';
                    const cursorStyle = ing ? 'cursor:pointer;' : '';
                    return `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222; padding:4px 0;"><div ${clickAttr} style="display:flex; align-items:center; font-size:0.9rem; color:#ccc; ${cursorStyle}">${imgHtml}${name}</div><div style="color:var(--arc-yellow); font-weight:700;">x${r.count}</div></div>`;
                }).join('');
                const reqsString = encodeURIComponent(JSON.stringify(reqs));
                upgradesHtml += `<details class="upgrade-level"><summary><span>${txtLvl} ${lvl.level}</span><button class="btn-track" onclick="event.preventDefault(); addReqsToWishlist('${reqsString}', this)"><svg style="width:14px;height:14px;fill:currentColor; margin-right:5px;"><use href="#icon-plus"></use></svg> ${txtTrack}</button></summary><div style="padding:10px;">${rows || '<div style="color:#666">No data</div>'}</div></details>`;
            });
            upgradesHtml += `</div>`;
        }

        const uiRec = getUI('recycle'); const txtRec = (uiRec !== 'UI_RECYCLE') ? uiRec : "RECYCLE";
        const uiItem = getUI('item'); const txtItem = (uiItem !== 'UI_ITEM') ? uiItem : "ITEM";
        const uiValU = getUI('val_u'); const txtValU = (uiValU !== 'UI_VAL_U') ? uiValU : "VAL/U";
        const uiTot = getUI('tot'); const txtTot = (uiTot !== 'UI_TOT') ? uiTot : "TOT";
        const uiTotRec = getUI('tot_recycle'); const txtTotRec = (uiTotRec !== 'UI_TOT_RECYCLE') ? uiTotRec : "TOTAL SCRAP";
        const uiSell = getUI('sell_val'); const txtSell = (uiSell !== 'UI_SELL_VAL') ? uiSell : "SELL VALUE";

        let rawRecycle = data.recyclesInto || data.salvagesInto; let recycleList = normalizeReqs(rawRecycle); let recycleHtml = '';
        if (recycleList.length > 0) {
            recycleHtml += `<div class="info-section"><div class="info-title">${txtRec}</div>`;
            let totalRecycleVal = 0;
            let rows = recycleList.map(r => {
                const ing = getItem(r.item); const name = ing ? getLoc(ing.name) : r.item;
                const unitVal = ing ? (ing.value || 0) : 0; const totalVal = unitVal * r.count; totalRecycleVal += totalVal;
                let imgHtml = ''; if(ing) { const idLower = ing.id.toLowerCase(); imgHtml = `<img src="${GITHUB_RAW_BASE_URL}images/items/${idLower}.png" class="mini-icon" onerror="this.style.display='none'">`; }
                const clickAttr = ing ? `onclick="closeInfoModal(); setTimeout(()=> openInfoModal(getItem('${ing.id}')), 100)" style="cursor:pointer; display:flex; align-items:center;"` : `style="display:flex; align-items:center;"`;
                return `<tr><td ${clickAttr}>${imgHtml}${name}</td><td>x${r.count}</td><td>${unitVal}</td><td>${totalVal}</td></tr>`;
            }).join('');
            const diffClass = totalRecycleVal > (data.value||0) ? 'val-better' : (totalRecycleVal < (data.value||0) ? 'val-worse' : 'val-neutral');
            recycleHtml += `<table class="info-table"><thead><tr><th>${txtItem}</th><th>${txtQty}</th><th>${txtValU}</th><th>${txtTot}</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3" style="text-align:right;">${txtTotRec}:</td><td class="val-total ${diffClass}">${totalRecycleVal}</td></tr><tr><td colspan="3" style="text-align:right;">${txtSell}:</td><td class="val-total">${data.value||0}</td></tr></tfoot></table></div>`;
        }
        
        const uiObt = getUI('obtained_recycling'); const txtObt = (uiObt !== 'UI_OBTAINED_RECYCLING') ? uiObt : "OBTAINED BY SCRAPPING";

        let reverseRecycleHtml = ''; let sourceItems = [];
        itemsDB.forEach(potentialSource => {
            let outcomes = normalizeReqs(potentialSource.recyclesInto || potentialSource.salvagesInto);
            let match = outcomes.find(o => o.item === data.id);
            if (match) sourceItems.push({ item: potentialSource, yield: match.count });
        });
        if (sourceItems.length > 0) {
            reverseRecycleHtml += `<div class="info-section"><div class="info-title">${txtObt}</div>`;
            let rrRows = sourceItems.map(src => {
                const ing = src.item; const name = ing ? getLoc(ing.name) : 'Unknown';
                let imgHtml = ''; if(ing) { const idLower = ing.id.toLowerCase(); imgHtml = `<img src="${GITHUB_RAW_BASE_URL}images/items/${idLower}.png" class="mini-icon" onerror="this.style.display='none'">`; }
                return `<tr><td style="display:flex; align-items:center; cursor:pointer;" onclick="closeInfoModal(); setTimeout(()=> openInfoModal(getItem('${ing.id}')), 100)">${imgHtml}${name}</td><td style="text-align:right; font-weight:700; color:var(--arc-yellow);">x${src.yield}</td></tr>`;
            }).join('');
            reverseRecycleHtml += `<table class="info-table"><tbody>${rrRows}</tbody></table></div>`;
        }

        const uiUsed = getUI('used_for'); const txtUsed = (uiUsed !== 'UI_USED_FOR') ? uiUsed : "USED FOR";
        const uiNoUse = getUI('no_usage'); const txtNoUse = (uiNoUse !== 'UI_NO_USAGE') ? uiNoUse : "NO USAGE FOUND";

        let usedInHtml = '';
        if (!data.levels && !data.requirements) {
            usedInHtml += `<div class="info-section"><div class="info-title">${txtUsed}</div>`;
            let usages = [];
            itemsDB.forEach(i => { if(i.recipe) { let recipe = normalizeReqs(i.recipe); const found = recipe.find(req => req.item === data.id); if(found) usages.push({ parent: i, reqs: recipe, type: 'CRAFT' }); } });
            hideoutDB.forEach(h => { if (h.levels) { h.levels.forEach(lvl => { let reqs = lvl.requirements; const found = reqs.find(req => req.item === data.id); if(found) usages.push({ parent: h, reqs: reqs, type: `HIDEOUT LVL ${lvl.level}` }); }); } });

            if (usages.length > 0) {
                usages.forEach(usage => {
                    const parentName = getLoc(usage.parent.name) || usage.parent.id;
                    let parentImgHtml = ''; const pImgUrl = getImg(usage.parent);
                    if(pImgUrl) { parentImgHtml = `<img src="${pImgUrl}" class="mini-icon" onerror="this.style.display='none'" style="width:40px; height:40px;">`; } 
                    else { const pidLower = usage.parent.id.toLowerCase(); parentImgHtml = `<img src="${GITHUB_RAW_BASE_URL}images/menu/${pidLower}.png" class="mini-icon" style="width:40px; height:40px;" onerror="this.style.display='none'">`; }
                    const pId = usage.parent.id;
                    const parentOnClick = `onclick="closeInfoModal(); setTimeout(()=> openInfoModal(getItem('${pId}')), 100)"`;
                    let reqRows = usage.reqs.map(r => {
                        const ing = getItem(r.item); const name = ing ? getLoc(ing.name) : r.item; const isMe = r.item === data.id; const style = isMe ? 'recipe-hl' : '';
                        let ingImgHtml = ''; if(ing) { const iImgUrl = getImg(ing); if(iImgUrl) ingImgHtml = `<img src="${iImgUrl}" class="mini-icon" onerror="this.style.display='none'">`; else { const iidLower = ing.id.toLowerCase(); imgHtml = `<img src="${GITHUB_RAW_BASE_URL}images/items/${iidLower}.png" class="mini-icon" onerror="this.style.display='none'">`; } }
                        const ingOnClick = ing ? `onclick="closeInfoModal(); setTimeout(()=> openInfoModal(getItem('${ing.id}')), 100)"` : '';
                        const ingCursor = ing ? 'cursor:pointer;' : '';
                        return `<div class="recipe-row ${style}" ${ingOnClick} style="${ingCursor} display:flex; align-items:center;"><span style="display:flex; align-items:center;">${ingImgHtml}${name}</span><span>x${r.count}</span></div>`;
                    }).join('');
                    usedInHtml += `<div style="background:#111; padding:10px; margin-bottom:10px; border-left:3px solid var(--arc-yellow);"><div ${parentOnClick} style="cursor:pointer; font-weight:bold; margin-bottom:5px; color:#fff; text-transform:uppercase; display:flex; align-items:center;">${parentImgHtml} ${parentName} <span style="font-size:0.7rem; color:#666; margin-left:5px;">${usage.type}</span></div><div style="padding-left:5px;">${reqRows}</div></div>`;
                });
            } else { usedInHtml += `<div style="color:#666; padding:10px;">${txtNoUse}</div>`; }
            usedInHtml += `</div>`;
        }

        modal.innerHTML = `<div class="overlay-header"><div class="overlay-title">${getLoc(data.name)}</div><button class="overlay-close" onclick="closeInfoModal()">×</button></div><div class="overlay-scrollable-content">${craftHtml || upgradesHtml || recycleHtml || reverseRecycleHtml || usedInHtml ? (craftHtml + upgradesHtml + recycleHtml + reverseRecycleHtml + usedInHtml) : '<div style="text-align:center; color:#666; margin-top:20px; font-family:var(--font-ui);">NESSUN DATO TECNICO DISPONIBILE</div>'}</div>`;
        dom.modalBackdrop.style.display = 'block'; modal.style.display = 'flex'; 
    }

// Initialize on Load (Boot Sequence Step 0)
document.addEventListener('DOMContentLoaded', () => { initApp(); });

// Reset database on logo click
(function(){
  function resetDatabase(){
    try{ itemsDB=[]; hideoutDB=[]; overridesDB={}; wishlist.clear(); ownedBlueprints.clear(); }catch(_){ }
    try{ localStorage.removeItem('arc_wishlist'); localStorage.removeItem('arc_blueprints'); }catch(_){ }
    try{ document.body.classList.remove('db-loaded'); dom.search.disabled=true; }catch(_){ }
    try{ var cw=document.querySelector('.connect-wrapper'); if(cw) cw.style.display='flex'; }catch(_){ }
    try{ currentSection='INVENTARIO'; setFilter('ALL'); render(); }catch(_){ }
    // Reset UI to intro state
    document.body.classList.remove('db-loaded');
  }
  try{ var logo=document.querySelector('.app-logo'); if(logo){ logo.style.cursor='pointer'; logo.addEventListener('click', resetDatabase); } }catch(_){ }
})();
;(() => { try { if (typeof connectToDatabase === 'function') window.connectToDatabase = connectToDatabase; } catch(_) {} })();
