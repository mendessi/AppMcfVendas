import http.server
import socketserver
import os

# Porta para o servidor web
PORT = 5500

# Diretório atual como diretório web
web_dir = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=web_dir, **kwargs)
    
    def end_headers(self):
        # Adicionar cabeçalhos para evitar cache
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

print(f"Iniciando servidor na porta {PORT}...")
print(f"Abra o navegador e acesse: http://localhost:{PORT}/teste_empresa.html")
print("Pressione Ctrl+C para encerrar o servidor")

# Iniciar o servidor
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Servidor rodando em http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
