import logging
import os
from conexao_firebird import obter_conexao_controladora
from auth import autenticar_usuario, obter_empresas_usuario
from dotenv import load_dotenv
import fdb
import json
from datetime import datetime

# Carrega as variáveis do .env
load_dotenv()

# Configurações do banco controlador
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', '3050'))  # Convertendo para inteiro
DB_NAME = os.getenv('DB_NAME', 'C:\\ERP_MACFIN\\Banco\\Erinalda\\BASE_PRI.GDB')
DB_USER = os.getenv('DB_USER', 'SYSDBA')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'masterkey')

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

async def testar_conexao_controladora():
    """Testa a conexão com a base controladora"""
    print("\n=== TESTE DE CONEXÃO COM BASE CONTROLADORA ===")
    try:
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Testa a conexão fazendo uma query simples
        cursor.execute("SELECT 1 FROM RDB$DATABASE")
        result = cursor.fetchone()
        
        print("✅ Conexão com base controladora estabelecida com sucesso!")
        print(f"Resultado do teste: {result}")
        
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Erro ao conectar na base controladora: {str(e)}")
        return False

async def testar_autenticacao(email: str, senha: str):
    """Testa a autenticação de um usuário"""
    print(f"\n=== TESTE DE AUTENTICAÇÃO PARA {email} ===")
    try:
        usuario = await autenticar_usuario(email, senha)
        if usuario:
            print("✅ Usuário autenticado com sucesso!")
            print(f"Dados do usuário: {usuario}")
            return usuario
        else:
            print("❌ Falha na autenticação: Usuário não encontrado ou senha incorreta")
            return None
    except Exception as e:
        print(f"❌ Erro durante autenticação: {str(e)}")
        return None

async def testar_empresas_usuario(usuario_id: int, email: str):
    """Testa a busca de empresas do usuário e exibe em formato de tabela"""
    print(f"\n=== TESTE DE BUSCA DE EMPRESAS PARA USUÁRIO {usuario_id} ===")
    try:
        empresas = obter_empresas_usuario(email)
        if empresas:
            print(f"\n{'ID':<4}{'USUARIO_ID':<12}{'EMAIL':<15}{'USUARIO_APP_ID':<16}{'CLI_CODIGO':<12}{'NIVEL_ACESSO':<13}{'CLI_NOME':<35}{'CLI_IP_SERVIDOR':<18}{'CLI_NOME_BASE':<15}{'CLI_PORTA':<10}{'CLI_MENSAGEM':<15}{'CLI_BLOQUEADOAPP':<17}{'CLI_CAMINHO_BASE':<30}")
            print('-'*200)
            for empresa in empresas:
                print(f"{str(empresa['id']):<4}{str(empresa['usuario_id']):<12}{empresa['email']:<15}{str(empresa['usuario_app_id']):<16}{str(empresa['cli_codigo']):<12}{empresa['nivel_acesso']:<13}{empresa['cli_nome']:<35}{empresa['cli_ip_servidor']:<18}{empresa['cli_nome_base']:<15}{empresa['cli_porta']:<10}{str(empresa['cli_mensagem']):<15}{empresa['cli_bloqueadoapp']:<17}{empresa['cli_caminho_base']:<30}")
            return empresas
        else:
            print("❌ Nenhuma empresa encontrada para este usuário")
            return []
    except Exception as e:
        print(f"❌ Erro ao buscar empresas: {str(e)}")
        return []

def conectar_banco():
    """Conecta ao banco de dados Firebird"""
    try:
        conn = fdb.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        print(f"Erro ao conectar ao banco: {str(e)}")
        return None

def obter_empresas_usuario(email):
    """Retorna todas as empresas do usuário"""
    try:
        conn = conectar_banco()
        if not conn:
            return None

        cur = conn.cursor()
        
        # Consulta para obter as empresas do usuário
        query = """
        SELECT
            uc.ID,
            uc.USUARIO_ID,
            ua.email,
            ua.id AS usuario_app_id,
            uc.CLI_CODIGO,
            ua.nivel_acesso,
            c.CLI_NOME,
            c.cli_ip_servidor,
            c.CLI_NOME_BASE,
            c.CLI_PORTA,
            c.CLI_MENSAGEM,
            c.CLI_BLOQUEADOAPP,
            c.CLI_CAMINHO_BASE
        FROM
            usuarios_clientes uc
        JOIN 
            CLIENTES c ON c.CLI_CODIGO = uc.CLI_CODIGO
        JOIN 
            usuarios_app ua ON ua.id = uc.USUARIO_ID
        WHERE 
            ua.email = ?
        """
        
        cur.execute(query, (email,))
        empresas = []
        
        for row in cur.fetchall():
            print("Linha bruta do banco:", row)  # Log detalhado
            empresa = {
                "id": int(row[0]) if row[0] is not None else 0,
                "usuario_id": int(row[1]) if row[1] is not None else 0,
                "email": str(row[2]) if row[2] is not None else "",
                "usuario_app_id": int(row[3]) if row[3] is not None else 0,
                "cli_codigo": int(row[4]) if row[4] is not None else 0,
                "nivel_acesso": str(row[5]) if row[5] is not None else "",
                "cli_nome": str(row[6]) if row[6] is not None else "",
                "cli_ip_servidor": str(row[7]) if row[7] is not None else "",
                "cli_nome_base": str(row[8]) if row[8] is not None else "",
                "cli_porta": str(row[9]) if row[9] is not None else "",
                "cli_mensagem": str(row[10]) if row[10] is not None else "",
                "cli_bloqueadoapp": str(row[11]) if row[11] is not None else "",
                "cli_caminho_base": str(row[12]) if row[12] is not None else ""
            }
            print("Empresa montada:", empresa)  # Log detalhado
            empresas.append(empresa)
        
        cur.close()
        conn.close()
        
        return empresas
        
    except Exception as e:
        print(f"Erro ao obter empresas: {str(e)}")
        return None

async def main():
    """Função principal de teste"""
    print("\n=== INICIANDO TESTES DE CONEXÃO E AUTENTICAÇÃO ===")
    
    # Testa conexão com base controladora
    if not await testar_conexao_controladora():
        print("❌ Testes interrompidos: Falha na conexão com base controladora")
        return
    
    # Testa autenticação com credenciais fixas
    email = "master"
    senha = "123"
    print(f"\nTestando com email: {email} e senha: {senha}")
    
    usuario = await testar_autenticacao(email, senha)
    if usuario:
        # Se autenticou, testa busca de empresas
        await testar_empresas_usuario(usuario["id"], email)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main()) 