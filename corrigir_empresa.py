#!/usr/bin/env python3
"""
Corrigir a configuração da empresa 1 na base controladora
"""
import sys
import os

# Adicionar o backend ao path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_path)

from conexao_firebird import obter_conexao_controladora

def corrigir_empresa():
    """Corrige a configuração da empresa 1"""
    
    print("🔧 CORRIGINDO CONFIGURAÇÃO DA EMPRESA 1")
    print("=" * 50)
    
    # Configurações da empresa (ajuste conforme necessário)
    config = {
        'ip_servidor': '149.56.77.81',  # Servidor real que já funciona
        'caminho_base': r'C:\ERP_MACFIN\Banco\Santos\BASE_PRI.GDB',  # Base real - caminho completo
        'nome_base': '',  # Deixar vazio pois o caminho já inclui o nome
        'porta': 3050
    }
    
    print(f"📋 Configurações a serem aplicadas:")
    print(f"   🌐 IP Servidor: {config['ip_servidor']}")
    print(f"   📁 Caminho Base: {config['caminho_base']}")
    print(f"   💾 Nome Base: {config['nome_base']}")
    print(f"   🔌 Porta: {config['porta']}")
    
    try:
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Atualizar empresa
        cursor.execute("""
            UPDATE CLIENTES SET
                CLI_IP_SERVIDOR = ?,
                CLI_CAMINHO_BASE = ?,
                CLI_NOME_BASE = ?,
                CLI_PORTA = ?
            WHERE CLI_CODIGO = 1
        """, (
            config['ip_servidor'],
            config['caminho_base'],
            config['nome_base'],
            config['porta']
        ))
        
        conn.commit()
        
        print(f"\n✅ Empresa 1 atualizada com sucesso!")
        
        # Verificar se foi aplicado
        cursor.execute("""
            SELECT 
                CLI_CODIGO,
                CLI_NOME,
                CLI_CAMINHO_BASE,
                CLI_IP_SERVIDOR,
                CLI_NOME_BASE,
                CLI_PORTA
            FROM CLIENTES 
            WHERE CLI_CODIGO = 1
        """)
        
        empresa = cursor.fetchone()
        
        if empresa:
            print(f"\n📊 Configuração atual:")
            print(f"   🏢 Código: {empresa[0]}")
            print(f"   📛 Nome: {empresa[1]}")
            print(f"   📁 Caminho Base: {empresa[2]}")
            print(f"   🌐 IP Servidor: {empresa[3]}")
            print(f"   💾 Nome Base: {empresa[4]}")
            print(f"   🔌 Porta: {empresa[5]}")
        
        conn.close()
        
        print(f"\n🎯 PRÓXIMOS PASSOS:")
        print(f"   1. Verifique se o arquivo da base existe: {config['caminho_base']}")
        print(f"   2. Teste novamente o código do vendedor")
        print(f"   3. Teste o dashboard")
        
    except Exception as e:
        print(f"❌ Erro ao corrigir empresa: {e}")

if __name__ == "__main__":
    corrigir_empresa() 