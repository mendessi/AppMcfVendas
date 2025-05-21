from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import logging
import database
import models
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configurar o logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("teste_empresa_crud")

# Configurar o router
router = APIRouter(tags=["Teste Empresa CRUD"])

# Modelo da empresa para API
class EmpresaCreate(BaseModel):
    cli_codigo: int
    cli_nome: str
    cli_caminho_base: str
    cli_ip_servidor: str
    cli_nome_base: str
    cli_porta: Optional[str] = "3050"
    cli_bloqueadoapp: Optional[str] = "N"

# Definir o modelo SQLAlchemy
Base = declarative_base()

class EmpresaModel(Base):
    __tablename__ = "empresas"
    
    cli_codigo = Column(Integer, primary_key=True, index=True)
    cli_nome = Column(String(100))
    cli_caminho_base = Column(String(255))
    cli_ip_servidor = Column(String(100))
    cli_nome_base = Column(String(100))
    cli_porta = Column(String(20))
    cli_bloqueadoapp = Column(String(1))

# Configurar conexão ao banco
DATABASE_URL = "sqlite:///./teste.db"  # Usar SQLite para teste
engine = create_engine(DATABASE_URL)
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Função para obter uma sessão de banco de dados
def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()

@router.get("/empresas")
async def listar_empresas():
    """
    Lista todas as empresas cadastradas no banco de dados.
    """
    try:
        # Obter sessão do banco de dados
        db = get_db()
        
        # Obter todas as empresas
        empresas = db.query(EmpresaModel).all()
        
        # Converter para formato da resposta
        result = []
        for empresa in empresas:
            result.append({
                "cli_codigo": empresa.cli_codigo,
                "cli_nome": empresa.cli_nome,
                "cli_caminho_base": empresa.cli_caminho_base,
                "cli_ip_servidor": empresa.cli_ip_servidor,
                "cli_nome_base": empresa.cli_nome_base,
                "cli_porta": empresa.cli_porta,
                "cli_bloqueadoapp": empresa.cli_bloqueadoapp
            })
        
        return {
            "sucesso": True,
            "total": len(result),
            "empresas": result
        }
    except Exception as e:
        log.error(f"Erro ao listar empresas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar empresas: {str(e)}"
        )

@router.post("/empresas")
async def criar_empresa(empresa: EmpresaCreate):
    """
    Cria uma nova empresa no banco de dados.
    """
    try:
        # Obter sessão do banco de dados
        db = get_db()
        
        # Verificar se a empresa já existe
        existing = db.query(EmpresaModel).filter(EmpresaModel.cli_codigo == empresa.cli_codigo).first()
        if existing:
            return {
                "sucesso": False,
                "mensagem": f"Empresa com código {empresa.cli_codigo} já existe"
            }
        
        # Criar nova empresa
        nova_empresa = EmpresaModel(
            cli_codigo=empresa.cli_codigo,
            cli_nome=empresa.cli_nome,
            cli_caminho_base=empresa.cli_caminho_base,
            cli_ip_servidor=empresa.cli_ip_servidor,
            cli_nome_base=empresa.cli_nome_base,
            cli_porta=empresa.cli_porta,
            cli_bloqueadoapp=empresa.cli_bloqueadoapp
        )
        
        # Salvar no banco
        db.add(nova_empresa)
        db.commit()
        
        return {
            "sucesso": True,
            "mensagem": "Empresa criada com sucesso",
            "empresa": {
                "cli_codigo": nova_empresa.cli_codigo,
                "cli_nome": nova_empresa.cli_nome
            }
        }
    except Exception as e:
        log.error(f"Erro ao criar empresa: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar empresa: {str(e)}"
        )

@router.get("/cria-empresa-teste")
async def criar_empresa_teste():
    """
    Cria uma empresa de teste com código 1.
    """
    try:
        # Obter sessão do banco de dados
        db = get_db()
        
        # Verificar se a empresa já existe
        existing = db.query(EmpresaModel).filter(EmpresaModel.cli_codigo == 1).first()
        if existing:
            return {
                "sucesso": True,
                "mensagem": "Empresa de teste já existe",
                "empresa": {
                    "cli_codigo": existing.cli_codigo,
                    "cli_nome": existing.cli_nome
                }
            }
        
        # Criar empresa de teste
        empresa_teste = EmpresaModel(
            cli_codigo=1,
            cli_nome="SANTOS INDUSTRIA",
            cli_caminho_base="C:\\ERP_MACFIN\\Banco\\Santos",
            cli_ip_servidor="149.56.77.81",
            cli_nome_base="BASE_PRI.GDB",
            cli_porta="3050",
            cli_bloqueadoapp="N"
        )
        
        # Salvar no banco
        db.add(empresa_teste)
        db.commit()
        
        return {
            "sucesso": True,
            "mensagem": "Empresa de teste criada com sucesso",
            "empresa": {
                "cli_codigo": empresa_teste.cli_codigo,
                "cli_nome": empresa_teste.cli_nome,
                "detalhes": {
                    "cli_caminho_base": empresa_teste.cli_caminho_base,
                    "cli_ip_servidor": empresa_teste.cli_ip_servidor,
                    "cli_nome_base": empresa_teste.cli_nome_base,
                    "cli_porta": empresa_teste.cli_porta
                }
            }
        }
    except Exception as e:
        log.error(f"Erro ao criar empresa de teste: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar empresa de teste: {str(e)}"
        )
