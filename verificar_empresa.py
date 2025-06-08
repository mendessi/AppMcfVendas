#!/usr/bin/env python3
"""
Verificar a configuração da empresa 1 na base controladora
"""
import sys
import os

# Adicionar o backend ao path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_path)

from conexao_firebird import obter_conexao_controladora

def verificar_empresa():
    """Verifica a configuração da empresa 1"""
    
    print("🔍 VERIFICANDO CONFIGURAÇÃO DA EMPRESA 1")
    print("=" * 50)
    
    try:
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Buscar dados da empresa 1
        cursor.execute("""
            SELECT 
                CLI_CODIGO,
                CLI_NOME,
                CLI_CAMINHO_BASE,
                CLI_IP_SERVIDOR,
                CLI_NOME_BASE,
                CLI_PORTA,
                CLI_MENSAGEM,
                CLI_BLOQUEADOAPP
            FROM CLIENTES 
            WHERE CLI_CODIGO = 1
        """)
        
        empresa = cursor.fetchone()
        
        if empresa:
            print("✅ Empresa 1 encontrada:")
            print(f"   🏢 Código: {empresa[0]}")
            print(f"   📛 Nome: {empresa[1] or 'NÃO DEFINIDO'}")
            print(f"   📁 Caminho Base: {empresa[2] or 'NÃO DEFINIDO'}")
            print(f"   🌐 IP Servidor: {empresa[3] or 'NÃO DEFINIDO'}")
            print(f"   💾 Nome Base: {empresa[4] or 'NÃO DEFINIDO'}")
            print(f"   🔌 Porta: {empresa[5] or 'NÃO DEFINIDO'}")
            print(f"   💬 Mensagem: {empresa[6] or 'N/A'}")
            print(f"   🚫 Bloqueado: {empresa[7] or 'N/A'}")
            
            # Verificar problemas
            problemas = []
            if not empresa[2]:  # CLI_CAMINHO_BASE
                problemas.append("❌ CLI_CAMINHO_BASE não definido")
            if not empresa[3]:  # CLI_IP_SERVIDOR
                problemas.append("❌ CLI_IP_SERVIDOR não definido")
            if not empresa[4]:  # CLI_NOME_BASE
                problemas.append("❌ CLI_NOME_BASE não definido")
                
            if problemas:
                print(f"\n🚨 PROBLEMAS ENCONTRADOS:")
                for problema in problemas:
                    print(f"   {problema}")
                    
                print(f"\n🔧 SOLUÇÃO:")
                print(f"   Atualize a empresa 1 na base controladora com:")
                print(f"   - CLI_IP_SERVIDOR: IP do servidor Firebird")
                print(f"   - CLI_CAMINHO_BASE: Caminho do arquivo .fdb")
                print(f"   - CLI_NOME_BASE: Nome da base de dados")
            else:
                print(f"\n✅ Configuração OK!")
        else:
            print("❌ Empresa 1 não encontrada na base controladora!")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro ao verificar empresa: {e}")

if __name__ == "__main__":
    verificar_empresa() 