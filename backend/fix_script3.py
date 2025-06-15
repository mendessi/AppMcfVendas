# Script para corrigir o problema de sintaxe no arquivo relatorios.py
import re

with open('relatorios.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Procurar pelo padrão da função listar_grupos e sua docstring
pattern = r'(@router\.get\("/grupos"\)\nasync def listar_grupos\(request: Request\):\s+)"""[\s\S]+?"""'
replacement = r'\1"""Função para listar grupos de produtos.\n    Retorna uma lista com código e nome dos grupos.\n    """'

# Substituir a docstring problemática
new_content = re.sub(pattern, replacement, content)

# Escrever o conteúdo corrigido em um novo arquivo
with open('relatorios_new.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

# Substituir o arquivo original pelo novo
import os
import shutil
os.remove('relatorios.py')
shutil.move('relatorios_new.py', 'relatorios.py')

print("Arquivo corrigido com sucesso!")
