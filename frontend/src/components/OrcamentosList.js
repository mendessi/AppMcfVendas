import React, { useState, useEffect } from 'react';

const OrcamentosList = ({ darkMode }) => {
  // Função para formatar valores monetários declarada mais abaixo no código
  // Função para determinar a classe CSS do badge de status
  const getStatusBadgeClass = (status) => {
    if (!status) return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    
    const statusUpper = status.toUpperCase();
    
    switch (statusUpper) {
      case 'EM ANÁLISE':
        return darkMode ? 'bg-yellow-900 text-yellow-300 font-bold' : 'bg-yellow-100 text-yellow-800 font-bold border-2 border-yellow-400';
      case 'AUTORIZADO':
        return darkMode ? 'bg-green-900 text-green-300 font-bold' : 'bg-green-100 text-green-800 font-bold border-2 border-green-400';
      case 'CONCLUÍDO':
        return darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700';
      case 'PENDENTE':
        return darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-800';
      case 'CANCELADO':
        return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800';
      default:
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [dataInicial, setDataInicial] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().slice(0, 10);
  });
  const [dataFinal, setDataFinal] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().slice(0, 10);
  });
  const [filtrarPorData, setFiltrarPorData] = useState(true); // Por padrão, filtrar apenas pelo dia atual
  const [expandedOrcamento, setExpandedOrcamento] = useState(null);

  useEffect(() => {
    // Ao iniciar, garantir que apenas os orçamentos do dia atual sejam carregados
    setFiltrarPorData(true);
    // Usar true como parâmetro para forçar o filtro na primeira carga
    buscarOrcamentos(true);
    // eslint-disable-next-line
  }, []);

  const buscarOrcamentos = async (forcarFiltro = false) => {
    setLoading(true);
    setErrorMsg(null);
    
    // Sem dados de exemplo, apenas dados reais
    
    // Timeout mais longo (60 segundos) para garantir que os dados reais sejam carregados
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tempo esgotado ao buscar orçamentos')), 60000);
    });
    
    try {
      const token = localStorage.getItem('token');
      const empresaSelecionada = localStorage.getItem('empresa') || localStorage.getItem('empresa_atual') || localStorage.getItem('empresa_selecionada') || localStorage.getItem('empresaSelecionadaCodigo');
      let empresaCodigo = null;
      if (empresaSelecionada) {
        try {
          const empObj = JSON.parse(empresaSelecionada);
          empresaCodigo = empObj?.cli_codigo || empObj?.codigo;
        } catch {
          empresaCodigo = empresaSelecionada;
        }
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      if (empresaCodigo) headers['x-empresa-codigo'] = empresaCodigo;
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      let url = `${apiUrl}/api/orcamentos`;
      
      // Garantir que o filtro de data seja aplicado na primeira carga e quando o checkbox estiver marcado
      if ((filtrarPorData || forcarFiltro) && dataInicial && dataFinal) {
        // Formatar as datas no formato esperado pelo backend (YYYY-MM-DD)
        const dataInicialFormatada = dataInicial;
        const dataFinalFormatada = dataFinal;
        
        url += `?data_inicial=${dataInicialFormatada}&data_final=${dataFinalFormatada}`;
        console.log(`Aplicando filtro de data: ${dataInicialFormatada} até ${dataFinalFormatada}`);
      } else {
        console.log('Não aplicando filtro de data');
      }
      
      console.log('Buscando orçamentos na URL:', url);
      console.log('Filtro por data ativado:', filtrarPorData);
      console.log('Data inicial:', dataInicial);
      console.log('Data final:', dataFinal);
      
      // Usar Promise.race para implementar o timeout
      const fetchPromise = fetch(url, { headers });
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        console.error('Resposta não OK:', response.status, response.statusText);
        throw new Error(`Erro ao buscar orçamentos: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Dados recebidos:', data);
      
      // Verificar se os dados são um array
      if (!Array.isArray(data)) {
        console.error('Dados recebidos não são um array:', data);
        throw new Error('Formato de dados inválido');
      }
      
      // Sempre usar os dados reais, mesmo que seja uma lista vazia
      console.log(`Encontrados ${data.length} orçamentos no banco`);
      setOrcamentos(data.map(orc => ({ ...orc, itens: [] })));
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
      
      // Mostrar erro para o usuário e deixar lista vazia
      setOrcamentos([]);
      setErrorMsg(`Erro ao buscar orçamentos: ${error.message}. Por favor, tente novamente.`);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrcamentoDetails = async (orcamentoId) => {
    if (expandedOrcamento === orcamentoId) {
      setExpandedOrcamento(null);
      return;
    }
    
    setExpandedOrcamento(orcamentoId);
    
    // Buscar itens do orçamento se ainda não carregou
    const orcamento = orcamentos.find(o => o.id === orcamentoId || o.numero === orcamentoId);
    if (orcamento && (!orcamento.itens || orcamento.itens.length === 0)) {
      // Timeout mais longo (60 segundos) para garantir que os dados reais sejam carregados
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tempo esgotado ao buscar itens')), 60000);
      });
      
      try {
        const token = localStorage.getItem('token');
        const empresaSelecionada = localStorage.getItem('empresa') || localStorage.getItem('empresa_atual') || localStorage.getItem('empresa_selecionada') || localStorage.getItem('empresaSelecionadaCodigo');
        let empresaCodigo = null;
        if (empresaSelecionada) {
          try {
            const empObj = JSON.parse(empresaSelecionada);
            empresaCodigo = empObj?.cli_codigo || empObj?.codigo;
          } catch {
            empresaCodigo = empresaSelecionada;
          }
        }
        
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
        if (empresaCodigo) headers['x-empresa-codigo'] = empresaCodigo;
        
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        const url = `${apiUrl}/api/orcamentos/${orcamentoId}/itens`;
        
        console.log(`Buscando itens do orçamento ${orcamentoId} na URL:`, url);
        
        // Usar Promise.race para implementar o timeout
        const fetchPromise = fetch(url, { headers });
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
          console.error('Resposta não OK ao buscar itens:', response.status, response.statusText);
          throw new Error(`Erro ao buscar itens: ${response.status}`);
        }
        
        const itens = await response.json();
        console.log(`Itens recebidos para orçamento ${orcamentoId}:`, itens);
        
        // Verificar se os dados são um array
        if (!Array.isArray(itens)) {
          console.error('Dados de itens recebidos não são um array:', itens);
          throw new Error('Formato de dados de itens inválido');
        }
        
        // Sempre usar os dados reais, mesmo que seja uma lista vazia
        console.log(`Encontrados ${itens.length} itens para o orçamento ${orcamentoId}`);
        setOrcamentos(prev => prev.map(o => (o.id === orcamentoId || o.numero === orcamentoId) ? { ...o, itens } : o));
      } catch (error) {
        console.error(`Erro ao buscar itens do orçamento ${orcamentoId}:`, error);
        
        // Mostrar erro e deixar lista de itens vazia
        setOrcamentos(prev => prev.map(o => {
          if (o.id === orcamentoId || o.numero === orcamentoId) {
            return { ...o, itens: [] };
          }
          return o;
        }));
        
        // Mostrar mensagem de erro temporariamente
        setErrorMsg(`Erro ao buscar itens do orçamento: ${error.message}`);
        setTimeout(() => setErrorMsg(null), 3000);
      }
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-blue-400" : "text-blue-600"}>Carregando orçamentos...</div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-red-400" : "text-red-600"}>{errorMsg}</div>
      </div>
    );
  }

  return (
    <div>
      <div className={`mb-6 bg-opacity-90 rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <h1 className={`text-2xl md:text-3xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Listar Orçamentos
          </span>
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="filtrarPorData"
              className="mr-2 h-4 w-4"
              checked={filtrarPorData}
              onChange={e => setFiltrarPorData(e.target.checked)}
            />
            <label 
              htmlFor="filtrarPorData" 
              className={`font-medium ${darkMode ? "text-white" : "text-gray-700"}`}
            >
              Filtrar apenas pelo período selecionado
            </label>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div>
            <label className={`block text-sm font-semibold mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Data inicial</label>
            <input
              type="date"
              className={`p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"}`}
              value={dataInicial}
              onChange={e => setDataInicial(e.target.value)}
              disabled={!filtrarPorData}
            />
          </div>
          <div>
            <label className={`block text-sm font-semibold mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Data final</label>
            <input
              type="date"
              className={`p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"}`}
              value={dataFinal}
              onChange={e => setDataFinal(e.target.value)}
              disabled={!filtrarPorData}
            />
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => buscarOrcamentos(filtrarPorData)}
            disabled={loading}
          >
            {loading ? 'Carregando...' : 'Buscar'}
          </button>
        </div>
      </div>
      
      {/* Totalizador */}
      <div className={`mb-6 p-4 rounded-lg shadow-md ${darkMode ? "bg-gray-700" : "bg-white"}`}>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
              {filtrarPorData ? 'Orçamentos do Período:' : 'Todos os Orçamentos:'} <span className="font-bold">{orcamentos.length}</span>
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 md:flex md:gap-4">
            <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Em Análise</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-yellow-300" : "text-yellow-600"}`}>
                {orcamentos.filter(o => o.status && o.status.toUpperCase() === 'EM ANÁLISE').length}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Autorizados</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-green-300" : "text-green-600"}`}>
                {orcamentos.filter(o => o.status && o.status.toUpperCase() === 'AUTORIZADO').length}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <p className={`text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Valor Total</p>
              <p className={`text-lg md:text-xl font-bold ${darkMode ? "text-blue-300" : "text-blue-600"}`}>
                {formatCurrency(orcamentos.reduce((total, orc) => total + (parseFloat(orc.valor_total || orc.total) || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Exibição em tabela (desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-md border ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className={`${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <tr>
                <th scope="col" className={`px-3 py-3 text-left text-xs font-bold ${darkMode ? "text-white" : "text-gray-700"} uppercase tracking-wider w-[8%]`}>Número</th>
                <th scope="col" className={`px-3 py-3 text-left text-xs font-bold ${darkMode ? "text-white" : "text-gray-700"} uppercase tracking-wider w-[20%]`}>Cliente</th>
                <th scope="col" className={`px-3 py-3 text-left text-xs font-bold ${darkMode ? "text-white" : "text-gray-700"} uppercase tracking-wider w-[8%]`}>Data</th>
                <th scope="col" className={`px-3 py-3 text-right text-xs font-bold ${darkMode ? "text-white" : "text-gray-700"} uppercase tracking-wider w-[10%]`}>Valor Total</th>
                <th scope="col" className={`px-3 py-3 text-center text-xs font-bold ${darkMode ? "text-white" : "text-gray-700"} uppercase tracking-wider w-[12%]`}>Forma Pag.</th>
                <th scope="col" className={`px-3 py-3 text-center text-xs font-bold ${darkMode ? "text-white" : "text-gray-700"} uppercase tracking-wider w-[10%]`}>Tabela</th>
                <th scope="col" className={`px-3 py-3 text-center text-xs font-bold ${darkMode ? "text-white" : "text-gray-700"} uppercase tracking-wider w-[12%]`}>Vendedor</th>
                <th scope="col" className={`px-3 py-3 text-right text-xs font-bold ${darkMode ? "text-white" : "text-gray-700"} uppercase tracking-wider w-[8%]`}>Desconto</th>
                <th scope="col" className={`px-3 py-3 text-center text-xs font-bold ${darkMode ? "text-white" : "text-gray-700"} uppercase tracking-wider w-[8%]`}>Status</th>
                <th scope="col" className="relative px-3 py-3 w-[4%]">
                  <span className="sr-only">Detalhes</span>
                </th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? "bg-gray-800" : "bg-white"} divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
              {orcamentos.length > 0 ? (
                orcamentos.map((orc) => (
                  <React.Fragment key={orc.id || orc.numero}>
                    <tr className={darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className={`text-xs font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{orc.numero || orc.id}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className={`text-xs font-medium ${darkMode ? "text-white" : "text-gray-900"} truncate`}>{orc.cliente_nome || orc.nome}</div>
                      </td>
                       <td className="px-3 py-3 whitespace-nowrap">
                        <div className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{orc.data || orc.data_emissao}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <div className={`text-xs font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(orc.valor_total || orc.total)}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <div className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-700"} truncate`}>{orc.forma_pagamento || orc.forma_pagamento_id || '-'}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <div className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-700"} truncate`}>{orc.tabela || orc.tabela_id || '-'}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <div className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-700"} truncate`}>{orc.vendedor || orc.vendedor_id || '-'}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <div className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{orc.desconto ? formatCurrency(orc.desconto) : '-'}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(orc.status)}`}>
                          {orc.status || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
                        <button 
                          className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-900 text-blue-300 hover:bg-blue-800" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
                          onClick={() => toggleOrcamentoDetails(orc.id || orc.numero)}
                        >
                          {expandedOrcamento === (orc.id || orc.numero) ? 'Ocultar' : 'Ver'}
                        </button>
                      </td>
                    </tr>
                    {expandedOrcamento === (orc.id || orc.numero) && (
                      <tr>
                        <td colSpan="10" className={`px-3 py-3 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                          <div className={`${darkMode ? "text-white" : "text-gray-900"}`}>
                            <h3 className="text-sm font-bold mb-2">Itens do Orçamento #{orc.numero || orc.id}</h3>
                            {orc.itens && orc.itens.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full mt-2 border-collapse">
                                  <thead className={`${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                                    <tr>
                                      <th className={`px-2 py-2 text-left border-b border-r ${darkMode ? "text-white border-gray-600" : "text-gray-800 border-gray-300"} text-xs font-bold`}>Código</th>
                                      <th className={`px-2 py-2 text-left border-b border-r ${darkMode ? "text-white border-gray-600" : "text-gray-800 border-gray-300"} text-xs font-bold`}>Descrição</th>
                                      <th className={`px-2 py-2 text-center border-b border-r ${darkMode ? "text-white border-gray-600" : "text-gray-800 border-gray-300"} text-xs font-bold`}>Qtde</th>
                                      <th className={`px-2 py-2 text-right border-b border-r ${darkMode ? "text-white border-gray-600" : "text-gray-800 border-gray-300"} text-xs font-bold`}>Valor Unit.</th>
                                      <th className={`px-2 py-2 text-right border-b ${darkMode ? "text-white border-gray-600" : "text-gray-800 border-gray-300"} text-xs font-bold`}>Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                  {orc.itens.map((item, idx) => {
                                    const quantidade = item.quantidade || item.pro_quantidade || 0;
                                    const valorUnitario = item.valor || item.pro_valor || 0;
                                    const valorTotal = item.valor_total || item.ior_total || (quantidade * valorUnitario);
                                    
                                    return (
                                      <tr key={idx} className={idx % 2 === 0 ? 
                                        (darkMode ? "bg-gray-700" : "bg-white") : 
                                        (darkMode ? "bg-gray-800" : "bg-gray-50")}>
                                        <td className={`px-2 py-2 border-b border-r font-mono ${darkMode ? "text-gray-300 border-gray-600" : "text-gray-700 border-gray-300"} text-xs`}>{item.codigo || item.pro_codigo}</td>
                                        <td className={`px-2 py-2 border-b border-r font-medium ${darkMode ? "text-white border-gray-600" : "text-gray-800 border-gray-300"} text-xs`}>{item.descricao || item.pro_descricao}</td>
                                        <td className={`px-2 py-2 border-b border-r text-center ${darkMode ? "text-gray-300 border-gray-600" : "text-gray-700 border-gray-300"} text-xs`}>{quantidade}</td>
                                        <td className={`px-2 py-2 border-b border-r text-right ${darkMode ? "text-gray-300 border-gray-600" : "text-gray-700 border-gray-300"} text-xs`}>{formatCurrency(valorUnitario)}</td>
                                        <td className={`px-2 py-2 border-b text-right font-bold ${darkMode ? "text-white border-gray-600" : "text-gray-900 border-gray-300"} text-xs`}>{formatCurrency(valorTotal)}</td>
                                      </tr>
                                    );
                                  })}
                                  <tr className={darkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-900"}>
                                    <td colSpan="4" className="px-2 py-2 text-right font-bold text-xs">Total:</td>
                                    <td className="px-2 py-2 text-right font-bold text-xs">{formatCurrency(orc.valor_total || orc.total)}</td>
                                  </tr>
                                </tbody>
                                </table>
                              </div>
                            ) : (
                              <span>Nenhum item encontrado.</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className={`px-6 py-4 text-center text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Nenhum orçamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exibição em cards (mobile) */}
      <div className="md:hidden">
        {orcamentos.length > 0 ? (
          <div className="space-y-6">
            {orcamentos.map((orc) => (
              <div key={orc.id || orc.numero} className={`p-4 rounded-lg shadow-md border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <span className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>#{orc.numero || orc.id}</span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(orc.status)}`}>
                      {orc.status || '-'}
                    </span>
                  </div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{orc.data || orc.data_emissao}</p>
                </div>
                
                <p className={`mt-2 text-base font-medium ${darkMode ? "text-gray-300" : "text-gray-600"} truncate`}>{orc.cliente_nome || orc.nome}</p>
                
                <div className="mt-2">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    <div>
                      <span className={`font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>FPG: </span>
                      <span className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>{orc.forma_pagamento || orc.forma_pagamento_id || '-'}</span>
                    </div>
                    <div>
                      <span className={`font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Tab: </span>
                      <span className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>{orc.tabela || orc.tabela_id || '-'}</span>
                    </div>
                    <div>
                      <span className={`font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Vend: </span>
                      <span className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>{orc.vendedor || orc.vendedor_id || '-'}</span>
                    </div>
                    <div>
                      <span className={`font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Desc: </span>
                      <span className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>{orc.desconto ? formatCurrency(orc.desconto) : '-'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 flex justify-between items-center">                  
                  <p className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(orc.valor_total || orc.total)}</p>
                  
                  <button
                    className={`px-3 py-1 rounded ${darkMode ? "bg-blue-900 text-blue-300 hover:bg-blue-800" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
                    onClick={() => toggleOrcamentoDetails(orc.id || orc.numero)}
                  >
                    {expandedOrcamento === (orc.id || orc.numero) ? 'Ocultar Itens' : 'Ver Itens'}
                  </button>
                </div>
                
                {expandedOrcamento === (orc.id || orc.numero) && (
                  <div className={`mt-4 pt-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                    <div className="mt-3">
                      <p className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>Itens do Orçamento:</p>
                      {orc.itens && orc.itens.length > 0 ? (
                        <div className="space-y-2">
                          {orc.itens.map((item, index) => {
                            const quantidade = item.quantidade || item.pro_quantidade || 0;
                            const valorUnitario = item.valor || item.pro_valor || 0;
                            const valorTotal = item.valor_total || item.ior_total || (quantidade * valorUnitario);
                            
                            return (
                              <div key={index} className={`p-3 rounded ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                                <div className="flex justify-between items-center">
                                  <span className={`font-mono text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{item.codigo || item.pro_codigo}</span>
                                  <span className={`font-medium text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Qtde: {quantidade}</span>
                                </div>
                                <div className="mt-1">
                                  <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{item.descricao || item.pro_descricao}</p>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                  <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>Unit: {formatCurrency(valorUnitario)}</span>
                                  <span className={`font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(valorTotal)}</span>
                                </div>
                              </div>
                            );
                          })}
                          <div className={`p-3 rounded font-bold text-right ${darkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-900"}`}>
                            Total: {formatCurrency(orc.valor_total || orc.total)}
                          </div>
                        </div>
                      ) : (
                        <p className={darkMode ? "text-gray-400 italic" : "text-gray-500 italic"}>Nenhum item no orçamento</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-6 text-center`}>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Nenhum orçamento encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrcamentosList;
