Apri index.html dalla cartella locale.

Se vedi errori tipo 'Unexpected identifier src', di solito significa che la riga <script src=...> e' finita DENTRO un altro <script> (quindi il browser la interpreta come JavaScript).
In questo pacchetto la riga di include e' inserita appena prima di </body>.

Nota: da file:// alcune fetch verso GitHub API possono essere bloccate (CORS/origin null). In quel caso usa un micro-server locale per test (anche temporaneo).
