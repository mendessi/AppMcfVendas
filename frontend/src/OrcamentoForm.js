/**
 * ATENÇÃO: ESTE ARQUIVO ESTÁ FUNCIONANDO CORRETAMENTE PARA GRAVAÇÃO DE ORÇAMENTOS.
 * NÃO MODIFICAR A LÓGICA DE GRAVAÇÃO A MENOS QUE SEJA ABSOLUTAMENTE NECESSÁRIO.
 * 
 * Se precisar fazer alterações:
 * 1. Teste em ambiente de homologação
 * 2. Documente as alterações
 * 3. Atualize esta mensagem
 */

import React, { useState, useRef, useEffect } from 'react';
import OrcamentoHeader from './components/OrcamentoHeader';
import useIsMobile from './components/useIsMobile';
import ProdutoAutocomplete from './components/ProdutoAutocomplete';
import api from './services/api';
import { FiPrinter, FiX, FiCheck, FiCopy, FiPlus, FiArchive, FiPercent, FiAlertCircle, FiEdit } from 'react-icons/fi';
import OrcamentosCache from './components/OrcamentosCache';
import OrcamentoCache from './services/OrcamentoCache';
import { useNavigate, useLocation } from 'react-router-dom';
import Toast from './components/Toast';
import VendedorSelect from './components/VendedorSelect';

const ESPECIE_OPCOES = [
  { value: '0', label: 'Dinheiro' },
  { value: '1', label: 'Duplicata' },
  { value: '2', label: 'Boleto' },
  { value: '3', label: 'Carteira' },
  { value: '4', label: 'C. Crédito' },
  { value: '5', label: 'Cheque-Pré' },
  { value: '6', label: 'Outros' },
  { value: '7', label: 'Vale Funcionário' },
  { value: '8', label: 'Vale Crédito Cliente' },
  { value: '9', label: 'Depósito Bancário' },
  { value: '10', label: 'BX p/ Dev. Mercadoria' },
  { value: '11', label: 'BX Com Aut. da Diretoria' },
  { value: '12', label: 'PIX' }
];

function OrcamentoForm({ darkMode = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const orcamentoDoCache = location.state?.orcamentoCache;

  // Estados principais do formulário
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCacheModal, setShowCacheModal] = useState(false);
  const [orcamentoSalvo, setOrcamentoSalvo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cliente, setCliente] = useState(null);
  const [tabela, setTabela] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [dataOrcamento] = useState(() => {
    const hoje = new Date();
    return hoje.toLocaleDateString('pt-BR');
  });
  const [validade, setValidade] = useState('');
  const [especie, setEspecie] = useState('0');
  const [desconto, setDesconto] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [produtoBusca, setProdutoBusca] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnitario, setValorUnitario] = useState(0);
  const [imagem, setImagem] = useState('');

  // Estados de controle do modal
  const [confirmacaoVisivel, setConfirmacaoVisivel] = useState(false);
  const [produtoSelecionadoConfirmacao, setProdutoSelecionadoConfirmacao] = useState(null);
  const [indiceProduto, setIndiceProduto] = useState(-1);

  // Estado para rastrear o último item inserido (sempre será o índice 0)
  const [ultimoItemInserido, setUltimoItemInserido] = useState(null);

  // Novo estado para controlar o alerta de preço mínimo
  const [alertaPrecoMinimo, setAlertaPrecoMinimo] = useState(null);

  // Novo estado para controlar o toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Novo estado para vendedores
  const [vendedores, setVendedores] = useState([]);
  const [vendedorSelecionado, setVendedorSelecionado] = useState(null);

  // Função para verificar se o desconto está válido
  const isDescontoValido = () => {
    if (!vendedorSelecionado) return true;
    return parseFloat(desconto) <= parseFloat(vendedorSelecionado.desconto_maximo);
  };

  // Função para verificar se pode finalizar o pedido
  const podeFinalizarPedido = () => {
    if (!cliente || produtos.length === 0 || isLoading) {
      return false;
    }
    // Bloqueio TOTAL se o desconto estiver inválido
    if (!isDescontoValido()) {
      return false;
    }
    return true;
  };

  // Função para obter o nome do cliente, verificando múltiplos campos possíveis
  const getNomeCliente = (cliente) => {
    if (!cliente) return 'Cliente não informado';
    
    // Verifica se é um objeto ou string
    if (typeof cliente === 'string') return cliente;
    
    // Tenta obter o nome em diferentes campos possíveis
    return (
      cliente.cli_nome || 
      cliente.CLI_NOME || 
      cliente.nome || 
      cliente.label || 
      'Cliente não informado'
    );
  };

  // Cálculo do subtotal e total
  const subtotal = produtos.reduce((acc, p) => acc + (p.quantidade * p.valor_unitario), 0);
  const valorDesconto = (subtotal * desconto) / 100;
  const total = subtotal - valorDesconto;

  // Detecta se é mobile
  const isMobile = useIsMobile();

  // Accordion para mobile
  const [headerOpen, setHeaderOpen] = useState(true);

  // Refs para os campos de quantidade e preço
  const quantidadeRefs = useRef([]);
  const precoRefs = useRef([]);
  const produtoRefs = useRef([]); // Referência para os itens da lista
  
  // Função para rolar até o produto e focar na quantidade
  const scrollToProduto = (index) => {
    if (produtoRefs.current[index]) {
      produtoRefs.current[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Destaque visual temporário mais forte
      const element = produtoRefs.current[index];
      element.classList.add('ring-4', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
      
      // Remove o destaque gradualmente
      setTimeout(() => {
        if (element) {
          element.classList.remove('ring-4', 'ring-blue-500');
          // Mantém o fundo por mais tempo
          setTimeout(() => {
            element.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
          }, 1000);
        }
      }, 2000);
    }
  };
  
  // Função para confirmar navegação para produto existente
  const confirmarNavegacaoProduto = (produto, index) => {
    setProdutoSelecionadoConfirmacao(produto);
    setIndiceProduto(index);
    setConfirmacaoVisivel(true);
  };
  
  // Função chamada quando o usuário confirma a navegação
  const handleConfirmarNavegacao = () => {
    setConfirmacaoVisivel(false);
    if (indiceProduto !== -1) {
      // Fazer scroll e focar no campo de quantidade
      setTimeout(() => {
        scrollToProduto(indiceProduto);
        // Aguarda um pouco mais para garantir que o scroll terminou
        setTimeout(() => {
          if (quantidadeRefs.current[indiceProduto]) {
            quantidadeRefs.current[indiceProduto].focus();
            quantidadeRefs.current[indiceProduto].select();
          }
        }, 300);
      }, 100);
    }
  };
  
  // Função chamada quando o usuário cancela a navegação
  const handleCancelarNavegacao = () => {
    setConfirmacaoVisivel(false);
    setProdutoSelecionadoConfirmacao(null);
    setIndiceProduto(-1);
  };

  const handleQuantidadeChange = (idx, value) => {
    const novaQtd = parseFloat(value) || 1;
    const novosProdutos = produtos.map((p, i) =>
      i === idx ? { ...p, quantidade: novaQtd, valor_total: novaQtd * p.valor_unitario } : p
    );
    setProdutos(novosProdutos);
  };

  // Função para validar preço mínimo
  const validarPrecoMinimo = (valor, precoMinimo, index) => {
    if (parseFloat(valor) < parseFloat(precoMinimo)) {
      setAlertaPrecoMinimo({
        index,
        mensagem: 'Atenção! O preço está abaixo do valor mínimo permitido.',
        precoMinimo
      });
      return false;
    }
    return true;
  };

  // Handler para alteração do valor unitário com validação
  const handleValorUnitarioChange = (idx, value) => {
    const novoValor = parseFloat(value) || 0;
    const novosProdutos = produtos.map((p, i) =>
      i === idx ? { ...p, valor_unitario: novoValor, valor_total: novoValor * p.quantidade } : p
    );
    setProdutos(novosProdutos);
  };

  // Nova função para validar ao terminar a edição
  const validarPrecoAoTerminar = (idx) => {
    const produtoAtual = produtos[idx];
    const valorAtual = parseFloat(produtoAtual.valor_unitario) || 0;
    const precoMinimo = parseFloat(produtoAtual.preco_minimo) || 0;

    if (valorAtual < precoMinimo) {
      setAlertaPrecoMinimo({
        index: idx,
        mensagem: 'O preço informado está abaixo do valor mínimo permitido para este produto.',
        precoMinimo
      });
      
      // Restaura o valor mínimo
      const novosProdutos = [...produtos];
      novosProdutos[idx] = {
        ...novosProdutos[idx],
        valor_unitario: precoMinimo,
        valor_total: precoMinimo * produtoAtual.quantidade
      };
      setProdutos(novosProdutos);
    }
  };

  // Handler para adicionar produto direto (sem precisar clicar em Adicionar Produto)
  const handleAdicionarProdutoDireto = (produto, options = {}) => {
    // Verifica se o produto já está na lista
    const produtoExistente = produtos.find(p => 
      p.codigo === (produto.pro_codigo || produto.codigo) ||
      p.pro_codigo === (produto.pro_codigo || produto.codigo)
    );
    
    if (options.scrollToExisting && produtoExistente) {
      // Se for apenas para navegar até o item existente
      const index = produtos.findIndex(p => 
        p.codigo === (produto.pro_codigo || produto.codigo) ||
        p.pro_codigo === (produto.pro_codigo || produto.codigo)
      );
      
      if (index !== -1) {
        // Mostra o modal de confirmação em vez de navegar diretamente
        confirmarNavegacaoProduto(produto, index);
      }
      return;
    }
    
    if (!produtoExistente) {
      // Adiciona um novo produto
      const valorUnit = produto.pro_venda || produto.valor_unitario || 0;
      const codigoProduto = produto.pro_codigo || produto.codigo;
      const novoItem = {
        codigo: codigoProduto,
        pro_codigo: codigoProduto,
        descricao: produto.pro_descricao || produto.descricao,
        quantidade: 1,
        valor_unitario: valorUnit,
        valor_total: valorUnit * 1,
        imagem: produto.pro_imagem || produto.imagem || '',
        estoque_atual: produto.estoque || produto.pro_quantidade || produto.PRO_QUANTIDADE || 0,
        estoque_minimo: produto.pro_minimo_estoque || 0,
        preco_minimo: produto.pro_descprovlr || 0
      };
      const novosProdutos = [novoItem, ...produtos];
      setProdutos(novosProdutos);
      
      setUltimoItemInserido(codigoProduto);
      
      setTimeout(() => {
        setUltimoItemInserido(null);
      }, 3000);
      
      setTimeout(() => {
        scrollToProduto(0);
      }, 100);
    } else if (!options.scrollToExisting) {
      const novosProdutos = [...produtos];
      const index = produtos.findIndex(p => 
        p.codigo === (produto.pro_codigo || produto.codigo) ||
        p.pro_codigo === (produto.pro_codigo || produto.codigo)
      );
      
      if (index !== -1) {
        const codigoProduto = produto.pro_codigo || produto.codigo;
        novosProdutos[index] = {
          ...novosProdutos[index],
          quantidade: (novosProdutos[index].quantidade || 1) + 1,
          valor_total: novosProdutos[index].valor_unitario * ((novosProdutos[index].quantidade || 1) + 1)
        };
        setProdutos(novosProdutos);
        
        setUltimoItemInserido(codigoProduto);
        
        setTimeout(() => {
          setUltimoItemInserido(null);
        }, 3000);
        
        scrollToProduto(index);
      }
    }
  };

  // Handler para remover produto
  const handleRemoverProduto = idx => {
    setProdutos(produtos.filter((_, i) => i !== idx));
  };

  // Handler para abrir confirmação
  const handleAbrirConfirmacao = () => {
    // Verificação DUPLA de segurança
    if (!isDescontoValido()) {
      showToast(`ATENÇÃO: Desconto de ${desconto}% não permitido. Máximo: ${vendedorSelecionado?.desconto_maximo}%`, 'error');
      return;
    }
    if (!podeFinalizarPedido()) {
      return;
    }
    setShowConfirmation(true);
  };

  // Handler para fechar confirmação
  const handleFecharConfirmacao = () => {
    setShowConfirmation(false);
    setOrcamentoSalvo(null);
  };

  // Handler para copiar número do orçamento
  const handleCopiarNumero = () => {
    if (orcamentoSalvo?.numero_orcamento) {
      navigator.clipboard.writeText(orcamentoSalvo.numero_orcamento.toString());
      alert('Número do orçamento copiado!');
    }
  };

  // Handler para imprimir orçamento
  const handleImprimir = async () => {
    if (orcamentoSalvo?.numero_orcamento) {
      try {
        // Obter token e empresa como nas outras requisições
        const token = localStorage.getItem('token');
        const empresaCodigo = localStorage.getItem('empresa_atual');
        
        if (!token) {
          alert('Você precisa estar logado para imprimir o orçamento.');
          return;
        }
        
        // Fazer a requisição com os cabeçalhos corretos
        const response = await api.get(`/orcamentos/${orcamentoSalvo.numero_orcamento}/pdf`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-empresa-codigo': empresaCodigo,
            'Content-Type': 'application/json'
          },
          responseType: 'text' // Porque esperamos HTML
        });
        
        // Abrir nova janela com o HTML retornado
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(response.data);
          printWindow.document.close();
        } else {
          alert('Por favor, permita pop-ups para imprimir o orçamento.');
        }
        
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        if (error.response?.status === 401) {
          alert('Sessão expirada. Faça login novamente.');
        } else {
          alert('Erro ao gerar PDF do orçamento: ' + (error.response?.data?.detail || error.message));
        }
      }
    } else {
      alert('Número do orçamento não encontrado. Salve o orçamento primeiro.');
    }
  };

  // Função para limpar formulário completo (incluindo estados de modal)
  const limparFormularioCompleto = () => {
    console.log('Limpando formulário completo...');
    setProdutos([]);
    setCliente(null);
    setTabela('');
    setFormaPagamento('');
    setVendedor('');
    setValidade('');
    setEspecie('0');
    setDesconto(0);
    setObservacao('');
    setProdutoSelecionado(null);
    setQuantidade(1);
    setValorUnitario(0);
    setImagem('');
    setOrcamentoSalvo(null);
    setShowConfirmation(false);
    setConfirmacaoVisivel(false);
    setProdutoSelecionadoConfirmacao(null);
    setIndiceProduto(-1);
    setIsLoading(false);
    setUltimoItemInserido(null);
    
    // Limpa os campos de busca
    setTimeout(() => {
      const buscaInputs = document.querySelectorAll('input[type="text"], input[type="search"]');
      buscaInputs.forEach(input => {
        if (input.placeholder && (input.placeholder.includes('Buscar') || input.placeholder.includes('buscar') || input.placeholder.includes('Digite'))) {
          input.value = '';
        }
      });
      
      // Foca no campo de busca de cliente após limpar
      const clienteInput = document.querySelector('input[placeholder*="cliente" i]');
      if (clienteInput) {
        clienteInput.focus();
      }
    }, 100);
    
    console.log('Formulário limpo com sucesso!');
  };

  // Handler para novo orçamento
  const handleNovoOrcamento = () => {
    console.log('Iniciando novo orçamento...');
    limparFormularioCompleto();
    // Fechar modal se estiver aberto
    setShowConfirmation(false);
    
    // Feedback visual opcional
    if (window.innerWidth >= 768) { // Apenas no desktop para não atrapalhar o mobile
      // Pequeno feedback que o formulário foi limpo
      setTimeout(() => {
        const titulo = document.querySelector('h2');
        if (titulo) {
          titulo.classList.add('animate-pulse');
          setTimeout(() => {
            titulo.classList.remove('animate-pulse');
          }, 1000);
        }
      }, 200);
    }
  };

  // Função para converter data do formato DD/MM/YYYY para YYYY-MM-DD
  const converterDataParaISO = (data) => {
    if (!data) return '';
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}`;
  };

  // Handler para submit do orçamento
  const handleSalvar = async () => {
    if (!isDescontoValido()) {
      alert(`Desconto não permitido. Máximo: ${vendedorSelecionado?.desconto_maximo}%`);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Obtém o nome do cliente formatado
      const nomeCliente = getNomeCliente(cliente);
      
      // Monta o JSON conforme backend
      const payload = {
        cliente_codigo: String(cliente?.cli_codigo || cliente?.CLI_CODIGO || cliente?.codigo || ''),
        nome_cliente: nomeCliente,
        tabela_codigo: String(tabela || ''),
        formapag_codigo: String(formaPagamento || ''),
        valor_total: Number(total),
        data_orcamento: converterDataParaISO(dataOrcamento),
        data_validade: String(validade || ''),
        observacao: String(observacao || ''),
        vendedor_codigo: String(vendedor || ''),
        especie: String(especie || '0'),
        desconto: Number(desconto || 0),
        produtos: produtos.map(p => ({
          codigo: String(p.codigo || ''),
          descricao: String(p.descricao || ''),
          quantidade: Number(p.quantidade || 0),
          valor_unitario: Number(p.valor_unitario || 0),
          valor_total: Number(p.valor_total || 0),
          imagem: String(p.imagem || '')
        }))
      };

      // Log do payload para depuração
      console.log('Payload do orçamento:', JSON.stringify(payload, null, 2));

      // Envia para o backend
      const response = await api.post('/orcamentos', payload);
      const data = response.data;
      
      // Verifica se salvou com sucesso (adapta para diferentes formatos de resposta)
      if (response.status === 200 || response.status === 201 || data.numero_orcamento || data.numero) {
        // Limpar o cache após salvar com sucesso
        await OrcamentoCache.limparTudo();
        
        setOrcamentoSalvo({
          numero_orcamento: data.numero_orcamento || data.numero || 'N/A',
          data: new Date().toLocaleDateString('pt-BR'),
          cliente: nomeCliente,
          valor_total: total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        });
        
        // Não limpa o formulário aqui, apenas mantém o modal aberto
        // para permitir que o usuário veja as opções (imprimir, copiar, novo)
      } else {
        throw new Error(data.message || 'Erro ao salvar orçamento');
      }
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      console.error('Detalhes do erro:', error.response?.data);
      
      let mensagemErro = 'Erro desconhecido';
      
      if (error.response?.data?.detail) {
        // Se for um array de erros de validação
        if (Array.isArray(error.response.data.detail)) {
          mensagemErro = error.response.data.detail.map(err => err.msg).join(', ');
        } else {
          mensagemErro = error.response.data.detail;
        }
      } else if (error.response?.data?.message) {
        mensagemErro = error.response.data.message;
      } else if (error.message) {
        mensagemErro = error.message;
      }
      
      alert('Erro ao salvar: ' + mensagemErro);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para salvar no cache
  const salvarNoCache = async () => {
    if (!cliente || produtos.length === 0) return;

    try {
      const orcamentoCache = {
        cliente,
        tabela,
        formaPagamento,
        vendedor,
        dataOrcamento,
        validade,
        especie,
        desconto,
        observacao,
        produtos,
        timestamp: new Date().toISOString()
      };

      await OrcamentoCache.salvarCache(orcamentoCache);
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
    }
  };

  // Salvar no cache quando houver alterações relevantes
  useEffect(() => {
    if (cliente || produtos.length > 0) {
      salvarNoCache();
    }
  }, [cliente, produtos, tabela, formaPagamento, vendedor, validade, especie, desconto, observacao]);

  // Carregar dados do cache quando disponível
  useEffect(() => {
    if (orcamentoDoCache && location.state?.forcarCarregamento) {
      setCliente(orcamentoDoCache.cliente);
      setTabela(orcamentoDoCache.tabela || '');
      setFormaPagamento(orcamentoDoCache.formapag_codigo);
      setVendedor(orcamentoDoCache.vendedor || '');
      setValidade(orcamentoDoCache.validade || '');
      setEspecie(orcamentoDoCache.especie || '0');
      setDesconto(orcamentoDoCache.desconto || 0);
      setObservacao(orcamentoDoCache.observacao || '');
      setProdutos(orcamentoDoCache.produtos || []);
      
      // Após carregar, remove do cache
      OrcamentoCache.removerCache(orcamentoDoCache.id);

      // Limpa o state da navegação para não recarregar se a página for atualizada
      navigate(location.pathname, { replace: true });
    }
  }, [orcamentoDoCache, location.state?.forcarCarregamento]);

  // Função para mostrar o toast
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  // Função para fechar o toast
  const closeToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  // Substituir o alerta de preço mínimo pelo toast
  const handlePrecoMinimo = (produto, precoMinimo) => {
    showToast(
      `Preço mínimo para ${produto.pro_descricao}: ${parseFloat(precoMinimo).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      })}`,
      'warning'
    );
  };

  // Substituir o alerta de item já inserido pelo toast
  const handleItemJaInserido = (produto) => {
    showToast(
      `Item "${produto.pro_descricao}" já está no orçamento`,
      'info'
    );
  };

  const handleProdutoSelecionado = (produto) => {
    if (!produto) return;

    const produtoJaInserido = produtos.find(p => 
      p.codigo === produto.pro_codigo || 
      p.pro_codigo === produto.pro_codigo
    );

    if (produtoJaInserido) {
      handleItemJaInserido(produto);
      const element = document.getElementById(`produto-${produtoJaInserido.codigo || produtoJaInserido.pro_codigo}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-row');
        setTimeout(() => element.classList.remove('highlight-row'), 2000);
      }
      return;
    }

    setProdutoSelecionado(produto);
    setValorUnitario(produto.pro_venda || 0);
    setQuantidade(1);
  };

  const handleAdicionarProduto = () => {
    if (!produtoSelecionado) {
      showToast('Selecione um produto primeiro', 'error');
      return;
    }

    if (quantidade <= 0) {
      showToast('A quantidade deve ser maior que zero', 'error');
      return;
    }

    if (valorUnitario <= 0) {
      showToast('O valor unitário deve ser maior que zero', 'error');
      return;
    }

    // Verificar preço mínimo
    if (produtoSelecionado.preco_minimo && valorUnitario < produtoSelecionado.preco_minimo) {
      handlePrecoMinimo(produtoSelecionado, produtoSelecionado.preco_minimo);
      return;
    }

    const novoProduto = {
      codigo: produtoSelecionado.pro_codigo,
      descricao: produtoSelecionado.pro_descricao,
      quantidade,
      valor_unitario: valorUnitario,
      valor_total: quantidade * valorUnitario,
      preco_minimo: produtoSelecionado.preco_minimo || 0
    };

    setProdutos([novoProduto, ...produtos]);
    setProdutoSelecionado(null);
    setQuantidade(1);
    setValorUnitario(0);
    showToast(`Produto "${novoProduto.descricao}" adicionado com sucesso`, 'success');
  };

  // Função para buscar vendedores
  useEffect(() => {
    const fetchVendedores = async () => {
      try {
        const response = await api.get('/vendedores');
        setVendedores(response.data);
      } catch (error) {
        console.error('Erro ao buscar vendedores:', error);
      }
    };
    fetchVendedores();
  }, []);

  // Atualiza o vendedor selecionado quando mudar o vendedor
  useEffect(() => {
    const vendedorAtual = vendedores.find(v => v.codigo === vendedor);
    setVendedorSelecionado(vendedorAtual);
  }, [vendedor, vendedores]);

  // Função para validar o desconto
  const handleDescontoChange = (valor) => {
    let novoDesconto = parseFloat(valor) || 0;
    
    // Força o limite máximo do vendedor
    if (vendedorSelecionado) {
      const maximo = parseFloat(vendedorSelecionado.desconto_maximo);
      if (novoDesconto > maximo) {
        novoDesconto = maximo;
      }
    }
    
    setDesconto(novoDesconto);
  };

  // TODO: Buscar clientes, tabelas, formas de pagamento, vendedores, produtos via API
  // TODO: Implementar autocomplete e selects reais

  useEffect(() => {
    // Carregar dados do usuário e inicializar vendedor se for vendedor
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData?.nivel?.toUpperCase() === 'VENDEDOR' && userData?.codigo_vendedor) {
      setVendedor(userData.codigo_vendedor);
    }

    // Carregar dados do orçamento do cache se existir
    if (orcamentoDoCache) {
      setCliente(orcamentoDoCache.cliente);
      setTabela(orcamentoDoCache.tabela_codigo);
      setFormaPagamento(orcamentoDoCache.formapag_codigo);
      if (!userData?.nivel?.toUpperCase() === 'VENDEDOR') {
        setVendedor(orcamentoDoCache.vendedor_codigo);
      }
      setValidade(orcamentoDoCache.data_validade);
      setEspecie(orcamentoDoCache.especie);
      setDesconto(orcamentoDoCache.desconto);
      setObservacao(orcamentoDoCache.observacao);
      setProdutos(orcamentoDoCache.produtos);
    }
  }, [orcamentoDoCache]);

  const handleVendedorChange = (vendedorSelecionado) => {
    if (typeof vendedorSelecionado === 'object') {
      setVendedor(vendedorSelecionado.codigo);
      setVendedorSelecionado(vendedorSelecionado);
    } else {
      setVendedor(vendedorSelecionado);
      const vendedor = vendedores.find(v => v.codigo === vendedorSelecionado);
      setVendedorSelecionado(vendedor);
    }
  };

  return (
    <div className={
      isMobile
        ? `orcamento-form w-full ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-2 mt-2 mb-4`
        : `orcamento-form w-full max-w-7xl mx-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 mt-8 mb-8 flex flex-col min-h-[80vh]`
    }>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>Pedido de Venda</h2>
        <button
          onClick={() => setShowCacheModal(true)}
          className={`flex items-center px-3 py-2 rounded-md ${
            darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          <FiArchive className="mr-2" />
          <span className="text-sm">Pedidos em Cache</span>
        </button>
      </div>
      {/* Cabeçalho do orçamento: accordion no mobile, aberto no desktop */}
      {isMobile ? (
        <div className="mb-4">
          <button
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-900 text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-300'} font-semibold border focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
            onClick={() => setHeaderOpen(v => !v)}
            aria-expanded={headerOpen}
          >
            <span>Dados do Orçamento</span>
            <svg className={`w-5 h-5 transition-transform ${headerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          <div className={`transition-all duration-300 overflow-hidden ${headerOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-2">
              <OrcamentoHeader
                darkMode={darkMode}
                cliente={cliente} setCliente={setCliente}
                tabela={tabela} setTabela={setTabela}
                formaPagamento={formaPagamento} setFormaPagamento={setFormaPagamento}
                vendedor={vendedor} setVendedor={setVendedor}
                data={dataOrcamento}
                validade={validade} setValidade={setValidade}
                especie={especie} setEspecie={setEspecie}
                desconto={desconto} setDesconto={setDesconto}
                observacao={observacao} setObservacao={setObservacao}
                ESPECIE_OPCOES={ESPECIE_OPCOES}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <OrcamentoHeader
            darkMode={darkMode}
            cliente={cliente} setCliente={setCliente}
            tabela={tabela} setTabela={setTabela}
            formaPagamento={formaPagamento} setFormaPagamento={setFormaPagamento}
            vendedor={vendedor} setVendedor={setVendedor}
            data={dataOrcamento}
            validade={validade} setValidade={setValidade}
            especie={especie} setEspecie={setEspecie}
            desconto={desconto} setDesconto={setDesconto}
            observacao={observacao} setObservacao={setObservacao}
            ESPECIE_OPCOES={ESPECIE_OPCOES}
          />
        </div>
      )}
      {/* Itens do orçamento */}
      <div className="mb-8 flex-1">
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Itens</h3>
        <div className="flex gap-3 items-end mb-6">
          <div className="flex-1">
            <ProdutoAutocomplete 
              value={produtoSelecionado} 
              onChange={setProdutoSelecionado} 
              onAdd={handleAdicionarProdutoDireto}
              produtosNoOrcamento={produtos}
              darkMode={darkMode}
            />
          </div>
        </div>
        <div className="space-y-3">
          {produtos.map((p, idx) => {
            // Verifica se este é o último item inserido
            const isUltimoInserido = ultimoItemInserido === p.codigo;
            
            return (
              <div 
                key={idx} 
                ref={el => produtoRefs.current[idx] = el} 
                className={`
                  ${isUltimoInserido 
                    ? darkMode 
                      ? 'bg-green-900/30 border-green-500 ring-2 ring-green-500/50' 
                      : 'bg-green-50 border-green-300 ring-2 ring-green-300/50'
                    : darkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  } 
                  border rounded-lg shadow-sm p-4 flex flex-col gap-4 transition-all duration-300
                  ${isUltimoInserido ? 'animate-pulse' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`font-medium text-sm px-3 py-1 rounded-full ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {p.codigo}
                    </div>
                    {isUltimoInserido && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        darkMode ? 'bg-green-600 text-white' : 'bg-green-200 text-green-800'
                      }`}>
                        NOVO
                      </span>
                    )}
                    
                    {/* Estoque Atual */}
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Estoque:
                      </span>
                      <span className={`px-2 py-1 text-sm rounded font-medium ${
                        parseFloat(p.estoque_atual) <= 0
                          ? darkMode 
                            ? 'bg-red-900/30 text-red-400 border border-red-700'
                            : 'bg-red-100 text-red-700 border border-red-200'
                          : parseFloat(p.estoque_atual) <= parseFloat(p.estoque_minimo)
                            ? darkMode
                              ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                            : darkMode 
                              ? 'bg-gray-700 text-gray-300' 
                              : 'bg-gray-100 text-gray-700'
                      }`}>
                        {parseFloat(p.estoque_atual).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Preço Mínimo com Tooltip */}
                    <div className="relative group">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Mínimo:
                        </span>
                        <span className={`px-2 py-1 text-sm rounded font-medium ${
                          parseFloat(p.valor_unitario) <= parseFloat(p.preco_minimo)
                            ? darkMode
                              ? 'bg-red-900/30 text-red-400 border border-red-700'
                              : 'bg-red-100 text-red-700 border border-red-200'
                            : darkMode 
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-100 text-gray-700'
                        }`}>
                          {parseFloat(p.preco_minimo).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                      
                      {/* Tooltip de alerta sobre preço mínimo */}
                      <div className={`absolute z-10 w-64 px-4 py-3 mt-2 text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
                        darkMode
                          ? 'bg-yellow-900/50 border border-yellow-700 text-yellow-300'
                          : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                      }`}>
                        <div className="flex items-start gap-2">
                          <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            darkMode ? 'text-yellow-500' : 'text-yellow-500'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p>
                            Utilize o preço mínimo com moderação. Vendas frequentes no valor mínimo podem impactar a rentabilidade do negócio.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={() => handleRemoverProduto(idx)} 
                    className={`${darkMode ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' : 'text-red-500 hover:text-red-700 hover:bg-red-50'} rounded p-1.5 transition-all`}
                    title="Remover produto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className={`font-semibold text-base leading-tight ${
                  isUltimoInserido 
                    ? darkMode ? 'text-green-200' : 'text-green-800'
                    : darkMode ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  {p.descricao}
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <label className={`text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Quantidade
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        min="0.01"
                        step="0.01"
                        value={p.quantidade}
                        ref={el => quantidadeRefs.current[idx] = el}
                        onChange={e => handleQuantidadeChange(idx, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault();
                            if (precoRefs.current[idx]) precoRefs.current[idx].focus();
                          }
                        }}
                        className={`w-full h-12 px-4 py-2 rounded border text-center font-semibold text-base md:text-xl ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-400 focus:border-blue-400' 
                            : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                        } focus:outline-none focus:ring-2 shadow-sm hover:border-blue-400 transition-colors`}
                        style={{
                          fontSize: '16px', // Previne zoom no iOS
                          WebkitAppearance: 'none', // Remove spinner nativo
                          MozAppearance: 'textfield' // Remove spinner nativo no Firefox
                        }}
                      />
                      <div className={`absolute -top-2 right-2 text-xs px-2 py-0.5 rounded ${
                        darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'
                      } font-medium`}>
                        un
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className={`text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Valor Unitário
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        min={0}
                        step={0.01}
                        value={p.valor_unitario}
                        ref={el => precoRefs.current[idx] = el}
                        onChange={e => handleValorUnitarioChange(idx, e.target.value)}
                        onBlur={() => validarPrecoAoTerminar(idx)}
                        onFocus={e => e.target.select()}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            validarPrecoAoTerminar(idx);
                            if (e.key === 'Enter' && quantidadeRefs.current[idx + 1]) {
                              e.preventDefault();
                              quantidadeRefs.current[idx + 1].focus();
                            } else if (e.key === 'Tab') {
                              e.preventDefault();
                              e.target.select();
                            }
                          }
                        }}
                        className={`w-full h-12 px-4 py-2 rounded border text-right font-semibold text-base md:text-xl ${
                          parseFloat(p.valor_unitario) < parseFloat(p.preco_minimo)
                            ? darkMode
                              ? 'bg-red-900/20 border-red-700 text-red-400'
                              : 'bg-red-50 border-red-300 text-red-700'
                            : darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 ${
                          parseFloat(p.valor_unitario) < parseFloat(p.preco_minimo)
                            ? 'focus:ring-red-500 focus:border-red-500'
                            : 'focus:ring-blue-500 focus:border-blue-500'
                        } transition-colors`}
                        style={{
                          fontSize: '16px', // Previne zoom no iOS
                          WebkitAppearance: 'none', // Remove spinner nativo
                          MozAppearance: 'textfield' // Remove spinner nativo no Firefox
                        }}
                      />
                      <div className={`absolute -top-2 right-2 text-xs px-2 py-0.5 rounded ${
                        darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'
                      } font-medium`}>
                        R$
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className={`text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Total do Item
                    </label>
                    <div className="relative">
                      <div className={`h-12 px-4 py-2 border rounded text-right font-bold text-xl ${
                        darkMode 
                          ? 'bg-blue-900/20 border-blue-800 text-blue-300' 
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                      } shadow-sm`}>
                        {parseFloat(p.valor_total).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                      <div className={`absolute -top-2 right-2 text-xs px-2 py-0.5 rounded ${
                        darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'
                      } font-medium`}>
                        R$
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Totais */}
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded-lg p-4 mb-6`}>
        <div className="space-y-2">
          {/* Linha de quantidade de itens */}
          <div className="flex justify-between items-center">
            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} font-medium`}>Qtde de Itens:</span>
            <span className={`${darkMode ? 'text-gray-100' : 'text-gray-900'} font-semibold`}>
              {produtos.length}
            </span>
          </div>
          
          {/* Linha de quantidade total */}
          <div className="flex justify-between items-center">
            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} font-medium`}>Soma das Qtdades:</span>
            <span className={`${darkMode ? 'text-gray-100' : 'text-gray-900'} font-semibold`}>
              {produtos.reduce((total, produto) => total + (parseFloat(produto.quantidade) || 0), 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
          
          {/* Linha de subtotal */}
          <div className="flex justify-between items-center">
            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} font-medium`}>Subtotal:</span>
            <span className={`${darkMode ? 'text-gray-100' : 'text-gray-900'} font-semibold`}>
              {parseFloat(subtotal).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
          
          {/* Linha de desconto */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} font-medium`}>Desconto:</span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiPercent className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={vendedorSelecionado?.desconto_maximo || 100}
                    value={desconto}
                    onChange={e => {
                      let valor = parseFloat(e.target.value) || 0;
                      const maximo = vendedorSelecionado?.desconto_maximo || 100;
                      if (valor > maximo) valor = maximo;
                      setDesconto(valor);
                    }}
                    className={`w-24 px-3 py-2 rounded border text-right text-lg ${
                      darkMode 
                        ? 'bg-gray-700 text-white border-gray-600' 
                        : 'bg-white text-gray-900 border-gray-300'
                    }`}
                  />
                </div>
                <span className={`${darkMode ? 'text-white' : 'text-gray-900'} text-lg`}>%</span>
                {vendedorSelecionado && (
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    (Máx: {vendedorSelecionado.desconto_maximo}%)
                  </span>
                )}
              </div>
            </div>
            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} font-medium`}>
              R$ {(subtotal * desconto / 100).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
          
          {/* Linha de total */}
          <div className="flex justify-between items-center border-t pt-2">
            <span className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} font-bold text-lg`}>TOTAL:</span>
            <span className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} font-bold text-xl`}>
              {(subtotal - ((subtotal * desconto) / 100)).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
        </div>
      </div>
      {/* Ações */}
      <div className="flex justify-center gap-4">
        <button
          type="button"
          onClick={handleAbrirConfirmacao}
          disabled={!podeFinalizarPedido()}
          className={`w-full max-w-md ${
            !isDescontoValido() 
              ? 'bg-red-600 hover:bg-red-700' 
              : isLoading 
                ? 'bg-blue-700' 
                : 'bg-blue-600 hover:bg-blue-700'
          } text-white py-3 rounded-lg font-bold text-xl transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {!isDescontoValido() ? (
            <>
              <FiX className="w-6 h-6" />
              Desconto Acima do Permitido ({vendedorSelecionado?.desconto_maximo}%)
            </>
          ) : isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Salvando...
            </>
          ) : (
            <>
              <FiCheck className="w-6 h-6" />
              Finalizar Pedido
            </>
          )}
        </button>
      </div>

      {/* Manter apenas os modais necessários e o Toast */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border-2 rounded-xl shadow-2xl w-full max-w-md p-6 mx-4`}>
            {!orcamentoSalvo ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      darkMode ? 'bg-blue-900/30' : 'bg-blue-100'
                    }`}>
                      <FiCheck className={`w-6 h-6 ${
                        darkMode ? 'text-blue-400' : 'text-blue-600'
                      }`} />
                    </div>
                    <h3 className={`text-xl font-bold ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      Confirmar Orçamento
                    </h3>
                  </div>
                  <button
                    onClick={handleFecharConfirmacao}
                    className={`p-1 rounded-full transition-colors ${
                      darkMode 
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
                
                <div className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <p className="mb-4">
                    Confirma a finalização do orçamento com os seguintes dados?
                  </p>
                  <ul className="space-y-2">
                    <li>
                      <span className="font-medium">Cliente:</span> {getNomeCliente(cliente)}
                    </li>
                    <li>
                      <span className="font-medium">Itens:</span> {produtos.length}
                    </li>
                    <li>
                      <span className="font-medium">Total:</span> {total.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </li>
                  </ul>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleFecharConfirmacao}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSalvar}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    } flex items-center gap-2`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <FiCheck className="w-5 h-5" />
                        Confirmar
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      darkMode ? 'bg-green-900/30' : 'bg-green-100'
                    }`}>
                      <FiCheck className={`w-6 h-6 ${
                        darkMode ? 'text-green-400' : 'text-green-600'
                      }`} />
                    </div>
                    <h3 className={`text-xl font-bold ${
                      darkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      Orçamento Salvo!
                    </h3>
                  </div>
                  <button
                    onClick={handleFecharConfirmacao}
                    className={`p-1 rounded-full transition-colors ${
                      darkMode 
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
                
                <div className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <div className="space-y-2 mb-4">
                    <p>
                      <span className="font-medium">Número:</span> {orcamentoSalvo.numero_orcamento}
                    </p>
                    <p>
                      <span className="font-medium">Data:</span> {orcamentoSalvo.data}
                    </p>
                    <p>
                      <span className="font-medium">Cliente:</span> {orcamentoSalvo.cliente}
                    </p>
                    <p>
                      <span className="font-medium">Valor Total:</span> {orcamentoSalvo.valor_total}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleCopiarNumero}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FiCopy className="w-5 h-5" />
                    Copiar Número
                  </button>
                  
                  <button
                    onClick={handleImprimir}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FiPrinter className="w-5 h-5" />
                    Imprimir
                  </button>
                  
                  <button
                    onClick={handleNovoOrcamento}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      darkMode
                        ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    <FiPlus className="w-5 h-5" />
                    Novo Orçamento
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showCacheModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`relative w-full max-w-2xl mx-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl`}>
            <OrcamentosCache
              darkMode={darkMode}
              onClose={() => setShowCacheModal(false)}
            />
          </div>
        </div>
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
          darkMode={darkMode}
          position="bottom-right"
        />
      )}

      {/* Modal de Confirmação - Produto Já Existente */}
      {confirmacaoVisivel && produtoSelecionadoConfirmacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border-2 rounded-xl shadow-2xl w-full max-w-md p-6 mx-4`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  darkMode ? 'bg-yellow-900/30' : 'bg-yellow-100'
                }`}>
                  <FiAlertCircle className={`w-6 h-6 ${
                    darkMode ? 'text-yellow-400' : 'text-yellow-600'
                  }`} />
                </div>
                <h3 className={`text-xl font-bold ${
                  darkMode ? 'text-yellow-400' : 'text-yellow-600'
                }`}>
                  Produto Já Adicionado
                </h3>
              </div>
              <button
                onClick={handleCancelarNavegacao}
                className={`p-1 rounded-full transition-colors ${
                  darkMode 
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <p className="mb-4">
                O produto <strong>{produtoSelecionadoConfirmacao.pro_descricao || produtoSelecionadoConfirmacao.descricao}</strong> já está no pedido.
              </p>
              <p>
                Deseja ir até o item para editar a quantidade?
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelarNavegacao}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarNavegacao}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                } flex items-center gap-2`}
              >
                <FiEdit className="w-5 h-5" />
                Ir para o Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrcamentoForm;