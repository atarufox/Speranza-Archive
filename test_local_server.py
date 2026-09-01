import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = "/workspace"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Aggiungi header CORS per permettere il caricamento dei file locali
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

os.chdir(DIRECTORY)
with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Server attivo su http://localhost:{PORT}")
    print(f"Premi Ctrl+C per fermare")
    httpd.serve_forever()
