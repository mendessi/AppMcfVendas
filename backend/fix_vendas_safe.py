import re

# Caminho para o arquivo
file_path = 'relatorios.py'

# Ler o conteúdo do arquivo
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Encontrar a consulta SQL no endpoint /vendas
vendas_query_pattern = r'sql = f\'\'\'[\s\S]+?VENDAS\.ECF_DESCONTO\s+-- Valor do Desconto\n(\s+)FROM'
match = re.search(vendas_query_pattern, content)

if match:
    indent = match.group(1)
    # Adicionar o campo ECF_CX_DATA
    replacement = f'sql = f\'\'\'\n            SELECT\n              VENDAS.ECF_NUMERO,         -- ID da Venda\n              VENDAS.ECF_DATA,           -- Data da Venda\n              VENDEDOR.VEN_NOME,         -- Nome do Vendedor\n              VENDAS.CLI_CODIGO,         -- Código do Cliente\n              VENDAS.NOME,               -- Nome do Cliente\n              VENDAS.ECF_TOTAL,          -- Total da Venda\n              TABPRECO.TAB_NOME,         -- Nome da Tabela de Preço\n              FORMAPAG.FPG_NOME,         -- Nome da Forma de Pagamento\n              VENDAS.ECF_CAIXA,          -- Caixa que autenticou\n              VENDAS.ECF_DESCONTO,       -- Valor do Desconto\n              VENDAS.ECF_CX_DATA         -- Data de autenticação no caixa\n{indent}FROM'
    content = re.sub(vendas_query_pattern, replacement, content)
    
    # Modificar a condição WHERE para mostrar todas as vendas do período
    where_pattern = r'WHERE\s+VENDAS\.ECF_CANCELADA = \'N\'\s+AND VENDAS\.ECF_CONCLUIDA = \'S\'\s+AND VENDAS\.\{date_column\} IS NOT NULL\s+AND CAST\(VENDAS\.\{date_column\} AS DATE\)'
    replacement = 'WHERE\n              VENDAS.ECF_CANCELADA = \'N\'\n              AND VENDAS.ECF_CONCLUIDA = \'S\'\n              AND CAST(VENDAS.ECF_DATA AS DATE)'
    content = re.sub(where_pattern, replacement, content)

    # Salvar as alterações
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Modificações realizadas com sucesso!")
else:
    print("Padrão não encontrado no arquivo. Nenhuma modificação foi feita.")
