import React, { useEffect } from 'react';

const Toast = ({ message, onClose, darkMode, position }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 5000); // 5 segundos
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  // Calcular a posição do Toast
  const getPosition = () => {
    const isMobile = window.innerWidth < 600;
    if (!position || isMobile) {
      // Centraliza horizontalmente e posiciona verticalmente próximo ao clique ou a 30% da tela
      let top = '30%';
      if (position && position.y) {
        // Garante que não fique muito próximo do topo ou do rodapé
        const minTop = 40;
        const maxTop = window.innerHeight - 120;
        top = Math.max(minTop, Math.min(position.y, maxTop)) + 'px';
      }
      return {
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        top,
        zIndex: 99999,
        maxWidth: '95vw',
      };
    }
    // Desktop: próximo ao clique
    const { x, y } = position;
    const viewportHeight = window.innerHeight;
    const bottomSpace = viewportHeight - y;
    const showAbove = bottomSpace < 200;
    return {
      position: 'fixed',
      top: showAbove ? 'auto' : `${y}px`,
      bottom: showAbove ? `${viewportHeight - y}px` : 'auto',
      left: `${x}px`,
      transform: 'translateX(-50%)',
      maxWidth: '90vw',
      zIndex: 99999,
    };
  };

  return (
    <div style={{
      ...getPosition(),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: darkMode ? '#23272f' : '#e53e3e',
        color: '#fff',
        padding: '16px 24px',
        borderRadius: 12,
        boxShadow: '0 6px 32px rgba(0,0,0,0.18)',
        minWidth: 220,
        maxWidth: '95vw',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '16px',
        letterSpacing: 0.5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12
      }}>
        <span style={{flex: 1}}>{message}</span>
        <button 
          onClick={onClose}
          style={{
            background: darkMode ? '#444' : '#fff',
            border: 'none',
            color: darkMode ? '#fff' : '#e53e3e',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: 16,
            borderRadius: 6,
            padding: '8px 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            minWidth: 100,
            minHeight: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default Toast; 