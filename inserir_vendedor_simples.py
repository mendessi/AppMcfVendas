#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import fdb

def inserir_vendedor_teste():
    """Insere vendedor de teste diretamente na base"""
    
    # CONFIGURAÇÕES REAIS DO SISTEMA
    email_usuario = "vendedor1@solucao.com"      # EMAIL DE LOGIN
    codigo_vendedor = "08"                       # CÓDIGO DO VENDEDOR
    nome_vendedor = "João Vendedor Teste"        # NOME DO VENDEDOR
    
    # CONFIGURAÇÕES DO SERVIDOR FIREBIRD
    servidor_ip = "149.56.77.81"                # IP DO SERVIDOR
    caminho_base = r"C:\ERP_MACFIN\Banco\Santos\BASE_PRI.GDB"  # CAMINHO DA BASE
    usuario_fb = "SYSDBA"                       # USUÁRIO FIREBIRD
    senha_fb = "masterkey"                      # SENHA FIREBIRD (padrão)
    
    print("🚀 INSERINDO VENDEDOR DE TESTE")
    print(f"📧 Email: {email_usuario}")
    print(f"🆔 Código: {codigo_vendedor}")
    print(f"👤 Nome: {nome_vendedor}")
    print(f"🖥️  Servidor: {servidor_ip}")
    print(f"💾 Base: {caminho_base}")
    print("=" * 60)
    
    try:
        # Conectar na base remota
        print("1️⃣ Conectando na base remota...")
        
        # String de conexão para servidor remoto
        string_conexao = f"{servidor_ip}:{caminho_base}"
        
        conn = fdb.connect(
            database=string_conexao,
            user=usuario_fb,
            password=senha_fb,
            charset='WIN1252'
        )
        cursor = conn.cursor()
        print("✅ Conexão estabelecida!")
        
        # Verificar se vendedor já existe
        print("2️⃣ Verificando se vendedor já existe...")
        cursor.execute("SELECT VEN_CODIGO, VEN_EMAIL, VEN_NOME FROM VENDEDOR WHERE VEN_EMAIL = ?", (email_usuario,))
        vendedor_existente = cursor.fetchone()
        
        if vendedor_existente:
            print(f"✅ Vendedor já existe: {vendedor_existente}")
            print("🎯 A tela de boas-vindas deveria aparecer!")
            conn.close()
            return
        
        # Verificar estrutura da tabela
        print("3️⃣ Verificando estrutura da tabela VENDEDOR...")
        cursor.execute("""
            SELECT r.RDB$FIELD_NAME
            FROM RDB$RELATION_FIELDS r
            WHERE r.RDB$RELATION_NAME = 'VENDEDOR'
            ORDER BY r.RDB$FIELD_POSITION
        """)
        campos = [row[0].strip() for row in cursor.fetchall()]
        print(f"📋 Campos encontrados: {len(campos)} campos")
        print(f"🔍 Primeiros campos: {', '.join(campos[:8])}...")
        
        # Inserir vendedor
        print("4️⃣ Inserindo vendedor...")
        
        # Query mais segura - só os campos essenciais
        if 'VEN_EMAIL' in campos:
            cursor.execute("""
                INSERT INTO VENDEDOR (VEN_CODIGO, VEN_EMAIL, VEN_NOME)
                VALUES (?, ?, ?)
            """, (codigo_vendedor, email_usuario, nome_vendedor))
            
            conn.commit()
            print("✅ Vendedor inserido com sucesso!")
            
            # Verificar inserção
            cursor.execute("SELECT VEN_CODIGO, VEN_EMAIL, VEN_NOME FROM VENDEDOR WHERE VEN_EMAIL = ?", (email_usuario,))
            vendedor_novo = cursor.fetchone()
            print(f"🎯 Vendedor criado: {vendedor_novo}")
            
        else:
            print("❌ Campo VEN_EMAIL não encontrado!")
            print(f"💡 Campos disponíveis: {campos[:10]}")
        
        conn.close()
        
        print("\n🎉 PRONTO! Agora teste novamente:")
        print("1. Faça login com: vendedor1@solucao.com / 123")  
        print("2. Selecione a empresa")
        print("3. A tela bonita deve aparecer! 🌟")
        print("\n💫 Formato esperado: vendedor1@solucao.com - Nível: VENDEDOR (08)")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        print("\n💡 POSSÍVEIS SOLUÇÕES:")
        print("1. Verifique se o servidor Firebird está rodando")
        print("2. Verifique se a porta 3050 está aberta") 
        print("3. Teste a conexão com FlameRobin ou IBExpert")
        print("4. Verifique usuário/senha do Firebird")

if __name__ == "__main__":
    print("🎯 CONFIGURAÇÕES DETECTADAS:")
    print("📧 Email: vendedor1@solucao.com")
    print("🖥️  Servidor: 149.56.77.81")
    print("💾 Base: C:\\ERP_MACFIN\\Banco\\Santos\\BASE_PRI.GDB")
    print()
    
    resposta = input("Confirma execução? (s/N): ").lower()
    if resposta == 's':
        inserir_vendedor_teste()
    else:
        print("❌ Cancelado!") 