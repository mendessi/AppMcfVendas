import React, { useState, useEffect } from 'react';
import api from '../services/api';

function getHoje() {
  const hoje = new Date();
  return hoje.toISOString().slice(0, 10);
}

const EntradasProdutos = ({ darkMode }) => {
  const [dataInicial, setDataInicial] = useState(getHoje());
  const [dataFinal, setDataFinal] = useState(getHoje());
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [resultados, setResultados] = useState([]);

  // Simula perfil do usuário (admin ou vendedor)
  const user = JSON.parse(localStorage.getItem('user')) || { nivel: 'ADMIN' };
  const isVendedor = user.nivel && user.nivel.toUpperCase() === 'VENDEDOR';

  useEffect(() => {
    // Buscar automaticamente ao carregar a tela
    handleBuscar();
    // eslint-disable-next-line
  }, []);

  const handleBuscar = async () => {
    setErro(null);
    setLoading(true);
    try {
      const params = {
        dataInicial,
        dataFinal
      };
      const token = localStorage.getItem('token');
      const empresaCodigo = localStorage.getItem('empresa_atual');
      const resp = await api.get('/relatorios/entradas-produtos', {
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
      <h2 className="text-2xl font-bold mb-4">Entradas de Produtos</h2>
      
      {/* Filtros */}
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
        <div className="flex items-end">
          <button 
            onClick={handleBuscar} 
            className={`px-4 py-2 rounded font-bold ${
              darkMode 
                ? 'bg-blue-700 text-white hover:bg-blue-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            disabled={loading}
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div className="text-red-500 mb-4 p-2 bg-red-100 dark:bg-red-900 rounded">
          {erro}
        </div>
      )}

      {/* Tabela de resultados */}
      <div className="overflow-x-auto rounded shadow border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 mt-2">
        <table className="min-w-full text-sm">
          <thead>
            <tr className={darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}>
              <th className="px-2 py-1">Data Entrada</th>
              <th className="px-2 py-1">NF</th>
              <th className="px-2 py-1">Produto</th>
              <th className="px-2 py-1">Fornecedor</th>
              <th className="px-2 py-1">Qtd</th>
              {!isVendedor && <th className="px-2 py-1">Custo</th>}
              {!isVendedor && <th className="px-2 py-1">Total</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isVendedor ? 5 : 7} className="text-center py-4">
                  Carregando...
                </td>
              </tr>
            ) : resultados.length === 0 ? (
              <tr>
                <td colSpan={isVendedor ? 5 : 7} className="text-center py-4 text-gray-400">
                  Nenhum resultado encontrado.
                </td>
              </tr>
            ) : (
              resultados.map((item, idx) => (
                <tr 
                  key={idx} 
                  className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}
                >
                  <td className="px-2 py-1">{item.dataEntrada}</td>
                  <td className="px-2 py-1">{item.numeroNf}</td>
                  <td className="px-2 py-1">{item.produto}</td>
                  <td className="px-2 py-1">{item.fornecedor}</td>
                  <td className="px-2 py-1 text-right">{item.qtd}</td>
                  {!isVendedor && (
                    <td className="px-2 py-1 text-right">
                      {item.custo?.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </td>
                  )}
                  {!isVendedor && (
                    <td className="px-2 py-1 text-right">
                      {item.total?.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EntradasProdutos; 