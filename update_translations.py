import json
import os

# Chiavi UI da aggiungere con traduzioni in inglese (base) e italiano
ui_keys_en = {
    "obtained_recycling": "Obtained from Recycling",
    "recycles_into": "Recycles Into",
    "track": "Track",
    "have": "Have",
    "missing": "Missing",
    "upgrades": "Upgrades",
    "all": "All",
    "bench": "Bench",
    "used_for": "Used For",
    "no_usage_found": "No usage found",
    "added": "Added"
}

ui_keys_it = {
    "obtained_recycling": "Ottenuto dal Riciclo",
    "recycles_into": "Si Ricicla In",
    "track": "Traccia",
    "have": "Posseduti",
    "missing": "Mancanti",
    "upgrades": "Miglioramenti",
    "all": "Tutti",
    "bench": "Banco",
    "used_for": "Usato Per",
    "no_usage_found": "Nessun utilizzo trovato",
    "added": "Aggiunto"
}

# Traduzioni approssimative per altre lingue (useremo inglese come fallback)
languages_dir = "/workspace/languages"

for filename in os.listdir(languages_dir):
    if not filename.endswith('.json'):
        continue
    
    filepath = os.path.join(languages_dir, filename)
    lang_code = filename.replace('.json', '')
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Assicuriamoci che esista la sezione UI
    if 'UI' not in data:
        data['UI'] = {}
    
    # Aggiungi chiavi mancanti
    updated = False
    for key, value_en in ui_keys_en.items():
        if key not in data['UI']:
            # Usa traduzione italiana se è il file italiano, altrimenti inglese
            if lang_code == 'it':
                data['UI'][key] = ui_keys_it[key]
            else:
                data['UI'][key] = value_en
            updated = True
    
    if updated:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Updated: {filename}")
    else:
        print(f"No changes: {filename}")

print("\nDone!")
