#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def criar_vendedor_teste():
    """Cria um vendedor de teste na base da empresa"""
    
    email_teste = "vendedor1@solucao.com"
    codigo_teste = "08"
    nome_teste = "João Vendedor Teste"
    
    print(f"🚀 Criando vendedor de teste...")
    print(f"📧 Email: {email_teste}")
    print(f"🆔 Código: {codigo_teste}")
    print(f"👤 Nome: {nome_teste}")
    print("=" * 60)
    
    try:
        from conexao_firebird import obter_conexao_cliente, obter_conexao_controladora
        
        # 1. Primeiro vamos buscar dados da empresa 1
        print("1️⃣ Buscando dados da empresa...")
        
        conn_ctrl = obter_conexao_controladora()
        cursor_ctrl = conn_ctrl.cursor()
        
        cursor_ctrl.execute("""
            SELECT CLI_CODIGO, CLI_NOME, CLI_CAMINHO_BASE, CLI_IP_SERVIDOR, 
                   CLI_NOME_BASE, CLI_PORTA 
            FROM CLIENTES 
            WHERE CLI_CODIGO = 1
        """)
        
        empresa_dados = cursor_ctrl.fetchone()
        conn_ctrl.close()
        
        if not empresa_dados:
            print("❌ Empresa com código 1 não encontrada!")
            return
            
        empresa_dict = {
            'cli_codigo': empresa_dados[0],
            'cli_nome': empresa_dados[1],
            'cli_caminho_base': empresa_dados[2],
            'cli_ip_servidor': empresa_dados[3],
            'cli_nome_base': empresa_dados[4],
            'cli_porta': empresa_dados[5]
        }
        
        print(f"🏢 Empresa encontrada: {empresa_dict['cli_nome']}")
        
        # 2. Conectar na base da empresa
        print("2️⃣ Conectando na base da empresa...")
        conn = obter_conexao_cliente(empresa_dict)
        cursor = conn.cursor()
        
        # 3. Verificar se vendedor já existe
        print("3️⃣ Verificando se vendedor já existe...")
        cursor.execute("SELECT VEN_CODIGO, VEN_EMAIL, VEN_NOME FROM VENDEDOR WHERE VEN_EMAIL = ?", (email_teste,))
        vendedor_existente = cursor.fetchone()
        
        if vendedor_existente:
            print(f"✅ Vendedor já existe: {vendedor_existente}")
            print("🎯 A tela de boas-vindas deveria aparecer!")
            conn.close()
            return
        
        # 4. Verificar estrutura da tabela
        print("4️⃣ Verificando estrutura da tabela VENDEDOR...")
        cursor.execute("""
            SELECT r.RDB$FIELD_NAME
            FROM RDB$RELATION_FIELDS r
            WHERE r.RDB$RELATION_NAME = 'VENDEDOR'
            ORDER BY r.RDB$FIELD_POSITION
        """)
        campos = [row[0].strip() for row in cursor.fetchall()]
        print(f"📋 Campos disponíveis: {', '.join(campos)}")
        
        # 5. Inserir vendedor de teste
        print("5️⃣ Inserindo vendedor de teste...")
        
        # Query básica (ajuste campos conforme sua estrutura)
        if 'VEN_EMAIL' in campos and 'VEN_NOME' in campos:
            cursor.execute("""
                INSERT INTO VENDEDOR (VEN_CODIGO, VEN_EMAIL, VEN_NOME)
                VALUES (?, ?, ?)
            """, (codigo_teste, email_teste, nome_teste))
            
            conn.commit()
            print("✅ Vendedor inserido com sucesso!")
            
            # Verificar inserção
            cursor.execute("SELECT VEN_CODIGO, VEN_EMAIL, VEN_NOME FROM VENDEDOR WHERE VEN_EMAIL = ?", (email_teste,))
            vendedor_novo = cursor.fetchone()
            print(f"🎯 Vendedor criado: {vendedor_novo}")
            
        else:
            print("❌ Campos VEN_EMAIL ou VEN_NOME não encontrados!")
            print("💡 Ajuste o script conforme a estrutura da sua tabela")
        
        conn.close()
        print("\n🎉 Pronto! Agora teste o login com vendedor!")
        print(f"📧 Use: {email_teste}")
        print("🔑 Faça login e selecione a empresa 1")
        print("🌟 A tela bonita de boas-vindas deve aparecer!")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    criar_vendedor_teste() 