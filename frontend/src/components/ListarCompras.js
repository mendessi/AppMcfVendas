import React, { useState } from 'react';
import api from '../services/api';

function getHoje() {
  return new Date().toISOString().slice(0, 10);
}

const camposPadrao = [
  { key: 'dataEntrada', label: 'Data Entrada' },
  { key: 'numeroNf', label: 'NF' },
  { key: 'descricaoProduto', label: 'Produto' },
  { key: 'nomeFornecedor', label: 'Fornecedor' },
  { key: 'quantidade', label: 'Qtd' },
  { key: 'custo', label: 'Custo' },
  { key: 'compra', label: 'Compras' },
  { key: 'precoVenda', label: 'Preço1' },
  { key: 'total', label: 'Total' },
  { key: 'estoqueAtual', label: 'Est. Atual' },
];

const camposVendedor = [
  { key: 'dataEntrada', label: 'Data Entrada' },
  { key: 'numeroNf', label: 'NF' },
  { key: 'descricaoProduto', label: 'Produto' },
  { key: 'precoVenda', label: 'Preço1' },
  { key: 'estoqueAtual', label: 'Est. Atual' },
];

export default function ListarCompras({ darkMode = false }) {
  const [dataInicial, setDataInicial] = useState(getHoje());
  const [dataFinal, setDataFinal] = useState(getHoje());
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [filtroProduto, setFiltroProduto] = useState('');
  const [buscaFornecedor, setBuscaFornecedor] = useState('');
  const [fornecedores, setFornecedores] = useState([]);
  const [modalFornecedores, setModalFornecedores] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState(null);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [modalProdutos, setModalProdutos] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  // Detecta nível do usuário
  const user = JSON.parse(localStorage.getItem('user')) || { nivel: 'ADMIN' };
  const isVendedor = user.nivel && user.nivel.toUpperCase() === 'VENDEDOR';
  const campos = isVendedor ? camposVendedor : camposPadrao;

  const handleBuscarFornecedores = async () => {
    if (buscaFornecedor.trim().length < 3) return;
    try {
      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');
      const resp = await api.get('/relatorios/clientes-new', {
        params: { q: buscaFornecedor.trim() },
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        }
      });
      // Filtra apenas fornecedores (CLI_TIPO=2)
      setFornecedores((resp.data || []).filter(f => String(f.cli_tipo) === '2'));
      setModalFornecedores(true);
    } catch (err) {
      setFornecedores([]);
      setModalFornecedores(true);
    }
  };

  const handleSelecionarFornecedor = (fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    setModalFornecedores(false);
  };

  const handleLimparFornecedor = () => {
    setFornecedorSelecionado(null);
    setBuscaFornecedor('');
  };

  const handleBuscarProdutos = async () => {
    if (buscaProduto.trim().length < 3) return;
    try {
      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');
      const resp = await api.get('/relatorios/produtos', {
        params: { q: buscaProduto.trim() },
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        }
      });
      setProdutos(resp.data || []);
      setModalProdutos(true);
    } catch (err) {
      setProdutos([]);
      setModalProdutos(true);
    }
  };

  const handleSelecionarProduto = (produto) => {
    setProdutoSelecionado(produto);
    setModalProdutos(false);
  };

  const handleLimparProduto = () => {
    setProdutoSelecionado(null);
    setBuscaProduto('');
  };

  const handleBuscar = async () => {
    setErro(null);
    setLoading(true);
    try {
      const params = {
        data_inicial: dataInicial,
        data_final: dataFinal
      };
      if (fornecedorSelecionado) params.fornecedor = fornecedorSelecionado.cli_codigo;
      if (produtoSelecionado) {
        console.log('Produto selecionado:', produtoSelecionado); // Log para debug
        params.produto = String(produtoSelecionado.pro_codigo).trim(); // Garante que seja string e sem espaços
      }
      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');
      const resp = await api.get('/relatorios/listar-compras', {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        }
      });
      setResultados(resp.data || []);
      if (!resp.data || resp.data.length === 0) {
        setErro('Nenhum resultado encontrado para o período selecionado.');
      }
    } catch (err) {
      setErro('Erro ao buscar dados. Tente novamente.');
      setResultados([]);
    }
    setLoading(false);
  };

  return (
    <div className={`p-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <h2 className="text-2xl font-bold mb-4">Listar Compras</h2>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div>
          <label className="block text-sm mb-1">Data Inicial</label>
          <input 
            type="date" 
            value={dataInicial} 
            onChange={e => setDataInicial(e.target.value)} 
            className={`rounded px-2 py-1 border w-full ${
              darkMode 
                ? 'bg-gray-800 text-white border-gray-600' 
                : 'bg-white text-gray-900 border-gray-300'
            }`} 
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Data Final</label>
          <input 
            type="date" 
            value={dataFinal} 
            onChange={e => setDataFinal(e.target.value)} 
            className={`rounded px-2 py-1 border w-full ${
              darkMode 
                ? 'bg-gray-800 text-white border-gray-600' 
                : 'bg-white text-gray-900 border-gray-300'
            }`} 
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Fornecedor (nome ou código)</label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={buscaFornecedor}
              onChange={e => setBuscaFornecedor(e.target.value)}
              placeholder="Buscar fornecedor"
              className={`rounded px-2 py-1 border w-full ${
                darkMode
                  ? 'bg-gray-800 text-white border-gray-600'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
              disabled={false}
            />
            <button
              type="button"
              onClick={handleBuscarFornecedores}
              className={`px-3 py-1 rounded font-bold ${darkMode ? 'bg-blue-700 text-white hover:bg-blue-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
              disabled={buscaFornecedor.trim().length < 3}
            >
              Filtrar Fornecedor
            </button>
            {(buscaFornecedor || fornecedorSelecionado) && (
              <button type="button" onClick={handleLimparFornecedor} className="ml-2 px-2 py-1 rounded bg-red-500 text-white">X</button>
            )}
          </div>
          {fornecedorSelecionado && (
            <div className={`mt-1 text-xs ${darkMode ? 'text-green-300' : 'text-green-700'}`}>Fornecedor selecionado: <b>{fornecedorSelecionado.cli_nome} ({fornecedorSelecionado.cli_codigo})</b></div>
          )}
        </div>
        <div>
          <label className="block text-sm mb-1">Produto (nome, código ou marca)</label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={buscaProduto}
              onChange={e => setBuscaProduto(e.target.value)}
              placeholder="Buscar produto (ex: ABRACADEIRA%METAL)"
              className={`rounded px-2 py-1 border w-full ${
                darkMode
                  ? 'bg-gray-800 text-white border-gray-600'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
              disabled={false}
            />
            <button
              type="button"
              onClick={handleBuscarProdutos}
              className={`px-3 py-1 rounded font-bold ${darkMode ? 'bg-blue-700 text-white hover:bg-blue-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
              disabled={buscaProduto.trim().length < 3}
            >
              Filtrar Produto
            </button>
            {(buscaProduto || produtoSelecionado) && (
              <button type="button" onClick={handleLimparProduto} className="ml-2 px-2 py-1 rounded bg-red-500 text-white">X</button>
            )}
          </div>
          {produtoSelecionado && (
            <div className={`mt-1 text-xs ${darkMode ? 'text-green-300' : 'text-green-700'}`}>Produto selecionado: <b>{produtoSelecionado.pro_descricao} ({produtoSelecionado.pro_codigo})</b></div>
          )}
        </div>
        <div className="flex items-end gap-2">
          <button 
            onClick={handleBuscar} 
            className={`px-4 py-2 rounded font-bold ${
              darkMode 
                ? 'bg-blue-700 text-white hover:bg-blue-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            disabled={loading}
          >
            {loading ? 'Buscando...' : 'Filtrar'}
          </button>
          {resultados.length > 0 && (
            <div className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'} whitespace-nowrap`}>
              Total de Itens: <span className="font-bold">{resultados.length}</span>
            </div>
          )}
        </div>
      </div>
      {erro && (
        <div className="text-red-500 mb-4 p-2 bg-red-100 dark:bg-red-900 rounded">
          {erro}
        </div>
      )}
      {/* Tabela para desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className={darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}>
              {campos.map(c => (
                <th key={c.key} className="px-2 py-1">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={campos.length} className="text-center py-4">
                  Carregando...
                </td>
              </tr>
            ) : resultados.length === 0 ? (
              <tr>
                <td colSpan={campos.length} className="text-center py-4 text-gray-400">
                  Nenhum resultado encontrado.
                </td>
              </tr>
            ) : (
              resultados.map((item, idx) => (
                <tr 
                  key={idx} 
                  className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}
                >
                  {campos.map(c => (
                    <td key={c.key} className="px-2 py-1 text-right">{item[c.key]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Cards para mobile */}
      <div className="block md:hidden">
        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : resultados.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Nenhum resultado encontrado.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {resultados.map((item, idx) => (
              <div key={idx} className={`rounded-lg shadow p-3 w-full max-w-full ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}`}
                   style={{borderLeft: '4px solid #2563eb'}}>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold">{item.dataEntrada}</span>
                    <span className="font-mono text-xs">NF: {item.numeroNf}</span>
                  </div>
                  <div className="font-semibold text-sm break-words whitespace-pre-line" style={{lineHeight:'1.2'}}>
                    {item.descricaoProduto}
                  </div>
                  {!isVendedor && (
                    <div className="text-xs mb-1">Fornecedor: <span className="font-medium">{item.nomeFornecedor}</span></div>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {!isVendedor && <span>Qtd: <b>{item.quantidade}</b></span>}
                    {!isVendedor && <span>Compra: <b>{item.compra?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></span>}
                    {!isVendedor && <span>Custo: <b>{item.custo?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></span>}
                    <span>Preço1: <b>{item.precoVenda?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></span>
                    <span>Est. Atual: <b>{item.estoqueAtual}</b></span>
                    {!isVendedor && <span>Total: <b>{(item.compra * item.quantidade)?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Modal de fornecedores */}
      {modalFornecedores && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className={`bg-white ${darkMode ? 'dark:bg-gray-900 text-white' : 'text-gray-900'} rounded-2xl shadow-2xl max-w-lg w-full p-4 relative`}>
            <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl z-10" onClick={() => setModalFornecedores(false)}>&times;</button>
            <h2 className="text-lg font-bold mb-4">Selecione o Fornecedor</h2>
            {fornecedores.length === 0 ? (
              <div className="text-center text-gray-500">Nenhum fornecedor encontrado.</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
                {fornecedores.map(f => (
                  <li key={f.cli_codigo} className="py-2 px-2 hover:bg-blue-100 dark:hover:bg-blue-800 cursor-pointer" onClick={() => handleSelecionarFornecedor(f)}>
                    <b>{f.cli_nome}</b> <span className="text-xs">({f.cli_codigo})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {/* Modal de produtos */}
      {modalProdutos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className={`bg-white ${darkMode ? 'dark:bg-gray-900 text-white' : 'text-gray-900'} rounded-2xl shadow-2xl max-w-lg w-full p-4 relative`}>
            <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl z-10" onClick={() => setModalProdutos(false)}>&times;</button>
            <h2 className="text-lg font-bold mb-4">Selecione o Produto</h2>
            {produtos.length === 0 ? (
              <div className="text-center text-gray-500">Nenhum produto encontrado.</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
                {produtos.map(p => (
                  <li key={p.pro_codigo} className="py-2 px-2 hover:bg-blue-100 dark:hover:bg-blue-800 cursor-pointer" onClick={() => handleSelecionarProduto(p)}>
                    <b>{p.pro_descricao}</b> <span className="text-xs">({p.pro_codigo})</span> <span className="text-xs italic">{p.PRO_MARCA}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 