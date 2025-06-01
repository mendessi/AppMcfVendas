import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2, FiEdit, FiX, FiInbox, FiAlertTriangle } from 'react-icons/fi';
import OrcamentoCache from '../services/OrcamentoCache';

const OrcamentosCache = ({ darkMode, onClose }) => {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmacao, setShowConfirmacao] = useState(false);
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
                  Orçamentos em Cache
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                          Data/Hora
                        </th>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                          Cliente
                        </th>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                          Produtos
                        </th>
                        <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                          Total
                        </th>
                        <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {orcamentos.map((orcamento) => (
                        <tr key={orcamento.id} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {formatarData(orcamento.timestamp)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {orcamento.cliente?.nome || 'Cliente não selecionado'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {orcamento.produtos?.length || 0} itens
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatarMoeda(orcamento.produtos?.reduce((total, p) => total + (p.valor_total || 0), 0) || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditar(orcamento.id)}
                              className={`text-blue-600 hover:text-blue-900 ${darkMode ? 'hover:text-blue-400' : ''} mr-3`}
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleRemover(orcamento.id)}
                              className={`text-red-600 hover:text-red-900 ${darkMode ? 'hover:text-red-400' : ''}`}
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {showConfirmacao && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

          <div className="flex items-center justify-center min-h-screen p-4">
            <div className={`relative rounded-lg overflow-hidden shadow-xl transform transition-all max-w-lg w-full ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className={`rounded-full p-3 ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-100'}`}>
                    <FiAlertTriangle className={`h-6 w-6 ${darkMode ? 'text-yellow-500' : 'text-yellow-600'}`} />
                  </div>
                </div>

                <h3 className={`text-xl font-semibold text-center mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Carregar Orçamento do Cache?
                </h3>

                <p className={`text-center mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Esta ação irá substituir todos os dados do orçamento atual.
                  Os dados não salvos serão perdidos.
                </p>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowConfirmacao(false)}
                    className={`px-4 py-2 rounded-md ${
                      darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarCarregamento}
                    className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Sim, Carregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrcamentosCache; 