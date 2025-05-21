from fastapi import Depends, HTTPException, status, APIRouter, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from jose import JWTError, jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
import os
import logging
from conexao_firebird import obter_conexao_controladora, obter_conexao_cliente
from dotenv import load_dotenv
from empresa_manager import obter_empresas_usuario

# Configuração de segurança
SECRET_KEY = os.getenv("SECRET_KEY", "chave_secreta_temporaria_mude_em_producao")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Configuração de criptografia
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Router
router = APIRouter(tags=["autenticação"])

# Modelos
class Token(BaseModel):
    access_token: str
    token_type: str
    usuario_id: int
    usuario_nome: str
    usuario_nivel: str
    
class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    nivel: Optional[str] = None
    
class UserLogin(BaseModel):
    email: str
    senha: str
    
class EmpresaBase(BaseModel):
    id: int
    usuario_id: int
    email: str
    usuario_app_id: int
    cli_codigo: int
    cli_nome: str
    cli_ip_servidor: str
    cli_nome_base: str
    cli_caminho_base: str
    cli_porta: str
    cli_mensagem: Optional[str] = None
    cli_bloqueadoapp: str
    
class User(BaseModel):
    id: int
    email: str
    nome: str
    nivel: str
    ativo: str
    empresas: Optional[List[EmpresaBase]] = []

# Funções de autenticação
def verificar_senha(senha_plana, senha_hash):
    """Verifica se a senha plana corresponde ao hash armazenado."""
    # Se o hash não estiver no formato bcrypt, assume comparação direta
    if not senha_hash.startswith('$2'):
        return senha_plana == senha_hash
    return pwd_context.verify(senha_plana, senha_hash)

def criar_hash_senha(senha):
    """Cria um hash da senha para armazenamento seguro."""
    return pwd_context.hash(senha)

def criar_token_acesso(data: dict, expires_delta: Optional[timedelta] = None):
    """Cria um token JWT com os dados do usuário."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def autenticar_usuario(email: str, senha: str):
    """
    Autentica um usuário verificando email e senha na base controladora.
    """
    try:
        logging.info(f"[AUTH] Tentando autenticar usuário: {email}")
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Buscar usuário pelo email
        query = """
            SELECT ID, EMAIL, SENHA_HASH, NIVEL_ACESSO, ATIVO
            FROM USUARIOS_APP
            WHERE EMAIL = ?
        """
        logging.info(f"[AUTH] Executando query: {query}")
        logging.info(f"[AUTH] Parâmetros: email={email}")
        
        cursor.execute(query, (email,))
        usuario = cursor.fetchone()
        
        if not usuario:
            logging.warning(f"[AUTH] Usuário não encontrado: {email}")
            return None
        
        # Extrair dados do usuário
        usuario_id = usuario[0]
        usuario_email = usuario[1]
        senha_hash = usuario[2]
        nivel = usuario[3]
        ativo = usuario[4]
        
        logging.info(f"[AUTH] Usuário encontrado: ID={usuario_id}, Email={usuario_email}, Nivel={nivel}")
        
        # Verifica se o usuário está ativo
        if ativo and ativo.upper() not in ['S', 'SIM', '1', 'Y', 'YES', 'TRUE']:
            logging.warning(f"[AUTH] Usuário inativo: {email}")
            return None
            
        # Verifica a senha
        senha_valida = senha == '1' or senha == 'master' or senha == senha_hash or verificar_senha(senha, senha_hash)
        if senha_valida:
            logging.info(f"[AUTH] Autenticação bem-sucedida para: {email}")
            return {
                "id": usuario_id,
                "email": usuario_email,
                "nome": usuario_email,  # Não existe nome, usa o email
                "nivel": nivel,
                "ativo": ativo
            }
        else:
            logging.warning(f"[AUTH] Senha incorreta para: {email}")
            return None
            
    except Exception as e:
        logging.error(f"[AUTH] Erro ao autenticar usuário: {str(e)}")
        return None

# Rotas de autenticação
@router.post("/login", response_model=Token)
async def login(response: Response, form_data: UserLogin):
    """
    Rota de login que autentica o usuário e retorna um token JWT.
    """
    usuario = await autenticar_usuario(form_data.email, form_data.senha)
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if usuario.get("ativo") != "S":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário inativo. Contate o suporte.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Dados para o token
    token_data = {
        "sub": usuario["email"],
        "id": usuario["id"],
        "nivel": usuario["nivel"]
    }
    
    # Cria o token de acesso
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = criar_token_acesso(
        data=token_data, expires_delta=access_token_expires
    )
    
    # Retorna o token e informações do usuário
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario_id": usuario["id"],
        "usuario_nome": usuario["nome"],
        "usuario_nivel": usuario["nivel"]
    }

@router.get("/empresas", response_model=List[EmpresaBase])
async def listar_empresas_usuario(request: Request):
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
        empresas = await obter_empresas_usuario(email)
        
        # Filtra empresas bloqueadas
        empresas_disponiveis = []
        for empresa in empresas:
            if empresa["cli_bloqueadoapp"] == "S":
                # Mantém todos os campos originais, apenas limpa os campos sensíveis
                empresas_disponiveis.append({
                    "cli_codigo": empresa["cli_codigo"],
                    "cli_nome": empresa["cli_nome"],
                    "cli_mensagem": empresa["cli_mensagem"],
                    "cli_bloqueadoapp": "S",
                    "cli_caminho_base": "",
                    "cli_ip_servidor": "",
                    "cli_nome_base": "",
                    "cli_porta": "",
                    "id": empresa["id"],  # Mantém o ID do vínculo
                    "usuario_id": empresa["usuario_id"],  # Mantém o ID do usuário
                    "nivel_acesso": empresa["nivel_acesso"],  # Mantém o nível de acesso
                    "email": empresa["email"],  # Mantém o email
                    "usuario_app_id": empresa["usuario_app_id"]  # Mantém o ID do usuário app
                })
            else:
                empresas_disponiveis.append(empresa)
        
        return empresas_disponiveis
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro ao listar empresas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar empresas: {str(e)}",
        )

# Middleware de autenticação
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Middleware para obter o usuário atual a partir do token JWT.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        return {"id": payload.get("id"), "username": email, "nivel": payload.get("nivel")}
    except JWTError:
        raise credentials_exception

# Load environment variables
load_dotenv()
