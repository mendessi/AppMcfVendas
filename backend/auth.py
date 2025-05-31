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
    codigo_vendedor: Optional[str] = None
    
class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    nivel: Optional[str] = None
    codigo_vendedor: Optional[str] = None
    
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
    codigo_vendedor: Optional[str] = None
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
        
        # Consultar dados da tabela com o nome correto da coluna USU_VEN_CODIGO
        try:
            cursor.execute("""
                SELECT ID, EMAIL, SENHA_HASH, NIVEL_ACESSO, ATIVO, USU_VEN_CODIGO
                FROM USUARIOS_APP
                WHERE EMAIL = ?
            """, (email,))
            logging.info("Consultando tabela USUARIOS_APP com campo USU_VEN_CODIGO")
            has_codigo_vendedor = True
        except Exception as e:
            logging.warning(f"Erro ao consultar com USU_VEN_CODIGO: {str(e)}")
            # Caso a coluna não exista ou ocorra outro erro, fazer a consulta sem ela
            cursor.execute("""
                SELECT ID, EMAIL, SENHA_HASH, NIVEL_ACESSO, ATIVO
                FROM USUARIOS_APP
                WHERE EMAIL = ?
            """, (email,))
            has_codigo_vendedor = False
        
        usuario = cursor.fetchone()
        
        # Caso especial: se a senha for '1' ou 'master', aceitamos qualquer usuário para testes
        if not usuario and (senha == '1' or senha == 'master'):
            logging.info("Usando credenciais master para login de teste")
            # Mantenha consistente com a ordem dos campos na consulta SQL
            usuario = (1, email, senha, 'admin', 'S', None)  # ID, EMAIL, SENHA, NIVEL, ATIVO, USU_VEN_CODIGO
        
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
        
        # Obter código do vendedor apenas se a coluna existir
        codigo_vendedor = None
        if has_codigo_vendedor and len(usuario) > 5:
            codigo_vendedor = usuario[5]
        
        logging.info(f"Usuário encontrado: {usuario_email}, nivel: {nivel}, codigo_vendedor: {codigo_vendedor}")
        
        # Verifica se o usuário está ativo
        if ativo and ativo.upper() not in ['S', 'SIM', '1', 'Y', 'YES', 'TRUE']:
            logging.warning(f"Usuário inativo: {email}")
            return None
            
        # Se o nível for vendedor, busca o código na tabela VENDEDOR
        # IMPORTANTE: Para desenvolvimento/teste, permitimos vendedores sem código
        # Em produção, podemos descomentar o código abaixo para exigir código de vendedor
        if nivel and nivel.lower() == 'vendedor':
            logging.info(f"Usuário {email} é vendedor. Não validaremos o código neste momento.")
            # A validação do vendedor será feita apenas ao selecionar uma empresa e acessar os relatórios
            
            # Adicionar aqui mais tarde a validação obrigatória se desejar
            """            
            try:
                # Buscar na base do cliente quando uma empresa for selecionada
                # Esta validação está temporariamente desabilitada para facilitar testes
                pass
            except Exception as ve:
                logging.error(f"Erro ao buscar código do vendedor: {str(ve)}")
            """
            
            # Não impedimos o login neste momento
            
        # Verifica a senha - aceita comparação direta ou via bcrypt
        # Também aceita qualquer senha se for '1' ou 'master' (para testes)
        if senha == '1' or senha == 'master' or senha == senha_hash or verificar_senha(senha, senha_hash):
            # Se chegou até aqui, a autenticação foi bem-sucedida
            logging.info(f"Usuário autenticado com sucesso: {email}")
            
            # Adicionalmente, poderia buscar mais informações do usuário
            # como nome completo a partir do banco de dados
            
            # Cria um dicionário com as informações do usuário
            user = {
                "id": usuario_id,
                "email": usuario_email,
                "nivel": nivel,
                "ativo": ativo,
                "codigo_vendedor": codigo_vendedor,
                # Se não tiver nome, usa o email como nome
                "nome": usuario_email
            }
            return user
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
            # Verificar se é um caso especial de vendedor sem email cadastrado
            # fazendo uma consulta direta para determinar se o usuário existe mas é vendedor sem email
            try:
                conn = obter_conexao_controladora()
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT ID, EMAIL, NIVEL_ACESSO FROM USUARIOS_APP 
                    WHERE EMAIL = ? AND NIVEL_ACESSO LIKE '%vendedor%'
                """, (form_data.email,))
                
                vendedor_sem_email = cursor.fetchone()
                conn.close()
                
                if vendedor_sem_email:
                    # É um vendedor sem email cadastrado
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="VENDEDOR SEM EMAIL NO CADASTRO. Contacte o administrador para atualizar seu cadastro.",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
            except Exception:
                # Em caso de erro, usar a mensagem genérica
                pass
                
            # Mensagem genérica para outros casos
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha incorretos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Cria o token de acesso
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        expires = datetime.utcnow() + access_token_expires
        
        # Para vendedores, o código será buscado após selecionar a empresa
        codigo_vendedor = None
        
        token_data = {
            "sub": user["email"],
            "id": user["id"],
            "nivel": user["nivel"],
            "nome": user["nome"],
            "codigo_vendedor": codigo_vendedor,
            "exp": expires
        }
        
        logging.info(f"Gerando token com dados: {token_data}")
        access_token = criar_token_acesso(
            data=token_data,
            expires_delta=access_token_expires
        )
        
        # Retorna o token e informações do usuário
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "usuario_id": user["id"],
            "usuario_nome": user["nome"],
            "usuario_nivel": user["nivel"],
            "codigo_vendedor": codigo_vendedor
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

@router.post("/buscar-codigo-vendedor")
async def buscar_codigo_vendedor(request: Request):
    """
    Busca o código do vendedor na base da empresa selecionada.
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
            usuario_email = payload.get("sub")
            usuario_nivel = payload.get("nivel")
            if not usuario_email:
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
        
        # Verifica se é vendedor
        if not usuario_nivel or usuario_nivel.lower() != 'vendedor':
            return {"codigo_vendedor": None, "message": "Usuário não é vendedor"}
        
        # Obtém o código da empresa do header
        empresa_codigo = request.headers.get("x-empresa-codigo")
        if not empresa_codigo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código da empresa não fornecido"
            )
        
        # Busca o código do vendedor na base da empresa
        try:
            from conexao_firebird import obter_conexao_cliente, obter_conexao_controladora
            
            # Converter empresa_codigo para inteiro
            empresa_id = int(empresa_codigo)
            logging.info(f"Buscando dados da empresa {empresa_id}")
            
            # Primeiro buscar dados completos da empresa na base controladora
            conn_ctrl = obter_conexao_controladora()
            cursor_ctrl = conn_ctrl.cursor()
            
            cursor_ctrl.execute("""
                SELECT CLI_CODIGO, CLI_NOME, CLI_CAMINHO_BASE, CLI_IP_SERVIDOR, 
                       CLI_NOME_BASE, CLI_PORTA 
                FROM CLIENTES 
                WHERE CLI_CODIGO = ?
            """, (empresa_id,))
            
            empresa_dados = cursor_ctrl.fetchone()
            conn_ctrl.close()
            
            if not empresa_dados:
                logging.error(f"Empresa {empresa_id} não encontrada na base controladora")
                return {
                    "codigo_vendedor": None,
                    "message": f"Empresa {empresa_id} não encontrada"
                }
            
            # Montar dicionário da empresa
            empresa_dict = {
                'cli_codigo': empresa_dados[0],
                'cli_nome': empresa_dados[1],
                'cli_caminho_base': empresa_dados[2],
                'cli_ip_servidor': empresa_dados[3],
                'cli_nome_base': empresa_dados[4],
                'cli_porta': empresa_dados[5] or '3050'
            }
            
            logging.info(f"Dados da empresa {empresa_id}: {empresa_dict['cli_nome']}")
            
            # Conectar na base da empresa
            conn = obter_conexao_cliente(empresa_dict)
            cursor = conn.cursor()
            
            # Busca por email
            cursor.execute("""
                SELECT VEN_CODIGO, VEN_NOME FROM VENDEDOR 
                WHERE VEN_EMAIL = ?
            """, (usuario_email,))
            
            vendedor = cursor.fetchone()
            conn.close()
            
            if vendedor:
                codigo_vendedor = str(vendedor[0]).strip()
                nome_vendedor = vendedor[1].strip() if vendedor[1] else ""
                logging.info(f"Código do vendedor encontrado na empresa {empresa_codigo}: {codigo_vendedor} - {nome_vendedor}")
                return {
                    "codigo_vendedor": codigo_vendedor,
                    "nome_vendedor": nome_vendedor,
                    "message": "Código encontrado com sucesso"
                }
            else:
                logging.warning(f"Código do vendedor não encontrado na empresa {empresa_codigo} para email {usuario_email}")
                return {
                    "codigo_vendedor": None,
                    "message": "Código do vendedor não encontrado nesta empresa"
                }
                
        except Exception as e:
            logging.error(f"Erro ao buscar código do vendedor na empresa {empresa_codigo}: {str(e)}")
            # Em caso de erro na conexão, retornar null ao invés de erro 500
            logging.warning(f"Falha na conexão com empresa {empresa_codigo}, retornando código null")
            return {
                "codigo_vendedor": None,
                "message": f"Erro na conexão com a empresa: {str(e)}"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erro geral ao buscar código do vendedor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno: {str(e)}"
        )

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
        codigo_vendedor: str = payload.get("codigo_vendedor")
        if username is None or user_id is None:
            raise credentials_exception
        token_data = TokenData(username=username, user_id=user_id, nivel=nivel, codigo_vendedor=codigo_vendedor)
    except JWTError:
        raise credentials_exception
    
    # Aqui poderíamos verificar se o usuário ainda existe e está ativo
    # Por simplicidade, apenas retornamos os dados do token
    return token_data
