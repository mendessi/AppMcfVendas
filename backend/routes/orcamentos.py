from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.models.orcamento import Orcamento, OrcamentoItem
from backend.models.orcamento_update import OrcamentoUpdate
from backend.utils.auth import get_current_user

router = APIRouter()

@router.put("/{numero}")
async def atualizar_orcamento(
    numero: int,
    orcamento: OrcamentoUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Atualiza um orçamento existente.
    """
    try:
        # Verifica se o orçamento existe
        orcamento_db = db.query(Orcamento).filter(Orcamento.numero == numero).first()
        if not orcamento_db:
            raise HTTPException(status_code=404, detail="Orçamento não encontrado")

        # Verifica se o orçamento já foi faturado
        if orcamento_db.PAR_PARAMETRO == 1:
            raise HTTPException(status_code=400, detail="Não é possível editar um orçamento já faturado")

        # Atualiza os dados básicos do orçamento
        orcamento_db.cliente_id = orcamento.cliente_id
        orcamento_db.data_emissao = orcamento.data_emissao
        orcamento_db.data_validade = orcamento.data_validade
        orcamento_db.observacoes = orcamento.observacoes

        # Remove os itens antigos
        db.query(OrcamentoItem).filter(OrcamentoItem.orcamento_id == orcamento_db.id).delete()

        # Adiciona os novos itens
        for item in orcamento.itens:
            novo_item = OrcamentoItem(
                orcamento_id=orcamento_db.id,
                produto_id=item.produto_id,
                quantidade=item.quantidade,
                valor_unitario=item.valor_unitario,
                valor_total=item.valor_total
            )
            db.add(novo_item)

        # Recalcula o valor total do orçamento
        valor_total = sum(item.valor_total for item in orcamento.itens)
        orcamento_db.valor_total = valor_total

        db.commit()
        db.refresh(orcamento_db)

        return {"message": "Orçamento atualizado com sucesso", "orcamento": orcamento_db}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) 