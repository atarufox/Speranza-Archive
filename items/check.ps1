$files = Get-ChildItem .\*.json

$total = $files.Count
$perfectMatch = 0
$caseMismatch = 0
$totallyDifferent = 0
$missingId = 0

Write-Host "--- INIZIO AUDIT COERENZA ID/NOMEFILE ---`n" -ForegroundColor Cyan

$report = foreach ($f in $files) {
    $fileName = $f.BaseName
    
    try {
        $data = Get-Content $f.FullName -Raw | ConvertFrom-Json
    } catch {
        Write-Host "[ERRORE] Impossibile leggere $($f.Name)" -ForegroundColor Red
        continue
    }

    if (-not $data.id) {
        Write-Host "[MANCANTE] $($f.Name): Proprietà 'id' non trovata." -ForegroundColor Red
        $missingId++
    }
    elseif ($data.id -ceq $fileName) {
        # Corrispondenza perfetta
        $perfectMatch++
    }
    elseif ($data.id -eq $fileName) {
        # Uguali ma con maiuscole diverse (es. Vase vs vase)
        Write-Host "[CASE] $($f.Name): File dice '$fileName', JSON dice '$($data.id)'" -ForegroundColor Yellow
        $caseMismatch++
    }
    else {
        # Nomi proprio diversi
        Write-Host "[DIVERSO] $($f.Name): File dice '$fileName', JSON dice '$($data.id)'" -ForegroundColor Magenta
        $totallyDifferent++
    }
}

# --- Riepilogo Statistico ---
$errati = $caseMismatch + $totallyDifferent + $missingId

Write-Host "`n" + ("="*40) -ForegroundColor White
Write-Host "RISULTATI AUDIT" -ForegroundColor White
Write-Host ("="*40) -ForegroundColor White
Write-Host "File totali analizzati : $total"
Write-Host "ID Perfetti            : $perfectMatch" -ForegroundColor Green
Write-Host "ID con Maiuscole Errate: $caseMismatch" -ForegroundColor Yellow
Write-Host "ID Completamente Diversi: $totallyDifferent" -ForegroundColor Magenta
Write-Host "ID Mancanti nel JSON   : $missingId" -ForegroundColor Red
Write-Host ("="*40) -ForegroundColor White

if ($errati -eq 0) {
    Write-Host "TUTTO OK: La tua assunzione è corretta al 100%!" -ForegroundColor Green
} else {
    $perc = [math]::Round(($perfectMatch / $total) * 100, 2)
    Write-Host "ATTENZIONE: Solo il $perc% dei file è coerente." -ForegroundColor Yellow
    Write-Host "Puoi procedere con lo script di fix per correggere i $errati file problematici."
}