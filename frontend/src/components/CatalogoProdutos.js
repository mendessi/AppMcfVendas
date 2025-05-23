import React, { useState, useEffect } from 'react';
import { FiShoppingCart, FiFilter, FiSearch, FiX } from 'react-icons/fi';

const CatalogoProdutos = ({ darkMode, empresaSelecionada }) => {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([{ nome: 'Todas', codigo: 'todas' }]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]); // For explicit search/filter
  const [carrinhoItens, setCarrinhoItens] = useState([]);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  useEffect(() => {
    // Busca grupos de produtos ao montar o componente
    const fetchGrupos = async () => {
      try {
        const token = localStorage.getItem('token');
        const empresaCodigo = empresaSelecionada?.cli_codigo || empresaSelecionada?.codigo;
        const headers = {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo,
          'Content-Type': 'application/json',
        };
        const apiUrl = process.env.REACT_APP_API_URL || '';
        const url = `${apiUrl}/grupos`;
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Erro ao buscar grupos');
        const grupos = await response.json();
        setCategorias([{ nome: 'Todas', codigo: 'todas' }, ...grupos.map(g => ({ nome: g.gru_nome || g.nome, codigo: g.gru_codigo || g.codigo }))]);
      } catch (err) {
        setCategorias([{ nome: 'Todas', codigo: 'todas' }]);
        console.error('Erro ao buscar grupos:', err);
      }
    };
    fetchGrupos();
  }, [empresaSelecionada]);

  useEffect(() => {
    // Busca real dos produtos da API
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const empresaCodigo = empresaSelecionada?.cli_codigo || empresaSelecionada?.codigo;
        const headers = {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo,
          'Content-Type': 'application/json',
        };
        const apiUrl = process.env.REACT_APP_API_URL || '';
        const url = `${apiUrl}/relatorios/produtos?q=`;
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Erro ao buscar produtos');
        const data = await response.json();
        // Adicionar imagens fictícias
        const imagensFicticias = [
          'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1605001011156-cbf0b0f67a51?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1635273051839-003250536b68?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1600861195091-690de43c4106?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1600345957894-4854e82910ac?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1616712134411-6b6ae89bc3ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1600861194942-7f2ff2f5e2c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1582516217413-6a0d6d8083e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
          'https://images.unsplash.com/photo-1559348349-86d1b6b0a795?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        ];
        const produtosComImagens = data.map((p, idx) => ({
          id: idx + 1,
          codigo: p.pro_codigo,
          descricao: p.pro_descricao,
          preco: p.pro_venda,
          aprazo: p.pro_vendapz,
          estoque: p.pro_quantidade,
          unidade: p.uni_codigo,
          imagem: imagensFicticias[idx % imagensFicticias.length],
          grupo: p.gru_codigo || p.grupo || '', // Adiciona o grupo do produto
        }));
        setProdutos(produtosComImagens);
        // Categorias podem ser derivadas dos produtos, se necessário
      } catch (error) {
        setProdutos([]);
        console.error('Erro ao carregar produtos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line
  }, [empresaSelecionada]);

  // Função para filtrar produtos explicitamente
  const handleBuscar = () => {
    let lista = produtos;
    // Filtrar por grupo/categoria
    if (categoriaAtiva !== 'todas') {
      lista = lista.filter(produto => produto.grupo === categoriaAtiva).slice(0, 50);
    } else {
      lista = lista.slice(0, 50);
    }
    // Filtrar por termo de busca (aplica sobre o resultado já limitado)
    if (searchTerm.trim() !== '') {
      lista = lista.filter(produto =>
        produto.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produto.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setProdutosFiltrados(lista);
  };


  // Atualiza produtos exibidos ao mudar produtos, categoria ou busca
  useEffect(() => {
    handleBuscar();
    // eslint-disable-next-line
  }, [produtos, categoriaAtiva, searchTerm]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleAddToCart = (produto) => {
    // Verificar se o produto já está no carrinho
    const existingItem = carrinhoItens.find(item => item.produto_id === produto.id);
    
    if (existingItem) {
      // Atualizar a quantidade do item existente
      const updatedItems = carrinhoItens.map(item => {
        if (item.produto_id === produto.id) {
          return {
            ...item,
            quantidade: item.quantidade + 1,
            valor_total: (item.quantidade + 1) * item.preco_unitario
          };
        }
        return item;
      });
      setCarrinhoItens(updatedItems);
    } else {
      // Adicionar novo item ao carrinho
      const newItem = {
        produto_id: produto.id,
        produto_codigo: produto.codigo,
        produto_descricao: produto.descricao,
        quantidade: 1,
        preco_unitario: produto.preco,
        valor_total: produto.preco,
        unidade: produto.unidade
      };
      setCarrinhoItens([...carrinhoItens, newItem]);
    }
    
    // Mostrar o carrinho ao adicionar um item
    setCarrinhoAberto(true);
  };

  const handleRemoveFromCart = (produtoId) => {
    setCarrinhoItens(carrinhoItens.filter(item => item.produto_id !== produtoId));
  };

  const updateItemQuantity = (produtoId, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      handleRemoveFromCart(produtoId);
      return;
    }
    
    const updatedItems = carrinhoItens.map(item => {
      if (item.produto_id === produtoId) {
        return {
          ...item,
          quantidade: novaQuantidade,
          valor_total: novaQuantidade * item.preco_unitario
        };
      }
      return item;
    });
    
    setCarrinhoItens(updatedItems);
  };

  const calcularTotalCarrinho = () => {
    return carrinhoItens.reduce((total, item) => total + item.valor_total, 0);
  };

  const limparCarrinho = () => {
    setCarrinhoItens([]);
  };

  const toggleCarrinho = () => {
    setCarrinhoAberto(!carrinhoAberto);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-blue-400" : "text-blue-600"}>Carregando produtos...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Catálogo de Peças</h1>
          <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Peças e acessórios para motos e bicicletas</p>
        </div>
        
        <button 
          onClick={toggleCarrinho}
          className={`relative flex items-center px-4 py-2 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"} text-white w-full sm:w-auto`}
        >
          <FiShoppingCart className="mr-2" />
          <span>Carrinho</span>
          {carrinhoItens.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {carrinhoItens.length}
            </span>
          )}
        </button>
      </div>

      {/* Barra de pesquisa */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className={darkMode ? "text-gray-400" : "text-gray-500"} />
          </div>
          <input
            type="text"
            placeholder="Buscar produtos..."
            className={`pl-10 w-full p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-700"}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleBuscar(); }}
          />
        </div>
        <button
          className={`flex items-center px-4 py-2 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'} ml-0 sm:ml-2`}
          style={{ minWidth: 120 }}
          onClick={handleBuscar}
        >
          <FiSearch className="mr-2" />Buscar
        </button>
      </div>
      {/* Lista horizontal de categorias (estilo e-commerce) */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex space-x-2 pb-2">
          {categorias.map((cat) => (
            <button
              key={cat.codigo}
              className={
                `px-5 py-2 rounded-full border-2 font-medium transition-all whitespace-nowrap text-base ` +
                (categoriaAtiva === cat.codigo
                  ? (darkMode ? 'bg-blue-700 border-blue-400 text-white shadow' : 'bg-blue-100 border-blue-500 text-blue-900 shadow')
                  : (darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-blue-900 hover:border-blue-400' : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400'))
              }
              onClick={() => setCategoriaAtiva(cat.codigo)}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Carrinho lateral */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${carrinhoAberto ? 'translate-x-0' : 'translate-x-full'} pt-16 overflow-y-auto`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Seu Carrinho</h2>
            <button 
              onClick={toggleCarrinho}
              className={`p-2 rounded-full ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"}`}
            >
              <FiX className={darkMode ? "text-white" : "text-gray-800"} />
            </button>
          </div>
          
          {carrinhoItens.length > 0 ? (
            <>
              <div className="space-y-4 mb-6">
                {carrinhoItens.map((item) => (
                  <div key={item.produto_id} className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                    <div className="flex justify-between mb-2">
                      <div className="flex-1">
                        <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>{item.produto_descricao}</p>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{formatCurrency(item.preco_unitario)} / {item.unidade}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(item.produto_id)}
                        className={`text-red-500 hover:text-red-700 p-1`}
                      >
                        <FiX />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <button
                          onClick={() => updateItemQuantity(item.produto_id, item.quantidade - 1)}
                          className={`w-8 h-8 flex items-center justify-center rounded-l ${darkMode ? "bg-gray-600 text-white" : "bg-gray-200 text-gray-800"}`}
                        >
                          -
                        </button>
                        <span className={`w-10 h-8 flex items-center justify-center ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"} border-t border-b ${darkMode ? "border-gray-600" : "border-gray-300"}`}>
                          {item.quantidade}
                        </span>
                        <button
                          onClick={() => updateItemQuantity(item.produto_id, item.quantidade + 1)}
                          className={`w-8 h-8 flex items-center justify-center rounded-r ${darkMode ? "bg-gray-600 text-white" : "bg-gray-200 text-gray-800"}`}
                        >
                          +
                        </button>
                      </div>
                      <span className={`font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                        {formatCurrency(item.valor_total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-900" : "bg-gray-200"} mb-4`}>
                <div className="flex justify-between items-center">
                  <span className={`font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Total:</span>
                  <span className={`font-bold text-lg ${darkMode ? "text-white" : "text-gray-800"}`}>
                    {formatCurrency(calcularTotalCarrinho())}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <button
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  onClick={() => {
                    alert('Função de finalizar pedido será implementada em breve!');
                  }}
                >
                  Finalizar Pedido
                </button>
                <button
                  className={`w-full py-2 px-4 rounded ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-300 hover:bg-gray-400 text-gray-800"}`}
                  onClick={limparCarrinho}
                >
                  Limpar Carrinho
                </button>
              </div>
            </>
          ) : (
            <div className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              <p className="mb-4">Seu carrinho está vazio</p>
              <button
                onClick={toggleCarrinho}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Continuar Comprando
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay para o carrinho em dispositivos móveis */}
      {carrinhoAberto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleCarrinho}
        ></div>
      )}

      {/* Lista de produtos */}
      {produtosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {produtosFiltrados.map((produto) => (
            <div 
              key={produto.id} 
              className={`rounded-lg overflow-hidden shadow-lg ${darkMode ? "bg-gray-800" : "bg-white"} flex flex-col`}
            >
              <div className="h-48 overflow-hidden">
                <img 
                  src={produto.imagem} 
                  alt={produto.descricao} 
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
              </div>
              <div className="p-4 flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>{produto.descricao}</h3>
                </div>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}>Código: {produto.codigo}</p>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} mb-2`}>Unidade: {produto.unidade}</p>
                <div className="flex justify-between items-center mt-auto pt-2">
                  <span className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                    {formatCurrency(produto.preco)}
                  </span>
                  <button
                    onClick={() => handleAddToCart(produto)}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded flex items-center"
                  >
                    <FiShoppingCart className="mr-1" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`text-center py-8 ${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow`}>
          <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
            Nenhum produto encontrado para os filtros selecionados.
          </p>
        </div>
      )}
    </div>
  );
};

export default CatalogoProdutos;
