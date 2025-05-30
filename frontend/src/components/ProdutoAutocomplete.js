import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiLoader, FiCheck } from 'react-icons/fi';
import api from '../services/api';

const ProdutoAutocomplete = ({ onSelect, onAdd, darkMode, value, onChange, produtosNoOrcamento = [] }) => {
  console.log('ProdutoAutocomplete renderizado, props:', { onSelect: !!onSelect, onAdd: !!onAdd, darkMode, produtosNoOrcamento: produtosNoOrcamento.length });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  console.log('Estado atual:', { searchTerm, suggestions: suggestions.length, isLoading, showSuggestions });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    console.log('Input mudou para:', value);
    setSearchTerm(value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    console.log('Campo focado, termo atual:', searchTerm);
    // Se já há um termo de pesquisa e sugestões, mostrar as sugestões
    if (searchTerm.length >= 2 && suggestions.length > 0) {
      console.log('Mostrando sugestões existentes');
      setShowSuggestions(true);
    }
  };

  useEffect(() => {
    console.log('useEffect disparado, searchTerm:', searchTerm);
    const searchProdutos = async () => {
      if (searchTerm.length < 2) {
        console.log('Termo muito curto, limpando sugestões');
        setSuggestions([]);
        return;
      }

      console.log('Iniciando busca para:', searchTerm);
      setIsLoading(true);
      try {
        const response = await api.get(`/relatorios/produtos?q=${searchTerm}`);
        console.log('Produtos encontrados:', response.data);
        console.log('Quantidade de produtos:', response.data.length);
        setSuggestions(response.data);
        setShowSuggestions(true);
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

  // Função para verificar se um produto já está no orçamento
  const isProdutoJaAdicionado = (produto) => {
    return produtosNoOrcamento.some(p => 
      p.codigo === produto.pro_codigo || 
      p.pro_codigo === produto.pro_codigo ||
      (p.codigo && p.codigo === produto.pro_codigo)
    );
  };

  const handleProdutoClick = (produto) => {
    console.log('=== INÍCIO DO CLIQUE ===');
    console.log('Produto clicado:', produto);
    console.log('Tipo da função onSelect:', typeof onSelect);
    console.log('Tipo da função onAdd:', typeof onAdd);
    console.log('onSelect existe?', !!onSelect);
    console.log('onAdd existe?', !!onAdd);
    
    if (!produto || !produto.pro_codigo) {
      console.error('Produto inválido selecionado');
      return;
    }

    // Verificar se o produto já está no orçamento
    const jaAdicionado = isProdutoJaAdicionado(produto);
    console.log('Produto já adicionado?', jaAdicionado);

    // Apenas fechar as sugestões, manter o termo de busca e sugestões na memória
    console.log('Fechando sugestões, mantendo dados na memória...');
    setShowSuggestions(false);

    // Chamar o callback apropriado
    if (typeof onSelect === 'function') {
      console.log('Chamando onSelect com produto:', produto);
      try {
        onSelect(produto);
        console.log('onSelect executado com sucesso');
      } catch (error) {
        console.error('Erro ao executar onSelect:', error);
      }
    } else if (typeof onAdd === 'function') {
      console.log('Chamando onAdd com produto:', produto);
      try {
        // Se o produto já foi adicionado, chamar com opção de navegação
        if (jaAdicionado) {
          console.log('Produto já existe, chamando com scrollToExisting');
          onAdd(produto, { scrollToExisting: true });
        } else {
          console.log('Produto novo, adicionando normalmente');
          onAdd(produto);
        }
        console.log('onAdd executado com sucesso');
      } catch (error) {
        console.error('Erro ao executar onAdd:', error);
      }
    } else {
      console.error('Nem onSelect nem onAdd são funções válidas');
    }
    console.log('=== FIM DO CLIQUE ===');
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
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

      {console.log('Verificando se deve mostrar sugestões:', { showSuggestions, suggestionsLength: suggestions.length })}
      
      {showSuggestions && suggestions.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 rounded-md shadow-lg ${darkMode ? "bg-gray-800" : "bg-white"} border ${darkMode ? "border-gray-600" : "border-gray-200"}`}>
          {console.log('Renderizando lista de sugestões com', suggestions.length, 'produtos')}
          <ul className={`max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}>
            {suggestions.map((produto) => {
              console.log('Renderizando produto:', produto.pro_codigo, produto.pro_descricao);
              const jaAdicionado = isProdutoJaAdicionado(produto);
              console.log(`Produto ${produto.pro_codigo} já adicionado:`, jaAdicionado);
              
              return (
                <li
                  key={produto.pro_codigo}
                  className={`cursor-pointer select-none relative py-3 px-4 ${
                    jaAdicionado 
                      ? (darkMode ? "bg-green-900 hover:bg-green-800 text-green-100" : "bg-green-50 hover:bg-green-100 text-green-900")
                      : (darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-100 text-gray-900")
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    console.log('MouseDown detectado:', produto);
                    handleProdutoClick(produto);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Click detectado:', produto);
                    handleProdutoClick(produto);
                  }}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-base">{produto.pro_descricao}</span>
                      {jaAdicionado && (
                        <div className="flex items-center gap-1">
                          <FiCheck className="w-4 h-4 text-green-500" />
                          <span className="text-xs font-medium text-green-600">Adicionado</span>
                        </div>
                      )}
                    </div>
                    <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Código: {produto.pro_codigo} - Preço: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.pro_venda)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('BOTÃO CLICADO - Produto:', produto);
                        handleProdutoClick(produto);
                      }}
                      className={`mt-2 px-2 py-1 rounded text-xs ${
                        jaAdicionado
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                    >
                      {jaAdicionado ? "Ir para produto" : "Adicionar"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && searchTerm.length >= 2 && !isLoading && (
        <div className={`absolute z-50 w-full mt-1 rounded-md shadow-lg ${darkMode ? "bg-gray-800" : "bg-white"} border ${darkMode ? "border-gray-600" : "border-gray-200"} p-2`}>
          <span className={darkMode ? "text-gray-300" : "text-gray-600"}>Nenhum produto encontrado</span>
        </div>
      )}
    </div>
  );
};

export default ProdutoAutocomplete;
