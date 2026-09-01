$files = Get-ChildItem .\*.json

$total = $files.Count
$report = @()

Write-Host "--- INIZIO AUDIT COERENZA (SOLO ERRORI) ---`n" -ForegroundColor Cyan

foreach ($f in $files) {
    $fileName = $f.BaseName
    
    try {
        $data = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        Write-Host "[ERRORE CRITICO] Impossibile leggere il file: $($f.Name)" -ForegroundColor Red
        continue
    }

    $jsonId = $data.id
    # Estraiamo il nome dell'immagine senza estensione
    $imageRef = if ($data.imageFilename) { [System.IO.Path]::GetFileNameWithoutExtension($data.imageFilename) } else { "MANCANTE" }

    # Confronto Case-Sensitive
    $idMatch = ($fileName -ceq $jsonId)
    $imageMatch = ($fileName -ceq $imageRef)
    $idVsImageMatch = ($jsonId -ceq $imageRef)

    # Determina lo stato
    $status = "OK"
    if (-not $idMatch -or -not $imageMatch) {
        if (-not $idMatch -and -not $imageMatch -and -not $idVsImageMatch) {
            $status = "CRITICO"
        } else {
            $status = "DISCREPANZA"
        }
    }

    # Memorizza i dati per il riepilogo finale
    $obj = [PSCustomObject]@{
        File           = $f.Name
        ID_JSON        = $jsonId
        Image_Ref      = $imageRef
        Match_ID       = if ($idMatch) { "SI" } else { "NO" }
        Match_Image    = if ($imageMatch) { "SI" } else { "NO" }
        ID_equals_Img  = if ($idVsImageMatch) { "SI" } else { "NO" }
        Stato          = $status
    }
    $report += $obj

    # OUTPUT CONSOLE: Solo se c'è un errore o discrepanza
    if ($status -ne "OK") {
        $msgColor = "Yellow"
        if ($status -eq "CRITICO") { $msgColor = "Red" }
        
        Write-Host "[$status] File: $($f.Name)" -ForegroundColor $msgColor
        if (-not $idMatch) { 
            Write-Host "   -> ID Errato: '$jsonId' (Dovrebbe essere '$fileName')" -ForegroundColor Gray 
        }
        if (-not $imageMatch) { 
            Write-Host "   -> Immagine Errata: '$imageRef' (Dovrebbe essere '$fileName')" -ForegroundColor Gray 
        }
        Write-Host "   ------------------------------------"
    }
}

# --- Riepilogo Finale ---
$errori = $report | Where-Object { $_.Stato -ne "OK" }
$countErrori = $errori.Count

# Colore del riepilogo (compatibile con PS 5.1)
$summaryColor = "Green"
if ($countErrori -gt 0) { $summaryColor = "Yellow" }

Write-Host "`n" + ("="*60) -ForegroundColor White
Write-Host "RIEPILOGO FINALE" -ForegroundColor White
Write-Host ("="*60) -ForegroundColor White
Write-Host "File analizzati      : $total"
Write-Host "File OK              : $($total - $countErrori)" -ForegroundColor Green
Write-Host "File con problemi    : $countErrori" -ForegroundColor $summaryColor
Write-Host ("="*60) -ForegroundColor White

if ($countErrori -gt 0) {
    Write-Host "`nCONSIGLI PER IL FIX:" -ForegroundColor Cyan
    
    $fixRenameFile = $errori | Where-Object { $_.ID_equals_Img -eq "SI" -and $_.Match_ID -eq "NO" }
    if ($fixRenameFile) {
        Write-Host "- In $($fixRenameFile.Count) casi ID e Immagine sono uguali. Ti conviene RINOMINARE IL FILE fisico."
    }

    $fixJson = $errori | Where-Object { $_.Match_ID -eq "NO" -and $_.Match_Image -eq "SI" }
    if ($fixJson) {
        Write-Host "- In $($fixJson.Count) casi il file punta all'immagine corretta. Ti conviene correggere l'ID dentro il JSON."
    }
} else {
    Write-Host "Nessuna azione richiesta. Tutti i file sono coerenti!" -ForegroundColor Green
}