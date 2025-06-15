#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def testar_busca_vendedor():
    """Testa a busca de vendedor na base da empresa"""
    
    email_teste = "vendedor1@solucao.com"
    empresa_codigo = 1  # Ajuste conforme sua empresa de teste
    
    try:
        print(f"🔍 Testando busca na empresa {empresa_codigo} para email: {email_teste}")
        print("=" * 60)
        
        from conexao_firebird import obter_conexao_cliente
        conn = obter_conexao_cliente(empresa_codigo)
        cursor = conn.cursor()
        
        # 1. Verificar se tabela VENDEDOR existe
        print("1️⃣ Verificando se tabela VENDEDOR existe...")
        try:
            cursor.execute("SELECT FIRST 1 * FROM VENDEDOR")
            print("✅ Tabela VENDEDOR existe!")
        except Exception as e:
            print(f"❌ Erro na tabela VENDEDOR: {e}")
            return
        
        # 2. Verificar estrutura da tabela
        print("\n2️⃣ Verificando campos da tabela VENDEDOR...")
        try:
            cursor.execute("""
                SELECT r.RDB$FIELD_NAME
                FROM RDB$RELATION_FIELDS r
                WHERE r.RDB$RELATION_NAME = 'VENDEDOR'
                ORDER BY r.RDB$FIELD_POSITION
            """)
            campos = [row[0].strip() for row in cursor.fetchall()]
            print(f"✅ Campos: {', '.join(campos)}")
            
            if 'VEN_EMAIL' in campos:
                print("✅ Campo VEN_EMAIL encontrado!")
            else:
                print("❌ Campo VEN_EMAIL NÃO encontrado!")
        except Exception as e:
            print(f"❌ Erro: {e}")
        
        # 3. Listar todos os vendedores
        print(f"\n3️⃣ Listando vendedores...")
        try:
            cursor.execute("SELECT VEN_CODIGO, VEN_EMAIL, VEN_NOME FROM VENDEDOR WHERE VEN_EMAIL IS NOT NULL")
            vendedores = cursor.fetchall()
            print(f"✅ {len(vendedores)} vendedores com email:")
            for ven in vendedores:
                print(f"   - Código: {ven[0]}, Email: {ven[1]}, Nome: {ven[2]}")
        except Exception as e:
            print(f"❌ Erro: {e}")
        
        # 4. Buscar o email específico
        print(f"\n4️⃣ Buscando: {email_teste}")
        try:
            cursor.execute("SELECT VEN_CODIGO, VEN_NOME FROM VENDEDOR WHERE VEN_EMAIL = ?", (email_teste,))
            vendedor = cursor.fetchone()
            if vendedor:
                print(f"✅ ENCONTRADO! Código: {vendedor[0]}, Nome: {vendedor[1]}")
            else:
                print("❌ NÃO ENCONTRADO!")
        except Exception as e:
            print(f"❌ Erro: {e}")
        
        conn.close()
        print("\n" + "=" * 60)
        print("🏁 Teste concluído!")
        
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    testar_busca_vendedor() 