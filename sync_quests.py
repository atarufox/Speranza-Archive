#!/usr/bin/env python3
import json
from pathlib import Path

workspace = Path("/workspace")
my_quests_dir = workspace / "quests"
source_quests_dir = workspace / "arcraiders-data-temp" / "quests"

# Carica tutte le mie quest esistenti (per ID, non per filename)
my_quest_ids = set()
for f in my_quests_dir.glob("*.json"):
    if f.name.startswith("all"):
        continue
    with open(f, 'r', encoding='utf-8') as file:
        data = json.load(file)
        my_quest_ids.add(data.get("id", f.stem))

print(f"Mie quest IDs: {len(my_quest_ids)}")

# Carica tutte le quest dalla sorgente
missing_quests = []
for f in source_quests_dir.glob("*.json"):
    if f.name.startswith("all"):
        continue
    
    with open(f, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    quest_id = data.get("id", "")
    if quest_id and quest_id not in my_quest_ids:
        missing_quests.append((quest_id, data, f.name))

print(f"Quest mancanti: {len(missing_quests)}")

if missing_quests:
    print("\nAlcune quest mancanti:")
    for quest_id, _, filename in missing_quests[:15]:
        print(f"  - {quest_id} ({filename})")

# Copia le quest mancanti
for quest_id, data, filename in missing_quests:
    # Usa l'ID come nome file
    dst_file = my_quests_dir / f"{quest_id}.json"
    
    # Rimuovi campi non necessari
    fields_to_remove = ["updatedAt"]
    for field in fields_to_remove:
        if field in data:
            del data[field]
    
    with open(dst_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\nCopiate {len(missing_quests)} quest mancanti")
