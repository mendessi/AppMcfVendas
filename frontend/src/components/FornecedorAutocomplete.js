import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiLoader, FiX } from 'react-icons/fi';
import api from '../services/api';

const FornecedorAutocomplete = ({ value, onChange, onSelect, darkMode }) => {
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

  const searchFornecedores = async () => {
    const empresaCodigo = localStorage.getItem('empresa_atual');
    if (searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }
    const searchQuery = searchTerm.substring(0, 14);
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/relatorios/clientes`, {
        params: {
          q: searchQuery,
          empresa: empresaCodigo,
          tipo: 2 // Só fornecedores
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        }
      });
      const fornecedoresMapeados = response.data.map(fornecedor => ({
        codigo: fornecedor.cli_codigo || fornecedor.codigo,
        nome: fornecedor.cli_nome || fornecedor.nome,
        documento: fornecedor.cnpj || fornecedor.CNPJ || fornecedor.cli_cgc || fornecedor.cli_cpf || fornecedor.documento || '',
        tipo: fornecedor.cli_tipo || fornecedor.tipo || 'F',
        cidade: fornecedor.cidade || fornecedor.Cidade || '',
        uf: fornecedor.uf || fornecedor.Uf || '',
        bairro: fornecedor.bairro || fornecedor.Bairro || ''
      }));
      setSuggestions(fornecedoresMapeados);
    } catch (error) {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof value === 'string') {
      setSearchTerm(value);
    } else if (value && typeof value === 'object') {
      setSearchTerm(value.nome || '');
    } else {
      setSearchTerm('');
    }
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value.toUpperCase();
    setSearchTerm(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleSuggestionClick = (fornecedor) => {
    setSearchTerm(fornecedor.nome || '');
    setSuggestions([]);
    setShowSuggestions(false);
    if (onSelect) {
      onSelect({
        codigo: fornecedor.codigo,
        nome: fornecedor.nome,
        documento: fornecedor.documento,
        tipo: fornecedor.tipo,
        cidade: fornecedor.cidade,
        uf: fornecedor.uf,
        bairro: fornecedor.bairro
      });
    }
  };

  const handleSearchClick = async () => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    await searchFornecedores();
    setShowSuggestions(true);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (onChange) {
      onChange('');
    }
    if (onSelect) {
      onSelect(null);
    }
    const input = wrapperRef.current?.querySelector('input');
    if (input) {
      setTimeout(() => input.focus(), 100);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
        </div>
        <input
          type="text"
          value={searchTerm.toUpperCase()}
          onChange={handleInputChange}
          placeholder="Buscar fornecedor..."
          className={`pl-10 pr-24 w-full rounded-md ${
            darkMode
              ? "bg-gray-600 border-gray-500 text-white"
              : "bg-white border-gray-300 text-gray-700"
          }`}
        />
        <button
          type="button"
          onClick={handleSearchClick}
          disabled={isLoading || searchTerm.length < 2}
          className={`absolute inset-y-0 right-0 pr-3 flex items-center justify-center w-20 rounded-r-md transition-colors ${darkMode 
            ? isLoading || searchTerm.length < 2 ? 'bg-gray-500 text-gray-400' : 'bg-blue-600 hover:bg-blue-500 text-white' 
            : isLoading || searchTerm.length < 2 ? 'bg-gray-300 text-gray-400' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          title="Buscar fornecedor"
        >
          {isLoading ? (
            <FiLoader className="animate-spin h-5 w-5" />
          ) : (
            <FiSearch className="h-5 w-5" />
          )}
        </button>
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute inset-y-0 right-20 pr-3 flex items-center cursor-pointer hover:${darkMode ? 'text-gray-200' : 'text-gray-700'} transition-colors`}
            title="Limpar fornecedor"
          >
            <FiX className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
          </button>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className={`absolute z-10 w-full mt-1 rounded-md shadow-lg ${darkMode ? "bg-gray-700" : "bg-white"} max-h-60 overflow-auto`}>
          {suggestions.map((fornecedor) => (
            <div
              key={fornecedor.codigo}
              className={`p-2 cursor-pointer ${darkMode ? "hover:bg-gray-600 border-b border-gray-600" : "hover:bg-gray-100 border-b border-gray-200"}`}
              onClick={() => handleSuggestionClick(fornecedor)}
            >
              <div className="font-medium">{fornecedor.nome}</div>
              <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{fornecedor.documento} {fornecedor.cidade ? `- ${fornecedor.cidade}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FornecedorAutocomplete; 