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
        const empresaSelecionada = localStorage.getItem('empresa') || localStorage.getItem('empresa_atual') || localStorage.getItem('empresa_selecionada') || localStorage.getItem('empresaSelecionadaCodigo');
        let empresaCodigo = null;
        if (empresaCodigo) {
          try {
            const empObj = JSON.parse(empresaCodigo);
            empresaCodigo = empObj?.cli_codigo || empObj?.codigo;
          } catch {
            empresaCodigo = empresaSelecionada;
          }
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
        if (empresaCodigo) headers['x-empresa-codigo'] = empresaCodigo;

        console.log('Buscando produtos com termo:', val);
        console.log('Headers da requisição:', headers);

        const response = await api.get(`/relatorios/produtos?q=${encodeURIComponent(val)}`, { headers });
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
        <div className="absolute left-1/2 -translate-x-1/2 w-[98vw] max-w-[520px] mt-1 bg-gray-100 border border-blue-200 rounded-2xl shadow-2xl max-h-[70vh] overflow-auto flex flex-col gap-4 p-3 z-50" style={{ minWidth: 280 }}>
          {produtos.map((p, idx) => (
            <div
              key={p.pro_codigo || p.codigo || idx}
              className={`flex items-center gap-4 p-4 rounded-2xl shadow-lg border-2 mb-1 transition-all duration-200 bg-white
                ${produtosNoOrcamento.some(prod => (prod.codigo === (p.pro_codigo || p.codigo)) || (prod.pro_codigo === (p.pro_codigo || p.codigo)))
                  ? 'border-yellow-400 ring-2 ring-yellow-300 opacity-80' 
                  : 'border-blue-200 hover:border-blue-400 hover:ring-2 hover:ring-blue-200'}
              `}
              style={{ minHeight: 110 }}
              onClick={(e) => {
                const produtoExistente = produtosNoOrcamento.find(prod => (prod.codigo === (p.pro_codigo || p.codigo)) || (prod.pro_codigo === (p.pro_codigo || p.codigo)));
                if (produtoExistente && onAdd) {
                  e.preventDefault();
                  e.stopPropagation();
                  onAdd(p, { scrollToExisting: true });
                }
              }}
            >
              <img
                src={p.pro_imagem || '/img/produto-vazio.png'}
                alt="img"
                className="w-20 h-20 object-contain rounded-xl bg-gray-200 border border-gray-300 shadow-sm flex-shrink-0"
                style={{ minWidth: 80, minHeight: 80 }}
              />
              <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                <span className="font-bold text-gray-900 text-lg leading-tight block mb-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'normal' }}>
                  {p.pro_descricao}
                </span>
                <span className="text-blue-700 font-bold text-base block mb-1">
                  {Number(p.pro_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-1">
                  <span>Cód: {p.pro_codigo}</span>
                  {p.pro_marca && <span>Marca: {p.pro_marca}</span>}
                  {p.UNI_CODIGO && <span>Unid: {p.UNI_CODIGO}</span>}
                  {p.pro_quantidade !== undefined && (
                    <span className={p.pro_quantidade <= 0 ? 'text-red-500 font-bold' : 'text-green-700 font-bold'}>
                      Estoque: {p.pro_quantidade ?? '0'}
                    </span>
                  )}
                </div>
              </div>
              {!produtosNoOrcamento.some(prod => (prod.codigo === (p.pro_codigo || p.codigo)) || (prod.pro_codigo === (p.pro_codigo || p.codigo))) && (
                <button
                  className="ml-2 px-5 py-4 bg-blue-600 hover:bg-blue-800 text-white rounded-xl shadow text-lg font-bold whitespace-nowrap transition-all duration-200 h-full flex items-center"
                  style={{ minWidth: 90 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd && onAdd(p);
                  }}
                >
                  Adicionar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProdutoAutocomplete;
