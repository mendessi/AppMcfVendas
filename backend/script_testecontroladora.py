import sys
import os
from conexao_firebird import obter_conexao_controladora
import logging

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("teste_controladora.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def testar_conexao_controladora():
    try:
        logger.info("Tentando conectar à base controladora...")
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Teste 1: Verificar usuário master
        logger.info("\nVerificando usuário master...")
        cursor.execute("""
            SELECT 
                ID,
                EMAIL,
                NIVEL_ACESSO,
                ATIVO
            FROM USUARIOS_APP
            WHERE EMAIL = 'master'
        """)
        
        usuario = cursor.fetchone()
        if usuario:
            logger.info(f"""
Usuário Master:
    ID: {usuario[0]}
    Email: {usuario[1]}
    Nível: {usuario[2]}
    Ativo: {usuario[3]}
""")
        else:
            logger.error("Usuário master não encontrado!")
            return
        
        # Teste 2: Verificar empresas do master
        logger.info("\nVerificando empresas do master...")
        cursor.execute("""
            SELECT 
                c.CLI_CODIGO, 
                c.CLI_NOME,
                COALESCE(c.CLI_BLOQUEADOAPP, 'N') as CLI_BLOQUEADOAPP,
                COALESCE(c.CLI_MENSAGEM, '') as CLI_MENSAGEM,
                COALESCE(c.CLI_CAMINHO_BASE, '') as CLI_CAMINHO_BASE,
                COALESCE(c.cli_ip_servidor, '127.0.0.1') as cli_ip_servidor,
                COALESCE(c.CLI_NOME_BASE, '') as CLI_NOME_BASE,
                COALESCE(c.CLI_PORTA, '3050') as CLI_PORTA,
                uc.ID as VINCULO_ID,
                uc.USUARIO_ID,
                ua.nivel_acesso
            FROM usuarios_clientes uc
            JOIN CLIENTES c ON c.CLI_CODIGO = uc.CLI_CODIGO
            JOIN usuarios_app ua ON ua.id = uc.USUARIO_ID
            WHERE ua.email = 'master'
            ORDER BY c.CLI_NOME
        """)
        
        empresas = cursor.fetchall()
        logger.info(f"\nTotal de empresas do master: {len(empresas)}")
        
        for empresa in empresas:
            logger.info(f"""
Empresa do Master:
    Código: {empresa[0]}
    Nome: {empresa[1]}
    Bloqueado: {empresa[2]}
    Mensagem: {empresa[3]}
    Caminho Base: {empresa[4]}
    IP Servidor: {empresa[5]}
    Nome Base: {empresa[6]}
    Porta: {empresa[7]}
    Vínculo ID: {empresa[8]}
    Usuário ID: {empresa[9]}
    Nível Acesso: {empresa[10]}
""")
        
        conn.close()
        logger.info("\nTeste concluído com sucesso!")
        
    except Exception as e:
        logger.error(f"Erro durante o teste: {str(e)}")
        raise

if __name__ == "__main__":
    try:
        testar_conexao_controladora()
    except Exception as e:
        logger.error(f"Erro fatal: {str(e)}")
        sys.exit(1) 