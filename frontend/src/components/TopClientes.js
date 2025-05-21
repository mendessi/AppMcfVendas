import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { FiUser, FiPhone, FiMapPin, FiShoppingBag, FiDollarSign, FiCalendar } from 'react-icons/fi';

const TopClientes = ({ darkMode, empresaSelecionada }) => {
  // Log para debug
  console.log('TopClientes - Empresa selecionada recebida como prop:', empresaSelecionada);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topClientes, setTopClientes] = useState([]);
  const [filtroVendedor, setFiltroVendedor] = useState(null);
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  useEffect(() => {
    // Definir datas padrão (primeiro e último dia do mês atual)
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    let ultimoDiaMes;
    
    if (hoje.getMonth() === 11) { // Dezembro
      ultimoDiaMes = new Date(hoje.getFullYear() + 1, 0, 0);
    } else {
      ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    }
    
    const formatarData = (data) => {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };
    
    setDataInicial(formatarData(primeiroDiaMes));
    setDataFinal(formatarData(ultimoDiaMes));
  }, []);

  useEffect(() => {
    // Buscar dados apenas quando as datas estiverem definidas
    if (dataInicial && dataFinal) {
      fetchTopClientes();
    }
  }, [dataInicial, dataFinal]);

  const fetchTopClientes = async () => {
    try {
      setLoading(true);
      
      // Obter o token de autenticação
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Autenticação necessária');
        setLoading(false);
        return;
      }
      
      // Usar a empresa selecionada recebida como prop, se disponível
      let empresaCodigo = null;
      
      if (empresaSelecionada && empresaSelecionada.cli_codigo) {
        // Se recebemos a empresa como prop, usar diretamente
        empresaCodigo = empresaSelecionada.cli_codigo;
        console.log(`TopClientes - Usando empresa da prop: ${empresaSelecionada.cli_nome} (${empresaCodigo})`);
      } else {
        // Backup: Verificar localStorage se não recebemos a empresa como prop
        console.log('TopClientes - Empresa não recebida como prop, verificando localStorage');
        const empresaData = localStorage.getItem('empresa') || 
                         localStorage.getItem('empresa_atual') || 
                         localStorage.getItem('empresa_selecionada');
        
        if (!empresaData) {
          setError('Nenhuma empresa selecionada');
          setLoading(false);
          return;
        }

        // Extrair o código da empresa do objeto JSON armazenado
        try {
          const empresaObj = JSON.parse(empresaData);
          if (empresaObj && empresaObj.cli_codigo) {
            empresaCodigo = empresaObj.cli_codigo;
            console.log(`TopClientes - Empresa do localStorage: ${empresaObj.cli_nome} (${empresaCodigo})`);
          }
        } catch (e) {
          console.error('Erro ao processar dados da empresa:', e);
        }
        
        // Se não conseguiu extrair do JSON, tentar o legado
        if (!empresaCodigo) {
          empresaCodigo = localStorage.getItem("empresaCodigo");
          console.log(`TopClientes - Usando código legado do localStorage: ${empresaCodigo}`);
        }
      }
      
      // Verificar se temos um código de empresa válido
      if (!empresaCodigo) {
        setError('Código da empresa não identificado');
        setLoading(false);
        return;
      }
      
      console.log(`TopClientes - Código final da empresa: ${empresaCodigo}`);
      
      // Configurar headers
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Adicionar cabeçalho x-empresa-codigo - fundamental para nosso sistema híbrido
      headers["x-empresa-codigo"] = empresaCodigo;
      console.log(`TopClientes - Adicionando cabeçalho x-empresa-codigo: ${empresaCodigo}`);
      
      console.log(`TopClientes - Fazendo requisição com cabeçalhos:`, headers);
      
      const response = await axios.get(
        `${API_URL}/relatorios/top-clientes?data_inicial=${dataInicial}&data_final=${dataFinal}`,
        {
          headers: headers,
          withCredentials: true,
        }
      );
      
      console.log('TopClientes - Resposta completa recebida:', response.data);

      // Armazenar os clientes
      if (Array.isArray(response.data.top_clientes)) {
        setTopClientes(response.data.top_clientes);
      } else if (Array.isArray(response.data)) {
        // Compatibilidade com o formato anterior
        setTopClientes(response.data);
        console.log('Formato antigo detectado - array direto');
      } else {
        console.error('Formato de resposta inesperado:', response.data);
        setTopClientes([]);
      }
      
      // Verificar se temos informações de filtro de vendedor
      // Estrutura esperada: { filtro_aplicado: { vendedor: { codigo, nome }, filtro_vendedor_ativo: true } }
      console.log('Verificando se há filtro de vendedor:', response.data);
      
      if (response.data.filtro_aplicado) {
        console.log('Filtro aplicado encontrado:', response.data.filtro_aplicado);
        
        if (response.data.filtro_aplicado.filtro_vendedor_ativo && 
            response.data.filtro_aplicado.vendedor) {
          console.log('Vendedor encontrado nos dados da resposta:', response.data.filtro_aplicado.vendedor);
          setFiltroVendedor(response.data.filtro_aplicado.vendedor);
        } else {
          console.log('Filtro de vendedor não está ativo ou vendedor ausente');
          setFiltroVendedor(null);
        }
      } else {
        console.log('Estrutura filtro_aplicado não encontrada na resposta');
        setFiltroVendedor(null);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar top clientes:", error);
      
      // Obter detalhes do erro para exibir uma mensagem mais informativa
      let mensagemErro = "Erro ao carregar os dados. Por favor, tente novamente.";
      
      if (error.response) {
        // O servidor respondeu com um código de erro
        console.log('Resposta de erro:', error.response);
        
        // Usar a mensagem de erro retornada pela API, se disponível
        if (error.response.data && error.response.data.detail) {
          mensagemErro = `Erro ${error.response.status}: ${error.response.data.detail}`;
        } else {
          mensagemErro = `Erro ${error.response.status}: ${error.response.statusText}`;
        }
        
        // Mensagens personalizadas para códigos de erro comuns
        if (error.response.status === 401) {
          mensagemErro = "Sessão expirada. Por favor, faça login novamente.";
        } else if (error.response.status === 404) {
          mensagemErro = "As tabelas necessárias não foram encontradas no banco de dados.";
        } else if (error.response.status === 503) {
          mensagemErro = "Não foi possível conectar ao banco de dados. Verifique as configurações da empresa.";
        }
      } else if (error.request) {
        // A requisição foi feita mas não houve resposta
        mensagemErro = "Servidor não respondeu. Verifique sua conexão com a internet.";
      }
      
      setError(mensagemErro);
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchTopClientes();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatarDataExibicao = (dataString) => {
    if (!dataString) return '';
    
    const data = new Date(dataString);
    return new Intl.DateTimeFormat('pt-BR').format(data);
  };

  return (
    <div className={`p-4 mb-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
      {/* Exibir informações do vendedor se disponíveis */}
      {filtroVendedor && (
        <div className={`mb-4 px-3 py-2 rounded ${darkMode ? 'bg-blue-900/30 text-blue-200' : 'bg-blue-50 text-blue-800'}`}>
          <div className="flex items-center">
            <span className="font-medium">Vendedor:</span>
            <span className="ml-2 font-bold">{filtroVendedor.codigo}</span>
            {filtroVendedor.nome && (
              <span className="ml-1">- {filtroVendedor.nome}</span>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Top Clientes
        </h2>
        
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div>
            <label htmlFor="dataInicial" className={`text-xs block mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Data Inicial
            </label>
            <input
              type="date"
              id="dataInicial"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className={`text-sm px-2 py-1 rounded border ${
                darkMode 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'bg-white text-gray-800 border-gray-300'
              }`}
            />
          </div>
          
          <div>
            <label htmlFor="dataFinal" className={`text-xs block mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Data Final
            </label>
            <input
              type="date"
              id="dataFinal"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className={`text-sm px-2 py-1 rounded border ${
                darkMode 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'bg-white text-gray-800 border-gray-300'
              }`}
            />
          </div>
          
          <div className="self-end">
            <button
              type="submit"
              className={`text-sm px-3 py-1 rounded ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Filtrar
            </button>
          </div>
        </form>
      </div>
      
      {loading ? (
        <div className="text-center py-4">
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Carregando dados...
          </p>
        </div>
      ) : error ? (
        <p className={`text-center py-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
          {error}
        </p>
      ) : topClientes.length === 0 ? (
        <p className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Nenhum cliente encontrado no período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className={`min-w-full table-auto ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            <thead>
              <tr className={darkMode ? 'border-b border-gray-700' : 'border-b border-gray-300'}>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase">Cliente</th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase">Localização</th>
                <th className="px-2 py-2 text-right text-xs font-medium uppercase">Compras</th>
                <th className="px-2 py-2 text-right text-xs font-medium uppercase">Total</th>
                <th className="px-2 py-2 text-center text-xs font-medium uppercase">Última Compra</th>
              </tr>
            </thead>
            <tbody>
              {topClientes.map((cliente, index) => (
                <tr 
                  key={cliente.codigo} 
                  className={`${
                    darkMode 
                      ? index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750' 
                      : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                >
                  <td className="px-2 py-3 text-sm">
                    <div className="flex items-start">
                      <FiUser className={`mr-2 mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                      <div>
                        <p className="font-medium">{cliente.nome}</p>
                        {cliente.whatsapp && (
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <FiPhone className="inline mr-1" /> {cliente.whatsapp}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-sm">
                    {(cliente.cidade || cliente.uf) && (
                      <div className="flex items-center">
                        <FiMapPin className={`mr-2 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                        <span>{cliente.cidade}{cliente.uf ? `, ${cliente.uf}` : ''}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 text-sm text-right">
                    <div className="flex items-center justify-end">
                      <FiShoppingBag className={`mr-2 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
                      <span>{cliente.qtde_compras}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-sm text-right font-medium">
                    <div className="flex items-center justify-end">
                      <FiDollarSign className={`mr-2 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                      <span>{formatCurrency(cliente.total)}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-sm text-center">
                    {cliente.ecf_data && (
                      <div className="flex items-center justify-center">
                        <FiCalendar className={`mr-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                        <span>{formatarDataExibicao(cliente.ecf_data)}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TopClientes;
