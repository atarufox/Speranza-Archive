$files = Get-ChildItem .\*.json

Write-Host "--- INIZIO CORREZIONE E STANDARDIZZAZIONE JSON (Safe Mode) ---" -ForegroundColor Cyan

foreach ($f in $files) {
    try {
        # 1. Legge il file UTF8
        $jsonRaw = Get-Content $f.FullName -Raw -Encoding UTF8
        $data = $jsonRaw | ConvertFrom-Json
        
        # 2. Verifica ID
        if (-not $data.id) { $data.id = $f.BaseName }
        $currentId = $data.id

        # 3. Aggiorna imageFilename
        if ($data.imageFilename) {
            $extension = [System.IO.Path]::GetExtension($data.imageFilename)
            if (-not $extension) { $extension = ".png" }
            $data.imageFilename =  "main/images/items/" + $currentId + $extension
        }

        # 4. RICOSTRUZIONE OGGETTO (per ordine campi)
        $newData = [ordered]@{ }
        foreach ($prop in $data.PSObject.Properties) {
            if ($prop.Name -ne "updatedAt" -and $prop.Name -ne "lastUpdate") {
                $newData[$prop.Name] = $prop.Value
            }
        }

        # 5. Aggiunge data come ultimo campo
        $newData["lastUpdate"] = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")

        # 6. Conversione in JSON standard
        # ConvertTo-Json crea correttamente le sequenze \" per le virgolette interne
        $jsonOut = $newData | ConvertTo-Json -Depth 100

        # 7. FIX CARATTERI SPECIALI (Solo Unicode \uXXXX)
        # Usiamo una Regex specifica che trasforma solo \uXXXX in caratteri reali
        # senza toccare le virgolette protette ( \") o i ritorni a capo (\n)
        $callback = {
            param($match)
            [char][int]("0x" + $match.Groups[1].Value)
        }
        $jsonOut = [regex]::Replace($jsonOut, "\\u([0-9a-fA-F]{4})", $callback)

        # 8. Salvataggio in UTF-8 senza BOM
        [System.IO.File]::WriteAllText($f.FullName, $jsonOut, [System.Text.Encoding]::UTF8)

        Write-Host "[OK] $($f.Name) processato correttamente." -ForegroundColor Green
    }
    catch {
        Write-Host "[ERRORE] In $($f.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n--- OPERAZIONE COMPLETATA ---" -ForegroundColor Cyan