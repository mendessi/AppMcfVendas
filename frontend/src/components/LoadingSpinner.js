import React, { useState, useEffect } from 'react';

const LoadingSpinner = ({ darkMode = false, message = 'Carregando dados...' }) => {
  const [dots, setDots] = useState('.');
  const [currentMessage, setCurrentMessage] = useState(message);
  const [messageIndex, setMessageIndex] = useState(0);
  
  // Mensagens informativas que alternam durante o carregamento
  const messages = [
    'Carregando dados...',
    'Processando informações...',
    'Conectando ao servidor...',
    'Buscando registros...',
    'Quase lá...',
  ];
  
  // Efeito para animação de pontos
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '.';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(dotsInterval);
  }, []);
  
  // Efeito para alternar mensagens
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
      setCurrentMessage(messages[messageIndex]);
    }, 3000);
    
    return () => clearInterval(messageInterval);
  }, [messageIndex, messages]);
  
  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Spinner animado */}
      <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${darkMode ? 'border-blue-400' : 'border-blue-600'} mb-4`}></div>
      
      {/* Mensagem de carregamento com animação de pontos */}
      <div className={`text-center ${darkMode ? 'text-gray-200' : 'text-gray-700'} font-medium`}>
        {currentMessage}{dots}
      </div>
      
      {/* Barra de progresso animada */}
      <div className="w-64 h-1.5 bg-gray-200 rounded-full mt-4 overflow-hidden">
        <div 
          className={`h-full ${darkMode ? 'bg-blue-400' : 'bg-blue-600'} rounded-full animate-pulse`}
          style={{
            width: '100%',
            animation: 'progress 2s ease-in-out infinite'
          }}
        ></div>
      </div>
      
      {/* Estilos para animação da barra de progresso */}
      <style>{`
        @keyframes progress {
          0% {
            width: 5%;
          }
          50% {
            width: 70%;
          }
          70% {
            width: 80%;
          }
          100% {
            width: 5%;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
