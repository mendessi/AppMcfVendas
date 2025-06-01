import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiX, FiUser, FiPackage } from 'react-icons/fi';
import ProdutoAutocomplete from './ProdutoAutocomplete';
import api from '../services/api';

const NovoPedido = ({ darkMode }) => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [clienteSelecionadoObj, setClienteSelecionadoObj] = useState(null);
  const [itensPedido, setItensPedido] = useState([]);
  const [observacao, setObservacao] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Estados para busca e autocompletar
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [clientesSugeridos, setClientesSugeridos] = useState([]);
  const [showClientesSugeridos, setShowClientesSugeridos] = useState(false);
  
  // Refs para os dropdowns
  const clienteDropdownRef = useRef(null);

  // Estado para controlar a edição de itens
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingPreco, setEditingPreco] = useState('');
  const [editingQuantidade, setEditingQuantidade] = useState('');

  // Função para adicionar item ao pedido
  const adicionarItemAoPedido = (produto) => {
    console.log('Tentando adicionar produto:', produto);
    
    if (!produto || !produto.pro_codigo) {
      console.error('Produto inválido:', produto);
      return;
    }

    const novoItem = {
      produto_id: produto.pro_codigo,
      produto_codigo: produto.pro_codigo,
      produto_descricao: produto.pro_descricao,
      preco_unitario: parseFloat(produto.pro_venda || 0),
      quantidade: 1,
      unidade: produto.uni_codigo,
      valor_total: parseFloat(produto.pro_venda || 0),
      editavel: true
    };

    console.log('Novo item criado:', novoItem);

    setItensPedido(prevItens => {
      const novosItens = [...prevItens, novoItem];
      console.log('Lista atualizada de itens:', novosItens);
      return novosItens;
    });

    // Ativar modo de edição
    console.log('Ativando modo de edição para:', novoItem.produto_id);
    setEditingItemId(novoItem.produto_id);
    setEditingPreco(novoItem.preco_unitario.toString());
    setEditingQuantidade('1');
  };

  // Função para iniciar a edição de um item
  const handleStartEditing = (item) => {
    setEditingItemId(item.produto_id);
    setEditingPreco(item.preco_unitario.toString());
    setEditingQuantidade(item.quantidade.toString());
  };
  
  // Função para salvar as alterações de um item em edição
  const handleSaveEdit = (itemId) => {
    const preco = parseFloat(editingPreco.replace(',', '.'));
    const quantidade = parseFloat(editingQuantidade.replace(',', '.'));
    
    if (isNaN(preco) || isNaN(quantidade) || preco <= 0 || quantidade <= 0) {
      alert('Por favor, informe valores válidos para preço e quantidade.');
      return;
    }
    
    const novosItens = itensPedido.map(item => {
      if (item.produto_id === itemId) {
        return {
          ...item,
          preco_unitario: preco,
          quantidade: quantidade,
          valor_total: preco * quantidade,
          editavel: false
        };
      }
      return item;
    });
    
    setItensPedido(novosItens);
    setEditingItemId(null);
    setEditingPreco('');
    setEditingQuantidade('');
  };
  
  // Função para cancelar a edição
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingPreco('');
    setEditingQuantidade('');
  };

  const handleRemoveItem = (produtoId) => {
    const novosItens = itensPedido.filter(item => item.produto_id !== produtoId);
    setItensPedido(novosItens);
  };

  useEffect(() => {
    // Em um ambiente real, você faria chamadas à API aqui
    // Por enquanto, vamos simular dados
    const fetchData = async () => {
      try {
        // Simular uma chamada de API para clientes
        setTimeout(() => {
          // Gerar 300 clientes para simular um banco de dados grande
          const mockClientes = [];
          for (let i = 1; i <= 300; i++) {
            mockClientes.push({
              id: i,
              nome: `Cliente ${i}`,
              cnpj_cpf: `${Math.floor(10000000000 + Math.random() * 90000000000)}`
            });
          }
          
          // Adicionar alguns clientes com nomes mais realistas
          mockClientes[0] = { id: 1, nome: 'Moto Peças Express', cnpj_cpf: '12.345.678/0001-90' };
          mockClientes[1] = { id: 2, nome: 'Ciclo Bike Center', cnpj_cpf: '23.456.789/0001-01' };
          mockClientes[2] = { id: 3, nome: 'Moto & Cia Distribuidora', cnpj_cpf: '34.567.890/0001-12' };
          mockClientes[3] = { id: 4, nome: 'Bicicletaria do Vale', cnpj_cpf: '45.678.901/0001-23' };
          mockClientes[4] = { id: 5, nome: 'Moto Parts Importados', cnpj_cpf: '56.789.012/0001-34' };
          
          setClientes(mockClientes);
          
          // Simular uma chamada de API para produtos - adaptado para peças de motos e bicicletas
          const mockProdutos = [
            { id: 1, codigo: 'M001', descricao: 'Pneu Dianteiro Moto 90/90-19', preco: 189.90, estoque: 25, unidade: 'UND' },
            { id: 2, codigo: 'M002', descricao: 'Pneu Traseiro Moto 110/90-17', preco: 219.50, estoque: 20, unidade: 'UND' },
            { id: 3, codigo: 'M003', descricao: 'Óleo Motor 4T 20W-50 1L', preco: 35.99, estoque: 50, unidade: 'UND' },
            { id: 4, codigo: 'M004', descricao: 'Kit Relação Moto CG 160', preco: 145.90, estoque: 15, unidade: 'KIT' },
            { id: 5, codigo: 'M005', descricao: 'Bateria Moto 12V 6Ah', preco: 159.80, estoque: 18, unidade: 'UND' },
            { id: 6, codigo: 'M006', descricao: 'Pastilha de Freio Dianteiro CB 300', preco: 49.99, estoque: 30, unidade: 'PAR' },
            { id: 7, codigo: 'M007', descricao: 'Disco de Freio Dianteiro CB 300', preco: 129.50, estoque: 12, unidade: 'UND' },
            { id: 8, codigo: 'M008', descricao: 'Filtro de Ar CG 160', preco: 29.99, estoque: 40, unidade: 'UND' },
            { id: 9, codigo: 'B001', descricao: 'Pneu Bicicleta Aro 29 MTB', preco: 89.50, estoque: 22, unidade: 'UND' },
            { id: 10, codigo: 'B002', descricao: 'Câmara de Ar Bicicleta Aro 29', preco: 22.79, estoque: 35, unidade: 'UND' },
          ];
          
          // Adicionar mais produtos para simular um banco de dados grande
          for (let i = 11; i <= 300; i++) {
            const tipo = Math.random() > 0.5 ? 'M' : 'B';
            const codigo = `${tipo}${i.toString().padStart(3, '0')}`;
            const descricao = `Peça ${tipo === 'M' ? 'Moto' : 'Bicicleta'} ${i}`;
            mockProdutos.push({
              id: i,
              codigo: codigo,
              descricao: descricao,
              preco: Math.floor(Math.random() * 200) + 10 + Math.random(),
              estoque: Math.floor(Math.random() * 50) + 5,
              unidade: ['UND', 'PAR', 'KIT'][Math.floor(Math.random() * 3)]
            });
          }
          
          setProdutos(mockProdutos);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Filtrar clientes com base no termo de busca
  useEffect(() => {
    if (clienteSearchTerm.trim() === '') {
      setClientesSugeridos([]);
      return;
    }
    
    const termLower = clienteSearchTerm.toLowerCase();
    const filtered = clientes.filter(cliente => 
      cliente.nome.toLowerCase().includes(termLower) || 
      cliente.cnpj_cpf.includes(termLower)
    ).slice(0, 10); // Limitar a 10 resultados para melhor desempenho
    
    setClientesSugeridos(filtered);
    setShowClientesSugeridos(filtered.length > 0);
  }, [clienteSearchTerm, clientes]);
  
  // Selecionar cliente
  const handleSelectCliente = (cliente) => {
    setClienteSelecionadoObj(cliente);
    setSelectedCliente(cliente.id.toString());
    setClienteSearchTerm(cliente.nome);
    setShowClientesSugeridos(false);
  };
  
  // Limpar cliente selecionado
  const handleClearCliente = () => {
    setClienteSelecionadoObj(null);
    setSelectedCliente('');
    setClienteSearchTerm('');
  };

  const calcularTotalPedido = () => {
    return itensPedido.reduce((total, item) => total + item.valor_total, 0);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!clienteSelecionadoObj) {
      alert('Selecione um cliente');
      return;
    }

    if (itensPedido.length === 0) {
      alert('Adicione pelo menos um item ao pedido');
      return;
    }

    setSubmitting(true);

    try {
      // Simular envio do pedido para a API
      setSubmitting(true);
      
      setTimeout(() => {
        const pedido = {
          id: Math.floor(Math.random() * 1000) + 1,
          cliente_id: clienteSelecionadoObj.id,
          cliente_nome: clienteSelecionadoObj.nome,
          cliente_cnpj_cpf: clienteSelecionadoObj.cnpj_cpf,
          data: new Date().toISOString(),
          itens: itensPedido,
          observacao: observacao,
          valor_total: calcularTotalPedido()
        };
        
        console.log('Pedido enviado:', pedido);
        
        // Simular sucesso
        setSubmitting(false);
        alert('Pedido criado com sucesso!');
        navigate('/pedidos');
      }, 1500);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      alert('Erro ao criar pedido. Tente novamente.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-blue-400" : "text-blue-600"}>Carregando dados...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Novo Pedido</h1>
        <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Preencha os dados para criar um novo pedido</p>
        
        {/* Nova mensagem sobre vendas diretas */}
        <div className={`mt-4 p-4 rounded-lg ${darkMode ? "bg-blue-900/30 border border-blue-700" : "bg-blue-50 border border-blue-200"}`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${darkMode ? "bg-blue-900" : "bg-blue-100"}`}>
              <svg className={`w-5 h-5 ${darkMode ? "text-blue-400" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className={`text-sm font-semibold mb-1 ${darkMode ? "text-blue-400" : "text-blue-700"}`}>
                Em breve: Vendas Diretas!
              </h3>
              <p className={`text-sm ${darkMode ? "text-blue-300" : "text-blue-600"}`}>
                Estamos trabalhando em uma atualização que permitirá realizar vendas diretas, sem a necessidade de aprovação prévia do orçamento. Isso tornará seu processo de vendas ainda mais ágil e eficiente!
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-6 mb-6`}>
          <h2 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"} mb-4`}>Dados do Cliente</h2>
          
          <div className="mb-4 relative">
            <label className={`block ${darkMode ? "text-gray-300" : "text-gray-700"} text-sm font-bold mb-2 flex items-center`} htmlFor="cliente">
              <FiUser className="mr-2" /> Cliente
            </label>
            <div className="relative" ref={clienteDropdownRef}>
              <div className="flex">
                <div className="relative flex-grow">
                  <input
                    id="cliente"
                    type="text"
                    className={`shadow appearance-none border rounded-l w-full py-2 px-3 pl-8 ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"} leading-tight focus:outline-none focus:shadow-outline`}
                    placeholder="Digite nome ou CNPJ/CPF..."
                    value={clienteSearchTerm}
                    onChange={(e) => setClienteSearchTerm(e.target.value)}
                    onFocus={() => {
                      if (clienteSearchTerm.trim() !== '' && clientesSugeridos.length > 0) {
                        setShowClientesSugeridos(true);
                      }
                    }}
                    required={!clienteSelecionadoObj}
                  />
                  <FiSearch className="absolute left-2 top-2.5 text-gray-400" />
                </div>
                {clienteSearchTerm && (
                  <button 
                    type="button"
                    onClick={handleClearCliente}
                    className={`px-3 py-2 ${darkMode ? "bg-gray-600 hover:bg-gray-500 border-gray-600" : "bg-gray-200 hover:bg-gray-300 border-gray-300"} border rounded-r`}
                  >
                    <FiX />
                  </button>
                )}
              </div>
              
              {showClientesSugeridos && (
                <div className={`absolute z-10 w-full mt-1 rounded-md shadow-lg ${darkMode ? "bg-gray-700" : "bg-white"} max-h-60 overflow-auto`}>
                  {clientesSugeridos.length > 0 ? (
                    clientesSugeridos.map((cliente) => (
                      <div 
                        key={cliente.id} 
                        className={`p-2 cursor-pointer ${darkMode ? "hover:bg-gray-600 border-b border-gray-600" : "hover:bg-gray-100 border-b border-gray-200"} ${clienteSelecionadoObj && clienteSelecionadoObj.id === cliente.id ? (darkMode ? "bg-gray-600" : "bg-blue-50") : ""}`}
                        onClick={() => handleSelectCliente(cliente)}
                      >
                        <div className="font-medium">{cliente.nome}</div>
                        <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{cliente.cnpj_cpf}</div>
                      </div>
                    ))
                  ) : (
                    <div className={`p-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Nenhum cliente encontrado</div>
                  )}
                </div>
              )}
            </div>
            <div className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {clientes.length} clientes disponíveis. Digite para filtrar.
            </div>
          </div>

          <div className="mb-4">
            <label className={`block ${darkMode ? "text-gray-300" : "text-gray-700"} text-sm font-bold mb-2`} htmlFor="observacao">
              Observação
            </label>
            <textarea
              id="observacao"
              className={`shadow appearance-none border rounded w-full py-2 px-3 ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"} leading-tight focus:outline-none focus:shadow-outline`}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows="2"
            ></textarea>
          </div>
        </div>

        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-6 mb-6`}>
          <h2 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"} mb-4`}>Itens do Pedido</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <label className={`block ${darkMode ? "text-gray-300" : "text-gray-700"} text-sm font-bold mb-2 flex items-center`} htmlFor="produto">
                <FiPackage className="mr-2" /> Produto
              </label>
              <ProdutoAutocomplete
                onSelect={adicionarItemAoPedido}
                darkMode={darkMode}
              />
            </div>
            
            <div>
              <label className={`block ${darkMode ? "text-gray-300" : "text-gray-700"} text-sm font-bold mb-2`} htmlFor="quantidade">
                Quantidade
              </label>
              <input
                id="quantidade"
                type="number"
                min="0.01"
                step="0.01"
                className={`shadow appearance-none border rounded w-full py-2 px-3 ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"} leading-tight focus:outline-none focus:shadow-outline`}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
          </div>

          {/* Tabela de itens do pedido - Visível apenas em telas maiores */}
          <div className="hidden md:block">
            {itensPedido.length > 0 ? (
              <div className="overflow-x-auto">
                <table className={`min-w-full ${darkMode ? "text-white" : "text-gray-900"}`}>
                  <thead className={darkMode ? "bg-gray-700" : "bg-gray-200"}>
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Código</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Produto</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Qtd</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Preço Unit.</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Total</th>
                      <th className="px-4 py-2 text-center text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensPedido.map((item, index) => (
                      <tr key={index} className={`${index % 2 === 0 ? (darkMode ? "bg-gray-800" : "bg-white") : (darkMode ? "bg-gray-900" : "bg-gray-50")} ${item.editavel ? (darkMode ? "bg-gray-700" : "bg-blue-50") : ""}`}>
                        <td className="px-4 py-2 text-sm">{item.produto_codigo}</td>
                        <td className="px-4 py-2 text-sm">{item.produto_descricao}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          {editingItemId === item.produto_id ? (
                            <input
                              type="text"
                              className={`w-20 px-2 py-1 text-right rounded ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-white text-gray-900 border-gray-300"} border`}
                              value={editingQuantidade}
                              onChange={(e) => setEditingQuantidade(e.target.value)}
                            />
                          ) : (
                            <span 
                              className="cursor-pointer hover:underline" 
                              onClick={() => handleStartEditing(item)}
                              title="Clique para editar"
                            >
                              {item.quantidade}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          {editingItemId === item.produto_id ? (
                            <input
                              type="text"
                              className={`w-24 px-2 py-1 text-right rounded ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-white text-gray-900 border-gray-300"} border`}
                              value={editingPreco}
                              onChange={(e) => setEditingPreco(e.target.value)}
                            />
                          ) : (
                            <span 
                              className="cursor-pointer hover:underline" 
                              onClick={() => handleStartEditing(item)}
                              title="Clique para editar"
                            >
                              {formatCurrency(item.preco_unitario)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-semibold">{formatCurrency(item.valor_total)}</td>
                        <td className="px-4 py-2 text-sm text-center">
                          {editingItemId === item.produto_id ? (
                            <div className="flex space-x-1 justify-center">
                              <button
                                type="button"
                                className={`px-2 py-1 rounded text-xs ${darkMode ? "bg-green-800 text-green-200" : "bg-green-100 text-green-700"}`}
                                onClick={() => handleSaveEdit(item.produto_id)}
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                className={`px-2 py-1 rounded text-xs ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}`}
                                onClick={handleCancelEdit}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-1 justify-center">
                              <button
                                type="button"
                                className={`px-2 py-1 rounded text-xs ${darkMode ? "bg-blue-800 text-blue-200" : "bg-blue-100 text-blue-700"}`}
                                onClick={() => handleStartEditing(item)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className={`px-2 py-1 rounded text-xs ${darkMode ? "bg-red-900 text-red-300" : "bg-red-100 text-red-700"}`}
                                onClick={() => handleRemoveItem(item.produto_id)}
                              >
                                Remover
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className={darkMode ? "bg-gray-900" : "bg-gray-100"}>
                      <td colSpan="4" className={`px-4 py-2 text-sm font-bold text-right ${darkMode ? "text-white" : "text-gray-900"}`}>Total:</td>
                      <td className={`px-4 py-2 text-sm font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(calcularTotalPedido())}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`text-center py-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Nenhum item adicionado ao pedido
              </div>
            )}
          </div>

          {/* Versão para dispositivos móveis */}
          <div className="md:hidden mt-6">
            {itensPedido.length > 0 ? (
              <div className="space-y-4">
                {itensPedido.map((item, index) => (
                  <div key={index} className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"} ${item.editavel ? (darkMode ? "border border-blue-500" : "border-2 border-blue-300") : ""}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{item.produto_descricao}</p>
                        <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Código: {item.produto_codigo}</p>
                      </div>
                      {editingItemId === item.produto_id ? (
                        <div className="flex space-x-1">
                          <button
                            type="button"
                            className={`px-2 py-1 rounded text-xs ${darkMode ? "bg-green-800 text-green-200" : "bg-green-100 text-green-700"}`}
                            onClick={() => handleSaveEdit(item.produto_id)}
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            className={`px-2 py-1 rounded text-xs ${darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-200 text-gray-700"}`}
                            onClick={handleCancelEdit}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-1">
                          <button
                            type="button"
                            className={`px-2 py-1 rounded text-xs ${darkMode ? "bg-blue-800 text-blue-200" : "bg-blue-100 text-blue-700"}`}
                            onClick={() => handleStartEditing(item)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={`px-2 py-1 rounded text-xs ${darkMode ? "bg-red-900 text-red-300" : "bg-red-100 text-red-700"}`}
                            onClick={() => handleRemoveItem(item.produto_id)}
                          >
                            Remover
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {editingItemId === item.produto_id ? (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className={`block text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>Quantidade:</label>
                          <input
                            type="text"
                            className={`w-full px-2 py-1 text-right rounded ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-white text-gray-900 border-gray-300"} border`}
                            value={editingQuantidade}
                            onChange={(e) => setEditingQuantidade(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>Preço Unit.:</label>
                          <input
                            type="text"
                            className={`w-full px-2 py-1 text-right rounded ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-white text-gray-900 border-gray-300"} border`}
                            value={editingPreco}
                            onChange={(e) => setEditingPreco(e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                          <span className="cursor-pointer hover:underline" onClick={() => handleStartEditing(item)}>
                            {item.quantidade}
                          </span> x <span className="cursor-pointer hover:underline" onClick={() => handleStartEditing(item)}>
                            {formatCurrency(item.preco_unitario)}
                          </span>
                        </span>
                        <span className={`font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(item.valor_total)}</span>
                      </div>
                    )}
                  </div>
                ))}
                <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-900" : "bg-gray-100"} flex justify-between items-center`}>
                  <span className={`font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>Total do Pedido:</span>
                  <span className={`font-bold text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(calcularTotalPedido())}</span>
                </div>
              </div>
            ) : (
              <div className={`text-center py-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Nenhum item adicionado ao pedido
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            className={`${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-300 hover:bg-gray-400 text-gray-800"} font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full sm:w-auto`}
            onClick={() => navigate('/pedidos')}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full sm:w-auto ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={submitting}
          >
            {submitting ? 'Salvando...' : 'Salvar Pedido'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NovoPedido;
