import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSave, FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const OrcamentoEdit = ({ darkMode }) => {
  const { numero } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orcamento, setOrcamento] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [formData, setFormData] = useState({
    cliente_id: '',
    data_emissao: '',
    data_validade: '',
    observacoes: '',
    itens: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const empresaCodigo = localStorage.getItem('empresa_atual');

        if (!token || !empresaCodigo) {
          navigate('/login');
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        };

        const [orcamentoRes, clientesRes, produtosRes] = await Promise.all([
          api.get(`/orcamentos/${numero}`, { headers }),
          api.get('/clientes', { headers }),
          api.get('/produtos', { headers })
        ]);

        setOrcamento(orcamentoRes.data);
        setClientes(clientesRes.data);
        setProdutos(produtosRes.data);

        setFormData({
          cliente_id: orcamentoRes.data.cliente_id,
          data_emissao: orcamentoRes.data.data_emissao,
          data_validade: orcamentoRes.data.data_validade,
          observacoes: orcamentoRes.data.observacoes || '',
          itens: orcamentoRes.data.itens || []
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    if (numero) {
      fetchData();
    }
  }, [numero, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItens = [...formData.itens];
    newItens[index] = {
      ...newItens[index],
      [field]: value
    };

    // Recalcular valores
    if (field === 'quantidade' || field === 'valor_unitario') {
      const quantidade = parseFloat(newItens[index].quantidade) || 0;
      const valorUnitario = parseFloat(newItens[index].valor_unitario) || 0;
      newItens[index].valor_total = quantidade * valorUnitario;
    }

    setFormData(prev => ({
      ...prev,
      itens: newItens
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [
        ...prev.itens,
        {
          produto_id: '',
          quantidade: 1,
          valor_unitario: 0,
          valor_total: 0
        }
      ]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresaCodigo');

      if (!token || !empresaCodigo) {
        navigate('/login');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-empresa-codigo': empresaCodigo
      };

      await api.put(`/orcamentos/${numero}`, formData, { headers });
      navigate('/orcamentos');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar orçamento');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className={`p-4 rounded-md ${darkMode ? 'bg-red-900' : 'bg-red-100'} text-red-700`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Editar Orçamento #{numero}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Cliente</label>
              <select
                name="cliente_id"
                value={formData.cliente_id}
                onChange={handleInputChange}
                className={`w-full p-2 rounded-md border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Data de Emissão</label>
              <input
                type="date"
                name="data_emissao"
                value={formData.data_emissao}
                onChange={handleInputChange}
                className={`w-full p-2 rounded-md border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Data de Validade</label>
              <input
                type="date"
                name="data_validade"
                value={formData.data_validade}
                onChange={handleInputChange}
                className={`w-full p-2 rounded-md border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>
          </div>

          {/* Itens do Orçamento */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Itens do Orçamento</h2>
              <button
                type="button"
                onClick={addItem}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md ${
                  darkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <FiPlus className="mr-2" />
                Adicionar Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.itens.map((item, index) => (
                <div key={index} className={`p-4 rounded-md ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Produto</label>
                      <select
                        value={item.produto_id}
                        onChange={(e) => handleItemChange(index, 'produto_id', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        required
                      >
                        <option value="">Selecione um produto</option>
                        {produtos.map(produto => (
                          <option key={produto.id} value={produto.id}>
                            {produto.descricao}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Quantidade</label>
                      <input
                        type="number"
                        value={item.quantidade}
                        onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                        min="1"
                        className={`w-full p-2 rounded-md border ${
                          darkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Valor Unitário</label>
                      <input
                        type="number"
                        value={item.valor_unitario}
                        onChange={(e) => handleItemChange(index, 'valor_unitario', e.target.value)}
                        min="0"
                        step="0.01"
                        className={`w-full p-2 rounded-md border ${
                          darkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Valor Total</label>
                      <input
                        type="number"
                        value={item.valor_total}
                        readOnly
                        className={`w-full p-2 rounded-md border ${
                          darkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md ${
                        darkMode 
                          ? 'bg-red-600 text-white hover:bg-red-700' 
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      <FiTrash2 className="mr-2" />
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium mb-2">Observações</label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              rows="4"
              className={`w-full p-2 rounded-md border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/orcamentos')}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                darkMode 
                  ? 'bg-gray-600 text-white hover:bg-gray-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FiX className="mr-2" />
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              <FiSave className="mr-2" />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrcamentoEdit; 