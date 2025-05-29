import re
import os

def fix_relatorios_file():
    # Caminho para o arquivo relatorios.py
    file_path = 'relatorios.py'
    
    # Verificar se o arquivo existe
    if not os.path.exists(file_path):
        print(f"Arquivo {file_path} não encontrado!")
        return
    
    print(f"Modificando o arquivo {file_path}...")
    
    # Ler o conteúdo do arquivo
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # 1. Adicionar verificação de existência da coluna ECF_CX_DATA
    content = content.replace(
        'log.info(f"Filtro de data: {date_column} entre {data_inicial} e {data_final}. Cliente: {cli_codigo}")',
        'log.info(f"Filtro de data: {date_column} entre {data_inicial} e {data_final}. Cliente: {cli_codigo}")\n        # Verificar se a coluna ECF_CX_DATA existe na tabela VENDAS\n        existe_ecf_cx_data = "ecf_cx_data" in colunas_vendas\n        log.info(f"Coluna ECF_CX_DATA existe? {existe_ecf_cx_data}")'
    )
    
    # 2. Adicionar campo ECF_CX_DATA à consulta SQL
    content = content.replace(
        '              VENDAS.ECF_DESCONTO        -- Valor do Desconto',
        '              VENDAS.ECF_DESCONTO,       -- Valor do Desconto\n              VENDAS.ECF_CX_DATA         -- Data de autenticação no caixa'
    )
    
    # 3. Modificar a condição WHERE para mostrar todas as vendas do período
    content = content.replace(
        '              AND VENDAS.{date_column} IS NOT NULL\n              AND CAST(VENDAS.{date_column} AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)',
        '              AND CAST(VENDAS.ECF_DATA AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)'
    )
    
    # Salvar as alterações no arquivo
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(content)
    
    print("Modificações realizadas com sucesso!")

if __name__ == "__main__":
    fix_relatorios_file()
