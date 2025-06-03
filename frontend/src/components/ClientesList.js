import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

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
    
    // Obter a resposta e garantir que vendas seja sempre um array
    const data = await response.json();
    console.log('Resposta da API de vendas:', data); // Log para depuração
    
    // Garantir que vendas seja um array mesmo se a API retornar um objeto ou outro formato
    let vendas = [];
    if (Array.isArray(data)) {
      vendas = data;
    } else if (data && typeof data === 'object') {
      // Se for um objeto, tenta extrair a propriedade que parece conter as vendas
      if (data.vendas && Array.isArray(data.vendas)) {
        vendas = data.vendas;
      } else if (data.data && Array.isArray(data.data)) {
        vendas = data.data;
      } else {
        // Tentativa final: transformar as propriedades do objeto em um array
        const keys = Object.keys(data);
        if (keys.length > 0 && typeof data[keys[0]] === 'object') {
          vendas = Object.values(data);
        }
      }
    }
    
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
        <LoadingSpinner darkMode={darkMode} message="Carregando clientes..." />
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
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full break-words divide-y divide-gray-200">
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
                    <div className={`text-sm font-medium flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.cli_nome}{cliente.bloqueado && (<span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-300">BLOQUEADO</span>)}</div>
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
    <button className={darkMode ? "text-green-400 hover:text-green-300 mr-3" : "text-green-600 hover:text-green-900 mr-3"} onClick={() => handleVerVendas(cliente)}>Ver Vendas</button>
    <button className={darkMode ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-900"} onClick={() => handleVerContas(cliente)}>Ver Contas</button>
  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className={`px-4 py-4 text-center text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Nenhum cliente encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Versão para mobile - cards */}
      <div className="block sm:hidden space-y-4">
        {clientes.length > 0 ? (
          clientes.map((cliente, idx) => (
            <div key={cliente.cli_codigo || idx} className="bg-white rounded-lg shadow p-4">
              <div className="font-bold text-gray-900 text-lg mb-1">{cliente.cli_nome}</div>
              <div className="text-sm text-gray-600 mb-1">Código: {cliente.cli_codigo}</div>
              {cliente.apelido && <div className="text-sm text-gray-500 mb-1">Apelido: {cliente.apelido}</div>}
              {cliente.contato && <div className="text-sm text-gray-500 mb-1">Contato: {cliente.contato}</div>}
              {cliente.cpf && <div className="text-sm text-gray-500 mb-1">CPF: {cliente.cpf}</div>}
              {cliente.cnpj && <div className="text-sm text-gray-500 mb-1">CNPJ: {cliente.cnpj}</div>}
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500">Nenhum cliente encontrado.</div>
        )}
      </div>

      {/* Modal de Vendas */}
      {modalVendas.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] p-2 md:p-8 relative flex flex-col border border-gray-300 dark:border-gray-700`} style={{width:'98vw', maxWidth: '700px'}}>
            <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-3xl z-10" onClick={closeModalVendas}>&times;</button>
            <h2 className="text-2xl font-extrabold mb-4 mt-10 md:mt-0 text-center tracking-tight text-gray-900 dark:text-white">Vendas de {modalVendas.cliente?.cli_nome}</h2>
            {loadingVendas ? (
              <div className="text-center my-8"><LoadingSpinner darkMode={darkMode} message="Carregando vendas..." /></div>
            ) : errorVendas ? (
              <div className="text-red-500 text-center my-8">{errorVendas}</div>
            ) : modalVendas.vendas.length === 0 ? (
              <div className="text-gray-500 text-center my-8">Nenhuma venda encontrada para este cliente.</div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" style={{maxHeight:'65vh'}}>
                <table className="min-w-full text-xs md:text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left">Venda</th>
                      <th className="px-2 py-2 text-left">Data</th>
                      <th className="px-2 py-2 text-left">Vendedor</th>
                      <th className="px-2 py-2 text-right">Total</th>
                      <th className="px-2 py-2 text-right">Desconto</th>
                      <th className="px-2 py-2 text-left">Forma Pgto</th>
                      <th className="px-2 py-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(modalVendas.vendas) && modalVendas.vendas.map((venda) => (
                      <tr key={venda.ecf_numero} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-2 py-1">{venda.ecf_numero}</td>
                        <td className="px-2 py-1">{venda.ecf_data ? new Date(venda.ecf_data).toLocaleDateString() : '-'}</td>
                        <td className="px-2 py-1">{venda.ven_nome}</td>
                        <td className="px-2 py-1 text-right font-semibold">R$ {Number(venda.ecf_total).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        <td className="px-2 py-1 text-right">R$ {Number(venda.ecf_desconto).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        <td className="px-2 py-1">{venda.fpg_nome}</td>
                        <td className="px-2 py-1 text-center">
                          <button className="text-blue-700 dark:text-blue-300 hover:underline font-bold" onClick={() => handleVerItensVenda(venda)}>Ver Itens</button>
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

      {/* Modal de Itens da Venda */}
      {modalItens.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] p-2 md:p-6 relative flex flex-col border border-gray-300 dark:border-gray-700`} style={{width:'98vw', maxWidth: '600px'}}>
            <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-3xl z-10" onClick={closeModalItens}>&times;</button>
            <h2 className="text-xl font-bold mb-4 mt-10 md:mt-0 text-center tracking-tight text-gray-900 dark:text-white">Itens da Venda {modalItens.venda?.ecf_numero}</h2>
            {loadingItens ? (
              <div className="text-center my-8"><LoadingSpinner darkMode={darkMode} message="Carregando itens..." /></div>
            ) : errorItens ? (
              <div className="text-red-500 text-center my-8">{errorItens}</div>
            ) : modalItens.itens.length === 0 ? (
              <div className="text-gray-500 text-center my-8">Nenhum item encontrado para esta venda.</div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" style={{maxHeight:'60vh'}}>
                <table className="min-w-full text-xs md:text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left">Código</th>
                      <th className="px-2 py-2 text-left">Descrição</th>
                      <th className="px-2 py-2 text-left">Marca</th>
                      <th className="px-2 py-2 text-left">Unidade</th>
                      <th className="px-2 py-2 text-right">Qtde</th>
                      <th className="px-2 py-2 text-right">Valor Unit.</th>
                      <th className="px-2 py-2 text-right">Total</th>
                      <th className="px-2 py-2 text-right">Estoque Atual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalItens.itens.map((item, idx) => {
                      const codigo = item.PRO_CODIGO || '-';
                      const descricao = item.PRO_DESCRICAO || '-';
                      const marca = item.PRO_MARCA || '-';
                      const unidade = item.UNI_CODIGO || '-';
                      const qtde = item.PRO_QUANTIDADE;
                      const valorUnit = item.PRO_VENDA;
                      const total = qtde && valorUnit ? qtde * valorUnit : null;
                      const estoque = item.ESTOQUE_ATUAL;
                      return (
                        <tr key={codigo + '-' + idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-2 py-1">{codigo}</td>
                          <td className="px-2 py-1">{descricao}</td>
                          <td className="px-2 py-1">{marca}</td>
                          <td className="px-2 py-1">{unidade}</td>
                          <td className="px-2 py-1 text-right font-semibold">{qtde !== undefined && qtde !== null && !isNaN(Number(qtde)) ? Number(qtde).toLocaleString('pt-BR', {minimumFractionDigits:2}) : '-'}</td>
                          <td className="px-2 py-1 text-right">{valorUnit !== undefined && valorUnit !== null && !isNaN(Number(valorUnit)) ? `R$ ${Number(valorUnit).toLocaleString('pt-BR', {minimumFractionDigits:2})}` : '-'}</td>
                          <td className="px-2 py-1 text-right font-bold">{total !== null && !isNaN(Number(total)) ? `R$ ${Number(total).toLocaleString('pt-BR', {minimumFractionDigits:2})}` : '-'}</td>
                          <td className={`px-2 py-1 text-right font-semibold ${estoque <= 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{estoque !== undefined && estoque !== null && !isNaN(Number(estoque)) ? Number(estoque).toLocaleString('pt-BR', {minimumFractionDigits:2}) : '-'}</td>
                        </tr>
                      );
                    })}
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
