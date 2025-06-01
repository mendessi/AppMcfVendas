import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2, FiEdit, FiX, FiInbox, FiAlertTriangle } from 'react-icons/fi';
import OrcamentoCache from '../services/OrcamentoCache';

const OrcamentosCache = ({ darkMode, onClose }) => {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmacao, setShowConfirmacao] = useState(false);
  const [showConfirmacaoLimparTodos, setShowConfirmacaoLimparTodos] = useState(false);
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    carregarOrcamentos();
  }, []);

  const carregarOrcamentos = async () => {
    try {
      const lista = await OrcamentoCache.listar();
      // Ordenar por data mais recente
      lista.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setOrcamentos(lista);
    } catch (error) {
      console.error('Erro ao carregar orçamentos do cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemover = async (id) => {
    try {
      await OrcamentoCache.remover(id);
      await carregarOrcamentos();
    } catch (error) {
      console.error('Erro ao remover orçamento:', error);
    }
  };

  const handleEditar = async (id) => {
    try {
      const orcamento = await OrcamentoCache.obter(id);
      if (orcamento) {
        setOrcamentoSelecionado(orcamento);
        setShowConfirmacao(true);
      }
    } catch (error) {
      console.error('Erro ao editar orçamento:', error);
    }
  };

  const handleConfirmarCarregamento = () => {
    navigate('/orcamento', { 
      state: { 
        orcamentoCache: orcamentoSelecionado,
        forcarCarregamento: true 
      } 
    });
    onClose();
  };

  const handleLimparTodos = async () => {
    try {
      const todosOrcamentos = await OrcamentoCache.listar();
      for (const orcamento of todosOrcamentos) {
        await OrcamentoCache.remover(orcamento.id);
      }
      await carregarOrcamentos();
      setShowConfirmacaoLimparTodos(false);
    } catch (error) {
      console.error('Erro ao limpar todos os orçamentos:', error);
    }
  };

  const formatarData = (timestamp) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Overlay */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

        {/* Modal */}
        <div className="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className={`relative inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Cabeçalho */}
            <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${darkMode ? 'border-b border-gray-700' : 'border-b'}`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-lg leading-6 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Pedidos em Cache
                </h3>
                <button
                  onClick={onClose}
                  className={`rounded-md ${
                    darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                  } p-2`}
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {orcamentos.length === 0 ? (
                <div className="text-center py-8">
                  <FiInbox className={`mx-auto h-12 w-12 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Nenhum orçamento em cache
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => setShowConfirmacaoLimparTodos(true)}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        darkMode
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      Limpar Todos
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {orcamentos.map((orcamento) => (
                      <div 
                        key={orcamento.id} 
                        className={`rounded-lg shadow-md p-4 ${
                          darkMode ? 'bg-gray-700 text-gray-100' : 'bg-white text-gray-900'
                        }`}
                      >
                        {/* Cabeçalho do Card */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {orcamento.cliente?.nome || 'Cliente não selecionado'}
                            </h3>
                            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              {formatarData(orcamento.timestamp)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditar(orcamento.id)}
                              className={`p-2 rounded-full transition-colors ${
                                darkMode 
                                  ? 'hover:bg-gray-600 text-blue-400' 
                                  : 'hover:bg-gray-100 text-blue-600'
                              }`}
                              title="Editar"
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleRemover(orcamento.id)}
                              className={`p-2 rounded-full transition-colors ${
                                darkMode 
                                  ? 'hover:bg-gray-600 text-red-400' 
                                  : 'hover:bg-gray-100 text-red-600'
                              }`}
                              title="Remover"
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        {/* Detalhes do Orçamento */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              Produtos:
                            </span>
                            <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {orcamento.produtos?.length || 0} itens
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              Total:
                            </span>
                            <span className={`font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                              {formatarMoeda(orcamento.produtos?.reduce((total, p) => total + (p.valor_total || 0), 0) || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Botão Fechar */}
              <div className="flex justify-center p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onClose}
                  className={`w-full max-w-xs px-4 py-2 text-sm font-medium rounded-md ${
                    darkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {showConfirmacao && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black opacity-75"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FiAlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className={`text-lg leading-6 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Carregar orçamento do cache?
                    </h3>
                    <div className="mt-2">
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Isso irá substituir qualquer conteúdo não salvo no formulário atual.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${darkMode ? 'bg-gray-800 border-t border-gray-700' : 'bg-gray-50'}`}>
                <button
                  type="button"
                  onClick={handleConfirmarCarregamento}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Carregar
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmacao(false)}
                  className={`mt-3 sm:mt-0 w-full inline-flex justify-center rounded-md border px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                    darkMode
                      ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 focus:ring-gray-500'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Limpar Todos */}
      {showConfirmacaoLimparTodos && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black opacity-75"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FiAlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className={`text-lg leading-6 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Limpar todos os orçamentos?
                    </h3>
                    <div className="mt-2">
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Esta ação não pode ser desfeita. Todos os orçamentos em cache serão removidos permanentemente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${darkMode ? 'bg-gray-800 border-t border-gray-700' : 'bg-gray-50'}`}>
                <button
                  type="button"
                  onClick={handleLimparTodos}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Limpar Todos
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmacaoLimparTodos(false)}
                  className={`mt-3 sm:mt-0 w-full inline-flex justify-center rounded-md border px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                    darkMode
                      ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 focus:ring-gray-500'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrcamentosCache; 