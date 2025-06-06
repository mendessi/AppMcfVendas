import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiLoader, FiCheck } from 'react-icons/fi';
import api from '../services/api';

const ProdutoAutocomplete = ({ onSelect, onAdd, darkMode, value, onChange, produtosNoOrcamento = [] }) => {
  console.log('ProdutoAutocomplete renderizado, props:', { onSelect: !!onSelect, onAdd: !!onAdd, darkMode, produtosNoOrcamento: produtosNoOrcamento.length });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const wrapperRef = useRef(null);
  // Novos estados para guardar a última busca bem-sucedida
  const [lastSuccessfulSearchTerm, setLastSuccessfulSearchTerm] = useState('');
  const [lastSuccessfulSuggestions, setLastSuccessfulSuggestions] = useState([]);

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
    const newValue = e.target.value.toUpperCase();
    console.log('Input mudou para:', newValue);
    setSearchTerm(newValue);

    if (newValue.length > 0 && newValue.length < 4) {
      setShowWarning(true);
      setShowSuggestions(false); // Esconder sugestões se o termo for muito curto
    } else {
      setShowWarning(false);
      // Se o texto digitado for exatamente o da última busca bem-sucedida, mostrar seus resultados
      if (newValue === lastSuccessfulSearchTerm && lastSuccessfulSuggestions.length > 0) {
        setSuggestions(lastSuccessfulSuggestions); // Garante que 'suggestions' está correto
        setShowSuggestions(true);
      } else {
        // Caso contrário (texto diferente ou sem busca bem-sucedida anterior com esse texto), esconder sugestões
        setShowSuggestions(false);
      }
    }
  };

  const handleInputFocus = () => {
    console.log('Campo focado. Última busca bem-sucedida guardada:', lastSuccessfulSearchTerm);
    if (lastSuccessfulSearchTerm && lastSuccessfulSuggestions.length > 0) {
      console.log('Restaurando última busca bem-sucedida no foco:', lastSuccessfulSearchTerm);
      setSearchTerm(lastSuccessfulSearchTerm);       // Preenche o input com o último termo buscado
      setSuggestions(lastSuccessfulSuggestions);   // Define as sugestões para as da última busca
      setShowSuggestions(true);                    // Mostra essas sugestões
      setShowWarning(false);
    } else if (searchTerm.length > 0 && searchTerm.length < 4) { // Se não há última busca, verifica o termo atual
      setShowSuggestions(false);
      setShowWarning(true);
    } else {
      setShowSuggestions(false); // Nenhum termo válido ou última busca para mostrar
      setShowWarning(false);
    }
  };

  // useEffect foi removido para implementar a busca manual com botão
  // A função searchProdutos será chamada pelo botão

  const searchProdutos = async () => {
    if (searchTerm.length < 4) {
      console.log('Termo muito curto para busca.');
      setSuggestions([]);
      setShowSuggestions(false); // Garante que sugestões antigas sejam limpas
      setShowWarning(true); // Mostra o aviso de termo curto
      return;
    }
    setShowWarning(false); // Limpa o aviso se a busca prosseguir
    console.log('Iniciando busca para:', searchTerm);
    setIsLoading(true);
    setShowSuggestions(false); // Ocultar sugestões antigas antes de nova busca
    try {
      const response = await api.get(`/relatorios/produtos?q=${searchTerm}`);
      const newSuggestions = response.data || [];
      console.log('Produtos encontrados:', newSuggestions);
      console.log('Quantidade de produtos:', newSuggestions.length);
      setSuggestions(newSuggestions);

      if (newSuggestions.length > 0) {
        setLastSuccessfulSearchTerm(searchTerm); // Guarda o termo da busca bem-sucedida
        setLastSuccessfulSuggestions(newSuggestions); // Guarda os resultados
      }
      // Se a busca não retornar resultados, não limpamos a 'última busca bem-sucedida' anterior.
      // Assim, se o usuário buscar algo sem resultado e focar de novo, verá a última *com* resultado.

      setShowSuggestions(true); // Mostrar novas sugestões (ou painel vazio se não houver)
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchButtonClick = () => {
    console.log('Botão de busca clicado');
    searchProdutos();
  };

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
      <div className="flex items-stretch space-x-0">
        <div className="relative flex-grow">
          <input
            type="text"
            value={searchTerm.toUpperCase()}
            onChange={handleInputChange}
            placeholder="Buscar produto por código ou nome..."
            style={{ minHeight: '44px', height: '44px' }}
            className={`pl-10 pr-24 w-full rounded-md uppercase ${
              darkMode
                ? "bg-gray-600 border-gray-500 text-white"
                : "bg-white border-gray-300 text-gray-700"
            }`}
            autoComplete="off"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
          </div>
        </div>
        <button
          type="button"
          onClick={handleSearchButtonClick}
          disabled={isLoading}
          className={`p-2 px-3 rounded-r-md flex items-center justify-center transition-colors ${ 
            darkMode
              ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
              : "bg-blue-500 hover:bg-blue-600 text-white border-blue-500 hover:border-blue-600"
          } border disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
        >
          {isLoading ? (
            <FiLoader className="animate-spin h-5 w-5" />
          ) : (
            <FiSearch className="h-5 w-5 sm:hidden" /> // Ícone para mobile
          )}
          <span className="ml-0 sm:ml-2 hidden sm:inline">Buscar</span> {/* Texto para telas maiores */}
        </button>
      </div>

      {showWarning && (
        <div className={`mt-1 text-sm ${darkMode ? "text-yellow-300" : "text-yellow-600"}`}>
          Digite no mínimo 4 letras para iniciar a busca
        </div>
      )}

      {console.log('Verificando se deve mostrar sugestões:', { showSuggestions, suggestionsLength: suggestions.length })}
      
      {showSuggestions && suggestions.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 rounded-md shadow-lg ${darkMode ? "bg-gray-800" : "bg-white"} border ${darkMode ? "border-gray-600" : "border-gray-200"}`} style={{maxHeight: '90vh'}}>
          <ul className="py-1 overflow-auto max-h-[80vh]">
            {suggestions.map((produto) => {
              console.log('Renderizando produto:', produto.pro_codigo, produto.pro_descricao);
              const jaAdicionado = isProdutoJaAdicionado(produto);
              console.log(`Produto ${produto.pro_codigo} já adicionado:`, jaAdicionado);
              
              return (
                <li
                  key={produto.pro_codigo}
                  className={`cursor-pointer select-none relative py-4 px-4 ${
                    jaAdicionado
                      ? (darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900")
                      : (darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-100 text-gray-900")
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
                      <span className="font-medium text-base line-clamp-2">{produto.pro_descricao}</span>
                      {jaAdicionado && (
                        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                          <FiCheck className="w-4 h-4 text-green-500" />
                          <span className="text-xs font-medium text-green-600">Adicionado</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Layout responsivo para informações do produto */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <span className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        <span className="font-semibold">Código:</span> {produto.pro_codigo}
                      </span>
                      <span className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        <span className="font-semibold">Marca:</span> {produto.PRO_MARCA || '-'}
                      </span>
                      <span className={`${darkMode ? "text-gray-200 font-semibold" : "text-gray-800 font-semibold"}`}>
                        <span>À Vista:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.pro_venda)}
                      </span>
                      <span className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        <span className="font-semibold">Preço 2:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.pro_vendapz || 0)}
                      </span>
                      <span className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        <span className="font-semibold">Mínimo:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.pro_descprovlr || 0)}
                      </span>
                      <span>
                        <span className="font-semibold">Estoque:</span>
                        <span className={`ml-1 ${(produto.estoque <= 0 || produto.pro_quantidade <= 0) ? "text-red-500 font-bold" : (darkMode ? "text-gray-300" : "text-gray-600")}`}>
                          {produto.estoque || produto.pro_quantidade || 0} {produto.unidade || produto.UNI_CODIGO || ''}
                        </span>
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('BOTÃO CLICADO - Produto:', produto);
                        handleProdutoClick(produto);
                      }}
                      className={`mt-2 px-4 py-2 rounded text-sm font-medium ${
                        jaAdicionado
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                    >
                      {jaAdicionado ? "Ir para produto" : "Adicionar ao pedido"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && searchTerm.length >= 4 && !isLoading && (
        <div className={`absolute z-50 w-full mt-1 rounded-md shadow-lg ${darkMode ? "bg-gray-800" : "bg-white"} border ${darkMode ? "border-gray-600" : "border-gray-200"} p-2`}>
          <span className={darkMode ? "text-gray-300" : "text-gray-600"}>Nenhum produto encontrado</span>
        </div>
      )}
    </div>
  );
};

export default ProdutoAutocomplete;
