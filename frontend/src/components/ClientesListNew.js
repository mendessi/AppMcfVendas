import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ClientesNewForm from './ClientesNewForm';
import { FiShoppingBag, FiDollarSign, FiList, FiAlertCircle } from 'react-icons/fi';

function ModalItensVenda({ open, onClose, itens, venda, darkMode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className={`bg-white ${darkMode ? 'dark:bg-gray-900 text-white' : 'text-gray-900'} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] p-2 md:p-6 relative flex flex-col border border-gray-300 dark:border-gray-700`} style={{width:'98vw', maxWidth: '600px'}}>
        <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-3xl z-10" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4 mt-10 md:mt-0 text-center tracking-tight text-gray-900 dark:text-white">Itens da Venda {venda?.ecf_numero}</h2>
        {itens === null ? (
          <div className="text-center my-8">Carregando itens...</div>
        ) : itens.length === 0 ? (
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
                {itens.map((item, idx) => (
                  <tr key={item.PRO_CODIGO + '-' + idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-2 py-1">{item.PRO_CODIGO}</td>
                    <td className="px-2 py-1">{item.PRO_DESCRICAO}</td>
                    <td className="px-2 py-1">{item.PRO_MARCA}</td>
                    <td className="px-2 py-1">{item.UNI_CODIGO}</td>
                    <td className="px-2 py-1 text-right">{item.PRO_QUANTIDADE}</td>
                    <td className="px-2 py-1 text-right">R$ {Number(item.PRO_VENDA).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                    <td className="px-2 py-1 text-right">R$ {(item.PRO_QUANTIDADE * item.PRO_VENDA).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                    <td className="px-2 py-1 text-right">{item.ESTOQUE_ATUAL}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalVendasCliente({ open, onClose, vendas, cliente, darkMode, onVerItensVenda }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className={`bg-white ${darkMode ? 'dark:bg-gray-900 text-white' : 'text-gray-900'} rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] p-2 md:p-8 relative flex flex-col border border-gray-300 dark:border-gray-700`} style={{width:'98vw', maxWidth: '700px'}}>
        <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-3xl z-10" onClick={onClose}>&times;</button>
        <h2 className="text-2xl font-extrabold mb-4 mt-10 md:mt-0 text-center tracking-tight text-gray-900 dark:text-white">Vendas de {cliente?.cli_nome}</h2>
        {vendas === null ? (
          <div className="text-center my-8">Carregando vendas...</div>
        ) : vendas.length === 0 ? (
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
                  <th className="px-2 py-2 text-center">Status</th>
                  <th className="px-2 py-2 text-center">Itens</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map((venda) => (
                  <tr key={venda.ecf_numero} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-2 py-1">{venda.ecf_numero}</td>
                    <td className="px-2 py-1">{venda.ecf_data ? new Date(venda.ecf_data).toLocaleDateString() : '-'}</td>
                    <td className="px-2 py-1">{venda.ven_nome}</td>
                    <td className="px-2 py-1 text-right font-semibold">R$ {Number(venda.ecf_total).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                    <td className="px-2 py-1 text-right">R$ {Number(venda.ecf_desconto).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                    <td className="px-2 py-1">{venda.fpg_nome}</td>
                    <td className="px-2 py-1 text-center">
                      {venda.ecf_cx_data && String(venda.ecf_cx_data).trim() !== "" ? (
                        <span className="text-green-600 dark:text-green-400 font-bold">AUTENTICADA</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-bold">NÃO AUTENTICADA</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button className={`p-2 rounded-full ${darkMode ? 'text-blue-300 hover:text-blue-200 hover:bg-gray-700' : 'text-blue-600 hover:text-blue-900 hover:bg-gray-100'}`} title="Ver Itens da Venda" onClick={() => onVerItensVenda(venda)}>
                        <FiList size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalFinanceiroCliente({ open, onClose, contas, cliente, darkMode }) {
  if (!open) return null;
  const total = contas ? contas.reduce((acc, c) => acc + (parseFloat(c.con_valor) || 0), 0) : 0;
  const totalSaldo = contas ? contas.reduce((acc, c) => acc + (parseFloat(c.con_saldo) || 0), 0) : 0;
  const vencidas = contas ? contas.filter(c => c.situacao === 'ABERTO' && new Date(c.con_vencto) < new Date()) : [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className={`bg-white ${darkMode ? 'dark:bg-gray-900 text-white' : 'text-gray-900'} rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] p-2 md:p-8 relative flex flex-col border border-gray-300 dark:border-gray-700`} style={{width:'98vw', maxWidth: '800px'}}>
        <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-3xl z-10" onClick={onClose}>&times;</button>
        <h2 className="text-2xl font-extrabold mb-4 mt-10 md:mt-0 text-center tracking-tight text-gray-900 dark:text-white">Financeiro de {cliente?.cli_nome}</h2>
        {contas === null ? (
          <div className="text-center my-8">Carregando contas...</div>
        ) : contas.length === 0 ? (
          <div className="text-gray-500 text-center my-8">Nenhuma conta encontrada para este cliente.</div>
        ) : (
          <>
            {vencidas.length > 0 && (
              <div className="flex items-center justify-center mb-4 text-red-600 dark:text-red-400 font-bold text-lg gap-2">
                <FiAlertCircle size={22} /> {vencidas.length} conta(s) vencida(s)!
              </div>
            )}
            <div className="overflow-x-auto overflow-y-auto flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" style={{maxHeight:'60vh'}}>
              <table className="min-w-full text-xs md:text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-left">Documento</th>
                    <th className="px-2 py-2 text-left">Nota</th>
                    <th className="px-2 py-2 text-left">Parcela</th>
                    <th className="px-2 py-2 text-left">Vencimento</th>
                    <th className="px-2 py-2 text-right">Valor</th>
                    <th className="px-2 py-2 text-right">Pago</th>
                    <th className="px-2 py-2 text-right">Saldo</th>
                    <th className="px-2 py-2 text-center">Situação</th>
                    <th className="px-2 py-2 text-center">Baixa</th>
                  </tr>
                </thead>
                <tbody>
                  {contas.map((conta, idx) => {
                    const vencida = conta.situacao === 'ABERTO' && new Date(conta.con_vencto) < new Date();
                    return (
                      <tr key={idx} className={vencida ? 'bg-red-100 dark:bg-red-900' : ''}>
                        <td className="px-2 py-1">{conta.con_documento}</td>
                        <td className="px-2 py-1">{conta.ntf_numnota}</td>
                        <td className="px-2 py-1">{conta.con_parcela}</td>
                        <td className="px-2 py-1">{conta.con_vencto ? new Date(conta.con_vencto).toLocaleDateString() : '-'}</td>
                        <td className="px-2 py-1 text-right">R$ {Number(conta.con_valor).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        <td className="px-2 py-1 text-right">R$ {Number(conta.con_pago).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        <td className={`px-2 py-1 text-right font-bold ${vencida ? 'text-red-600 dark:text-red-300' : ''}`}>R$ {Number(conta.con_saldo).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        <td className={`px-2 py-1 text-center font-bold ${conta.situacao === 'PAGO' ? 'text-green-600 dark:text-green-300' : vencida ? 'text-red-600 dark:text-red-300' : ''}`}>{conta.situacao}</td>
                        <td className="px-2 py-1 text-center">{conta.con_baixa ? new Date(conta.con_baixa).toLocaleDateString() : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={4} className="px-2 py-2 text-right">Totais:</td>
                    <td className="px-2 py-2 text-right">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                    <td></td>
                    <td className="px-2 py-2 text-right">R$ {totalSaldo.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ClientesListNew({ darkMode = false }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [clienteEdit, setClienteEdit] = useState(null);
  const [busca, setBusca] = useState('');
  const [buscaAtiva, setBuscaAtiva] = useState('');
  const [modalVendas, setModalVendas] = useState({ open: false, vendas: null, cliente: null });
  const [modalItens, setModalItens] = useState({ open: false, itens: null, venda: null });
  const [modalFinanceiro, setModalFinanceiro] = useState({ open: false, contas: null, cliente: null, alerta: false });

  const carregarClientes = async (termo = '') => {
    setLoading(true);
    setErro('');
    try {
      const resp = await api.get(`/relatorios/clientes-new?q=${encodeURIComponent(termo)}`);
      setClientes(resp.data);
    } catch (err) {
      setErro('Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  const handleNovo = () => {
    setClienteEdit(null);
    setModoEdicao(false);
    setShowForm(true);
  };

  const handleEditar = (cliente) => {
    setClienteEdit(cliente);
    setModoEdicao(true);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    carregarClientes(buscaAtiva);
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    setBuscaAtiva(busca);
    carregarClientes(busca);
  };

  // Função para buscar vendas do cliente e abrir o modal
  const handleVerVendas = async (cliente) => {
    setModalVendas({ open: true, vendas: null, cliente });
    try {
      const resp = await api.get(`/relatorios/clientes/${cliente.cli_codigo}/vendas`);
      let vendas = [];
      if (Array.isArray(resp.data)) {
        vendas = resp.data;
      } else if (resp.data && typeof resp.data === 'object') {
        if (resp.data.vendas && Array.isArray(resp.data.vendas)) {
          vendas = resp.data.vendas;
        } else if (resp.data.data && Array.isArray(resp.data.data)) {
          vendas = resp.data.data;
        } else {
          const keys = Object.keys(resp.data);
          if (keys.length > 0 && typeof resp.data[keys[0]] === 'object') {
            vendas = Object.values(resp.data);
          }
        }
      }
      setModalVendas({ open: true, vendas, cliente });
    } catch (err) {
      setModalVendas({ open: true, vendas: [], cliente });
    }
  };

  const handleCloseModalVendas = () => {
    setModalVendas({ open: false, vendas: null, cliente: null });
  };

  // Função para buscar contas do cliente e abrir o modal
  const handleVerContas = async (cliente) => {
    setModalFinanceiro({ open: true, contas: null, cliente, alerta: false });
    try {
      const resp = await api.get(`/relatorios/clientes/${cliente.cli_codigo}/contas`);
      let contas = Array.isArray(resp.data) ? resp.data : [];
      setModalFinanceiro({ open: true, contas, cliente, alerta: contas.some(c => c.situacao === 'ABERTO' && new Date(c.con_vencto) < new Date()) });
    } catch (err) {
      setModalFinanceiro({ open: true, contas: [], cliente, alerta: false });
    }
  };

  const handleCloseModalFinanceiro = () => {
    setModalFinanceiro({ open: false, contas: null, cliente: null, alerta: false });
  };

  // Função para buscar itens da venda e abrir o modal
  const handleVerItensVenda = async (venda) => {
    setModalItens({ open: true, itens: null, venda });
    try {
      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-empresa-codigo': empresaCodigo,
        'Content-Type': 'application/json'
      };
      const resp = await api.get(`/relatorios/vendas/${venda.ecf_numero}/itens`, { headers });
      let itens = [];
      if (Array.isArray(resp.data)) {
        itens = resp.data;
      } else if (resp.data && typeof resp.data === 'object') {
        if (resp.data.itens && Array.isArray(resp.data.itens)) {
          itens = resp.data.itens;
        } else if (resp.data.data && Array.isArray(resp.data.data)) {
          itens = resp.data.data;
        } else {
          const keys = Object.keys(resp.data);
          if (keys.length > 0 && typeof resp.data[keys[0]] === 'object') {
            itens = Object.values(resp.data);
          }
        }
      }
      setModalItens({ open: true, itens, venda });
    } catch (err) {
      setModalItens({ open: true, itens: [], venda });
    }
  };

  const handleCloseModalItens = () => {
    setModalItens({ open: false, itens: null, venda: null });
  };

  return (
    <div className={`w-full mx-auto p-4 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <h1 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Lista de Clientes</h1>
      {erro && <div className={`p-2 mb-2 rounded ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`}>{erro}</div>}
      <form onSubmit={handleBuscar} className="mb-4 flex flex-col sm:flex-row gap-2 items-center w-full">
        <div className="w-full flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ/CPF ou e-mail..."
            className={`w-full rounded-lg border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all px-4 py-2 text-base shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-700' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleBuscar(e); }}
            autoFocus
          />
          <div className="flex flex-row gap-2 mt-2 sm:mt-0 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="submit"
              className={`flex-1 sm:flex-none items-center gap-2 px-5 py-2 rounded-lg font-semibold shadow transition-all border-2 border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 ${darkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              disabled={loading || busca.trim().length === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" /></svg>
              Buscar
            </button>
            <button
              type="button"
              className={`flex-1 sm:flex-none items-center gap-2 px-5 py-2 rounded-lg font-semibold shadow transition-all border-2 border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
              onClick={() => { setBusca(''); setBuscaAtiva(''); carregarClientes(''); }}
              disabled={loading || (!busca && !buscaAtiva)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Limpar
            </button>
          </div>
        </div>
      </form>
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div>
          {/* Tabela para desktop/tablet */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full w-full break-words divide-y divide-gray-200">
              <thead className={darkMode ? "bg-gray-900" : "bg-gray-50"}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider max-w-xs w-64 truncate">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">CNPJ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Cidade/UF</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">WhatsApp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider max-w-xs w-48 truncate">Endereço</th>
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
                      <td className="px-4 py-3 whitespace-nowrap max-w-xs w-64 truncate">
                        <div className={`text-sm font-medium flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.cli_nome}{cliente.apelido && (<span className={`ml-2 px-2 py-0.5 rounded ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'} text-xs font-bold border`}>{cliente.apelido}</span>)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.cnpj || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.cidade} / {cliente.uf}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{cliente.tel_whatsapp || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap max-w-xs w-48 truncate">
                        <div className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>{[cliente.endereco, cliente.numero].filter(Boolean).join(', ') || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <button
                          className={`p-2 rounded-full ${darkMode ? 'text-green-400 hover:text-green-300 hover:bg-gray-700' : 'text-green-600 hover:text-green-900 hover:bg-gray-100'} mr-2`}
                          onClick={() => handleVerVendas(cliente)}
                          title="Ver Vendas"
                        >
                          <FiShoppingBag size={20} />
                        </button>
                        <button
                          className={`p-2 rounded-full ${darkMode ? 'text-purple-400 hover:text-purple-300 hover:bg-gray-700' : 'text-purple-600 hover:text-purple-900 hover:bg-gray-100'} relative`}
                          onClick={() => handleVerContas(cliente)}
                          title="Ver Financeiro"
                        >
                          <FiDollarSign size={20} />
                          {modalFinanceiro.alerta && modalFinanceiro.cliente?.cli_codigo === cliente.cli_codigo && (
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold animate-pulse">!</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className={`px-4 py-4 text-center text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Nenhum cliente encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Cards para mobile */}
          <div className="block sm:hidden space-y-4">
            {clientes.length > 0 ? (
              clientes.map((cliente, idx) => (
                <div key={cliente.cli_codigo || idx} className={`rounded-lg shadow p-4 flex flex-col justify-between border transition-shadow ${darkMode ? 'bg-gray-800 border-gray-700 text-white hover:shadow-xl' : 'bg-white border-gray-200 text-gray-900 hover:shadow-lg'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-lg font-bold truncate ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{cliente.cli_nome}</span>
                      {cliente.apelido && <span className={`text-xs ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'} rounded px-2 py-0.5 ml-2`}>{cliente.apelido}</span>}
                    </div>
                    <div className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}><b>Cidade:</b> {cliente.cidade || '-'} / {cliente.uf || '-'}</div>
                    <div className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}><b>WhatsApp:</b> {cliente.tel_whatsapp || '-'}</div>
                    <div className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}><b>CNPJ:</b> {cliente.cnpj || '-'}</div>
                    <div className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}><b>Endereço:</b> {[cliente.endereco, cliente.numero].filter(Boolean).join(', ') || '-'}</div>
                    <div className={`text-xs mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Código: {cliente.cli_codigo}</div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className={`p-2 rounded-full ${darkMode ? 'text-green-400 hover:text-green-300 hover:bg-gray-700' : 'text-green-600 hover:text-green-900 hover:bg-gray-100'}`}
                      onClick={() => handleVerVendas(cliente)}
                      title="Ver Vendas"
                    >
                      <FiShoppingBag size={20} />
                    </button>
                    <button
                      className={`p-2 rounded-full ${darkMode ? 'text-purple-400 hover:text-purple-300 hover:bg-gray-700' : 'text-purple-600 hover:text-purple-900 hover:bg-gray-100'}`}
                      onClick={() => handleVerContas(cliente)}
                      title="Ver Financeiro"
                    >
                      <FiDollarSign size={20} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nenhum cliente encontrado.</div>
            )}
          </div>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className={`rounded shadow-lg p-6 w-full max-w-lg relative ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setShowForm(false)}>&times;</button>
            <ClientesNewForm
              modoEdicao={modoEdicao}
              cli_codigo={clienteEdit?.cli_codigo}
              dadosIniciais={clienteEdit}
              onSuccess={handleFormSuccess}
              darkMode={darkMode}
            />
          </div>
        </div>
      )}
      <ModalVendasCliente open={modalVendas.open} onClose={handleCloseModalVendas} vendas={modalVendas.vendas} cliente={modalVendas.cliente} darkMode={darkMode} onVerItensVenda={handleVerItensVenda} />
      <ModalItensVenda open={modalItens.open} onClose={handleCloseModalItens} itens={modalItens.itens} venda={modalItens.venda} darkMode={darkMode} />
      <ModalFinanceiroCliente open={modalFinanceiro.open} onClose={handleCloseModalFinanceiro} contas={modalFinanceiro.contas} cliente={modalFinanceiro.cliente} darkMode={darkMode} />
    </div>
  );
} 