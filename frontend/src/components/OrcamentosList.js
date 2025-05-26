import React, { useEffect, useState } from 'react';

const OrcamentosList = ({ darkMode }) => {
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
  const [expandedOrcamento, setExpandedOrcamento] = useState(null);

  useEffect(() => {
    buscarOrcamentos();
    // eslint-disable-next-line
  }, []);

  const buscarOrcamentos = async () => {
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
      let url = `${apiUrl}/orcamentos`;
      if (dataInicial && dataFinal) {
        url += `?data_inicial=${dataInicial}&data_final=${dataFinal}`;
      }
      
      console.log('Buscando orçamentos na URL:', url);
      
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
        const url = `${apiUrl}/orcamentos/${orcamentoId}/itens`;
        
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
      <div className="mb-6 flex flex-col sm:flex-row gap-2 items-start sm:items-end">
        <div>
          <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Data inicial</label>
          <input
            type="date"
            className={`p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"}`}
            value={dataInicial}
            onChange={e => setDataInicial(e.target.value)}
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Data final</label>
          <input
            type="date"
            className={`p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-700"}`}
            value={dataFinal}
            onChange={e => setDataFinal(e.target.value)}
          />
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-5"
          onClick={buscarOrcamentos}
          disabled={loading}
        >Buscar</button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Orçamentos</h1>
      </div>

      {/* Exibição em tabela (desktop) */}
      <div className="hidden md:block">
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow overflow-hidden`}>
          <table className="min-w-full divide-y divide-gray-700">
            <thead className={darkMode ? "bg-gray-900" : "bg-gray-50"}>
              <tr>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-500"} uppercase tracking-wider`}>Número</th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-500"} uppercase tracking-wider`}>Cliente</th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-500"} uppercase tracking-wider`}>Data</th>
                <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-500"} uppercase tracking-wider`}>Valor Total</th>
                <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-500"} uppercase tracking-wider`}>Status</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Detalhes</span>
                </th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? "bg-gray-800" : "bg-white"} divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
              {orcamentos.length > 0 ? (
                orcamentos.map((orc) => (
                  <React.Fragment key={orc.id || orc.numero}>
                    <tr className={darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">{orc.numero || orc.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">{orc.cliente_nome || orc.nome}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">{orc.data || orc.data_emissao}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium">{formatCurrency(orc.valor_total || orc.total)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(orc.status)}`}>
                          {orc.status || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          className={darkMode ? "text-blue-400 hover:text-blue-300 mr-3" : "text-blue-600 hover:text-blue-900 mr-3"}
                          onClick={() => toggleOrcamentoDetails(orc.id || orc.numero)}
                        >
                          {expandedOrcamento === (orc.id || orc.numero) ? 'Ocultar' : 'Detalhes'}
                        </button>
                      </td>
                    </tr>
                    {expandedOrcamento === (orc.id || orc.numero) && (
                      <tr>
                        <td colSpan="10" className={`px-6 py-4 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                          <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                            <h3 className="font-bold mb-2">Itens do Orçamento #{orc.numero || orc.id}</h3>
                            {orc.itens && orc.itens.length > 0 ? (
                              <table className="w-full text-xs mt-2 border-collapse">
                                <thead className={`${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                                  <tr>
                                    <th className="px-2 py-2 text-left border-b border-r">Código</th>
                                    <th className="px-2 py-2 text-left border-b border-r">Descrição</th>
                                    <th className="px-2 py-2 text-center border-b border-r">Qtde</th>
                                    <th className="px-2 py-2 text-right border-b border-r">Valor Unit.</th>
                                    <th className="px-2 py-2 text-right border-b">Total</th>
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
                                        <td className="px-2 py-2 border-b border-r font-mono">{item.codigo || item.pro_codigo}</td>
                                        <td className="px-2 py-2 border-b border-r font-medium">{item.descricao || item.pro_descricao}</td>
                                        <td className="px-2 py-2 border-b border-r text-center">{quantidade}</td>
                                        <td className="px-2 py-2 border-b border-r text-right">{formatCurrency(valorUnitario)}</td>
                                        <td className="px-2 py-2 border-b text-right font-bold">{formatCurrency(valorTotal)}</td>
                                      </tr>
                                    );
                                  })}
                                  <tr className={darkMode ? "bg-gray-900" : "bg-gray-200"}>
                                    <td colSpan="4" className="px-2 py-2 text-right font-bold">Total do Orçamento:</td>
                                    <td className="px-2 py-2 text-right font-bold">{formatCurrency(orc.valor_total || orc.total)}</td>
                                  </tr>
                                </tbody>
                              </table>
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
          <div className="grid grid-cols-1 gap-4">
            {orcamentos.map((orc) => (
              <div key={orc.id || orc.numero} className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-4`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-lg font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>Orçamento #{orc.numero || orc.id}</h3>
                    <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"} mt-1`}>{orc.cliente_nome || orc.nome}</p>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} mt-1`}>Data: {orc.data || orc.data_emissao}</p>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Valor Total: {formatCurrency(orc.valor_total || orc.total)}</p>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(orc.status || '-')}`}>{orc.status || '-'}</span>
                    </p>
                  </div>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(orc.status || '-')}`}>
                    {orc.status || '-'}
                  </span>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div>
                    <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} uppercase`}>Valor Total:</span>
                    <p className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(orc.valor_total || orc.total)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      className={`px-3 py-1 rounded ${darkMode ? "bg-blue-900 text-blue-300 hover:bg-blue-800" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
                      onClick={() => toggleOrcamentoDetails(orc.id || orc.numero)}
                    >
                      {expandedOrcamento === (orc.id || orc.numero) ? 'Ocultar' : 'Detalhes'}
                    </button>
                  </div>
                </div>
                {expandedOrcamento === (orc.id || orc.numero) && (
                  <div className={`mt-4 pt-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                    <div className="mt-3">
                      <p className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>Itens do Orçamento:</p>
                      {orc.itens && orc.itens.length > 0 ? (
                        <div className="space-y-2">
                          {orc.itens.map((item, index) => (
                            <div key={index} className={`p-2 rounded ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                              <div className="flex justify-between">
                                <span className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{item.descricao || item.pro_descricao}</span>
                                <span className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(item.valor || item.pro_valor)}</span>
                              </div>
                              <div className="flex justify-between text-sm mt-1">
                                <span className={darkMode ? "text-gray-400" : "text-gray-500"}>{item.quantidade || item.pro_quantidade}</span>
                              </div>
                            </div>
                          ))}
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
