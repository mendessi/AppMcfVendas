import React, { useState, useEffect } from 'react';
import api from '../services/api';

function primeiroDiaMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
}
function ultimoDiaMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
}

const PositivacaoClientes = ({ darkMode }) => {
  const [dataInicial, setDataInicial] = useState(primeiroDiaMesAtual());
  const [dataFinal, setDataFinal] = useState(ultimoDiaMesAtual());
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('todos'); // todos, positivados, nao
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState("");
  const [buscaTemp, setBuscaTemp] = useState("");

  useEffect(() => {
    buscarClientes();
    // eslint-disable-next-line
  }, [dataInicial, dataFinal]);

  const buscarClientes = async (qBusca) => {
    setLoading(true);
    setErro(null);
    try {
      const resp = await api.get('/relatorios/positivacao-clientes', {
        params: { data_inicial: dataInicial, data_final: dataFinal, q: qBusca !== undefined ? qBusca : busca }
      });
      setClientes(resp.data.clientes || []);
    } catch (err) {
      setErro('Erro ao buscar clientes.');
    }
    setLoading(false);
  };

  const clientesFiltrados = clientes.filter(c => {
    if (filtro === 'positivados') return c.positivado;
    if (filtro === 'nao') return !c.positivado;
    return true;
  });

  // Função para formatar como moeda
  function formatarMoeda(valor) {
    return valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
  }

  return (
    <div className={`p-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <h2 className="text-2xl font-bold mb-4">Positivação de Clientes</h2>
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <div>
          <label className="block text-sm mb-1">Buscar Nome/CNPJ</label>
          <input
            type="text"
            value={buscaTemp}
            onChange={e => setBuscaTemp(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setBusca(buscaTemp); buscarClientes(buscaTemp); }}}
            placeholder="Digite nome ou CNPJ"
            className={`rounded px-2 py-1 border ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
            style={{ minWidth: 180 }}
          />
        </div>
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
        <button onClick={() => { setBusca(buscaTemp); buscarClientes(buscaTemp); }} disabled={loading}
          className={`ml-2 px-4 py-2 rounded font-bold ${darkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
        >Buscar</button>
      </div>
      {erro && <div className="text-red-500 mb-2">{erro}</div>}
      {loading ? (
        <div>Carregando...</div>
      ) : (
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
                {clientesFiltrados.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-4">Nenhum cliente encontrado.</td></tr>
                )}
                {clientesFiltrados.map(c => (
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
            {clientesFiltrados.length === 0 && (
              <div className="text-center py-4">Nenhum cliente encontrado.</div>
            )}
            {clientesFiltrados.map(c => (
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
      )}
    </div>
  );
};

export default PositivacaoClientes; 