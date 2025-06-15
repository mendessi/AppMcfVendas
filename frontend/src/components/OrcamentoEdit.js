import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSave, FiX, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';
import OrcamentoHeader from './OrcamentoHeader';
import ClienteAutocomplete from './ClienteAutocomplete';
import ProdutoAutocomplete from './ProdutoAutocomplete';
import VendedorSelect from './VendedorSelect';
import FormaPagamentoSelect from './FormaPagamentoSelect';
import TabelaPrecoSelect from './TabelaPrecoSelect';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';
import { toast } from 'react-toastify';
import axios from 'axios';

const OrcamentoEdit = ({ darkMode = false }) => {
  const { numero } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [orcamento, setOrcamento] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    console.log('OrcamentoEdit - useEffect - numero:', numero);
    if (numero) {
      carregarOrcamento();
    } else {
      setError('Número do orçamento não encontrado');
    }
  }, [numero]);

  const carregarOrcamento = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');
      
      if (!token || !empresaCodigo) {
        throw new Error('Token ou código da empresa não encontrado');
      }
      
      const response = await axios.get(`${API_URL}/orcamentos/${numero}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        }
      });
      
      console.log('OrcamentoEdit - carregarOrcamento - resposta:', response.data);
      
      if (response.data) {
        setOrcamento(response.data);
      } else {
        throw new Error('Orçamento não encontrado');
      }
    } catch (error) {
      console.error('OrcamentoEdit - carregarOrcamento - erro:', error);
      setError(error.response?.data?.message || error.message || 'Erro ao carregar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');
      
      if (!token || !empresaCodigo) {
        throw new Error('Token ou código da empresa não encontrado');
      }
      
      const response = await axios.put(`${API_URL}/orcamentos/${numero}`, orcamento, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('OrcamentoEdit - handleSalvar - resposta:', response.data);
      
      if (response.data) {
        toast.success('Orçamento atualizado com sucesso!');
        navigate('/orcamentos');
      } else {
        throw new Error('Erro ao atualizar orçamento');
      }
    } catch (error) {
      console.error('OrcamentoEdit - handleSalvar - erro:', error);
      setError(error.response?.data?.message || error.message || 'Erro ao salvar orçamento');
      toast.error('Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    navigate('/orcamentos');
  };

  const handleAdicionarItem = () => {
    const novoItem = {
      codigo: '',
      descricao: '',
      quantidade: 1,
      valor_unitario: 0,
      valor: 0
    };

    setOrcamento({
      ...orcamento,
      itens: [...(orcamento.itens || []), novoItem]
    });
  };

  const handleRemoverItem = (index) => {
    const novosItens = [...orcamento.itens];
    novosItens.splice(index, 1);
    setOrcamento({ ...orcamento, itens: novosItens });
  };

  const handleAtualizarItem = (index, campo, valor) => {
    const novosItens = [...orcamento.itens];
    novosItens[index] = {
      ...novosItens[index],
      [campo]: valor
    };

    // Se atualizou quantidade ou valor unitário, recalcula o valor total
    if (campo === 'quantidade' || campo === 'valor_unitario') {
      const quantidade = campo === 'quantidade' ? valor : novosItens[index].quantidade;
      const valorUnitario = campo === 'valor_unitario' ? valor : novosItens[index].valor_unitario;
      novosItens[index].valor = quantidade * valorUnitario;
    }

    setOrcamento({ ...orcamento, itens: novosItens });
  };

  const calcularTotal = () => {
    if (!orcamento?.itens) return 0;
    return orcamento.itens.reduce((total, item) => total + (item.valor || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (!orcamento) {
    return (
      <div className="p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Atenção!</strong>
          <span className="block sm:inline"> Orçamento não encontrado.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <OrcamentoHeader
        titulo={`Editando Orçamento #${numero}`}
        onSalvar={handleSalvar}
        onCancelar={handleCancelar}
        saving={saving}
        darkMode={darkMode}
        orcamento={orcamento}
        setOrcamento={setOrcamento}
        isUnifiedMode={true}
      />
      
      <div className={`p-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <ClienteAutocomplete
                value={orcamento?.cliente}
                onChange={(cliente) => setOrcamento({ ...orcamento, cliente })}
                disabled={saving}
              />
            </div>

            {/* Vendedor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendedor
              </label>
              <VendedorSelect
                value={orcamento?.vendedor}
                onChange={(vendedor) => setOrcamento({ ...orcamento, vendedor })}
                disabled={saving}
              />
            </div>

            {/* Tabela de Preço */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tabela de Preço
              </label>
              <TabelaPrecoSelect
                value={orcamento?.tabela_preco}
                onChange={(tabela) => setOrcamento({ ...orcamento, tabela_preco: tabela })}
                disabled={saving}
              />
            </div>

            {/* Forma de Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pagamento
              </label>
              <FormaPagamentoSelect
                value={orcamento?.forma_pagamento}
                onChange={(forma) => setOrcamento({ ...orcamento, forma_pagamento: forma })}
                disabled={saving}
              />
            </div>
          </div>

          {/* Itens do Orçamento */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Itens do Orçamento</h2>
              <button
                onClick={handleAdicionarItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={saving}
              >
                Adicionar Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Unitário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orcamento.itens?.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ProdutoAutocomplete
                          value={item}
                          onChange={(produto) => handleAtualizarItem(index, 'codigo', produto.codigo)}
                          disabled={saving}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) => handleAtualizarItem(index, 'descricao', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          disabled={saving}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => handleAtualizarItem(index, 'quantidade', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          disabled={saving}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.valor_unitario}
                          onChange={(e) => handleAtualizarItem(index, 'valor_unitario', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          disabled={saving}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatarValor(item.valor)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleRemoverItem(index)}
                          className="text-red-600 hover:text-red-900"
                          disabled={saving}
                        >
                          <FiTrash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="mt-4 flex justify-end">
              <div className="text-lg font-medium">
                Total: {formatarValor(calcularTotal())}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast de notificação */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
};

export default OrcamentoEdit; 