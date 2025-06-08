# Script para corrigir o problema de sintaxe no arquivo relatorios.py
with open('relatorios.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Procurar pela linha com @router.get("/grupos")
for i in range(len(lines)):
    if '@router.get("/grupos")' in lines[i]:
        # Se encontrar, verificar as próximas linhas para a docstring
        if i+1 < len(lines) and 'async def listar_grupos' in lines[i+1]:
            # Encontrou a função, agora vamos verificar se há uma docstring
            if i+2 < len(lines) and '"""' in lines[i+2]:
                # Encontrou o início da docstring
                # Vamos remover a docstring e substituir por um comentário
                start_docstring = i+2
                end_docstring = None
                for j in range(start_docstring+1, len(lines)):
                    if '"""' in lines[j]:
                        end_docstring = j
                        break
                
                if end_docstring is not None:
                    # Substituir a docstring por um comentário
                    lines[start_docstring] = '    # Função para listar grupos de produtos\n'
                    # Remover as linhas da docstring
                    for j in range(start_docstring+1, end_docstring+1):
                        lines[j] = ''
                    break

# Escrever as linhas modificadas de volta para o arquivo
with open('relatorios.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Arquivo corrigido com sucesso!")
