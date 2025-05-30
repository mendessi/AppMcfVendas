import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiLoader } from 'react-icons/fi';
import api from '../services/api';

const ProdutoAutocomplete = ({ onSelect, darkMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const searchProdutos = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.get(`/produtos?search=${searchTerm}`);
        setSuggestions(response.data);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchProdutos, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (produto) => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    onSelect(produto);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder="Digite para buscar produtos..."
          className={`w-full p-2 pl-10 rounded-md ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              : "bg-white border-gray-300 text-gray-700"
          }`}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <FiLoader className={`animate-spin h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
          ) : (
            <FiSearch className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
          )}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className={`absolute z-10 w-full mt-1 rounded-md shadow-lg ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}>
          <ul className={`max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}>
            {suggestions.map((produto) => (
              <li
                key={produto.pro_codigo}
                onClick={() => handleSuggestionClick(produto)}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                  darkMode
                    ? "hover:bg-gray-700 text-white"
                    : "hover:bg-gray-100 text-gray-900"
                }`}
              >
                <div className="flex items-center">
                  <span className="font-medium block truncate">{produto.pro_descricao}</span>
                </div>
                <div className={`ml-3 block truncate ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}>
                  Código: {produto.pro_codigo}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProdutoAutocomplete;
