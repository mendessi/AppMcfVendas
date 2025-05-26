from pydantic import BaseModel
from typing import List, Optional

class ProdutoOrcamento(BaseModel):
    codigo: str
    descricao: str
    quantidade: float
    valor_unitario: float
    valor_total: float
    imagem: Optional[str] = None

class OrcamentoCreate(BaseModel):
    cliente_codigo: str
    nome_cliente: str
    tabela_codigo: str
    formapag_codigo: str
    valor_total: float
    data_orcamento: str
    data_validade: str
    observacao: Optional[str] = ""
    vendedor_codigo: str
    especie: str
    desconto: float
    produtos: List[ProdutoOrcamento]
