import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import api from '../services/api';

const ProdutoAutocomplete = ({ onSelect, darkMode, produtosNoOrcamento = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (searchTerm.length >= 3) {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      searchTimeout.current = setTimeout(() => {
        buscarProdutos();
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm]);

  const buscarProdutos = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const empresa = localStorage.getItem('empresa_atual');

      const response = await api.get(`/produtos/buscar?termo=${searchTerm}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-empresa-codigo': empresa
        }
      });

      // Filtrar produtos que já estão no orçamento
      const produtosFiltrados = response.data.filter(
        produto => !produtosNoOrcamento.some(p => p.codigo === produto.codigo)
      );

      setSuggestions(produtosFiltrados);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setError('Erro ao buscar produtos. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (produto) => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    onSelect(produto);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder="Buscar produto..."
          className={`pl-10 w-full rounded-md ${
            darkMode
              ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <FiX className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        )}
      </div>

      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div
          className={`absolute z-10 w-full mt-1 rounded-md shadow-lg ${
            darkMode ? 'bg-gray-700' : 'bg-white'
          }`}
        >
          <ul className="max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
            {isLoading ? (
              <li className={`px-4 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                Carregando...
              </li>
            ) : (
              suggestions.map((produto) => (
                <li
                  key={produto.codigo}
                  onClick={() => handleSelect(produto)}
                  className={`cursor-pointer px-4 py-2 hover:${
                    darkMode ? 'bg-gray-600' : 'bg-gray-100'
                  }`}
                >
                  <div className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className="font-medium">{produto.descricao}</div>
                    <div className="text-sm">
                      Código: {produto.codigo} | Preço: R${' '}
                      {Number(produto.valor_unitario).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {error && (
        <div className={`mt-1 text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ProdutoAutocomplete;
