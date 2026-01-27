$files = Get-ChildItem .\*.json

Write-Host "--- INIZIO PULIZIA E STANDARDIZZAZIONE JSON ---" -ForegroundColor Cyan

foreach ($f in $files) {
    try {
        # 1. Legge il file con codifica UTF8
        $jsonRaw = Get-Content $f.FullName -Raw -Encoding UTF8
        $data = $jsonRaw | ConvertFrom-Json
        
        # 2. Verifica ID (fondamentale per rinominare l'immagine)
        if (-not $data.id) { 
            $data.id = $f.BaseName 
        }
        $currentId = $data.id

        # 3. Aggiorna imageFilename (id + estensione originale)
        if ($data.imageFilename) {
            $extension = [System.IO.Path]::GetExtension($data.imageFilename)
            if (-not $extension) { $extension = ".png" }
            $data.imageFilename = $currentId + $extension
        }

        # 4. RICOSTRUZIONE OGGETTO (per l'ordine dei campi)
        $newData = [ordered]@{ }
        
        # Copiamo tutte le proprietà tranne quelle che vogliamo gestire noi
        foreach ($prop in $data.PSObject.Properties) {
            if ($prop.Name -ne "updatedAt" -and $prop.Name -ne "lastUpdate") {
                $newData[$prop.Name] = $prop.Value
            }
        }

        # 5. Aggiungiamo il nuovo campo data come ULTIMO elemento
        $newData["lastUpdate"] = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")

        # 6. Conversione in JSON standard (formattato)
        $jsonOut = $newData | ConvertTo-Json -Depth 100

        # 7. FIX CARATTERI SPECIALI (Unicode Unescape)
        # Questo passaggio è vitale per Cinese, Arabo, Ebraico e Apostrofi particolari
        $jsonOut = [System.Text.RegularExpressions.Regex]::Unescape($jsonOut)

        # 8. Salvataggio in UTF-8 senza BOM (massima compatibilità universale)
        [System.IO.File]::WriteAllText($f.FullName, $jsonOut, [System.Text.Encoding]::UTF8)

        Write-Host "[OK] $($f.Name): rimosso 'updatedAt', aggiunto 'lastUpdate'." -ForegroundColor Green
    }
    catch {
        Write-Host "[ERRORE] Impossibile processare $($f.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n--- OPERAZIONE COMPLETATA ---" -ForegroundColor Cyan