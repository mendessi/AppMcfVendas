import React, { useState, useEffect } from 'react';
import { FiShoppingCart, FiFilter, FiSearch, FiX } from 'react-icons/fi';

const CatalogoProdutos = ({ darkMode }) => {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [carrinhoItens, setCarrinhoItens] = useState([]);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  useEffect(() => {
    // Em um ambiente real, você faria chamadas à API aqui
    // Por enquanto, vamos simular dados
    const fetchData = async () => {
      try {
        // Simular uma chamada de API para produtos
        setTimeout(() => {
          const mockProdutos = [
            { 
              id: 1, 
              codigo: 'M001', 
              descricao: 'Pneu Dianteiro Moto 90/90-19', 
              preco: 189.90, 
              estoque: 25, 
              unidade: 'UND',
              categoria: 'pneus-moto',
              imagem: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 2, 
              codigo: 'M002', 
              descricao: 'Pneu Traseiro Moto 110/90-17', 
              preco: 219.50, 
              estoque: 20, 
              unidade: 'UND',
              categoria: 'pneus-moto',
              imagem: 'https://images.unsplash.com/photo-1605001011156-cbf0b0f67a51?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 3, 
              codigo: 'M003', 
              descricao: 'Óleo Motor 4T 20W-50 1L', 
              preco: 35.99, 
              estoque: 50, 
              unidade: 'UND',
              categoria: 'lubrificantes',
              imagem: 'https://images.unsplash.com/photo-1635273051839-003250536b68?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 4, 
              codigo: 'M004', 
              descricao: 'Kit Relação Moto CG 160', 
              preco: 145.90, 
              estoque: 15, 
              unidade: 'KIT',
              categoria: 'transmissao-moto',
              imagem: 'https://images.unsplash.com/photo-1600861195091-690de43c4106?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 5, 
              codigo: 'M005', 
              descricao: 'Bateria Moto 12V 6Ah', 
              preco: 159.80, 
              estoque: 18, 
              unidade: 'UND',
              categoria: 'eletrica-moto',
              imagem: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 6, 
              codigo: 'M006', 
              descricao: 'Pastilha de Freio Dianteiro CB 300', 
              preco: 49.99, 
              estoque: 30, 
              unidade: 'PAR',
              categoria: 'freios-moto',
              imagem: 'https://images.unsplash.com/photo-1600345957894-4854e82910ac?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 7, 
              codigo: 'M007', 
              descricao: 'Disco de Freio Dianteiro CB 300', 
              preco: 129.50, 
              estoque: 12, 
              unidade: 'UND',
              categoria: 'freios-moto',
              imagem: 'https://images.unsplash.com/photo-1616712134411-6b6ae89bc3ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 8, 
              codigo: 'M008', 
              descricao: 'Filtro de Ar CG 160', 
              preco: 29.99, 
              estoque: 40, 
              unidade: 'UND',
              categoria: 'filtros-moto',
              imagem: 'https://images.unsplash.com/photo-1600861194942-7f2ff2f5e2c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 9, 
              codigo: 'B001', 
              descricao: 'Pneu Bicicleta Aro 29 MTB', 
              preco: 89.50, 
              estoque: 22, 
              unidade: 'UND',
              categoria: 'pneus-bicicleta',
              imagem: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 10, 
              codigo: 'B002', 
              descricao: 'Câmara de Ar Bicicleta Aro 29', 
              preco: 22.79, 
              estoque: 35, 
              unidade: 'UND',
              categoria: 'pneus-bicicleta',
              imagem: 'https://images.unsplash.com/photo-1582516217413-6a0d6d8083e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 11, 
              codigo: 'B003', 
              descricao: 'Corrente Bicicleta 21 Marchas', 
              preco: 45.99, 
              estoque: 28, 
              unidade: 'UND',
              categoria: 'transmissao-bicicleta',
              imagem: 'https://images.unsplash.com/photo-1511994298241-608e28f14fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 12, 
              codigo: 'B004', 
              descricao: 'Pastilha Freio a Disco Bicicleta', 
              preco: 39.99, 
              estoque: 25, 
              unidade: 'PAR',
              categoria: 'freios-bicicleta',
              imagem: 'https://images.unsplash.com/photo-1559348349-86d1b6b0a795?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 13, 
              codigo: 'B005', 
              descricao: 'Guidão MTB Alumínio 720mm', 
              preco: 89.90, 
              estoque: 15, 
              unidade: 'UND',
              categoria: 'componentes-bicicleta',
              imagem: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 14, 
              codigo: 'B006', 
              descricao: 'Pedal Plataforma Alumínio', 
              preco: 69.50, 
              estoque: 20, 
              unidade: 'PAR',
              categoria: 'componentes-bicicleta',
              imagem: 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 15, 
              codigo: 'A001', 
              descricao: 'Capacete Moto Integral', 
              preco: 289.90, 
              estoque: 10, 
              unidade: 'UND',
              categoria: 'acessorios-moto',
              imagem: 'https://images.unsplash.com/photo-1591370409347-2fd43b7842d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 16, 
              codigo: 'A002', 
              descricao: 'Capacete Ciclismo MTB', 
              preco: 129.90, 
              estoque: 18, 
              unidade: 'UND',
              categoria: 'acessorios-bicicleta',
              imagem: 'https://images.unsplash.com/photo-1505739818593-d28c6e386340?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 17, 
              codigo: 'A003', 
              descricao: 'Luva Ciclismo Gel', 
              preco: 59.90, 
              estoque: 22, 
              unidade: 'PAR',
              categoria: 'acessorios-bicicleta',
              imagem: 'https://images.unsplash.com/photo-1531413458087-ea3a5faa2a90?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 18, 
              codigo: 'A004', 
              descricao: 'Jaqueta Motociclista Impermeável', 
              preco: 259.90, 
              estoque: 8, 
              unidade: 'UND',
              categoria: 'acessorios-moto',
              imagem: 'https://images.unsplash.com/photo-1558981852-426c6c22a060?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 19, 
              codigo: 'F001', 
              descricao: 'Graxa para Corrente Moto 100g', 
              preco: 19.90, 
              estoque: 30, 
              unidade: 'UND',
              categoria: 'lubrificantes',
              imagem: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
            { 
              id: 20, 
              codigo: 'F002', 
              descricao: 'Óleo Lubrificante Corrente Bicicleta', 
              preco: 29.90, 
              estoque: 25, 
              unidade: 'UND',
              categoria: 'lubrificantes',
              imagem: 'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
            },
          ];
          
          // Extrair categorias únicas
          const uniqueCategorias = ['todas', ...new Set(mockProdutos.map(produto => produto.categoria))];
          
          setProdutos(mockProdutos);
          setCategorias(uniqueCategorias);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtrar produtos por categoria e termo de busca
  const filteredProdutos = produtos.filter(produto => {
    const matchesCategoria = categoriaAtiva === 'todas' || produto.categoria === categoriaAtiva;
    const matchesSearch = produto.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         produto.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategoria && matchesSearch;
  });

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

      {/* Barra de pesquisa e filtros */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
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
          />
        </div>
        
        <div className="relative sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiFilter className={darkMode ? "text-gray-400" : "text-gray-500"} />
          </div>
          <select
            className={`pl-10 w-full p-2 border rounded appearance-none ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"}`}
            value={categoriaAtiva}
            onChange={(e) => setCategoriaAtiva(e.target.value)}
          >
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
              </option>
            ))}
          </select>
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
      {filteredProdutos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProdutos.map((produto) => (
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
