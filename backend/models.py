from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Cliente(BaseModel):
    id: int
    nome: str
    cnpj_cpf: str
    endereco: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None

class Produto(BaseModel):
    id: int
    codigo: str
    descricao: str
    preco: float
    estoque: float
    unidade: str

class ItemPedido(BaseModel):
    produto_id: int
    quantidade: float
    preco_unitario: float
    
class Pedido(BaseModel):
    id: int
    cliente_id: int
    data: datetime
    status: str
    valor_total: float
    observacao: Optional[str] = None
    itens: List[ItemPedido]
    
class PedidoCreate(BaseModel):
    cliente_id: int
    itens: List[dict]
    observacao: Optional[str] = None
