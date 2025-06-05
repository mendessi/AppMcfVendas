import React, { useState, useEffect } from 'react';
import api from '../services/api';
import removeAccents from 'remove-accents';

function primeiroDiaMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
}
function ultimoDiaMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
}

const PositivacaoProdutos = ({ darkMode }) => {
  const [cliente, setCliente] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [dataInicial, setDataInicial] = useState(primeiroDiaMesAtual());
  const [dataFinal, setDataFinal] = useState(ultimoDiaMesAtual());
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [filtro, setFiltro] = useState('nao'); // todos, positivados, nao
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [showListaClientes, setShowListaClientes] = useState(false);

  // Buscar clientes ao clicar em Filtrar
  const filtrarClientes = async () => {
    setLoading(true);
    setErro(null);
    setShowListaClientes(false);
    try {
      const termoBusca = buscaCliente.toUpperCase().slice(0, 40); // Limite de 40 caracteres
      const resp = await api.get('/relatorios/clientes', { params: { q: termoBusca } });
      setClientesFiltrados(resp.data || []);
      setShowListaClientes(true);
    } catch (err) {
      setErro('Erro ao buscar clientes.');
      setClientesFiltrados([]);
    }
    setLoading(false);
  };

  // Buscar produtos do cliente ou todos
  const buscarProdutos = async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = {
        data_inicial: dataInicial,
        data_final: dataFinal,
        q: buscaProduto
      };
      if (cliente) {
        params.cli_codigo = cliente.cli_codigo || cliente.codigo || cliente.id;
      }
      const resp = await api.get('/relatorios/positivacao-produtos', { params });
      setProdutos(resp.data.produtos || []);
    } catch (err) {
      setErro('Erro ao buscar produtos.');
      setProdutos([]);
    }
    setLoading(false);
  };

  // Buscar ao mudar período/busca
  useEffect(() => {
    // Só buscar produtos se um cliente estiver selecionado
    if (cliente) {
      buscarProdutos();
    }
    // eslint-disable-next-line
  }, [cliente, dataInicial, dataFinal]);

  // Filtro visual
  const produtosFiltrados = produtos.filter(p => {
    if (filtro === 'positivados') return p.positivado;
    if (filtro === 'nao') return !p.positivado;
    return true;
  });

  function formatarMoeda(valor) {
    return valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
  }

  // Função para normalizar texto (remover acentos e caixa)
  function normalizar(str) {
    return removeAccents((str || '').toLowerCase().trim());
  }

  return (
    <div className={`p-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <h2 className="text-2xl font-bold mb-4">Positivação de Produtos</h2>
      <div className="flex flex-wrap gap-2 mb-4 items-end flex-col md:flex-row md:items-end md:gap-4">
        <div className="w-full md:w-auto mb-2 md:mb-0 relative flex flex-col md:flex-row md:items-end">
          <div className="relative w-full md:w-[280px]">
            <label className="block text-sm mb-1">Cliente</label>
            <input
              type="text"
              value={buscaCliente}
              onChange={e => setBuscaCliente(e.target.value.toUpperCase().slice(0, 40))}
              placeholder="Buscar cliente..."
              className={`rounded px-2 py-1 border w-full md:w-[280px] ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
            />
            {/* Botão X para limpar cliente */}
            {(cliente || buscaCliente) && (
              <button
                type="button"
                className="absolute right-3 top-8 md:top-2 text-gray-400 hover:text-red-600 text-lg font-bold focus:outline-none z-10"
                style={{ background: 'none', border: 'none', padding: 0 }}
                onClick={() => { setCliente(null); setBuscaCliente(''); setErro(null); setClientesFiltrados([]); setShowListaClientes(false); }}
                title="Limpar cliente"
              >×</button>
            )}
            {/* Lista de clientes filtrados */}
            {showListaClientes && clientesFiltrados.length > 0 && (
              <div
                className={`fixed inset-0 z-50 flex items-center justify-center md:absolute md:inset-auto md:z-20 md:mt-1 bg-black bg-opacity-40 md:bg-transparent`}
                style={{
                  // No mobile, ocupa quase toda a tela
                  alignItems: 'flex-start',
                  paddingTop: '10vh',
                }}
              >
                <div
                  className={`w-full max-w-md md:max-w-full md:w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow-lg md:shadow w-full max-h-[70vh] overflow-y-auto`}
                  style={{
                    margin: '0 8px',
                    zIndex: 1000,
                  }}
                >
                  <div className="flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="font-bold text-lg">Selecione o Cliente</span>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-600 text-2xl font-bold focus:outline-none"
                      style={{ background: 'none', border: 'none', padding: 0 }}
                      onClick={() => { setShowListaClientes(false); }}
                      title="Fechar"
                    >×</button>
                  </div>
                  {clientesFiltrados.map(c => (
                    <div key={c.cli_codigo} className="flex flex-col px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                      <div className={`font-bold text-base md:text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{c.cli_nome}</div>
                      <div className="text-xs text-gray-500">CNPJ: {c.cnpj || '-'} | {c.cidade} {c.uf}</div>
                      <button
                        className={`mt-2 px-4 py-2 rounded text-base md:text-xs font-bold ${darkMode ? 'bg-blue-700 text-white' : 'bg-blue-500 text-white'} w-full md:w-max`}
                        onClick={() => { setCliente(c); setShowListaClientes(false); setBuscaCliente(c.cli_nome); setErro(null); }}
                      >Selecionar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            className={`mt-2 md:mt-0 md:ml-2 px-2 py-1 rounded ${darkMode ? 'bg-blue-700 text-white' : 'bg-blue-500 text-white'}`}
            onClick={filtrarClientes}
            disabled={!buscaCliente || loading}
            style={{ minWidth: 100 }}
          >Filtrar</button>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div>
            <label className="block text-sm mb-1">Data Inicial</label>
            <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)}
              className={`rounded px-2 py-1 border w-full ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Data Final</label>
            <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)}
              className={`rounded px-2 py-1 border w-full ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
            />
          </div>
        </div>
        <div className="w-full md:w-auto">
          <label className="block text-sm mb-1">Buscar Produto</label>
          <input
            type="text"
            value={buscaProduto}
            onChange={e => setBuscaProduto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') buscarProdutos(); }}
            placeholder="Nome ou código"
            className={`rounded px-2 py-1 border w-full md:w-36 ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
          />
        </div>
        <div className="w-full md:w-auto">
          <label className="block text-sm mb-1">Filtro</label>
          <select value={filtro} onChange={e => setFiltro(e.target.value)}
            className={`rounded px-2 py-1 border w-full md:w-36 ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
          >
            <option value="todos">Todos</option>
            <option value="positivados">Só positivados</option>
            <option value="nao">Só não positivados</option>
          </select>
        </div>
        <button onClick={buscarProdutos} disabled={loading || showListaClientes}
          className={`ml-0 md:ml-2 mt-2 md:mt-0 px-4 py-2 rounded font-bold ${darkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
        >Buscar</button>
      </div>
      {/* Seção de produtos */}
      {erro && <div className="text-red-500 mb-2">{erro}</div>}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <span className="ml-3">Buscando produtos...</span>
        </div>
      ) : cliente || produtos.length > 0 ? (
        <>
          {/* Tabela para desktop */}
          <div className="overflow-x-auto hidden md:block">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-200'}>
                  <th className="px-2 py-1">Código</th>
                  <th className="px-2 py-1">Descrição</th>
                  <th className="px-2 py-1">Marca</th>
                  <th className="px-2 py-1">Unidade</th>
                  <th className="px-2 py-1">Última Compra</th>
                  <th className="px-2 py-1">Qtde Vendida</th>
                  <th className="px-2 py-1">Valor Vendido</th>
                  <th className="px-2 py-1">Positivado</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-4">Nenhum produto encontrado.</td></tr>
                )}
                {produtosFiltrados.map(p => (
                  <tr key={p.pro_codigo} className={p.positivado ? (darkMode ? 'bg-green-900' : 'bg-green-100') : (darkMode ? 'bg-red-900' : 'bg-red-100')}>
                    <td className="px-2 py-1">{p.pro_codigo}</td>
                    <td className="px-2 py-1 font-semibold">{p.pro_descricao}</td>
                    <td className="px-2 py-1">{p.pro_marca}</td>
                    <td className="px-2 py-1">{p.uni_codigo}</td>
                    <td className="px-2 py-1">{p.ultima_compra ? new Date(p.ultima_compra).toLocaleDateString() : '-'}</td>
                    <td className="px-2 py-1 text-right">{p.qtde_comprada}</td>
                    <td className="px-2 py-1 text-right">{formatarMoeda(p.valor_comprado)}</td>
                    <td className="px-2 py-1 font-bold text-center">
                      {p.positivado ? <span className="text-green-600">Sim</span> : <span className="text-red-600">Não</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cards para mobile */}
          <div className="block md:hidden space-y-4">
            {produtosFiltrados.length === 0 ? (
              <div className="text-center py-4 text-gray-500">Nenhum produto encontrado.</div>
            ) : (
              produtosFiltrados.map(p => (
                <div key={p.pro_codigo} className={`rounded-lg shadow p-3 ${p.positivado ? (darkMode ? 'bg-green-900' : 'bg-green-100') : (darkMode ? 'bg-red-900' : 'bg-red-100')}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-lg">{p.pro_descricao}</span>
                    <span className={`font-bold text-sm px-2 py-1 rounded ${p.positivado ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{p.positivado ? 'POSITIVADO' : 'NÃO'}</span>
                  </div>
                  <div className="text-sm mb-1"><b>Código:</b> {p.pro_codigo}</div>
                  <div className="text-sm mb-1"><b>Marca:</b> {p.pro_marca}</div>
                  <div className="text-sm mb-1"><b>Unidade:</b> {p.uni_codigo}</div>
                  <div className="text-sm mb-1"><b>Última Compra:</b> {p.ultima_compra ? new Date(p.ultima_compra).toLocaleDateString() : '-'}</div>
                  <div className="text-sm mb-1"><b>Qtde Vendida:</b> {p.qtde_comprada}</div>
                  <div className="text-sm mb-1"><b>Valor Vendido:</b> {formatarMoeda(p.valor_comprado)}</div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">Selecione um cliente ou clique em buscar para visualizar a positivação de produtos.</div>
      )}
    </div>
  );
};

export default PositivacaoProdutos; 