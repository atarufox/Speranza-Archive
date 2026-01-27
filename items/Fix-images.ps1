$files = Get-ChildItem .\*.json

$total = $files.Count
$fixedId = 0
$fixedImage = 0
$fixedDate = 0
$errors = 0

foreach ($f in $files) {
    $filePath = $f.FullName
    $expectedId = $f.BaseName 

    try {
        $jsonRaw = Get-Content $filePath -Raw -ErrorAction Stop
        $data = $jsonRaw | ConvertFrom-Json
    } catch {
        Write-Host "[ERRORE] JSON corrotto: $($f.Name)" -ForegroundColor Red
        $errors++
        continue
    }

    $isChanged = $false

    # --- 1) Controllo ID ---
    if ($data.id -cne $expectedId) {
        Write-Host "[ID] Correzione: '$($data.id)' -> '$expectedId' in $($f.Name)" -ForegroundColor Cyan
        $data.id = $expectedId
        $isChanged = $true
        $fixedId++
    }

    # --- 2) Controllo imageFilename ---
    $expectedImage = "images/items/$expectedId.png"
    
    # Verifica se la proprietà esiste proprio
    if (-not $data.PSObject.Properties['imageFilename']) {
        Write-Host "[IMG] Proprietà mancante in $($f.Name). Creazione in corso..." -ForegroundColor DarkYellow
        # Aggiungiamo la proprietà se manca
        $data | Add-Member -MemberType NoteProperty -Name "imageFilename" -Value $expectedImage
        $isChanged = $true
        $fixedImage++
    } 
    elseif ($data.imageFilename -cne $expectedImage) {
        Write-Host "[IMG] Correzione path: $($data.imageFilename) -> $expectedImage" -ForegroundColor Gray
        $data.imageFilename = $expectedImage
        $isChanged = $true
        $fixedImage++
    }

    # --- 3) Aggiornamento e riordino (updatedAt sempre ultimo) ---
    if ($isChanged) {
        $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        
        # Costruiamo il nuovo oggetto ordinato
        $newObject = [ordered]@{}
        
        # Mettiamo ID per primo (opzionale, ma consigliato per ordine)
        $newObject["id"] = $data.id
        
        # Copiamo tutte le altre proprietà tranne id e updatedAt
        foreach ($prop in $data.PSObject.Properties) {
            if ($prop.Name -ne "id" -and $prop.Name -ne "updatedAt") {
                $newObject[$prop.Name] = $prop.Value
            }
        }
        
        # Mettiamo updatedAt alla fine
        $newObject["updatedAt"] = $now
        $fixedDate++

        # --- 4) Scrittura File ---
        $jsonString = $newObject | ConvertTo-Json -Depth 10
        [System.IO.File]::WriteAllText($filePath, $jsonString, [System.Text.Encoding]::UTF8)
        
        Write-Host "[OK] File $($f.Name) aggiornato." -ForegroundColor Green
    }
}

# --- Riepilogo ---
Write-Host "`n" + ("="*30)
Write-Host "RIEPILOGO MODIFICHE"
Write-Host ("="*30)
Write-Host "File totali        : $total"
Write-Host "ID sistemati       : $fixedId"
Write-Host "Immagini sistemate : $fixedImage (incluse quelle create da zero)"
Write-Host "updatedAt creati   : $fixedDate"
Write-Host "Errori             : $errors"
Write-Host ("="*30)