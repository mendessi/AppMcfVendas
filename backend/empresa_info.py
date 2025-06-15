import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from empresa_manager import get_empresa_atual, get_empresa_connection
from pydantic import BaseModel
from typing import Optional

# Configurar o router
router = APIRouter(tags=["Empresa Info"])

# Configurar o logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("empresa_info")

class EmpresaInfo(BaseModel):
    emp_cod: Optional[int] = None
    emp_nome: Optional[str] = None
    emp_cnpj: Optional[str] = None
    nome_abreviado: Optional[str] = None
    
async def obter_info_empresa_atual(request: Request):
    """
    Obtém informações da empresa atual a partir da conexão com o banco do cliente.
    """
    try:
        # Obter a conexão com a empresa atual
        conn = await get_empresa_connection(request)
        cursor = conn.cursor()
        
        # Consultar informações da empresa
        cursor.execute("""
            SELECT 
                e.emp_cod,
                e.emp_nome,
                e.emp_cnpj
            FROM 
                empresa e
            JOIN 
                paramet p ON p.par_emp_padrao = e.emp_cod
        """)
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            log.warning("Informações da empresa não encontradas")
            return EmpresaInfo()
            
        emp_cod, emp_nome, emp_cnpj = result
        
        # Criar nome abreviado (2 primeiros nomes)
        nome_partes = emp_nome.split() if emp_nome else []
        nome_abreviado = " ".join(nome_partes[:2]) if len(nome_partes) > 1 else emp_nome
        
        return EmpresaInfo(
            emp_cod=emp_cod,
            emp_nome=emp_nome,
            emp_cnpj=emp_cnpj,
            nome_abreviado=nome_abreviado
        )
    except Exception as e:
        log.error(f"Erro ao obter informações da empresa: {str(e)}")
        # Retornamos um objeto vazio em vez de um erro para não interromper a UI
        return EmpresaInfo()

@router.get("/info-empresa-atual", response_model=EmpresaInfo)
async def get_info_empresa_atual(request: Request):
    """
    Endpoint para obter informações da empresa atual.
    """
    try:
        # Obter o código da empresa do cabeçalho
        empresa_codigo = request.headers.get("x-empresa-codigo")
        log.info(f"Recebido pedido de informações da empresa com código: {empresa_codigo}")
        
        if not empresa_codigo:
            log.warning("Nenhum código de empresa fornecido no cabeçalho")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código da empresa não fornecido"
            )
        
        return await obter_info_empresa_atual(request)
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Erro ao processar solicitação de informações da empresa: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter informações da empresa: {str(e)}"
        )
