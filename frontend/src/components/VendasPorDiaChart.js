import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { API_URL } from '../config';

const VendasPorDiaChart = ({ empresaSelecionada, dataInicial, dataFinal, darkMode, dadosEmCache, vendasPorDia }) => {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  // Função para extrair apenas o dia da data
  const formatarDia = (dataCompleta) => {
    try {
      const data = new Date(dataCompleta);
      return data.getDate().toString().padStart(2, '0'); // Retorna "06", "15", etc.
    } catch (error) {
      return dataCompleta; // Retorna a data original se houver erro
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErro(null);
      try {
        // Se temos dados em cache, usamos eles
        if (dadosEmCache && Array.isArray(vendasPorDia) && vendasPorDia.length > 0) {
          console.log('Usando dados do cache para o gráfico:', vendasPorDia);
          const dadosProcessados = vendasPorDia.map(item => ({
            ...item,
            dataCompleta: item.data,
            data: formatarDia(item.data)
          }));
          setDados(dadosProcessados);
          setLoading(false);
          return;
        }

        // Se não temos cache, buscamos da API
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
        if (empresaSelecionada && empresaSelecionada.codigo) {
          headers['x-empresa-codigo'] = empresaSelecionada.codigo.toString();
        }
        const params = {
          data_inicial: dataInicial,
          data_final: dataFinal,
        };
        const response = await axios.get(`${API_URL}/relatorios/vendas-por-dia`, {
          headers,
          params,
        });
        
        // Processar os dados para incluir formatação do dia
        const dadosProcessados = response.data.map(item => ({
          ...item,
          dataCompleta: item.data,
          data: formatarDia(item.data)
        }));
        
        setDados(dadosProcessados);
      } catch (err) {
        setErro('Erro ao buscar dados do gráfico de vendas diárias.');
      } finally {
        setLoading(false);
      }
    };
    if (dataInicial && dataFinal) {
      fetchData();
    }
  }, [empresaSelecionada, dataInicial, dataFinal, dadosEmCache, vendasPorDia]);

  // Formatação para tooltip
  const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className={`w-full mb-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4`}>
      <h2 className={`text-lg sm:text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Vendas por Dia</h2>
      {loading ? (
        <div className="text-center text-gray-500">Carregando gráfico...</div>
      ) : erro ? (
        <div className="text-center text-red-500">{erro}</div>
      ) : dados.length === 0 ? (
        <div className="text-center text-gray-500">Nenhuma venda encontrada no período.</div>
      ) : (
        <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={300} minWidth={320}>
            <LineChart
              data={dados}
              margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#eee'} />
              <XAxis dataKey="data" tick={{fontSize: 12, fill: darkMode ? '#fff' : '#222'}} />
              <YAxis tick={{fontSize: 12, fill: darkMode ? '#fff' : '#222'}} tickFormatter={formatCurrency} />
              <Tooltip
                contentStyle={{ background: darkMode ? '#222' : '#fff', borderRadius: 8, fontSize: 14 }}
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0] && payload[0].payload.dataCompleta) {
                    return `Data: ${payload[0].payload.dataCompleta}`;
                  }
                  return `Dia: ${label}`;
                }}
              />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default VendasPorDiaChart;
