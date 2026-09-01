#!/usr/bin/env python3
import json
import os
import shutil
from pathlib import Path

INVENTORY_DIR = Path("/workspace/items/inventory")
BLUEPRINTS_DIR = Path("/workspace/items/blueprints")
COSMETICS_DIR = Path("/workspace/items/cosmetics")

def load_json(path):
    # Prova prima con utf-8-sig per gestire BOM, poi utf-8 normale
    try:
        with open(path, 'r', encoding='utf-8-sig') as f:
            return json.load(f)
    except:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def is_blueprint(filename):
    return 'blueprint' in filename.lower()

def merge_italian_description(existing_data, new_data):
    """Preserva la descrizione italiana esistente se presente"""
    if 'description' in existing_data and 'description' in new_data:
        existing_it = existing_data['description'].get('it')
        if existing_it:
            new_data['description']['it'] = existing_it
    
    if 'name' in existing_data and 'name' in new_data:
        existing_it = existing_data['name'].get('it')
        if existing_it:
            new_data['name']['it'] = existing_it
    
    return new_data

def main():
    moved_count = 0
    updated_count = 0
    
    # 1. Sposta blueprint da inventory a blueprints
    print("=== Spostamento blueprint da inventory ===")
    for inv_file in INVENTORY_DIR.glob("*.json"):
        if is_blueprint(inv_file.name):
            dest = BLUEPRINTS_DIR / inv_file.name
            
            # Controlla se esiste già nella destinazione
            existing_bp = None
            if dest.exists():
                existing_bp = load_json(dest)
            
            current_data = load_json(inv_file)
            
            # Se esiste già, unisci preservando l'italiano
            if existing_bp:
                merged = merge_italian_description(existing_bp, current_data)
                save_json(dest, merged)
                print(f"  Aggiornato {inv_file.name} (preservato italiano)")
            else:
                save_json(dest, current_data)
                print(f"  Spostato {inv_file.name}")
            
            os.remove(inv_file)
            moved_count += 1
    
    # 2. Sposta blueprint da cosmetics a blueprints
    print("\n=== Spostamento blueprint da cosmetics ===")
    for cos_file in COSMETICS_DIR.glob("*.json"):
        if is_blueprint(cos_file.name):
            dest = BLUEPRINTS_DIR / cos_file.name
            
            existing_bp = None
            if dest.exists():
                existing_bp = load_json(dest)
            
            current_data = load_json(cos_file)
            
            if existing_bp:
                merged = merge_italian_description(existing_bp, current_data)
                save_json(dest, merged)
                print(f"  Aggiornato {cos_file.name} (preservato italiano)")
            else:
                save_json(dest, current_data)
                print(f"  Spostato {cos_file.name}")
            
            os.remove(cos_file)
            moved_count += 1
    
    print(f"\n=== Completato ===")
    print(f"File spostati: {moved_count}")
    print(f"File aggiornati: {updated_count}")

if __name__ == "__main__":
    main()
