import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import Modal from '../components/Modal';

const OrcamentosList = ({ darkMode }) => {
  const navigate = useNavigate();
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalTipo, setModalTipo] = useState('');

  useEffect(() => {
    carregarOrcamentos();
  }, []);

  const carregarOrcamentos = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');

      if (!token || !empresaCodigo) {
        throw new Error('Token ou código da empresa não encontrado');
      }

      const response = await axios.get('/api/orcamentos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        }
      });

      console.log('Orçamentos carregados:', response.data);
      setOrcamentos(response.data);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      setError('Erro ao carregar orçamentos. Por favor, tente novamente.');
      toast.error('Erro ao carregar orçamentos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (orcamento) => {
    setOrcamentoSelecionado(orcamento);
    setModalTipo('editar');
    setModalAberto(true);
  };

  const handleExcluir = (orcamento) => {
    setOrcamentoSelecionado(orcamento);
    setModalTipo('excluir');
    setModalAberto(true);
  };

  const handleImprimir = async (orcamento) => {
    try {
      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');

      if (!token || !empresaCodigo) {
        throw new Error('Token ou código da empresa não encontrado');
      }

      const response = await axios.get(`/api/orcamentos/${orcamento.numero}/imprimir`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orcamento-${orcamento.numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erro ao imprimir orçamento:', error);
      toast.error('Erro ao imprimir orçamento. Por favor, tente novamente.');
    }
  };

  const handleConfirmarEdicao = () => {
    navigate(`/orcamentos/editar/${orcamentoSelecionado.numero}`);
    setModalAberto(false);
  };

  const handleConfirmarExclusao = async () => {
    try {
      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');

      if (!token || !empresaCodigo) {
        throw new Error('Token ou código da empresa não encontrado');
      }

      await axios.delete(`/api/orcamentos/${orcamentoSelecionado.numero}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        }
      });

      toast.success('Orçamento excluído com sucesso!');
      carregarOrcamentos();
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      toast.error('Erro ao excluir orçamento. Por favor, tente novamente.');
    } finally {
      setModalAberto(false);
    }
  };

  const handleCancelar = () => {
    setModalAberto(false);
  };

  if (loading) {
    return (
      <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
        <div className="text-red-500 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Orçamentos
        </h1>
        <button
          onClick={() => navigate('/orcamentos/novo')}
          className={`px-4 py-2 rounded-md ${
            darkMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          Novo Orçamento
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y ${
          darkMode ? 'divide-gray-700' : 'divide-gray-200'
        }`}>
          <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              }`}>
                Número
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              }`}>
                Cliente
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              }`}>
                Data
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              }`}>
                Valor Total
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              }`}>
                Status
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              }`}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${
            darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'
          }`}>
            {orcamentos.map((orcamento) => (
              <tr key={orcamento.numero}>
                <td className={`px-6 py-4 whitespace-nowrap ${
                  darkMode ? 'text-gray-300' : 'text-gray-900'
                }`}>
                  {orcamento.numero}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap ${
                  darkMode ? 'text-gray-300' : 'text-gray-900'
                }`}>
                  {orcamento.cliente_nome}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap ${
                  darkMode ? 'text-gray-300' : 'text-gray-900'
                }`}>
                  {new Date(orcamento.data).toLocaleDateString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap ${
                  darkMode ? 'text-gray-300' : 'text-gray-900'
                }`}>
                  {orcamento.valor_total.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap ${
                  darkMode ? 'text-gray-300' : 'text-gray-900'
                }`}>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    orcamento.status === 'Aprovado'
                      ? 'bg-green-100 text-green-800'
                      : orcamento.status === 'Reprovado'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {orcamento.status}
                  </span>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                  darkMode ? 'text-gray-300' : 'text-gray-900'
                }`}>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/orcamentos/${orcamento.numero}`)}
                      className={`p-2 rounded-md ${
                        darkMode
                          ? 'text-blue-400 hover:bg-gray-700'
                          : 'text-blue-600 hover:bg-gray-100'
                      }`}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEditar(orcamento)}
                      className={`p-2 rounded-md ${
                        darkMode
                          ? 'text-yellow-400 hover:bg-gray-700'
                          : 'text-yellow-600 hover:bg-gray-100'
                      }`}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleExcluir(orcamento)}
                      className={`p-2 rounded-md ${
                        darkMode
                          ? 'text-red-400 hover:bg-gray-700'
                          : 'text-red-600 hover:bg-gray-100'
                      }`}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleImprimir(orcamento)}
                      className={`p-2 rounded-md ${
                        darkMode
                          ? 'text-green-400 hover:bg-gray-700'
                          : 'text-green-600 hover:bg-gray-100'
                      }`}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalAberto}
        onClose={handleCancelar}
        title={modalTipo === 'editar' ? 'Editar Orçamento' : 'Excluir Orçamento'}
        darkMode={darkMode}
      >
        <div className="p-4">
          {modalTipo === 'editar' ? (
            <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Deseja editar o orçamento #{orcamentoSelecionado?.numero}?
            </p>
          ) : (
            <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Tem certeza que deseja excluir o orçamento #{orcamentoSelecionado?.numero}?
              Esta ação não pode ser desfeita.
            </p>
          )}
          <div className="flex justify-end space-x-4">
            <button
              onClick={handleCancelar}
              className={`px-4 py-2 rounded-md ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={modalTipo === 'editar' ? handleConfirmarEdicao : handleConfirmarExclusao}
              className={`px-4 py-2 rounded-md ${
                modalTipo === 'editar'
                  ? darkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                  : darkMode
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {modalTipo === 'editar' ? 'Editar' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrcamentosList; 