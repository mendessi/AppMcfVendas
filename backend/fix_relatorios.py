# Script para corrigir o arquivo relatorios.py removendo a função duplicada
with open('relatorios.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Encontrar as linhas onde a função listar_grupos é definida
listar_grupos_lines = []
for i, line in enumerate(lines):
    if 'async def listar_grupos' in line:
        listar_grupos_lines.append(i)

print(f"Encontradas {len(listar_grupos_lines)} ocorrências da função listar_grupos")

if len(listar_grupos_lines) > 1:
    # Remover a primeira ocorrência da função
    first_occurrence = listar_grupos_lines[0]
    next_function = None
    
    # Encontrar onde termina a primeira função
    for i in range(first_occurrence + 1, len(lines)):
        if 'async def ' in lines[i] or '@router.get' in lines[i]:
            next_function = i
            break
    
    if next_function:
        # Substituir a primeira ocorrência por um comentário
        print(f"Removendo a primeira ocorrência da função listar_grupos (linhas {first_occurrence+1} a {next_function-1})")
        lines[first_occurrence] = f"# Função listar_grupos foi movida para a linha {listar_grupos_lines[1]+1}\n"
        
        # Limpar as linhas da primeira ocorrência
        for i in range(first_occurrence + 1, next_function):
            lines[i] = ""
        
        # Escrever o arquivo corrigido
        with open('relatorios.py', 'w', encoding='utf-8') as f:
            f.writelines(lines)
        
        print("Arquivo corrigido com sucesso!")
    else:
        print("Não foi possível encontrar o fim da primeira ocorrência da função")
else:
    print("Não foram encontradas ocorrências duplicadas da função listar_grupos")
