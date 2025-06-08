import React, { useState, useRef, useEffect } from 'react';
import './ChatIA.css';

// URL base do backend
const API_URL = 'http://localhost:8000';

// Função auxiliar para extrair mensagem de erro
const getErrorMessage = (errorObj) => {
  console.log('Processando objeto de erro:', errorObj);
  
  if (typeof errorObj === 'string') return errorObj;
  
  if (errorObj.detail) {
    const detail = errorObj.detail;
    if (Array.isArray(detail)) {
      const firstError = detail[0];
      if (firstError) {
        if (typeof firstError === 'string') return firstError;
        if (firstError.msg) return firstError.msg;
        if (firstError.detail) return firstError.detail;
        if (firstError.message) return firstError.message;
        if (firstError.loc && firstError.msg) {
          return `${firstError.loc.join('.')}: ${firstError.msg}`;
        }
      }
      return 'Erro de validação';
    }
    return detail;
  }
  
  return 'Erro desconhecido';
};

const ChatIA = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'ia', text: 'Olá! Sou a IA Mendes.\nComo posso ajudar você?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [pulse, setPulse] = useState(false); // novo estado para animação
  const messagesEndRef = useRef(null);

  // Pulsar a cada 30s se não estiver aberto
  useEffect(() => {
    if (!isOpen) {
      const interval = setInterval(() => {
        setPulse(false); // Remove antes para garantir reflow
        setTimeout(() => setPulse(true), 10); // Adiciona depois de 10ms
        setTimeout(() => setPulse(false), 2510); // Remove após 2.5s de animação
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);


  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Função para obter o código da empresa
  const obterEmpresaCodigo = () => {
    // Tentar obter do localStorage 'empresa_detalhes' (objeto completo)
    const empresaDetalhes = localStorage.getItem('empresa_detalhes');
    if (empresaDetalhes) {
      try {
        const empObj = JSON.parse(empresaDetalhes);
        return empObj?.cli_codigo;
      } catch (e) {
        console.log('Erro ao parsear empresa_detalhes:', e.message);
      }
    }

    // Se não encontrou, tentar das outras chaves
    const empresaSelecionada = localStorage.getItem('empresa') || 
                             localStorage.getItem('empresa_atual') || 
                             localStorage.getItem('empresa_selecionada');
    
    if (empresaSelecionada) {
      try {
        const empObj = JSON.parse(empresaSelecionada);
        return empObj?.cli_codigo || empObj?.codigo;
      } catch {
        return empresaSelecionada;
      }
    }
    return null;
  };

  const handleSend = async () => {
    // Valida se o input não está vazio
    if (!input || !input.trim()) {
      setMessages((msgs) => [...msgs, { from: 'ia', text: 'Por favor, digite uma mensagem.' }]);
      return;
    }

    // Adiciona a mensagem do usuário
    setMessages((msgs) => [...msgs, { from: 'user', text: input }]);
    setInput('');

    try {
      setIsLoading(true);

      // Prepara o corpo da requisição
      const requestBody = {
        pergunta: input.trim()
      };

      console.log('Input original:', input);
      console.log('Input após trim:', input.trim());
      console.log('Corpo da requisição:', requestBody);
      console.log('Corpo da requisição (string):', JSON.stringify(requestBody));

      // Obtém o token e código da empresa
      const token = localStorage.getItem('token');
      const empresaCodigo = obterEmpresaCodigo();

      // Faz a requisição para a API
      const response = await fetch(`${API_URL}/api/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-empresa-codigo': empresaCodigo
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Status da resposta:', response.status);
      const data = await response.json();
      console.log('Dados da resposta:', data);

      if (!response.ok) {
        const errorMessage = getErrorMessage(data);
        console.log('Mensagem de erro processada:', errorMessage);
        
        let userMessage;
        switch (response.status) {
          case 422:
            userMessage = `Erro de validação: ${errorMessage}`;
            break;
          case 401:
            userMessage = 'Não autorizado. Por favor, faça login novamente.';
            break;
          case 403:
            userMessage = 'Acesso negado. Verifique suas permissões.';
            break;
          case 500:
            userMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
            break;
          default:
            userMessage = `Erro ${response.status}: ${errorMessage}`;
        }
        
        setMessages((msgs) => [...msgs, { from: 'ia', text: userMessage }]);
        return;
      }

      // Adiciona a resposta da IA
      setMessages((msgs) => [...msgs, { from: 'ia', text: data }]);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessages((msgs) => [...msgs, { 
        from: 'ia', 
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <>
      {/* Ícone flutuante */}
      {!isOpen && (
        <button className={`chat-ia-fab${pulse ? ' pulse' : ''}`} onClick={() => setIsOpen(true)} title="Falar com a IA Mendes">
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="24" r="24" fill="#25D366"/>
  <path d="M12 34c0-1.1.9-2 2-2h20c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H14c-1.1 0-2-.9-2-2v-2z" fill="#20b15a"/>
  <text x="24" y="29" textAnchor="middle" fontSize="16" fontFamily="Arial, Helvetica, sans-serif" fill="white" fontWeight="bold" letterSpacing="2">IA</text>
  <rect x="14" y="14" width="20" height="12" rx="6" fill="#20b15a" stroke="white" strokeWidth="1.5"/>
</svg>
        </button>
      )}
      {/* Modal de chat */}
      {isOpen && (
        <div className="chat-ia-modal-bg" onClick={() => setIsOpen(false)}>
          <div className="chat-ia-modal" onClick={e => e.stopPropagation()}>
            <div className="chat-ia-header">
              <span>IA Mendes</span>
              <button className="chat-ia-close" onClick={() => setIsOpen(false)}>&times;</button>
            </div>
            <div className="chat-ia-messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-ia-msg chat-ia-msg-${msg.from}`}
                  style={msg.from === 'ia' ? { width: '100%', maxWidth: '100%', whiteSpace: 'pre-line', overflowWrap: 'break-word', wordBreak: 'break-word' } : {}}>
                  {msg.from === 'ia' ? <pre style={{margin:0, fontFamily:'inherit', width:'100%', maxWidth:'100%', whiteSpace:'pre-line', overflowWrap:'break-word', wordBreak:'break-word'}}>{(msg.text && !msg.text.includes('\n') && msg.text.length > 80) ? msg.text.replace(/(.{80})/g, '$1\n') : msg.text}</pre> : msg.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <button className="chat-ia-clear" onClick={() => setMessages([{ from: 'ia', text: 'Olá! Sou a IA Mendes.\nComo posso ajudar você?' }])} style={{margin:'8px auto 0',display:'block',background:'#eee',border:'1px solid #ccc',borderRadius:'4px',padding:'4px 12px',cursor:'pointer'}}>Limpar Conversa</button>
            <div className="chat-ia-input-row">
              <input
                type="text"
                placeholder="Digite sua mensagem..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                autoFocus
              />
              <button onClick={handleSend} disabled={isLoading || !input.trim()}>
                {isLoading ? '...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatIA; 