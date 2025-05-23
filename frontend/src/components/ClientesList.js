import React, { useState, useEffect } from 'react';

const ClientesList = ({ darkMode, empresaSelecionada }) => {
  // Handlers para os novos botões
  const [modalVendas, setModalVendas] = useState({ open: false, vendas: [], cliente: null });
  const [modalItens, setModalItens] = useState({ open: false, itens: [], venda: null });
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [loadingItens, setLoadingItens] = useState(false);
  const [errorVendas, setErrorVendas] = useState(null);
  const [errorItens, setErrorItens] = useState(null);

  const handleVerVendas = async (cliente) => {
    setLoadingVendas(true);
    setErrorVendas(null);
  try {
    const token = localStorage.getItem('token');
    const empresaCodigo = empresaSelecionada?.cli_codigo || empresaSelecionada?.codigo;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-empresa-codigo': empresaCodigo,
      'Content-Type': 'application/json'
    };
    const apiUrl = process.env.REACT_APP_API_URL || '';
    const response = await fetch(`${apiUrl}/relatorios/clientes/${cliente.cli_codigo}/vendas`, { headers });
    if (!response.ok) throw new Error('Erro ao buscar vendas do cliente');
    const vendas = await response.json();
    setModalVendas({ open: true, vendas, cliente });
  } catch (err) {
    setErrorVendas('Erro ao buscar vendas.');
    setModalVendas({ open: true, vendas: [], cliente });
  } finally {
    setLoadingVendas(false);
  }
};

const handleVerItensVenda = async (venda) => {
  setLoadingItens(true);
  setErrorItens(null);
  setModalItens({ open: true, itens: [], venda });
  try {
    const token = localStorage.getItem('token');
    const empresaCodigo = empresaSelecionada?.cli_codigo || empresaSelecionada?.codigo;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-empresa-codigo': empresaCodigo,
      'Content-Type': 'application/json'
    };
    const apiUrl = process.env.REACT_APP_API_URL || '';
    const response = await fetch(`${apiUrl}/relatorios/vendas/${venda.ecf_numero}/itens`, { headers });
    if (!response.ok) throw new Error('Erro ao buscar itens da venda');
    const itens = await response.json();
    setModalItens({ open: true, itens, venda });
  } catch (err) {
    setErrorItens('Erro ao buscar itens da venda.');
    setModalItens({ open: true, itens: [], venda });
  } finally {
    setLoadingItens(false);
  }
};
  const handleVerContas = (cliente) => {
    // TODO: Implementar lógica após receber o SQL
    console.log('Ver Contas para cliente:', cliente);
  };

  const closeModalVendas = () => setModalVendas({ open: false, vendas: [], cliente: null });
  const closeModalItens = () => setModalItens({ open: false, itens: [], venda: null });

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);


  // Handler para busca
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchTerm || !empresaSelecionada) {
      setClientes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      let empresaCodigo = empresaSelecionada?.cli_codigo || empresaSelecionada?.codigo;
      const token = localStorage.getItem('token');
      const headers = {};
      if (empresaCodigo) headers['x-empresa-codigo'] = empresaCodigo;
      if (token) headers['Authorization'] = `Bearer ${token}`;
      headers['Content-Type'] = 'application/json';
      // Montar query string para busca por nome, apelido ou cnpj
      const params = [];
      if (searchTerm) params.push(`q=${encodeURIComponent(searchTerm)}`);
      const queryString = params.length > 0 ? `?${params.join('&')}` : '';
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/relatorios/clientes${queryString}`, {
        headers
      });
      if (response.status === 401) {
          setErrorMsg('Você não está autorizado a visualizar os clientes desta empresa. Faça login novamente ou selecione outra empresa.');
          setClientes([]);
          setLoading(false);
          return;
        }
        const data = await response.json();
        if (data && data.detail === 'Não autorizado') {
          setErrorMsg('Você não está autorizado a visualizar os clientes desta empresa. Faça login novamente ou selecione outra empresa.');
          setClientes([]);
          setLoading(false);
          return;
        }
        setClientes(data);
        setErrorMsg(null);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        setClientes([]);
        setErrorMsg('Erro ao carregar clientes. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

  if (!empresaSelecionada) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-yellow-400" : "text-yellow-600"}>
          Nenhuma empresa selecionada. Selecione uma empresa para visualizar os clientes.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-blue-400" : "text-blue-600"}>Carregando clientes...</div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={darkMode ? "text-red-400" : "text-red-600"}>
          {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Clientes</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Novo Cliente
        </button>
      </div>

      <form className="mb-6 flex gap-2 md:gap-2 md:mb-6" onSubmit={handleSearch} autoComplete="off">
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ/CPF ou email..."
          className={`w-full p-2 border rounded ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-700"}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded whitespace-nowrap"
        >Buscar</button>
      </form>

      {/* Versão para desktop */}
      <div className="hidden md:block">
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow overflow-x-auto`}>
          <table className="min-w-full divide-y divide-gray-700">
            <thead className={darkMode ? "bg-gray-900" : "bg-gray-50"}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">WhatsApp</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">CNPJ</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Endereço</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Cidade/UF</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? "bg-gray-800" : "bg-white"} divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
              {clientes.length > 0 ? (
                clientes.map((cliente) => (
                  <tr key={cliente.cli_codigo} className={darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.cli_codigo}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.cli_nome}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.tel_whatsapp || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.cnpj || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.endereco} {cliente.numero ? ', ' + cliente.numero : ''}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.bairro || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.cidade} / {cliente.uf}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <button className={darkMode ? "text-blue-400 hover:text-blue-300 mr-3" : "text-blue-600 hover:text-blue-900 mr-3"}>Editar</button>
                      <button className={darkMode ? "text-green-400 hover:text-green-300 mr-3" : "text-green-600 hover:text-green-900 mr-3"} onClick={() => handleVerVendas(cliente)}>Ver Vendas</button>
                      <button className={darkMode ? "text-purple-400 hover:text-purple-300 mr-3" : "text-purple-600 hover:text-purple-900 mr-3"} onClick={() => handleVerContas(cliente)}>Ver Contas</button>
                      <button className={darkMode ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-900"}>Excluir</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className={`px-4 py-4 text-center text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Nenhum cliente encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Versão mobile: cards */}
      <div className="grid grid-cols-1 gap-2 mt-4 sm:gap-3 md:gap-4">
        {clientes.length > 0 ? (
          clientes.map((cliente) => (
            <div key={cliente.cli_codigo} className={`${darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"} rounded-lg shadow border p-3 flex flex-col justify-between min-w-0 w-full max-w-full overflow-x-auto`} style={{wordBreak:'break-word'}}>
              <div className="flex flex-col gap-1">
                <div className="text-lg font-semibold truncate">{cliente.cli_nome}</div>
                <div className="flex flex-row gap-2 items-center text-xs text-gray-500">
                  <span className="font-bold">Cód:</span> <span>{cliente.cli_codigo}</span>
                  <span className="font-bold ml-2">CNPJ:</span> <span>{cliente.cnpj || '-'}</span>
                </div>
              </div>
              <div className="text-sm text-gray-500">{cliente.endereco}{cliente.numero ? ', ' + cliente.numero : ''}</div>
              <div className="flex flex-col gap-1 text-xs mt-2">
                <span><span className="font-medium">WhatsApp:</span> {cliente.tel_whatsapp || '-'}</span>
                <span><span className="font-medium">Bairro:</span> {cliente.bairro || '-'}</span>
                <span><span className="font-medium">Cidade/UF:</span> {cliente.cidade} / {cliente.uf}</span>
              </div>
              <div className="flex gap-2 mt-2">
  <button className={darkMode ? "text-green-400 hover:text-green-300" : "text-green-600 hover:text-green-900"} onClick={() => handleVerVendas(cliente)}>Ver Vendas</button>
  <button className={darkMode ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-900"} onClick={() => handleVerContas(cliente)}>Ver Contas</button>
</div>
            </div>
          ))
        ) : (
          <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-6 text-center`}>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Nenhum cliente encontrado</p>
          </div>
        )}
      </div>

      {/* Modal de Vendas */}
      {modalVendas.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-3xl w-full p-6 relative`}>
            <button className="absolute top-3 right-3 text-gray-500 hover:text-red-500" onClick={closeModalVendas}>&times;</button>
            <h2 className="text-xl font-bold mb-4">Vendas de {modalVendas.cliente?.cli_nome}</h2>
            {loadingVendas ? (
              <div className="text-blue-500">Carregando vendas...</div>
            ) : errorVendas ? (
              <div className="text-red-500">{errorVendas}</div>
            ) : modalVendas.vendas.length === 0 ? (
              <div className="text-gray-500">Nenhuma venda encontrada para este cliente.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs md:text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 py-1">Venda</th>
                      <th className="px-2 py-1">Data</th>
                      <th className="px-2 py-1">Vendedor</th>
                      <th className="px-2 py-1">Total</th>
                      <th className="px-2 py-1">Desconto</th>
                      <th className="px-2 py-1">Forma Pgto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalVendas.vendas.map((venda) => (
                      <tr key={venda.ecf_numero}>
                        <td className="px-2 py-1">{venda.ecf_numero}</td>
                        <td className="px-2 py-1">{venda.ecf_data ? new Date(venda.ecf_data).toLocaleDateString() : '-'}</td>
                        <td className="px-2 py-1">{venda.ven_nome}</td>
                        <td className="px-2 py-1">R$ {Number(venda.ecf_total).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        <td className="px-2 py-1">R$ {Number(venda.ecf_desconto).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        <td className="px-2 py-1">{venda.fpg_nome}</td>
                        <td className="px-2 py-1">
                          <button className="text-blue-600 hover:underline" onClick={() => handleVerItensVenda(venda)}>Ver Itens</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesList;
