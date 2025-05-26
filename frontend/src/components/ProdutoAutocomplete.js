import React, { useState } from 'react';
import apiService from '../services/api';

function ProdutoAutocomplete({ value, onChange }) {
  const [input, setInput] = useState(value?.descricao || '');
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  const handleInput = async (e) => {
    const val = e.target.value;
    setInput(val);
    setShowList(true);
    if (val.length < 2) {
      setProdutos([]);
      return;
    }
    setLoading(true);
    try {
      // Ajuste a rota conforme seu backend
      const res = await apiService.api.get(`/produtos?search=${encodeURIComponent(val)}`);
      setProdutos(res.data || []);
    } catch (err) {
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (produto) => {
    setInput(produto.descricao || produto.PRO_DESCRICAO || '');
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
        autoComplete="off"
      />
      {loading && <div className="absolute right-3 top-3 spinner-border animate-spin w-4 h-4 border-2 border-blue-400 rounded-full"></div>}
      {showList && produtos.length > 0 && (
        <ul className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-lg mt-1 max-h-52 overflow-y-auto shadow-lg">
          {produtos.map((p) => (
            <li
              key={p.codigo || p.PRO_CODIGO}
              className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer text-gray-200"
              onMouseDown={() => handleSelect(p)}
            >
              {p.codigo || p.PRO_CODIGO} - {p.descricao || p.PRO_DESCRICAO}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProdutoAutocomplete;
