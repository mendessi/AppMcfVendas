import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Ícones
import { FiUsers, FiPackage, FiShoppingCart, FiDollarSign, FiCalendar, FiAlertCircle, FiAward, FiTrendingUp } from 'react-icons/fi';

// Componentes
import EmpresaInfo from './EmpresaInfo';
import TopClientes from './TopClientes';
import EmpresaAtualInfo from './EmpresaAtualInfo';

const Dashboard = ({ user, darkMode, empresaSelecionada }) => {
  // Log para debug
  console.log('Dashboard - Empresa selecionada:', empresaSelecionada);
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalProdutos: 0,
    totalPedidos: 0,
    valorTotalPedidos: 0,
    vendasDia: 0,
    vendasMes: 0,
    vendasNaoAutenticadas: 0,
    percentualCrescimento: 0
  });
  const [loading, setLoading] = useState(true);
  const [topProdutos, setTopProdutos] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);

  useEffect(() => {
    // Em um ambiente real, você faria chamadas à API aqui
    // Por enquanto, vamos simular dados
    const fetchData = async () => {
      try {
        // Simular uma chamada de API
        setTimeout(() => {
          // Dados para os cards principais
          setStats({
            totalClientes: 42,
            totalProdutos: 156,
            totalPedidos: 78,
            valorTotalPedidos: 45678.90,
            vendasDia: 5890.50,
            vendasMes: 32450.75,
            vendasNaoAutenticadas: 8750.25,
            percentualCrescimento: 12.5
          });
          
          // Dados para Top 10 Produtos
          const mockTopProdutos = [
            { id: 1, codigo: 'M001', descricao: 'Pneu Dianteiro Moto 90/90-19', quantidade: 42, valor: 7978.80 },
            { id: 2, codigo: 'M005', descricao: 'Bateria Moto 12V 6Ah', quantidade: 38, valor: 6072.40 },
            { id: 3, codigo: 'B001', descricao: 'Pneu Bicicleta Aro 29 MTB', quantidade: 35, valor: 3132.50 },
            { id: 4, codigo: 'M003', descricao: 'Óleo Motor 4T 20W-50 1L', quantidade: 30, valor: 1079.70 },
            { id: 5, codigo: 'M006', descricao: 'Pastilha de Freio Dianteiro CB 300', quantidade: 28, valor: 1399.72 },
            { id: 6, codigo: 'B002', descricao: 'Câmara de Ar Bicicleta Aro 29', quantidade: 25, valor: 569.75 },
            { id: 7, codigo: 'M004', descricao: 'Kit Relação Moto CG 160', quantidade: 22, valor: 3209.80 },
            { id: 8, codigo: 'M002', descricao: 'Pneu Traseiro Moto 110/90-17', quantidade: 20, valor: 4390.00 },
            { id: 9, codigo: 'M008', descricao: 'Filtro de Ar CG 160', quantidade: 18, valor: 539.82 },
            { id: 10, codigo: 'M007', descricao: 'Disco de Freio Dianteiro CB 300', quantidade: 15, valor: 1942.50 }
          ];
          setTopProdutos(mockTopProdutos);
          
          // Dados para Top 10 Clientes
          const mockTopClientes = [
            { id: 1, nome: 'Moto Peças Express', cnpj_cpf: '12.345.678/0001-90', pedidos: 15, valor: 12450.75 },
            { id: 2, nome: 'Ciclo Bike Center', cnpj_cpf: '23.456.789/0001-01', pedidos: 12, valor: 9870.50 },
            { id: 3, nome: 'Moto & Cia Distribuidora', cnpj_cpf: '34.567.890/0001-12', pedidos: 10, valor: 8540.30 },
            { id: 4, nome: 'Bicicletaria do Vale', cnpj_cpf: '45.678.901/0001-23', pedidos: 8, valor: 6230.45 },
            { id: 5, nome: 'Moto Parts Importados', cnpj_cpf: '56.789.012/0001-34', pedidos: 7, valor: 5890.20 },
            { id: 6, nome: 'Oficina Duas Rodas', cnpj_cpf: '67.890.123/0001-45', pedidos: 6, valor: 4780.90 },
            { id: 7, nome: 'Auto Peças Silva', cnpj_cpf: '78.901.234/0001-56', pedidos: 5, valor: 3950.75 },
            { id: 8, nome: 'Ciclo Motos Ltda', cnpj_cpf: '89.012.345/0001-67', pedidos: 4, valor: 3120.60 },
            { id: 9, nome: 'Bicicletas & Motos SA', cnpj_cpf: '90.123.456/0001-78', pedidos: 3, valor: 2540.30 },
            { id: 10, nome: 'Distribuidora Veloz', cnpj_cpf: '01.234.567/0001-89', pedidos: 2, valor: 1890.15 }
          ];
          setTopClientes(mockTopClientes);
          
          // Dados para comparativo de vendedores
          const mockVendedores = [
            { id: 1, nome: 'Carlos Silva', vendas: 42, valor: 15780.50, meta: 15000, percentual: 105.2 },
            { id: 2, nome: 'Ana Oliveira', vendas: 38, valor: 14320.75, meta: 15000, percentual: 95.5 },
            { id: 3, nome: 'Roberto Santos', vendas: 35, valor: 12450.30, meta: 15000, percentual: 83.0 },
            { id: 4, nome: 'Juliana Costa', vendas: 30, valor: 10890.45, meta: 12000, percentual: 90.8 },
            { id: 5, nome: 'Fernando Souza', vendas: 28, valor: 9750.20, meta: 12000, percentual: 81.3 }
          ];
          setVendedores(mockVendedores);
          
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-blue-400" : "text-blue-600"}>Carregando...</div>
      </div>
    );
  }

  // Função para formatar valores monetários
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(value);
  };
  
  // Função para obter a cor da barra de progresso com base no percentual
  const getProgressColor = (percentual, isDarkMode) => {
    if (percentual >= 100) return 'bg-green-600';
    if (percentual >= 70) return 'bg-yellow-400';
    return 'bg-red-500';
  };
  
  // Função para obter a cor do texto com base no percentual
  const getTextColor = (percentual, isDarkMode) => {
    if (percentual >= 100) return 'text-green-500';
    if (percentual >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div>
      {/* Componente flutuante com informações detalhadas da empresa */}
      <EmpresaAtualInfo darkMode={darkMode} />
      
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Dashboard</h1>
          <EmpresaInfo darkMode={darkMode} />
        </div>
        <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Bem-vindo, {user?.name || 'master'}!</p>
      </div>

      {/* Cards de Vendas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Card - Vendas do Dia */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6`}>
          <div className="flex items-center">
            <div className={`p-2 sm:p-3 rounded-full ${darkMode ? "bg-blue-900 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
              <FiDollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendas do Dia</p>
              <p className={`text-lg sm:text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                {formatCurrency(stats.vendasDia)}
              </p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <Link to="/pedidos" className={`text-xs sm:text-sm ${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"}`}>Ver detalhes →</Link>
          </div>
        </div>

        {/* Card - Vendas do Mês */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6`}>
          <div className="flex items-center">
            <div className={`p-2 sm:p-3 rounded-full ${darkMode ? "bg-green-900 text-green-400" : "bg-green-100 text-green-600"}`}>
              <FiCalendar className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendas do Mês</p>
              <p className={`text-lg sm:text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                {formatCurrency(stats.vendasMes)}
              </p>
              <p className={`text-xs ${stats.percentualCrescimento >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.percentualCrescimento >= 0 ? '+' : ''}{stats.percentualCrescimento}% em relação ao mês anterior
              </p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <Link to="/relatorios" className={`text-xs sm:text-sm ${darkMode ? "text-green-400 hover:text-green-300" : "text-green-600 hover:text-green-800"}`}>Ver relatório mensal →</Link>
          </div>
        </div>

        {/* Card - Vendas Não Autenticadas */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6`}>
          <div className="flex items-center">
            <div className={`p-2 sm:p-3 rounded-full ${darkMode ? "bg-yellow-900 text-yellow-400" : "bg-yellow-100 text-yellow-600"}`}>
              <FiAlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vendas Não Autenticadas</p>
              <p className={`text-lg sm:text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                {formatCurrency(stats.vendasNaoAutenticadas)}
              </p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <Link to="/vendas-pendentes" className={`text-xs sm:text-sm ${darkMode ? "text-yellow-400 hover:text-yellow-300" : "text-yellow-600 hover:text-yellow-800"}`}>Verificar pendências →</Link>
          </div>
        </div>

        {/* Card - Total de Pedidos */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6`}>
          <div className="flex items-center">
            <div className={`p-2 sm:p-3 rounded-full ${darkMode ? "bg-purple-900 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
              <FiShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Total de Pedidos</p>
              <p className={`text-lg sm:text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>{stats.totalPedidos}</p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <Link to="/pedidos" className={`text-xs sm:text-sm ${darkMode ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-800"}`}>Ver todos os pedidos →</Link>
          </div>
        </div>
      </div>

      {/* Tabela de Vendedores */}
      <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6 mb-8`}>
        <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-800"} mb-4`}>
          <FiAward className="inline-block mr-2" />
          Vendedores
        </h2>
        
        {/* Versão para desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className={`min-w-full ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            <thead>
              <tr className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-center">Qtd. Vendas</th>
                <th className="px-4 py-2 text-right">Valor Total</th>
                <th className="px-4 py-2 text-right">Meta</th>
                <th className="px-4 py-2 text-center">Desempenho</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map((vendedor, index) => (
                <tr key={vendedor.id} className={index % 2 === 0 ? (darkMode ? "bg-gray-800" : "bg-white") : (darkMode ? "bg-gray-700" : "bg-gray-50")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      {index < 3 && (
                        <span className="mr-2">
                          {index === 0 ? <FiAward className="text-yellow-400" /> : 
                           index === 1 ? <FiAward className="text-gray-400" /> : 
                           <FiAward className="text-yellow-700" />}
                        </span>
                      )}
                      <div>
                        <div className="font-medium">{vendedor.nome}</div>
                        <div className="text-xs text-gray-500">{vendedor.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{vendedor.vendas}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(vendedor.valor)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(vendedor.meta)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-[150px]">
                        <div 
                          className={`h-2.5 rounded-full ${getProgressColor(vendedor.percentual, darkMode)}`} 
                          style={{ width: `${Math.min(vendedor.percentual, 100)}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${getTextColor(vendedor.percentual, darkMode)}`}>
                        {vendedor.percentual}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Versão para celular */}
        <div className="sm:hidden space-y-4">
          {vendedores.slice(0, 5).map((vendedor, index) => (
            <div key={vendedor.id} className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              <div className="flex items-center mb-2">
                {index < 3 && (
                  <span className="mr-2">
                    {index === 0 ? <FiAward className="text-yellow-400" /> : 
                     index === 1 ? <FiAward className="text-gray-400" /> : 
                     <FiAward className="text-yellow-700" />}
                  </span>
                )}
                <div className="flex-grow">
                  <div className="font-medium">{vendedor.nome}</div>
                  <div className="text-xs text-gray-500">{vendedor.email}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(vendedor.valor)}</div>
                  <div className="text-xs text-gray-500">{vendedor.vendas} vendas</div>
                </div>
              </div>
              
              <div className="flex items-center mt-2">
                <div className="text-xs mr-2">
                  Meta: {formatCurrency(vendedor.meta)}
                </div>
                <div className="flex-grow">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${getProgressColor(vendedor.percentual, darkMode)}`} 
                      style={{ width: `${Math.min(vendedor.percentual, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <span className={`text-xs font-medium ml-2 ${getTextColor(vendedor.percentual, darkMode)}`}>
                  {vendedor.percentual}%
                </span>
              </div>
            </div>
          ))}
          
          {vendedores.length > 5 && (
            <button 
              className={`w-full py-2 text-sm text-center rounded-md ${darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              onClick={() => alert('Funcionalidade para ver todos os vendedores em desenvolvimento')}
            >
              Ver todos os vendedores
            </button>
          )}
        </div>
      </div>

      {/* Gráficos e Tabelas */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        {/* Top Clientes */}
        <div className="mb-8">
          <TopClientes darkMode={darkMode} empresaSelecionada={empresaSelecionada} />
          
          {/* Versão para desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className={`min-w-full ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              <thead>
                <tr className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Produto</th>
                  <th className="px-4 py-2 text-center">Qtd</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {topProdutos.map((produto, index) => (
                  <tr key={produto.id} className={index % 2 === 0 ? (darkMode ? "bg-gray-800" : "bg-white") : (darkMode ? "bg-gray-700" : "bg-gray-50")}>
                    <td className="px-4 py-3">
                      {index < 3 ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : 'bg-yellow-700'} text-white font-bold`}>
                          {index + 1}
                        </span>
                      ) : (
                        <span className="px-2">{index + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{produto.descricao}</div>
                        <div className="text-xs text-gray-500">{produto.codigo}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{produto.quantidade}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(produto.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Versão para celular */}
          <div className="sm:hidden">
            <div className="space-y-3">
              {topProdutos.slice(0, 5).map((produto, index) => (
                <div key={produto.id} className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"} flex items-center`}>
                  <div className="mr-3">
                    {index < 3 ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : 'bg-yellow-700'} text-white font-bold`}>
                        {index + 1}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-gray-700 font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="font-medium truncate">{produto.descricao}</div>
                    <div className="text-xs text-gray-500">{produto.codigo}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(produto.valor)}</div>
                    <div className="text-xs text-gray-500">{produto.quantidade} un.</div>
                  </div>
                </div>
              ))}
              {topProdutos.length > 5 && (
                <button 
                  className={`w-full py-2 text-sm text-center rounded-md ${darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => alert('Funcionalidade para ver todos os produtos em desenvolvimento')}
                >
                  Ver mais produtos
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Top 10 Clientes */}
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6`}>
          <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-800"} mb-4`}>Top 10 Clientes</h2>
          
          {/* Versão para desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className={`min-w-full ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              <thead>
                <tr className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-center">Pedidos</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {topClientes.map((cliente, index) => (
                  <tr key={cliente.id} className={index % 2 === 0 ? (darkMode ? "bg-gray-800" : "bg-white") : (darkMode ? "bg-gray-700" : "bg-gray-50")}>
                    <td className="px-4 py-3">
                      {index < 3 ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : 'bg-yellow-700'} text-white font-bold`}>
                          {index + 1}
                        </span>
                      ) : (
                        <span className="px-2">{index + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{cliente.nome}</div>
                        <div className="text-xs text-gray-500">{cliente.cnpj_cpf}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{cliente.pedidos}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(cliente.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Versão para celular */}
          <div className="sm:hidden">
            <div className="space-y-3">
              {topClientes.slice(0, 5).map((cliente, index) => (
                <div key={cliente.id} className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"} flex items-center`}>
                  <div className="mr-3">
                    {index < 3 ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : 'bg-yellow-700'} text-white font-bold`}>
                        {index + 1}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-gray-700 font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="font-medium truncate">{cliente.nome}</div>
                    <div className="text-xs text-gray-500">{cliente.cnpj_cpf}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(cliente.valor)}</div>
                    <div className="text-xs text-gray-500">{cliente.pedidos} pedidos</div>
                  </div>
                </div>
              ))}
              {topClientes.length > 5 && (
                <button 
                  className={`w-full py-2 text-sm text-center rounded-md ${darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => alert('Funcionalidade para ver todos os clientes em desenvolvimento')}
                >
                  Ver mais clientes
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md p-4 sm:p-6 mb-8`}>
        <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-800"} mb-4`}>
          <FiShoppingCart className="inline-block mr-2" />
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Link to="/novo-pedido" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded text-center flex items-center justify-center">
            <FiShoppingCart className="mr-2" />
            <span>Novo Pedido</span>
          </Link>
          <Link to="/clientes" className={`${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"} font-bold py-3 px-4 rounded text-center flex items-center justify-center`}>
            <FiUsers className="mr-2" />
            <span>Gerenciar Clientes</span>
          </Link>
          <Link to="/produtos" className={`${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"} font-bold py-3 px-4 rounded text-center flex items-center justify-center`}>
            <FiPackage className="mr-2" />
            <span>Gerenciar Produtos</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
