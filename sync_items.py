#!/usr/bin/env python3
import json
import os
import shutil
from pathlib import Path

# Confronta e sincronizza gli item tra le due cartelle
workspace = Path("/workspace")
my_items_dir = workspace / "items" / "inventory"
source_items_dir = workspace / "arcraiders-data-temp" / "items"

# Carica tutti i miei item esistenti
my_items = set()
for f in my_items_dir.glob("*.json"):
    my_items.add(f.stem)

# Carica tutti gli item dalla sorgente (escludendo all*.json)
source_items = set()
for f in source_items_dir.glob("*.json"):
    if not f.name.startswith("all"):
        source_items.add(f.stem)

print(f"I miei item: {len(my_items)}")
print(f"Item sorgente: {len(source_items)}")

# Trova item mancanti
missing = source_items - my_items
print(f"Item mancanti: {len(missing)}")

# Mostra alcuni esempi
if missing:
    print("\nAlcuni item mancanti:")
    for item in list(missing)[:20]:
        print(f"  - {item}")

# Copia gli item mancanti mantenendo la struttura
for item_id in missing:
    src_file = source_items_dir / f"{item_id}.json"
    dst_file = my_items_dir / f"{item_id}.json"
    
    # Leggi il file sorgente
    with open(src_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Adatta la struttura se necessario
    # Controlla se craftBench è una lista o stringa
    if "craftBench" in data:
        if isinstance(data["craftBench"], list):
            # Prendi il primo elemento che non sia "in_raid"
            bench = next((b for b in data["craftBench"] if b != "in_raid"), data["craftBench"][0])
            data["craftBench"] = bench
    
    # Rimuovi campi non necessari o specifici della sorgente
    fields_to_remove = ["stationLevelRequired", "craftSkills", "addedIn", "vendors", "updatedAt"]
    for field in fields_to_remove:
        if field in data:
            del data[field]
    
    # Scrivi il file destinazione
    with open(dst_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

print(f"\nCopiati {len(missing)} item mancanti")
