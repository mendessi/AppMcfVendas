import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';

function ProdutoAutocomplete({ value, onChange, onAdd, produtosNoOrcamento = [] }) {
  const [input, setInput] = useState(value?.descricao || '');
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (value) {
      setInput(value.descricao || '');
    }
  }, [value]);

  const handleInput = async (e) => {
    const val = e.target.value;
    setInput(val);
    setShowList(true);
    setError(null);

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (val.length < 2) {
      setProdutos([]);
      return;
    }

    // Adicionar debounce de 500ms
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const empresaAtual = JSON.parse(localStorage.getItem('empresa_atual'));
        console.log('Buscando produtos com termo:', val);
        console.log('Headers da requisição:', {
          Authorization: token,
          'x-empresa-codigo': empresaAtual?.cli_codigo
        });

        const response = await api.get(`/relatorios/produtos?q=${encodeURIComponent(val)}`);
        console.log('Resposta da API:', response.data);

        if (!response.data || !Array.isArray(response.data)) {
          console.error('Resposta inválida da API:', response.data);
          setError('Erro ao buscar produtos: resposta inválida');
          setProdutos([]);
          return;
        }

        setProdutos(response.data);
      } catch (err) {
        console.error('Erro ao buscar produtos:', err);
        setError(err.message || 'Erro ao buscar produtos');
        setProdutos([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSelect = (produto) => {
    // NÃO limpar o input para permitir seleção rápida de vários produtos
    setShowList(false);
    onChange(produto);
  };

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Buscar produto..."
        value={input}
        onChange={handleInput}
        onFocus={() => setShowList(true)}
        onBlur={() => setTimeout(() => setShowList(false), 150)}
        autoComplete="off"
      />
      {loading && <div className="absolute right-3 top-3 spinner-border animate-spin w-4 h-4 border-2 border-blue-400 rounded-full"></div>}
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      {showList && produtos.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-96 overflow-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
          {produtos.map((p, idx) => (
            <div
              key={p.pro_codigo || p.codigo || idx}
              className={`flex items-center gap-4 p-2 rounded-lg shadow border mb-1 ${
                produtosNoOrcamento.some(prod =>
                  (prod.codigo === (p.pro_codigo || p.codigo)) ||
                  (prod.pro_codigo === (p.pro_codigo || p.codigo))
                )
                  ? 'bg-yellow-100 border-yellow-500 hover:bg-yellow-200'
                  : 'bg-gray-800 border-gray-700 hover:bg-blue-700 hover:border-blue-500'
              }`}
            >
              <img
                src={p.pro_imagem || '/img/produto-vazio.png'}
                alt="img"
                className="w-16 h-16 object-contain rounded bg-white border border-gray-300 shadow-sm flex-shrink-0"
                style={{ minWidth: 64, minHeight: 64 }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className={`font-bold truncate text-base ${
                    produtosNoOrcamento.some(prod => 
                      (prod.codigo === (p.pro_codigo || p.codigo)) || 
                      (prod.pro_codigo === (p.pro_codigo || p.codigo))
                    ) ? 'text-gray-900' : 'text-gray-100'
                  }`}>
                    {p.pro_descricao}
                    {produtosNoOrcamento.some(prod => 
                      (prod.codigo === (p.pro_codigo || p.codigo)) || 
                      (prod.pro_codigo === (p.pro_codigo || p.codigo))
                    ) && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-500 text-yellow-900 border border-yellow-600">
                        ADICIONADO
                      </span>
                    )}
                  </div>
                </div>
                <div className={`text-xs truncate ${
                  produtosNoOrcamento.some(prod => 
                    (prod.codigo === (p.pro_codigo || p.codigo)) || 
                    (prod.pro_codigo === (p.pro_codigo || p.codigo))
                  ) ? 'text-gray-700' : 'text-gray-400'
                }`}>Cód: {p.pro_codigo}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`font-bold text-lg ${
                    produtosNoOrcamento.some(prod => 
                      (prod.codigo === (p.pro_codigo || p.codigo)) || 
                      (prod.pro_codigo === (p.pro_codigo || p.codigo))
                    ) ? 'text-green-700' : 'text-green-400'
                  }`}>
                    {Number(p.pro_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className={`text-xs ${
                    produtosNoOrcamento.some(prod => 
                      (prod.codigo === (p.pro_codigo || p.codigo)) || 
                      (prod.pro_codigo === (p.pro_codigo || p.codigo))
                    ) ? 'text-gray-600' : 'text-gray-400'
                  }`}>Estoque: {p.pro_quantidade ?? '-'}</span>
                </div>
              </div>
              {!produtosNoOrcamento.some(prod =>
                (prod.codigo === (p.pro_codigo || p.codigo)) ||
                (prod.pro_codigo === (p.pro_codigo || p.codigo))
              ) ? (
                <button
                  className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-800 text-white rounded shadow text-sm whitespace-nowrap"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd && onAdd(p);
                  }}
                  type="button"
                >
                  Adicionar
                </button>
              ) : (
                <span className="ml-2 px-3 py-1 bg-yellow-500 text-yellow-900 font-bold rounded shadow text-sm whitespace-nowrap border border-yellow-600">
                  JÁ ADICIONADO
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProdutoAutocomplete;
