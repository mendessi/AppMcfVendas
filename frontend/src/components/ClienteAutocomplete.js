import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiLoader, FiX } from 'react-icons/fi';
import api from '../services/api';

const ClienteAutocomplete = ({ value, onChange, onSelect, darkMode }) => {
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

    const searchClientes = async () => {
      const empresaCodigo = localStorage.getItem('empresa_atual');
      const empresaDetalhes = localStorage.getItem('empresa_detalhes');
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }

      // Limitar o termo de busca a 14 caracteres para evitar erro no Firebird
      const searchQuery = searchTerm.substring(0, 14);

      setIsLoading(true);
      try {
        console.log('API Call Details:', {
          baseURL: api.defaults.baseURL,
          endpoint: '/relatorios/clientes',
          params: {
            q: searchQuery,
            empresa: empresaCodigo
          }
        });
        const token = localStorage.getItem('token');

        if (!empresaCodigo || !empresaDetalhes) {
          console.error('Dados da empresa não encontrados');
          return;
        }

        const response = await api.get(`/relatorios/clientes`, {
          params: {
            q: searchQuery,
            empresa: empresaCodigo
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-empresa-codigo': empresaCodigo
          }
        });

        console.log('Dados retornados da API:', response.data);

        // Mapear os dados retornados para o formato esperado
        const clientesMapeados = response.data.map(cliente => ({
          codigo: cliente.cli_codigo || cliente.codigo,
          nome: cliente.cli_nome || cliente.nome,
          documento: cliente.cnpj || cliente.CNPJ || cliente.cli_cgc || cliente.cli_cpf || cliente.documento || '', // Tenta cnpj minúsculo primeiro
          tipo: cliente.cli_tipo || cliente.tipo || 'F',
          cidade: cliente.cidade || cliente.Cidade || '',
          uf: cliente.uf || cliente.Uf || '',
          bairro: cliente.bairro || cliente.Bairro || ''
        }));

        console.log('Dados mapeados:', clientesMapeados);
        setSuggestions(clientesMapeados);
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        if (error.response) {
          console.error('Detalhes do erro:', error.response.data);
          // Se for erro de tamanho do parâmetro, mostrar mensagem amigável
          if (error.response.data?.detail?.includes('too long')) {
            console.warn('Busca limitada aos primeiros 14 caracteres devido a restrição do banco de dados');
          }
        }
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

  // Removido useEffect para busca automática. A busca agora é manual.
  // A função searchClientes será chamada por handleSearchClick.

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
    // setShowSuggestions(true); // Sugestões aparecerão após busca explícita
  };

  const handleSuggestionClick = (cliente) => {
    setSearchTerm(cliente.nome || '');
    setSuggestions([]);
    setShowSuggestions(false);
    if (onSelect) {
      onSelect({
        codigo: cliente.codigo,
        nome: cliente.nome,
        documento: cliente.documento,
        tipo: cliente.tipo,
        cidade: cliente.cidade,
        uf: cliente.uf,
        bairro: cliente.bairro
      });
    }
  };

  const handleSearchClick = async () => {
    if (searchTerm.length < 2) {
      // Poderia mostrar um toast/aviso aqui se desejado
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    await searchClientes();
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
    // Foca no input após limpar
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
          placeholder="Buscar cliente..."
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
          title="Buscar cliente"
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
            title="Limpar cliente"
          >
            <FiX className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
          </button>
        )}
      </div>

      {showSuggestions && (searchTerm.length >= 2) && (
        <div className={`absolute z-10 w-full mt-1 rounded-md shadow-lg ${
          darkMode ? "bg-gray-700" : "bg-white"
        }`}>
          <div className="max-h-60 overflow-auto">
            {isLoading ? (
              <div className={`p-4 text-center ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                <FiLoader className="animate-spin h-5 w-5 mx-auto" />
                <span className="ml-2">Carregando...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <ul className="py-1">
                {suggestions.map((cliente) => (
                  <li
                    key={cliente.codigo}
                    onClick={() => handleSuggestionClick(cliente)}
                    className={`px-4 py-2 cursor-pointer hover:${
                      darkMode ? "bg-gray-600" : "bg-gray-100"
                    } ${darkMode ? "text-white" : "text-gray-700"}`}
                  >
                    <div className="font-medium">{(cliente.nome || '').toUpperCase()}</div>
                    <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      CÓDIGO: {(cliente.codigo || '').toString().toUpperCase()} | CNPJ: {(cliente.documento || '').toUpperCase()}
                    </div>
                    <div className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                      {cliente.bairro ? `${cliente.bairro.toUpperCase()} - ` : ''}{(cliente.cidade || '').toUpperCase()}/{(cliente.uf || '').toUpperCase()}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={`p-4 text-center ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                Nenhum cliente encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClienteAutocomplete;
