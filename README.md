# Speranza-Archives - Arc Raiders Database

Un database completo e localizzato per **ARC Raiders**, contenente oggetti, progetti (blueprint), cosmetici, missioni, eventi mappa e molto altro.

## 🌍 Lingue Supportate
Il sito è disponibile nelle seguenti lingue:
- **ITA** (Italiano)
- **ENG** (English)
- **ESP** (Español)
- **FRA** (Français)
- **DEU** (Deutsch)

## 📂 Struttura del Progetto

```
/workspace/
├── index.html              # Pagina principale del database
├── HTML/                   # Backup delle versioni precedenti
├── items/                  # Dati degli oggetti di gioco
│   ├── inventory/          # Oggetti standard (armi, munizioni, risorse)
│   ├── blueprints/         # Progetti di crafting
│   └── cosmetics/          | Oggetti cosmetici
├── languages/              # File di localizzazione JSON
│   ├── ITA.json
│   ├── ENG.json
│   ├── ESP.json
│   ├── FRA.json
│   └── DEU.json
├── quests/                 # Dati delle missioni
├── hideout/                # Dati del rifugio
├── map-events/             # Eventi della mappa
├── images/                 # Risorse grafiche
│   ├── items/              # Icone degli oggetti
│   ├── location_icons/     # Icone delle location (con tooltip localizzati)
│   └── ...
└── tools/                  # Utility e script vari
```

## ✨ Funzionalità

- **🔍 Ricerca e Filtri**: Cerca oggetti per nome, rarità, tipo o location
- **🌐 Localizzazione Completa**: Tutte le UI e descrizioni tradotte in 5 lingue
- **📍 Icone Location**: Visualizza dove trovare ogni oggetto con icone dedicate
- **🛠️ Crafting Info**: Dettagli su cosa costruire con ogni blueprint
- **📊 Statistiche Oggetto**: Danni, durata, effetti e altro
- **🎨 Interfaccia Game-Style**: Grafica ispirata all'interfaccia di gioco

## 🚀 Come Usare

### Opzione 1: GitHub Pages (Consigliato)
1. Carica questo repository su GitHub
2. Abilita GitHub Pages nelle impostazioni del repository
3. Accedi al sito tramite `https://<tuo-username>.github.io/<repo-name>/`

### Opzione 2: Server Locale
```bash
# Python 3
python -m http.server 8000

# Poi apri nel browser:
http://localhost:8000
```

### Opzione 3: Apertura Diretta
Apri semplicemente `index.html` nel tuo browser (alcune funzionalità potrebbero richiedere un server locale)

## 🔄 Aggiornamenti Recenti

- ✅ Pulizia e organizzazione file JSON (oggetti, blueprint, cosmetics separati)
- ✅ Sistema di localizzazione migliorato con 5 lingue
- ✅ Icone delle location con tooltip localizzati
- ✅ Correzione bug hover/tooltip
- ✅ Uniformità grafica tra tutte le sezioni
- ✅ Backup automatici delle versioni precedenti nella cartella `HTML/`

## 🛠️ Script di Manutenzione

- `sync_items.py`: Sincronizza gli oggetti dalle fonti esterne
- `sync_blueprints_cosmetics.py`: Gestisce blueprint e cosmetici
- `cleanup_items.py`: Pulisce e organizza i file JSON
- `update_translations.py`: Aggiorna i file di localizzazione

## 📝 Note

- I file backup vengono salvati automaticamente nella cartella `HTML/` prima di modifiche importanti
- Le icone delle location sono scaricate da [ARC Raiders Wiki](https://arcraiders.wiki/wiki/Category:Item_location_icons)
- Per aggiungere nuove lingue, crea un file JSON nella cartella `languages/` seguendo il formato esistente

## 🤝 Contributi

Sentiti libero di segnalare errori di traduzione, missing data o suggerire miglioramenti!

---

*Dati aggiornati alla versione v1.17.26 del gioco*