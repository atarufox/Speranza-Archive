$files = Get-ChildItem .\*.json

$total = $files.Count
$fixedId = 0
$fixedImage = 0
$fixedDate = 0
$errors = 0

foreach ($f in $files) {
    $filePath = $f.FullName
    $fileName = $f.BaseName

    try {
        # Carica il JSON come oggetto PowerShell
        $jsonRaw = Get-Content $filePath -Raw -ErrorAction Stop
        $data = $jsonRaw | ConvertFrom-Json
    } catch {
        Write-Host "[ERRORE] File JSON non valido o illeggibile:" $f.Name -ForegroundColor Red
        $errors++
        continue
    }

    $isChanged = $false
    $skipWrite = $false

    # --- 1) Aggiorna ID ---
    if ($data.id -ne $fileName) {
        Write-Host "[CHECK] ID non corrisponde in: $($f.Name). Valore attuale: $($data.id)"
        $data.id = $fileName
        $isChanged = $true
        $fixedId++
    }

    # --- 2) Aggiorna imageFilename ---
    $expectedImage = "images/items/$fileName.png"
    
    # Se la proprietà non esiste, la creiamo
    if (-not $data.PSObject.Properties['imageFilename']) {
        $data | Add-Member -MemberType NoteProperty -Name "imageFilename" -Value $expectedImage
        $isChanged = $true
        $fixedImage++
        Write-Host "[AZIONE] Creato imageFilename mancante in: $($f.Name)"
    } else {
        # Se esiste, verifichiamo il valore
        if ($data.imageFilename -ne $expectedImage) {
            # Logica del tuo script originale: se differisce solo per maiuscole/minuscole correggi, altrimenti salta
            if ($data.imageFilename.ToLower() -eq $expectedImage.ToLower()) {
                $data.imageFilename = $expectedImage
                $isChanged = $true
                $fixedImage++
                Write-Host "[AZIONE] Corretta maiuscola in imageFilename: $($f.Name)"
            } else {
                Write-Host "[WARNING] imageFilename del tutto diversa in $($f.Name), ignoro il file." -ForegroundColor Yellow
                $skipWrite = $true
            }
        }
    }

    # --- 3) Aggiorna updatedAt (e forzalo alla fine) ---
    if (-not $skipWrite) {
        $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        
        # Per mettere updatedAt "alla fine", lo rimuoviamo (se esiste) e lo riaggiungiamo
        if ($data.PSObject.Properties['updatedAt']) {
            $data.PSObject.Properties.Remove('updatedAt')
        }
        $data | Add-Member -MemberType NoteProperty -Name "updatedAt" -Value $now
        $isChanged = $true
        $fixedDate++
    }

    # --- 4) Scrittura file ---
    if ($isChanged -and -not $skipWrite) {
        # Converti l'oggetto in stringa JSON (Depth 10 per gestire oggetti annidati)
        $jsonString = $data | ConvertTo-Json -Depth 10
        Set-Content -Path $filePath -Value $jsonString -Encoding UTF8
        Write-Host "[OK] File $($f.Name) aggiornato con successo." -ForegroundColor Green
    }
}

# --- Riepilogo finale ---
Write-Host "`nRIEPILOGO" -ForegroundColor Cyan
Write-Host "File totali        :" $total
Write-Host "ID corretti        :" $fixedId
Write-Host "imageFilename fix  :" $fixedImage
Write-Host "updatedAt fix      :" $fixedDate
Write-Host "File con problemi  :" $errors