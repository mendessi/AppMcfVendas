# Script para corrigir o problema de sintaxe no arquivo relatorios.py
with open('relatorios.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Corrigir a docstring problemática
if len(lines) > 528:
    lines[527] = '    Lista de todos os grupos de produtos.\n'

with open('relatorios.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Arquivo corrigido com sucesso!")
