from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Configurar CORS para permitir acesso de qualquer origem
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"]}})

# Lista de empresas de exemplo
empresas = [
    {"id": 1, "nome": "Empresa Exemplo A"},
    {"id": 2, "nome": "Empresa Exemplo B"},
    {"id": 3, "nome": "Empresa Exemplo C"},
    {"id": 4, "nome": "Empresa Exemplo D"}
]

@app.route('/empresas', methods=['GET'])
def get_empresas():
    return jsonify(empresas)

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "API de Empresas funcionando!", "version": "1.0.0"})

if __name__ == '__main__':
    print("Servidor Flask iniciado na porta 8080")
    print("Endpoints disponíveis:")
    print("  - GET /empresas: Retorna lista de empresas")
    print("  - GET /: Página inicial")
    app.run(host='0.0.0.0', port=8080, debug=True)
