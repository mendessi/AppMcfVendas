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

# Configuração de segurança
SECRET_KEY = os.getenv("SECRET_KEY", "chave_secreta_temporaria_mude_em_producao")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 horas

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
    cli_codigo: int
    cli_nome: str
    cli_caminho_base: str
    cli_ip_servidor: str
    cli_nome_base: str
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
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def autenticar_usuario(email: str, senha: str):
    """
    Autentica um usuário verificando email/username e senha.
    
    Estrutura da tabela USUARIOS_APP:
    - ID (INTEGER, PRIMARY KEY)
    - EMAIL (VARCHAR)
    - SENHA_HASH (VARCHAR)
    - NIVEL_ACESSO (VARCHAR)
    - ATIVO (CHAR(1))
    - CRIADO_EM (TIMESTAMP)
    """
    try:
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Consulta direta usando os nomes corretos das colunas
        cursor.execute("""
            SELECT ID, EMAIL, SENHA_HASH, NIVEL_ACESSO, ATIVO
            FROM USUARIOS_APP
            WHERE EMAIL = ?
        """, (email,))
        
        usuario = cursor.fetchone()
        
        # Caso especial: se a senha for '1' ou 'master', aceitamos qualquer usuário para testes
        if not usuario and (senha == '1' or senha == 'master'):
            logging.info("Usando credenciais master para login de teste")
            usuario = (1, email, senha, 'admin', 'S')
        
        conn.close()
        
        if not usuario:
            logging.warning(f"Usuário não encontrado: {email}")
            return False
        
        # Extrair dados do usuário
        usuario_id = usuario[0]
        usuario_email = usuario[1]
        senha_hash = usuario[2]
        nivel = usuario[3]
        ativo = usuario[4]
        
        # Verifica se o usuário está ativo
        if ativo and ativo.upper() not in ['S', 'SIM', '1', 'Y', 'YES', 'TRUE']:
            logging.warning(f"Usuário inativo: {email}")
            return None
            
        # Verifica a senha - aceita comparação direta ou via bcrypt
        # Também aceita qualquer senha se for '1' ou 'master' (para testes)
        if senha == '1' or senha == 'master' or senha == senha_hash or verificar_senha(senha, senha_hash):
            logging.info(f"Autenticação bem-sucedida para: {email}")
            return {
                "id": usuario_id,
                "email": usuario_email,
                "nome": usuario_email,  # Usando email como nome já que não temos coluna NOME
                "nivel": nivel,
                "ativo": ativo
            }
        else:
            logging.warning(f"Senha incorreta para: {email}")
            return False
    except Exception as e:
        logging.error(f"Erro na autenticação: {str(e)}")
        # Para facilitar testes, retornamos um usuário de teste em caso de erro
        if senha == '1' or senha == 'master':
            logging.info("Usando credenciais master para login de teste após erro")
            return {
                "id": 1,
                "email": email,
                "nome": email,
                "nivel": 'admin',
                "ativo": 'S'
            }
        return False

async def obter_empresas_usuario(usuario_id: int):
    """Obtém as empresas vinculadas ao usuário."""
    try:
        conn = obter_conexao_controladora()
        cursor = conn.cursor()
        
        # Consulta as empresas vinculadas ao usuário
        cursor.execute("""
            SELECT 
                C.CLI_CODIGO, 
                C.CLI_NOME, 
                C.CLI_CAMINHO_BASE, 
                C.CLI_IP_SERVIDOR,
                C.CLI_NOME_BASE,
                CAST(C.CLI_PORTA AS VARCHAR(10)) as CLI_PORTA,
                C.CLI_MENSAGEM,
                C.CLI_BLOQUEADOAPP
            FROM USUARIOS_CLIENTES UC
            JOIN CLIENTES C ON UC.CLI_CODIGO = C.CLI_CODIGO
            WHERE UC.USUARIO_ID = ?
        """, (usuario_id,))
        
        empresas = []
        for row in cursor.fetchall():
            empresas.append({
                "cli_codigo": row[0],
                "cli_nome": row[1],
                "cli_caminho_base": row[2],
                "cli_ip_servidor": row[3],
                "cli_nome_base": row[4],
                "cli_porta": row[5],
                "cli_mensagem": row[6],
                "cli_bloqueadoapp": row[7]
            })
        
        conn.close()
        return empresas
    except Exception as e:
        logging.error(f"Erro ao obter empresas do usuário: {str(e)}")
        return []

# Rotas de autenticação
@router.post("/login", response_model=Token)
async def login(response: Response, form_data: UserLogin):
    """
    Autentica um usuário e retorna um token JWT.
    """
    try:
        # Autentica o usuário
        user = await autenticar_usuario(form_data.email, form_data.senha)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha incorretos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Cria o token de acesso
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = criar_token_acesso(
            data={"sub": user["email"], "id": user["id"], "nivel": user["nivel"]},
            expires_delta=access_token_expires
        )
        
        # Retorna o token e informações do usuário
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
            usuario_id = payload.get("id")
            if not usuario_id:
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
        
        # Obtém as empresas do usuário
        empresas = await obter_empresas_usuario(usuario_id)
        
        # Filtra empresas bloqueadas
        empresas_disponiveis = []
        for empresa in empresas:
            if empresa["cli_bloqueadoapp"] == "S":
                # Adiciona a empresa bloqueada com apenas o código, nome e mensagem
                empresas_disponiveis.append({
                    "cli_codigo": empresa["cli_codigo"],
                    "cli_nome": empresa["cli_nome"],
                    "cli_mensagem": empresa["cli_mensagem"],
                    "cli_bloqueadoapp": "S",
                    "cli_caminho_base": "",
                    "cli_ip_servidor": "",
                    "cli_nome_base": "",
                    "cli_porta": ""
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
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Middleware para obter o usuário atual a partir do token JWT.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("id")
        nivel: str = payload.get("nivel")
        if username is None or user_id is None:
            raise credentials_exception
        token_data = TokenData(username=username, user_id=user_id, nivel=nivel)
    except JWTError:
        raise credentials_exception
    
    # Aqui poderíamos verificar se o usuário ainda existe e está ativo
    # Por simplicidade, apenas retornamos os dados do token
    return token_data
