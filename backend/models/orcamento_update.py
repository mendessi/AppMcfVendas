from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class OrcamentoItemUpdate(BaseModel):
    produto_id: int
    quantidade: float
    valor_unitario: float
    valor_total: float

class OrcamentoUpdate(BaseModel):
    cliente_id: int
    data_emissao: date
    data_validade: date
    observacoes: Optional[str] = None
    itens: List[OrcamentoItemUpdate] 