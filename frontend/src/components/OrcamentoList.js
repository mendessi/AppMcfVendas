import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiRefreshCw, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';

const OrcamentoList = ({ darkMode }) => {
  const navigate = useNavigate();
  const [orcamentos, setOrcamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  useEffect(() => {
    console.log('OrcamentoList - useEffect - Carregando orçamentos...');
    carregarOrcamentos();
  }, []);

  const carregarOrcamentos = async () => {
    try {
      console.log('OrcamentoList - Iniciando carregamento de orçamentos...');
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const empresa = localStorage.getItem('empresa_atual');

      if (!token || !empresa) {
        console.error('OrcamentoList - Token ou empresa não encontrados');
        setError('Erro de autenticação. Por favor, faça login novamente.');
        return;
      }

      console.log('OrcamentoList - Fazendo requisição para API...');
      const response = await api.get('/orcamentos', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-empresa-codigo': empresa
        }
      });

      console.log('OrcamentoList - Dados recebidos:', response.data);
      setOrcamentos(response.data);
      setUltimaAtualizacao(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('OrcamentoList - Erro ao carregar orçamentos:', error);
      setError('Erro ao carregar orçamentos. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (orcamento) => {
    console.log('OrcamentoList - Iniciando edição do orçamento:', orcamento.numero);
    setSelectedOrcamento(orcamento);
    setShowModal(true);
  };

  const handleConfirmEdit = () => {
    if (selectedOrcamento) {
      console.log('OrcamentoList - Confirmando edição do orçamento:', selectedOrcamento.numero);
      navigate(`/orcamentos/${selectedOrcamento.numero}/editar`);
    }
    setShowModal(false);
  };

  const handleDelete = async (numero) => {
    if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
      try {
        console.log('OrcamentoList - Iniciando exclusão do orçamento:', numero);
        const token = localStorage.getItem('token');
        const empresa = localStorage.getItem('empresa_atual');

        await api.delete(`/orcamentos/${numero}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-empresa-codigo': empresa
          }
        });

        console.log('OrcamentoList - Orçamento excluído com sucesso');
        carregarOrcamentos();
      } catch (error) {
        console.error('OrcamentoList - Erro ao excluir orçamento:', error);
        setError('Erro ao excluir orçamento. Por favor, tente novamente.');
      }
    }
  };

  return (
    <div className={`container mt-4 ${darkMode ? 'text-light' : ''}`}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Orçamentos</h2>
          {ultimaAtualizacao && (
            <small className="text-muted">
              Última atualização: {ultimaAtualizacao}
            </small>
          )}
        </div>
        <div>
          <button
            className="btn btn-outline-primary me-2"
            onClick={() => carregarOrcamentos()}
            disabled={isLoading}
          >
            <FiRefreshCw className={isLoading ? 'spinner-border spinner-border-sm' : ''} />
            {isLoading ? ' Atualizando...' : ' Atualizar'}
          </button>
          <Link
            to="/orcamentos/novo"
            className="btn btn-primary"
          >
            Novo Orçamento
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className={`table ${darkMode ? 'table-dark' : ''}`}>
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Validade</th>
                <th>Valor Total</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((orcamento) => (
                <tr key={orcamento.numero}>
                  <td>{orcamento.numero}</td>
                  <td>{orcamento.cliente_nome}</td>
                  <td>{new Date(orcamento.data).toLocaleDateString()}</td>
                  <td>{new Date(orcamento.validade).toLocaleDateString()}</td>
                  <td>R$ {orcamento.valor_total.toFixed(2)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary me-2"
                      onClick={() => handleEdit(orcamento)}
                    >
                      <FiEdit2 className="me-1" />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(orcamento.numero)}
                    >
                      <FiTrash2 className="me-1" />
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Confirmação */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className={`modal-content ${darkMode ? 'bg-dark text-light' : ''}`}>
              <div className="modal-header">
                <h5 className="modal-title">Confirmar Edição</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Deseja editar o orçamento {selectedOrcamento?.numero}?</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmEdit}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrcamentoList; 