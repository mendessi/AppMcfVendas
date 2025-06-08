# Script para remover funções duplicadas no arquivo relatorios.py
with open('relatorios.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Encontrar todas as ocorrências da função listar_grupos
occurrences = []
for i, line in enumerate(lines):
    if 'async def listar_grupos(request: Request):' in line:
        occurrences.append(i)

print(f"Encontradas {len(occurrences)} ocorrências da função listar_grupos")

# Se houver mais de uma ocorrência, remover a primeira
if len(occurrences) > 1:
    first_occurrence = occurrences[0]
    # Encontrar o fim da primeira ocorrência (procurar a próxima função ou o final do arquivo)
    end_of_function = None
    for i in range(first_occurrence + 1, len(lines)):
        if 'async def ' in lines[i] or '@router.get' in lines[i]:
            end_of_function = i
            break
    
    if end_of_function is None:
        end_of_function = len(lines)
    
    print(f"Removendo a primeira ocorrência da função listar_grupos (linhas {first_occurrence+1} a {end_of_function})")
    
    # Substituir a primeira ocorrência por um comentário
    lines[first_occurrence] = "# Função listar_grupos foi movida para a linha {}\n".format(occurrences[1]+1)
    for i in range(first_occurrence + 1, end_of_function):
        lines[i] = ""
    
    # Escrever as linhas modificadas de volta para o arquivo
    with open('relatorios.py', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print("Arquivo corrigido com sucesso!")
else:
    print("Não foram encontradas ocorrências duplicadas da função listar_grupos")
