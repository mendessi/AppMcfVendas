# Script para corrigir o problema de sintaxe no arquivo relatorios.py
with open('relatorios.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Localizar e corrigir a docstring problemática
docstring_start = content.find('@router.get("/grupos")')
if docstring_start != -1:
    # Encontrar o início da função após a declaração do router
    func_start = content.find('async def listar_grupos', docstring_start)
    if func_start != -1:
        # Encontrar o início da docstring
        docstring_start = content.find('"""', func_start)
        if docstring_start != -1:
            # Encontrar o final da docstring
            docstring_end = content.find('"""', docstring_start + 3)
            if docstring_end != -1:
                # Substituir a docstring problemática por uma docstring válida
                new_docstring = '"""\n    Função para listar grupos de produtos.\n    Retorna uma lista com código e nome dos grupos.\n    """'
                content = content[:docstring_start] + new_docstring + content[docstring_end + 3:]

with open('relatorios.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Arquivo corrigido com sucesso!")
