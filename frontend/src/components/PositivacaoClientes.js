import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const CACHE_KEY = 'positivacao_clientes_cache';
const MAX_CLIENTES = 50;

function primeiroDiaMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
}
function ultimoDiaMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
}

const PositivacaoClientes = ({ darkMode }) => {
  const cache = localStorage.getItem(CACHE_KEY);
  const cacheData = cache ? JSON.parse(cache) : null;

  const [dataInicial, setDataInicial] = useState(cacheData?.dataInicial || primeiroDiaMesAtual());
  const [dataFinal, setDataFinal] = useState(cacheData?.dataFinal || ultimoDiaMesAtual());
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [showListaClientes, setShowListaClientes] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [filtro, setFiltro] = useState(cacheData?.filtro || 'nao');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState("");
  const [buscaTemp, setBuscaTemp] = useState("");
  const [emCache, setEmCache] = useState(!!cacheData?.clientes?.length);
  const [dadosCliente, setDadosCliente] = useState([]);

  // Função para buscar clientes ao clicar em Filtrar
  const filtrarClientes = async () => {
    setClientesFiltrados([]);
    setErro(null);
    setShowListaClientes(false);
    setLoading(true);
    try {
      const termoBusca = buscaTemp.toUpperCase().slice(0, 40);
      const resp = await api.get('/relatorios/clientes', { params: { q: termoBusca } });
      setClientesFiltrados(resp.data || []);
      setShowListaClientes(true);
    } catch (err) {
      setErro('Erro ao buscar clientes.');
      setClientesFiltrados([]);
      setShowListaClientes(true);
    }
    setLoading(false);
  };

  // Função para buscar dados de positivação do cliente selecionado
  const buscarPositivacao = async () => {
    if (!clienteSelecionado) return;
    setLoading(true);
    setErro(null);
    try {
      const resp = await api.get('/relatorios/positivacao-clientes', {
        params: {
          data_inicial: dataInicial,
          data_final: dataFinal,
          cli_codigo: clienteSelecionado.cli_codigo || clienteSelecionado.codigo || clienteSelecionado.id
        }
      });
      setDadosCliente(resp.data.clientes || []);
      // Salvar no cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        dataInicial,
        dataFinal,
        clientes: resp.data.clientes || [],
        filtro,
        busca: buscaTemp
      }));
      setEmCache(false);
    } catch (err) {
      setErro('Erro ao buscar positivação.');
      setDadosCliente([]);
    }
    setLoading(false);
  };

  // Função para formatar como moeda
  function formatarMoeda(valor) {
    return valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
  }

  // Limpar seleção de cliente
  const limparCliente = () => {
    setClienteSelecionado(null);
    setBusca("");
    setBuscaTemp("");
    setDadosCliente([]);
  };

  // Renderização
  return (
    <div className={`p-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <h2 className="text-2xl font-bold mb-4">Positivação de Clientes</h2>
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <div>
          <label className="block text-sm mb-1">Buscar Nome/CNPJ</label>
          <input
            type="text"
            value={buscaTemp}
            onChange={e => setBuscaTemp(e.target.value.toUpperCase())}
            placeholder="Digite nome ou CNPJ"
            className={`rounded px-2 py-1 border ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
            style={{ minWidth: 180 }}
          />
        </div>
        <button
          className={`ml-2 px-4 py-2 rounded font-bold ${darkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          onClick={filtrarClientes}
          disabled={!buscaTemp || loading}
          style={{ minWidth: 100 }}
        >Filtrar</button>
        <div>
          <label className="block text-sm mb-1">Data Inicial</label>
          <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)}
            className={`rounded px-2 py-1 border ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Data Final</label>
          <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)}
            className={`rounded px-2 py-1 border ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Filtro</label>
          <select value={filtro} onChange={e => setFiltro(e.target.value)}
            className={`rounded px-2 py-1 border ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
          >
            <option value="todos">Todos</option>
            <option value="positivados">Só positivados</option>
            <option value="nao">Só não positivados</option>
          </select>
        </div>
        <button
          onClick={buscarPositivacao}
          disabled={loading || !clienteSelecionado}
          className={`ml-2 px-4 py-2 rounded font-bold ${darkMode ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
        >Buscar</button>
        {clienteSelecionado && (
          <button
            onClick={limparCliente}
            className={`ml-2 px-4 py-2 rounded font-bold ${darkMode ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
          >Limpar Cliente</button>
        )}
      </div>
      {showListaClientes && clientesFiltrados.length > 0 && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40`}
          style={{ alignItems: 'flex-start', paddingTop: '10vh' }}
        >
          <div
            className={`w-full max-w-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow-lg max-h-[70vh] overflow-y-auto`}
            style={{ margin: '0 8px', zIndex: 1000 }}
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
                <div className="font-bold text-base">{c.cli_nome}</div>
                <div className="text-xs text-gray-500">CNPJ: {c.cnpj || '-'} | {c.cidade} {c.uf}</div>
                <button
                  className={`mt-2 px-4 py-2 rounded text-base font-bold ${darkMode ? 'bg-blue-700 text-white' : 'bg-blue-500 text-white'} w-full`}
                  onClick={() => { setClienteSelecionado(c); setShowListaClientes(false); setBuscaTemp(c.cli_nome); setErro(null); }}
                >Selecionar</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {erro && <div className="text-red-500 mb-2">{erro}</div>}
      {loading ? (
        <div>Carregando...</div>
      ) : clienteSelecionado && dadosCliente.length > 0 ? (
        <>
          {/* Tabela para desktop/tablet */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-200'}>
                  <th className="px-2 py-1">Código</th>
                  <th className="px-2 py-1">Nome</th>
                  <th className="px-2 py-1 w-32">CNPJ</th>
                  <th className="px-2 py-1">Cidade</th>
                  <th className="px-2 py-1">UF</th>
                  <th className="px-2 py-1">Última Compra</th>
                  <th className="px-2 py-1">Total Compras</th>
                  <th className="px-2 py-1">Qtde Compras</th>
                  <th className="px-2 py-1">Positivado</th>
                </tr>
              </thead>
              <tbody>
                {dadosCliente.filter(c => {
                  if (filtro === 'positivados') return c.positivado;
                  if (filtro === 'nao') return !c.positivado;
                  return true;
                }).map(c => (
                  <tr key={c.cli_codigo} className={c.positivado ? (darkMode ? 'bg-green-900' : 'bg-green-100') : (darkMode ? 'bg-red-900' : 'bg-red-100')}>
                    <td className="px-2 py-1">{c.cli_codigo}</td>
                    <td className="px-2 py-1 font-semibold">{c.cli_nome}</td>
                    <td className="px-2 py-1 w-32 truncate">{c.cnpj || '-'}</td>
                    <td className="px-2 py-1">{c.cidade}</td>
                    <td className="px-2 py-1">{c.uf}</td>
                    <td className="px-2 py-1">{c.ultima_operacao ? new Date(c.ultima_operacao).toLocaleDateString() : '-'}</td>
                    <td className="px-2 py-1 text-right">{formatarMoeda(c.total_compras)}</td>
                    <td className="px-2 py-1 text-center">{c.qtde_compras}</td>
                    <td className="px-2 py-1 font-bold text-center">
                      {c.positivado ? <span className="text-green-600">Sim</span> : <span className="text-red-600">Não</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cards para mobile */}
          <div className="sm:hidden flex flex-col gap-3">
            {dadosCliente.filter(c => {
              if (filtro === 'positivados') return c.positivado;
              if (filtro === 'nao') return !c.positivado;
              return true;
            }).map(c => (
              <div key={c.cli_codigo} className={`rounded-lg shadow p-3 ${c.positivado ? (darkMode ? 'bg-green-900' : 'bg-green-100') : (darkMode ? 'bg-red-900' : 'bg-red-100')}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-lg">{c.cli_nome}</span>
                  <span className={`font-bold text-sm px-2 py-1 rounded ${c.positivado ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{c.positivado ? 'POSITIVADO' : 'NÃO'}</span>
                </div>
                <div className="text-sm mb-1"><b>Código:</b> {c.cli_codigo}</div>
                <div className="text-sm mb-1"><b>CNPJ:</b> {c.cnpj || '-'}</div>
                <div className="text-sm mb-1"><b>Cidade:</b> {c.cidade} <b>UF:</b> {c.uf}</div>
                <div className="text-sm mb-1"><b>Última Compra:</b> {c.ultima_operacao ? new Date(c.ultima_operacao).toLocaleDateString() : '-'}</div>
                <div className="text-sm mb-1"><b>Total Compras:</b> {formatarMoeda(c.total_compras)}</div>
                <div className="text-sm"><b>Qtde Compras:</b> {c.qtde_compras}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">Selecione um cliente e clique em buscar para visualizar a positivação.</div>
      )}
    </div>
  );
};

export default PositivacaoClientes; 