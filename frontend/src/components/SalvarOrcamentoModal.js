import React from 'react';
import { FiSave, FiX, FiCheckCircle } from 'react-icons/fi';

const SalvarOrcamentoModal = ({ isOpen, onClose, onConfirm, orcamento, darkMode, isLoading }) => {
  if (!isOpen) return null;

  const calcularTotal = () => {
    const subtotal = orcamento.produtos.reduce((total, produto) => total + produto.valor_total, 0);
    const desconto = (subtotal * orcamento.desconto) / 100;
    return subtotal - desconto;
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className={`relative w-full max-w-2xl transform overflow-hidden rounded-lg ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        } p-6 text-left shadow-xl transition-all`}>
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FiCheckCircle className="h-6 w-6 text-green-500 mr-2" />
              <h3 className="text-lg font-medium leading-6">
                Confirmar Salvamento do Orçamento
              </h3>
            </div>
            <button
              onClick={onClose}
              className={`rounded-md ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              } p-1 focus:outline-none`}
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Resumo do Orçamento */}
          <div className={`p-4 rounded-lg mb-4 ${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <h4 className="font-medium mb-3">Resumo do Orçamento</h4>
            
            {/* Cliente */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cliente</p>
                <p className="font-medium">{orcamento.cliente.nome || 'Não informado'}</p>
              </div>
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Código</p>
                <p className="font-medium">{orcamento.cliente.codigo || 'N/A'}</p>
              </div>
            </div>

            {/* Detalhes */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tabela</p>
                <p className="font-medium">{orcamento.tabela || 'Não selecionada'}</p>
              </div>
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Forma Pagto</p>
                <p className="font-medium">{orcamento.forma_pagamento || 'Não selecionada'}</p>
              </div>
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Desconto</p>
                <p className="font-medium">{orcamento.desconto}%</p>
              </div>
            </div>

            {/* Produtos */}
            <div className="mb-4">
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                Produtos ({orcamento.produtos.length})
              </p>
              <div className={`max-h-40 overflow-y-auto rounded-md ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              } border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                {orcamento.produtos.map((produto, index) => (
                  <div key={produto.codigo} className={`p-2 ${
                    index !== 0 ? (darkMode ? 'border-t border-gray-600' : 'border-t border-gray-200') : ''
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{produto.descricao}</span>
                      <span>{formatarMoeda(produto.valor_total)}</span>
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {produto.quantidade} x {formatarMoeda(produto.valor_unitario)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span>{formatarMoeda(calcularTotal())}</span>
            </div>
          </div>

          {/* Botões */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={`px-4 py-2 rounded-md ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white flex items-center ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <FiSave className="mr-2" />
                  Confirmar e Salvar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalvarOrcamentoModal; 