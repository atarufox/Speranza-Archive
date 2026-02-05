Modifica per minimizzare chiamate GitHub

Cosa cambia
1; connectToDatabase non usa piu api.github.com; usa solo raw.githubusercontent.com
2; atteso un file bundle nel repo; path db/arc.bundle.json
3; initApp non fa piu HEAD per verificare lingue; lista lingue statica; un solo GET quando carichi la lingua

Bundle richiesto
db/arc.bundle.json deve avere almeno
{ "items": [ ... ], "hideout": [ ... ] }

Nota
Se il bundle non esiste; il connect fallisce con alert.
