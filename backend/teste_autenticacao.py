from fastapi import APIRouter, Request, Header, HTTPException, Depends
from typing import Optional, Dict, Any
import logging
from jose import jwt, JWTError
from auth import SECRET_KEY, ALGORITHM, get_current_user
import jwt as pyjwt

# Configurar router
router = APIRouter(tags=["Teste de Autenticação"])

@router.get("/teste-auth")
async def verificar_autenticacao(
    request: Request, 
    authorization: Optional[str] = Header(None)
):
    """
    Endpoint de teste para verificar se o token de autenticação está sendo recebido
    e decodificado corretamente.
    """
    resultado = {
        "recebeu_header": False,
        "token_valido": False,
        "token_info": {},
        "headers_recebidos": dict(request.headers),
    }
    
    # Verificar se recebeu o header Authorization
    if authorization and authorization.startswith("Bearer "):
        resultado["recebeu_header"] = True
        token = authorization.replace("Bearer ", "")
        
        # Tentar decodificar o token
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            resultado["token_valido"] = True
            resultado["token_info"] = {
                "sub": payload.get("sub"),
                "id": payload.get("id"),
                "nivel": payload.get("nivel"),
                "codigo_vendedor": payload.get("codigo_vendedor")
            }
        except JWTError as e:
            resultado["erro_token"] = str(e)
    
    return resultado

@router.get("/teste-empresas-debug")
async def teste_empresas(
    request: Request, 
    user = Depends(get_current_user)
):
    """
    Endpoint de teste que usa o mesmo método de autenticação que o 
    endpoint /empresas para diagnóstico.
    """
    from empresa_manager import obter_empresas_usuario
    
    resultado = {
        "autenticacao": {
            "sucesso": True,
            "usuario": {
                "username": user.username,
                "user_id": user.user_id,
                "nivel": user.nivel,
                "codigo_vendedor": user.codigo_vendedor
            }
        },
        "headers": dict(request.headers)
    }
    
    # Tentar obter empresas
    try:
        empresas = await obter_empresas_usuario(user.user_id)
        resultado["empresas"] = {
            "total": len(empresas),
            "lista": empresas[:3]  # Limitar a 3 para não sobrecarregar o log
        }
    except Exception as e:
        resultado["empresas"] = {
            "erro": str(e)
        }
    
    return resultado
