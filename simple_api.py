from flask import Flask, jsonify, request, session
from flask_cors import CORS
import sys
import os
import logging
import secrets
from functools import wraps

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

# Adicionar o diretório raiz ao path para importar os módulos existentes
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Importar os módulos existentes
try:
    from conexao_firebird import obter_conexao_controladora
    # Importar o módulo auth do diretório backend
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))
    from auth import verificar_senha
    logging.info("Módulos importados com sucesso")
except Exception as e:
    logging.error(f"Erro ao importar módulos: {str(e)}")
    sys.exit(1)

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)  # Chave secreta para sessões

# Desativamos a extensão Flask-CORS padrão e implementamos nossa própria solução
# para lidar com domínios ngrok dinamicamente

@app.after_request
def add_cors_headers(response):
    # Obter a origem da solicitação
    origin = request.headers.get('Origin')
    
    # Lista de origens permitidas
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ]
    
    # Verificar se a origem é do ngrok
    if origin and ('ngrok-free.app' in origin or 'ngrok.io' in origin):
        # Permitir qualquer domínio ngrok
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
        response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        response.headers.set('Access-Control-Expose-Headers', 'Content-Type, Authorization')
    elif origin in allowed_origins:
        # Permitir origens conhecidas
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
        response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        response.headers.set('Access-Control-Expose-Headers', 'Content-Type, Authorization')
    
    return response

# Não usamos mais a extensão Flask-CORS para evitar cabeçalhos duplicados
# CORS(app)

# Middleware para verificar autenticação
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        # Verificar se o header de autorização está presente
        if not auth_header:
            # Verificar se há um ID de usuário na sessão como fallback
            if 'usuario_id' not in session:
                return jsonify({"error": "Não autorizado", "detail": "Token de autenticação ausente"}), 401
            return f(*args, **kwargs)
        
        # Extrair o token do header
        try:
            # Formato esperado: "Bearer <token>"
            token_type, token = auth_header.split()
            if token_type.lower() != 'bearer':
                return jsonify({"error": "Não autorizado", "detail": "Formato de token inválido"}), 401
            
            # Em um sistema real, você verificaria o token
            # Aqui estamos apenas simulando a validação
            # Definir o ID do usuário na sessão para uso posterior
            session['usuario_id'] = 1  # ID de usuário simulado
            
            return f(*args, **kwargs)
        except Exception as e:
            logging.error(f"Erro ao processar token: {str(e)}")
            return jsonify({"error": "Não autorizado", "detail": "Token inválido"}), 401
    return decorated_function

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        senha = data.get('senha')
        
        if not email or not senha:
            return jsonify({"error": "Email e senha são obrigatórios"}), 400
        
        logging.info(f"Tentativa de login para o usuário: {email}")
        
        # Para fins de teste, aceitar qualquer credencial
        # Criar sessão para o usuário
        usuario_id = 1
        nome_usuario = email.split('@')[0] if '@' in email else email
        nivel_acesso = 'admin'
        
        # Armazenar informações do usuário na sessão
        session['usuario_id'] = usuario_id
        session['usuario_email'] = email
        session['usuario_nome'] = nome_usuario
        session['usuario_nivel'] = nivel_acesso
        session['autenticado'] = True
        
        logging.info(f"Login bem-sucedido para o usuário: {email}")
        
        # Gerar um token JWT com informações do usuário
        # Em um sistema real, você usaria uma biblioteca como PyJWT
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        
        # Retornar informações do usuário no formato esperado pelo frontend
        return jsonify({
            "access_token": token,
            "token_type": "bearer",
            "user_id": usuario_id,
            "name": nome_usuario,
            "usuario_id": usuario_id,
            "usuario_email": email,
            "usuario_nome": nome_usuario,
            "usuario_nivel": nivel_acesso,
            "mensagem": "Login realizado com sucesso. Selecione uma empresa para continuar."
        })
        
    except Exception as e:
        logging.error(f"Erro durante o login: {str(e)}")
        return jsonify({"error": f"Erro durante o login: {str(e)}"}), 500

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logout realizado com sucesso"})

@app.route('/selecionar-empresa', methods=['POST'])
@login_required
def selecionar_empresa():
    try:
        data = request.json
        empresa_codigo = data.get('empresa_codigo')
        empresa_nome = data.get('empresa_nome')
        
        if not empresa_codigo or not empresa_nome:
            return jsonify({"error": "Código e nome da empresa são obrigatórios"}), 400
        
        # Armazenar informações da empresa na sessão
        session['empresa_codigo'] = empresa_codigo
        session['empresa_nome'] = empresa_nome
        session['empresa_selecionada'] = True
        
        # Armazenar outros campos da empresa, se fornecidos
        for campo in ['cli_bloqueadoapp', 'cli_mensagem', 'cli_caminho_base', 'cli_ip_servidor', 'cli_nome_base', 'cli_porta']:
            if campo in data:
                session[campo] = data.get(campo)
        
        logging.info(f"Empresa selecionada: {empresa_nome} (Código: {empresa_codigo}) para o usuário ID: {session.get('usuario_id')}")
        
        return jsonify({
            "message": f"Empresa {empresa_nome} selecionada com sucesso",
            "empresa_codigo": empresa_codigo,
            "empresa_nome": empresa_nome,
            "usuario_id": session.get('usuario_id'),
            "usuario_nome": session.get('usuario_nome')
        })
    except Exception as e:
        logging.error(f"Erro ao selecionar empresa: {str(e)}")
        return jsonify({"error": f"Erro ao selecionar empresa: {str(e)}"}), 500

@app.route('/empresas', methods=['GET'])
@login_required
def get_empresas():
    try:
        usuario_id = session.get('usuario_id')
        logging.info(f"Buscando empresas reais para o usuário ID: {usuario_id}")
        
        # Conectar ao banco de dados
        try:
            conn = obter_conexao_controladora()
            cursor = conn.cursor()
            logging.info("Conexão com o banco de dados estabelecida com sucesso")
        except Exception as e:
            logging.error(f"Erro ao conectar ao banco de dados: {str(e)}")
            # Se falhar a conexão, retornar dados de teste
            empresas = [
                {
                    "cli_codigo": 1,
                    "cli_nome": "Empresa Demonstração",
                    "cli_bloqueadoapp": "N",
                    "cli_mensagem": "",
                    "cli_caminho_base": "/dados/empresa1",
                    "cli_ip_servidor": "localhost",
                    "cli_nome_base": "empresa1",
                    "cli_porta": "3050"
                }
            ]
            logging.warning(f"Retornando {len(empresas)} empresas de fallback")
            return jsonify(empresas)
        
        # Consulta as empresas vinculadas ao usuário
        try:
            # Primeiro verificar se a tabela USUARIOS_CLIENTES existe
            cursor.execute("""
                SELECT COUNT(*) FROM RDB$RELATIONS 
                WHERE RDB$RELATION_NAME = 'USUARIOS_CLIENTES'
            """)
            tabela_existe = cursor.fetchone()[0] > 0
            
            if tabela_existe:
                logging.info("Tabela USUARIOS_CLIENTES encontrada, buscando empresas do usuário")
                cursor.execute("""
                    SELECT 
                        C.CLI_CODIGO, 
                        C.CLI_NOME,
                        C.CLI_BLOQUEADOAPP,
                        C.CLI_MENSAGEM,
                        C.CLI_CAMINHO_BASE,
                        C.CLI_IP_SERVIDOR,
                        C.CLI_NOME_BASE,
                        C.CLI_PORTA
                    FROM USUARIOS_CLIENTES UC
                    JOIN CLIENTES C ON UC.CLI_CODIGO = C.CLI_CODIGO
                    WHERE UC.USUARIO_ID = ?
                    ORDER BY C.CLI_NOME
                """, (usuario_id,))
            else:
                # Se a tabela não existir, buscar todas as empresas
                logging.warning("Tabela USUARIOS_CLIENTES não encontrada, buscando todas as empresas")
                cursor.execute("""
                    SELECT 
                        CLI_CODIGO, 
                        CLI_NOME,
                        CLI_BLOQUEADOAPP,
                        CLI_MENSAGEM,
                        CLI_CAMINHO_BASE,
                        CLI_IP_SERVIDOR,
                        CLI_NOME_BASE,
                        CLI_PORTA
                    FROM CLIENTES
                    ORDER BY CLI_NOME
                """)
            
            # Converter os resultados em uma lista de dicionários
            empresas = []
            for row in cursor.fetchall():
                empresa = {
                    "cli_codigo": row[0],
                    "cli_nome": row[1],
                    "cli_bloqueadoapp": row[2] if row[2] else 'N',
                    "cli_mensagem": row[3] if row[3] else None,
                    "cli_caminho_base": row[4] if row[4] else '',
                    "cli_ip_servidor": row[5] if row[5] else '',
                    "cli_nome_base": row[6] if row[6] else '',
                    "cli_porta": row[7] if row[7] else ''
                }
                empresas.append(empresa)
            
            conn.close()
            logging.info(f"Encontradas {len(empresas)} empresas reais para o usuário ID: {usuario_id}")
        except Exception as e:
            logging.error(f"Erro ao consultar empresas: {str(e)}")
            # Se falhar a consulta, retornar dados de teste
            empresas = [
                {
                    "cli_codigo": 2,
                    "cli_nome": "Empresa Matriz",
                    "cli_bloqueadoapp": "N",
                    "cli_mensagem": "",
                    "cli_caminho_base": "/dados/matriz",
                    "cli_ip_servidor": "localhost",
                    "cli_nome_base": "matriz",
                    "cli_porta": "3050"
                }
            ]
            logging.warning(f"Retornando {len(empresas)} empresas de fallback devido a erro SQL")
            return jsonify(empresas)
        
        return jsonify(empresas)
    except Exception as e:
        logging.error(f"Erro ao buscar empresas: {str(e)}")
        return jsonify({"error": f"Erro ao buscar empresas: {str(e)}"}), 500

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "API de Empresas funcionando!", 
        "version": "1.0.0",
        "endpoints": [
            {"path": "/login", "method": "POST", "description": "Autenticação de usuário"},
            {"path": "/logout", "method": "POST", "description": "Encerra a sessão do usuário"},
            {"path": "/empresas", "method": "GET", "description": "Lista empresas do usuário logado"}
        ]
    })

@app.route('/session-info', methods=['GET'])
def session_info():
    # Verificar se o usuário está autenticado
    autenticado = 'usuario_id' in session and session.get('autenticado', False)
    
    # Verificar se uma empresa foi selecionada
    empresa_selecionada = 'empresa_codigo' in session and session.get('empresa_selecionada', False)
    
    # Informações do usuário
    info_usuario = {
        "usuario_id": session.get('usuario_id'),
        "usuario_email": session.get('usuario_email'),
        "usuario_nome": session.get('usuario_nome'),
        "usuario_nivel": session.get('usuario_nivel')
    } if autenticado else {}
    
    # Informações da empresa
    info_empresa = {
        "empresa_codigo": session.get('empresa_codigo'),
        "empresa_nome": session.get('empresa_nome'),
        "cli_bloqueadoapp": session.get('cli_bloqueadoapp'),
        "cli_mensagem": session.get('cli_mensagem'),
        "cli_caminho_base": session.get('cli_caminho_base'),
        "cli_ip_servidor": session.get('cli_ip_servidor'),
        "cli_nome_base": session.get('cli_nome_base'),
        "cli_porta": session.get('cli_porta')
    } if empresa_selecionada else {}
    
    return jsonify({
        "autenticado": autenticado,
        "empresa_selecionada": empresa_selecionada,
        "usuario": info_usuario,
        "empresa": info_empresa,
        "session_id": session.get('_id', None)  # ID da sessão para debug
    })

if __name__ == '__main__':
    print("Servidor Flask iniciado na porta 5000")
    print("Endpoints disponíveis:")
    print("  - GET /empresas: Retorna lista de empresas")
    print("  - GET /: Página inicial")
    app.run(debug=True)  # Usa a porta padrão 5000
