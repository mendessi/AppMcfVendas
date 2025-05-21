from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from typing import List, Optional, Dict, Any
import models
import database
from pydantic import BaseModel
import uvicorn
import logging
import os
from datetime import datetime, timedelta
from starlette.responses import JSONResponse
from auth import criar_token_acesso, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES, EmpresaBase, router as auth_router
from empresa_manager import (
    EmpresaSelect, 
    EmpresaData, 
    selecionar_empresa, 
    get_empresa_atual,
    get_empresa_connection,
    obter_empresas_usuario,
    empresa_sessions
)
from conexao_firebird import obter_conexao_cliente
from auth import autenticar_usuario
from fastapi import status
import jwt
from jose import JWTError

# Modelos
class EmpresaResponse(BaseModel):
    cli_codigo: int
    cli_nome: str
    cli_bloqueadoapp: str = "N"
    cli_mensagem: str = ""
    cli_caminho_base: str = ""
    cli_ip_servidor: str = "127.0.0.1"
    cli_nome_base: str = ""
    cli_porta: str = "3050"
    id: int  # VINCULO_ID
    usuario_id: int
    nivel_acesso: str
    email: str
    usuario_app_id: int

    class Config:
        from_attributes = True
        extra = "ignore"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EmpresaResponse":
        """
        Cria uma instância de EmpresaResponse a partir de um dicionário,
        garantindo que todos os campos tenham valores válidos.
        """
        return cls(
            cli_codigo=int(data.get("cli_codigo", 0)),
            cli_nome=str(data.get("cli_nome", "")),
            cli_bloqueadoapp=str(data.get("cli_bloqueadoapp", "N")),
            cli_mensagem=str(data.get("cli_mensagem", "")),
            cli_caminho_base=str(data.get("cli_caminho_base", "")),
            cli_ip_servidor=str(data.get("cli_ip_servidor", "127.0.0.1")),
            cli_nome_base=str(data.get("cli_nome_base", "")),
            cli_porta=str(data.get("cli_porta", "3050")),
            id=int(data.get("id", 0)),
            usuario_id=int(data.get("usuario_id", 0)),
            nivel_acesso=str(data.get("nivel_acesso", "")),
            email=str(data.get("email", "")),
            usuario_app_id=int(data.get("usuario_app_id", 0))
        )

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI(title="API Força de Vendas", description="API para aplicativo de força de vendas")

# Configuração CORS específica
origins = [
    "http://localhost:3001",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Lista específica de origens
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Middleware para garantir cabeçalhos CORS
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    try:
        # Log dos headers recebidos
        logger.info(f"Headers recebidos: {dict(request.headers)}")
        
        response = await call_next(request)
        origin = request.headers.get("origin")
        
        # Adiciona headers CORS apenas para origens permitidas
        if origin in origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, X-Requested-With"
        
        # Log dos headers enviados
        logger.info(f"Headers enviados: {dict(response.headers)}")
        
        return response
    except Exception as e:
        logger.error(f"Erro no middleware CORS: {str(e)}")
        error_response = JSONResponse(
            status_code=500,
            content={"detail": f"Erro interno do servidor: {str(e)}"}
        )
        # Adiciona headers CORS mesmo em caso de erro
        origin = request.headers.get("origin")
        if origin in origins:
            error_response.headers["Access-Control-Allow-Origin"] = origin
            error_response.headers["Access-Control-Allow-Credentials"] = "true"
            error_response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            error_response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, X-Requested-With"
        return error_response

# Endpoint de teste CORS
@app.get("/test-cors")
async def test_cors(request: Request):
    origin = request.headers.get("origin")
    return {
        "message": "CORS está funcionando!",
        "origin": origin,
        "headers": dict(request.headers)
    }

# Inclui as rotas de autenticação
app.include_router(auth_router)

# Rotas básicas para teste
@app.get("/")
async def root():
    return {"message": "API de Força de Vendas funcionando!", "version": "1.0.0"}

# Rota para obter clientes
@app.get("/clientes")
async def get_clientes():
    try:
        return await database.get_clientes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rota para obter produtos
@app.get("/produtos")
async def get_produtos():
    try:
        return await database.get_produtos()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Modelo para pedido
class PedidoCreate(BaseModel):
    cliente_id: int
    itens: List[dict]
    observacao: Optional[str] = None

# Rota para criar pedido
@app.post("/pedidos")
async def create_pedido(pedido: PedidoCreate):
    try:
        return await database.create_pedido(pedido)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rota para obter pedidos
@app.get("/pedidos")
async def get_pedidos():
    try:
        return await database.get_pedidos()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Modelos
class UserLogin(BaseModel):
    email: str
    senha: str

class EmpresaSelect(BaseModel):
    cli_codigo: int

# Rotas
@app.post("/login")
async def login(user_data: UserLogin):
    try:
        # Autenticar o usuário
        user = await autenticar_usuario(user_data.email, user_data.senha)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas"
            )
        
        # Buscar empresas do usuário usando o email
        empresas = await obter_empresas_usuario(user_data.email)
        
        # Criar token de acesso
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = criar_token_acesso(
            data={
                "sub": user_data.email,  # Usando o email como sub
                "id": user["id"],
                "nivel": user["nivel"]
            },
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "usuario_id": user["id"],
            "usuario_nome": user["nome"],
            "usuario_nivel": user["nivel"]
        }
    except Exception as e:
        logging.error(f"Erro no login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao realizar login: {str(e)}"
        )

@app.get("/empresas", response_model=List[EmpresaResponse])
async def listar_empresas(request: Request, user_data = Depends(get_current_user)):
    """
    Retorna a lista de empresas vinculadas ao usuário autenticado.
    """
    try:
        # Obtém o token da requisição
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Não autorizado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = authorization.replace("Bearer ", "")
        
        # Decodifica o token
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if not email:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token inválido",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Obtém as empresas do usuário usando o email
        empresas_raw = await obter_empresas_usuario(email)
        
        # Converte cada empresa para o modelo EmpresaResponse
        empresas = []
        for empresa_raw in empresas_raw:
            try:
                # Se a empresa estiver bloqueada, limpa os campos sensíveis mas mantém os IDs
                if empresa_raw.get("cli_bloqueadoapp") == "S":
                    empresa_raw.update({
                        "cli_caminho_base": "",
                        "cli_ip_servidor": "",
                        "cli_nome_base": "",
                        "cli_porta": ""
                    })
                
                empresa = EmpresaResponse.from_dict(empresa_raw)
                empresas.append(empresa)
            except Exception as e:
                logging.error(f"Erro ao converter empresa: {str(e)}")
                logging.error(f"Dados da empresa: {empresa_raw}")
                continue
        
        return empresas
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao listar empresas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar empresas: {str(e)}",
        )

@app.post("/selecionar-empresa")
async def selecionar_empresa_route(empresa: EmpresaSelect, user_data = Depends(get_current_user)):
    try:
        empresa_selecionada = await selecionar_empresa(user_data["id"], empresa.cli_codigo)
        return empresa_selecionada
    except Exception as e:
        logger.error(f"Erro ao selecionar empresa: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard")
async def dashboard(request: Request, data_inicial: Optional[str] = None, data_final: Optional[str] = None, user_data = Depends(get_current_user)):
    try:
        # Obtém a empresa atual
        empresa = empresa_sessions.get(user_data["id"])
        if not empresa:
            raise HTTPException(status_code=400, detail="Nenhuma empresa selecionada")
        
        # Obtém a conexão com o banco
        conn = obter_conexao_cliente(empresa)
        cur = conn.cursor()
        
        # Aqui você implementa a lógica do dashboard
        # Por exemplo, buscar vendas, clientes, etc.
        
        return {
            "message": "Dashboard carregado com sucesso",
            "data": {
                "vendas": [],
                "clientes": [],
                "produtos": []
            }
        }
    except Exception as e:
        logger.error(f"Erro no dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
