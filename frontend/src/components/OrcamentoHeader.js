import React from 'react';
import { FiUser, FiCalendar, FiPercent, FiFileText } from 'react-icons/fi';
import ClienteAutocomplete from './ClienteAutocomplete';
import TabelaPrecoSelect from './TabelaPrecoSelect';
import VendedorSelect from './VendedorSelect';
import FormaPagamentoSelect from './FormaPagamentoSelect';

const OrcamentoHeader = ({
  darkMode,
  orcamento = {},
  setOrcamento,
  // Props individuais para compatibilidade
  cliente,
  setCliente,
  tabela,
  setTabela,
  formaPagamento,
  setFormaPagamento,
  vendedor,
  setVendedor,
  dataOrcamento,
  validade,
  setValidade,
  especie,
  setEspecie,
  desconto,
  setDesconto,
  observacao,
  setObservacao,
  ESPECIE_OPCOES,
  tabelas = [],
  formasPagamento = [],
  vendedores = [],
  onClienteSelect
}) => {
  // Determina se está usando o modo unificado (setOrcamento) ou props individuais
  const isUnifiedMode = !!setOrcamento;

  // Funções auxiliares para lidar com as mudanças
  const handleClienteChange = (value) => {
    if (isUnifiedMode) {
      setOrcamento(prev => ({
        ...prev,
        cliente: value ? {
          codigo: prev.cliente?.codigo || '',
          nome: value,
          tipo: prev.cliente?.tipo || 'F',
          documento: prev.cliente?.documento || '',
          cidade: prev.cliente?.cidade || '',
          uf: prev.cliente?.uf || '',
          bairro: prev.cliente?.bairro || ''
        } : null
      }));
    } else if (setCliente) {
      if (!value) {
        setCliente(null);
      } else {
        setCliente(prev => ({
          ...prev,
          nome: value
        }));
      }
    }
  };

  const handleClienteSelect = (selectedCliente) => {
    console.log('Cliente selecionado:', selectedCliente);
    if (isUnifiedMode) {
      setOrcamento(prev => ({
        ...prev,
        cliente: selectedCliente ? {
          codigo: selectedCliente.codigo,
          nome: selectedCliente.nome,
          tipo: selectedCliente.tipo || 'F',
          documento: selectedCliente.documento || '',
          cidade: selectedCliente.cidade || '',
          uf: selectedCliente.uf || '',
          bairro: selectedCliente.bairro || ''
        } : null
      }));
    } else if (setCliente) {
      setCliente(selectedCliente);
    }
    if (onClienteSelect) {
      onClienteSelect(selectedCliente);
    }
  };

  const handleTabelaPrecoChange = (tabelaCodigo) => {
    if (isUnifiedMode) {
      setOrcamento(prev => ({
        ...prev,
        tabela_preco: tabelaCodigo
      }));
    } else if (setTabela) {
      setTabela(tabelaCodigo);
    }
  };

  const handleVendedorChange = (vendedorCodigo) => {
    if (isUnifiedMode) {
      setOrcamento(prev => ({
        ...prev,
        vendedor: vendedorCodigo
      }));
    } else if (setVendedor) {
      setVendedor(vendedorCodigo);
    }
  };

  const handleFormaPagamentoChange = (formaPagamentoCodigo) => {
    if (isUnifiedMode) {
      setOrcamento(prev => ({
        ...prev,
        forma_pagamento: formaPagamentoCodigo
      }));
    } else if (setFormaPagamento) {
      setFormaPagamento(formaPagamentoCodigo);
    }
  };

  const handleDescontoChange = (value) => {
    const descontoValue = parseFloat(value) || 0;
    if (isUnifiedMode) {
      setOrcamento(prev => ({
        ...prev,
        desconto: descontoValue
      }));
    } else if (setDesconto) {
      setDesconto(descontoValue);
    }
  };

  const handleValidadeChange = (value) => {
    if (isUnifiedMode) {
      setOrcamento(prev => ({
        ...prev,
        validade: value
      }));
    } else if (setValidade) {
      setValidade(value);
    }
  };

  const handleObservacaoChange = (value) => {
    if (isUnifiedMode) {
      setOrcamento(prev => ({
        ...prev,
        observacao: value
      }));
    } else if (setObservacao) {
      setObservacao(value);
    }
  };

  // Obtém os valores corretos dependendo do modo
  const clienteValue = isUnifiedMode 
    ? (orcamento?.cliente || null)
    : (cliente || null);
  const clienteNome = clienteValue ? (typeof clienteValue === 'string' ? clienteValue : (clienteValue.nome || '')) : '';
  const validadeValue = isUnifiedMode ? orcamento.validade : validade;
  const tabelaValue = isUnifiedMode ? (orcamento.tabela_preco || '') : (tabela || '');
  const formaPagamentoValue = isUnifiedMode ? (orcamento.forma_pagamento || '') : (formaPagamento || '');
  const vendedorValue = isUnifiedMode ? (orcamento.vendedor || '') : (vendedor || '');
  const descontoValue = isUnifiedMode ? (orcamento.desconto || 0) : (desconto || 0);
  const observacaoValue = isUnifiedMode ? (orcamento.observacao || '') : (observacao || '');

  return (
    <div className={`p-4 rounded-lg ${
      darkMode ? "bg-gray-700" : "bg-gray-50"
    }`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Cliente */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Cliente
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiUser className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
            </div>
            <ClienteAutocomplete
              value={clienteNome}
              onChange={handleClienteChange}
              onSelect={handleClienteSelect}
              darkMode={darkMode}
            />
          </div>
        </div>

        {/* Data */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Data
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCalendar className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
            </div>
            <input
              type="date"
              value={isUnifiedMode ? orcamento.data : dataOrcamento}
              disabled
              className={`pl-10 w-full rounded-md ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300 text-gray-700"
              }`}
            />
          </div>
        </div>

        {/* Validade */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Validade
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCalendar className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
            </div>
            <input
              type="date"
              value={validadeValue}
              onChange={(e) => handleValidadeChange(e.target.value)}
              className={`pl-10 w-full rounded-md ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300 text-gray-700"
              }`}
            />
          </div>
        </div>

        {/* Tabela de Preços */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Tabela de Preços
          </label>
          <TabelaPrecoSelect
            value={tabelaValue}
            onChange={handleTabelaPrecoChange}
            darkMode={darkMode}
          />
        </div>

        {/* Forma de Pagamento */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Forma de Pagamento
          </label>
          <FormaPagamentoSelect
            value={formaPagamentoValue}
            onChange={handleFormaPagamentoChange}
            darkMode={darkMode}
          />
        </div>

        {/* Vendedor */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Vendedor
          </label>
          <VendedorSelect
            value={vendedorValue}
            onChange={handleVendedorChange}
            darkMode={darkMode}
          />
        </div>

        {/* Desconto */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Desconto (%)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiPercent className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
            </div>
            <input
              type="number"
              min="0"
              max="100"
              value={descontoValue}
              onChange={(e) => handleDescontoChange(e.target.value)}
              className={`pl-10 w-full rounded-md ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300 text-gray-700"
              }`}
            />
          </div>
        </div>

        {/* Observações */}
        <div className="md:col-span-2 lg:col-span-3">
          <label className={`block text-sm font-medium mb-1 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Observações
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3 pointer-events-none">
              <FiFileText className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
            </div>
            <textarea
              value={observacaoValue}
              onChange={(e) => handleObservacaoChange(e.target.value)}
              rows="3"
              className={`pl-10 w-full rounded-md ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300 text-gray-700"
              }`}
              placeholder="Digite as observações do orçamento..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrcamentoHeader;
