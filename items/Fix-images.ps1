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
    if (-not $data.PSObject.Properties['imageFilename']) {
        $data | Add-Member -MemberType NoteProperty -Name "imageFilename" -Value $expectedImage
        $isChanged = $true
        $fixedImage++
    } 
    elseif ($data.imageFilename -cne $expectedImage) {
        $data.imageFilename = $expectedImage
        $isChanged = $true
        $fixedImage++
    }

    # --- 3) Aggiornamento e riordino (updatedAt sempre ultimo) ---
    if ($isChanged) {
        $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        
        $newObject = [ordered]@{}
        $newObject["id"] = $data.id
        foreach ($prop in $data.PSObject.Properties) {
            if ($prop.Name -ne "id" -and $prop.Name -ne "updatedAt") {
                $newObject[$prop.Name] = $prop.Value
            }
        }
        $newObject["updatedAt"] = $now
        $fixedDate++

        # --- 4) Conversione e FIX UNICODE ---
        $jsonString = $newObject | ConvertTo-Json -Depth 10 -Compress:($false)

        # Ripristiniamo i caratteri Unicode (Ebraico, Apostrofi, ecc.)
        # Cerchiamo le sequenze \uXXXX e le trasformiamo nei caratteri reali
        $jsonString = [regex]::Replace($jsonString, "\\u(?<Value>[a-zA-Z0-9]{4})", {
            param($m) [char][int]"0x$($m.Groups['Value'].Value)"
        })

        # --- 5) Scrittura File ---
        [System.IO.File]::WriteAllText($filePath, $jsonString, [System.Text.Encoding]::UTF8)
        
        Write-Host "[OK] File $($f.Name) salvato correttamente." -ForegroundColor Green
    }
}

Write-Host "`nRIEPILOGO FINALE" -ForegroundColor White
Write-Host "File analizzati : $total"
Write-Host "ID modificati   : $fixedId"
Write-Host "IMG modificati  : $fixedImage"
Write-Host "Date aggiornate : $fixedDate"
Write-Host "Errori          : $errors"