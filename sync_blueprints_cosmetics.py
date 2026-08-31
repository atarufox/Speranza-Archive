#!/usr/bin/env python3
import json
import os
from pathlib import Path

workspace = Path("/workspace")
my_blueprints_dir = workspace / "items" / "blueprints"
my_cosmetics_dir = workspace / "items" / "cosmetics"
source_items_dir = workspace / "arcraiders-data-temp" / "items"

# Funzione per classificare un item
def classify_item(data):
    """Classifica un item in base al suo tipo"""
    item_type = data.get("type", "")
    name_en = data.get("name", {}).get("en", "").lower()
    
    # I cosmetici hanno tipi specifici o nomi che indicano accessori
    cosmetic_keywords = ["outfit", "backpack", "emote", "gesture", "spray", "charm", "skin", "color"]
    
    if any(kw in name_en for kw in cosmetic_keywords):
        return "cosmetic"
    
    # I blueprint contengono "blueprint" nel nome o nell'ID
    if "blueprint" in data.get("id", "").lower():
        return "blueprint"
    
    # Se il tipo è Blueprint
    if "Blueprint" in item_type or "blueprint" in item_type.lower():
        return "blueprint"
    
    return "inventory"

# Carica tutti i blueprint e cosmetics esistenti
my_blueprints = set(f.stem for f in my_blueprints_dir.glob("*.json"))
my_cosmetics = set(f.stem for f in my_cosmetics_dir.glob("*.json"))

# Carica tutti gli item dalla sorgente
missing_blueprints = []
missing_cosmetics = []

for f in source_items_dir.glob("*.json"):
    if f.name.startswith("all"):
        continue
    
    with open(f, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    category = classify_item(data)
    item_id = f.stem
    
    if category == "blueprint" and item_id not in my_blueprints:
        missing_blueprints.append((item_id, data))
    elif category == "cosmetic" and item_id not in my_cosmetics:
        missing_cosmetics.append((item_id, data))

print(f"I miei blueprint: {len(my_blueprints)}")
print(f"I miei cosmetics: {len(my_cosmetics)}")
print(f"Blueprint mancanti: {len(missing_blueprints)}")
print(f"Cosmetics mancanti: {len(missing_cosmetics)}")

if missing_blueprints:
    print("\nAlcuni blueprint mancanti:")
    for item_id, _ in missing_blueprints[:10]:
        print(f"  - {item_id}")

if missing_cosmetics:
    print("\nAlcuni cosmetics mancanti:")
    for item_id, _ in missing_cosmetics[:10]:
        print(f"  - {item_id}")

# Copia i blueprint mancanti
for item_id, data in missing_blueprints:
    dst_file = my_blueprints_dir / f"{item_id}.json"
    
    # Adatta la struttura
    if "craftBench" in data and isinstance(data["craftBench"], list):
        bench = next((b for b in data["craftBench"] if b != "in_raid"), data["craftBench"][0])
        data["craftBench"] = bench
    
    fields_to_remove = ["stationLevelRequired", "craftSkills", "addedIn", "vendors", "updatedAt"]
    for field in fields_to_remove:
        if field in data:
            del data[field]
    
    with open(dst_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# Copia i cosmetics mancanti
for item_id, data in missing_cosmetics:
    dst_file = my_cosmetics_dir / f"{item_id}.json"
    
    fields_to_remove = ["stationLevelRequired", "craftSkills", "addedIn", "vendors", "updatedAt"]
    for field in fields_to_remove:
        if field in data:
            del data[field]
    
    with open(dst_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

print(f"\nCopiati {len(missing_blueprints)} blueprint e {len(missing_cosmetics)} cosmetics")
