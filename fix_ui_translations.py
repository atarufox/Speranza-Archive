import json

# Traduzioni corrette per le chiavi UI mancanti
translations = {
    "obtained_recycling": {
        "ITA": "Ottenuto dal Riciclo",
        "ENG": "Obtained from Recycling",
        "ESP": "Obtenido del Reciclaje",
        "FRA": "Obtenu par Recyclage",
        "DEU": "Durch Recycling Erhalten"
    },
    "recycles_into": {
        "ITA": "Si Ricicla In",
        "ENG": "Recycles Into",
        "ESP": "Se Recicla En",
        "FRA": "Se Recycle En",
        "DEU": "Recycelt Zu"
    },
    "track": {
        "ITA": "Traccia",
        "ENG": "Track",
        "ESP": "Rastrear",
        "FRA": "Suivre",
        "DEU": "Verfolgen"
    },
    "added": {
        "ITA": "Aggiunto",
        "ENG": "Added",
        "ESP": "Añadido",
        "FRA": "Ajouté",
        "DEU": "Hinzugefügt"
    },
    "upgrades": {
        "ITA": "Miglioramenti",
        "ENG": "Upgrades",
        "ESP": "Mejoras",
        "FRA": "Améliorations",
        "DEU": "Upgrades"
    },
    "bench": {
        "ITA": "Banco",
        "ENG": "Bench",
        "ESP": "Banco",
        "FRA": "Établi",
        "DEU": "Werkbank"
    },
    "used_for": {
        "ITA": "Usato Per",
        "ENG": "Used For",
        "ESP": "Usado Para",
        "FRA": "Utilisé Pour",
        "DEU": "Verwendet Für"
    },
    "no_usage_found": {
        "ITA": "Nessun utilizzo trovato",
        "ENG": "No usage found",
        "ESP": "No se encontró uso",
        "FRA": "Aucune utilisation trouvée",
        "DEU": "Keine Verwendung gefunden"
    },
    "crafting": {
        "ITA": "Creazione",
        "ENG": "Crafting",
        "ESP": "Fabricación",
        "FRA": "Artisanat",
        "DEU": "Herstellung"
    }
}

languages = ["ITA", "ENG", "ESP", "FRA", "DEU"]

for lang in languages:
    filepath = f"/workspace/languages/{lang}.json"
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Assicurati che esista la sezione UI
    if "UI" not in data:
        data["UI"] = {}
    
    # Aggiungi/aggiorna le traduzioni
    for key, trans in translations.items():
        data["UI"][key] = trans[lang]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Aggiornato {lang}.json")

print("\n✅ Tutte le traduzioni UI sono state aggiornate!")
